const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const AdmZip = require("adm-zip");

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.local");

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const envLocal = parseEnvFile(envPath);
const liveUrl = envLocal.NEXT_PUBLIC_APP_URL || "";
const results = [];

function startServer(port, extraEnv = {}) {
  return spawn(`npm run start -- -p ${port}`, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
}

function record(id, area, status, detail) {
  results.push({ id, area, status, detail });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(url, timeoutMs = 120000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1500);
  }
  throw lastError || new Error(`Timeout waiting for ${url}`);
}

async function getText(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { res, text };
}

async function getJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, text, json };
}

function buildZipFile(files) {
  const zip = new AdmZip();
  for (const file of files) {
    zip.addFile(file.path, file.buffer);
  }
  return zip.toBuffer();
}

async function run() {
  if (!liveUrl) {
    record("A1", "App Accessibility", "fail", "Live hosted URL missing in .env.local (NEXT_PUBLIC_APP_URL).");
  } else {
    try {
      const { res } = await getText(liveUrl);
      if (!res.ok) {
        record("A1", "App Accessibility", "fail", `Live URL returned HTTP ${res.status}.`);
      } else if (/localhost|127\.0\.0\.1/.test(liveUrl)) {
        record("A1", "App Accessibility", "fail", `Configured URL is local (${liveUrl}), not hosted.`);
      } else {
        record("A1", "App Accessibility", "pass", `Live hosted URL reachable (${res.status}).`);
      }
    } catch (error) {
      record("A1", "App Accessibility", "fail", `Live hosted URL unreachable: ${String(error.message || error)}.`);
    }
  }

  const server = startServer(3100);

  const base = "http://127.0.0.1:3100";

  try {
    await waitFor(`${base}/api/status`);

    const home = await getText(`${base}/`);
    record("A2", "App Accessibility", home.res.ok ? "pass" : "fail", `Home route HTTP ${home.res.status}.`);

    const chunkSrcs = [...home.text.matchAll(/src="([^"]*\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
    let chunk404s = 0;
    for (const src of [...new Set(chunkSrcs)].slice(0, 8)) {
      const url = src.startsWith("http") ? src : `${base}${src}`;
      const res = await fetch(url);
      if (res.status === 404) chunk404s++;
    }
    record(
      "A3",
      "App Accessibility",
      chunk404s === 0 ? "pass" : "fail",
      chunk404s === 0 ? "No sampled static chunk 404s." : `${chunk404s} sampled chunk(s) returned 404.`,
    );

    const homeHasSteps = home.text.includes("Upload ZIP") && home.text.includes("GitHub Repo");
    record("H1", "Home Page", homeHasSteps ? "pass" : "fail", "Home has visible ZIP and GitHub starting options.");

    const statusPage = await getText(`${base}/status`);
    record("S1", "Status Page", statusPage.res.ok ? "pass" : "fail", `Status page HTTP ${statusPage.res.status}.`);

    const statusApi = await getJson(`${base}/api/status`);
    const hasStatusKeys =
      statusApi.json &&
      Object.prototype.hasOwnProperty.call(statusApi.json, "backend") &&
      Object.prototype.hasOwnProperty.call(statusApi.json, "db") &&
      Object.prototype.hasOwnProperty.call(statusApi.json, "llm");
    record(
      "S2",
      "Status Page",
      statusApi.res.ok && hasStatusKeys ? "pass" : "fail",
      `Status API HTTP ${statusApi.res.status}; body=${statusApi.text}`,
    );

    const askEmpty = await getJson(`${base}/api/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    record("I1", "Input Handling", askEmpty.res.status === 400 ? "pass" : "fail", `Empty ask status ${askEmpty.res.status}.`);

    const githubEmpty = await getJson(`${base}/api/ingest/github`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    record(
      "I2",
      "Input Handling",
      githubEmpty.res.status === 400 ? "pass" : "fail",
      `Empty GitHub payload status ${githubEmpty.res.status}; msg=${githubEmpty.json?.error || githubEmpty.text}`,
    );

    const githubInvalid = await getJson(`${base}/api/ingest/github`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "not-a-github-url" }),
    });
    record("I3", "Input Handling", githubInvalid.res.status === 400 ? "pass" : "fail", `Invalid URL status ${githubInvalid.res.status}.`);

    const badZipForm = new FormData();
    badZipForm.append("file", new Blob([Buffer.from("not zip")], { type: "text/plain" }), "bad.txt");
    const badZip = await getJson(`${base}/api/ingest/zip`, { method: "POST", body: badZipForm });
    record("I4", "Input Handling", badZip.res.status === 400 ? "pass" : "fail", `Invalid ZIP status ${badZip.res.status}.`);

    const emptyZip = await getJson(`${base}/api/ingest/zip`, { method: "POST", body: new FormData() });
    record("I5", "Input Handling", emptyZip.res.status === 400 ? "pass" : "fail", `Empty ZIP input status ${emptyZip.res.status}.`);

    const mixedZipBuf = buildZipFile([
      { path: "src/auth.ts", buffer: Buffer.from("export function login(){ return true; }", "utf8") },
      { path: "assets/logo.png", buffer: crypto.randomBytes(1024) },
      { path: ".next/ignored.ts", buffer: Buffer.from("ignored", "utf8") },
    ]);
    const mixedZipForm = new FormData();
    mixedZipForm.append("file", new Blob([mixedZipBuf], { type: "application/zip" }), "mixed.zip");
    const mixedIngest = await getJson(`${base}/api/ingest/zip`, { method: "POST", body: mixedZipForm });

    let zipSourceId = null;
    if (mixedIngest.res.ok && mixedIngest.json?.sourceId) {
      zipSourceId = mixedIngest.json.sourceId;
      const binaryIgnored = mixedIngest.json.fileCount === 1;
      record(
        "P1",
        "Codebase Processing",
        binaryIgnored ? "pass" : "fail",
        `Mixed ZIP ingest result ${JSON.stringify(mixedIngest.json)}`,
      );
    } else {
      record("P1", "Codebase Processing", "fail", `Mixed ZIP ingest failed (${mixedIngest.res.status}): ${mixedIngest.text}`);
    }

    const oversizedZipBuf = buildZipFile([{ path: "large.bin", buffer: crypto.randomBytes(26 * 1024 * 1024) }]);
    const oversizedForm = new FormData();
    oversizedForm.append("file", new Blob([oversizedZipBuf], { type: "application/zip" }), "oversized.zip");
    const oversized = await getJson(`${base}/api/ingest/zip`, { method: "POST", body: oversizedForm });
    record(
      "P2",
      "Codebase Processing",
      oversized.res.status === 400 ? "pass" : "fail",
      `Oversized ZIP status ${oversized.res.status}; msg=${oversized.json?.error || oversized.text}`,
    );

    const emptyCodeBuf = buildZipFile([{ path: "binary/image.png", buffer: crypto.randomBytes(2048) }]);
    const emptyCodeForm = new FormData();
    emptyCodeForm.append("file", new Blob([emptyCodeBuf], { type: "application/zip" }), "empty-code.zip");
    const emptyCodeIngest = await getJson(`${base}/api/ingest/zip`, { method: "POST", body: emptyCodeForm });
    if (emptyCodeIngest.res.ok && emptyCodeIngest.json?.sourceId) {
      const emptyAsk = await getJson(`${base}/api/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: emptyCodeIngest.json.sourceId, question: "Where is auth handled?" }),
      });
      const graceful = emptyAsk.res.ok && Array.isArray(emptyAsk.json?.citations) && emptyAsk.json.citations.length === 0;
      record("F3", "Failure Scenarios", graceful ? "pass" : "fail", `Empty codebase ask result ${emptyAsk.text}`);
    } else {
      record("F3", "Failure Scenarios", "fail", `Empty codebase ingest failed (${emptyCodeIngest.res.status}).`);
    }

    const unsupportedBuf = buildZipFile([{ path: "lang/file.xyz", buffer: Buffer.from("unsupported language content", "utf8") }]);
    const unsupportedForm = new FormData();
    unsupportedForm.append("file", new Blob([unsupportedBuf], { type: "application/zip" }), "unsupported.zip");
    const unsupported = await getJson(`${base}/api/ingest/zip`, { method: "POST", body: unsupportedForm });
    if (unsupported.res.ok && unsupported.json) {
      const ignoredUnsupported = unsupported.json.fileCount === 0 || unsupported.json.chunkCount === 0;
      record(
        "F4",
        "Failure Scenarios",
        ignoredUnsupported ? "pass" : "fail",
        `Unsupported extension ingest ${JSON.stringify(unsupported.json)}`,
      );
    } else {
      record("F4", "Failure Scenarios", "fail", `Unsupported extension ingest failed (${unsupported.res.status}).`);
    }

    const githubGood = await getJson(`${base}/api/ingest/github`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://github.com/octocat/Hello-World" }),
    });
    let githubSourceId = null;
    if (githubGood.res.ok && githubGood.json?.sourceId) {
      githubSourceId = githubGood.json.sourceId;
      record("I6", "Input Handling", "pass", `Public GitHub ingest ok: ${githubGood.text}`);
    } else {
      record("I6", "Input Handling", "fail", `Public GitHub ingest failed (${githubGood.res.status}): ${githubGood.text}`);
    }

    const githubInvalidPrivate = await getJson(`${base}/api/ingest/github`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://github.com/octocat/RepoDefinitelyDoesNotExist123456" }),
    });
    const gracefulPrivate = githubInvalidPrivate.res.status >= 400 && githubInvalidPrivate.res.status < 500;
    record(
      "I7",
      "Input Handling",
      gracefulPrivate ? "pass" : "fail",
      `Invalid/private repo status ${githubInvalidPrivate.res.status}; msg=${githubInvalidPrivate.json?.error || githubInvalidPrivate.text}`,
    );

    if (zipSourceId) {
      const askZip = await getJson(`${base}/api/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: zipSourceId, question: "Where is auth handled?" }),
      });
      const citations = Array.isArray(askZip.json?.citations) ? askZip.json.citations : [];
      const snippets = Array.isArray(askZip.json?.retrievedSnippets) ? askZip.json.retrievedSnippets : [];

      record("Q1", "Q&A Functionality", askZip.res.ok ? "pass" : "fail", `Ask status ${askZip.res.status}.`);
      record("Q2", "Q&A Functionality", citations.length > 0 ? "pass" : "fail", `Citations count ${citations.length}.`);
      record("Q3", "Q&A Functionality", snippets.length > 0 ? "pass" : "fail", `Retrieved snippets count ${snippets.length}.`);
      const proofFields =
        citations.length > 0 &&
        citations.every((c) => typeof c.filePath === "string" && Number.isInteger(c.startLine) && Number.isInteger(c.endLine));
      record("Q4", "Q&A Functionality", proofFields ? "pass" : "fail", "Citation file paths and line ranges present.");

      const snippetKeys = new Set(snippets.map((s) => `${s.filePath}:${s.startLine}:${s.endLine}`));
      const grounded = citations.every((c) => snippetKeys.has(`${c.filePath}:${c.startLine}:${c.endLine}`));
      record("G1", "Accuracy & Grounding", grounded ? "pass" : "fail", "Citations map to retrieved snippets.");

      for (let i = 1; i <= 11; i += 1) {
        await getJson(`${base}/api/ask`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sourceId: zipSourceId, question: `History check question ${i}` }),
        });
      }
      const history = await getJson(`${base}/api/history?sourceId=${zipSourceId}`);
      if (history.res.ok && Array.isArray(history.json)) {
        const countOk = history.json.length === 10;
        const hasNewest = history.json.some((h) => h.question === "History check question 11");
        const hasOldest = history.json.some((h) => h.question === "History check question 1");
        record("HIST1", "History", countOk ? "pass" : "fail", `History length ${history.json.length}.`);
        record("HIST2", "History", hasNewest && !hasOldest ? "pass" : "fail", `Newest present=${hasNewest}, oldest present=${hasOldest}.`);
      } else {
        record("HIST1", "History", "fail", `History API failed (${history.res.status}).`);
      }
    }

    if (githubSourceId) {
      const askGithub = await getJson(`${base}/api/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: githubSourceId, question: "Where is the main greeting logic?" }),
      });
      const links = Array.isArray(askGithub.json?.citations)
        ? askGithub.json.citations.map((c) => c.sourceUrl).filter(Boolean)
        : [];
      if (!askGithub.res.ok) {
        record("Q5", "Q&A Functionality", "fail", `GitHub ask failed (${askGithub.res.status}).`);
      } else if (links.length === 0) {
        record("Q5", "Q&A Functionality", "fail", "No clickable citation links found.");
      } else {
        let badLinks = 0;
        for (const link of links.slice(0, 5)) {
          const linkRes = await fetch(link);
          if (!linkRes.ok) badLinks += 1;
        }
        record("Q5", "Q&A Functionality", badLinks === 0 ? "pass" : "fail", `Citation link checks: total=${links.length}, bad=${badLinks}.`);
      }
    }

    const serverNoLlm = startServer(3101, { GROQ_API_KEY: "placeholder" });
    try {
      await waitFor("http://127.0.0.1:3101/api/status", 90000);
      if (zipSourceId) {
        const llmDownAsk = await getJson("http://127.0.0.1:3101/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sourceId: zipSourceId, question: "Test with unavailable llm" }),
        });
        const graceful = llmDownAsk.res.ok && typeof (llmDownAsk.json?.answer || "") === "string";
        record("F2", "Failure Scenarios", graceful ? "pass" : "fail", `LLM unavailable scenario response ${llmDownAsk.text}`);
      } else {
        record("F2", "Failure Scenarios", "fail", "LLM unavailable scenario skipped: no sourceId.");
      }
    } catch (error) {
      record("F2", "Failure Scenarios", "fail", `No-LLM server failed to start: ${String(error.message || error)}`);
    } finally {
      serverNoLlm.kill("SIGTERM");
      await sleep(800);
      if (!serverNoLlm.killed) serverNoLlm.kill("SIGKILL");
    }
  } catch (error) {
    record("SYS", "System", "fail", `Test harness error: ${String(error.message || error)}`);
  } finally {
    server.kill("SIGTERM");
    await sleep(1200);
    if (!server.killed) server.kill("SIGKILL");
  }

  try {
    await fetch("http://127.0.0.1:3100/api/status", { signal: AbortSignal.timeout(2500) });
    record("F1", "Failure Scenarios", "fail", "Backend-down check failed (server still responded).");
  } catch {
    record("F1", "Failure Scenarios", "pass", "Backend-down check passed (connection fails after shutdown).");
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
  };
  console.log(JSON.stringify({ summary, results }, null, 2));
}

run().catch((error) => {
  console.error("Runner crashed:", error);
  process.exitCode = 1;
});

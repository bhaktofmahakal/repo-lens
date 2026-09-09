#!/usr/bin/env node

/**
 * RepoLens CLI (Modern September 2026 Enterprise Edition)
 * High-performance terminal interface for AI codebase intelligence and semantic citation retrieval.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");

const DEFAULT_BASE_URL = process.env.REPOLENS_BASE_URL || "https://repo-lens-gamma.vercel.app";
const CONFIG_DIR = path.join(os.homedir(), ".repolens");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Modern ANSI styling helpers
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  orange: "\x1b[38;5;208m",
  gray: "\x1b[38;5;244m",
  bgDark: "\x1b[48;5;235m",
};

function banner() {
  console.log(`
${c.orange}${c.bold}  ┌──────────────────────────────────────────────────────────┐
  │  ${c.white}RepoLens CLI ${c.orange}🔍⚡${c.white}                                      │
  │  ${c.gray}AI Codebase Intelligence & Semantic Citation Engine      ${c.orange}│
  └──────────────────────────────────────────────────────────┘${c.reset}
`);
}

function usage() {
  banner();
  console.log(`${c.bold}COMMANDS:${c.reset}
  ${c.cyan}repolens auth login${c.reset}         Authenticate with your RepoLens API key
  ${c.cyan}repolens auth logout${c.reset}        Clear stored authentication credentials
  ${c.cyan}repolens whoami${c.reset}             Display active credentials, gateway status, and default repo
  ${c.cyan}repolens list${c.reset}               List all indexed repositories on your account
  ${c.cyan}repolens ask <query>${c.reset}        Interrogate codebase with grounded line citations
  ${c.cyan}repolens chat${c.reset}               Launch interactive multi-turn terminal Q&A session
  ${c.cyan}repolens explain <path>${c.reset}     Explain the purpose & architecture of a specific local file
  ${c.cyan}repolens refactor${c.reset}           Generate AI architectural refactor suggestions with diffs
  ${c.cyan}repolens history [id]${c.reset}       Review past Q&A interrogation records for a repo
  ${c.cyan}repolens ingest <url>${c.reset}       Index a new GitHub repository or ZIP archive
  ${c.cyan}repolens status [id]${c.reset}        Check indexing telemetry, chunk count, and vector dimensions
  ${c.cyan}repolens config <cmd>${c.reset}       Manage CLI configurations (get, set, list)

${c.bold}OPTIONS:${c.reset}
  ${c.gray}--repo <id>${c.reset}            Target specific repository UUID (auto-detected if inside a git repo)
  ${c.gray}--api-key <key>${c.reset}        Override API key for this invocation
  ${c.gray}--base-url <url>${c.reset}       API base URL (default: ${DEFAULT_BASE_URL})
  ${c.gray}--json${c.reset}                   Print machine-readable JSON output
  ${c.gray}--help, -h${c.reset}               Show this help guide

${c.bold}EXAMPLES:${c.reset}
  ${c.gray}$ repolens auth login${c.reset}
  ${c.gray}$ repolens whoami${c.reset}
  ${c.gray}$ repolens ask "How does auth guard work?"${c.reset}
  ${c.gray}$ repolens chat${c.reset}
  ${c.gray}$ repolens explain src/middleware.ts${c.reset}
  ${c.gray}$ repolens refactor --repo <repo-uuid>${c.reset}
`);
}

function parseArgs(args) {
  const options = {};
  const positionals = [];

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const withoutPrefix = token.slice(2);
    const eqIndex = withoutPrefix.indexOf("=");

    if (eqIndex > -1) {
      const key = withoutPrefix.slice(0, eqIndex);
      const value = withoutPrefix.slice(eqIndex + 1);
      options[key] = value;
      continue;
    }

    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      options[withoutPrefix] = next;
      i += 1;
      continue;
    }

    options[withoutPrefix] = true;
  }

  return { options, positionals };
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/$/, "");
}

function isZipUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    return /\.zip(?:$|\?)/i.test(parsed.href);
  } catch {
    return false;
  }
}

function ensureUuid(value, label) {
  if (!UUID_RE.test(String(value || ""))) {
    throw new Error(`${label} must be a valid UUID.`);
  }
}

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch (error) {
    if (error && error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function resolveBaseUrl(options, config) {
  return normalizeBaseUrl(options["base-url"] || config.baseUrl || process.env.REPOLENS_BASE_URL || DEFAULT_BASE_URL);
}

function resolveApiKey(options, config) {
  return String(options["api-key"] || process.env.REPOLENS_API_KEY || config.apiKey || "").trim() || null;
}

/**
 * Detects current directory's git remote URL to auto-resolve repo ID
 */
function detectCurrentGitRemote() {
  try {
    const url = execSync("git config --get remote.origin.url", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    if (!url) return null;
    return url
      .replace(/^git@github\.com:/, "https://github.com/")
      .replace(/\.git$/, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

async function resolveRepoId(options, config, positionalRepoId, baseUrl, apiKey) {
  // 1. Direct command line arg
  const explicit = String(positionalRepoId || options.repo || "").trim();
  if (explicit) {
    ensureUuid(explicit, "repoId");
    return explicit;
  }

  // 2. Auto-detect from local Git repository remote
  const localGit = detectCurrentGitRemote();
  if (localGit && apiKey) {
    try {
      const repos = await requestJson({
        baseUrl,
        pathName: "/api/v1/repos",
        method: "GET",
        apiKey,
      });
      if (Array.isArray(repos)) {
        const matched = repos.find(
          (r) => r.github_url && r.github_url.toLowerCase().replace(/\.git$/, "") === localGit,
        );
        if (matched) {
          process.stderr.write(`${c.gray}⚡ Auto-detected repository: ${c.white}${matched.name}${c.gray} (${matched.id})${c.reset}\n`);
          return matched.id;
        }
      }
    } catch {
      // Fall through to config default
    }
  }

  // 3. Stored config default
  if (config.defaultRepoId) {
    return config.defaultRepoId;
  }

  return null;
}

async function requestJson({ baseUrl, pathName, method = "GET", apiKey, body }) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data.message || data.error)) ||
      `Request failed with status ${response.status}.`;
    const error = new Error(String(message));
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

/**
 * Cybernetic Multi-Phase Telemetry Spinner
 */
function printCyberneticSpinner(phases) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIdx = 0;
  let phaseIdx = 0;
  const startTime = Date.now();

  const phaseList = Array.isArray(phases) && phases.length > 0 ? phases : [
    "Vector embedding retrieval...",
    "Cosine similarity search...",
    "Groq Llama 3.3 70B synthesis...",
  ];

  const timer = setInterval(() => {
    frameIdx = (frameIdx + 1) % frames.length;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Auto advance phases every 1.5 seconds
    phaseIdx = Math.min(Math.floor((Date.now() - startTime) / 1400), phaseList.length - 1);
    const currentPhase = phaseList[phaseIdx];

    process.stderr.write(
      `\r${c.orange}${frames[frameIdx]}${c.reset} ${c.cyan}[${phaseIdx + 1}/${phaseList.length}]${c.reset} ${currentPhase} ${c.gray}(${elapsedSec}s)${c.reset}`
    );
  }, 80);

  return () => {
    clearInterval(timer);
    process.stderr.write("\r\x1b[K");
  };
}

function renderFormattedAnswer(data) {
  console.log(`\n${c.bold}${c.white}ANSWER:${c.reset}\n`);

  // Terminal syntax rendering for markdown and code blocks
  const lines = String(data.answer || "No answer returned.").split("\n");
  let inCode = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      console.log(`${c.gray}${line}${c.reset}`);
      continue;
    }
    if (inCode) {
      console.log(`  ${c.cyan}${line}${c.reset}`);
    } else if (line.startsWith("#")) {
      console.log(`\n${c.bold}${c.orange}${line}${c.reset}`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      console.log(`  ${c.orange}•${c.reset} ${line.slice(2)}`);
    } else {
      console.log(line);
    }
  }

  // Render verifiable citations table
  if (Array.isArray(data.citations) && data.citations.length > 0) {
    console.log(`\n${c.bold}${c.white}VERIFIED EVIDENCE CITATIONS:${c.reset}`);
    console.log(`${c.gray}┌────────────────────────────────────────────────────────┬───────────────┐${c.reset}`);
    console.log(`${c.gray}│${c.reset} ${c.bold}FILE PATH${c.reset}                                             ${c.gray}│${c.reset} ${c.bold}LINE RANGE${c.reset}    ${c.gray}│${c.reset}`);
    console.log(`${c.gray}├────────────────────────────────────────────────────────┼───────────────┤${c.reset}`);

    for (const cItem of data.citations) {
      const file = String(cItem.filePath || "unknown").padEnd(54).slice(0, 54);
      const lines = `L${cItem.startLine}-L${cItem.endLine}`.padEnd(13).slice(0, 13);
      console.log(`${c.gray}│${c.reset} ${c.cyan}${file}${c.reset} ${c.gray}│${c.reset} ${c.green}${lines}${c.reset} ${c.gray}│${c.reset}`);
    }

    console.log(`${c.gray}└────────────────────────────────────────────────────────┴───────────────┘${c.reset}`);
  }

  if (data.latencyMs) {
    console.log(`\n${c.gray}⚡ Groq Llama 3.3 70B inference completed in ${data.latencyMs}ms${c.reset}\n`);
  }
}

// ---------------- COMMAND HANDLERS ----------------

async function cmdAuthLogin({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  let apiKey = String(options.key || options["api-key"] || positionals[0] || "").trim();

  banner();

  if (!apiKey) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    apiKey = (await rl.question(`${c.bold}Enter RepoLens API key:${c.reset} `)).trim();
    await rl.close();
  }

  if (!apiKey) {
    throw new Error("API key is required. Generate one at https://repo-lens-gamma.vercel.app/dashboard/settings");
  }

  const stopSpinner = printCyberneticSpinner(["Verifying API key with RepoLens gateway..."]);
  try {
    await requestJson({
      baseUrl,
      pathName: "/api/v1/repos",
      method: "GET",
      apiKey,
    });
    stopSpinner();
  } catch (error) {
    stopSpinner();
    if (error.status === 401) {
      throw new Error("Authentication failed (401 Unauthorized). Invalid API key.");
    }
  }

  const nextConfig = {
    ...config,
    apiKey,
    baseUrl,
  };
  await writeConfig(nextConfig);

  console.log(`${c.green}✔ Authenticated successfully!${c.reset}`);
  console.log(`${c.gray}Saved credentials to ${CONFIG_FILE}${c.reset}\n`);
}

async function cmdAuthLogout() {
  const config = await readConfig();
  if (!config.apiKey) {
    console.log(`${c.yellow}No stored credentials found.${c.reset}`);
    return;
  }

  const nextConfig = { ...config };
  delete nextConfig.apiKey;
  await writeConfig(nextConfig);
  console.log(`${c.green}✔ Stored API credentials removed.${c.reset}`);
}

async function cmdWhoAmI({ options }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);

  banner();
  console.log(`${c.bold}AUTHENTICATION & GATEWAY STATUS:${c.reset}`);
  console.log(`- ${c.bold}Gateway URL:${c.reset}    ${c.cyan}${baseUrl}${c.reset}`);
  
  if (!apiKey) {
    console.log(`- ${c.bold}Auth Status:${c.reset}    ${c.yellow}Unauthenticated${c.reset}`);
    console.log(`\n${c.gray}To log in, run:${c.reset} ${c.cyan}repolens auth login${c.reset}\n`);
    return;
  }

  const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}` : "••••••••";
  console.log(`- ${c.bold}API Key:${c.reset}        ${c.gray}${maskedKey}${c.reset}`);
  console.log(`- ${c.bold}Default Repo:${c.reset}   ${config.defaultRepoId ? `${c.green}${config.defaultRepoId}${c.reset}` : `${c.gray}(none)${c.reset}`}`);

  const startPing = Date.now();
  const stopSpinner = printCyberneticSpinner(["Pinging RepoLens production gateway..."]);
  try {
    const repos = await requestJson({
      baseUrl,
      pathName: "/api/v1/repos",
      method: "GET",
      apiKey,
    });
    stopSpinner();
    const pingMs = Date.now() - startPing;
    console.log(`- ${c.bold}Gateway Ping:${c.reset}   ${c.green}Online (${pingMs}ms)${c.reset}`);
    console.log(`- ${c.bold}Accessible Repos:${c.reset} ${c.white}${Array.isArray(repos) ? repos.length : 0}${c.reset}\n`);
  } catch (err) {
    stopSpinner();
    console.log(`- ${c.bold}Gateway Ping:${c.reset}   ${c.red}Offline / Error: ${err.message}${c.reset}\n`);
  }
}

async function cmdConfig({ positionals }) {
  const config = await readConfig();
  const sub = positionals[0];
  const key = positionals[1];
  const val = positionals[2];

  if (!sub || sub === "list" || sub === "ls") {
    banner();
    console.log(`${c.bold}CURRENT REPOLENS CONFIGURATION:${c.reset}`);
    console.log(`${c.gray}File: ${CONFIG_FILE}${c.reset}\n`);
    for (const [k, v] of Object.entries(config)) {
      const displayVal = k === "apiKey" && v ? `${String(v).slice(0, 4)}••••${String(v).slice(-4)}` : v;
      console.log(`  ${c.cyan}${k}${c.reset} = ${c.white}${displayVal}${c.reset}`);
    }
    console.log("");
    return;
  }

  if (sub === "get") {
    if (!key) throw new Error("Usage: repolens config get <key>");
    console.log(config[key] || "");
    return;
  }

  if (sub === "set") {
    if (!key || val === undefined) throw new Error("Usage: repolens config set <key> <value>");
    config[key] = val;
    await writeConfig(config);
    console.log(`${c.green}✔ Updated ${key} = ${val}${c.reset}`);
    return;
  }

  throw new Error(`Unknown config action '${sub}'. Supported: list, get, set`);
}

async function cmdList({ options }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  const stopSpinner = printCyberneticSpinner(["Fetching indexed repository catalogue..."]);
  const data = await requestJson({
    baseUrl,
    pathName: "/api/v1/repos",
    method: "GET",
    apiKey,
  });
  stopSpinner();

  if (toBool(options.json)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  banner();
  console.log(`${c.bold}INDEXED REPOSITORIES (${data.length}):${c.reset}\n`);

  if (!data || data.length === 0) {
    console.log(`${c.gray}No repositories indexed yet. Run:${c.reset} ${c.cyan}repolens ingest <url>${c.reset}\n`);
    return;
  }

  console.log(`${c.gray}┌──────────────────────────────────────┬──────────────────────────────┬──────────┬────────┐${c.reset}`);
  console.log(`${c.gray}│${c.reset} ${c.bold}UUID${c.reset}                                 ${c.gray}│${c.reset} ${c.bold}REPOSITORY NAME${c.reset}              ${c.gray}│${c.reset} ${c.bold}CHUNKS${c.reset}   ${c.gray}│${c.reset} ${c.bold}STATUS${c.reset} ${c.gray}│${c.reset}`);
  console.log(`${c.gray}├──────────────────────────────────────┼──────────────────────────────┼──────────┼────────┤${c.reset}`);

  for (const repo of data) {
    const isDefault = repo.id === config.defaultRepoId ? `${c.green}*${c.reset}` : " ";
    const idStr = `${repo.id}${isDefault}`.padEnd(36).slice(0, 36);
    const nameStr = String(repo.name || "Unknown").padEnd(28).slice(0, 28);
    const chunks = String(repo.chunk_count || 0).padEnd(8).slice(0, 8);
    const status = (repo.status || "ready").padEnd(6).slice(0, 6);

    console.log(`${c.gray}│${c.reset} ${c.cyan}${idStr}${c.reset} ${c.gray}│${c.reset} ${c.white}${nameStr}${c.reset} ${c.gray}│${c.reset} ${c.orange}${chunks}${c.reset} ${c.gray}│${c.reset} ${c.green}${status}${c.reset} ${c.gray}│${c.reset}`);
  }

  console.log(`${c.gray}└──────────────────────────────────────┴──────────────────────────────┴──────────┴────────┘${c.reset}`);
  if (config.defaultRepoId) {
    console.log(`${c.gray}(*) Marked as current default repository${c.reset}\n`);
  }
}

async function cmdIngest({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  const inputUrl = String(positionals[0] || "").trim();
  if (!inputUrl) throw new Error("Usage: repolens ingest <githubUrl|zipUrl>");

  const body = isZipUrl(inputUrl) ? { zip_url: inputUrl } : { github_url: inputUrl };
  const stopSpinner = printCyberneticSpinner([
    "Fetching repository code tree...",
    "Extracting source AST chunks...",
    "Generating 768-D embeddings...",
    "Storing pgvector index records...",
  ]);

  const data = await requestJson({
    baseUrl,
    pathName: "/api/v1/repos",
    method: "POST",
    apiKey,
    body,
  });
  stopSpinner();

  const setAsDefault = options["repo-default"] !== false && options["repo-default"] !== "false";
  if (setAsDefault && data && data.id) {
    const nextConfig = { ...config, defaultRepoId: data.id, baseUrl };
    if (config.apiKey) nextConfig.apiKey = config.apiKey;
    await writeConfig(nextConfig);
  }

  if (toBool(options.json)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`\n${c.green}✔ Repository successfully indexed!${c.reset}`);
  console.log(`- ${c.bold}ID:${c.reset} ${c.cyan}${data.id}${c.reset}`);
  console.log(`- ${c.bold}Type:${c.reset} ${data.source_type || "github"}`);
  console.log(`- ${c.bold}Files:${c.reset} ${data.file_count || 0}`);
  console.log(`- ${c.bold}AST Chunks:${c.reset} ${data.chunk_count || 0}`);
  if (setAsDefault) {
    console.log(`- ${c.gray}Set as default active repo in config${c.reset}`);
  }
  console.log(`\n${c.gray}Ready to ask questions:${c.reset} ${c.cyan}repolens ask "How does this repo work?"${c.reset}\n`);
}

async function cmdStatus({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  const repoId = await resolveRepoId(options, config, positionals[0], baseUrl, apiKey);
  if (!repoId) throw new Error("Missing repo ID. Specify --repo <id> or run: repolens list");

  const stopSpinner = printCyberneticSpinner(["Querying repository vector telemetry..."]);
  const data = await requestJson({
    baseUrl,
    pathName: `/api/v1/repos/${repoId}/status`,
    method: "GET",
    apiKey,
  });
  stopSpinner();

  if (toBool(options.json)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  banner();
  console.log(`${c.bold}REPOSITORY TELEMETRY:${c.reset}`);
  console.log(`- ${c.bold}ID:${c.reset}           ${c.cyan}${data.id}${c.reset}`);
  console.log(`- ${c.bold}Name:${c.reset}         ${data.name}`);
  console.log(`- ${c.bold}Type:${c.reset}         ${data.type}`);
  console.log(`- ${c.bold}Vector Index:${c.reset} ${c.green}${data.status} (Supabase pgvector 768-D)${c.reset}`);
  console.log(`- ${c.bold}AST Chunks:${c.reset}   ${data.chunk_count}`);
  console.log(`- ${c.bold}Embedding:${c.reset}    sentence-transformers/all-mpnet-base-v2`);
  console.log(`- ${c.bold}Inference:${c.reset}    Groq Llama 3.3 70B Versatile\n`);
}

async function cmdAsk({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  const repoId = await resolveRepoId(options, config, null, baseUrl, apiKey);
  if (!repoId) throw new Error("Missing repo ID. Specify --repo <id> or run inside a git repo.");

  const question = positionals.join(" ").trim();
  if (!question) throw new Error("Usage: repolens ask <question> [--repo <repoId>]");

  const stopSpinner = printCyberneticSpinner([
    "Generating 768-D query vector embedding...",
    "Querying pgvector cosine similarity index...",
    "Synthesizing citation-grounded response via Groq 70B...",
    "Verifying source line ranges...",
  ]);

  const data = await requestJson({
    baseUrl,
    pathName: `/api/v1/repos/${repoId}/query`,
    method: "POST",
    apiKey,
    body: { question },
  });
  stopSpinner();

  if (toBool(options.json)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  renderFormattedAnswer(data);
}

async function cmdExplain({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  const repoId = await resolveRepoId(options, config, null, baseUrl, apiKey);
  if (!repoId) throw new Error("Missing repo ID. Specify --repo <id> or run inside a git repo.");

  const targetPath = String(positionals[0] || "").trim();
  if (!targetPath) throw new Error("Usage: repolens explain <filePath>");

  const question = `Explain the architectural purpose, exported symbols, key logic, and dependencies of the file '${targetPath}'. Provide precise citations.`;
  const stopSpinner = printCyberneticSpinner([
    `Analyzing file structure: ${targetPath}...`,
    "Retrieving AST vector embeddings...",
    "Synthesizing architectural explanation...",
  ]);

  const data = await requestJson({
    baseUrl,
    pathName: `/api/v1/repos/${repoId}/query`,
    method: "POST",
    apiKey,
    body: { question },
  });
  stopSpinner();

  if (toBool(options.json)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  renderFormattedAnswer(data);
}

async function cmdHistory({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  const repoId = await resolveRepoId(options, config, positionals[0], baseUrl, apiKey);
  if (!repoId) throw new Error("Missing repo ID. Specify --repo <id> or run inside a git repo.");

  const stopSpinner = printCyberneticSpinner(["Fetching Q&A audit history..."]);
  const data = await requestJson({
    baseUrl,
    pathName: `/api/v1/repos/${repoId}/history`,
    method: "GET",
    apiKey,
  });
  stopSpinner();

  if (toBool(options.json)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  banner();
  console.log(`${c.bold}QUERY AUDIT TRAIL (${Array.isArray(data) ? data.length : 0} items):${c.reset}\n`);

  if (!Array.isArray(data) || data.length === 0) {
    console.log(`${c.gray}No query history found for this repository.${c.reset}\n`);
    return;
  }

  data.slice(0, 10).forEach((item, idx) => {
    const timeStr = item.created_at ? new Date(item.created_at).toLocaleString() : "Unknown";
    console.log(`${c.orange}${c.bold}#${idx + 1} [${timeStr}]${c.reset}`);
    console.log(`${c.bold}${c.white}Q:${c.reset} ${item.question}`);
    const preview = String(item.answer || "").split("\n")[0].slice(0, 90);
    console.log(`${c.gray}A:${c.reset} ${preview}...`);
    if (item.citations && item.citations.length > 0) {
      console.log(`${c.gray}Citations: ${item.citations.length} files referenced${c.reset}`);
    }
    console.log("");
  });
}

async function cmdChat({ options }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  let repoId = await resolveRepoId(options, config, null, baseUrl, apiKey);
  if (!repoId) throw new Error("Missing repo ID. Specify --repo <id> or run inside a git repo.");

  banner();
  console.log(`${c.bold}INTERACTIVE CONVERSATIONAL REPL${c.reset}`);
  console.log(`${c.gray}Target Repository: ${c.cyan}${repoId}${c.reset}`);
  console.log(`${c.gray}Type your question and press Enter. Special commands:${c.reset}`);
  console.log(`  ${c.cyan}/repos${c.reset}   List repositories`);
  console.log(`  ${c.cyan}/switch <id>${c.reset} Switch target repository`);
  console.log(`  ${c.cyan}/clear${c.reset}   Clear console screen`);
  console.log(`  ${c.cyan}/exit${c.reset}    Close chat session\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    while (true) {
      const q = (await rl.question(`${c.orange}repolens > ${c.reset}`)).trim();
      if (!q) continue;

      if (q.toLowerCase() === "exit" || q.toLowerCase() === "quit" || q === "/exit") {
        console.log(`${c.gray}Session closed.${c.reset}`);
        break;
      }

      if (q === "/clear") {
        console.clear();
        banner();
        continue;
      }

      if (q === "/repos") {
        const repos = await requestJson({ baseUrl, pathName: "/api/v1/repos", method: "GET", apiKey });
        console.log(`\n${c.bold}Indexed Repositories:${c.reset}`);
        repos.forEach((r) => console.log(`  - ${r.id} (${r.name})`));
        console.log("");
        continue;
      }

      if (q.startsWith("/switch ")) {
        const nextId = q.replace("/switch ", "").trim();
        if (UUID_RE.test(nextId)) {
          repoId = nextId;
          console.log(`${c.green}Switched active repository to: ${repoId}${c.reset}\n`);
        } else {
          console.log(`${c.red}Invalid UUID provided.${c.reset}\n`);
        }
        continue;
      }

      const stopSpinner = printCyberneticSpinner([
        "Synthesizing response via Groq 70B...",
        "Verifying evidence citations...",
      ]);
      try {
        const data = await requestJson({
          baseUrl,
          pathName: `/api/v1/repos/${repoId}/query`,
          method: "POST",
          apiKey,
          body: { question: q },
        });
        stopSpinner();
        renderFormattedAnswer(data);
      } catch (err) {
        stopSpinner();
        console.error(`${c.red}Error: ${err.message}${c.reset}\n`);
      }
    }
  } finally {
    rl.close();
  }
}

async function cmdRefactor({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Authentication required. Run: repolens auth login");

  const repoId = await resolveRepoId(options, config, positionals[0], baseUrl, apiKey);
  if (!repoId) throw new Error("Missing repo ID. Specify --repo <id> or run inside a git repo.");

  const question = options.scope || "Extract focused helper functions and modularize components";
  const stopSpinner = printCyberneticSpinner([
    "Evaluating cyclomatic complexity & coupling points...",
    "Generating AI architectural refactoring suggestions...",
    "Verifying source citations...",
  ]);

  const data = await requestJson({
    baseUrl,
    pathName: "/api/refactor",
    method: "POST",
    apiKey,
    body: { question, sourceId: repoId },
  });
  stopSpinner();

  if (toBool(options.json)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  banner();
  console.log(`${c.bold}${c.white}AI CODE ARCHITECTURE REFACTOR RECOMMENDATIONS:${c.reset}\n`);

  if (!data.suggestions || data.suggestions.length === 0) {
    console.log(`${c.gray}No architectural suggestions generated for this scope.${c.reset}\n`);
    return;
  }

  data.suggestions.forEach((sug, i) => {
    console.log(`${c.orange}${c.bold}#${i + 1}. ${sug.title}${c.reset}`);
    console.log(`   ${c.white}${sug.rationale}${c.reset}`);
    if (sug.expectedImpact) {
      console.log(`   ${c.green}Impact: ${sug.expectedImpact}${c.reset}`);
    }
    if (sug.citations && sug.citations.length > 0) {
      console.log(`   ${c.gray}Citations: ${sug.citations.map((c) => `${c.filePath}:${c.startLine}-${c.endLine}`).join(", ")}${c.reset}`);
    }
    console.log("");
  });
}

// ---------------- MAIN DISPATCHER ----------------

async function main() {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "auth") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    if (subcommand === "login") {
      await cmdAuthLogin(parsed);
      return;
    }
    if (subcommand === "logout") {
      await cmdAuthLogout(parsed);
      return;
    }
    if (subcommand === "status") {
      await cmdWhoAmI(parsed);
      return;
    }
    throw new Error("Unknown auth command. Usage: repolens auth login | logout | status");
  }

  if (command === "whoami") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdWhoAmI(parsed);
    return;
  }

  if (command === "config") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdConfig(parsed);
    return;
  }

  if (command === "list" || command === "ls") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdList(parsed);
    return;
  }

  if (command === "ingest") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdIngest(parsed);
    return;
  }

  if (command === "status") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdStatus(parsed);
    return;
  }

  if (command === "ask") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdAsk(parsed);
    return;
  }

  if (command === "explain") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdExplain(parsed);
    return;
  }

  if (command === "history") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdHistory(parsed);
    return;
  }

  if (command === "chat") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdChat(parsed);
    return;
  }

  if (command === "refactor") {
    const parsed = parseArgs([subcommand, ...rest].filter(Boolean));
    await cmdRefactor(parsed);
    return;
  }

  throw new Error(`Unknown command '${command}'. Run 'repolens help' for available commands.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected CLI error.";
  console.error(`\n${c.red}✖ Error: ${message}${c.reset}\n`);
  process.exit(1);
});

#!/usr/bin/env node

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");

const DEFAULT_BASE_URL = process.env.REPOLENS_BASE_URL || "http://localhost:3000";
const CONFIG_DIR = path.join(os.homedir(), ".repolens");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function usage() {
  console.log(`RepoLens CLI (phase scaffold)

Usage:
  repolens auth login [--key <apiKey>] [--base-url <url>]
  repolens auth logout
  repolens ingest <githubUrl|zipUrl> [--repo-default]
  repolens status [repoId] [--repo <repoId>]
  repolens ask <question> [--repo <repoId>]

Global options:
  --api-key <key>      Override API key for this command
  --base-url <url>     API base URL (default: ${DEFAULT_BASE_URL})
  --json               Print JSON output when available

Environment variables:
  REPOLENS_API_KEY
  REPOLENS_BASE_URL
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

function resolveRepoId(options, config, positionalRepoId) {
  return String(positionalRepoId || options.repo || config.defaultRepoId || "").trim() || null;
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

function printJsonMaybe(data, asJson) {
  if (asJson) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function printAskHuman(data) {
  console.log("\nAnswer:\n");
  console.log(data.answer || "No answer.");

  if (Array.isArray(data.citations) && data.citations.length > 0) {
    console.log("\nCitations:");
    for (const citation of data.citations) {
      const filePath = citation.filePath || "unknown";
      const start = citation.startLine || "?";
      const end = citation.endLine || "?";
      console.log(`- ${filePath}:L${start}-L${end}`);
    }
  }

  if (data.note_when_insufficient_evidence) {
    console.log(`\nNote: ${data.note_when_insufficient_evidence}`);
  }
}

async function cmdAuthLogin({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  let apiKey = String(options.key || options["api-key"] || positionals[0] || "").trim();

  if (!apiKey) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    apiKey = (await rl.question("Enter RepoLens API key: ")).trim();
    await rl.close();
  }

  if (!apiKey) {
    throw new Error("API key is required. Pass --key or enter it when prompted.");
  }

  try {
    await requestJson({
      baseUrl,
      pathName: `/api/v1/repos/${ZERO_UUID}/status`,
      method: "GET",
      apiKey,
    });
  } catch (error) {
    if (error.status === 401) {
      throw new Error("API key validation failed (401 Unauthorized).");
    }
    // Non-auth errors can happen for fake repo id (e.g. 404), so we continue.
  }

  const nextConfig = {
    ...config,
    apiKey,
    baseUrl,
  };
  await writeConfig(nextConfig);

  console.log(`Saved credentials to ${CONFIG_FILE}`);
}

async function cmdAuthLogout() {
  const config = await readConfig();
  if (!config.apiKey) {
    console.log("No stored API key found.");
    return;
  }

  const nextConfig = { ...config };
  delete nextConfig.apiKey;
  await writeConfig(nextConfig);
  console.log("Stored API key removed.");
}

async function cmdIngest({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Missing API key. Run: repolens auth login");

  const inputUrl = String(positionals[0] || "").trim();
  if (!inputUrl) throw new Error("Usage: repolens ingest <githubUrl|zipUrl>");

  const body = isZipUrl(inputUrl) ? { zip_url: inputUrl } : { github_url: inputUrl };
  const data = await requestJson({
    baseUrl,
    pathName: "/api/v1/repos",
    method: "POST",
    apiKey,
    body,
  });

  const setAsDefault = options["repo-default"] !== false && options["repo-default"] !== "false";
  if (setAsDefault && data && data.id) {
    const nextConfig = { ...config, defaultRepoId: data.id, baseUrl };
    if (config.apiKey) nextConfig.apiKey = config.apiKey;
    await writeConfig(nextConfig);
  }

  if (toBool(options.json)) {
    printJsonMaybe(data, true);
    return;
  }

  console.log("Repository ingested.");
  console.log(`- id: ${data.id}`);
  console.log(`- source_type: ${data.source_type}`);
  console.log(`- file_count: ${data.file_count}`);
  console.log(`- chunk_count: ${data.chunk_count}`);
  if (setAsDefault) {
    console.log(`- default repo set in ${CONFIG_FILE}`);
  }
}

async function cmdStatus({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Missing API key. Run: repolens auth login");

  const repoId = resolveRepoId(options, config, positionals[0]);
  if (!repoId) throw new Error("Missing repo id. Pass a repoId or set default by running ingest first.");
  ensureUuid(repoId, "repoId");

  const data = await requestJson({
    baseUrl,
    pathName: `/api/v1/repos/${repoId}/status`,
    method: "GET",
    apiKey,
  });

  if (toBool(options.json)) {
    printJsonMaybe(data, true);
    return;
  }

  console.log("Repository status:");
  console.log(`- id: ${data.id}`);
  console.log(`- name: ${data.name}`);
  console.log(`- type: ${data.type}`);
  console.log(`- status: ${data.status}`);
  console.log(`- chunk_count: ${data.chunk_count}`);
}

async function cmdAsk({ options, positionals }) {
  const config = await readConfig();
  const baseUrl = resolveBaseUrl(options, config);
  const apiKey = resolveApiKey(options, config);
  if (!apiKey) throw new Error("Missing API key. Run: repolens auth login");

  const repoId = resolveRepoId(options, config, null);
  if (!repoId) throw new Error("Missing repo id. Pass --repo or set default by running ingest first.");
  ensureUuid(repoId, "repoId");

  const question = positionals.join(" ").trim();
  if (!question) throw new Error("Usage: repolens ask <question> [--repo <repoId>]");

  const data = await requestJson({
    baseUrl,
    pathName: `/api/v1/repos/${repoId}/query`,
    method: "POST",
    apiKey,
    body: { question },
  });

  if (toBool(options.json)) {
    printJsonMaybe(data, true);
    return;
  }

  printAskHuman(data);
}

async function main() {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "auth") {
    const parsed = parseArgs(rest);
    if (subcommand === "login") {
      await cmdAuthLogin(parsed);
      return;
    }
    if (subcommand === "logout") {
      await cmdAuthLogout(parsed);
      return;
    }
    throw new Error("Unknown auth subcommand. Use: auth login | auth logout");
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

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected CLI error.";
  console.error(`Error: ${message}`);
  process.exit(1);
});

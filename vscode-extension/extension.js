const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");
const vscode = require("vscode");

const EXTENSION_SECRET_API_KEY = "repolens.apiKey";
const SIDEBAR_VIEW_ID = "repolens.sidebar";

function getConfig() {
  return vscode.workspace.getConfiguration("repolens");
}

function getGuestMode() {
  return Boolean(getConfig().get("guestMode", false));
}

async function setGuestMode(value) {
  await getConfig().update("guestMode", Boolean(value), vscode.ConfigurationTarget.Global);
}

function getBaseUrl() {
  return String(getConfig().get("baseUrl", "https://repo-lens-gamma.vercel.app")).trim().replace(/\/$/, "");
}

function getValidatedBaseUrl() {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("Set repolens.baseUrl in settings first.");
  }

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("repolens.baseUrl is not a valid URL.");
  }

  if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
    throw new Error("repolens.baseUrl must start with http:// or https://");
  }

  return parsed.toString().replace(/\/$/, "");
}

function getDefaultRepoId() {
  return String(getConfig().get("repoId", "")).trim();
}

async function setDefaultRepoId(value) {
  await getConfig().update("repoId", String(value || "").trim(), vscode.ConfigurationTarget.Global);
}

async function getApiKey(context, promptIfMissing = true) {
  const existing = await context.secrets.get(EXTENSION_SECRET_API_KEY);
  if (getGuestMode()) return null;
  if (existing) return existing;
  if (!promptIfMissing) return null;

  const entered = await vscode.window.showInputBox({
    title: "RepoLens API Key",
    prompt: "Enter your RepoLens API key (from https://repo-lens-gamma.vercel.app/dashboard/settings)",
    password: true,
    ignoreFocusOut: true,
  });

  if (!entered || !entered.trim()) {
    return null;
  }

  const apiKey = entered.trim();
  await context.secrets.store(EXTENSION_SECRET_API_KEY, apiKey);
  return apiKey;
}

async function setApiKey(context) {
  const entered = await vscode.window.showInputBox({
    title: "RepoLens API Key",
    prompt: "Enter your RepoLens API key",
    password: true,
    ignoreFocusOut: true,
  });

  if (!entered || !entered.trim()) {
    vscode.window.showWarningMessage("RepoLens API key was not updated.");
    return false;
  }

  await context.secrets.store(EXTENSION_SECRET_API_KEY, entered.trim());
  vscode.window.showInformationMessage("RepoLens API key securely saved in secret storage.");
  return true;
}

async function setRepoId() {
  const current = getDefaultRepoId();
  const entered = await vscode.window.showInputBox({
    title: "RepoLens Default Repo ID",
    prompt: "Enter the repository UUID to use by default",
    value: current,
    ignoreFocusOut: true,
  });

  if (entered === undefined) {
    return false;
  }

  await setDefaultRepoId(entered);
  vscode.window.showInformationMessage(`RepoLens active repo set to: ${entered.slice(0, 8)}...`);
  return true;
}

function getLocalGitRemoteUrl() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || !workspaceFolders.length) return null;

  for (const folder of workspaceFolders) {
    try {
      const gitUrl = execSync("git config --get remote.origin.url", {
        cwd: folder.uri.fsPath,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      if (gitUrl) {
        return gitUrl
          .replace(/^git@github\.com:/, "https://github.com/")
          .replace(/\.git$/, "")
          .toLowerCase();
      }
    } catch {
      // Continue searching next folder
    }
  }
  return null;
}

async function autoDetectActiveRepo(context) {
  const gitUrl = getLocalGitRemoteUrl();
  if (!gitUrl) {
    vscode.window.showWarningMessage("No Git remote origin detected in the current workspace.");
    return null;
  }

  const baseUrl = getValidatedBaseUrl();
  const apiKey = await getApiKey(context, true);

  try {
    const repos = await requestJson({
      baseUrl,
      route: "/api/v1/repos",
      method: "GET",
      apiKey,
    });

    if (Array.isArray(repos)) {
      const match = repos.find(
        (r) => r.github_url && r.github_url.toLowerCase().replace(/\.git$/, "") === gitUrl,
      );

      if (match) {
        await setDefaultRepoId(match.id);
        vscode.window.showInformationMessage(`RepoLens auto-detected: ${match.name} (${match.id.slice(0, 8)}...)`);
        return match.id;
      }
    }

    vscode.window.showInformationMessage(
      `Remote '${gitUrl}' found, but not indexed on RepoLens yet. Run 'RepoLens: Ingest Repository URL' to index it.`,
    );
    return null;
  } catch (err) {
    vscode.window.showErrorMessage(`Repo auto-detection failed: ${err.message}`);
    return null;
  }
}

function normalizeCitation(raw) {
  if (!raw || typeof raw !== "object") return null;

  const filePathRaw = raw.filePath || raw.file_path;
  const startLineRaw = raw.startLine ?? raw.start_line;
  const endLineRaw = raw.endLine ?? raw.end_line;

  if (!filePathRaw || typeof filePathRaw !== "string") return null;

  const filePath = filePathRaw.replace(/\\/g, "/").replace(/^\/+/, "");
  const startLine = Number(startLineRaw || 1);
  const endLine = Number(endLineRaw || startLine || 1);

  return {
    filePath,
    startLine: Number.isFinite(startLine) && startLine > 0 ? startLine : 1,
    endLine: Number.isFinite(endLine) && endLine > 0 ? endLine : Math.max(1, startLine || 1),
  };
}

function toCommandUriArgs(citation) {
  return encodeURIComponent(JSON.stringify([citation]));
}

function toWebCitation(citation) {
  return {
    ...citation,
    commandUri: `command:repolens.openCitation?${toCommandUriArgs(citation)}`,
  };
}

function isPathWithin(parentPath, candidatePath) {
  const parent = path.resolve(parentPath);
  const candidate = path.resolve(candidatePath);

  if (process.platform === "win32") {
    const parentLc = parent.toLowerCase();
    const candidateLc = candidate.toLowerCase();
    return candidateLc === parentLc || candidateLc.startsWith(parentLc + path.sep);
  }

  return candidate === parent || candidate.startsWith(parent + path.sep);
}

function createNonce() {
  return crypto.randomBytes(16).toString("base64");
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}

function isLikelyZipUrl(value) {
  return /\.zip(?:$|\?)/i.test(String(value || ""));
}

async function requestJson({ baseUrl, route, method = "GET", apiKey, body }) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 45000);

  let response;
  try {
    response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text ? { raw: text } : null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed (${response.status})`;
    const error = new Error(String(message));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function ingestRepoByUrl(context, sourceUrl) {
  const baseUrl = getValidatedBaseUrl();
  const apiKey = await getApiKey(context, true);
  if (!apiKey && !getGuestMode()) {
    throw new Error("RepoLens API key is required. Or enable Guest Mode from the extension commands.");
  }

  const normalizedUrl = String(sourceUrl || "").trim();
  if (!normalizedUrl) {
    throw new Error("Repository URL is required.");
  }

  const body = isLikelyZipUrl(normalizedUrl)
    ? { zip_url: normalizedUrl }
    : { github_url: normalizedUrl };

  const data = await requestJson({
    baseUrl,
    route: "/api/v1/repos",
    method: "POST",
    apiKey,
    body,
  });

  if (data?.id) {
    await setDefaultRepoId(data.id);
  }

  return data;
}

async function askRepoQuestion(context, repoId, question) {
  const baseUrl = getValidatedBaseUrl();
  const apiKey = await getApiKey(context, true);

  if (!apiKey && !getGuestMode()) {
    throw new Error("RepoLens API key is required. Or enable Guest Mode from the extension commands.");
  }

  return requestJson({
    baseUrl,
    route: `/api/v1/repos/${repoId}/query`,
    method: "POST",
    apiKey,
    body: { question: question.trim() },
  });
}

async function requestRefactor(context, repoId, question) {
  const baseUrl = getValidatedBaseUrl();
  const apiKey = await getApiKey(context, true);

  return requestJson({
    baseUrl,
    route: "/api/refactor",
    method: "POST",
    apiKey,
    body: { question: question.trim(), sourceId: repoId },
  });
}

async function resolveCitationUri(filePath) {
  const cleaned = String(filePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned) return null;

  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  for (const folder of workspaceFolders) {
    const candidate = path.resolve(folder.uri.fsPath, cleaned);
    if (isPathWithin(folder.uri.fsPath, candidate) && fs.existsSync(candidate)) {
      return vscode.Uri.file(candidate);
    }
  }

  const base = path.posix.basename(cleaned);
  const matches = await vscode.workspace.findFiles(`**/${base}`, "**/{node_modules,.git}/**", 200);
  if (!matches.length) return null;

  const targetSuffix = `/${cleaned.toLowerCase()}`;
  const exact = matches.find((uri) => uri.fsPath.replace(/\\/g, "/").toLowerCase().endsWith(targetSuffix));
  if (exact) return exact;

  return matches[0];
}

async function openCitation(citationArg) {
  const citation = Array.isArray(citationArg) ? citationArg[0] : citationArg;
  if (!citation || typeof citation !== "object") return;

  const normalized = normalizeCitation(citation);
  if (!normalized) {
    vscode.window.showErrorMessage("Invalid citation payload.");
    return;
  }

  const uri = await resolveCitationUri(normalized.filePath);
  if (!uri) {
    vscode.window.showErrorMessage(`Citation file not found in current workspace: ${normalized.filePath}`);
    return;
  }

  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, { preview: false });

  const start = new vscode.Position(Math.max(0, normalized.startLine - 1), 0);
  const end = new vscode.Position(Math.max(0, normalized.endLine - 1), 0);
  const range = new vscode.Range(start, end);

  editor.selection = new vscode.Selection(start, start);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

function renderAnswerHtml(answerText, citations) {
  const citationList = citations
    .map((citation) => {
      const label = `${citation.filePath}:L${citation.startLine}-L${citation.endLine}`;
      return `<li style="margin:6px 0;"><a style="color:#ff7759; text-decoration:none; font-family:monospace; background:rgba(255,119,89,0.1); padding:3px 8px; border-radius:4px; border:1px solid rgba(255,119,89,0.2);" href="${citation.commandUri}">${escapeHtml(label)}</a></li>`;
    })
    .join("");

  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
  ].join("; ");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; line-height: 1.6; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
    h2 { font-size: 16px; font-weight: 600; color: #ff7759; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
    .answer-box { background: var(--vscode-editorWidget-background, rgba(255,255,255,0.03)); border: 1px solid var(--vscode-editorWidget-border, rgba(255,255,255,0.1)); padding: 16px; border-radius: 8px; font-family: var(--vscode-editor-font-family); font-size: 13px; white-space: pre-wrap; line-height: 1.6; }
    .citations-box { margin-top: 20px; padding: 14px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
    ul { list-style: none; padding: 0; margin: 8px 0 0; }
  </style>
</head>
<body>
  <h2><span>⚡</span> RepoLens Answer</h2>
  <div class="answer-box">${escapeHtml(answerText || "No answer.")}</div>
  <div class="citations-box">
    <h2><span>📍</span> Verified Citations</h2>
    ${citationList ? `<ul>${citationList}</ul>` : "<p style='color:var(--vscode-descriptionForeground); font-size:12px;'>No direct line citations returned.</p>"}
  </div>
</body>
</html>`;
}

class RepoLensSidebarProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
  }

  async getState() {
    const hasApiKey = Boolean(await this.context.secrets.get(EXTENSION_SECRET_API_KEY));
    return {
      baseUrl: getBaseUrl(),
      repoId: getDefaultRepoId(),
      hasApiKey,
      guestMode: getGuestMode(),
    };
  }

  post(message) {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }

  async refresh() {
    this.post({ type: "state", state: await this.getState() });
  }

  renderHtml(webview, state) {
    const safeState = JSON.stringify(state).replace(/</g, "\\u003c");
    const nonce = createNonce();
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
    ].join("; ");

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <style>
    body {
      font-family: var(--vscode-font-family);
      margin: 0;
      padding: 14px;
      color: var(--vscode-foreground);
      background-color: transparent;
      line-height: 1.45;
    }
    .badge-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
      font-size: 11px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      margin-right: 5px;
      box-shadow: 0 0 8px #22c55e;
    }
    .brand {
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ff7759;
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .pill {
      font-size: 10px;
      background: rgba(255, 119, 89, 0.1);
      color: #ff7759;
      border: 1px solid rgba(255, 119, 89, 0.25);
      padding: 3px 8px;
      border-radius: 12px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .pill:hover {
      background: rgba(255, 119, 89, 0.25);
      border-color: #ff7759;
    }
    .input-group {
      margin-bottom: 12px;
    }
    textarea, input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.15));
      background: var(--vscode-input-background, #17171c);
      color: var(--vscode-input-foreground, #fff);
      border-radius: 6px;
      font-family: inherit;
      font-size: 12px;
    }
    textarea:focus, input:focus {
      outline: 1px solid #ff7759;
      border-color: #ff7759;
    }
    textarea {
      resize: vertical;
      min-height: 56px;
    }
    button {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid transparent;
      background: #ff7759;
      color: #ffffff;
      font-weight: 600;
      font-size: 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: opacity 0.15s ease;
    }
    button:hover {
      opacity: 0.92;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
      font-weight: 500;
      margin-top: 6px;
      border: 1px solid var(--vscode-button-border, rgba(255,255,255,0.1));
    }
    button.secondary:hover {
      background: rgba(255,255,255,0.14);
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 6px;
    }
    .telemetry-ticker {
      display: none;
      margin-top: 10px;
      padding: 10px;
      border-radius: 6px;
      background: rgba(255, 119, 89, 0.05);
      border: 1px solid rgba(255, 119, 89, 0.2);
      font-size: 11px;
      color: #ff7759;
    }
    .ticker-bar {
      height: 2px;
      background: #ff7759;
      width: 100%;
      margin-top: 6px;
      animation: pulseBar 1.2s infinite ease-in-out;
    }
    @keyframes pulseBar {
      0% { opacity: 0.3; transform: scaleX(0.2); }
      50% { opacity: 1; transform: scaleX(1); }
      100% { opacity: 0.3; transform: scaleX(0.2); }
    }
    .output-card {
      margin-top: 12px;
      border: 1px solid var(--vscode-editorWidget-border, rgba(255,255,255,0.1));
      background: var(--vscode-editorWidget-background, rgba(255,255,255,0.02));
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 380px;
      overflow-y: auto;
    }
    .citations-container {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .citation-tag {
      display: inline-block;
      margin: 3px 4px 3px 0;
      padding: 3px 8px;
      background: rgba(255,119,89,0.12);
      border: 1px solid rgba(255,119,89,0.25);
      color: #ff7759;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      text-decoration: none;
    }
    .meta-text {
      font-size: 10.5px;
      color: var(--vscode-descriptionForeground, #888);
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="badge-bar">
    <div><span class="status-dot"></span><span class="brand">RepoLens AI</span></div>
    <div id="metaStatus" class="meta-text" style="margin:0;">Ready</div>
  </div>

  <div class="pills">
    <div class="pill" onclick="setQuery('How does authentication and route protection work?')">🔒 Auth Guard</div>
    <div class="pill" onclick="setQuery('Where is vector cosine retrieval executed?')">⚡ Vector Query</div>
    <div class="pill" onclick="setQuery('Explain project structure and entrypoints')">📐 Architecture</div>
  </div>

  <div class="input-group">
    <textarea id="questionInput" placeholder="Ask anything about your codebase (Ctrl+Alt+L)..."></textarea>
    <button id="askBtn">
      <span>⚡ Ask RepoLens</span>
    </button>
  </div>

  <div class="row">
    <button class="secondary" id="autoDetectBtn" title="Auto-detect repo from git remote">🎯 Auto Git</button>
    <button class="secondary" id="refactorBtn" title="Generate architectural refactoring recommendations">🛠️ Refactor</button>
  </div>

  <div class="telemetry-ticker" id="tickerBox">
    <div id="tickerMsg">Retrieving pgvector embeddings...</div>
    <div class="ticker-bar"></div>
  </div>

  <div class="output-card" id="outputBox">Ask a question or right-click code in your editor to interrogate your repository.</div>

  <div class="row">
    <button class="secondary" id="ingestBtn">📥 Ingest Repo</button>
    <button class="secondary" id="keyBtn">🔑 API Key</button>
  </div>

  <div class="meta-text" id="configMeta">Base: loading...</div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${safeState};

    const questionInput = document.getElementById("questionInput");
    const outputBox = document.getElementById("outputBox");
    const tickerBox = document.getElementById("tickerBox");
    const tickerMsg = document.getElementById("tickerMsg");
    const metaStatus = document.getElementById("metaStatus");
    const configMeta = document.getElementById("configMeta");

    function setQuery(text) {
      questionInput.value = text;
      questionInput.focus();
    }

    function updateConfigDisplay(s) {
      const repo = s.repoId ? s.repoId.slice(0, 8) + "..." : "none";
      const keyState = s.hasApiKey ? "Saved" : (s.guestMode ? "Guest" : "Missing");
      configMeta.textContent = "Repo: " + repo + " | Key: " + keyState;
    }

    function setTelemetry(active, message) {
      if (active) {
        tickerBox.style.display = "block";
        tickerMsg.textContent = message || "Synthesizing answer via Groq Llama 3.3 70B...";
        metaStatus.textContent = "Thinking...";
      } else {
        tickerBox.style.display = "none";
        metaStatus.textContent = "Ready";
      }
    }

    function renderAnswer(payload) {
      setTelemetry(false);
      outputBox.innerHTML = "";

      const answerEl = document.createElement("div");
      answerEl.textContent = payload.answer || "No response received.";
      outputBox.appendChild(answerEl);

      const citations = Array.isArray(payload.citations) ? payload.citations : [];
      if (citations.length > 0) {
        const citeBox = document.createElement("div");
        citeBox.className = "citations-container";
        
        const title = document.createElement("div");
        title.style.fontWeight = "600";
        title.style.marginBottom = "4px";
        title.style.color = "#ff7759";
        title.textContent = "📍 Verified Citations:";
        citeBox.appendChild(title);

        citations.forEach((c) => {
          const link = document.createElement("a");
          link.className = "citation-tag";
          link.href = c.commandUri;
          link.textContent = c.filePath + ":L" + c.startLine + "-L" + c.endLine;
          citeBox.appendChild(link);
        });

        outputBox.appendChild(citeBox);
      }
    }

    document.getElementById("askBtn").addEventListener("click", () => {
      const q = questionInput.value.trim();
      if (!q) return;
      setTelemetry(true, "Embedding query vector & scanning Supabase pgvector...");
      vscode.postMessage({ type: "ask", question: q });
    });

    questionInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const q = questionInput.value.trim();
        if (!q) return;
        setTelemetry(true, "Embedding query vector & scanning Supabase pgvector...");
        vscode.postMessage({ type: "ask", question: q });
      }
    });

    document.getElementById("autoDetectBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "autoDetect" });
    });

    document.getElementById("refactorBtn").addEventListener("click", () => {
      const q = questionInput.value.trim() || "Extract focused helper functions and modularize components";
      setTelemetry(true, "Analyzing cyclomatic complexity and coupling points...");
      vscode.postMessage({ type: "refactor", question: q });
    });

    document.getElementById("ingestBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "ingestPrompt" });
    });

    document.getElementById("keyBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "setApiKey" });
    });

    window.addEventListener("message", (event) => {
      const m = event.data;
      if (!m || typeof m !== "object") return;

      if (m.type === "state") {
        updateConfigDisplay(m.state || {});
      } else if (m.type === "busy") {
        setTelemetry(true, m.text);
      } else if (m.type === "answer") {
        renderAnswer(m);
      } else if (m.type === "error") {
        setTelemetry(false);
        outputBox.textContent = "Error: " + (m.text || "Unknown error occurred.");
      } else if (m.type === "info") {
        setTelemetry(false);
        outputBox.textContent = m.text || "";
      }
    });

    updateConfigDisplay(state);
  </script>
</body>
</html>`;
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      enableCommandUris: ["repolens.openCitation"],
      localResourceRoots: [],
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview, await this.getState());

    webviewView.onDidDispose(() => {
      this.view = null;
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        if (!message || typeof message !== "object") return;

        if (message.type === "refresh") {
          await this.refresh();
          return;
        }

        if (message.type === "setApiKey") {
          await setApiKey(this.context);
          await this.refresh();
          return;
        }

        if (message.type === "autoDetect") {
          await autoDetectActiveRepo(this.context);
          await this.refresh();
          return;
        }

        if (message.type === "ingestPrompt") {
          await ingestRepo(this.context, this);
          return;
        }

        if (message.type === "refactor") {
          let repoId = getDefaultRepoId();
          if (!repoId) {
            repoId = await autoDetectActiveRepo(this.context);
          }
          if (!repoId) {
            this.post({ type: "error", text: "Default Repo ID is not set. Run 'Auto Git' or configure Default Repo ID." });
            return;
          }

          this.post({ type: "busy", text: "Synthesizing architectural refactor suggestions..." });
          const payload = await requestRefactor(this.context, repoId, message.question || "Refactor recommendations");
          
          let responseText = "AI Architectural Refactoring Recommendations:\n\n";
          if (Array.isArray(payload?.suggestions) && payload.suggestions.length > 0) {
            payload.suggestions.forEach((sug, i) => {
              responseText += `#${i + 1}. ${sug.title}\n${sug.rationale}\n`;
              if (sug.expectedImpact) responseText += `Impact: ${sug.expectedImpact}\n`;
              responseText += "\n";
            });
          } else {
            responseText += "No major architectural issues detected.";
          }

          this.post({
            type: "answer",
            answer: responseText,
            citations: [],
          });
          return;
        }

        if (message.type === "ask") {
          const question = String(message.question || "").trim();
          if (!question) {
            this.post({ type: "error", text: "Question is required." });
            return;
          }

          let repoId = getDefaultRepoId();
          if (!repoId) {
            repoId = await autoDetectActiveRepo(this.context);
          }
          if (!repoId) {
            this.post({ type: "error", text: "Default Repo ID is not set. Run 'Auto Git' or set Default Repo ID." });
            return;
          }

          this.post({ type: "busy", text: "Synthesizing answer via Groq Llama 3.3 70B..." });
          const payload = await askRepoQuestion(this.context, repoId, question);
          const citations = Array.isArray(payload?.citations)
            ? payload.citations.map(normalizeCitation).filter(Boolean).map(toWebCitation)
            : [];

          this.post({
            type: "answer",
            answer: payload?.answer || "No answer.",
            citations,
          });
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unknown error";
        this.post({ type: "error", text: messageText });
      }
    });
  }
}

async function askQuestion(context) {
  let repoId = getDefaultRepoId();
  if (!repoId) {
    repoId = await autoDetectActiveRepo(context);
  }

  if (!repoId) {
    const entered = await vscode.window.showInputBox({
      title: "RepoLens Repo ID",
      prompt: "Enter repo ID to query",
      ignoreFocusOut: true,
    });
    if (!entered) return;
    repoId = entered.trim();
  }

  const question = await vscode.window.showInputBox({
    title: "Ask RepoLens (Groq Llama 3.3 70B)",
    prompt: "Ask a question about this repository",
    ignoreFocusOut: true,
  });
  if (!question || !question.trim()) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens: Synthesizing citation-grounded answer...",
    },
    async () => {
      try {
        const payload = await askRepoQuestion(context, repoId, question.trim());
        const citations = Array.isArray(payload?.citations)
          ? payload.citations.map(normalizeCitation).filter(Boolean).map(toWebCitation)
          : [];

        const panel = vscode.window.createWebviewPanel(
          "repolensAnswer",
          "RepoLens Answer",
          vscode.ViewColumn.Beside,
          {
            enableCommandUris: ["repolens.openCitation"],
            localResourceRoots: [],
          },
        );
        panel.webview.html = renderAnswerHtml(payload?.answer || "No answer.", citations);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(`RepoLens request failed: ${message}`);
      }
    },
  );
}

async function askAboutSelection(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.document.getText(editor.selection);
  if (!selection.trim()) return;

  const prompt = await vscode.window.showInputBox({
    title: "RepoLens: Ask About Selected Code",
    prompt: "What would you like to know about this selection?",
    value: "Explain how this code interacts with the rest of the application",
    ignoreFocusOut: true,
  });
  if (!prompt || !prompt.trim()) return;

  const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
  const fullQuestion = `${prompt}\n\nContext file: ${relativePath}\n\`\`\`\n${selection}\n\`\`\``;

  let repoId = getDefaultRepoId();
  if (!repoId) {
    repoId = await autoDetectActiveRepo(context);
  }
  if (!repoId) {
    vscode.window.showErrorMessage("Repo ID not set. Auto-detect or configure default repo ID first.");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens: Analyzing selected code...",
    },
    async () => {
      try {
        const payload = await askRepoQuestion(context, repoId, fullQuestion);
        const citations = Array.isArray(payload?.citations)
          ? payload.citations.map(normalizeCitation).filter(Boolean).map(toWebCitation)
          : [];

        const panel = vscode.window.createWebviewPanel(
          "repolensAnswer",
          "RepoLens: Selection Analysis",
          vscode.ViewColumn.Beside,
          { enableCommandUris: ["repolens.openCitation"], localResourceRoots: [] },
        );
        panel.webview.html = renderAnswerHtml(payload?.answer || "No answer.", citations);
      } catch (err) {
        vscode.window.showErrorMessage(`RepoLens error: ${err.message}`);
      }
    },
  );
}

async function explainSelection(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.document.getText(editor.selection);
  if (!selection.trim()) return;

  const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
  const question = `Explain the architectural purpose, logic flow, and edge cases of this snippet from '${relativePath}':\n\n\`\`\`\n${selection}\n\`\`\``;

  let repoId = getDefaultRepoId();
  if (!repoId) {
    repoId = await autoDetectActiveRepo(context);
  }
  if (!repoId) {
    vscode.window.showErrorMessage("Repo ID not set. Auto-detect or configure default repo ID first.");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens: Explaining selected code...",
    },
    async () => {
      try {
        const payload = await askRepoQuestion(context, repoId, question);
        const citations = Array.isArray(payload?.citations)
          ? payload.citations.map(normalizeCitation).filter(Boolean).map(toWebCitation)
          : [];

        const panel = vscode.window.createWebviewPanel(
          "repolensAnswer",
          "RepoLens: Code Explanation",
          vscode.ViewColumn.Beside,
          { enableCommandUris: ["repolens.openCitation"], localResourceRoots: [] },
        );
        panel.webview.html = renderAnswerHtml(payload?.answer || "No answer.", citations);
      } catch (err) {
        vscode.window.showErrorMessage(`RepoLens error: ${err.message}`);
      }
    },
  );
}

async function refactorSelection(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selection = editor.document.getText(editor.selection);
  if (!selection.trim()) return;

  const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
  const question = `Refactor this code to improve modularity, type safety, performance, and readability in '${relativePath}':\n\n\`\`\`\n${selection}\n\`\`\``;

  let repoId = getDefaultRepoId();
  if (!repoId) {
    repoId = await autoDetectActiveRepo(context);
  }
  if (!repoId) {
    vscode.window.showErrorMessage("Repo ID not set. Auto-detect or configure default repo ID first.");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens: Generating refactor proposal...",
    },
    async () => {
      try {
        const payload = await askRepoQuestion(context, repoId, question);
        const citations = Array.isArray(payload?.citations)
          ? payload.citations.map(normalizeCitation).filter(Boolean).map(toWebCitation)
          : [];

        const panel = vscode.window.createWebviewPanel(
          "repolensAnswer",
          "RepoLens: Refactor Proposal",
          vscode.ViewColumn.Beside,
          { enableCommandUris: ["repolens.openCitation"], localResourceRoots: [] },
        );
        panel.webview.html = renderAnswerHtml(payload?.answer || "No answer.", citations);
      } catch (err) {
        vscode.window.showErrorMessage(`RepoLens error: ${err.message}`);
      }
    },
  );
}

async function ingestRepo(context, sidebarProvider) {
  const sourceUrl = await vscode.window.showInputBox({
    title: "RepoLens Ingest Repository",
    prompt: "Enter GitHub repo URL (e.g. https://github.com/org/repo) or public ZIP URL",
    ignoreFocusOut: true,
  });
  if (!sourceUrl || !sourceUrl.trim()) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens: Ingesting repository & generating vector embeddings...",
    },
    async () => {
      try {
        const data = await ingestRepoByUrl(context, sourceUrl.trim());
        vscode.window.showInformationMessage(`RepoLens ingest completed! Repo ID: ${data?.id || "unknown"}`);
        if (sidebarProvider) {
          await sidebarProvider.refresh();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(`RepoLens ingest failed: ${message}`);
      }
    },
  );
}

function activate(context) {
  const sidebarProvider = new RepoLensSidebarProvider(context);

  // Auto-detect on activation if configured
  if (getConfig().get("autoDetectGitOrigin", true) && !getDefaultRepoId()) {
    void autoDetectActiveRepo(context).then(() => sidebarProvider.refresh());
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, sidebarProvider),
    vscode.commands.registerCommand("repolens.setApiKey", async () => {
      await setApiKey(context);
      await sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand("repolens.setRepoId", async () => {
      await setRepoId();
      await sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand("repolens.autoDetectRepo", async () => {
      await autoDetectActiveRepo(context);
      await sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand("repolens.askQuestion", () => askQuestion(context)),
    vscode.commands.registerCommand("repolens.askSelection", () => askAboutSelection(context)),
    vscode.commands.registerCommand("repolens.explainSelection", () => explainSelection(context)),
    vscode.commands.registerCommand("repolens.refactorSelection", () => refactorSelection(context)),
    vscode.commands.registerCommand("repolens.ingestRepo", () => ingestRepo(context, sidebarProvider)),
    vscode.commands.registerCommand("repolens.refreshSidebar", () => sidebarProvider.refresh()),
    vscode.commands.registerCommand("repolens.enableGuestMode", async () => {
      const enabled = getGuestMode();
      const choice = await vscode.window.showInformationMessage(
        enabled ? "Disable Guest Mode?" : "Enable Guest Mode (allow anonymous queries)?",
        { modal: true },
        enabled ? "Disable" : "Enable",
      );
      if (choice) {
        await setGuestMode(!enabled);
        vscode.window.showInformationMessage(`Guest Mode ${enabled ? "disabled" : "enabled"}.`);
        await sidebarProvider.refresh();
      }
    }),
    vscode.commands.registerCommand("repolens.showOnboarding", async () => {
      const panel = vscode.window.createWebviewPanel(
        "repolensOnboard",
        "RepoLens Quickstart Guide",
        vscode.ViewColumn.One,
        { enableScripts: true },
      );
      panel.webview.html = `<!doctype html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; max-width: 600px; line-height: 1.6; color: var(--vscode-foreground); }
    h1 { color: #ff7759; margin-top: 0; }
    .step { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 8px; margin-bottom: 12px; }
    kbd { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>⚡ RepoLens VS Code Intelligence</h1>
  <p>Instant codebase Q&A with verified line-level source code citations.</p>
  <div class="step"><b>1. Connect API Key:</b> Press <kbd>Ctrl+Shift+P</kbd> &rarr; <code>RepoLens: Set API Key</code></div>
  <div class="step"><b>2. Auto-Detect Repo:</b> Open a folder with a Git repository and click <b>🎯 Auto Git</b> in the sidebar</div>
  <div class="step"><b>3. Query Anytime:</b> Press <kbd>Ctrl+Alt+L</kbd> or right-click any code selection &rarr; <code>RepoLens: Explain Selected Code</code></div>
</body>
</html>`;
    }),
    vscode.commands.registerCommand("repolens.openCitation", openCitation),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("repolens")) {
        void sidebarProvider.refresh();
      }
    }),
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

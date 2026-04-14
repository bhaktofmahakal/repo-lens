const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vscode = require("vscode");

const EXTENSION_SECRET_API_KEY = "repolens.apiKey";
const SIDEBAR_VIEW_ID = "repolens.sidebar";

function getConfig() {
  return vscode.workspace.getConfiguration("repolens");
}

function getBaseUrl() {
  return String(getConfig().get("baseUrl", "")).trim().replace(/\/$/, "");
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
  if (existing) return existing;
  if (!promptIfMissing) return null;

  const entered = await vscode.window.showInputBox({
    title: "RepoLens API Key",
    prompt: "Enter your RepoLens API key",
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
  vscode.window.showInformationMessage("RepoLens API key saved.");
  return true;
}

async function setRepoId() {
  const current = getDefaultRepoId();
  const entered = await vscode.window.showInputBox({
    title: "RepoLens Default Repo ID",
    prompt: "Enter the repo UUID to use by default",
    value: current,
    ignoreFocusOut: true,
  });

  if (entered === undefined) {
    return false;
  }

  await setDefaultRepoId(entered);
  vscode.window.showInformationMessage("RepoLens default repo ID updated.");
  return true;
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
  return String(value || "").replace(/[&<>]/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    return "&gt;";
  });
}

function isLikelyZipUrl(value) {
  return /\.zip(?:$|\?)/i.test(String(value || ""));
}

async function requestJson({ baseUrl, route, method = "GET", apiKey, body }) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 30000);

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
  if (!apiKey) {
    throw new Error("RepoLens API key is required.");
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
  if (!apiKey) {
    throw new Error("RepoLens API key is required.");
  }

  return requestJson({
    baseUrl,
    route: `/api/v1/repos/${repoId}/query`,
    method: "POST",
    apiKey,
    body: { question: question.trim() },
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
      return `<li><a href="${citation.commandUri}">${escapeHtml(label)}</a></li>`;
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
    body { font-family: var(--vscode-font-family); padding: 16px; line-height: 1.45; }
    h2 { margin: 0 0 10px; }
    pre { white-space: pre-wrap; background: var(--vscode-editor-background); padding: 12px; border-radius: 6px; }
    ul { padding-left: 18px; }
    a { text-decoration: none; }
  </style>
</head>
<body>
  <h2>Answer</h2>
  <pre>${escapeHtml(answerText || "No answer.")}</pre>
  <h2>Citations</h2>
  ${citationList ? `<ul>${citationList}</ul>` : "<p>No citations returned.</p>"}
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
    body { font-family: var(--vscode-font-family); margin: 0; padding: 12px; }
    .meta { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 10px; }
    .block { margin-bottom: 12px; }
    input, button { width: 100%; box-sizing: border-box; }
    input {
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 6px;
    }
    button {
      margin-top: 6px;
      padding: 8px;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 6px;
      cursor: pointer;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .output {
      margin-top: 10px;
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 6px;
      padding: 10px;
      white-space: pre-wrap;
    }
    .citations { margin-top: 8px; padding-left: 18px; }
    .citations li { margin: 4px 0; }
    .status { margin-top: 8px; font-size: 12px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <div class="meta" id="meta"></div>

  <div class="block">
    <input id="sourceUrl" placeholder="GitHub repo URL or ZIP URL" />
    <button id="ingestBtn">Ingest Repository</button>
  </div>

  <div class="block">
    <input id="question" placeholder="Ask a question about this repo" />
    <button id="askBtn">Ask RepoLens</button>
  </div>

  <div class="row">
    <button class="secondary" id="setApiKeyBtn">Set API Key</button>
    <button class="secondary" id="setRepoIdBtn">Set Repo ID</button>
  </div>
  <button class="secondary" id="refreshBtn">Refresh</button>

  <div class="status" id="status"></div>
  <div class="output" id="output">Ask a question to see answers and citations.</div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${safeState};

    const metaEl = document.getElementById("meta");
    const statusEl = document.getElementById("status");
    const outputEl = document.getElementById("output");
    const sourceUrlEl = document.getElementById("sourceUrl");
    const questionEl = document.getElementById("question");

    function renderMeta(s) {
      const keyState = s.hasApiKey ? "set" : "missing";
      const repo = s.repoId || "not set";
      const base = s.baseUrl || "not set";
      metaEl.textContent = "Base URL: " + base + " | Repo ID: " + repo + " | API key: " + keyState;
    }

    function setStatus(text) {
      statusEl.textContent = text || "";
    }

    function renderAnswer(payload) {
      const answer = String(payload.answer || "No answer.");
      const citations = Array.isArray(payload.citations) ? payload.citations : [];

      outputEl.textContent = answer;
      if (!citations.length) {
        return;
      }

      const title = document.createElement("div");
      title.style.marginTop = "8px";
      title.textContent = "Citations:";
      outputEl.appendChild(document.createElement("br"));
      outputEl.appendChild(title);

      const list = document.createElement("ul");
      list.className = "citations";

      for (const c of citations) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = c.commandUri;
        link.textContent = c.filePath + ":L" + c.startLine + "-L" + c.endLine;
        item.appendChild(link);
        list.appendChild(item);
      }

      outputEl.appendChild(list);
    }

    document.getElementById("askBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "ask", question: questionEl.value || "" });
    });

    questionEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        vscode.postMessage({ type: "ask", question: questionEl.value || "" });
      }
    });

    document.getElementById("ingestBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "ingest", sourceUrl: sourceUrlEl.value || "" });
    });

    document.getElementById("setApiKeyBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "setApiKey" });
    });

    document.getElementById("setRepoIdBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "setRepoId" });
    });

    document.getElementById("refreshBtn").addEventListener("click", () => {
      vscode.postMessage({ type: "refresh" });
    });

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (!message || typeof message !== "object") return;

      if (message.type === "state") {
        renderMeta(message.state || {});
      } else if (message.type === "busy") {
        setStatus(message.text || "Working...");
      } else if (message.type === "answer") {
        setStatus("");
        renderAnswer(message);
      } else if (message.type === "error") {
        setStatus("");
        outputEl.textContent = "Error: " + (message.text || "Unknown error");
      } else if (message.type === "info") {
        setStatus(message.text || "");
      }
    });

    renderMeta(state);
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

        if (message.type === "setRepoId") {
          await setRepoId();
          await this.refresh();
          return;
        }

        if (message.type === "ingest") {
          this.post({ type: "busy", text: "Ingesting repository..." });
          const data = await ingestRepoByUrl(this.context, message.sourceUrl);
          this.post({ type: "info", text: `Ingest completed. Repo ID set to ${data?.id || "(unknown)"}.` });
          await this.refresh();
          return;
        }

        if (message.type === "ask") {
          const question = String(message.question || "").trim();
          if (!question) {
            this.post({ type: "error", text: "Question is required." });
            return;
          }

          const repoId = getDefaultRepoId();
          if (!repoId) {
            this.post({ type: "error", text: "Default Repo ID is not set." });
            return;
          }

          this.post({ type: "busy", text: "Generating answer..." });
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
  const repoIdInput = await vscode.window.showInputBox({
    title: "RepoLens Repo ID",
    prompt: "Enter repo ID (leave empty to use default)",
    value: getDefaultRepoId(),
    ignoreFocusOut: true,
  });
  if (repoIdInput === undefined) return;

  const repoId = repoIdInput.trim() || getDefaultRepoId();
  if (!repoId) {
    vscode.window.showErrorMessage("Repo ID is required. Run 'RepoLens: Set Default Repo ID'.");
    return;
  }

  const question = await vscode.window.showInputBox({
    title: "Ask RepoLens",
    prompt: "Ask a question about this repository",
    ignoreFocusOut: true,
  });
  if (!question || !question.trim()) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens is generating an answer...",
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

async function ingestRepo(context, sidebarProvider) {
  const sourceUrl = await vscode.window.showInputBox({
    title: "RepoLens Ingest",
    prompt: "Enter GitHub repo URL or ZIP URL",
    ignoreFocusOut: true,
  });
  if (!sourceUrl || !sourceUrl.trim()) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens is ingesting repository...",
    },
    async () => {
      try {
        const data = await ingestRepoByUrl(context, sourceUrl.trim());
        vscode.window.showInformationMessage(`RepoLens ingest completed. Repo ID: ${data?.id || "unknown"}`);
        await sidebarProvider.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(`RepoLens ingest failed: ${message}`);
      }
    },
  );
}

function activate(context) {
  const sidebarProvider = new RepoLensSidebarProvider(context);

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
    vscode.commands.registerCommand("repolens.askQuestion", () => askQuestion(context)),
    vscode.commands.registerCommand("repolens.ingestRepo", () => ingestRepo(context, sidebarProvider)),
    vscode.commands.registerCommand("repolens.refreshSidebar", () => sidebarProvider.refresh()),
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

const path = require("node:path");
const vscode = require("vscode");

const EXTENSION_SECRET_API_KEY = "repolens.apiKey";

function getConfig() {
  return vscode.workspace.getConfiguration("repolens");
}

async function getApiKey(context) {
  const existing = await context.secrets.get(EXTENSION_SECRET_API_KEY);
  if (existing) return existing;

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

function normalizeCitation(raw) {
  if (!raw || typeof raw !== "object") return null;

  const filePath = raw.filePath || raw.file_path;
  const startLineRaw = raw.startLine ?? raw.start_line;
  const endLineRaw = raw.endLine ?? raw.end_line;

  if (!filePath || typeof filePath !== "string") return null;

  const startLine = Number(startLineRaw || 1);
  const endLine = Number(endLineRaw || startLine || 1);

  return {
    filePath,
    startLine: Number.isFinite(startLine) && startLine > 0 ? startLine : 1,
    endLine: Number.isFinite(endLine) && endLine > 0 ? endLine : Math.max(1, startLine || 1),
  };
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
    return;
  }

  await context.secrets.store(EXTENSION_SECRET_API_KEY, entered.trim());
  vscode.window.showInformationMessage("RepoLens API key saved.");
}

async function setRepoId() {
  const cfg = getConfig();
  const current = cfg.get("repoId", "");

  const entered = await vscode.window.showInputBox({
    title: "RepoLens Default Repo ID",
    prompt: "Enter the repo UUID to use by default",
    value: current,
    ignoreFocusOut: true,
  });

  if (entered === undefined) {
    return;
  }

  await cfg.update("repoId", entered.trim(), vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage("RepoLens default repo ID updated.");
}

async function openCitation(citation) {
  if (!citation || typeof citation !== "object") return;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage("Open a workspace folder to jump to citations.");
    return;
  }

  const normalized = normalizeCitation(citation);
  if (!normalized) {
    vscode.window.showErrorMessage("Invalid citation payload.");
    return;
  }

  const fullPath = path.join(workspaceFolder.uri.fsPath, normalized.filePath);
  const uri = vscode.Uri.file(fullPath);

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, { preview: false });

    const start = new vscode.Position(Math.max(0, normalized.startLine - 1), 0);
    const end = new vscode.Position(Math.max(0, normalized.endLine - 1), 0);
    const range = new vscode.Range(start, end);

    editor.selection = new vscode.Selection(start, start);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  } catch {
    vscode.window.showErrorMessage(`Citation file not found in current workspace: ${normalized.filePath}`);
  }
}

function renderAnswerHtml(answerText, citations) {
  const escapedAnswer = String(answerText || "").replace(/[&<>]/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    return "&gt;";
  });

  const citationList = citations
    .map((citation) => {
      const payload = encodeURIComponent(JSON.stringify(citation));
      const label = `${citation.filePath}:L${citation.startLine}-L${citation.endLine}`;
      return `<li><a href=\"command:repolens.openCitation?${payload}\">${label}</a></li>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <style>
    body { font-family: var(--vscode-font-family); padding: 16px; line-height: 1.45; }
    h1, h2 { margin: 0 0 10px; }
    pre { white-space: pre-wrap; background: var(--vscode-editor-background); padding: 12px; border-radius: 6px; }
    a { text-decoration: none; }
    ul { padding-left: 18px; }
  </style>
</head>
<body>
  <h2>Answer</h2>
  <pre>${escapedAnswer}</pre>
  <h2>Citations</h2>
  ${citationList ? `<ul>${citationList}</ul>` : "<p>No citations returned.</p>"}
</body>
</html>`;
}

async function askQuestion(context) {
  const cfg = getConfig();
  const baseUrl = String(cfg.get("baseUrl", "")).trim().replace(/\/$/, "");
  if (!baseUrl) {
    vscode.window.showErrorMessage("Set repolens.baseUrl in settings first.");
    return;
  }

  const configuredRepoId = String(cfg.get("repoId", "")).trim();
  const repoIdInput = await vscode.window.showInputBox({
    title: "RepoLens Repo ID",
    prompt: "Enter repo ID (leave empty to use default)",
    value: configuredRepoId,
    ignoreFocusOut: true,
  });
  if (repoIdInput === undefined) return;

  const repoId = repoIdInput.trim() || configuredRepoId;
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

  const apiKey = await getApiKey(context);
  if (!apiKey) {
    vscode.window.showErrorMessage("RepoLens API key is required.");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RepoLens is generating an answer...",
    },
    async () => {
      try {
        const response = await fetch(`${baseUrl}/api/v1/repos/${repoId}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ question: question.trim() }),
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message = payload?.error || payload?.message || `Request failed (${response.status})`;
          vscode.window.showErrorMessage(`RepoLens request failed: ${message}`);
          return;
        }

        const citations = Array.isArray(payload?.citations)
          ? payload.citations.map(normalizeCitation).filter(Boolean)
          : [];

        const panel = vscode.window.createWebviewPanel(
          "repolensAnswer",
          "RepoLens Answer",
          vscode.ViewColumn.Beside,
          {
            enableCommandUris: true,
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

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("repolens.setApiKey", () => setApiKey(context)),
    vscode.commands.registerCommand("repolens.setRepoId", setRepoId),
    vscode.commands.registerCommand("repolens.askQuestion", () => askQuestion(context)),
    vscode.commands.registerCommand("repolens.openCitation", openCitation),
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

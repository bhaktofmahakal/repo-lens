# RepoLens for VS Code ⚡🔍

> **Enterprise-Grade AI Codebase Intelligence & Line-Level Source Citations in Your Editor**

RepoLens turns your workspace into an interactive, grounded AI knowledge engine. Ask architectural questions, investigate unfamiliar modules, and trigger AI-assisted refactoring suggestions—with verified line-range citations that open directly to the source in your editor.

[![VS Code](https://img.shields.io/badge/VS_Code-1.90+-007ACC?style=flat&logo=visualstudiocode)](https://code.visualstudio.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange?style=flat)](https://groq.com/)
[![pgvector](https://img.shields.io/badge/Supabase-pgvector-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## ✨ Features

- **⚡ Grounded In-Editor Q&A**: Interrogate your indexed repositories directly from the sidebar or via Command Palette without switching to a browser.
- **📍 Verifiable Line Citations**: Every answer provides clickable citation pills (`src/auth/guard.ts:L14-L85`) that jump directly to the exact file and select the line range.
- **🎯 1-Click Git Remote Auto-Detection**: Automatically detects your active workspace's Git origin and targets the indexed repository on RepoLens without manual UUID entry.
- **📝 Editor Context Menu Actions**:
  - Right-click any highlighted code snippet &rarr; **RepoLens: Ask About Selected Code**
  - Right-click any function or class &rarr; **RepoLens: Explain Selected Code**
  - Right-click legacy code &rarr; **RepoLens: Refactor Selected Code**
- **🛠️ AI Architectural Refactoring**: Evaluate cyclomatic complexity and receive decoupling diff recommendations right inside VS Code.
- **🎨 Cohere 2026 Dark Slate UI**: High-contrast theme matching the RepoLens web design language (`#0e0e11`, `#ff7759`), with quick prompt pills and cybernetic telemetry indicators.

---

## 🚀 Quick Setup

### 1. Configure Extension
1. Install the extension in VS Code.
2. Sign in to your RepoLens dashboard at [https://repo-lens-gamma.vercel.app](https://repo-lens-gamma.vercel.app).
3. Navigate to **Settings &rarr; API Keys** and copy your personal API key (`rpl_...`).
4. In VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run:
   ```
   RepoLens: Set API Key
   ```
5. Paste your API key. It is saved in VS Code's encrypted OS SecretStorage.

### 2. Connect Your Repository
- If your open workspace has a Git remote origin configured, simply click **🎯 Auto Git** in the RepoLens sidebar.
- Or run `RepoLens: Set Default Repo ID` to specify a repository UUID.
- If you haven't indexed your repository yet, click **📥 Ingest Repo** in the sidebar and enter your GitHub repository URL.

---

## ⌨️ Keyboard Shortcuts

| Command | Windows / Linux | macOS | Context |
|---|---|---|---|
| **Ask RepoLens** | `Ctrl + Alt + L` | `Cmd + Alt + L` | Global |
| **Refactor Selection** | `Ctrl + Alt + R` | `Cmd + Alt + R` | In Editor (with selection) |
| **Command Palette** | `Ctrl + Shift + P` | `Cmd + Shift + P` | `RepoLens: ...` |

---

## 📜 Available Commands

- `RepoLens: Ask a Question` — Ask a question about the active repository with notifications progress and side-by-side response panel.
- `RepoLens: Ask About Selected Code` — Query RepoLens with the highlighted code snippet attached as context.
- `RepoLens: Explain Selected Code` — Get an architectural and logical breakdown of the selected function/class.
- `RepoLens: Refactor Selected Code` — Generate decoupled, optimized refactor suggestions for the selection.
- `RepoLens: Auto-Detect Active Git Repo` — Sync active repository from `git remote origin`.
- `RepoLens: Ingest Repository URL` — Index a new GitHub URL or ZIP archive on your account.
- `RepoLens: Set API Key` — Store your RepoLens API key.
- `RepoLens: Set Default Repo ID` — Set the active repository UUID manually.
- `RepoLens: Toggle Guest Mode` — Enable/disable anonymous queries.
- `RepoLens: Refresh Sidebar` — Refresh sidebar connection state.

---

## ⚙️ Configuration Settings

You can customize the extension behavior in **Settings (`Ctrl+,`) &rarr; Extensions &rarr; RepoLens**:

| Setting | Default | Description |
|---|---|---|
| `repolens.baseUrl` | `https://repo-lens-gamma.vercel.app` | RepoLens API gateway endpoint. Set to your custom domain or localhost if self-hosting. |
| `repolens.repoId` | `""` | Active default repository UUID for queries. |
| `repolens.autoDetectGitOrigin` | `true` | Automatically detect the active repository UUID from the local `.git/config` remote URL. |
| `repolens.guestMode` | `false` | Allow anonymous queries without requiring an API key. |

---

## 📦 Packaging & Local Installation

To build a `.vsix` package for manual installation:

```bash
cd vscode-extension
npm install -g @vscode/vsce
vsce package
code --install-extension repolens-vscode-extension-0.1.0.vsix
```

---

## 📄 License

MIT © [RepoLens](https://repo-lens-gamma.vercel.app)

# RepoLens CLI 🔍⚡

> **High-Performance Terminal Interface for Semantic Codebase Intelligence & Line Citations**

The RepoLens CLI brings enterprise-grade AI repository interrogation directly to your terminal. Whether you're investigating unfamiliar codebases, auditing pull requests, or debugging complex async architectures, RepoLens delivers citation-backed answers with zero context switching.

---

## ⚡ Key Capabilities

- **🧠 Multi-Tier Semantic Retrieval**: Powered by Groq Cloud (`llama-3.3-70b-versatile`) with Hugging Face `all-mpnet-base-v2` 768-D embeddings in Supabase `pgvector`.
- **📍 Grounded Line Citations**: Every answer includes exact source file paths and line ranges (`path/file.ts:L14-L85`).
- **🎯 Local Git Remote Auto-Detection**: Automatically identifies your active repository from `git remote get-url origin`—no need to copy and paste repository UUIDs manually.
- **💬 Interactive Chat REPL**: Multi-turn conversation mode with slash commands (`/repos`, `/switch <id>`, `/clear`, `/exit`).
- **🛠️ In-Terminal Architectural Refactoring**: Generate clean architectural improvements and decoupling strategies with expected impact.
- **📜 File Explanation (`repolens explain <path>`)**: Instant deep-dive into the architectural role, exports, and dependencies of any local file.
- **⚙️ Machine-Readable JSON Output**: All commands support `--json` for direct piping into CI/CD pipelines, jq, or GitHub Actions.

---

## 🚀 Installation & Quick Start

### Option 1: Run with `npx` (Zero Install)

```bash
npx repolens --help
```

### Option 2: Link Locally in Workspace

```bash
# From root repository
npm link
repolens --help
```

### Option 3: Run with npm script

```bash
npm run cli -- <command>
```

---

## 🔑 Authentication

### 1. Obtain Your API Key
1. Sign in to RepoLens at [https://repo-lens-gamma.vercel.app](https://repo-lens-gamma.vercel.app).
2. Navigate to **Dashboard → Settings → API Keys**.
3. Generate a new key (prefix: `rpl_...`).

### 2. Authenticate CLI

```bash
# Interactive prompt
repolens auth login

# Or pass flag directly
repolens auth login --key rpl_your_secret_api_key

# Verify active status
repolens whoami
```

Credentials are securely stored locally at `~/.repolens/config.json`.

---

## 💻 Command Reference

### `repolens whoami`
Displays your current gateway URL, masked API key, active default repository, and real-time ping to the production gateway.

```bash
$ repolens whoami
AUTHENTICATION & GATEWAY STATUS:
- Gateway URL:    https://repo-lens-gamma.vercel.app
- API Key:        rpl_••••••••8a9f
- Default Repo:   084f47ec-547e-405a-8b17-062e737c02b1
- Gateway Ping:   Online (82ms)
- Accessible Repos: 4
```

---

### `repolens list`
Lists all indexed repositories in your workspace with chunk counts and indexation readiness.

```bash
$ repolens list
INDEXED REPOSITORIES (3):

┌──────────────────────────────────────┬──────────────────────────────┬──────────┬────────┐
│ UUID                                 │ REPOSITORY NAME              │ CHUNKS   │ STATUS │
├──────────────────────────────────────┼──────────────────────────────┼──────────┼────────┤
│ 084f47ec-547e-405a-8b17-062e737c02b1*│ repo-lens                    │ 184      │ ready  │
│ a12f84b3-6590-410a-9d21-4f10738a9bc1 │ fast-agent-runtime           │ 512      │ ready  │
└──────────────────────────────────────┴──────────────────────────────┴──────────┴────────┘
(*) Marked as current default repository
```

---

### `repolens ask <question>`
Interrogates your codebase and outputs structured markdown with verified source citations.

```bash
$ repolens ask "How does the route security guard work in Next.js middleware?"
```

**Options:**
- `--repo <uuid>`: Target specific repo (optional if in git directory).
- `--json`: Format output as JSON.

---

### `repolens chat`
Launches an interactive, continuous terminal session.

```bash
$ repolens chat
INTERACTIVE CONVERSATIONAL REPL
Target Repository: 084f47ec-547e-405a-8b17-062e737c02b1
Type your question and press Enter. Special commands:
  /repos       List repositories
  /switch <id> Switch target repository
  /clear       Clear console screen
  /exit        Close chat session

repolens > Where are public sessions shared?
```

---

### `repolens explain <filePath>`
Analyzes a local file and explains its exports, design patterns, and dependencies based on vector chunks.

```bash
repolens explain src/middleware.ts
repolens explain src/components/ui/EngagingLoaders.tsx
```

---

### `repolens refactor`
Generates architectural decoupling and refactoring recommendations.

```bash
repolens refactor --scope "Reduce cyclomatic complexity in query handler"
```

---

### `repolens ingest <url>`
Indexes a new public GitHub repository or ZIP archive URL with live telemetry progress.

```bash
repolens ingest https://github.com/facebook/react
repolens ingest https://example.com/source-archive.zip
```

---

### `repolens history`
Inspect past Q&A audit trails and citations for any repository.

```bash
repolens history
repolens history <repo-uuid>
```

---

### `repolens config`
Inspect and update local CLI settings.

```bash
repolens config list
repolens config set baseUrl https://your-custom-deployment.vercel.app
repolens config set defaultRepoId <uuid>
```

---

## 🤖 CI / CD & GitHub Actions Usage

You can use RepoLens CLI directly inside GitHub Actions for automated code review checks:

```yaml
name: RepoLens Code Intelligence Check
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install RepoLens CLI
        run: npm install -g repo-lens
      - name: Ask Architecture Sanity Check
        env:
          REPOLENS_API_KEY: ${{ secrets.REPOLENS_API_KEY }}
        run: |
          repolens ask "Check if this PR introduces circular dependencies in src/lib" --json > report.json
          cat report.json
```

---

## 📄 License

MIT © [RepoLens](https://repo-lens-gamma.vercel.app)

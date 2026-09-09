# RepoLens 🔍⚡

> **Enterprise-Grade AI Codebase Intelligence & Citation-Backed Semantic Search Engine**  
> *100% Free & Open Developer Platform • Zero Paywalls • Built for September 2026 Production Standards*

[![Live Production](https://img.shields.io/badge/Production-Live-22c55e?style=flat&logo=vercel)](https://repo-lens-gamma.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-Qwen_3.8_27B_·_GPT--OSS-orange?style=flat)](https://groq.com/)
[![Hugging Face](https://img.shields.io/badge/Hugging_Face-768--D_Embeddings-yellow?style=flat)](https://huggingface.co/sentence-transformers/all-mpnet-base-v2)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## 🌐 Live Platform & Documentation

- **Web Application Portal**: [https://repo-lens-gamma.vercel.app](https://repo-lens-gamma.vercel.app)
- **Interactive OpenAPI / Swagger Docs**: [https://repo-lens-gamma.vercel.app/api/docs](https://repo-lens-gamma.vercel.app/api/docs)
- **OpenAPI 3.0.3 Specification**: [https://repo-lens-gamma.vercel.app/api/docs/openapi.json](https://repo-lens-gamma.vercel.app/api/docs/openapi.json)
- **System Telemetry & Health Probe**: [https://repo-lens-gamma.vercel.app/status](https://repo-lens-gamma.vercel.app/status)

---

## 💡 Overview

**RepoLens** is an open-source codebase intelligence engine that eliminates hallucinations and context switching. Ingest any GitHub repository or uploaded ZIP archive to create dense 768-dimensional vector representations in PostgreSQL (`pgvector`). 

Ask natural-language questions about complex codebases, investigate async data flows, audit pull requests, and generate architectural refactoring diffs—where **every single assertion is grounded in verified file-path and line-range citations** (`path/file.ts:L14-L85`) linking directly to the source code.

### 🎨 Design System: Cohere Obsidian Enterprise
Crafted with high-contrast, distraction-free obsidian aesthetics:
- **Canvas**: Obsidian slate (`#0e0e11`, `#141418`, `#17171c`)
- **Accents**: Coral flare (`#ff7759`), Deep spruce (`#003c33`), Emerald verification (`#22c55e`)
- **Typography**: Precision monospace badges, tabular data hierarchies, and sub-pixel code blocks
- **Interactions**: Cybernetic radar scanners, laser progress bars, and zero cumulative layout shift

---

## ✨ Features & Capabilities

### 1. 🧠 Multi-Source Code Ingestion
- **Public GitHub Ingestion**: Index any public repository directly by pasting its HTTPS URL.
- **Organization GitHub App Sync**: Authenticated app integration for automatic repository discovery and webhook push synchronization.
- **Drag-and-Drop ZIP Archives**: Ingest local codebases or private snapshots (≤45 MB) with client-side drag-and-drop.
- **Intelligent File Filtering**: Automatically ignores compiled binaries, images, lockfiles, minified bundles, `.git`, `node_modules`, and temporary caches.

### 2. 📐 Syntax-Aware AST Chunking & 768-D Vector Embeddings
- **Semantic Windowing**: Splits code into 60-line sliding AST chunks with overlapping contexts, preserving function definitions, class boundaries, and exported interfaces.
- **High-Dimensional Embeddings**: Chunks are encoded via Hugging Face `sentence-transformers/all-mpnet-base-v2` into 768-dimensional dense vector embeddings.
- **pgvector Indexation**: Embeddings are stored in Supabase PostgreSQL with cosine distance operators for sub-50ms vector similarity matching.

### 3. ⚡ High-Speed Inference Engine (Qwen 3.8 27B & GPT-OSS)
- **Groq Cloud Integration**: Neural inference powered by `qwen/qwen3.8-27b` and `openai/gpt-oss-120b` running at ultra-low latency (~280 tokens/sec).
- **Dynamic Model Auto-Discovery**: Automatic failover chain querying active Groq chat models, preventing 404 deprecation outages.
- **Thought Reasoning Cleanup**: Strips reasoning tags (`<think>...</think>`) on the fly to return clean, production-ready markdown answers.

### 4. 📍 Interactive Line Citations & In-App Source Viewer
- **Clickable Citation Badges**: Citations in responses (`[src/lib/auth.ts:L14-L45]`) are automatically rendered as interactive cybernetic chips.
- **Deep-Linked Source Viewer (`/source`)**: Clicking any citation opens the exact file in the built-in source viewer and highlights the cited line range.
- **1-Click Copy & Evidence Chips**: Quick-copy verified code blocks with full file paths for PRs and architectural reviews.

### 5. 🛠️ AI Architectural Refactoring Engine
- **Structural Code Analysis**: Evaluates retrieved AST hierarchies for cyclomatic complexity, coupling points, and modularity bottlenecks.
- **Actionable Unified Diffs**: Generates clean helper extractions, test scaffoldings, and decoupling recommendations with explicit file references.

### 6. 🤝 Public Session Sharing & Multi-Format Export
- **Revocable Public URLs**: Share read-only Q&A audit trails (`/s/[shareUuid]`) with teammates without requiring them to log in.
- **1-Click Revocation**: Instantly revoke public share links at any time from the UI.
- **Multi-Format Export**: Export complete multi-turn interrogation sessions to formatted **Markdown (`.md`)** or machine-readable **JSON (`.json`)**.

### 7. 🛰️ Engaging Cybernetic Loaders (No Boring Spinners)
- **RepoGridLoader**: Pulsing GitHub installation beacon with animated wireframe cards during repository discovery.
- **QuerySynthesisLoader**: Multi-step pipeline tracker showing dense vector encoding, cosine search, and neural token streaming with elapsed timers.
- **RefactorAnalysisLoader**: Cyclomatic complexity radar scanner during refactoring synthesis.
- **FullPageCyberLoader**: Obsidian branded cryptographic decryption state for shared sessions.

### 8. 💻 Modern Developer CLI (`repolens`)
- Built-in terminal CLI located in [`src/cli/`](src/cli/):
  - `repolens auth login / logout`: Manage developer API tokens.
  - `repolens whoami`: Check gateway connection, active user, and default repository.
  - `repolens list`: Browse indexed repositories with vector telemetry.
  - `repolens ask <query>`: Interrogate codebases with auto-detected local git remotes.
  - `repolens chat`: Interactive multi-turn conversational terminal REPL.
  - `repolens explain <path>`: Deep-dive into local file architecture and exports.
  - `repolens refactor`: Output terminal-formatted refactor recommendations and diffs.
  - `repolens status [id]`: Inspect vector dimensions, chunk count, and database health.

### 9. 🧩 VS Code Extension
- Native extension located in [`vscode-extension/`](vscode-extension/):
  - Explorer sidebar Q&A panel with streaming telemetry.
  - Jump-to-citation line selection in the active editor.
  - Right-click editor context menu: *RepoLens: Ask About Selected Code*, *RepoLens: Explain Selected Code*, *RepoLens: Refactor Selected Code*.
  - Global keybindings: `Ctrl+Alt+L` (Ask), `Ctrl+Alt+R` (Refactor).

### 10. 🔒 Strict Security & Privacy
- **Client Route Protection**: Middleware and client authentication guards redirect unauthenticated requests to `/login`.
- **API Key Security**: REST endpoints require Bearer API key authentication (`rl_live_...`). Keys are stored hashed with bcrypt; plaintext secrets are never stored.
- **Row-Level Security (RLS)**: Strict Supabase PostgreSQL policies isolate all repositories, chunks, and Q&A history per authenticated user.
- **Public API Documentation**: Interactive OpenAPI / Swagger docs at `/api/docs` expose only REST schemas without disclosing any user credentials or keys.

---

## 🏗️ System Architecture & Dataflow

```mermaid
flowchart TD
    subgraph Clients ["Client Layer"]
        WEB["Cohere Web Portal (Next.js 15.5)"]
        CLI["RepoLens Terminal CLI (repolens.cjs)"]
        VSC["VS Code Extension (0.1.0)"]
    end

    subgraph Security ["Gateway & Auth Layer"]
        MIDDLEWARE["Edge Auth Guard & Middleware"]
        AUTH_BEARER["API Key Bearer Guard (bcrypt)"]
        SWAGGER["OpenAPI 3.0.3 Swagger UI (/api/docs)"]
    end

    subgraph Pipeline ["Ingestion & Embedding Pipeline"]
        ZIP_INGEST["ZIP Archive Ingestion (≤45 MB)"]
        GIT_INGEST["GitHub API & Octokit Crawler"]
        AST_CHUNKER["60-Line Syntax-Aware AST Chunker"]
        HF_EMBED["Hugging Face all-mpnet-base-v2 (768-D)"]
        PG_VECTOR["Supabase PostgreSQL (pgvector cosine)"]
    end

    subgraph Inference ["Neural Code Intelligence"]
        GROQ_QWEN["Groq Cloud Qwen 3.8 27B"]
        GROQ_GPT["Groq Cloud GPT-OSS 120B (Fallback)"]
        LINKIFIER["AST Citation Linkifier Engine"]
        SOURCE_VIEW["Source Code Viewer & Highlighting"]
    end

    subgraph Sharing ["Collaboration & Export"]
        SHARED_SESSIONS["Revocable Shared Sessions (/s/[uuid])"]
        EXPORT["Markdown (.md) & JSON Export Engine"]
        POSTHOG["Telemetry & Observability"]
    end

    %% Client Routing
    WEB --> MIDDLEWARE --> Pipeline
    CLI --> AUTH_BEARER --> Pipeline
    VSC --> AUTH_BEARER --> Pipeline
    AUTH_BEARER --> SWAGGER

    %% Ingestion Flow
    ZIP_INGEST --> AST_CHUNKER
    GIT_INGEST --> AST_CHUNKER
    AST_CHUNKER --> HF_EMBED
    HF_EMBED --> PG_VECTOR

    %% Query & Inference Flow
    Pipeline --> PG_VECTOR
    PG_VECTOR --> GROQ_QWEN
    GROQ_QWEN -.->|Failover| GROQ_GPT
    GROQ_QWEN --> LINKIFIER
    LINKIFIER --> SOURCE_VIEW
    LINKIFIER --> WEB

    %% Collaboration Flow
    WEB --> SHARED_SESSIONS
    WEB --> EXPORT
    WEB --> POSTHOG
```

---

## 🛠️ Technology Stack

| Layer | Technology | Specification / Role |
|---|---|---|
| **Web Framework** | Next.js 15.5 | React Server Components, App Router, Route Handlers |
| **Frontend Runtime** | React 19 | Server Actions, Concurrent Mode, Suspense Boundaries |
| **Styling & Icons** | Tailwind CSS & Lucide Icons | Obsidian enterprise palette, responsive layouts |
| **Markdown Engine** | React-Markdown & Remark-GFM | GitHub Flavored Markdown, code blocks, syntax chips |
| **Vector Database** | Supabase PostgreSQL | `pgvector` extension, 768-D cosine distance index |
| **Embeddings Model** | Hugging Face Inference API | `sentence-transformers/all-mpnet-base-v2` |
| **LLM Inference** | Groq Cloud SDK | `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `groq/compound-mini` |
| **Authentication** | Supabase Auth & Edge Guards | Password, OAuth, Bcrypt API keys, Row Level Security |
| **Terminal Tooling** | Node.js CLI (`src/cli/`) | Zero-dependency standalone CLI with readline REPL |
| **Editor Integration** | VS Code Extension API | Native webview provider, tree view, workspace detection |
| **Telemetry** | PostHog | Event tracking, query performance, and user metrics |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher (Node 22 recommended)
- **npm**: `v10.0.0` or higher
- **Supabase Project**: Free-tier PostgreSQL with `pgvector` enabled
- **Groq API Key**: Free API key from [Groq Cloud Console](https://console.groq.com)
- **Hugging Face Token**: Free read token from [Hugging Face](https://huggingface.co/settings/tokens)

### 2. Clone & Install
```bash
git clone https://github.com/bhaktofmahakal/repo-lens.git
cd repo-lens
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the project root based on `.env.example`:

```env
# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Credentials (from Supabase Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# LLM Inference (Groq Cloud)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL_ID=qwen/qwen3.8-27b

# Vector Embeddings (Hugging Face)
HF_TOKEN=your-huggingface-token
HF_EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2

# Ingestion Limits
MAX_ZIP_SIZE_MB=45
MAX_TOTAL_FILES=1000
MAX_TOTAL_CHARS=4000000
MAX_FILE_CHARS=200000
GITHUB_FETCH_CONCURRENCY=6
EMBEDDING_DIMENSION=768
DEFAULT_CITATION_LIMIT=5
DEFAULT_SNIPPET_LIMIT=8

# Optional: GitHub App Integration (for organization auto-sync)
NEXT_PUBLIC_ENABLE_GITHUB_LOGIN=false
NEXT_PUBLIC_ENABLE_GITHUB_CONNECT=false
NEXT_PUBLIC_GITHUB_APP_SLUG=your-github-app-slug
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_KEY\n-----END RSA PRIVATE KEY-----"

# Optional: PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

> [!NOTE]
> All environment secrets in `.env.local` are strictly excluded via `.gitignore` and never committed to version control.

### 4. Database Setup
Apply the database schema in your Supabase SQL Editor using [`schema.sql`](schema.sql):
- Creates `sources`, `chunks`, `qa_history`, `shared_sessions`, `api_keys`, and `github_installations`.
- Provisions the `match_chunks` PostgreSQL vector search procedure.
- Activates Row Level Security (RLS) policies.

### 5. Run Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to start indexing and querying codebases.

---

## 💻 CLI Usage Guide

The RepoLens CLI runs with zero installation via `npm run cli` or globally via `npx`:

```bash
# Print interactive help guide
npm run cli -- help

# Authenticate with your RepoLens developer API key
npm run cli -- auth login

# Check gateway status and active user
npm run cli -- whoami

# List all indexed repositories
npm run cli -- list

# Ingest a new GitHub repository
npm run cli -- ingest https://github.com/torvalds/linux

# Query repository (auto-detects active Git repository in current directory)
npm run cli -- ask "Where is memory paging initialized?"

# Launch multi-turn interactive terminal chat session
npm run cli -- chat

# Deep-dive explain a local file
npm run cli -- explain src/lib/auth-guard.ts

# Suggest architectural refactorings with code diffs
npm run cli -- refactor
```

---

## 🧩 VS Code Extension

Located in [`vscode-extension/`](vscode-extension/):
1. **Interactive In-Editor Q&A**: Interrogate codebases directly from the activity bar sidebar.
2. **Clickable Line Citations**: Jumping directly to file coordinates in the active editor.
3. **Context Menu Actions**: Highlight code &rarr; Right Click &rarr; **RepoLens: Explain Selected Code**.
4. **Auto-Detect Remote**: Auto-resolves workspace repository UUID from Git origin remote.

To run extension tests:
```bash
cd vscode-extension
npm test
```

---

## 📖 Public REST API Reference

All endpoints support JSON requests and Bearer token authentication (`Authorization: Bearer rl_live_...`):

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/v1/api-keys` | List active developer API keys | Yes |
| `POST` | `/api/v1/api-keys` | Generate a new developer API key | Yes |
| `DELETE` | `/api/v1/api-keys/{keyId}` | Revoke a developer API key | Yes |
| `GET` | `/api/v1/repos` | List all indexed repositories for account | Yes |
| `POST` | `/api/v1/repos` | Ingest repository via GitHub URL or ZIP | Yes |
| `GET` | `/api/v1/repos/{id}` | Retrieve repository metadata and vector stats | Yes |
| `GET` | `/api/v1/repos/{id}/status` | Check live indexing telemetry and chunk count | Yes |
| `DELETE` | `/api/v1/repos/{id}` | Delete repository and cascade wipe vector chunks | Yes |
| `POST` | `/api/v1/repos/{id}/query` | Query repository with grounded citations | Yes |
| `GET` | `/api/v1/repos/{id}/history` | Fetch paginated historical Q&A inquiry log | Yes |
| `GET` | `/api/share?sourceId={id}` | Get active share state and public link | Yes |
| `POST` | `/api/share` | Generate or update public share link | Yes |
| `DELETE` | `/api/share?sourceId={id}` | Revoke public share link | Yes |
| `GET` | `/api/status` | Real-time platform health & telemetry probe | No |

Interactive Swagger documentation is available at [https://repo-lens-gamma.vercel.app/api/docs](https://repo-lens-gamma.vercel.app/api/docs).

---

## 🧪 Test Suite & Validation

The codebase includes automated unit and integration tests across all core systems:

```bash
# Run Vitest and Node Test Runner (29 automated tests)
npm test

# Run VS Code Extension tests
cd vscode-extension && npm test && cd ..

# TypeScript compilation check
npx tsc --noEmit

# Production bundle build verification
npm run build
```

---

## 📄 License

RepoLens is open-source software licensed under the [MIT License](LICENSE).

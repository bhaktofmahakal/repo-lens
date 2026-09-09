# RepoLens 🔍⚡

> **Enterprise-Grade AI Codebase Intelligence & Citation-Backed Semantic Search Engine**
> 
> *100% Free & Open Developer Platform • Zero Paywalls • Built for September 2026 Production Standards*

[![Live Production](https://img.shields.io/badge/Production-Live-22c55e?style=flat&logo=vercel)](https://repo-lens-gamma.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange?style=flat)](https://groq.com/)
[![Hugging Face](https://img.shields.io/badge/Hugging_Face-768--D_Embeddings-yellow?style=flat)](https://huggingface.co/sentence-transformers/all-mpnet-base-v2)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## 🌐 Live Platform

Access the deployed enterprise portal:  
👉 **[https://repo-lens-gamma.vercel.app](https://repo-lens-gamma.vercel.app)**

Interactive OpenAPI / Swagger Documentation:  
👉 **[https://repo-lens-gamma.vercel.app/api/docs](https://repo-lens-gamma.vercel.app/api/docs)**

---

## 💡 Overview

**RepoLens** transforms any software repository into an interactive, grounded AI knowledge engine. Ingest public GitHub repositories, organization installations, or drag-and-drop ZIP archives to generate high-dimensional vector embeddings stored in Supabase `pgvector`.

Interrogate codebases in natural language and receive answers backed by **verified line-range source citations** (`path/file.ts:L14-L85`) that link directly to the source code. Say goodbye to LLM hallucinations and context switching.

Designed with the **Cohere Enterprise Design System**:
- Canvas: Deep obsidian dark slate (`#0e0e11`, `#17171c`)
- Accents: Coral flare (`#ff7759`), Deep spruce (`#003c33`), Emerald verification (`#22c55e`)
- Cybernetic telemetry animations and zero layout shift

---

## 🚀 Key Capabilities

### 🧠 Semantic Code Ingestion & High-Dimensional Vectors
- Ingest repositories via **Public GitHub URL**, **Drag-and-Drop ZIP Archive**, or **GitHub App** organization sync.
- Recursive syntax-aware AST chunker supporting TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, Markdown, JSON, YAML, and SQL.
- Vectorized using Hugging Face `sentence-transformers/all-mpnet-base-v2` into 768-dimensional embeddings stored in Supabase `pgvector` with cosine similarity indexation.

### ⚡ Ultra-Low Latency Inference Chain
- Powered by **Groq Cloud** running `llama-3.3-70b-versatile` with automatic failover to `llama-3.1-8b-instant` and `mixtral-8x7b-32768`.
- Complete inference roundtrips with vector cosine matching in under 800ms.

### 📍 Grounded Evidence Citations & Source Viewer
- Every synthesized assertion cites exact source files and line ranges.
- Built-in interactive Source Viewer with 1-click chunk copy, syntax highlighting, and active file navigation.

### 🛰️ Cybernetic Telemetry Loaders (No Boring Skeletons)
- Replaces generic grey skeleton boxes with live telemetry tickers:
  - Phase 1: `sentence-transformers/all-mpnet-base-v2 768-D query vector`
  - Phase 2: `Supabase pgvector cosine search`
  - Phase 3: `Groq Llama 3.3 70B versatile synthesis`
  - Phase 4: `Citation verification`
- Laser progress beams, elapsed millisecond timers, and radar cyclomatic complexity scanners.

### 🛠️ Architectural Refactoring Engine
- Deep structural code analysis identifying coupling points, modularity bottlenecks, and cyclomatic complexity.
- Proposes unified refactoring diffs with impact rationale and citations.

### 🤝 Public Sharing & Multi-Format Session Export
- Generate revocable public share URLs for any Q&A session (`/s/[shareUuid]`).
- 1-Click Export to **Markdown (`.md`)** or **JSON (`.json`)** for engineering notes, PR discussions, and architecture decision records (ADRs).

### 💻 Modern Terminal CLI (`repolens`)
- High-performance CLI in [`src/cli/`](src/cli/) with `auth login`, `whoami`, `list`, `ask`, `chat` interactive conversational REPL, `explain`, `refactor`, and `history`.
- Auto-detects local Git remote origin to target the active repository without manual UUID copying.

### 🧩 VS Code Extension (`vscode-extension/`)
- Native extension in [`vscode-extension/`](vscode-extension/) with Explorer sidebar, jump-to-citation line navigation, keyboard shortcuts (`Ctrl+Alt+L`, `Ctrl+Alt+R`), and right-click editor selection context menus.

### 🆓 100% Free Developer Tool
- Zero paywalls, zero quota lockouts, and no billing requirements. Full enterprise capabilities unlocked for every developer.

---

## 🏗️ Architecture & Dataflow

```mermaid
flowchart TD
    subgraph Client ["Client Interfaces"]
        WEB["Cohere Web Portal (Next.js 15.5)"]
        CLI["RepoLens CLI (repolens.cjs)"]
        VSC["VS Code Extension (0.1.0)"]
    end

    subgraph Gateway ["Edge & API Layer"]
        MIDDLEWARE["Edge Auth Guard & Middleware"]
        REST["REST API v1 (/api/v1/*)"]
        SWAGGER["Swagger UI (/api/docs)"]
    end

    subgraph Pipeline ["Ingestion & Vector Pipeline"]
        INGEST["AST Ingestion Parser"]
        EMBED["Hugging Face API (all-mpnet-base-v2)"]
        VECTOR["Supabase pgvector (768-D Cosine)"]
    end

    subgraph LLM ["Inference Engine"]
        GROQ["Groq Cloud (Llama 3.3 70B Versatile)"]
        VERIFY["Citation Line Verifier"]
    end

    WEB --> MIDDLEWARE --> REST
    CLI --> REST
    VSC --> REST
    REST --> SWAGGER
    
    REST --> INGEST
    INGEST --> EMBED
    EMBED --> VECTOR

    REST --> VECTOR
    VECTOR --> GROQ
    GROQ --> VERIFY
    VERIFY --> REST
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15.5 (App Router, Server Components, Route Handlers) |
| **Frontend UI** | React 19, Tailwind CSS, Lucide Icons, React-Markdown, Remark-GFM |
| **Design Language** | Cohere Enterprise 2026 (`#0e0e11`, `#17171c`, `#ff7759`, `#003c33`, `#22c55e`) |
| **Vector Database** | Supabase PostgreSQL with `pgvector` extension (768-dim embeddings) |
| **Embeddings Model** | Hugging Face (`sentence-transformers/all-mpnet-base-v2`) |
| **LLM Inference** | Groq Cloud SDK (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) |
| **Authentication** | Supabase Auth (Email / Password + OAuth) with strict server-side route guards |
| **Integrations** | GitHub App (Octokit API), PostHog Telemetry |
| **Developer Tools** | Terminal CLI (`src/cli/repolens.cjs`), VS Code Extension (`vscode-extension/`) |

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/bhaktofmahakal/repo-lens.git
cd repo-lens
npm install
```

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# LLM Inference (Groq)
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL_ID=llama-3.3-70b-versatile

# Vector Embeddings (Hugging Face)
HF_TOKEN=hf_your_huggingface_token

# Optional: GitHub App Organization Sync
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_APP_CLIENT_ID=your_client_id
GITHUB_APP_CLIENT_SECRET=your_client_secret

# Optional: Telemetry
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
```

### 3. Database Migration

Execute `schema.sql` in the Supabase SQL Editor:
- Creates `sources`, `chunks`, `qa_history`, `shared_qa_sessions`, `api_keys`, and `github_installations`.
- Provisions `match_chunks` vector cosine distance procedure.
- Configures Row Level Security (RLS) policies.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💻 RepoLens Terminal CLI

The CLI is located in [`src/cli/repolens.cjs`](src/cli/repolens.cjs) and provides a full terminal interface:

```bash
# Display help and commands
npm run cli -- help

# Authenticate CLI
npm run cli -- auth login

# Check status and ping
npm run cli -- whoami

# List indexed repositories
npm run cli -- list

# Ingest a repository
npm run cli -- ingest https://github.com/facebook/react

# Ask a question (auto-detects local git repo)
npm run cli -- ask "How does auth guard work?"

# Launch conversational interactive chat REPL
npm run cli -- chat

# Explain a specific local file
npm run cli -- explain src/middleware.ts

# Suggest architectural refactoring
npm run cli -- refactor
```

See [src/cli/README.md](src/cli/README.md) for full documentation.

---

## 🧩 VS Code Extension

Located in [`vscode-extension/`](vscode-extension/):
- Ask questions directly from the Explorer sidebar.
- Click citations to jump directly to the cited file and line range in your workspace.
- Right-click highlighted code to run **RepoLens: Explain Selected Code** or **RepoLens: Refactor Selected Code**.
- Global shortcut: `Ctrl + Alt + L` (`Cmd + Alt + L` on macOS).

To run tests:
```bash
cd vscode-extension
npm test
```

See [vscode-extension/README.md](vscode-extension/README.md) for installation and settings reference.

---

## 📖 Public REST API v1

All core functionality is exposed via token-authenticated endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/repos` | Ingest new repository (GitHub URL or ZIP) |
| `GET` | `/api/v1/repos` | List all user repositories |
| `GET` | `/api/v1/repos/{id}` | Get repository metadata and vector stats |
| `GET` | `/api/v1/repos/{id}/status` | Check ingestion and indexing status |
| `DELETE` | `/api/v1/repos/{id}` | Delete repository and cascade remove vector chunks |
| `POST` | `/api/v1/repos/{id}/query` | Ask a question with semantic retrieval & citations |
| `GET` | `/api/v1/repos/{id}/history` | Retrieve past Q&A audit trails |
| `GET` | `/api/v1/api-keys` | List active developer API keys |
| `POST` | `/api/v1/api-keys` | Generate new developer API key |
| `DELETE` | `/api/v1/api-keys/{keyId}` | Revoke developer API key |

Interactive Swagger documentation is available at `/api/docs`.

---

## 🧪 Testing & Validation

```bash
# TypeScript type check
npx tsc --noEmit

# ESLint validation
npm run lint

# Vitest + Node Test Runner suite (22 unit & integration tests)
npm test

# Production build verification
npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

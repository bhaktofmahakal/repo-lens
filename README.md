# RepoLens 🔍⚡

**Enterprise-Grade AI Codebase Intelligence & Citation-Backed Semantic Search**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange?style=flat)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

---

## Overview

**RepoLens** transforms any repository into an interactive, grounded AI knowledge base. It ingests public GitHub repositories or ZIP archives, generates high-dimensional vector embeddings, and delivers ultra-fast answers with verified line-range source code citations—eliminating hallucinations and keeping engineering teams in flow.

The authenticated portal is crafted with the **Cohere 2026 Enterprise Design System**—featuring a sleek dark canvas (`#0e0e11`), high-contrast pill CTAs, hairline borders, monospace citation labels, and zero layout shift.

---

## ✨ Key Capabilities

- **🚀 Semantic Code Ingestion**:
  - 1-Click ingestion from public GitHub URLs or drag-and-drop ZIP archives.
  - Native **GitHub App** integration with organization repository sync and push webhooks.
  - Smart multi-language parser supporting TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, Markdown, JSON, YAML, and SQL.
- **🧠 Resilient Inference Engine**:
  - Ultra-low latency inference via **Groq Cloud**.
  - Multi-tier automatic fallback chain: `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` → `mixtral-8x7b-32768`.
- **📍 Verified Evidence Citations**:
  - Every answer links directly to exact line ranges (`L14 - L85`) in the source code.
  - Built-in Source Viewer with 1-click chunk copy and path referencing.
- **🛠️ Refactor Suggestions**:
  - AI-assisted diff refactoring suggestions with rationale and expected architectural impact.
- **🤝 Collaboration & Sharing**:
  - Generate revocable public share URLs for any Q&A session.
  - Complete Q&A audit trail and query history with instant repo switching.
- **🔌 Developer Ecosystem**:
  - Full **REST API v1** (`/api/v1/*`) with personal API keys.
  - Interactive **OpenAPI / Swagger** documentation at `/api/docs`.
  - Built-in **CLI** (`repolens`) for terminal-based querying and ingestion.
  - **VS Code Extension** (`vscode-extension/`) for in-editor questions.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15.5 (App Router, Server Actions, Edge Runtime) |
| **Frontend UI** | React 19, Tailwind CSS, Lucide Icons, React-Markdown, Remark-GFM |
| **Design Language** | Cohere Enterprise 2026 (`#0e0e11`, `#17171c`, `#ff7759`, `#003c33`, `#eeece7`) |
| **Vector Database** | Supabase PostgreSQL with `pgvector` (768-dim embeddings) |
| **Embeddings** | Hugging Face Inference API (`sentence-transformers/all-mpnet-base-v2`) |
| **LLM Inference** | Groq Cloud SDK (`llama-3.3-70b-versatile`) |
| **Integrations** | GitHub App (Octokit), Stripe (optional billing), PostHog (analytics) |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/bhaktofmahakal/repo-lens.git
cd repo-lens
npm install
```

### 2. Configure Environment

Copy the example environment configuration:

```bash
cp .env.example .env.local
```

Populate the required environment variables in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# LLM Inference (Groq)
GROQ_API_KEY=gsk_your_groq_key
GROQ_MODEL_ID=llama-3.3-70b-versatile

# Vector Embeddings (Hugging Face)
HF_TOKEN=hf_your_huggingface_token
```

### 3. Database Migration

Run the provided SQL migration in your Supabase SQL Editor:

```bash
schema.sql
```

This provisions:
- `sources` & `chunks` tables with `vector(768)` indexing (Cosine IVFFlat/HNSW).
- `match_chunks` RPC procedure for vector similarity search.
- `qa_history` and `shared_qa_sessions` tables.
- `api_keys` and `github_installations` tables.

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables Guide

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase client anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase admin key for server routes & vector storage |
| `GROQ_API_KEY` | **Yes** | Groq API key for low-latency inference |
| `GROQ_MODEL_ID` | No | Primary LLM (defaults to `llama-3.3-70b-versatile`) |
| `HF_TOKEN` | **Yes** | Hugging Face token for generating vector embeddings |
| `GITHUB_APP_ID` | Optional | GitHub App ID for org repository synchronization |
| `GITHUB_APP_PRIVATE_KEY` | Optional | GitHub App RSA private key (PEM format) |
| `GITHUB_APP_CLIENT_ID` | Optional | GitHub App OAuth client ID |
| `GITHUB_APP_CLIENT_SECRET` | Optional | GitHub App OAuth client secret |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for Pro / Team tier billing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | PostHog telemetry & analytics tracking |

---

## 📖 Public REST API v1

RepoLens provides a secure, token-authenticated REST API for programmatic automation.

Interactive documentation:
- **Interactive Swagger UI**: `GET /api/docs`
- **OpenAPI 3.0 Specification**: `GET /api/docs/openapi.json`

### Core Endpoints

```http
# Repositories
POST   /api/v1/repos              # Ingest a new repository (GitHub URL or ZIP)
GET    /api/v1/repos              # List all user repositories
GET    /api/v1/repos/{id}          # Get repository metadata & stats
DELETE /api/v1/repos/{id}          # Delete repository and delete vectors
GET    /api/v1/repos/{id}/status   # Check ingestion / sync status

# Code Intelligence
POST   /api/v1/repos/{id}/query    # Ask a question with semantic retrieval
GET    /api/v1/repos/{id}/history  # Retrieve past questions and answers

# Developer Keys
GET    /api/v1/api-keys            # List active API keys
POST   /api/v1/api-keys            # Generate new API key
DELETE /api/v1/api-keys/{keyId}    # Revoke an API key
```

**Authorization**: Pass your API key in the `Authorization` header:
```bash
curl -X POST https://your-domain.com/api/v1/repos/{id}/query \
  -H "Authorization: Bearer rpl_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"question": "How is authentication handled in middleware?"}'
```

---

## 💻 CLI Tool

The RepoLens CLI (`repolens`) enables terminal-based ingestion and querying.

```bash
# Display help
npm run cli -- help

# Authenticate CLI
npm run cli -- auth login --key <YOUR_API_KEY> --base-url http://localhost:3000

# Ingest a repository
npm run cli -- ingest https://github.com/facebook/react

# Ask a question
npm run cli -- ask "Where is the reconcileChildren logic implemented?"
```

---

## 🧩 VS Code Extension

Located in [`vscode-extension/`](vscode-extension/):
- Query your indexed repositories directly within VS Code without context switching.
- Jump to cited lines directly in your editor.

To test the extension:
```bash
cd vscode-extension
npm install
npm test
```

---

## 🧪 Testing & Validation

All test suites and production build gates are fully automated:

```bash
# Run ESLint validation
npm run lint

# Run type check
npx tsc --noEmit

# Run unit and integration tests (Vitest + Node Test Runner)
npm test

# Build production bundle
npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

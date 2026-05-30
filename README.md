# Repo Lens

Repo Lens is a application for repository ingestion and question answering with citation-backed responses.

It includes:
- Web app (ingestion, Q&A, history, sharing, dashboard)
- Public API (`/api/v1/*`)
- CLI (`repolens`)
- VS Code extension (in `vscode-extension/`)

## Current Capabilities (from this codebase)

- Ingest a repository from:
  - public GitHub URL
  - ZIP upload / ZIP URL
- Chunk and embed repository content
- Retrieve relevant code/documentation snippets
- Generate answers with line-range citations
- Store query history and feedback
- Manage API keys and query through REST endpoints

Optional integrations exist behind configuration flags (Stripe, GitHub App, webhook auto-sync).

## Tech Stack

- Next.js 15 (App Router), React 19, Tailwind CSS
- Supabase (Postgres + pgvector)
- Groq SDK (answer generation)
- Hugging Face Inference API (embeddings)
- Stripe (optional billing)
- PostHog (optional analytics)

## Prerequisites

- Node.js 20+
- npm
- Supabase project with pgvector enabled

## Quick Start

```bash
git clone https://github.com/bhaktofmahakal/repo-lens.git
cd repo-lens
npm install
cp .env.example .env.local
```

Run the SQL schema in your Supabase project:

- `schema.sql`

Start development server:

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Required Environment Variables (minimum local setup)

Set these in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `HF_TOKEN`

Do not commit `.env.local` or real secrets.

## API

Interactive docs:
- `GET /api/docs`
- `GET /api/docs/openapi.json`

Core endpoints:
- `POST /api/v1/repos`
- `GET /api/v1/repos/{id}`
- `DELETE /api/v1/repos/{id}`
- `GET /api/v1/repos/{id}/status`
- `POST /api/v1/repos/{id}/query`
- `GET /api/v1/repos/{id}/history`
- `GET /api/v1/api-keys`
- `POST /api/v1/api-keys`
- `DELETE /api/v1/api-keys/{keyId}`

Auth format: send your API key as a token in the `Authorization` header.

## CLI

Entrypoint: `src/cli/repolens.cjs`

```bash
npm run cli -- help
npm run cli -- auth login --key <YOUR_API_KEY> --base-url http://localhost:3000
npm run cli -- ingest https://github.com/vercel/next.js
npm run cli -- status
npm run cli -- ask "Where is auth middleware defined?"
```

## VS Code Extension

Location: `vscode-extension/`

Run extension tests:

```bash
cd vscode-extension
npm test
```

## Validation Commands

```bash
npm run lint
npm test
npm run build
```

## Notes on Optional Features

Enable optional integrations by setting variables from `.env.example`:
- GitHub App + webhook auto-sync
- Stripe billing
- PostHog analytics

## License

MIT

# Repo Lens

Repo Lens is a codebase intelligence platform that answers natural-language questions about repositories using citation-backed retrieval.

The project now ships in four surfaces:
- Web app (ingest, ask, history, share, billing)
- Public API (`/api/v1/*`)
- CLI (`repolens`) 

## Product Status (April 2026)

### Implemented

- ZIP and GitHub repository ingestion
  - Web UI upload for local `.zip`
  - API ingestion for GitHub URL or remote ZIP URL
- Private GitHub repository support for paid plans via:
  - GitHub OAuth token connect
  - GitHub App installation token (recommended)
- GitHub push auto-sync pipeline
  - Webhook endpoint receives push events
  - Matching indexed repos are re-ingested into fresh chunks
- Retrieval and answer pipeline
  - File chunking with overlap
  - 768-dim embeddings via Hugging Face
  - pgvector similarity search in Supabase
  - LLM answer generation via Groq
- Evidence UX
  - File-path + line-range citations
  - Retrieved snippet panel
  - Evidence filtering and quick tags
- Session features
  - Q&A history (web and API)
  - Public share links for read-only session history
  - Per-answer feedback endpoint
- Commercial foundation
  - Plan limits (`free`, `pro`, `team`)
  - Stripe checkout + portal + webhook integration
- Developer distribution
  - Public API key system
  - OpenAPI + Swagger docs UI
  - CLI workflow for ingest/status/query


### Current limits and gaps

- Auto-apply refactors is not implemented (suggestions only)
- Advanced incremental/diff indexing is not implemented yet
- Team/RBAC collaboration flows are minimal today

## Core Architecture

1. Ingest source files (ZIP or GitHub)
2. Filter and chunk text/code files
3. Generate vector embeddings
4. Retrieve top semantic matches for a question
5. Generate answer grounded in retrieved chunks
6. Return citations and persist history

## Tech Stack

- Frontend: Next.js 15 (App Router), React 19, Tailwind CSS
- Backend: Next.js Route Handlers
- Auth and DB: Supabase (Postgres + pgvector + RLS)
- Embeddings: Hugging Face Inference API (`all-mpnet-base-v2`)
- LLM: Groq (`llama-3.1-8b-instant`)
- Billing: Stripe
- Observability: PostHog
- Editor integration: VS Code Extension API

## Quick Start (Web App)

### 1. Clone and install

```bash
git clone https://github.com/bhaktofmahakal/repo-lens.git
cd repo-lens
npm install
```

### 2. Configure environment

Use the provided template:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

At minimum, fill these for core local usage:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `HF_TOKEN`
- `GITHUB_TOKEN_ENCRYPTION_KEY`

Optional feature flags:
- `NEXT_PUBLIC_ENABLE_GITHUB_LOGIN`
- `NEXT_PUBLIC_ENABLE_GITHUB_CONNECT`
- `NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC`
- `NEXT_PUBLIC_ENABLE_STRIPE_BILLING`

### 3. Initialize database

Run [schema.sql](schema.sql) in your Supabase SQL editor.

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## Public API

Interactive docs:
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs/openapi.json`

Main endpoints:
- `POST /api/v1/repos` (ingest GitHub URL or ZIP URL)
- `GET /api/v1/repos/{id}/status`
- `POST /api/v1/repos/{id}/query`
- `GET /api/v1/repos/{id}/history`
- `DELETE /api/v1/repos/{id}`

API auth format:
- `Authorization: Bearer rpl_<token>`

Example:

```bash
curl -X POST "http://localhost:3000/api/v1/repos" \
  -H "Authorization: Bearer rpl_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"github_url":"https://github.com/vercel/next.js"}'
```

## CLI

CLI entrypoint: [src/cli/repolens.cjs](src/cli/repolens.cjs)

```bash
npm run cli -- help
npm run cli -- auth login --key <YOUR_API_KEY> --base-url http://localhost:3000
npm run cli -- ingest https://github.com/vercel/next.js
npm run cli -- status
npm run cli -- ask "Where is auth middleware defined?"
```

Notes:
- Config path: `~/.repolens/config.json`
- `ingest` sets default repo ID automatically
- You can override with `--api-key`, `--base-url`, `--repo`

## VS Code Extension

Extension folder: [vscode-extension](vscode-extension)

Current features:
- Explorer sidebar (`RepoLens`)
- Ingest repository URL
- Ask question against selected/default repo
- Open citations directly to file and line in workspace
- API key stored in VS Code SecretStorage

Run extension tests:

```bash
cd vscode-extension
npm test
```

## Optional Setup

### GitHub App + Auto-Sync

For private repo ingestion and webhook-based reindex:

1. Configure:
   - `GITHUB_APP_ID`
   - `GITHUB_APP_PRIVATE_KEY`
   - `NEXT_PUBLIC_GITHUB_APP_SLUG`
2. Enable auto-sync:
   - `NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC=true`
   - `GITHUB_WEBHOOK_SECRET=<secret>`
3. Point GitHub webhook to:
   - `POST /api/github/webhook`

### Stripe Billing

Enable paid checkout and portal:
- `NEXT_PUBLIC_ENABLE_STRIPE_BILLING=true`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_TEAM_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

## Testing and Validation

```bash
npm test
npm run build
```

## Deployment

Deploy on Vercel (or any Next.js-compatible platform) with:
- All required environment variables
- Supabase schema already applied
- Optional provider keys for Stripe/GitHub features

## Naming Note

This open-source project (`repo-lens`) is independent and not affiliated with repositorylens.com.

## Links

- Live app: https://repo-lens-gamma.vercel.app
- Repository: https://github.com/bhaktofmahakal/repo-lens

## Author

- Name: Utsav Mishra
- GitHub: https://github.com/bhaktofmahakal
- LinkedIn: https://linkedin.com/utsav-mishra1

## License

MIT

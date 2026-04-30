**RepoLens**

Product Requirements Document

Startup-Grade SaaS Roadmap --- v1.0 \| April 2026

|            |                                                 |
|------------|-------------------------------------------------|
| **Author** | @bhaktofmahakal                                 |
| **Stack**  | Next.js 15 · Supabase · Groq · pgvector         |
| **Target** | Dev teams · Solo devs · Open-source maintainers |

**1. Product Overview**

RepoLens is a codebase intelligence SaaS. It ingests a Git repository (ZIP upload or GitHub URL), generates vector embeddings for all code and text files, and answers natural-language questions with exact file-path and line-range citations. Unlike generic chat-over-code tools, every answer is grounded --- hallucinations are eliminated by design.

**1.1 Problem Statement**

- Developers spend 30-40% of their time reading and understanding existing code (Stack Overflow Dev Survey 2023).

- Onboarding to a new repo takes 1-4 weeks of unproductive ramp-up time.

- No existing tool combines semantic search + LLM answers + verifiable line-level citations in a single web interface.

- Greptile (closest competitor, YC W24) raised \$4M --- market validation exists.

**1.2 Solution**

RepoLens provides a four-step pipeline: Ingest → Embed → Ask → Verify. The Verify step is the key differentiator --- every answer carries clickable file-path and line-range citations, making it auditable and trustworthy in professional engineering contexts.

**1.3 Current State (April 2026)**

| **Capability**               | **Status**      | **Gap**                  |
|------------------------------|-----------------|--------------------------|
| ZIP upload ingestion         | Live            | ---                      |
| Public GitHub URL ingest     | Live            | ---                      |
| pgvector semantic search     | Live            | ---                      |
| Groq Llama 3.1 answers       | Live            | ---                      |
| Citation proof (file + line) | Live            | ---                      |
| User auth / accounts         | Live but Nextauth       |                  |
| Private GitHub repos         | Missing         | Biggest paid unlock      |
| Pricing / Stripe billing     | Missing         | Zero revenue             |
| Usage analytics              | Missing         | Can\'t improve product   |
| Auto-sync on git push        | Missing         | Stale embeddings = churn |
| Repo size limit              | \> 25 MB blocks | Excludes real codebases  |
| Shareable sessions           | Missing         | No team adoption         |
| VS Code extension            | Missing         | Distribution channel     |
| Public API / CLI             | Missing         | B2B and power users      |

**2. Goals & Success Metrics**

**2.1 North Star Metric**

Weekly Active Repos (WARs) --- number of distinct repos queried in a 7-day window. This captures both new user acquisition and existing user retention in a single number.

**2.2 OKRs by Phase**

| **Phase** | **Timeline** | **Objective**   | **Key Results**                                                        |
|-----------|--------------|-----------------|------------------------------------------------------------------------|
| Phase 0   | Week 1--2    | Fix foundations | Auth live; Posthog tracking; thumbs feedback on answers                |
| Phase 1   | Week 3--6    | First revenue   | \$500 MRR; 3 paid Pro subscribers; Stripe + private repos live         |
| Phase 2   | Month 2--3   | Retention moat  | D7 retention \>40%; auto-sync live; shareable sessions live            |
| Phase 3   | Month 4--6   | Distribution    | VS Code extension: 500 installs; CLI published to npm; Public API live |

**2.3 Metric Hierarchy**

- Primary Business Metric: Monthly Recurring Revenue (MRR) and Weekly Active Repos (WARs)

- Secondary ML Metric: Answer quality score (thumbs-up rate \> 80% on graded questions)

- Guardrail Metrics: Answer latency \< 3s end-to-end; ingestion time \< 60s for repos up to 100 MB; zero PII leakage from private repos

**3. User Personas**

**Persona A --- Solo Developer / OSS Contributor**

- Age 22-32. Frequently onboards to unfamiliar repos. Hates reading code linearly.

- Pain: \'I cloned this repo, I have no idea where the auth logic is.\'

- Job-to-be-done: Answer \'where is X implemented?\' in under 10 seconds.

- Pricing sensitivity: Free tier is the entry. Upgrades for private repos.

**Persona B --- Engineering Team Lead / Senior Engineer**

- Age 28-40. Manages 3-8 engineers. Spends significant time in code reviews and onboarding.

- Pain: \'Every new hire asks the same questions. I need a way to share codebase knowledge.\'

- Job-to-be-done: Shareable session URL to send to new hires. Private repo support.

- Pricing sensitivity: Willing to pay \$19-49/mo if it saves 2+ hours/week per engineer.

**Persona C --- Developer Advocate / OSS Maintainer**

- Age 25-45. Maintains a public repo with 100+ contributors. Fielding the same questions in issues.

- Pain: \'I answer the same architecture questions in issues every week.\'

- Job-to-be-done: Embed RepoLens on the repo\'s docs site. Public-facing shareable sessions.

- Pricing sensitivity: Free tier with embed capability. Pays for higher query limits.

**4. Feature Specifications**

**4.1 Phase 0 --- Foundations (Week 1--2)**

**F-001: User Authentication**

| **Attribute**       | **Detail**                                                                                           |
|---------------------|------------------------------------------------------------------------------------------------------|
| Priority            | P0 --- Blocker for everything else                                                                   |
| Implementation      | Supabase Auth with Google OAuth + GitHub OAuth                                                       |
| User table          | id, email, created_at, plan (free\|pro\|team), stripe_customer_id                                    |
| Session handling    | Supabase JWT, stored in httpOnly cookie via Next.js middleware                                       |
| Redirects           | Post-login → /dashboard. First-time users → /onboarding                                              |
| Acceptance criteria | User can sign in with Google. Session persists across browser restarts. Sign-out clears all cookies. |

**F-002: Usage Analytics (Posthog)**

| **Event**       | **Properties**                                                     | **Why**                       |
|-----------------|--------------------------------------------------------------------|-------------------------------|
| repo_ingested   | repo_size_mb, ingest_method (zip\|github), file_count, duration_ms | Understand input distribution |
| query_submitted | session_id, query_length, chunk_count_retrieved                    | Query volume and complexity   |
| answer_rated    | session_id, rating (up\|down), answer_latency_ms                   | Answer quality signal         |
| plan_upgraded   | from_plan, to_plan, source_page                                    | Conversion funnel             |
| session_shared  | is_public, recipient_count                                         | Virality coefficient          |

**F-003: Answer Quality Feedback**

- Thumbs up / thumbs down on every answer card in the UI.

- Store in Supabase: answer_feedback (id, session_id, query_text, answer_text, rating, created_at).

- Weekly digest email to admin showing low-rated answers for retrieval tuning.

**4.2 Phase 1 --- Monetization (Week 3--6)**

**F-004: Pricing Tiers**

| **Feature**                  | **Free**  | **Pro (\$19/mo)**    | **Team (\$49/mo)**        |
|------------------------------|-----------|----------------------|---------------------------|
| Repos / month                | 3         | 25                   | Unlimited                 |
| Queries / month              | 50        | 500                  | Unlimited                 |
| Private repos (GitHub OAuth) | No        | Yes                  | Yes                       |
| Repo size limit              | 25 MB     | 200 MB               | 500 MB                    |
| Q&A history retention        | 7 days    | 90 days              | Forever                   |
| Shareable sessions           | No        | Read-only public URL | Password-protected + team |
| API access                   | No        | No                   | Yes (Rate: 100 req/hr)    |
| Support                      | Community | Email (48h)          | Priority (24h)            |

**F-005: Stripe Billing Integration**

- Stripe Checkout for plan upgrades. Webhook handler for payment events.

- Supabase trigger: on successful payment → update users.plan and create subscriptions row.

- Billing portal link in dashboard settings for downgrades and cancellation.

- Dunning emails via Stripe built-in retry logic (3 attempts over 7 days before downgrade to Free).

**F-006: Private GitHub Repo Ingestion**

- GitHub OAuth scope: repo (read-only). Store encrypted access token in Supabase Vault.

- On ingest: clone private repo server-side using token. Delete clone after embedding. Never persist raw code.

- Token refresh: store GitHub OAuth refresh token. Re-authenticate silently on expiry.

- Security: Repos are scoped per user. No cross-user access. Embeddings stored with user_id FK.

**4.3 Phase 2 --- Retention Moat (Month 2--3)**

**F-007: Auto-Sync on Git Push**

- GitHub App installation (not OAuth) for webhook access.

- Webhook event: push → compute diff (changed + deleted files only) → re-embed diffs → update pgvector rows.

- Background job via Supabase Edge Functions. Progress stored in a sync_jobs table.

- UI shows sync status badge: \'Synced 2 min ago\' or \'Sync in progress\...\'

**F-008: Shareable Sessions**

- Share button generates a UUID-based public URL: /s/\[uuid\].

- Public sessions are read-only. The repo embeddings are not re-exposed --- only past Q&A pairs are visible.

- Team plan: password-protected sessions. Expiry setting (24h / 7d / never).

- View count tracked per session. Sharers can revoke access.

**F-009: Large Repo Support (\> 25 MB → 500 MB)**

- Chunked clone: stream-download via sparse checkout. Process in 50 MB segments.

- Embedding queue: Supabase pg_cron job processes embedding batches. Rate-limited to Hugging Face API limits.

- Progress UI: ingestion shows a progress bar with file count and estimated time remaining.

- Error recovery: if embedding fails mid-batch, resume from last successful chunk (checkpoint in DB).

**4.4 Phase 3 --- Distribution (Month 4--6)**

**F-010: VS Code Extension**

- Extension name: RepoLens for VS Code. Published to VS Code Marketplace.

- Auto-detects opened workspace root and calls RepoLens API to ingest (if not already indexed).

- Sidebar panel: chat-style Q&A. Clicking a citation opens the file at the exact line in the editor.

- Command palette: Cmd+Shift+P → \'RepoLens: Ask a question\'. Hotkey: Cmd+Shift+R.

- Auth: API key from user dashboard, stored in VS Code SecretStorage.

**F-011: Public REST API**

| **Endpoint**                  | **Method** | **Description**                                              |
|-------------------------------|------------|--------------------------------------------------------------|
| POST /api/v1/repos            | POST       | Ingest a repo by GitHub URL or ZIP upload URL                |
| GET /api/v1/repos/:id/status  | GET        | Check ingestion status (pending\|processing\|ready\|error)   |
| POST /api/v1/repos/:id/query  | POST       | Submit a natural-language query. Returns answer + citations. |
| GET /api/v1/repos/:id/history | GET        | Paginated Q&A history for a repo session                     |
| DELETE /api/v1/repos/:id      | DELETE     | Delete repo embeddings and all associated data               |

- Auth: Bearer token (API key) in Authorization header. Rate-limited per plan tier.

- Rate limits: Team plan --- 100 req/hr. Burst: 20 req/min. 429 response with Retry-After header.

- OpenAPI 3.0 spec auto-generated via Swagger. Hosted at /api/docs.

**F-012: CLI Tool (npx repolens)**

- Install: npx repolens or npm install -g repolens.

- Commands: repolens ingest \<github-url\> \| repolens ask \"\<question\>\" \| repolens status \| repolens auth login.

- Config file: \~/.repolens/config.json stores API key and default repo ID.

- Output: colored terminal output. \--json flag for piping to other tools.

**5. Technical Architecture**

**5.1 Current Stack**

| **Layer**          | **Technology**                      | **Notes**                             |
|--------------------|-------------------------------------|---------------------------------------|
| Frontend           | Next.js 15 (App Router)             | TypeScript, Tailwind CSS              |
| Backend            | Next.js API Routes + Server Actions | Edge-compatible where possible        |
| Database           | Supabase (PostgreSQL + pgvector)    | 768-d embeddings, row-level security  |
| Embeddings         | Hugging Face all-mpnet-base-v2      | 768 dimensions, 60-line chunk windows |
| LLM Inference      | Groq API (Llama 3.1 70B)            | \< 2s TTFT on Groq                    |
| Auth (to add)      | Supabase Auth                       | Google + GitHub OAuth                 |
| Payments (to add)  | Stripe                              | Checkout + Webhooks + Portal          |
| Analytics (to add) | Posthog                             | Self-hosted or cloud                  |
| Deployment         | Vercel                              | Serverless functions, edge network    |

**5.2 Data Architecture**

**Database Schema (Key Tables)**

users: id, email, plan, stripe_customer_id, created_at

repos: id, user_id, name, github_url, size_mb, status, last_synced_at, created_at

chunks: id, repo_id, file_path, start_line, end_line, content, embedding (vector 768)

sessions: id, repo_id, user_id, share_uuid (nullable), is_public, created_at

messages: id, session_id, role (user\|assistant), content, citations (jsonb), created_at

answer_feedback: id, message_id, rating (up\|down), created_at

sync_jobs: id, repo_id, status, progress_pct, error_msg, created_at, completed_at

**5.3 Security Requirements**

- All API routes protected by Supabase RLS (Row Level Security). Users can only access their own repos.

- GitHub OAuth tokens stored encrypted in Supabase Vault, never in plain columns.

- Source code is never persisted post-embedding. Clones are deleted immediately after chunking.

- Private repo embeddings are user-scoped. Cross-user vector similarity search is architecturally impossible.

- Rate limiting on all ingestion endpoints to prevent abuse. Cloudflare WAF on Vercel deployment.

**6. Competitive Analysis**

| **Tool**               | **Strength**                            | **Weakness**                                    | **RepoLens Advantage**                          |
|------------------------|-----------------------------------------|-------------------------------------------------|-------------------------------------------------|
| Greptile (YC W24)      | VS Code deep integration, team features | \$4M raised but slow to ship, no free tier      | Citation proof, open-source friendly free tier  |
| Sourcegraph Cody       | Enterprise scale, IDE plugins           | Complex setup, heavy, expensive                 | Zero-config, instant web UI                     |
| GitHub Copilot Chat    | In-editor, Microsoft distribution       | No citation, hallucination-prone on large repos | Verifiable answers, independent of editor       |
| Phind / Perplexity Dev | Web search + code synthesis             | General-purpose, no repo-specific indexing      | Repo-specific, private, citation-backed         |
| ChatGPT + paste code   | Free, familiar UX                       | Context limit kills large repos. No citations.  | Handles full repos, citations, no context limit |

**6.1 Positioning Statement**

> *For developers who need to understand unfamiliar codebases fast, RepoLens is the only tool that combines semantic search, LLM answers, and verifiable line-level citations --- so you can trust every answer without reading the source yourself.*

**7. Go-to-Market Strategy**

**7.1 Launch Channels (No-Code-Marketing First)**

- Hacker News: Show HN post on launch day. Lead with the \'no hallucination\' angle and the free tier.

- GitHub: README badge (\'Ask this repo on RepoLens\'). Target repos with 500+ stars first.

- Product Hunt: Launch after private beta with 20+ authentic reviews from beta users.

- Dev Twitter/X: Demo GIFs showing citation proof. Tag @bhaktofmahakal in demos.

- OSS Community: Offer free Team plan to maintainers of repos with 1000+ stars. They become advocates.

**7.2 Conversion Funnel**

| **Stage**  | **Action**                              | **Conversion Goal**                     |
|------------|-----------------------------------------|-----------------------------------------|
| Awareness  | HN / GitHub / Twitter                   | Click to landing page                   |
| Activation | Try on public repo (no signup required) | 1 answer with citation                  |
| Signup     | Create free account after first answer  | \> 30% of activated users               |
| Engagement | Ingest own repo                         | \> 50% of signed-up users within 7 days |
| Conversion | Hit free tier limit → upgrade CTA       | \> 5% of engaged users                  |
| Retention  | Auto-sync + shareable sessions          | D30 retention \> 25%                    |

**7.3 Pricing Psychology**

- Free tier is generous but limited by private repo access (not query count alone). Private repos are the pain point.

- Pro at \$19/mo is priced below 1 hour of a developer\'s time. Justification is trivial.

- Team at \$49/mo is priced per-workspace, not per-seat. Removes friction for adoption.

- Annual pricing: 2 months free (Pro: \$190/yr, Team: \$490/yr). Shown prominently on pricing page.

**8. Risk Register**

| **Risk**                                      | **Likelihood** | **Impact** | **Mitigation**                                                          |
|-----------------------------------------------|----------------|------------|-------------------------------------------------------------------------|
| Groq API rate limits on high usage            | Medium         | High       | Implement request queuing. Add Anthropic/OpenAI as fallback provider.   |
| Hugging Face inference latency spikes         | Medium         | Medium     | Cache embeddings aggressively. Consider self-hosted model on Fly.io.    |
| GitHub OAuth token revoked by user            | Low            | Medium     | Graceful degradation: mark repo as needs-reauth. Notify user via email. |
| pgvector search latency \> 3s on large repos  | Medium         | High       | Add IVFFLAT index after 10k+ chunks. Set ivfflat.probes = 10.           |
| Stripe webhook failure (missed payment event) | Low            | High       | Idempotent webhook handler. Verify via Stripe dashboard sync daily.     |
| Private code leaked via shared session        | Low            | Critical   | Shared sessions expose Q&A pairs only, never raw code or embeddings.    |
| Competitor (Greptile) launches free tier      | Medium         | Medium     | Double down on citation quality and OSS community positioning.          |

**9. Implementation Roadmap**

| **Phase** | **Week** | **Feature**                                            | **Effort (days)** | **Priority** |
|-----------|----------|--------------------------------------------------------|-------------------|--------------|
| Phase 0   | 1        | F-001: Supabase Auth (Google + GitHub OAuth)           | 2                 | P0           |
| Phase 0   | 1        | F-002: Posthog analytics events                        | 1                 | P0           |
| Phase 0   | 2        | F-003: Answer thumbs feedback                          | 1                 | P0           |
| Phase 0   | 2        | Database migrations (users, sessions, messages tables) | 1                 | P0           |
| Phase 1   | 3        | F-004: Plan tier enforcement in middleware             | 2                 | P1           |
| Phase 1   | 3-4      | F-006: Private GitHub repo ingestion                   | 3                 | P1           |
| Phase 1   | 4-5      | F-005: Stripe Checkout + webhook handler               | 3                 | P1           |
| Phase 1   | 5-6      | Pricing page + upgrade flows in UI                     | 2                 | P1           |
| Phase 2   | 7-8      | F-007: Auto-sync GitHub App + webhook handler          | 4                 | P2           |
| Phase 2   | 8-9      | F-009: Large repo chunked ingestion pipeline           | 5                 | P2           |
| Phase 2   | 10-11    | F-008: Shareable sessions                              | 3                 | P2           |
| Phase 3   | 13-16    | F-011: Public REST API + API key management            | 5                 | P3           |
| Phase 3   | 14-16    | F-010: VS Code extension (MVP)                         | 7                 | P3           |
| Phase 3   | 17-18    | F-012: CLI tool (npx repolens)                         | 3                 | P3           |

**10. Definition of Done**

A feature is \'done\' only when all of the following are true:

- Unit tests pass (critical path: auth, billing, ingestion, query pipeline).

- Posthog event fires correctly in production. Verified in Posthog live view.

- Error states handled gracefully (no unhandled promise rejections, no 500s exposed to user).

- Mobile-responsive on 375px viewport (iPhone SE breakpoint).

- Lighthouse performance score \> 80 on the relevant page.

- Feature flag off by default; enabled via admin panel for staged rollout.

- CHANGELOG.md updated. PR linked to this PRD feature ID (e.g. F-005).

**Appendix A: Open Questions**

- Should the free tier require signup upfront, or allow anonymous queries for the first session? (Recommendation: anonymous for first 3 queries, then gate.)

- Self-host vs Vercel for embedding pipeline when repos exceed 200 MB? (Recommendation: Fly.io Docker container on demand.)

- GitHub App vs GitHub OAuth for auto-sync? (Recommendation: GitHub App --- more scopes, better webhook delivery guarantees.)

- Supabase pgvector vs Pinecone for Phase 3 scale? (Recommendation: Stay on pgvector until 10M+ chunks. Pinecone migration is straightforward via the API.)

**Appendix B: Useful References**

- Supabase Auth docs: supabase.com/docs/guides/auth

- pgvector indexing for scale: github.com/pgvector/pgvector#indexing

- Stripe webhook best practices: stripe.com/docs/webhooks/best-practices

- GitHub App setup: docs.github.com/en/apps/creating-github-apps

- VS Code Extension API: code.visualstudio.com/api

*--- End of PRD ---*

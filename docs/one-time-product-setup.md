# RepoLens One-Time Product Setup (GitHub App + Auto-Sync)

This checklist is for the product developer. End users should only install the GitHub App from dashboard and should not configure repository webhooks manually.

## Step 1: Create and configure GitHub App

1. Open GitHub App creation page: https://github.com/settings/apps/new
2. App name: choose your production app name.
3. Homepage URL: your product URL.
4. Webhook: enabled.
5. Permissions:
- Repository permissions: `Contents` read-only.
- Repository permissions: `Metadata` read-only.
6. Subscribe to webhook events:
- `Push`

## Step 2: Set Setup URL and Webhook URL

Use your deployed HTTPS domain, not localhost.

1. Setup URL:
- `https://<your-domain>/auth/github-app/setup`
2. Webhook URL:
- `https://<your-domain>/api/github/webhook`
3. Webhook secret:
- Keep one strong random secret and use the same value in app env as `GITHUB_WEBHOOK_SECRET`.

Notes:
- Localhost is not reachable by GitHub webhooks.
- For local testing use a tunnel, but production should use the real domain.

## Step 3: Set required environment variables

Values are scaffolded in [.env.local](../.env.local). Fill these in your hosting provider and local env.

1. `NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC=true`
2. `NEXT_PUBLIC_GITHUB_APP_SLUG=<your-app-slug>`
3. `GITHUB_WEBHOOK_SECRET=<same-secret-as-github-app-webhook>`
4. `GITHUB_APP_ID=<github-app-id>`
5. `GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"`

Also keep existing required envs configured:
- Supabase public/service role vars
- `NEXT_PUBLIC_APP_URL`

## Step 4: Run latest schema migration

Apply the latest SQL from [schema.sql](../schema.sql) in Supabase SQL Editor.

At minimum, your DB must contain:
1. `sources.github_installation_id`
2. `github_app_installations` table + policies
3. `sync_jobs.installation_id`

## After setup: expected user flow

1. User opens dashboard.
2. User clicks install button and installs GitHub App.
3. Setup callback links installation to user.
4. User ingests GitHub repo.
5. Push events create sync jobs and dashboard shows status.

## Verification checklist

1. Dashboard shows GitHub App section and installation status.
2. Ingest a GitHub repo succeeds.
3. Push commit to that repo.
4. Auto-sync status updates in dashboard.

## Relevant implementation files

1. Install redirect: [src/app/api/github/app/install/route.ts](../src/app/api/github/app/install/route.ts)
2. Setup callback: [src/app/auth/github-app/setup/route.ts](../src/app/auth/github-app/setup/route.ts)
3. Webhook endpoint: [src/app/api/github/webhook/route.ts](../src/app/api/github/webhook/route.ts)
4. App token helper: [src/lib/github-app.ts](../src/lib/github-app.ts)
5. Auto-sync orchestration: [src/lib/github-autosync.ts](../src/lib/github-autosync.ts)
6. Ingest integration: [src/app/api/ingest/github/route.ts](../src/app/api/ingest/github/route.ts)
7. Dashboard UX: [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx)

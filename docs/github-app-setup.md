# GitHub App Setup (Real Product Flow)

This project now supports GitHub App based integration so end users do not need to manually configure webhooks in their own repositories.

## Why this flow

- One central webhook endpoint for the product.
- Users only click `Install GitHub App` from dashboard.
- Push events trigger auto-sync jobs automatically.
- Private repo access works via installation access token.

## 1. Required environment variables

Set these values in your deployed environment:

- `NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC=true`
- `GITHUB_WEBHOOK_SECRET=<random-strong-secret>`
- `NEXT_PUBLIC_GITHUB_APP_SLUG=<your-github-app-slug>`
- `GITHUB_APP_ID=<github-app-id>`
- `GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"`

Also ensure existing app envs are set (`NEXT_PUBLIC_APP_URL`, Supabase, etc.).

## 2. GitHub App configuration

Open your GitHub App settings and configure:

### General

- **Homepage URL**: your product URL
- **Setup URL**: `https://<your-domain>/auth/github-app/setup`
- **Webhook URL**: `https://<your-domain>/api/github/webhook`
- **Webhook secret**: same as `GITHUB_WEBHOOK_SECRET`

### Permissions (minimum)

- Repository permissions:
  - `Contents`: Read-only
  - `Metadata`: Read-only

### Events

- Subscribe to `Push` event

## 3. User install flow

1. User opens dashboard.
2. User clicks `Install GitHub App` button.
3. User installs app for selected account/org + repositories.
4. GitHub redirects to setup URL.
5. App installation is linked to the user in `github_app_installations`.

## 4. Ingestion + autosync behavior

- On GitHub ingest:
  - App installation is detected and stored when available.
  - Installation token is used if OAuth token is missing.
- On push webhook:
  - Signature is verified.
  - Installation id is extracted when present.
  - Matching sources enqueue sync jobs.
  - Jobs use installation token first, OAuth fallback second.

## 5. Verify after setup

1. Install app from dashboard (`/dashboard`).
2. Ingest a GitHub source.
3. Push a commit to that repository.
4. Check dashboard `GitHub Auto-Sync` section for job status.

## 6. Common failures

- `AUTOSYNC_NOT_CONFIGURED`:
  - Missing/false autosync envs.
- `INVALID_SIGNATURE`:
  - GitHub webhook secret does not match `GITHUB_WEBHOOK_SECRET`.
- `sync job failed`:
  - App does not have access to repository, or token generation failed.

## 7. Important note

For true SaaS UX, keep GitHub App path as primary and treat manual repo webhook/OAuth-only setup as fallback only.

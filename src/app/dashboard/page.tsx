import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GitHubConnectionCard } from "./GitHubConnectionCard";

type GithubSource = {
  id: string;
  name: string;
  github_url: string | null;
  created_at: string;
};

type SyncJob = {
  source_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress_pct: number;
  updated_at: string;
  completed_at: string | null;
  error_msg: string | null;
};

type GithubAppInstallation = {
  installation_id: number;
  account_login: string;
  account_type: string;
  updated_at: string;
};

type DashboardPageProps = {
  searchParams: Promise<{
    github_app?: string;
  }>;
};

function githubAppStatusMessage(status: string | undefined): string | null {
  if (!status) return null;
  if (status === "connected") return "GitHub App connected successfully.";
  if (status === "config_error") return "GitHub App is not configured on the server yet.";
  if (status === "missing_installation") return "Missing installation id in GitHub App setup callback.";
  if (status === "installation_not_found") return "GitHub App installation not found.";
  if (status === "save_failed") return "Failed to save GitHub App installation.";
  if (status === "error") return "Unexpected error during GitHub App setup.";
  return null;
}

function statusBadgeClass(status: SyncJob["status"] | "never"): string {
  if (status === "completed") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "failed") {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }
  if (status === "pending" || status === "processing") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  }
  return "border-white/15 bg-white/5 text-white/65";
}

function statusLabel(job?: SyncJob): string {
  if (!job) return "Not synced yet";
  if (job.status === "processing") return `Sync in progress (${job.progress_pct}%)`;
  if (job.status === "pending") return "Queued";
  if (job.status === "failed") return "Failed";
  return "Synced";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const githubConnectEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_CONNECT === "true";
  const githubAutoSyncEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC === "true";
  const githubAppSlugConfigured = Boolean(process.env.NEXT_PUBLIC_GITHUB_APP_SLUG);
  const githubAppSetupMessage = githubAppStatusMessage(params.github_app);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let githubSources: GithubSource[] = [];
  let githubAppInstallations: GithubAppInstallation[] = [];
  let syncStatusError: string | null = null;
  let githubAppStatusError: string | null = null;
  const latestSyncJobBySource = new Map<string, SyncJob>();

  if (user) {
    const { data: sourceRows, error: sourceError } = await supabase
      .from("sources")
      .select("id, name, github_url, created_at")
      .eq("user_id", user.id)
      .eq("type", "github")
      .order("created_at", { ascending: false })
      .limit(8);

    if (sourceError) {
      syncStatusError = "Unable to load GitHub source list.";
    } else {
      githubSources = (sourceRows as GithubSource[]) || [];
    }

    const { data: installationRows, error: installationError } = await supabase
      .from("github_app_installations")
      .select("installation_id, account_login, account_type, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (installationError) {
      githubAppStatusError = "Unable to load GitHub App installation status.";
    } else {
      githubAppInstallations = (installationRows as GithubAppInstallation[]) || [];
    }

    const { data: syncRows, error: syncError } = await supabase
      .from("sync_jobs")
      .select("source_id, status, progress_pct, updated_at, completed_at, error_msg")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (syncError) {
      syncStatusError = syncStatusError
        ? `${syncStatusError} Auto-sync history is unavailable.`
        : "Auto-sync history is unavailable. Run latest schema migration to enable sync job tracking.";
    } else {
      for (const row of (syncRows as SyncJob[]) || []) {
        if (!latestSyncJobBySource.has(row.source_id)) {
          latestSyncJobBySource.set(row.source_id, row);
        }
      }
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-white/65">
          Manage your workspace, billing, and ingestion sources.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/ask"
          className="rounded-xl border border-white/10 bg-[#111111] p-5 transition-colors hover:border-[#F04D26]/50"
        >
          <h2 className="text-lg font-semibold">Ask Repo</h2>
          <p className="mt-2 text-sm text-white/60">Open the Q&A experience for your indexed repositories.</p>
        </Link>
        <Link
          href="/history"
          className="rounded-xl border border-white/10 bg-[#111111] p-5 transition-colors hover:border-[#F04D26]/50"
        >
          <h2 className="text-lg font-semibold">History</h2>
          <p className="mt-2 text-sm text-white/60">Review previous questions and answers.</p>
        </Link>
        <Link
          href="/dashboard/billing"
          className="rounded-xl border border-white/10 bg-[#111111] p-5 transition-colors hover:border-[#F04D26]/50"
        >
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="mt-2 text-sm text-white/60">Upgrade plan and manage your subscription.</p>
        </Link>
      </div>

      {githubConnectEnabled ? (
        <GitHubConnectionCard />
      ) : (
        <article className="rounded-xl border border-white/10 bg-[#111111] p-5">
          <h2 className="text-lg font-semibold">GitHub Private Repo Connect</h2>
          <p className="mt-2 text-sm text-white/60">
            Temporarily disabled. Public GitHub ingest still works.
          </p>
        </article>
      )}

      <article className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">GitHub App (Recommended)</h2>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              githubAppInstallations.length > 0
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-white/15 bg-white/5 text-white/65"
            }`}
          >
            {githubAppInstallations.length > 0 ? "Installed" : "Not installed"}
          </span>
        </div>

        <p className="mt-2 text-sm text-white/60">
          Install GitHub App once to enable private repo access and automatic push-based re-sync.
        </p>

        {githubAppSetupMessage ? (
          <p className="mt-3 text-xs text-emerald-200">{githubAppSetupMessage}</p>
        ) : null}

        {githubAppStatusError ? <p className="mt-3 text-xs text-amber-200">{githubAppStatusError}</p> : null}

        {!githubAppSlugConfigured ? (
          <p className="mt-3 text-xs text-white/55">
            Configure NEXT_PUBLIC_GITHUB_APP_SLUG, GITHUB_APP_ID, and GITHUB_APP_PRIVATE_KEY to activate this flow.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/github/app/install"
            className="rounded-lg bg-[#F04D26] px-4 py-2 text-sm font-medium text-white hover:bg-[#de4723]"
          >
            Install GitHub App
          </a>
        </div>

        {githubAppInstallations.length > 0 ? (
          <div className="mt-4 space-y-2">
            {githubAppInstallations.map((installation) => (
              <div
                key={installation.installation_id}
                className="rounded-lg border border-white/10 bg-[#151515] px-3 py-2"
              >
                <p className="text-sm font-medium text-white">
                  {installation.account_login} ({installation.account_type})
                </p>
                <p className="mt-1 text-xs text-white/55">
                  Installation ID: {installation.installation_id} · Updated: {new Date(
                    installation.updated_at,
                  ).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">GitHub Auto-Sync</h2>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              githubAutoSyncEnabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-white/15 bg-white/5 text-white/65"
            }`}
          >
            {githubAutoSyncEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <p className="mt-2 text-sm text-white/60">
          Push events from GitHub trigger re-index jobs for matching repositories using app installation tokens.
        </p>

        {syncStatusError ? <p className="mt-3 text-xs text-amber-200">{syncStatusError}</p> : null}

        {!githubAutoSyncEnabled ? (
          <p className="mt-3 text-xs text-white/55">
            Set NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC=true and configure GITHUB_WEBHOOK_SECRET to activate.
          </p>
        ) : null}

        {githubSources.length === 0 ? (
          <p className="mt-4 text-sm text-white/55">No GitHub sources available yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {githubSources.map((source) => {
              const job = latestSyncJobBySource.get(source.id);
              const effectiveStatus = job?.status || "never";
              const statusText = statusLabel(job);
              const lastUpdatedText = job?.completed_at
                ? `Last synced: ${new Date(job.completed_at).toLocaleString()}`
                : job?.updated_at
                  ? `Updated: ${new Date(job.updated_at).toLocaleString()}`
                  : "No sync received yet";

              return (
                <div
                  key={source.id}
                  className="rounded-lg border border-white/10 bg-[#151515] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{source.name}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-white/55">{source.github_url}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${statusBadgeClass(
                        effectiveStatus,
                      )}`}
                    >
                      {statusText}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">{lastUpdatedText}</p>
                  {job?.status === "failed" && job.error_msg ? (
                    <p className="mt-2 text-xs text-red-200">{job.error_msg}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}

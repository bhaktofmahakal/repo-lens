import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GitHubConnectionCard } from "./GitHubConnectionCard";
import { isGithubAppConfigured } from "@/lib/github-app";

type Source = {
  id: string;
  name: string;
  type: string;
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
    github?: string;
    github_app?: string;
  }>;
};

function githubOAuthStatusMessage(status: string | undefined): string | null {
  if (!status) return null;
  if (status === "connected") return "GitHub OAuth connected successfully.";
  if (status === "error") {
    return "GitHub OAuth did not connect. Check provider setup and token encryption config.";
  }
  return null;
}

function githubAppStatusMessage(status: string | undefined): string | null {
  if (!status) return null;
  if (status === "connected") return "GitHub App connected successfully.";
  if (status === "config_error" || status === "unavailable") {
    return "GitHub App setup is currently unavailable. Please try again later.";
  }
  if (status === "missing_installation") {
    return "GitHub did not return installation details. Please try again.";
  }
  if (status === "installation_not_found") {
    return "GitHub App installation could not be verified. Please try again.";
  }
  if (status === "save_failed") {
    return "GitHub App was installed, but linking it to your account failed. Please retry.";
  }
  if (status === "error") {
    return "GitHub App setup did not complete. Please try again.";
  }
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
  const githubAppConfigured = isGithubAppConfigured();
  const githubOAuthSetupMessage = githubOAuthStatusMessage(params.github);
  const githubAppSetupMessage = githubAppStatusMessage(params.github_app);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let sources: Source[] = [];
  let githubAppInstallations: GithubAppInstallation[] = [];
  let sourceStatusError: string | null = null;
  let syncStatusError: string | null = null;
  let githubAppStatusError: string | null = null;
  const latestSyncJobBySource = new Map<string, SyncJob>();

  if (user) {
    const { data: sourceRows, error: sourceError } = await supabase
      .from("sources")
      .select("id, name, type, github_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (sourceError) {
      sourceStatusError = "Unable to load repository list.";
    } else {
      sources = (sourceRows as Source[]) || [];
    }

    // Load installations belonging to this user, and also show unlinked installations
    const { data: installationRows, error: installationError } = await supabase
      .from("github_app_installations")
      .select("installation_id, user_id, account_login, account_type, updated_at")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (installationError) {
      githubAppStatusError = "Unable to load GitHub App installation status.";
    } else {
      githubAppInstallations = (installationRows as GithubAppInstallation[]) || [];
    }

    const githubSourceIds = sources
      .filter((source) => source.type === "github")
      .map((source) => source.id);

    if (githubAutoSyncEnabled && githubSourceIds.length > 0) {
      const { data: syncRows, error: syncError } = await supabase
        .from("sync_jobs")
        .select("source_id, status, progress_pct, updated_at, completed_at, error_msg")
        .eq("user_id", user.id)
        .in("source_id", githubSourceIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (syncError) {
        syncStatusError = "Auto-sync history is unavailable right now.";
      } else {
        for (const row of (syncRows as SyncJob[]) || []) {
          if (!latestSyncJobBySource.has(row.source_id)) {
            latestSyncJobBySource.set(row.source_id, row);
          }
        }
      }
    }
  }

  const latestSource = sources[0];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-white/65">
          Manage your workspace, billing, and ingestion sources.
        </p>
      </div>

      {githubOAuthSetupMessage ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            params.github === "connected"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {githubOAuthSetupMessage}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/ask"
          className="rounded-xl border border-white/10 bg-[#111111] p-5 transition-colors hover:border-[#F04D26]/50"
        >
          <h2 className="text-lg font-semibold">Ask Repo</h2>
          <p className="mt-2 text-sm text-white/60">
            Open the Q&A experience for your indexed repositories.
          </p>
        </Link>
        <Link
          href={latestSource ? `/history?sourceId=${latestSource.id}` : "/ask"}
          className="rounded-xl border border-white/10 bg-[#111111] p-5 transition-colors hover:border-[#F04D26]/50"
        >
          <h2 className="text-lg font-semibold">History</h2>
          <p className="mt-2 text-sm text-white/60">
            {latestSource
              ? "Review previous questions and answers."
              : "Import a repository to create history."}
          </p>
        </Link>
        <Link
          href="/dashboard/billing"
          className="rounded-xl border border-white/10 bg-[#111111] p-5 transition-colors hover:border-[#F04D26]/50"
        >
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="mt-2 text-sm text-white/60">
            Upgrade plan and manage your subscription.
          </p>
        </Link>
      </div>

      {githubConnectEnabled ? (
        <GitHubConnectionCard />
      ) : (
        <article className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="text-lg font-semibold">GitHub OAuth Connection</h2>
          <p className="mt-2 text-sm text-amber-100/80">
            GitHub OAuth connection is disabled in this environment. Public GitHub
            repositories and ZIP uploads can still be imported.
          </p>
        </article>
      )}

      <article className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Recent Sources</h2>
          <Link
            href="/ask"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/5"
          >
            Import
          </Link>
        </div>

        {sourceStatusError ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {sourceStatusError}
          </p>
        ) : sources.length > 0 ? (
          <div className="mt-4 divide-y divide-white/10">
            {sources.map((source) => {
              const syncJob = latestSyncJobBySource.get(source.id);
              const showSync = githubAutoSyncEnabled && source.type === "github";

              return (
                <div
                  key={source.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{source.name}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-wide text-white/55">
                        {source.type}
                      </span>
                      {showSync ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(
                            syncJob?.status || "never",
                          )}`}
                        >
                          {statusLabel(syncJob)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      Added {new Date(source.created_at).toLocaleString()}
                    </p>
                    {syncJob?.status === "failed" && syncJob.error_msg ? (
                      <p className="mt-1 text-xs text-red-300">{syncJob.error_msg}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/ask?sourceId=${source.id}`}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
                    >
                      Ask
                    </Link>
                    <Link
                      href={`/history?sourceId=${source.id}`}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
                    >
                      History
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/60">
            No repositories indexed yet. Import a ZIP or GitHub repository to start asking
            questions.
          </p>
        )}

        {syncStatusError ? (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {syncStatusError}
          </p>
        ) : null}
      </article>

      <article className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">GitHub App Auto-sync</h2>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${
              githubAutoSyncEnabled && githubAppConfigured
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            {githubAutoSyncEnabled && githubAppConfigured
              ? "Ready"
              : githubAppConfigured
                ? "Configured"
                : "Setup required"}
          </span>
        </div>

        <p className="mt-2 text-sm text-white/60">
          {githubAutoSyncEnabled
            ? "Install the GitHub App to keep indexed GitHub repositories up to date from push webhooks."
            : "Automatic GitHub syncing is disabled in this environment."}
        </p>

        <div className="mt-4">
          {githubAppConfigured ? (
            <a
              href="/api/github/app/install"
              className="rounded-lg bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-200"
            >
              Install GitHub App
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/60"
            >
              Install GitHub App
            </button>
          )}
        </div>

        {githubAppSetupMessage ? (
          <p
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              params.github_app === "connected"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/30 bg-red-500/10 text-red-200"
            }`}
          >
            {githubAppSetupMessage}
          </p>
        ) : null}

        {githubAppStatusError ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {githubAppStatusError}
          </p>
        ) : null}

        {githubAppInstallations.length > 0 ? (
          <div className="mt-4 space-y-2">
            {githubAppInstallations.map((installation) => (
              <div
                key={installation.installation_id}
                className="rounded-lg border border-white/10 bg-[#151515] px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {installation.account_login} ({installation.account_type})
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      Installation ID: {installation.installation_id} - Updated: {" "}
                      {new Date(installation.updated_at).toLocaleString()}
                    </p>
                  </div>
                  {installation.user_id ? (
                    <span className="text-xs text-white/60">Linked</span>
                  ) : (
                    <a
                      href={`/auth/github-app/setup?installation_id=${installation.installation_id}`}
                      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/5"
                    >
                      Link to my account
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}

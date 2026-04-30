import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GitHubConnectionCard } from "./GitHubConnectionCard";
import { isGithubAppConfigured } from "@/lib/github-app";

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
  if (status === "config_error" || status === "unavailable") {
    return "GitHub App setup is currently unavailable. Please try again later.";
  }
  if (status === "missing_installation") return "GitHub did not return installation details. Please try again.";
  if (status === "installation_not_found") return "GitHub App installation could not be verified. Please try again.";
  if (status === "save_failed") return "GitHub App was installed, but linking it to your account failed. Please retry.";
  if (status === "error") return "GitHub App setup did not complete. Please try again.";
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
        : "Auto-sync history is unavailable right now.";
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
          href={githubSources.length > 0 ? `/history?sourceId=${githubSources[0].id}` : "/ask"}
          className={`rounded-xl border p-5 transition-colors ${
            githubSources.length > 0
              ? "border-white/10 bg-[#111111] hover:border-[#F04D26]/50"
              : "border-white/10 bg-[#111111]/50 cursor-not-allowed opacity-50"
          }`}
        >
          <h2 className="text-lg font-semibold">History</h2>
          <p className="mt-2 text-sm text-white/60">
            {githubSources.length > 0 ? "Review previous questions and answers." : "Ingest a repo first to view history."}
          </p>
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
        <article className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="text-lg font-semibold">GitHub Private Repo Connect</h2>
          <p className="mt-2 text-sm text-amber-100/80">
            Private repository connection coming in Phase 1. For now, public GitHub repos work perfectly.
          </p>
        </article>
      )}

      <article className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">GitHub App (Coming Phase 2)</h2>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
            Planned
          </span>
        </div>

        <p className="mt-2 text-sm text-amber-100/80">
          Automatic syncing on git push is coming in Phase 2. This will keep your indexed code up-to-date with the latest commits.
        </p>
      </article>
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

      <article className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">GitHub Auto-Sync (Coming Phase 2)</h2>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
            Planned
          </span>
        </div>

        <p className="mt-2 text-sm text-amber-100/80">
          When GitHub App is installed, push events will trigger automatic re-indexing to keep your embeddings fresh.
        </p>
      </article>
    </section>
  );
}

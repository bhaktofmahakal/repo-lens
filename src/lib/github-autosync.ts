import { isConfiguredEnvValue } from "@/lib/config";
import { supabase } from "@/lib/db";
import { getInstallationAccessToken } from "@/lib/github-app";
import { decryptGithubToken } from "@/lib/github-token-crypto";
import { ingestGitHub } from "@/lib/ingestion/github";

type SourceRow = {
  id: string;
  user_id: string;
  github_url: string | null;
  github_installation_id: number | null;
};

type SyncJobRow = {
  id: string;
  source_id: string;
  user_id: string;
  installation_id: number | null;
};

type PushCommit = {
  added?: string[];
  modified?: string[];
  removed?: string[];
};

export type GithubPushSummary = {
  filesAdded: number;
  filesModified: number;
  filesRemoved: number;
};

export type EnqueueGithubPushSyncParams = {
  deliveryId: string;
  eventType: string;
  repoUrl: string;
  installationId?: number | null;
  pushSummary: GithubPushSummary;
};

function normalizeGithubUrl(url: string): string {
  return url.trim().replace(/\.git$/i, "").replace(/\/$/, "").toLowerCase();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Sync failed.";
}

async function getGithubTokenForUser(userId: string): Promise<string | undefined> {
  const { data: tokenRow } = await supabase
    .from("github_tokens")
    .select("encrypted_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow?.encrypted_token) return undefined;

  try {
    return decryptGithubToken(tokenRow.encrypted_token);
  } catch {
    return undefined;
  }
}

async function processSyncJob(
  job: SyncJobRow,
  repoUrl: string,
  summary: GithubPushSummary,
): Promise<void> {
  const startedAtIso = new Date().toISOString();

  await supabase
    .from("sync_jobs")
    .update({
      status: "processing",
      progress_pct: 20,
      started_at: startedAtIso,
      updated_at: startedAtIso,
      error_msg: null,
    })
    .eq("id", job.id);

  try {
    await supabase.from("chunks").delete().eq("source_id", job.source_id);

    let githubToken: string | undefined;

    if (typeof job.installation_id === "number") {
      try {
        githubToken = await getInstallationAccessToken(job.installation_id);
      } catch {
        githubToken = undefined;
      }
    }

    if (!githubToken) {
      githubToken = await getGithubTokenForUser(job.user_id);
    }

    const result = await ingestGitHub(repoUrl, job.source_id, {
      githubToken,
      allowPrivate: true,
      maxRepoSizeMb: Number.POSITIVE_INFINITY,
      userId: job.user_id,
    });

    const completedAtIso = new Date().toISOString();
    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        progress_pct: 100,
        completed_at: completedAtIso,
        updated_at: completedAtIso,
        files_added: summary.filesAdded,
        files_modified: summary.filesModified,
        files_removed: summary.filesRemoved,
        repo_size_bytes: result.repoSizeBytes ?? null,
      })
      .eq("id", job.id);
  } catch (error) {
    const failedAtIso = new Date().toISOString();
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        progress_pct: 100,
        completed_at: failedAtIso,
        updated_at: failedAtIso,
        files_added: summary.filesAdded,
        files_modified: summary.filesModified,
        files_removed: summary.filesRemoved,
        error_msg: getErrorMessage(error).slice(0, 500),
      })
      .eq("id", job.id);
  }
}

export function getRepoUrlFromPushPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const repository = (payload as { repository?: { html_url?: unknown } }).repository;
  if (!repository || typeof repository !== "object") return null;

  const htmlUrl = (repository as { html_url?: unknown }).html_url;
  if (typeof htmlUrl !== "string") return null;

  const normalized = normalizeGithubUrl(htmlUrl);
  return normalized.length > 0 ? normalized : null;
}

export function summarizePushPayload(payload: unknown): GithubPushSummary {
  if (!payload || typeof payload !== "object") {
    return { filesAdded: 0, filesModified: 0, filesRemoved: 0 };
  }

  const commits = (payload as { commits?: unknown }).commits;
  if (!Array.isArray(commits)) {
    return { filesAdded: 0, filesModified: 0, filesRemoved: 0 };
  }

  const added = new Set<string>();
  const modified = new Set<string>();
  const removed = new Set<string>();

  for (const rawCommit of commits) {
    const commit = rawCommit as PushCommit;

    if (Array.isArray(commit.added)) {
      for (const filePath of commit.added) {
        if (typeof filePath === "string") added.add(filePath);
      }
    }

    if (Array.isArray(commit.modified)) {
      for (const filePath of commit.modified) {
        if (typeof filePath === "string") modified.add(filePath);
      }
    }

    if (Array.isArray(commit.removed)) {
      for (const filePath of commit.removed) {
        if (typeof filePath === "string") removed.add(filePath);
      }
    }
  }

  return {
    filesAdded: added.size,
    filesModified: modified.size,
    filesRemoved: removed.size,
  };
}

export function getInstallationIdFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;

  const installation = (payload as { installation?: { id?: unknown } }).installation;
  if (!installation || typeof installation !== "object") return null;

  const idValue = installation.id;
  if (typeof idValue === "number" && Number.isFinite(idValue)) return idValue;

  if (typeof idValue === "string") {
    const parsed = Number.parseInt(idValue, 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

export async function enqueueGithubPushSync(
  params: EnqueueGithubPushSyncParams,
): Promise<number> {
  const normalizedRepoUrl = normalizeGithubUrl(params.repoUrl);

  const { data: allGithubSources, error: sourcesError } = await supabase
    .from("sources")
    .select("id, user_id, github_url, github_installation_id")
    .eq("type", "github");

  if (sourcesError) {
    throw new Error("Failed to load GitHub sources for auto-sync.");
  }

  const sourcesByRepoUrl = (allGithubSources || []).filter((source) => {
    const sourceRow = source as SourceRow;
    if (!sourceRow.github_url) return false;
    return normalizeGithubUrl(sourceRow.github_url) === normalizedRepoUrl;
  });

  const matchedByInstallation =
    typeof params.installationId === "number"
      ? sourcesByRepoUrl.filter((source) => {
          const sourceRow = source as SourceRow;
          return sourceRow.github_installation_id === params.installationId;
        })
      : [];

  const matchedSources =
    matchedByInstallation.length > 0
      ? matchedByInstallation
      : sourcesByRepoUrl.filter((source) => {
          if (typeof params.installationId !== "number") return true;
          const sourceRow = source as SourceRow;
          return sourceRow.github_installation_id === null;
        });

  if (matchedSources.length === 0) {
    return 0;
  }

  const insertRows = matchedSources.map((source) => ({
    source_id: source.id,
    user_id: source.user_id,
    installation_id:
      typeof params.installationId === "number"
        ? params.installationId
        : ((source as SourceRow).github_installation_id ?? null),
    github_delivery_id: params.deliveryId,
    event_type: params.eventType,
    status: "pending",
    progress_pct: 0,
    files_added: params.pushSummary.filesAdded,
    files_modified: params.pushSummary.filesModified,
    files_removed: params.pushSummary.filesRemoved,
    updated_at: new Date().toISOString(),
  }));

  const { data: jobs, error: jobsError } = await supabase
    .from("sync_jobs")
    .upsert(insertRows, { onConflict: "source_id,github_delivery_id" })
    .select("id, source_id, user_id, installation_id");

  if (jobsError) {
    throw new Error("Failed to enqueue auto-sync jobs.");
  }

  for (const rawJob of jobs || []) {
    const job = rawJob as SyncJobRow;
    void processSyncJob(job, normalizedRepoUrl, params.pushSummary);
  }

  return (jobs || []).length;
}

export function isGithubAutoSyncConfigured(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTOSYNC === "true" &&
    isConfiguredEnvValue(process.env.GITHUB_WEBHOOK_SECRET)
  );
}

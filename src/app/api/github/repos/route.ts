import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { requireRequestAuth } from "@/lib/auth-guard";
import {
  getInstallationRepositories,
  isGithubAppConfigured,
  type GithubRepositoryItem,
} from "@/lib/github-app";
import { supabase } from "@/lib/db";
import { decryptGithubToken } from "@/lib/github-token-crypto";

export const dynamic = "force-dynamic";

export type EnrichedGithubRepo = GithubRepositoryItem & {
  is_indexed: boolean;
  source_id: string | null;
  sync_status: "pending" | "processing" | "completed" | "failed" | null;
  sync_progress?: number;
};

export async function GET(req: NextRequest) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user.id;
  const userEmail = auth.user.email?.toLowerCase() || "";
  const emailPrefix = userEmail.split("@")[0]?.toLowerCase() || "";

  try {
    const githubAppReady = isGithubAppConfigured();
    let installations: Array<{
      installation_id: number;
      account_login: string;
      account_type: string;
      updated_at: string;
    }> = [];

    // 1. Fetch GitHub App installations for this user
    if (githubAppReady) {
      // Find all installations directly linked to this user
      const { data: userInstallations } = await supabase
        .from("github_app_installations")
        .select("installation_id, user_id, account_login, account_type, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (userInstallations && userInstallations.length > 0) {
        installations = userInstallations;
      }

      // Check for any unlinked installations that might belong to this user
      const { data: unlinkedInstallations } = await supabase
        .from("github_app_installations")
        .select("installation_id, user_id, account_login, account_type, updated_at")
        .is("user_id", null)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (unlinkedInstallations && unlinkedInstallations.length > 0) {
        for (const unlinked of unlinkedInstallations) {
          const loginLower = unlinked.account_login.toLowerCase();
          // If the unlinked installation matches the user's username or email prefix, auto-link it
          if (
            (emailPrefix && (loginLower === emailPrefix || loginLower.includes(emailPrefix))) ||
            installations.length === 0
          ) {
            await supabase
              .from("github_app_installations")
              .update({ user_id: userId, updated_at: new Date().toISOString() })
              .eq("installation_id", unlinked.installation_id);

            installations.push({
              installation_id: unlinked.installation_id,
              account_login: unlinked.account_login,
              account_type: unlinked.account_type,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    const reposMap = new Map<string, GithubRepositoryItem>();

    // 2. Fetch repos from each GitHub App installation
    for (const inst of installations) {
      try {
        const { repositories } = await getInstallationRepositories(inst.installation_id);
        for (const repo of repositories) {
          reposMap.set(repo.full_name.toLowerCase(), repo);
        }
      } catch (err) {
        console.warn(
          `[api/github/repos] Failed to load repos for installation ${inst.installation_id}:`,
          err,
        );
      }
    }

    // 3. Also check if user has OAuth token in github_tokens
    let hasGithubOAuth = false;
    const { data: tokenRow } = await supabase
      .from("github_tokens")
      .select("encrypted_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenRow?.encrypted_token) {
      try {
        const oauthToken = decryptGithubToken(tokenRow.encrypted_token);
        if (oauthToken) {
          hasGithubOAuth = true;
          const octokit = new Octokit({ auth: oauthToken });
          const { data: oauthRepos } = await octokit.repos.listForAuthenticatedUser({
            sort: "updated",
            per_page: 100,
          });

          for (const repo of oauthRepos) {
            const key = repo.full_name.toLowerCase();
            if (!reposMap.has(key)) {
              reposMap.set(key, {
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                private: Boolean(repo.private),
                html_url: repo.html_url,
                description: repo.description ?? null,
                default_branch: repo.default_branch || "main",
                stargazers_count: repo.stargazers_count || 0,
                language: repo.language ?? null,
                updated_at: repo.updated_at || new Date().toISOString(),
                pushed_at: repo.pushed_at ?? undefined,
                owner: {
                  login: repo.owner.login,
                  avatar_url: repo.owner.avatar_url,
                  type: repo.owner.type,
                },
              });
            }
          }
        }
      } catch (err) {
        console.warn("[api/github/repos] Failed to load repos via OAuth token:", err);
      }
    }

    // 4. Fetch user's indexed sources to determine indexed status
    const { data: userSources } = await supabase
      .from("sources")
      .select("id, name, type, github_url, created_at")
      .eq("user_id", userId);

    const indexedUrlsMap = new Map<string, string>(); // url lower -> sourceId
    const indexedNamesMap = new Map<string, string>(); // name lower -> sourceId

    for (const source of userSources || []) {
      if (source.github_url) {
        const normalized = source.github_url.toLowerCase().replace(/\/$/, "").replace(/\.git$/, "");
        indexedUrlsMap.set(normalized, source.id);
      }
      if (source.type === "github" && source.name) {
        indexedNamesMap.set(source.name.toLowerCase(), source.id);
      }
    }

    // 5. Fetch latest sync jobs for active github sources
    const sourceIds = (userSources || []).map((s) => s.id);
    const syncStatusMap = new Map<string, { status: "pending" | "processing" | "completed" | "failed"; progress?: number }>();

    if (sourceIds.length > 0) {
      const { data: syncJobs } = await supabase
        .from("sync_jobs")
        .select("source_id, status, progress_pct, updated_at")
        .eq("user_id", userId)
        .in("source_id", sourceIds)
        .order("created_at", { ascending: false });

      for (const job of syncJobs || []) {
        if (!syncStatusMap.has(job.source_id)) {
          syncStatusMap.set(job.source_id, {
            status: job.status,
            progress: job.progress_pct,
          });
        }
      }
    }

    // 6. Enrich repositories with index & sync status
    const enrichedRepos: EnrichedGithubRepo[] = Array.from(reposMap.values()).map((repo) => {
      const normalizedUrl = repo.html_url.toLowerCase().replace(/\/$/, "").replace(/\.git$/, "");
      const matchedSourceId =
        indexedUrlsMap.get(normalizedUrl) || indexedNamesMap.get(repo.name.toLowerCase()) || null;

      const syncInfo = matchedSourceId ? syncStatusMap.get(matchedSourceId) : null;

      return {
        ...repo,
        is_indexed: Boolean(matchedSourceId),
        source_id: matchedSourceId,
        sync_status: syncInfo?.status || null,
        sync_progress: syncInfo?.progress,
      };
    });

    // Sort: indexed first, then most recently updated
    enrichedRepos.sort((a, b) => {
      if (a.is_indexed !== b.is_indexed) {
        return a.is_indexed ? -1 : 1;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return NextResponse.json({
      success: true,
      has_github_app: githubAppReady && installations.length > 0,
      has_github_oauth: hasGithubOAuth,
      installations,
      repositories: enrichedRepos,
      total_count: enrichedRepos.length,
    });
  } catch (error) {
    console.error("[api/github/repos] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to load GitHub repositories.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

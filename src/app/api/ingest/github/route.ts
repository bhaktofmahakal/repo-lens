import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { ingestGitHub } from "@/lib/ingestion/github";
import { ingestPrivateGithubRepo } from "@/lib/ingestion/private-github";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { requireRequestAuth } from "@/lib/auth-guard";
import { capturePosthogEvent } from "@/lib/posthog";
import {
  checkPrivateRepoAllowed,
  checkRepoLimit,
  LimitExceededError,
} from "@/lib/check-limits";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import {
  getInstallationAccessToken,
  getRepoInstallation,
  isGithubAppConfigured,
} from "@/lib/github-app";
import { decryptGithubToken } from "@/lib/github-token-crypto";

export const maxDuration = 300; // 5 minutes for large repo ingestion

const githubUrlSchema = z
  .string()
  .trim()
  .regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+(?:\.git)?\/?$/);

type HttpLikeError = {
  status?: number;
  response?: { status?: number };
};

function readStatus(error: unknown): number {
  const err = error as HttpLikeError;
  return Number(err?.status || err?.response?.status || 0);
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured.", code: "DB_CONFIG_MISSING" },
      { status: 503 },
    );
  }

  let sourceId: string | null = null;
  let installationId: number | null = null;

  try {
    const { plan } = await checkRepoLimit(auth.user.id);
    console.log(`[${requestId}] User plan:`, plan);

    const { url } = await req.json();
    console.log(`[${requestId}] Parsed URL:`, url);
    const validatedUrl = githubUrlSchema.parse(url).replace(/\/$/, "").replace(/\.git$/, "");

    const urlParts = validatedUrl.replace("https://github.com/", "").split("/");
    const owner = urlParts[0];
    const repo = urlParts[1]?.replace(/\.git$/, "");
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL.", code: "INVALID_GITHUB_URL" },
        { status: 400 },
      );
    }

    let appInstallation:
      | {
          installationId: number;
          accountLogin: string;
          accountType: string;
        }
      | null = null;

    if (isGithubAppConfigured()) {
      try {
        appInstallation = await getRepoInstallation(owner, repo);
        if (appInstallation) {
          installationId = appInstallation.installationId;

          await supabase.from("github_app_installations").upsert({
            installation_id: appInstallation.installationId,
            user_id: auth.user.id,
            account_login: appInstallation.accountLogin,
            account_type: appInstallation.accountType,
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        appInstallation = null;
      }
    }

    const { data: tokenRow } = await supabase
      .from("github_tokens")
      .select("encrypted_token")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    let githubToken: string | undefined;
    if (tokenRow?.encrypted_token) {
      try {
        githubToken = decryptGithubToken(tokenRow.encrypted_token);
      } catch {
        githubToken = undefined;
      }
    }

    if (!githubToken && appInstallation) {
      try {
        githubToken = await getInstallationAccessToken(appInstallation.installationId);
      } catch {
        githubToken = githubToken || undefined;
      }
    }

    const octokit = githubToken ? new Octokit({ auth: githubToken }) : new Octokit();

    let repoMeta: Awaited<ReturnType<Octokit["repos"]["get"]>>["data"];
    try {
      const repoResponse = await octokit.repos.get({ owner, repo });
      repoMeta = repoResponse.data;
    } catch (error) {
      const status = readStatus(error);
      if (status === 404 || status === 403) {
        return NextResponse.json(
          {
            error:
              "Repository not found or inaccessible. Connect GitHub and grant repo scope for private repositories.",
            code: "REPO_INACCESSIBLE",
          },
          { status: 400 },
        );
      }

      throw error;
    }

    if (repoMeta.private) {
      checkPrivateRepoAllowed(plan);
      if (!githubToken) {
        return NextResponse.json(
          {
            error: "Connect GitHub App (recommended) or OAuth to ingest private repositories.",
            code: "GITHUB_CONNECT_REQUIRED",
          },
          { status: 400 },
        );
      }
    }

    sourceId = uuidv4();
    console.log(`[${requestId}] Inserting source with ID:`, sourceId);
    const { error: sourceError } = await supabase.from("sources").insert({
      id: sourceId,
      user_id: auth.user.id,
      type: "github",
      name: repo,
      github_url: validatedUrl,
      github_installation_id: installationId,
    });

    if (sourceError) {
      console.log(`[${requestId}] Source insert error:`, sourceError);
      throw sourceError;
    }

    const defaultBranch = repoMeta.default_branch || "main";
    const result = repoMeta.private
      ? await ingestPrivateGithubRepo({
          sourceId,
          userId: auth.user.id,
          owner,
          repo,
          defaultBranch,
          githubToken: githubToken as string,
        })
      : await ingestGitHub(validatedUrl, sourceId, {
          githubToken,
          maxRepoSizeMb: PLAN_LIMITS[plan].max_repo_size_mb,
          userId: auth.user.id,
        });

    void capturePosthogEvent(auth.user.id, {
      event: "repo_ingested",
      properties: {
        repo_size_mb: Number((((repoMeta.size || 0) * 1024) / (1024 * 1024)).toFixed(2)),
        ingest_method: "github",
        file_count: result.fileCount,
        duration_ms: Date.now() - startedAt,
      },
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof LimitExceededError) {
      return NextResponse.json(
        {
          error: "LIMIT_EXCEEDED",
          plan_required: error.planRequired,
          message: error.message,
        },
        { status: 402 },
      );
    }

    if (sourceId) {
      const { error: rollbackError } = await supabase.from("sources").delete().eq("id", sourceId);
      if (rollbackError) {
        console.error("Failed to rollback source row after GitHub ingest failure:", rollbackError);
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL.", code: "INVALID_GITHUB_URL" },
        { status: 400 },
      );
    }

    const githubStatus = readStatus(error);
    if (githubStatus === 429) {
      return NextResponse.json(
        {
          error: "GitHub API rate limit reached. Retry later.",
          code: "GITHUB_RATE_LIMIT",
        },
        { status: 429 },
      );
    }

    console.error(`[${requestId}] Ingest GitHub Error:`, error);
    console.error(`[${requestId}] Error stack:`, error instanceof Error ? error.stack : '');
    console.error(`[${requestId}] Error cause:`, error instanceof Error ? error.cause : '');
    
    // Check if this is a timeout/504 issue
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "";
    const isTimeout =
      errorMsg.includes("time") ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("AbortError") ||
      errorName === "AbortError" ||
      errorName === "TimeoutError";
    if (isTimeout) {
      return NextResponse.json(
        {
          error: "Repository ingestion timed out. Try again or use the API with a longer timeout.",
          code: "INGEST_TIMEOUT",
          requestId,
        },
        { status: 504 },
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to ingest GitHub repo. Check repo accessibility and size limits.",
        code: "INTERNAL_SERVER_ERROR",
        requestId,
      },
      { status: 500 },
    );
  }
}

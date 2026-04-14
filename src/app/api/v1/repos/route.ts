import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { ingestGitHub } from "@/lib/ingestion/github";
import { ingestPrivateGithubRepo } from "@/lib/ingestion/private-github";
import { ingestZip } from "@/lib/ingestion/zip";
import { config } from "@/lib/config";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { requireApiKeyAuth } from "@/lib/api-key-auth";
import { capturePosthogEvent } from "@/lib/posthog";
import {
  checkPrivateRepoAllowed,
  checkRepoLimit,
  checkRepoSize,
  LimitExceededError,
} from "@/lib/check-limits";
import {
  getInstallationAccessToken,
  getRepoInstallation,
  isGithubAppConfigured,
} from "@/lib/github-app";
import { decryptGithubToken } from "@/lib/github-token-crypto";

const githubUrlSchema = z
  .string()
  .trim()
  .regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+(?:\.git)?\/?$/);

const createRepoSchema = z
  .object({
    github_url: z.string().trim().optional(),
    zip_url: z.string().trim().url().optional(),
  })
  .refine((value) => Boolean(value.github_url) !== Boolean(value.zip_url), {
    message: "Provide exactly one of github_url or zip_url.",
  });

type HttpLikeError = {
  status?: number;
  response?: { status?: number };
};

function readStatus(error: unknown): number {
  const err = error as HttpLikeError;
  return Number(err?.status || err?.response?.status || 0);
}

function zipNameFromUrl(zipUrl: string): string {
  try {
    const pathname = new URL(zipUrl).pathname;
    const raw = pathname.split("/").filter(Boolean).pop() || "repo.zip";
    return raw.toLowerCase().endsWith(".zip") ? raw : `${raw}.zip`;
  } catch {
    return "repo.zip";
  }
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return false;

  const octets = ipv4Match.slice(1).map((part) => Number.parseInt(part, 10));
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) return true;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}

export async function POST(req: NextRequest) {
  const auth = await requireApiKeyAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured.", code: "DB_CONFIG_MISSING" },
      { status: 503 },
    );
  }

  const requestId = randomUUID();
  const startedAt = Date.now();
  let sourceId: string | null = null;

  try {
    const { plan } = await checkRepoLimit(auth.userId);
    const rawBody = await req.json();
    const parsed = createRepoSchema.parse(rawBody);

    if (parsed.zip_url) {
      let parsedZipUrl: URL;
      try {
        parsedZipUrl = new URL(parsed.zip_url);
      } catch {
        return NextResponse.json(
          { error: "Invalid ZIP URL.", code: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }

      if (parsedZipUrl.protocol !== "https:") {
        return NextResponse.json(
          { error: "ZIP URL must use HTTPS.", code: "ZIP_URL_PROTOCOL_NOT_ALLOWED" },
          { status: 400 },
        );
      }

      if (isPrivateOrLocalHost(parsedZipUrl.hostname)) {
        return NextResponse.json(
          { error: "ZIP URL host is not allowed.", code: "ZIP_URL_HOST_NOT_ALLOWED" },
          { status: 400 },
        );
      }

      const zipResponse = await fetch(parsed.zip_url);
      if (!zipResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch ZIP URL.", code: "ZIP_FETCH_FAILED" },
          { status: 400 },
        );
      }

      const contentLength = Number.parseInt(zipResponse.headers.get("content-length") || "0", 10);
      const maxZipBytes = config.maxZipSizeMb * 1024 * 1024;
      if (Number.isFinite(contentLength) && contentLength > maxZipBytes) {
        return NextResponse.json(
          { error: `ZIP exceeds the ${config.maxZipSizeMb} MB limit.`, code: "ZIP_TOO_LARGE" },
          { status: 400 },
        );
      }

      const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());
      if (zipBuffer.length > maxZipBytes) {
        return NextResponse.json(
          { error: `ZIP exceeds the ${config.maxZipSizeMb} MB limit.`, code: "ZIP_TOO_LARGE" },
          { status: 400 },
        );
      }

      checkRepoSize(zipBuffer.length, plan);

      sourceId = uuidv4();
      const sourceName = zipNameFromUrl(parsed.zip_url);
      const { error: sourceError } = await supabase.from("sources").insert({
        id: sourceId,
        user_id: auth.userId,
        type: "zip",
        name: sourceName,
      });

      if (sourceError) {
        throw sourceError;
      }

      const result = await ingestZip(zipBuffer, sourceId, auth.userId);
      if (result.chunkCount === 0) {
        await supabase.from("sources").delete().eq("id", sourceId);
        return NextResponse.json(
          {
            error:
              "No indexable text files were found in the ZIP. Upload source files (e.g. .ts, .tsx, .js, .py).",
            code: "NO_INDEXABLE_CONTENT",
          },
          { status: 400 },
        );
      }

      void capturePosthogEvent(auth.userId, {
        event: "repo_ingested",
        properties: {
          repo_size_mb: Number((zipBuffer.length / (1024 * 1024)).toFixed(2)),
          ingest_method: "zip",
          file_count: result.fileCount,
          duration_ms: Date.now() - startedAt,
        },
      });

      return NextResponse.json(
        {
          id: result.sourceId,
          status: "ready",
          source_type: "zip",
          file_count: result.fileCount,
          chunk_count: result.chunkCount,
          repo_size_bytes: zipBuffer.length,
        },
        { status: 201 },
      );
    }

    const validatedUrl = githubUrlSchema.parse(parsed.github_url).replace(/\/$/, "").replace(/\.git$/, "");

    const urlParts = validatedUrl.replace("https://github.com/", "").split("/");
    const owner = urlParts[0];
    const repo = urlParts[1]?.replace(/\.git$/, "");
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL.", code: "INVALID_GITHUB_URL" },
        { status: 400 },
      );
    }

    let installationId: number | null = null;
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
            user_id: auth.userId,
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
      .eq("user_id", auth.userId)
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
        githubToken = undefined;
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

    checkRepoSize((repoMeta.size || 0) * 1024, plan);
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
    const { error: sourceError } = await supabase.from("sources").insert({
      id: sourceId,
      user_id: auth.userId,
      type: "github",
      name: repo,
      github_url: validatedUrl,
      github_installation_id: installationId,
    });

    if (sourceError) {
      throw sourceError;
    }

    const defaultBranch = repoMeta.default_branch || "main";
    const result = repoMeta.private
      ? await ingestPrivateGithubRepo({
          sourceId,
          userId: auth.userId,
          owner,
          repo,
          defaultBranch,
          githubToken: githubToken as string,
        })
      : await ingestGitHub(validatedUrl, sourceId, {
          githubToken,
          maxRepoSizeMb: Number.POSITIVE_INFINITY,
          userId: auth.userId,
        });

    void capturePosthogEvent(auth.userId, {
      event: "repo_ingested",
      properties: {
        repo_size_mb: Number((((repoMeta.size || 0) * 1024) / (1024 * 1024)).toFixed(2)),
        ingest_method: "github",
        file_count: result.fileCount,
        duration_ms: Date.now() - startedAt,
      },
    });

    return NextResponse.json(
      {
        id: result.sourceId,
        status: "ready",
        source_type: "github",
        file_count: result.fileCount,
        chunk_count: result.chunkCount,
      },
      { status: 201 },
    );
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
        console.error("Failed to rollback source row after v1 repo ingest failure:", rollbackError);
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body.", code: "VALIDATION_ERROR" },
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

    console.error(`[${requestId}] v1 repo ingest failed`, error);
    return NextResponse.json(
      {
        error: "Failed to ingest repository.",
        code: "INTERNAL_SERVER_ERROR",
        requestId,
      },
      { status: 500 },
    );
  }
}
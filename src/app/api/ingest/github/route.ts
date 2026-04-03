import { NextRequest, NextResponse } from "next/server";
import { ingestGitHub } from "@/lib/ingestion/github";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { requireRequestAuth } from "@/lib/auth-guard";

const githubUrlSchema = z
  .string()
  .trim()
  .regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+(?:\.git)?\/?$/);

export async function POST(req: NextRequest) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  let sourceId: string | null = null;

  try {
    const { url } = await req.json();
    const validatedUrl = githubUrlSchema.parse(url).replace(/\/$/, "").replace(/\.git$/, "");

    sourceId = uuidv4();
    const urlParts = validatedUrl.replace('https://github.com/', '').split('/');
    const repoName = urlParts[1]?.replace(/\.git$/, "");
    if (!repoName) {
      return NextResponse.json({ error: "Invalid GitHub repository URL." }, { status: 400 });
    }

    const { error: sourceError } = await supabase.from("sources").insert({
      id: sourceId,
      type: "github",
      name: repoName,
      github_url: validatedUrl,
    });

    if (sourceError) throw sourceError;

    const result = await ingestGitHub(validatedUrl, sourceId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Ingest GitHub Error:", error);
    if (sourceId) {
      const { error: rollbackError } = await supabase.from("sources").delete().eq("id", sourceId);
      if (rollbackError) {
        console.error("Failed to rollback source row after GitHub ingest failure:", rollbackError);
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid GitHub repository URL." }, { status: 400 });
    }

    const githubStatus = Number(error?.status || error?.response?.status || 0);
    if (githubStatus === 404 || githubStatus === 403) {
      return NextResponse.json(
        { error: "Repository not found or inaccessible. Only public GitHub repositories are supported." },
        { status: 400 },
      );
    }
    if (githubStatus === 401) {
      return NextResponse.json(
        {
          error:
            "GitHub API authentication failed. Remove invalid GITHUB_TOKEN or set a valid token in environment variables.",
        },
        { status: 400 },
      );
    }
    if (githubStatus === 429) {
      return NextResponse.json(
        {
          error: "GitHub API rate limit reached. Retry later or configure a valid GITHUB_TOKEN.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: error.message || "Failed to ingest GitHub repo" }, { status: 500 });
  }
}

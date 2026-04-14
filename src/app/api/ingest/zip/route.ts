import { NextRequest, NextResponse } from "next/server";
import { ingestZip } from "@/lib/ingestion/zip";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { config } from "@/lib/config";
import { v4 as uuidv4 } from "uuid";
import { requireRequestAuth } from "@/lib/auth-guard";
import { capturePosthogEvent } from "@/lib/posthog";
import { checkRepoLimit, checkRepoSize, LimitExceededError } from "@/lib/check-limits";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database service is currently unavailable." },
      { status: 503 },
    );
  }

  let sourceId: string | null = null;

  try {
    const { plan } = await checkRepoLimit(auth.user.id);

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid request format. Use multipart/form-data with a ZIP file." },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get("file");
    const isValidFileLike =
      fileEntry &&
      typeof fileEntry === "object" &&
      "name" in fileEntry &&
      "size" in fileEntry &&
      "arrayBuffer" in fileEntry;

    if (!isValidFileLike) {
      return NextResponse.json({ error: "ZIP file is required." }, { status: 400 });
    }

    const file = fileEntry as File;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Invalid file format. Please upload a ZIP file." }, { status: 400 });
    }

    const maxZipBytes = config.maxZipSizeMb * 1024 * 1024;
    if (file.size > maxZipBytes) {
      return NextResponse.json(
        { error: `ZIP file exceeds the ${config.maxZipSizeMb} MB limit.` },
        { status: 400 },
      );
    }

    checkRepoSize(file.size, plan);

    sourceId = uuidv4();
    const { error: sourceError } = await supabase.from("sources").insert({
      id: sourceId,
      user_id: auth.user.id,
      type: "zip",
      name: file.name,
    });

    if (sourceError) throw sourceError;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestZip(buffer, sourceId, auth.user.id);
    if (result.chunkCount === 0) {
      const { error: rollbackError } = await supabase.from("sources").delete().eq("id", sourceId);
      if (rollbackError) {
        console.error("Failed to rollback empty ZIP source row:", rollbackError);
      }
      return NextResponse.json(
        {
          error:
            "No indexable text files were found in the ZIP. Upload source files (e.g. .ts, .tsx, .js, .py), not empty folders or binary-only archives.",
        },
        { status: 400 },
      );
    }

    void capturePosthogEvent(auth.user.id, {
      event: "repo_ingested",
      properties: {
        repo_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
        ingest_method: "zip",
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

    console.error("Ingest ZIP Error:", error);
    if (sourceId) {
      const { error: rollbackError } = await supabase.from("sources").delete().eq("id", sourceId);
      if (rollbackError) {
        console.error("Failed to rollback source row after ZIP ingest failure:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: "Failed to ingest ZIP", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

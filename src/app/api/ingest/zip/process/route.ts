import { NextRequest, NextResponse } from "next/server";
import { ingestZip } from "@/lib/ingestion/zip";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { requireRequestAuth } from "@/lib/auth-guard";
import { capturePosthogEvent } from "@/lib/posthog";
import { LimitExceededError } from "@/lib/check-limits";

const STORAGE_BUCKET = "zip-uploads";

// Allow up to 5 minutes for embedding + chunking a large repo.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const auth = await requireRequestAuth(req);
  if ("response" in auth) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database service is currently unavailable." },
      { status: 503 },
    );
  }

  let sourceId: string | null = null;

  try {
    const body = await req.json();
    sourceId = typeof body.sourceId === "string" ? body.sourceId : null;

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required." },
        { status: 400 },
      );
    }

    // Reconstruct the storage path server-side — never trust the client for this.
    const storagePath = `${auth.user.id}/${sourceId}.zip`;

    // Verify the source row belongs to this user before touching anything.
    const { data: sourceRow, error: sourceCheckError } = await supabase
      .from("sources")
      .select("id, name, user_id")
      .eq("id", sourceId)
      .eq("user_id", auth.user.id)
      .single();

    if (sourceCheckError || !sourceRow) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    // Download the ZIP from Supabase Storage. This is a server-to-server call
    // and is not subject to the Vercel request-body limit.
    const { data: blob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !blob) {
      console.error("Failed to download ZIP from storage:", downloadError);
      await rollbackSource(sourceId);
      return NextResponse.json(
        {
          error:
            "Could not retrieve the uploaded file. The upload may have failed — please try again.",
        },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    const result = await ingestZip(buffer, sourceId, auth.user.id);

    if (result.chunkCount === 0) {
      await rollbackSource(sourceId);
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
        repo_size_mb: Number((buffer.byteLength / (1024 * 1024)).toFixed(2)),
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

    console.error("ZIP process error:", error);
    if (sourceId) await rollbackSource(sourceId);

    return NextResponse.json(
      { error: "Failed to ingest ZIP", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  } finally {
    // Always clean up the temporary object from storage to avoid accumulation.
    if (sourceId) {
      const storagePath = `${auth.user.id}/${sourceId}.zip`;
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);
      if (removeError) {
        console.error("Failed to remove ZIP from storage after processing:", removeError);
      }
    }
  }
}

async function rollbackSource(sourceId: string) {
  const { error } = await supabase.from("sources").delete().eq("id", sourceId);
  if (error) console.error("Failed to rollback source row:", error);
}

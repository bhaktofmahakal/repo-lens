import { NextRequest, NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/api-key-auth";
import { isSupabaseConfigured, supabase } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SyncJobStatus = "pending" | "processing" | "completed" | "failed";

type V1Status = "pending" | "processing" | "ready" | "error";

function deriveStatus(chunkCount: number, syncStatus: SyncJobStatus | null): V1Status {
  if (syncStatus === "failed") return "error";
  if (syncStatus === "pending" || syncStatus === "processing") return "processing";
  if (chunkCount > 0) return "ready";
  return "pending";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "Invalid repository ID.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, name, type, created_at")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (sourceError) {
    return NextResponse.json(
      { error: "Failed to load repository.", code: "SOURCE_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  if (!source) {
    return NextResponse.json(
      { error: "Repository not found.", code: "SOURCE_NOT_FOUND" },
      { status: 404 },
    );
  }

  const { count: chunkCount, error: chunkError } = await supabase
    .from("chunks")
    .select("id", { count: "exact", head: true })
    .eq("source_id", id)
    .eq("user_id", auth.userId);

  if (chunkError) {
    return NextResponse.json(
      { error: "Failed to load repository chunks.", code: "CHUNKS_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  const { data: latestSyncJob, error: syncError } = await supabase
    .from("sync_jobs")
    .select("status, progress_pct, created_at, completed_at, error_msg")
    .eq("source_id", id)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (syncError) {
    return NextResponse.json(
      { error: "Failed to load sync status.", code: "SYNC_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  const resolvedChunkCount = chunkCount || 0;
  const syncStatus = (latestSyncJob?.status || null) as SyncJobStatus | null;
  const status = deriveStatus(resolvedChunkCount, syncStatus);

  return NextResponse.json({
    id: source.id,
    name: source.name,
    type: source.type,
    status,
    chunk_count: resolvedChunkCount,
    created_at: source.created_at,
    last_sync: latestSyncJob
      ? {
          status: latestSyncJob.status,
          progress_pct: latestSyncJob.progress_pct,
          created_at: latestSyncJob.created_at,
          completed_at: latestSyncJob.completed_at,
          error_msg: latestSyncJob.error_msg,
        }
      : null,
  });
}
import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ shareUuid: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured.", code: "DB_CONFIG_MISSING" },
      { status: 503 },
    );
  }

  try {
    const { shareUuid } = await context.params;

    if (!UUID_RE.test(shareUuid)) {
      return NextResponse.json(
        { error: "Invalid share link.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { data: sharedRow, error: sharedError } = await supabase
      .from("shared_sessions")
      .select("source_id, share_uuid, is_public, expires_at, revoked_at, view_count, created_at")
      .eq("share_uuid", shareUuid)
      .maybeSingle();

    if (sharedError || !sharedRow) {
      return NextResponse.json(
        { error: "Share link not found.", code: "SHARE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const isExpired = Boolean(sharedRow.expires_at && new Date(sharedRow.expires_at) <= new Date());
    if (!sharedRow.is_public || sharedRow.revoked_at || isExpired) {
      return NextResponse.json(
        { error: "Share link is inactive.", code: "SHARE_INACTIVE" },
        { status: 404 },
      );
    }

    const { data: sourceRow } = await supabase
      .from("sources")
      .select("id, name, type")
      .eq("id", sharedRow.source_id)
      .maybeSingle();

    const { data: historyRows, error: historyError } = await supabase
      .from("qa_history")
      .select("id, source_id, question, answer, citations_json, created_at")
      .eq("source_id", sharedRow.source_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (historyError) {
      return NextResponse.json(
        { error: "Failed to load shared history.", code: "HISTORY_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    const nextViewCount = (sharedRow.view_count || 0) + 1;
    void supabase
      .from("shared_sessions")
      .update({
        view_count: nextViewCount,
        updated_at: new Date().toISOString(),
      })
      .eq("share_uuid", shareUuid);

    return NextResponse.json({
      source: sourceRow || null,
      shared: {
        share_uuid: sharedRow.share_uuid,
        view_count: nextViewCount,
        created_at: sharedRow.created_at,
      },
      history: historyRows || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load share link.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
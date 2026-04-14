import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestAuth } from "@/lib/auth-guard";
import { config } from "@/lib/config";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { capturePosthogEvent } from "@/lib/posthog";

const shareMutationSchema = z.object({
  sourceId: z.string().uuid(),
  is_public: z.boolean().optional(),
  expires_hours: z.number().int().positive().max(24 * 30).optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildShareUrl(shareUuid: string): string {
  return `${config.appUrl}/s/${shareUuid}`;
}

export async function GET(req: NextRequest) {
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

  try {
    const sourceId = req.nextUrl.searchParams.get("sourceId");
    if (!sourceId || !UUID_RE.test(sourceId)) {
      return NextResponse.json(
        { error: "Valid sourceId is required.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { data: shareRow, error: shareError } = await supabase
      .from("shared_sessions")
      .select("share_uuid, is_public, expires_at, revoked_at, view_count, created_at")
      .eq("owner_user_id", auth.user.id)
      .eq("source_id", sourceId)
      .maybeSingle();

    if (shareError) {
      return NextResponse.json(
        { error: "Failed to load share state.", code: "SHARE_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    const isExpired = Boolean(shareRow?.expires_at && new Date(shareRow.expires_at) <= new Date());
    if (!shareRow || shareRow.revoked_at || isExpired) {
      return NextResponse.json({ shared: false });
    }

    return NextResponse.json({
      shared: true,
      share_uuid: shareRow.share_uuid,
      share_url: buildShareUrl(shareRow.share_uuid),
      is_public: shareRow.is_public,
      expires_at: shareRow.expires_at,
      view_count: shareRow.view_count,
      created_at: shareRow.created_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load share state.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const parsed = shareMutationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { sourceId, is_public, expires_hours } = parsed.data;

    const { data: sourceRow, error: sourceError } = await supabase
      .from("sources")
      .select("id")
      .eq("id", sourceId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json(
        { error: "Failed to validate source ownership.", code: "SOURCE_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    if (!sourceRow) {
      return NextResponse.json(
        { error: "Source not found.", code: "SOURCE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const expiresAt =
      typeof expires_hours === "number"
        ? new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString()
        : null;

    const { data: sharedRow, error: upsertError } = await supabase
      .from("shared_sessions")
      .upsert(
        {
          source_id: sourceId,
          owner_user_id: auth.user.id,
          is_public: is_public ?? true,
          expires_at: expiresAt,
          revoked_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_user_id,source_id" },
      )
      .select("share_uuid, is_public, expires_at, created_at")
      .single();

    if (upsertError || !sharedRow) {
      return NextResponse.json(
        { error: "Failed to create share link.", code: "SHARE_CREATE_FAILED" },
        { status: 500 },
      );
    }

    void capturePosthogEvent(auth.user.id, {
      event: "session_shared",
      properties: {
        is_public: sharedRow.is_public,
      },
    });

    return NextResponse.json({
      success: true,
      share_uuid: sharedRow.share_uuid,
      share_url: buildShareUrl(sharedRow.share_uuid),
      is_public: sharedRow.is_public,
      expires_at: sharedRow.expires_at,
      created_at: sharedRow.created_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create share link.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
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

  try {
    const body = await req.json();
    const parsed = z.object({ sourceId: z.string().uuid() }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { sourceId } = parsed.data;

    const { error: revokeError } = await supabase
      .from("shared_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("owner_user_id", auth.user.id)
      .eq("source_id", sourceId);

    if (revokeError) {
      return NextResponse.json(
        { error: "Failed to revoke share link.", code: "SHARE_REVOKE_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to revoke share link.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
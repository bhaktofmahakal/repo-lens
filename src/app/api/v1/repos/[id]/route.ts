import { NextRequest, NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/api-key-auth";
import { isSupabaseConfigured, supabase } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
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

  const { data: existing, error: lookupError } = await supabase
    .from("sources")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: "Failed to verify repository.", code: "SOURCE_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Repository not found.", code: "SOURCE_NOT_FOUND" },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabase
    .from("sources")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete repository.", code: "SOURCE_DELETE_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
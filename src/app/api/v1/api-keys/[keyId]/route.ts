import { NextRequest, NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/auth-guard";
import { isSupabaseConfigured, supabase } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ keyId: string }> },
) {
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

  const { keyId } = await context.params;
  if (!UUID_RE.test(keyId)) {
    return NextResponse.json(
      { error: "Invalid API key ID.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", auth.user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to revoke API key.", code: "API_KEY_REVOKE_FAILED" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "API key not found.", code: "API_KEY_NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
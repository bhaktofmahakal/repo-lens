import { NextRequest, NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/auth-guard";
import { isGithubTokenEncryptionConfigured } from "@/lib/github-token-crypto";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRequestAuth(req);
    if ("response" in auth) return auth.response;

    const connectEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_CONNECT === "true";
    const tokenStorageConfigured = isGithubTokenEncryptionConfigured();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("github_tokens")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to load GitHub connection.", code: "TOKEN_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      connected: Boolean(data),
      connectAvailable: connectEnabled && tokenStorageConfigured,
      unavailableReason: !connectEnabled
        ? "GitHub OAuth connection is disabled for this environment."
        : !tokenStorageConfigured
          ? "GitHub OAuth connection is not configured yet."
          : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load GitHub connection.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRequestAuth(req);
    if ("response" in auth) return auth.response;

    const supabase = await createClient();
    const { error } = await supabase.from("github_tokens").delete().eq("user_id", auth.user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to disconnect GitHub.", code: "TOKEN_DELETE_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect GitHub.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

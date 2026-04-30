import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabase as adminSupabase } from "@/lib/db";
import { encryptGithubToken } from "@/lib/github-token-crypto";

function buildRedirectUrl(req: NextRequest, path: string): URL {
  return new URL(path, req.nextUrl.origin);
}

type SessionWithProviderToken = {
  provider_token?: string;
};

type OAuthUserMetadata = {
  full_name?: string;
  name?: string;
  email?: string;
};

function buildProfileName(userId: string, email: string | null, metadata: OAuthUserMetadata): string {
  const fromMetadata = metadata.full_name?.trim() || metadata.name?.trim();
  if (fromMetadata) return fromMetadata;

  if (email) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart) return localPart;
  }

  return `user-${userId.slice(0, 8)}`;
}

async function ensureUserProfile(user: { id: string; email?: string | null; user_metadata?: OAuthUserMetadata }) {
  const email = user.email?.trim() || user.user_metadata?.email?.trim() || `${user.id}@oauth.local`;
  const name = buildProfileName(user.id, user.email ?? user.user_metadata?.email ?? null, user.user_metadata ?? {});

  const { error } = await adminSupabase.from("users").upsert(
    {
      id: user.id,
      email,
      name,
      password_hash: "",
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[auth/callback] Failed to ensure user profile:", error.message);
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextPath = req.nextUrl.searchParams.get("next") || "/dashboard";
  const connect = req.nextUrl.searchParams.get("connect");

  if (!code) {
    const url = buildRedirectUrl(req, "/login?error=missing_code");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = buildRedirectUrl(req, "/login?error=auth_failed");
    return NextResponse.redirect(url);
  }

  if (data.user) {
    await ensureUserProfile(data.user);
  }

  if (connect === "github") {
    try {
      const user = data.user;
      const providerToken = (data.session as SessionWithProviderToken | null)?.provider_token;

      if (!user?.id || !providerToken) {
        return NextResponse.redirect(buildRedirectUrl(req, "/dashboard?github=error"));
      }

      const encryptedToken = encryptGithubToken(providerToken);
      const { error: tokenError } = await supabase.from("github_tokens").upsert({
        user_id: user.id,
        encrypted_token: encryptedToken,
      });

      if (tokenError) {
        return NextResponse.redirect(buildRedirectUrl(req, "/dashboard?github=error"));
      }

      return NextResponse.redirect(buildRedirectUrl(req, "/dashboard?github=connected"));
    } catch {
      return NextResponse.redirect(buildRedirectUrl(req, "/dashboard?github=error"));
    }
  }

  return NextResponse.redirect(buildRedirectUrl(req, nextPath));
}

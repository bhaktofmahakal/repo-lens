import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptGithubToken } from "@/lib/github-token-crypto";

function buildRedirectUrl(req: NextRequest, path: string): URL {
  return new URL(path, req.nextUrl.origin);
}

type SessionWithProviderToken = {
  provider_token?: string;
};

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

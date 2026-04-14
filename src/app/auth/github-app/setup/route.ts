import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInstallationById, isGithubAppConfigured } from "@/lib/github-app";
import { supabase } from "@/lib/db";

function toDashboardUrl(req: NextRequest, status: string): URL {
  return new URL(`/dashboard?github_app=${encodeURIComponent(status)}`, req.nextUrl.origin);
}

function parseInstallationId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  if (!isGithubAppConfigured()) {
    return NextResponse.redirect(toDashboardUrl(req, "config_error"));
  }

  const installationId = parseInstallationId(req.nextUrl.searchParams.get("installation_id"));
  if (!installationId) {
    return NextResponse.redirect(toDashboardUrl(req, "missing_installation"));
  }

  const supabaseClient = await createClient();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    const loginUrl = new URL(`/login?callbackUrl=${callbackUrl}`, req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const installation = await getInstallationById(installationId);

    if (!installation) {
      return NextResponse.redirect(toDashboardUrl(req, "installation_not_found"));
    }

    const { error } = await supabase.from("github_app_installations").upsert({
      installation_id: installation.installationId,
      user_id: user.id,
      account_login: installation.accountLogin,
      account_type: installation.accountType,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.redirect(toDashboardUrl(req, "save_failed"));
    }

    return NextResponse.redirect(toDashboardUrl(req, "connected"));
  } catch {
    return NextResponse.redirect(toDashboardUrl(req, "error"));
  }
}

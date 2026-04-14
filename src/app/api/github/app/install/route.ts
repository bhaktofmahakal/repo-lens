import { NextRequest, NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/auth-guard";
import { getGithubAppInstallUrl, isGithubAppConfigured } from "@/lib/github-app";

export async function GET(req: NextRequest) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    const loginUrl = new URL(`/login?callbackUrl=${encodeURIComponent(req.nextUrl.pathname)}`, req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (!isGithubAppConfigured()) {
    return NextResponse.json(
      {
        error: "GitHub App is not configured.",
        code: "GITHUB_APP_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const installUrl = getGithubAppInstallUrl();
  if (!installUrl) {
    return NextResponse.json(
      {
        error: "GitHub App install URL is unavailable.",
        code: "GITHUB_APP_INSTALL_URL_MISSING",
      },
      { status: 500 },
    );
  }

  return NextResponse.redirect(installUrl);
}

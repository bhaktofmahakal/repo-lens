import { NextResponse, type NextRequest } from "next/server";
import { getRequestTokenSafe, isAuthConfigured } from "@/lib/auth-guard";

const PROTECTED = ["/ask", "/history", "/source", "/status"];

export async function middleware(request: NextRequest) {
  const token = await getRequestTokenSafe(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("callbackUrl", pathname);
    if (!isAuthConfigured()) {
      url.searchParams.set("error", "auth_config");
    }
    return NextResponse.redirect(url);
  }

  // Keep landing page accessible, but redirect authenticated users away from auth forms.
  if (token && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/ask";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};


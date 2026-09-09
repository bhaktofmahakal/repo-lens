import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";

const PROTECTED = ["/dashboard", "/ask", "/history", "/source"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/favicon.ico") {
    const url = request.nextUrl.clone();
    url.pathname = "/icon.svg";
    return NextResponse.redirect(url);
  }

  // Redirect any legacy billing paths back to dashboard
  if (pathname.startsWith("/dashboard/billing")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isProtected && !user) {
    const target = request.nextUrl.pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", target);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const url = request.nextUrl.clone();
    url.pathname = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/sign-in" || pathname === "/sign-up") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/).*)"],
};


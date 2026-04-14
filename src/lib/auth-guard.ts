import { NextRequest, NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { isConfiguredEnvValue } from "@/lib/config";
import { createRouteHandlerClient } from "@/lib/supabase/server";

const AUTH_CONFIG_ERROR = "Authentication is currently unavailable.";

export function isAuthConfigured(): boolean {
  return (
    isConfiguredEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isConfiguredEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export async function getRequestUserSafe(req: NextRequest): Promise<User | null> {
  if (!isAuthConfigured()) return null;

  try {
    const response = NextResponse.next({ request: req });
    const supabase = createRouteHandlerClient(req, response);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) return null;
    return user;
  } catch (error) {
    console.error("User lookup failed:", error);
    return null;
  }
}

type AuthResult =
  | { user: User }
  | { response: NextResponse };

export async function requireRequestAuth(req: NextRequest): Promise<AuthResult> {
  if (!isAuthConfigured()) {
    return {
      response: NextResponse.json({ error: AUTH_CONFIG_ERROR, code: "AUTH_CONFIG_MISSING" }, { status: 503 }),
    };
  }

  const user = await getRequestUserSafe(req);
  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  return { user };
}

export function authConfigErrorMessage(): string {
  return AUTH_CONFIG_ERROR;
}

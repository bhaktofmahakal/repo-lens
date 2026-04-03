import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isConfiguredEnvValue } from "@/lib/config";

const AUTH_CONFIG_ERROR = "Authentication is not configured. Set NEXTAUTH_SECRET in environment variables.";

export function isAuthConfigured(): boolean {
  return isConfiguredEnvValue(process.env.NEXTAUTH_SECRET);
}

export async function getRequestTokenSafe(req: NextRequest) {
  if (!isAuthConfigured()) return null;

  try {
    return await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (error) {
    console.error("Token parsing failed:", error);
    return null;
  }
}

export async function requireRequestAuth(req: NextRequest): Promise<{ token: NonNullable<Awaited<ReturnType<typeof getToken>>> } | { response: NextResponse }> {
  if (!isAuthConfigured()) {
    return {
      response: NextResponse.json({ error: AUTH_CONFIG_ERROR }, { status: 503 }),
    };
  }

  const token = await getRequestTokenSafe(req);
  if (!token) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { token };
}

export function authConfigErrorMessage(): string {
  return AUTH_CONFIG_ERROR;
}

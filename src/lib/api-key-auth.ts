import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/db";

const API_KEY_PREFIX = "rpl_";

type ApiKeyLookupRow = {
  id: string;
  user_id: string;
  revoked_at: string | null;
};

type ApiKeyAuthResult =
  | {
      userId: string;
      keyId: string;
    }
  | {
      response: NextResponse;
    };

function parseBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;

  const [scheme, ...parts] = headerValue.split(" ");
  if (!scheme || !/^Bearer$/i.test(scheme)) return null;

  const token = parts.join(" ").trim();
  return token.length > 0 ? token : null;
}

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function keyPrefix(apiKey: string): string {
  return apiKey.slice(0, 16);
}

export async function requireApiKeyAuth(req: NextRequest): Promise<ApiKeyAuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      response: NextResponse.json(
        { error: "Database is not configured.", code: "DB_CONFIG_MISSING" },
        { status: 503 },
      ),
    };
  }

  const apiKey = parseBearerToken(req.headers.get("authorization"));
  if (!apiKey) {
    return {
      response: NextResponse.json(
        { error: "Missing API key. Use Authorization: Bearer <api_key>.", code: "API_KEY_REQUIRED" },
        { status: 401 },
      ),
    };
  }

  const keyHash = hashApiKey(apiKey);

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle<ApiKeyLookupRow>();

  if (error) {
    return {
      response: NextResponse.json(
        { error: "Failed to verify API key.", code: "API_KEY_LOOKUP_FAILED" },
        { status: 500 },
      ),
    };
  }

  if (!data || data.revoked_at) {
    return {
      response: NextResponse.json(
        { error: "Invalid API key.", code: "API_KEY_INVALID" },
        { status: 401 },
      ),
    };
  }

  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("user_id", data.user_id)
    .is("revoked_at", null);

  return {
    userId: data.user_id,
    keyId: data.id,
  };
}
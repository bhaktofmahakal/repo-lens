import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestAuth } from "@/lib/auth-guard";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { generateApiKey, hashApiKey, keyPrefix } from "@/lib/api-key-auth";

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured.", code: "DB_CONFIG_MISSING" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch API keys.", code: "API_KEYS_FETCH_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ keys: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured.", code: "DB_CONFIG_MISSING" },
      { status: 503 },
    );
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const { name } = createKeySchema.parse(rawBody);

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const prefix = keyPrefix(apiKey);

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: auth.user.id,
        name: name || "default",
        key_hash: keyHash,
        key_prefix: prefix,
      })
      .select("id, name, key_prefix, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create API key.", code: "API_KEY_CREATE_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        key: {
          ...data,
          api_key: apiKey,
        },
        note: "Store this API key now. It will not be shown again.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create API key.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
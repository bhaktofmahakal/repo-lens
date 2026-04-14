import { NextRequest, NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/api-key-auth";
import { isSupabaseConfigured, supabase } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiKeyAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured.", code: "DB_CONFIG_MISSING" },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "Invalid repository ID.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { data: sourceRow, error: sourceError } = await supabase
    .from("sources")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (sourceError) {
    return NextResponse.json(
      { error: "Failed to validate repository access.", code: "SOURCE_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  if (!sourceRow) {
    return NextResponse.json(
      { error: "Repository not found.", code: "SOURCE_NOT_FOUND" },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(req.url);
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 20), 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("qa_history")
    .select("id, source_id, question, answer, citations_json, created_at", { count: "exact" })
    .eq("source_id", id)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch history.", code: "HISTORY_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    items: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      has_more: from + (data?.length || 0) < (count || 0),
    },
  });
}
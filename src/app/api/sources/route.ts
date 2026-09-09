import { NextRequest, NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/auth-guard";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { data: sources, error } = await supabase
      .from("sources")
      .select("id, name, type, github_url, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch sources:", error);
      return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
    }

    // Get chunk counts for each source
    const sourceIds = (sources || []).map((s) => s.id);
    const chunkCounts: Record<string, number> = {};

    if (sourceIds.length > 0) {
      const { data: chunkData } = await supabase
        .from("chunks")
        .select("source_id")
        .in("source_id", sourceIds);

      if (chunkData) {
        for (const chunk of chunkData) {
          chunkCounts[chunk.source_id] = (chunkCounts[chunk.source_id] || 0) + 1;
        }
      }
    }

    const enriched = (sources || []).map((s) => ({
      ...s,
      chunk_count: chunkCounts[s.id] || 0,
    }));

    return NextResponse.json({ sources: enriched });
  } catch (err: any) {
    console.error("Error in GET /api/sources:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

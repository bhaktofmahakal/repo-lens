/* utsav */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get("sourceId");

    if (!sourceId) {
      return NextResponse.json({ error: "Source ID is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("qa_history")
      .select("*")
      .eq("source_id", sourceId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("History API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch history" }, { status: 500 });
  }
}

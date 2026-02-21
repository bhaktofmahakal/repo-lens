import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { StatusResult } from "@/types";

export async function GET(req: NextRequest) {
  const status: StatusResult = {
    backend: "healthy",
    db: "unhealthy",
    llm: "unhealthy",
  };

  try {
    const { error: dbError } = await supabase.from("sources").select("id").limit(1);
    if (!dbError) {
      status.db = "healthy";
    }
  } catch (error) {
    console.error("DB Status Error:", error);
  }

  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      status.llm = "healthy";
    }
  } catch (error) {
    console.error("LLM Status Error:", error);
  }

  return NextResponse.json(status);
}

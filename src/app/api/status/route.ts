import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { checkGroqHealth } from "@/lib/qa/groq";
import { StatusResult } from "@/types";

export async function GET() {
  const status: StatusResult = {
    backend: "healthy",
    db: "unhealthy",
    llm: "unhealthy",
  };

  if (isSupabaseConfigured()) {
    try {
      const { error: dbError } = await supabase.from("sources").select("id").limit(1);
      if (!dbError) {
        status.db = "healthy";
      }
    } catch (error) {
      console.error("DB Status Error:", error);
    }
  }

  try {
    const llmHealthy = await checkGroqHealth();
    if (llmHealthy) {
      status.llm = "healthy";
    }
  } catch (error) {
    console.error("LLM Status Error:", error);
  }

  return NextResponse.json(status);
}

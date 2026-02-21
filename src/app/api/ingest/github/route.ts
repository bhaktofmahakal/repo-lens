/* utsav */
import { NextRequest, NextResponse } from "next/server";
import { ingestGitHub } from "@/lib/ingestion/github";
import { supabase } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const githubUrlSchema = z.string().regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+$/);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const validatedUrl = githubUrlSchema.parse(url);

    const sourceId = uuidv4();
    const urlParts = validatedUrl.replace('https://github.com/', '').split('/');
    const repoName = urlParts[1];

    const { error: sourceError } = await supabase.from("sources").insert({
      id: sourceId,
      type: "github",
      name: repoName,
      github_url: validatedUrl,
    });

    if (sourceError) throw sourceError;

    const result = await ingestGitHub(validatedUrl, sourceId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Ingest GitHub Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid GitHub repository URL." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to ingest GitHub repo" }, { status: 500 });
  }
}

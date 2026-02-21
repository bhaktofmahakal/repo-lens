/* utsav */
import { NextRequest, NextResponse } from "next/server";
import { ingestZip } from "@/lib/ingestion/zip";
import { supabase } from "@/lib/db";
import { config } from "@/lib/config";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  let sourceId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || !file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "Invalid file format. Please upload a ZIP file." }, { status: 400 });
    }

    const maxZipBytes = config.maxZipSizeMb * 1024 * 1024;
    if (file.size > maxZipBytes) {
      return NextResponse.json(
        { error: `ZIP file exceeds the ${config.maxZipSizeMb} MB limit.` },
        { status: 400 },
      );
    }

    sourceId = uuidv4();
    const { error: sourceError } = await supabase.from("sources").insert({
      id: sourceId,
      type: "zip",
      name: file.name,
    });

    if (sourceError) throw sourceError;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestZip(buffer, sourceId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Ingest ZIP Error:", error);
    if (sourceId) {
      const { error: rollbackError } = await supabase.from("sources").delete().eq("id", sourceId);
      if (rollbackError) {
        console.error("Failed to rollback source row after ZIP ingest failure:", rollbackError);
      }
    }

    return NextResponse.json({ error: error.message || "Failed to ingest ZIP" }, { status: 500 });
  }
}

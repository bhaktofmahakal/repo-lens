import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/db";
import { requireRequestAuth } from "@/lib/auth-guard";
import { checkRepoLimit, checkRepoSize, LimitExceededError } from "@/lib/check-limits";
import { config } from "@/lib/config";
import { v4 as uuidv4 } from "uuid";

// Bucket must exist in your Supabase project (create it once via the dashboard
// or SQL: INSERT INTO storage.buckets (id, name, public) VALUES ('zip-uploads', 'zip-uploads', false);)
const STORAGE_BUCKET = "zip-uploads";

// This route only issues a presigned URL — no large body, so 30 s is plenty.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database service is currently unavailable." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const fileName: unknown = body.fileName;
    const fileSize: unknown = body.fileSize;

    if (
      typeof fileName !== "string" ||
      !fileName.toLowerCase().endsWith(".zip")
    ) {
      return NextResponse.json(
        { error: "Invalid file. Must be a ZIP archive (.zip)." },
        { status: 400 },
      );
    }

    const maxZipBytes = config.maxZipSizeMb * 1024 * 1024;
    if (typeof fileSize === "number" && fileSize > maxZipBytes) {
      return NextResponse.json(
        { error: `ZIP file exceeds the ${config.maxZipSizeMb} MB limit.` },
        { status: 400 },
      );
    }

    // Check repo count + plan limits before creating the source row.
    const { plan } = await checkRepoLimit(auth.user.id);

    // Check plan-level size limit if we know the size already.
    if (typeof fileSize === "number") {
      checkRepoSize(fileSize, plan);
    }

    const sourceId = uuidv4();
    const storagePath = `${auth.user.id}/${sourceId}.zip`;

    // Create a presigned upload URL. The browser will PUT the ZIP directly
    // to Supabase Storage — bypassing the Vercel 4.5 MB request-body limit.
    const { data: signData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (signError || !signData) {
      console.error("Failed to create signed upload URL:", signError);
      return NextResponse.json(
        {
          error:
            "Failed to prepare upload slot. Ensure the 'zip-uploads' bucket exists in Supabase Storage.",
        },
        { status: 500 },
      );
    }

    // Insert a pending source row so it can be tracked.
    const { error: sourceError } = await supabase.from("sources").insert({
      id: sourceId,
      user_id: auth.user.id,
      type: "zip",
      name: fileName,
    });

    if (sourceError) throw sourceError;

    return NextResponse.json({
      sourceId,
      signedUrl: signData.signedUrl,
      storagePath,
    });
  } catch (error: unknown) {
    if (error instanceof LimitExceededError) {
      return NextResponse.json(
        {
          error: "LIMIT_EXCEEDED",
          plan_required: error.planRequired,
          message: error.message,
        },
        { status: 402 },
      );
    }
    console.error("ZIP presign error:", error);
    return NextResponse.json(
      { error: "Failed to prepare upload." },
      { status: 500 },
    );
  }
}

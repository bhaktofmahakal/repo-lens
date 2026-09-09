import { NextRequest, NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/auth-guard";
import { supabase } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Source ID is required" }, { status: 400 });
  }

  try {
    // Verify source ownership
    const { data: source, error: findError } = await supabase
      .from("sources")
      .select("id, name, user_id")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (findError || !source) {
      return NextResponse.json(
        { error: "Source not found or access denied" },
        { status: 404 },
      );
    }

    // Clean up any sync jobs
    await supabase.from("sync_jobs").delete().eq("source_id", id);

    // Delete the source (cascades to chunks, qa_history, answer_feedback)
    const { error: deleteError } = await supabase
      .from("sources")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete source", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Repository "${source.name}" removed successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error deleting source",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRequestAuth(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Source ID is required" }, { status: 400 });
  }

  try {
    const { data: source, error } = await supabase
      .from("sources")
      .select("id, name, type, github_url, created_at")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error || !source) {
      return NextResponse.json(
        { error: "Source not found or access denied" },
        { status: 404 },
      );
    }

    const { count: chunkCount } = await supabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("source_id", id);

    const { count: questionCount } = await supabase
      .from("qa_history")
      .select("id", { count: "exact", head: true })
      .eq("source_id", id);

    return NextResponse.json({
      source,
      chunkCount: chunkCount || 0,
      questionCount: questionCount || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch source details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

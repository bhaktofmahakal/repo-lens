import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, AlertCircle, FileCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SourceViewerClient } from "@/components/source/SourceViewerClient";

type SourcePageProps = {
  searchParams: Promise<{
    sourceId?: string;
    path?: string;
  }>;
};

export default async function SourcePage({ searchParams }: SourcePageProps) {
  const params = await searchParams;
  const sourceId = params.sourceId?.trim();
  const filePath = params.path?.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!sourceId || !filePath) {
    return (
      <main className="min-h-screen bg-[#0e0e11] px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-[#17171c] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Missing Parameters</h1>
          <p className="mt-2 text-sm text-white/60">
            A valid repository sourceId and file path query parameter are required to view evidence chunks.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard" className="btn-cohere-primary">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: source } = await supabase
    .from("sources")
    .select("id, name")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!source) {
    return (
      <main className="min-h-screen bg-[#0e0e11] px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-[#17171c] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Source Not Found</h1>
          <p className="mt-2 text-sm text-white/60">
            This repository source does not belong to your account or has been removed.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard" className="btn-cohere-primary">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("chunks")
    .select("start_line, end_line, content")
    .eq("source_id", sourceId)
    .eq("file_path", filePath)
    .order("start_line", { ascending: true })
    .limit(500);

  if (error) {
    return (
      <main className="min-h-screen bg-[#0e0e11] px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-[#17171c] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Database Query Failed</h1>
          <p className="mt-2 text-sm text-red-300">{error.message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/ask?sourceId=${encodeURIComponent(sourceId)}`} className="btn-cohere-outline">
              Back to Ask
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!data || data.length === 0) {
    return (
      <main className="min-h-screen bg-[#0e0e11] px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-[#17171c] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
            <FileCode className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">No Indexed Chunks Found</h1>
          <p className="mt-2 text-sm text-white/60 font-mono break-all">{filePath}</p>
          <p className="mt-1 text-xs text-white/40">
            This file may not have had text content or was excluded during indexing.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/ask?sourceId=${encodeURIComponent(sourceId)}`} className="btn-cohere-primary">
              Back to Ask
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <SourceViewerClient
      sourceId={sourceId}
      sourceName={source.name}
      filePath={filePath}
      chunks={data}
    />
  );
}


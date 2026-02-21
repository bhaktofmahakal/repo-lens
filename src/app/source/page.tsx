import Link from "next/link";
import { supabase } from "@/lib/db";

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

  if (!sourceId || !filePath) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">File Viewer</h1>
        <p className="text-sm text-red-600">Missing sourceId or path query parameter.</p>
        <Link href="/" className="text-blue-600 underline">
          Back to Home
        </Link>
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
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">File Viewer</h1>
        <p className="text-sm text-red-600">Failed to load file content.</p>
        <p className="text-xs opacity-70">{error.message}</p>
      </main>
    );
  }

  if (!data || data.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">File Viewer</h1>
        <p className="text-sm text-red-600">No indexed content found for this file.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Referenced File</h1>
        <p className="font-mono text-sm break-all">{filePath}</p>
      </header>

      <section className="space-y-4">
        {data.map((chunk) => (
          <article
            key={`${chunk.start_line}-${chunk.end_line}`}
            id={`L${chunk.start_line}-L${chunk.end_line}`}
            className="border rounded-lg overflow-hidden"
          >
            <header className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-mono">
              Lines {chunk.start_line}-{chunk.end_line}
            </header>
            <pre className="p-3 overflow-x-auto text-xs bg-slate-50 dark:bg-slate-900">
              <code>{chunk.content}</code>
            </pre>
          </article>
        ))}
      </section>
    </main>
  );
}

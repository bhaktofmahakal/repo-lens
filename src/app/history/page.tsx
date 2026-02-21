"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Calendar, MessageSquare } from "lucide-react";
import { QAHistory } from "@/types";

function HistoryContent() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId");
  const [history, setHistory] = useState<QAHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!sourceId) {
      router.replace("/");
      setLoading(false);
    }
  }, [sourceId, router]);

  useEffect(() => {
    if (!sourceId) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/history?sourceId=${sourceId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch history");
        setHistory(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [sourceId]);

  if (!sourceId) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-10 flex items-center gap-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
        <button
          onClick={() => router.push(`/ask?sourceId=${sourceId}`)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-semibold text-white">QA History</h1>
      </header>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin w-10 h-10" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-900/20 p-4 text-red-200">
          {error}
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="py-20 text-center text-xl italic text-slate-400">
          No history found for this codebase.
        </div>
      )}

      <div className="space-y-8">
        {history.map((item, idx) => (
          <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
            <header className="mb-4 flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="w-4 h-4" />
                {new Date(item.created_at).toLocaleString()}
              </span>
              <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                #{history.length - idx}
              </span>
            </header>

            <div className="space-y-4">
              <div className="flex gap-3">
                <MessageSquare className="w-5 h-5 shrink-0 mt-1 opacity-60" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                  <div className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-200">
                    {item.answer}
                  </div>
                </div>
              </div>

              {item.citations_json && item.citations_json.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-4">
                  <span className="mb-1 w-full text-sm font-semibold text-slate-200">Citations:</span>
                  {item.citations_json.map((cit, cidx) => (
                    <div key={cidx} className="rounded border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs font-mono text-slate-300">
                      {cit.filePath} (L{cit.startLine}-{cit.endLine})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <HistoryContent />
        </Suspense>
    )
}

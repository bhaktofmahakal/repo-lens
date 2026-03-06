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
      router.replace("/ask");
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
    return <div className="flex items-center justify-center min-h-screen bg-[#151515]">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-[#151515]">
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-10 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4">
        <button
          onClick={() => router.push(`/ask?sourceId=${sourceId}`)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#111111] text-white/70 transition-colors hover:border-[#F04D26]/50 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-white">Q&amp;A History</h1>
          <p className="text-sm text-[#7d7d87]">Last 10 interactions for this codebase</p>
        </div>
      </header>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin w-10 h-10 text-[#F04D26]" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-900/15 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#1a1a1a]/40 py-20 text-center text-base italic text-[#7d7d87]">
          No history found for this codebase.
        </div>
      )}

      <div className="space-y-8">
        {history.map((item, idx) => (
          <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-6">
            <header className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="flex items-center gap-2 text-sm text-[#7d7d87]">
                <Calendar className="w-4 h-4" />
                {new Date(item.created_at).toLocaleString()}
              </span>
              <span className="rounded-lg bg-[#0e0e0e] px-2.5 py-1 text-xs font-mono text-white/50">
                #{history.length - idx}
              </span>
            </header>

            <div className="space-y-4">
              <div className="flex gap-3">
                <MessageSquare className="w-5 h-5 shrink-0 mt-1 text-[#F04D26] opacity-70" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                  <div className="mt-4 whitespace-pre-wrap leading-relaxed text-white/70">
                    {item.answer}
                  </div>
                </div>
              </div>

              {item.citations_json && item.citations_json.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                  <span className="mb-1 w-full text-sm font-semibold text-white/70">Citations:</span>
                  {item.citations_json.map((cit, cidx) => (
                    <div key={cidx} className="rounded-lg border border-white/10 bg-[#0e0e0e] px-2.5 py-1 text-xs font-mono text-[#7d7d87]">
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
    </div>
  );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#151515]"><Loader2 className="animate-spin text-[#F04D26]" /></div>}>
            <HistoryContent />
        </Suspense>
    )
}

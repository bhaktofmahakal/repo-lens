/* utsav */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Calendar, MessageSquare, ExternalLink } from "lucide-react";
import { QAHistory } from "@/types";

function HistoryContent() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId");
  const [history, setHistory] = useState<QAHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    router.push("/");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="flex items-center gap-4 mb-12">
        <button onClick={() => router.push(`/ask?sourceId=${sourceId}`)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold">QA History</h1>
      </header>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin w-10 h-10" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="text-center py-20 opacity-60 italic text-xl">
          No history found for this codebase.
        </div>
      )}

      <div className="space-y-8">
        {history.map((item, idx) => (
          <article key={item.id} className="p-6 border rounded-xl shadow-sm bg-white dark:bg-slate-900">
            <header className="flex items-center justify-between mb-4 border-b pb-2">
              <span className="text-sm opacity-60 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(item.created_at).toLocaleString()}
              </span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                #{history.length - idx}
              </span>
            </header>

            <div className="space-y-4">
              <div className="flex gap-3">
                <MessageSquare className="w-5 h-5 shrink-0 mt-1 opacity-60" />
                <div>
                  <h3 className="font-semibold text-lg">{item.question}</h3>
                  <div className="mt-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>

              {item.citations_json && item.citations_json.length > 0 && (
                <div className="pt-4 flex flex-wrap gap-2 border-t">
                  <span className="text-sm font-semibold w-full mb-1">Citations:</span>
                  {item.citations_json.map((cit, cidx) => (
                    <div key={cidx} className="bg-slate-50 dark:bg-slate-800 border rounded px-2 py-1 text-xs font-mono">
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

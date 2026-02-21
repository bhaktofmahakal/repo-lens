/* utsav */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, ArrowLeft, ExternalLink, Code, History } from "lucide-react";
import { AskResponse, Citation } from "@/types";

function AskContent() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!sourceId) {
    router.push("/");
    return null;
  }

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !sourceId) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sourceId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer");

      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Ask Section */}
      <main className="lg:col-span-2 space-y-8">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">Ask Repo Lens</h1>
          <div className="ml-auto">
            <button
              onClick={() => router.push(`/history?sourceId=${sourceId}`)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 px-3 text-sm font-medium"
            >
              <History className="w-5 h-5" />
              History
            </button>
          </div>
        </header>

        <form onSubmit={handleAsk} className="relative">
          <input
            type="text"
            placeholder="Ask a question about the codebase..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-4 pl-12 border-2 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">
            <Search className="w-6 h-6" />
          </div>
          <button
            type="submit"
            disabled={loading || !question}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Ask"}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {response && (
          <div className="space-y-6">
            <section className="p-6 border rounded-xl shadow-sm bg-white dark:bg-slate-900 prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                Answer
              </h2>
              <div className="whitespace-pre-wrap leading-relaxed">
                {response.answer}
              </div>
            </section>

            {response.citations && response.citations.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Citations
                </h3>
                <div className="grid gap-3">
                  {response.citations.map((cit, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 hover:border-blue-400 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-sm font-semibold truncate flex-1">
                          {cit.filePath}
                        </span>
                        <span className="text-xs opacity-60">
                          L{cit.startLine}-{cit.endLine}
                        </span>
                      </div>
                      {cit.sourceUrl && (
                        <a href={cit.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                          View source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Evidence Panel (Sidebar) */}
      <aside className="space-y-6 lg:sticky lg:top-8 h-fit max-h-[calc(100vh-4rem)] overflow-y-auto pr-2">
        <h3 className="text-lg font-semibold flex items-center gap-2 sticky top-0 bg-background py-2">
          <Code className="w-5 h-5" />
          Retrieved Evidence
        </h3>
        
        {response?.retrievedSnippets ? (
          <div className="space-y-4">
            {response.retrievedSnippets.map((snippet, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden text-xs">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono flex justify-between items-center border-b">
                  <span className="truncate flex-1 font-semibold">{snippet.filePath}</span>
                  <span className="opacity-60 ml-2">L{snippet.startLine}</span>
                </div>
                <pre className="p-3 bg-slate-50 dark:bg-slate-900 overflow-x-auto">
                  <code>{snippet.snippet}</code>
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm opacity-60 italic">Ask a question to see retrieved code snippets.</p>
        )}
      </aside>
    </div>
  );
}

export default function AskPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <AskContent />
        </Suspense>
    )
}

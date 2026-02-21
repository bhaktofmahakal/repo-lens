"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Code2, ExternalLink, History, Loader2, Search } from "lucide-react";
import { AskResponse, Citation } from "@/types";

const markdownComponents: Components = {
  h1: ({ ...props }) => <h1 className="mb-4 mt-1 text-2xl font-semibold text-slate-50" {...props} />,
  h2: ({ ...props }) => <h2 className="mb-3 mt-6 text-xl font-semibold text-slate-100" {...props} />,
  h3: ({ ...props }) => <h3 className="mb-3 mt-5 text-lg font-semibold text-slate-100" {...props} />,
  p: ({ ...props }) => <p className="mb-4 leading-7 text-slate-200" {...props} />,
  ul: ({ ...props }) => <ul className="mb-4 list-disc space-y-2 pl-6 text-slate-200" {...props} />,
  ol: ({ ...props }) => <ol className="mb-4 list-decimal space-y-2 pl-6 text-slate-200" {...props} />,
  li: ({ ...props }) => <li className="leading-7" {...props} />,
  a: ({ ...props }) => (
    <a className="text-blue-300 underline underline-offset-2 transition-colors hover:text-blue-200" {...props} />
  ),
  pre: ({ ...props }) => <pre className="mb-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 p-4" {...props} />,
  code: ({ className, children, ...props }) => {
    const isBlockCode = typeof className === "string" && className.length > 0;
    if (isBlockCode) {
      return (
        <code className={`${className} text-sm text-slate-100`} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className="rounded bg-slate-800 px-1.5 py-1 text-[0.9em] text-blue-200" {...props}>
        {children}
      </code>
    );
  },
};

function CitationCard({ citation }: { citation: Citation }) {
  const Wrapper = citation.sourceUrl ? "a" : "div";
  return (
    <Wrapper
      {...(citation.sourceUrl
        ? { href: citation.sourceUrl, target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className="group block rounded-xl border border-slate-700/90 bg-slate-900/80 p-4 transition-colors hover:border-blue-400/70"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="truncate font-mono text-xs font-semibold text-slate-200">{citation.filePath}</span>
        <span className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300">
          L{citation.startLine}-L{citation.endLine}
        </span>
      </div>
      <p className="max-h-16 overflow-hidden text-xs leading-5 text-slate-400">{citation.snippet}</p>
      {citation.sourceUrl ? (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-300 group-hover:text-blue-200">
          View source <ExternalLink className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </Wrapper>
  );
}

function AskContent() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!sourceId) {
      router.replace("/");
    }
  }, [sourceId, router]);

  if (!sourceId) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Redirecting...</div>;
  }

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || !sourceId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalizedQuestion, sourceId }),
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
    <div className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(340px,1fr)]">
      <main className="space-y-6">
        <header className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/")}
              aria-label="Back to home"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-white">Ask Repo Lens</h1>
              <p className="mt-1 text-sm text-slate-400">Ask natural-language questions and verify every answer with source evidence.</p>
            </div>
            <button
              onClick={() => router.push(`/history?sourceId=${sourceId}`)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            >
              <History className="h-4 w-4" />
              History
            </button>
          </div>
        </header>

        <form onSubmit={handleAsk} className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-[0_20px_60px_-32px_rgba(37,99,235,0.8)]">
          <label htmlFor="repo-question" className="block text-sm font-medium text-slate-300">
            Question
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                id="repo-question"
                type="text"
                placeholder="Where is auth handled? How do retries work?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="h-14 w-full rounded-xl border border-slate-600 bg-slate-950/80 pl-12 pr-4 text-base text-slate-100 placeholder:text-slate-400 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex h-14 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-base font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900/40 disabled:text-slate-300"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ask"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Answers are grounded only in retrieved snippets and include file/line citations.</p>
        </form>

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        {response ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-700/90 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
              <h2 className="mb-4 border-b border-slate-700 pb-3 text-xl font-semibold text-white">Answer</h2>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {response.answer}
              </ReactMarkdown>
              {response.note_when_insufficient_evidence ? (
                <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {response.note_when_insufficient_evidence}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-700/90 bg-slate-900/70 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <ExternalLink className="h-5 w-5 text-blue-300" />
                Citations
              </h3>
              {response.citations.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {response.citations.map((citation, index) => (
                    <CitationCard key={`${citation.filePath}-${citation.startLine}-${index}`} citation={citation} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No direct citations available for this answer.</p>
              )}
            </section>
          </div>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-400">
            Ask a question to see grounded answer, citations, and retrieved snippets.
          </section>
        )}
      </main>

      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <section className="rounded-2xl border border-slate-700/90 bg-slate-900/70 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Code2 className="h-5 w-5 text-blue-300" />
            Retrieved Evidence
          </h3>
          {response?.retrievedSnippets?.length ? (
            <div className="space-y-4">
              {response.retrievedSnippets.map((snippet, index) => (
                <article key={`${snippet.filePath}-${snippet.startLine}-${index}`} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
                  <header className="flex items-center justify-between gap-2 border-b border-slate-700 bg-slate-900 px-3 py-2">
                    <span className="truncate font-mono text-xs font-semibold text-slate-200">{snippet.filePath}</span>
                    <span className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                      L{snippet.startLine}-L{snippet.endLine}
                    </span>
                  </header>
                  <pre className="max-h-64 overflow-auto p-3 text-xs leading-5 text-slate-200">
                    <code>{snippet.snippet}</code>
                  </pre>
                  {snippet.sourceUrl ? (
                    <a
                      href={snippet.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border-t border-slate-700 px-3 py-2 text-xs font-medium text-blue-300 transition-colors hover:text-blue-200"
                    >
                      Open source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
              Retrieved snippets will appear here after you submit a question.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <AskContent />
    </Suspense>
  );
}

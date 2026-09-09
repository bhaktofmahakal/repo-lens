"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileCode,
  Github,
  History,
  Layers,
  Link2,
  Loader2,
  MessageSquare,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { QAHistory } from "@/types";
import { CohereNavbar } from "@/components/navigation/CohereNavbar";

type ShareState = {
  shared: boolean;
  share_uuid?: string;
  share_url?: string;
  expires_at?: string | null;
  view_count?: number;
  created_at?: string;
};

type SourceItem = {
  id: string;
  name: string;
  type: string;
  github_url: string | null;
  created_at: string;
  chunk_count?: number;
};

function extractApiError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  return fallback;
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId");
  const router = useRouter();

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(!sourceId);
  const [history, setHistory] = useState<QAHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shareState, setShareState] = useState<ShareState>({ shared: false });
  const [shareLoading, setShareLoading] = useState(false);
  const [shareBusyAction, setShareBusyAction] = useState<"create" | "revoke" | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copiedAnswerId, setCopiedAnswerId] = useState<string | null>(null);

  // Fetch sources list if not present or to display repo switcher
  useEffect(() => {
    async function loadSources() {
      try {
        const res = await fetch("/api/sources");
        if (res.ok) {
          const data = await res.json();
          if (data.sources) {
            setSources(data.sources);
          }
        }
      } catch (err) {
        console.error("Failed to load sources for history:", err);
      } finally {
        setSourcesLoading(false);
      }
    }
    loadSources();
  }, []);

  // Fetch Q&A history when sourceId is available
  useEffect(() => {
    if (!sourceId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/history?sourceId=${encodeURIComponent(sourceId)}`);
        const data: unknown = await res.json();
        if (!res.ok) throw new Error(extractApiError(data, "Failed to fetch history"));
        if (!Array.isArray(data)) throw new Error("Unexpected history response format.");
        setHistory(data as QAHistory[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [sourceId]);

  // Fetch share state when sourceId is available
  useEffect(() => {
    if (!sourceId) return;

    const fetchShareState = async () => {
      setShareLoading(true);
      setShareMessage(null);
      try {
        const res = await fetch(`/api/share?sourceId=${encodeURIComponent(sourceId)}`);
        const data: unknown = await res.json();
        if (!res.ok) {
          throw new Error(extractApiError(data, "Failed to fetch share state"));
        }
        if (
          data &&
          typeof data === "object" &&
          "shared" in data &&
          (data as ShareState).shared
        ) {
          setShareState(data as ShareState);
        } else {
          setShareState({ shared: false });
        }
      } catch (err) {
        setShareState({ shared: false });
        setShareMessage(err instanceof Error ? err.message : "Failed to load share state.");
      } finally {
        setShareLoading(false);
      }
    };

    fetchShareState();
  }, [sourceId]);

  const createShareLink = async () => {
    if (!sourceId) return;
    setShareBusyAction("create");
    setShareMessage(null);
    setCopyMessage(null);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, is_public: true }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        throw new Error(extractApiError(data, "Failed to create share link"));
      }

      const typedData = data as ShareState;
      setShareState({
        shared: true,
        share_uuid: typedData.share_uuid,
        share_url: typedData.share_url,
        expires_at: typedData.expires_at,
        created_at: typedData.created_at,
        view_count: typedData.view_count,
      });
      setShareMessage("Public share link created successfully.");
    } catch (err) {
      setShareMessage(err instanceof Error ? err.message : "Failed to create share link.");
    } finally {
      setShareBusyAction(null);
    }
  };

  const revokeShareLink = async () => {
    if (!sourceId) return;
    setShareBusyAction("revoke");
    setShareMessage(null);
    setCopyMessage(null);

    try {
      const res = await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        throw new Error(extractApiError(data, "Failed to revoke share link"));
      }

      setShareState({ shared: false });
      setShareMessage("Share link revoked.");
    } catch (err) {
      setShareMessage(err instanceof Error ? err.message : "Failed to revoke share link.");
    } finally {
      setShareBusyAction(null);
    }
  };

  const copyShareLink = async () => {
    if (!shareState.share_url) return;
    setCopyMessage(null);

    try {
      await navigator.clipboard.writeText(shareState.share_url);
      setCopyMessage("Link copied to clipboard!");
      setTimeout(() => setCopyMessage(null), 3000);
    } catch {
      setCopyMessage("Copy failed. Please copy manually.");
    }
  };

  const copyAnswerText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnswerId(id);
    setTimeout(() => setCopiedAnswerId(null), 2500);
  };

  const currentSource = sources.find((s) => s.id === sourceId);

  // If no sourceId is provided, render repository picker rather than broken redirect
  if (!sourceId) {
    return (
      <div className="min-h-screen bg-[#0e0e11] text-white">
        <CohereNavbar />
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="mb-8 border-b border-white/[0.08] pb-6">
            <span className="cohere-mono-label">AUDIT ARCHIVE</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
              Q&A Audit History
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Select an indexed repository below to inspect historical questions, responses, and verifiable citations.
            </p>
          </div>

          {sourcesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              <p className="font-mono text-xs text-white/50">Fetching indexed repositories...</p>
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#17171c] p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Database className="h-6 w-6 text-white/40" />
              </div>
              <h2 className="text-base font-semibold text-white">No Repositories Indexed</h2>
              <p className="mt-1 text-xs text-white/60 max-w-md mx-auto">
                You haven&apos;t indexed any repositories yet. Index a GitHub repository or upload a ZIP archive from the Dashboard to start querying.
              </p>
              <div className="mt-6">
                <Link href="/dashboard" className="btn-cohere-primary">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => router.push(`/history?sourceId=${s.id}`)}
                  className="group rounded-xl border border-white/10 bg-[#141418] p-5 text-left transition-all hover:border-white/25 hover:bg-[#1a1a20]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
                      {s.type === "github" ? <Github className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
                    </div>
                    {s.chunk_count !== undefined && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-white/60">
                        {s.chunk_count} chunks
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-mono text-sm font-semibold text-white group-hover:text-[#ff7759] transition-colors truncate">
                    {s.name}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-white/40">
                    Created {new Date(s.created_at).toLocaleDateString()}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs font-medium text-white/70 group-hover:text-white">
                    <span>View Audit History</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white">
      <CohereNavbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header with Cohere research-table cadence */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/ask?sourceId=${encodeURIComponent(sourceId)}`}
                className="btn-cohere-outline !px-3 !py-1 text-xs"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back to Ask</span>
              </Link>
              <span className="text-white/20">/</span>
              <span className="cohere-mono-label">QUERY LOG & CITATIONS</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
              {currentSource?.name || "Repository"} History
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Audit log of natural-language questions asked against this indexed codebase.
            </p>
          </div>

          {/* Ask New Question CTA */}
          <Link
            href={`/ask?sourceId=${encodeURIComponent(sourceId)}`}
            className="btn-cohere-primary self-start sm:self-auto"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Ask New Question</span>
          </Link>
        </div>

        {/* Share Session Panel (Cohere Agent Console Style) */}
        <section className="mb-8 rounded-xl border border-white/10 bg-[#17171c] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[#ff7759]" />
                <span className="text-sm font-semibold text-white">Public Share Link</span>
                {shareState.shared && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                    Active (Public)
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                {shareState.shared
                  ? "Anyone with this secret URL can inspect this repository's verifiable Q&A log."
                  : "Generate a read-only public URL to share code intelligence findings with teammates."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {shareLoading ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : shareState.shared && shareState.share_url ? (
                <>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="btn-cohere-outline !py-1.5 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={revokeShareLink}
                    disabled={shareBusyAction === "revoke"}
                    className="btn-cohere-outline !py-1.5 text-xs !text-red-300 !border-red-500/30 hover:!bg-red-500/10"
                  >
                    {shareBusyAction === "revoke" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Revoke</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={createShareLink}
                  disabled={shareBusyAction === "create"}
                  className="btn-cohere-outline !py-1.5 text-xs"
                >
                  {shareBusyAction === "create" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  <span>Generate Share Link</span>
                </button>
              )}
            </div>
          </div>

          {copyMessage && (
            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
              {copyMessage}
            </div>
          )}
          {shareMessage && !copyMessage && (
            <div className="mt-3 text-xs text-white/60">{shareMessage}</div>
          )}
        </section>

        {/* History List in Cohere Research-Table / Rule-Separated Layout */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            <p className="font-mono text-xs text-white/50">Loading query history...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">
            <p className="text-sm font-semibold">Failed to load history</p>
            <p className="mt-1 text-xs text-red-400">{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#17171c] p-12 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-white/30" />
            <h3 className="text-base font-semibold text-white">No Questions Yet</h3>
            <p className="mt-1 text-xs text-white/60">
              You haven&apos;t asked any questions about this repository yet.
            </p>
            <div className="mt-5">
              <Link
                href={`/ask?sourceId=${encodeURIComponent(sourceId)}`}
                className="btn-cohere-primary"
              >
                Ask Your First Question
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-white/10 bg-[#141418] p-6 transition-all hover:border-white/20"
              >
                {/* Header: Timestamp & Actions */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs text-white/40">
                  <div className="flex items-center gap-2 font-mono">
                    <Clock className="h-3.5 w-3.5 text-white/40" />
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyAnswerText(item.answer, item.id)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/60 hover:text-white transition-colors"
                  >
                    {copiedAnswerId === item.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Answer</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Question */}
                <div className="mt-4">
                  <div className="cohere-mono-label text-[10px]">QUESTION</div>
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-white leading-snug">
                    {item.question}
                  </h3>
                </div>

                {/* Answer */}
                <div className="mt-4 rounded-lg border border-white/[0.06] bg-[#0d0d10] p-4">
                  <div className="cohere-mono-label text-[10px] text-[#ff7759] mb-2">VERIFIED RESPONSE</div>
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed text-white/85">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {item.answer}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Citations Footer */}
                {Array.isArray(item.citations_json) && item.citations_json.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="cohere-mono-label text-[10px]">EVIDENCE:</span>
                      {item.citations_json.map((c, idx) => (
                        <Link
                          key={idx}
                          href={`/source?sourceId=${encodeURIComponent(sourceId)}&path=${encodeURIComponent(c.filePath)}#L${c.startLine}-L${c.endLine}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/80 hover:border-white/30 hover:bg-white/10 transition-colors"
                        >
                          <FileCode className="h-3 w-3 text-[#ff7759]" />
                          <span className="truncate max-w-[200px]">{c.filePath}</span>
                          <span className="text-white/40">:{c.startLine}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0e0e11] text-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}

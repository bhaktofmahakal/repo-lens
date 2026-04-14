"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Link2,
  Loader2,
  MessageSquare,
  Share2,
  Trash2,
} from "lucide-react";
import { QAHistory } from "@/types";

type ShareState = {
  shared: boolean;
  share_uuid?: string;
  share_url?: string;
  expires_at?: string | null;
  view_count?: number;
  created_at?: string;
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
  const [history, setHistory] = useState<QAHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareState, setShareState] = useState<ShareState>({ shared: false });
  const [shareLoading, setShareLoading] = useState(false);
  const [shareBusyAction, setShareBusyAction] = useState<"create" | "revoke" | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
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
        const data: unknown = await res.json();
        if (!res.ok) throw new Error(extractApiError(data, "Failed to fetch history"));
        if (!Array.isArray(data)) throw new Error("Unexpected history response.");
        setHistory(data as QAHistory[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [sourceId]);

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
      setShareMessage("Share link created.");
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
      setCopyMessage("Link copied.");
    } catch {
      setCopyMessage("Copy failed. Copy manually from the field below.");
    }
  };

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

      <section className="mb-8 rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Share2 className="h-4 w-4 text-[#F04D26]" />
              Share this session
            </p>
            <p className="text-xs text-[#7d7d87]">
              {shareState.shared
                ? "Anyone with the link can view this Q&A history."
                : "Generate a read-only link to share this Q&A history."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {shareLoading ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading share state...
              </div>
            ) : shareState.shared && shareState.share_url ? (
              <>
                <button
                  onClick={copyShareLink}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#111111] px-3 py-2 text-xs text-white/80 transition-colors hover:border-[#F04D26]/50 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </button>
                <button
                  onClick={revokeShareLink}
                  disabled={shareBusyAction === "revoke"}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {shareBusyAction === "revoke" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Revoke
                </button>
              </>
            ) : (
              <button
                onClick={createShareLink}
                disabled={shareBusyAction === "create"}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F04D26] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#ff5d36] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {shareBusyAction === "create" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Create share link
              </button>
            )}
          </div>
        </div>

        {shareState.shared && shareState.share_url && (
          <div className="mt-4 space-y-2">
            <input
              readOnly
              value={shareState.share_url}
              className="w-full rounded-lg border border-white/10 bg-[#111111] px-3 py-2 text-xs text-white/80 outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
              {typeof shareState.view_count === "number" && <span>Views: {shareState.view_count}</span>}
              {shareState.expires_at && (
                <span>Expires: {new Date(shareState.expires_at).toLocaleString()}</span>
              )}
              {copyMessage && <span className="text-[#8adf9c]">{copyMessage}</span>}
            </div>
          </div>
        )}

        {shareMessage && <p className="mt-3 text-xs text-white/70">{shareMessage}</p>}
      </section>

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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  Layers,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Citation } from "@/types";
import { FullPageCyberLoader } from "@/components/ui/EngagingLoaders";
import { linkifyCitations } from "@/lib/qa/citations";

type SharedSource = {
  id: string;
  name: string;
  type: string;
};

type SharedHistoryItem = {
  id: string;
  source_id: string;
  question: string;
  answer: string;
  citations_json: Citation[] | null;
  created_at: string;
};

type SharedPayload = {
  source: SharedSource | null;
  shared: {
    share_uuid: string;
    view_count: number;
    created_at: string;
  };
  history: SharedHistoryItem[];
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

function normalizeShareParam(rawParam: string | string[] | undefined): string {
  if (typeof rawParam === "string") return rawParam;
  if (Array.isArray(rawParam) && rawParam[0]) return rawParam[0];
  return "";
}

export default function SharedSessionPage() {
  const params = useParams<{ shareUuid: string | string[] }>();
  const shareUuid = useMemo(() => normalizeShareParam(params?.shareUuid), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SharedPayload | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!shareUuid) return;

    const fetchShared = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(shareUuid)}`);
        const data: unknown = await res.json();

        if (!res.ok) {
          throw new Error(extractApiError(data, "Failed to load shared session"));
        }

        setPayload(data as SharedPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Shared link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchShared();
  }, [shareUuid]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <FullPageCyberLoader label="Decrypting shared code intelligence report..." />;
  }

  if (error || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e11] px-4 text-white">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#17171c] p-8 text-center shadow-2xl">
          <span className="cohere-mono-label text-[10px] text-red-400">ACCESS EXPIRED OR INVALID</span>
          <h2 className="mt-2 text-lg font-bold text-white font-mono">Shared Session Unavailable</h2>
          <p className="mt-2 text-xs text-white/60 leading-relaxed">
            {error || "This shared report link could not be located. It may have expired or been revoked by the repository owner."}
          </p>
          <div className="mt-6">
            <Link href="/" className="btn-cohere-primary">
              Return to RepoLens
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0e0e11]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-[#17171c] text-white">
              <Layers className="h-4 w-4 text-[#ff7759]" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm font-bold tracking-tight text-white">RepoLens</span>
              <span className="cohere-mono-label text-[9px] -mt-0.5">READ-ONLY AUDIT REPORT</span>
            </div>
          </Link>

          <Link href="/login" className="btn-cohere-primary !py-1.5 text-xs">
            <span>Try RepoLens Free</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Banner with metadata */}
        <div className="mb-8 rounded-xl border border-white/10 bg-[#17171c] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="cohere-mono-label">VERIFIED CODEBASE REPORT</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px] text-emerald-400">IMMUTABLE SNAPSHOT</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono">
                {payload.source?.name || "Shared Codebase"}
              </h1>
              <p className="mt-1 text-xs text-white/60 font-mono">
                Shared on {new Date(payload.shared.created_at).toLocaleDateString()} • {payload.shared.view_count} views
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-right">
              <div className="cohere-mono-label text-[9px]">TOTAL INQUIRIES</div>
              <div className="font-mono text-base font-bold text-white">{payload.history.length}</div>
            </div>
          </div>
        </div>

        {/* History List */}
        {payload.history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#141418] p-12 text-center text-xs text-white/50 font-mono">
            No query history is available in this shared session.
          </div>
        ) : (
          <div className="space-y-6">
            {payload.history.map((item, idx) => (
              <article
                key={item.id}
                className="rounded-xl border border-white/10 bg-[#141418] p-6 transition-all hover:border-white/20"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs text-white/40">
                  <div className="flex items-center gap-2 font-mono">
                    <Clock className="h-3.5 w-3.5 text-white/40" />
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(item.answer, item.id)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/60 hover:text-white transition-colors"
                  >
                    {copiedId === item.id ? (
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
                  <div className="cohere-mono-label text-[10px]">INQUIRY</div>
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-white leading-snug">
                    {item.question}
                  </h3>
                </div>

                {/* Answer with Markdown rendering */}
                <div className="mt-4 rounded-lg border border-white/[0.06] bg-[#0d0d10] p-4">
                  <div className="cohere-mono-label text-[10px] text-[#ff7759] mb-2">VERIFIED RESPONSE</div>
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed text-white/85">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children, ...props }) => {
                          const isInternalSource = href?.startsWith("/source") || href?.includes("github.com");
                          return (
                            <a
                              href={href}
                              target={isInternalSource ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className={
                                isInternalSource
                                  ? "inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#ff7759] hover:text-[#ff927a] bg-[#ff7759]/10 hover:bg-[#ff7759]/20 px-1.5 py-0.5 rounded border border-[#ff7759]/25 transition-colors no-underline"
                                  : "text-[#ff7759] underline hover:text-[#ff927a]"
                              }
                              {...props}
                            >
                              {isInternalSource && <FileCode className="inline h-3 w-3 mr-0.5 text-[#ff7759]" />}
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {linkifyCitations(item.answer, payload.source?.id, item.citations_json || undefined)}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Citations Footer */}
                {Array.isArray(item.citations_json) && item.citations_json.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="cohere-mono-label text-[10px]">EVIDENCE CITATIONS:</span>
                      {item.citations_json.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/80"
                        >
                          <FileCode className="h-3 w-3 text-[#ff7759]" />
                          <span className="truncate max-w-[240px]">{c.filePath}</span>
                          <span className="text-white/40">:{c.startLine}-{c.endLine}</span>
                        </div>
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
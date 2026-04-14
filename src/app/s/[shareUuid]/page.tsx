"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Loader2, MessageSquare } from "lucide-react";
import { Citation } from "@/types";

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

  useEffect(() => {
    if (!shareUuid) {
      setError("Invalid share link.");
      setLoading(false);
      return;
    }

    const fetchSharedSession = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/share/${shareUuid}`);
        const data: unknown = await res.json();

        if (!res.ok) {
          throw new Error(extractApiError(data, "Failed to load shared session"));
        }

        setPayload(data as SharedPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared session.");
      } finally {
        setLoading(false);
      }
    };

    void fetchSharedSession();
  }, [shareUuid]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#151515]">
        <Loader2 className="h-10 w-10 animate-spin text-[#F04D26]" />
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-[#151515] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/40 bg-red-900/10 p-6 text-center">
          <h1 className="text-xl font-semibold text-red-200">Shared session unavailable</h1>
          <p className="mt-2 text-sm text-red-200/80">{error || "This share link is invalid or no longer active."}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#111111] px-4 py-2 text-sm text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to RepoLens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#151515]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <h1 className="text-2xl font-semibold text-white">Shared Q&amp;A Session</h1>
          <p className="mt-1 text-sm text-[#7d7d87]">
            Read-only history from {payload.source?.name || "a RepoLens source"}
            {payload.source?.type ? ` (${payload.source.type})` : ""}
          </p>
          <div className="mt-3 text-xs text-white/60">
            Views: {payload.shared.view_count} · Shared on {new Date(payload.shared.created_at).toLocaleString()}
          </div>
        </header>

        {payload.history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#1a1a1a]/40 py-20 text-center text-base italic text-[#7d7d87]">
            No Q&amp;A history has been shared yet.
          </div>
        ) : (
          <div className="space-y-8">
            {payload.history.map((item, idx) => (
              <article key={item.id} className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-6">
                <header className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="flex items-center gap-2 text-sm text-[#7d7d87]">
                    <Calendar className="h-4 w-4" />
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                  <span className="rounded-lg bg-[#0e0e0e] px-2.5 py-1 text-xs font-mono text-white/50">
                    #{payload.history.length - idx}
                  </span>
                </header>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-[#F04D26] opacity-70" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                      <div className="mt-4 whitespace-pre-wrap leading-relaxed text-white/70">{item.answer}</div>
                    </div>
                  </div>

                  {Array.isArray(item.citations_json) && item.citations_json.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                      <span className="mb-1 w-full text-sm font-semibold text-white/70">Citations:</span>
                      {item.citations_json.map((citation, citationIndex) => (
                        <div
                          key={`${item.id}-cit-${citationIndex}`}
                          className="rounded-lg border border-white/10 bg-[#0e0e0e] px-2.5 py-1 text-xs font-mono text-[#7d7d87]"
                        >
                          {citation.filePath} (L{citation.startLine}-{citation.endLine})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
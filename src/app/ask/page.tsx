"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Database,
  ExternalLink,
  FileCode,
  Github,
  History,
  Layers,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { AskResponse, Citation, RefactorResponse } from "@/types";
import { CohereNavbar } from "@/components/navigation/CohereNavbar";

type EvidenceTag = {
  id: string;
  label: string;
  count: number;
};

type LimitState = {
  planRequired: "pro" | "team";
  message: string;
};

type SourceItem = {
  id: string;
  name: string;
  type: string;
  github_url: string | null;
  chunk_count?: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AskResponse;
  timestamp: string;
};

// Formatted Code Block with Copy Action
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isInline = !className && typeof children === "string" && !children.includes("\n");

  if (isInline) {
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[#ff7759]">
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-white/10 bg-[#0d0d10]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#141418] px-3.5 py-1.5 text-[11px] font-mono text-white/50">
        <span className="uppercase tracking-wider text-[10px] text-[#93939f]">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-white/90 selection:bg-[#ff7759]/30">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function UpgradeModal({ state, onClose }: { state: LimitState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#17171c] p-6 shadow-2xl">
        <span className="cohere-mono-label text-[10px] text-[#ff7759]">LIMIT EXCEEDED</span>
        <h2 className="mt-1 text-base font-bold text-white font-mono">Subscription Upgrade Required</h2>
        <p className="mt-2 text-xs text-white/70 leading-relaxed">{state.message}</p>
        <p className="mt-2 text-[11px] font-mono text-white/50">
          Recommended Plan: <span className="uppercase text-white font-semibold">{state.planRequired}</span>
        </p>
        <div className="mt-6 flex gap-2 border-t border-white/10 pt-4">
          <Link
            href="/dashboard/billing"
            className="btn-cohere-primary !py-1.5 text-xs"
          >
            Upgrade to {state.planRequired === "pro" ? "Pro" : "Team"}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn-cohere-outline !py-1.5 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function RefactorModal({
  refactorResponse,
  loading,
  error,
  onClose,
}: {
  refactorResponse: RefactorResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-white/15 bg-[#17171c] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <span className="cohere-mono-label text-[10px]">AI CODE ARCHITECTURE</span>
            <h3 className="text-base font-bold text-white font-mono">Refactor Recommendations</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-white/60" />
              <p className="font-mono text-xs text-white/50">Synthesizing architectural refactor suggestions...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">
              {error}
            </div>
          ) : refactorResponse?.suggestions && refactorResponse.suggestions.length > 0 ? (
            refactorResponse.suggestions.map((sug, idx) => (
              <div key={idx} className="rounded-xl border border-white/10 bg-[#141418] p-4 space-y-2.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold text-white truncate max-w-[400px]">{sug.title}</span>
                  <span className="cohere-mono-label text-[10px]">SUGGESTION #{idx + 1}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{sug.rationale}</p>
                {sug.expectedImpact && (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono text-emerald-300">
                    Expected Impact: {sug.expectedImpact}
                  </div>
                )}
                {sug.citations && sug.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sug.citations.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60"
                      >
                        {c.filePath}:{c.startLine}-{c.endLine}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-white/50 font-mono">
              No refactor suggestions generated for this scope.
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-6 py-3 bg-[#141418] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-cohere-outline !py-1 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AskContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sourceId = searchParams.get("sourceId");
  const initialQuery = searchParams.get("q");

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(!sourceId);

  const [question, setQuestion] = useState(initialQuery || "");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeResponse, setActiveResponse] = useState<AskResponse | null>(null);

  const [refactorOpen, setRefactorOpen] = useState(false);
  const [refactorResponse, setRefactorResponse] = useState<RefactorResponse | null>(null);
  const [refactorLoading, setRefactorLoading] = useState(false);
  const [refactorError, setRefactorError] = useState<string | null>(null);

  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  const [limitState, setLimitState] = useState<LimitState | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  // Load user sources
  useEffect(() => {
    async function loadSources() {
      try {
        const res = await fetch("/api/sources");
        if (res.ok) {
          const data = await res.json();
          if (data.sources) setSources(data.sources);
        }
      } catch (err) {
        console.error("Failed to load sources in ask:", err);
      } finally {
        setSourcesLoading(false);
      }
    }
    loadSources();
  }, []);

  const currentSource = sources.find((s) => s.id === sourceId);

  const suggestedQuestions = [
    "What is the high-level architecture of this codebase?",
    "How is authentication and session management implemented?",
    "Where are the core database models and tables defined?",
    "What external APIs or webhooks does this service interact with?",
  ];

  const executeAsk = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || !sourceId) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setFeedbackRating(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, sourceId }),
      });

      const data = await res.json();

      if (res.status === 402 && data.code === "LIMIT_EXCEEDED") {
        setLimitState({
          planRequired: data.plan_required || "pro",
          message: data.message || "Monthly question limit reached on your plan.",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate answer.");
      }

      const askResp = data as AskResponse;
      setActiveResponse(askResp);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: askResp.answer,
        response: askResp,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Could not generate answer."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAsk(question);
  };

  const handleRefactorRequest = async () => {
    if (!activeResponse || !sourceId) return;
    const lastUserQuery = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    if (!lastUserQuery) return;

    setRefactorOpen(true);
    setRefactorLoading(true);
    setRefactorError(null);

    try {
      const res = await fetch("/api/refactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: lastUserQuery, sourceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate refactor suggestions.");
      setRefactorResponse(data);
    } catch (err: any) {
      setRefactorError(err.message || "Refactoring service error.");
    } finally {
      setRefactorLoading(false);
    }
  };

  const handleFeedback = async (rating: "up" | "down") => {
    if (!activeResponse?.sessionId || feedbackLoading) return;
    setFeedbackLoading(true);
    const lastUserQuery = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeResponse.sessionId,
          query_text: lastUserQuery,
          answer_text: activeResponse.answer,
          rating,
        }),
      });
      setFeedbackRating(rating);
    } catch (err) {
      console.error("Failed to send feedback:", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleCopyAnswer = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  // If no sourceId is provided, render repository selector
  if (!sourceId) {
    return (
      <div className="min-h-screen bg-[#0e0e11] text-white">
        <CohereNavbar />
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="mb-8 border-b border-white/[0.08] pb-6">
            <span className="cohere-mono-label">QUERY ENGINE CONSOLE</span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
              Ask Repository
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Select an indexed repository below to launch an interactive code intelligence interrogation session.
            </p>
          </div>

          {sourcesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              <p className="font-mono text-xs text-white/50">Fetching repositories...</p>
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#17171c] p-12 text-center">
              <Database className="mx-auto mb-3 h-8 w-8 text-white/30" />
              <h2 className="text-base font-semibold text-white">No Indexed Codebases</h2>
              <p className="mt-1 text-xs text-white/60 max-w-md mx-auto">
                Index a GitHub repository or upload a ZIP archive from the Dashboard to start querying with line citations.
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
                  onClick={() => router.push(`/ask?sourceId=${s.id}`)}
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
                    Ready for semantic interrogation
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs font-medium text-white/70 group-hover:text-white">
                    <span>Start Session</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
        {/* Header Bar */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="cohere-mono-label">ACTIVE INTERROGATION REPO</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-emerald-400 uppercase tracking-wider">
                Groq Llama 3.3 Active
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
              {currentSource?.name || "Repository"}
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Query natural-language codebase semantics with verifiable line citations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/history?sourceId=${encodeURIComponent(sourceId)}`}
              className="btn-cohere-outline !py-1.5 text-xs"
            >
              <History className="h-3.5 w-3.5" />
              <span>Query History</span>
            </Link>
            <Link
              href="/dashboard"
              className="btn-cohere-outline !py-1.5 text-xs"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Conversation Message List */}
        <div className="space-y-6 min-h-[350px]">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#17171c] p-8 text-center sm:p-12">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80">
                <Code2 className="h-6 w-6 text-[#ff7759]" />
              </div>
              <h2 className="text-base font-bold text-white font-mono">
                Ask anything about {currentSource?.name || "this codebase"}
              </h2>
              <p className="mt-1.5 text-xs text-white/60 max-w-md mx-auto leading-relaxed">
                All answers are synthesized strictly from indexed file chunks with pinpoint line-range citations.
              </p>

              {/* Suggested Questions Chips */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {suggestedQuestions.map((sq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeAsk(sq)}
                    className="btn-cohere-outline !py-1.5 !px-3 text-xs text-left"
                  >
                    <span>{sq}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl border p-5 transition-all ${
                  msg.role === "user"
                    ? "border-white/15 bg-[#141418]"
                    : "border-white/10 bg-[#17171c]"
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`cohere-mono-label text-[10px] ${
                        msg.role === "user" ? "text-white/60" : "text-[#ff7759]"
                      }`}
                    >
                      {msg.role === "user" ? "QUERY" : "VERIFIED RESPONSE"}
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-white/40 text-[11px]">{msg.timestamp}</span>
                  </div>

                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleCopyAnswer(msg.content)}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-white/60 hover:text-white transition-colors"
                      >
                        {copiedAnswer ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {/* Feedback buttons */}
                      <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                        <button
                          type="button"
                          onClick={() => handleFeedback("up")}
                          disabled={feedbackLoading}
                          className={`p-1 rounded hover:bg-white/10 ${
                            feedbackRating === "up" ? "text-emerald-400" : "text-white/50"
                          }`}
                          title="Accurate and helpful"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback("down")}
                          disabled={feedbackLoading}
                          className={`p-1 rounded hover:bg-white/10 ${
                            feedbackRating === "down" ? "text-red-400" : "text-white/50"
                          }`}
                          title="Inaccurate or incomplete"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="mt-3">
                  {msg.role === "user" ? (
                    <p className="text-sm font-semibold text-white leading-relaxed font-mono">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="prose prose-invert max-w-none text-xs leading-relaxed text-white/90">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: CodeBlock as any,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Evidence & Action Bar for Assistant */}
                {msg.role === "assistant" && msg.response && (
                  <div className="mt-5 border-t border-white/[0.06] pt-4 space-y-3">
                    {/* Citations Chips */}
                    {msg.response.citations && msg.response.citations.length > 0 && (
                      <div>
                        <span className="cohere-mono-label text-[10px]">PINPOINT CITATIONS:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.response.citations.map((c, idx) => (
                            <Link
                              key={idx}
                              href={`/source?sourceId=${encodeURIComponent(sourceId)}&path=${encodeURIComponent(
                                c.filePath,
                              )}#L${c.startLine}-L${c.endLine}`}
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

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleRefactorRequest}
                        className="btn-cohere-outline !py-1 text-xs"
                      >
                        <Wand2 className="h-3.5 w-3.5 text-[#ff7759]" />
                        <span>Suggest Refactor Diffs</span>
                      </button>

                      {msg.response.confidence !== undefined && (
                        <div className="flex items-center gap-2 font-mono text-[11px] text-white/40">
                          <span>Confidence:</span>
                          <span
                            className={`rounded-full px-2 py-0.2 uppercase text-[10px] font-semibold ${
                              msg.response.confidence >= 0.7
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {msg.response.confidence >= 0.7 ? "High" : "Moderate"}{" "}
                            ({Math.round(msg.response.confidence <= 1 ? msg.response.confidence * 100 : msg.response.confidence)}%)
                          </span>
                          {msg.response.latencyMs && (
                            <span className="text-white/30">({msg.response.latencyMs}ms)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="rounded-xl border border-white/10 bg-[#17171c] p-6 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-white/70" />
              <p className="mt-2 text-xs font-mono text-white/60">
                Retrieving semantic embeddings and synthesizing answer...
              </p>
            </div>
          )}
        </div>

        {/* Input Bar (Sticky at Bottom) */}
        <div className="sticky bottom-6 mt-8">
          <form
            onSubmit={handleAskSubmit}
            className="rounded-2xl border border-white/15 bg-[#17171c]/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this codebase (e.g. How does error handling work?)..."
                disabled={loading}
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-white/40 outline-none"
              />

              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="btn-cohere-primary shrink-0 !py-2 !px-5 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Submit</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Upgrade Modal */}
      {limitState && <UpgradeModal state={limitState} onClose={() => setLimitState(null)} />}

      {/* Refactor Suggestions Modal */}
      {refactorOpen && (
        <RefactorModal
          refactorResponse={refactorResponse}
          loading={refactorLoading}
          error={refactorError}
          onClose={() => setRefactorOpen(false)}
        />
      )}
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0e0e11] text-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      }
    >
      <AskContent />
    </Suspense>
  );
}

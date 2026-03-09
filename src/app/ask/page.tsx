"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronDown, Code2, ExternalLink, Github, History, Loader2, LogOut, Search, Upload, Wand2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { AskResponse, Citation, RefactorResponse } from "@/types";

type EvidenceTag = {
  id: string;
  label: string;
  count: number;
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function matchesEvidence(citation: Citation, query: string): boolean {
  if (!query) return true;
  return (
    citation.filePath.toLowerCase().includes(query) ||
    citation.snippet.toLowerCase().includes(query)
  );
}

function getFileExtension(filePath: string): string {
  const fileName = filePath.toLowerCase().split("/").pop() || "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === fileName.length - 1) return "no-ext";
  return fileName.slice(dotIndex + 1);
}

function getTopLevelDir(filePath: string): string {
  const normalized = filePath
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .toLowerCase();
  const firstSegment = normalized.split("/")[0]?.trim();
  if (!firstSegment || firstSegment === ".") return "root";
  return firstSegment;
}

function deriveEvidenceTags(response: AskResponse, askedQuestion: string): EvidenceTag[] {
  const items = response.retrievedSnippets.length > 0 ? response.retrievedSnippets : response.citations;
  if (items.length === 0) return [];

  const tagMap = new Map<string, EvidenceTag>();
  const addTag = (id: string, label: string, count = 1) => {
    const existing = tagMap.get(id);
    if (existing) {
      existing.count += count;
      return;
    }
    tagMap.set(id, { id, label, count });
  };

  for (const item of items) {
    const ext = getFileExtension(item.filePath);
    const dir = getTopLevelDir(item.filePath);
    addTag(`ext:${ext}`, `.${ext}`);
    addTag(`dir:${dir}`, dir);
  }

  const question = askedQuestion.toLowerCase();
  const topicRules: Array<{ topic: string; terms: string[] }> = [
    { topic: "auth", terms: ["auth", "login", "session", "token"] },
    { topic: "retry", terms: ["retry", "retries", "backoff"] },
    { topic: "db", terms: ["db", "database", "sql", "prisma", "supabase"] },
    { topic: "api", terms: ["api", "endpoint", "route", "request"] },
  ];

  for (const rule of topicRules) {
    if (rule.terms.some((term) => question.includes(term))) {
      addTag(`topic:${rule.topic}`, rule.topic, 2);
    }
  }

  return Array.from(tagMap.values())
    .sort((a, b) => (b.count === a.count ? a.label.localeCompare(b.label) : b.count - a.count))
    .slice(0, 10);
}

function matchesTagFilter(citation: Citation, activeTagId: string): boolean {
  if (!activeTagId) return true;

  const [kind, value] = activeTagId.split(":", 2);
  if (!kind || !value) return true;

  if (kind === "ext") return getFileExtension(citation.filePath) === value;
  if (kind === "dir") return getTopLevelDir(citation.filePath) === value;
  if (kind === "topic") {
    const haystack = `${citation.filePath}\n${citation.snippet}`.toLowerCase();
    return haystack.includes(value);
  }

  return true;
}

const markdownComponents: Components = {
  h1: ({ ...props }) => <h1 className="mb-4 mt-1 text-2xl font-semibold text-white" {...props} />,
  h2: ({ ...props }) => <h2 className="mb-3 mt-6 text-xl font-semibold text-white/90" {...props} />,
  h3: ({ ...props }) => <h3 className="mb-3 mt-5 text-lg font-semibold text-white/90" {...props} />,
  p: ({ ...props }) => <p className="mb-4 leading-7 text-white/75" {...props} />,
  ul: ({ ...props }) => <ul className="mb-4 list-disc space-y-2 pl-6 text-white/75" {...props} />,
  ol: ({ ...props }) => <ol className="mb-4 list-decimal space-y-2 pl-6 text-white/75" {...props} />,
  li: ({ ...props }) => <li className="leading-7" {...props} />,
  a: ({ ...props }) => (
    <a className="text-[#F04D26] underline underline-offset-2 transition-colors hover:text-[#ff6e4a]" {...props} />
  ),
  pre: ({ ...props }) => <pre className="mb-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0e0e0e] p-4" {...props} />,
  code: ({ className, children, ...props }) => {
    const isBlockCode = typeof className === "string" && className.length > 0;
    if (isBlockCode) {
      return (
        <code className={`${className} text-sm text-white/85`} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className="rounded bg-[#1a1a1a] px-1.5 py-1 text-[0.9em] text-[#F04D26]" {...props}>
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
      className="group block min-w-0 overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1a1a] p-4 transition-colors hover:border-[#F04D26]/40"
    >
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <span
          className="min-w-0 break-all font-mono text-xs font-semibold text-white/85"
          title={citation.filePath}
        >
          {citation.filePath}
        </span>
        <span className="shrink-0 rounded bg-[#0e0e0e] px-2 py-1 text-[11px] font-medium text-white/60">
          L{citation.startLine}–L{citation.endLine}
        </span>
      </div>
      <p className="max-h-20 overflow-hidden break-words text-xs leading-5 text-[#7d7d87]">{citation.snippet}</p>
      {citation.sourceUrl ? (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#F04D26] group-hover:text-[#ff6e4a]">
          View source <ExternalLink className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </Wrapper>
  );
}

function IngestDashboard() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleZipUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipFile) return;
    setLoading(true); setError(null);
    const formData = new FormData();
    formData.append("file", zipFile);
    try {
      const res = await fetch("/api/ingest/zip", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload ZIP");
      router.push(`/ask?sourceId=${data.sourceId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally { setLoading(false); }
  };

  const handleGithubIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ingest/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ingest GitHub repo");
      router.push(`/ask?sourceId=${data.sourceId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#151515]">
      <div className="mx-auto w-full max-w-[860px] px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-8 text-center sm:mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F04D26]/40 bg-[#F04D26]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#F04D26]">
            Index a Codebase
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Start by importing your repository
          </h1>
          <p className="mt-3 text-sm text-[#7d7d87] sm:text-base">
            Upload a ZIP archive or paste a public GitHub URL to get started.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* ZIP upload */}
          <div className="rounded-[28px] bg-[#1a1a1a] p-[5px]">
            <div className="rounded-[25px] border border-white/[0.07] p-[2px]">
              <div className="rounded-[22px] border border-white/[0.04] bg-[#111111] p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl border border-[#F04D26]/30 bg-[#F04D26]/10 p-2.5">
                    <Upload className="h-5 w-5 text-[#F04D26]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Upload ZIP</h3>
                    <p className="text-xs text-[#7d7d87]">Max 25 MB</p>
                  </div>
                </div>
                <form onSubmit={handleZipUpload} className="space-y-4">
                  <label htmlFor="zip-input" className="block text-sm font-medium text-white/70">ZIP archive</label>
                  <input
                    id="zip-input" type="file" accept=".zip"
                    onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                    className="block w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-3 text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-[#F04D26] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#de4723] focus:border-[#F04D26]/50 focus:outline-none"
                  />
                  <button
                    type="submit" disabled={loading || !zipFile}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F04D26] text-sm font-semibold text-white transition-colors hover:bg-[#de4723] disabled:cursor-not-allowed disabled:bg-[#F04D26]/25 disabled:text-white/40"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Ingest ZIP
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* GitHub ingest */}
          <div className="rounded-[28px] bg-[#1a1a1a] p-[5px]">
            <div className="rounded-[25px] border border-white/[0.07] p-[2px]">
              <div className="rounded-[22px] border border-white/[0.04] bg-[#111111] p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-2.5">
                    <Github className="h-5 w-5 text-white/80" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">GitHub Repo</h3>
                    <p className="text-xs text-[#7d7d87]">Public repos · Max 1 000 files</p>
                  </div>
                </div>
                <form onSubmit={handleGithubIngest} className="space-y-4">
                  <label htmlFor="github-url" className="block text-sm font-medium text-white/70">Repository URL</label>
                  <input
                    id="github-url" type="url"
                    placeholder="https://github.com/owner/repo"
                    value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-4 text-sm text-white/90 placeholder:text-white/30 focus:border-[#F04D26]/50 focus:outline-none focus:ring-2 focus:ring-[#F04D26]/15"
                  />
                  <button
                    type="submit" disabled={loading || !githubUrl.trim()}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/30"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                    Ingest Repo
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-900/15 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function AskContent() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId");
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [refactorResponse, setRefactorResponse] = useState<RefactorResponse | null>(null);
  const [refactorLoading, setRefactorLoading] = useState(false);
  const [refactorError, setRefactorError] = useState<string | null>(null);
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [activeTagId, setActiveTagId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setQuestion("");
    setAskedQuestion("");
    setResponse(null);
    setRefactorResponse(null);
    setRefactorError(null);
    setError(null);
    setEvidenceSearch("");
    setActiveTagId("");
  }, [sourceId]);

  const normalizedEvidenceSearch = normalizeSearchValue(evidenceSearch);
  const evidenceTags = useMemo(() => {
    if (!response) return [];
    return deriveEvidenceTags(response, askedQuestion);
  }, [response, askedQuestion]);

  const filteredCitations = useMemo(() => {
    if (!response) return [];
    return response.citations.filter(
      (citation) =>
        matchesEvidence(citation, normalizedEvidenceSearch) &&
        matchesTagFilter(citation, activeTagId),
    );
  }, [response, normalizedEvidenceSearch, activeTagId]);

  const filteredSnippets = useMemo(() => {
    if (!response) return [];
    return response.retrievedSnippets.filter(
      (snippet) =>
        matchesEvidence(snippet, normalizedEvidenceSearch) &&
        matchesTagFilter(snippet, activeTagId),
    );
  }, [response, normalizedEvidenceSearch, activeTagId]);

  if (!sourceId) {
    return <IngestDashboard />;
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
      setAskedQuestion(normalizedQuestion);
      setEvidenceSearch("");
      setActiveTagId("");
      setRefactorResponse(null);
      setRefactorError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRefactors = async () => {
    if (!sourceId || !askedQuestion) return;

    setRefactorLoading(true);
    setRefactorError(null);

    try {
      const res = await fetch("/api/refactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, question: askedQuestion }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate refactor suggestions");
      setRefactorResponse(data);
    } catch (err: any) {
      setRefactorError(err.message);
    } finally {
      setRefactorLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#151515]">
    <div className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
      <main className="min-w-0 space-y-6">
        <header className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/ask")}
              aria-label="Ingest new repository"
              title="Ingest new repository"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#111111] text-white/70 transition-colors hover:border-[#F04D26]/50 hover:text-white sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-2xl lg:text-3xl">Ask Repo Lens</h1>
              <p className="mt-0.5 text-xs text-slate-400 sm:mt-1 sm:text-sm">Ask natural-language questions and verify every answer with source evidence.</p>
            </div>
            <button
              onClick={() => router.push(`/history?sourceId=${sourceId}`)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-[#111111] px-3 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white sm:h-10 sm:px-4"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 text-sm font-medium text-red-300 transition-colors hover:border-red-500/45 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-4"
            >
              {logoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <form onSubmit={handleAsk} className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 shadow-[0_20px_60px_-32px_rgba(240,77,38,0.25)]">
          <label htmlFor="repo-question" className="block text-sm font-medium text-white/70">
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
                className="h-14 w-full rounded-xl border border-white/10 bg-[#0e0e0e] pl-12 pr-4 text-base text-white/90 placeholder:text-white/30 focus:border-[#F04D26]/50 focus:outline-none focus:ring-2 focus:ring-[#F04D26]/15"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex h-14 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-[#F04D26] px-6 text-base font-semibold text-white transition-colors hover:bg-[#de4723] disabled:cursor-not-allowed disabled:bg-[#F04D26]/25 disabled:text-white/40"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ask"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[#7d7d87]">Answers are grounded only in retrieved snippets and include file/line citations.</p>
        </form>

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        {response ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-6">
              <h2 className="mb-4 border-b border-white/[0.07] pb-3 text-xl font-semibold text-white">Answer</h2>
              {response.note_when_insufficient_evidence && !response.answer.trim() ? (
                /* Insufficient evidence — render evidence as linked cards */
                <div>
                  <div className="mb-4 rounded-lg border border-[#F04D26]/30 bg-[#F04D26]/8 px-3 py-2.5 text-sm text-[#ff6e4a]">
                    {response.note_when_insufficient_evidence}
                  </div>
                  {response.retrievedSnippets.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#7d7d87]">Retrieved evidence</p>
                      <div className="grid gap-3">
                        {response.retrievedSnippets.map((s, i) => (
                          <CitationCard key={`ev-${s.filePath}-${s.startLine}-${i}`} citation={s} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="min-w-0 overflow-x-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {response.answer}
                    </ReactMarkdown>
                  </div>
                  {response.note_when_insufficient_evidence ? (
                    <div className="mt-4 rounded-lg border border-[#F04D26]/30 bg-[#F04D26]/8 px-3 py-2 text-sm text-[#ff6e4a]">
                      {response.note_when_insufficient_evidence}
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <ExternalLink className="h-5 w-5 text-[#F04D26]" />
                Citations
              </h3>
              {filteredCitations.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredCitations.map((citation, index) => (
                    <CitationCard key={`${citation.filePath}-${citation.startLine}-${index}`} citation={citation} />
                  ))}
                </div>
              ) : response.citations.length > 0 ? (
                <p className="text-sm text-slate-400">No citations match the current search.</p>
              ) : (
                <p className="text-sm text-slate-400">No direct citations available for this answer.</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Wand2 className="h-5 w-5 text-[#F04D26]" />
                  Refactor Suggestions
                </h3>
                <button
                  type="button"
                  onClick={handleGenerateRefactors}
                  disabled={refactorLoading || response.retrievedSnippets.length === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#F04D26]/40 bg-[#F04D26]/8 px-3 text-sm font-medium text-[#F04D26] transition-colors hover:bg-[#F04D26]/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-[#1a1a1a] disabled:text-white/30"
                >
                  {refactorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Generate Suggestions
                </button>
              </div>

              {refactorError ? (
                <p className="mb-4 rounded-lg border border-red-500/40 bg-red-900/20 p-3 text-sm text-red-200">
                  {refactorError}
                </p>
              ) : null}

              {refactorResponse?.suggestions?.length ? (
                <div className="space-y-4">
                  {refactorResponse.suggestions.map((suggestion, index) => (
                    <article key={`${suggestion.title}-${index}`} className="rounded-xl border border-white/[0.07] bg-[#111111] p-4">
                      <h4 className="text-base font-semibold text-white">{suggestion.title}</h4>
                      <p className="mt-2 text-sm text-white/75">{suggestion.rationale}</p>
                      <p className="mt-2 text-sm text-[#7d7d87]">
                        <span className="font-semibold text-white/70">Impact:</span> {suggestion.expectedImpact}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {suggestion.citations.map((citation, citationIndex) =>
                          citation.sourceUrl ? (
                            <a
                              key={`${citation.filePath}-${citation.startLine}-${citationIndex}`}
                              href={citation.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-[220px] items-center gap-1 rounded-md border border-white/10 bg-[#0e0e0e] px-2 py-1 text-xs text-[#F04D26] hover:border-[#F04D26]/50"
                              title={`${citation.filePath} L${citation.startLine}-L${citation.endLine}`}
                            >
                              <span className="truncate">{citation.filePath}</span>
                              <span className="shrink-0"> L{citation.startLine}-L{citation.endLine}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span
                              key={`${citation.filePath}-${citation.startLine}-${citationIndex}`}
                              className="inline-flex max-w-[220px] items-center rounded-md border border-white/10 bg-[#0e0e0e] px-2 py-1 text-xs text-white/60"
                              title={`${citation.filePath} L${citation.startLine}-L${citation.endLine}`}
                            >
                              <span className="truncate">{citation.filePath}</span>
                              <span className="shrink-0"> L{citation.startLine}-L{citation.endLine}</span>
                            </span>
                          ),
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : refactorResponse?.note_when_insufficient_evidence ? (
                <p className="text-sm text-slate-400">{refactorResponse.note_when_insufficient_evidence}</p>
              ) : (
                <p className="text-sm text-slate-400">
                  Generate grounded refactor ideas based on the currently retrieved evidence.
                </p>
              )}
            </section>
          </div>
        ) : (
          <section className="rounded-2xl border border-dashed border-white/10 bg-[#1a1a1a]/40 p-8 text-center text-[#7d7d87]">
            Ask a question to see a grounded answer, citations, and retrieved snippets.
          </section>
        )}
      </main>

      <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        {/* Mobile/tablet collapsible toggle */}
        <button
          type="button"
          onClick={() => setEvidenceExpanded((v) => !v)}
          className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4 lg:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <Code2 className="h-4 w-4 text-[#F04D26]" />
            Retrieved Evidence
            {response ? (
              <span className="rounded-full bg-[#F04D26]/20 px-1.5 py-0.5 text-xs font-medium text-[#F04D26]">
                {filteredSnippets.length}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-white/50 transition-transform duration-200 ${evidenceExpanded ? "rotate-180" : ""}`}
          />
        </button>
        <div className={`${evidenceExpanded ? "block" : "hidden"} lg:block`}>
        <section className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Code2 className="h-5 w-5 text-[#F04D26]" />
            Retrieved Evidence
          </h3>
          {response ? (
            <div className="mb-4">
              <label htmlFor="evidence-search" className="block text-xs font-semibold uppercase tracking-wide text-[#7d7d87]">
                Search Evidence
              </label>
              <input
                id="evidence-search"
                type="text"
                placeholder="Filter by file or snippet text"
                value={evidenceSearch}
                onChange={(e) => setEvidenceSearch(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#0e0e0e] px-3 text-sm text-white/90 placeholder:text-white/30 focus:border-[#F04D26]/50 focus:outline-none focus:ring-2 focus:ring-[#F04D26]/15"
              />
              {evidenceTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {evidenceTags.map((tag) => {
                    const isActive = tag.id === activeTagId;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setActiveTagId(isActive ? "" : tag.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? "border-[#F04D26]/60 bg-[#F04D26]/15 text-[#F04D26]"
                            : "border-white/10 bg-[#111111] text-white/60 hover:border-white/20"
                        }`}
                      >
                        {tag.label}
                        <span className="rounded-full bg-[#1a1a1a] px-1.5 py-0.5 text-[10px]">
                          {tag.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-[#7d7d87]">
                Showing {filteredSnippets.length} of {response.retrievedSnippets.length} snippets.
              </p>
            </div>
          ) : null}
          {filteredSnippets.length ? (
            <div className="space-y-4">
              {filteredSnippets.map((snippet, index) => (
                <article key={`${snippet.filePath}-${snippet.startLine}-${index}`} className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111111]">
                  <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0e0e0e] px-3 py-2">
                    <span className="truncate font-mono text-xs font-semibold text-white/85">{snippet.filePath}</span>
                    <span className="shrink-0 rounded bg-[#1a1a1a] px-2 py-1 text-[11px] text-white/55">
                      L{snippet.startLine}-L{snippet.endLine}
                    </span>
                  </header>
                  <pre className="max-h-64 overflow-auto p-3 text-xs leading-5 text-white/75">
                    <code>{snippet.snippet}</code>
                  </pre>
                  {snippet.sourceUrl ? (
                    <a
                      href={snippet.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border-t border-white/[0.06] px-3 py-2 text-xs font-medium text-[#F04D26] transition-colors hover:text-[#ff6e4a]"
                    >
                      Open source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : response ? (
            <p className="rounded-lg border border-dashed border-white/10 bg-[#111111] p-4 text-sm text-[#7d7d87]">
              No snippets match the current search.
            </p>
          ) : (
            <p className="rounded-lg border border-dashed border-white/10 bg-[#111111] p-4 text-sm text-[#7d7d87]">
              Retrieved snippets will appear here after you submit a question.
            </p>
          )}
        </section>
        </div>
      </aside>
    </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#151515]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F04D26]" />
        </div>
      }
    >
      <AskContent />
    </Suspense>
  );
}

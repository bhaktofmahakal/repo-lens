"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  FileCode,
  Github,
  History,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Unlock,
  Upload,
  X,
  Zap,
} from "lucide-react";
import type { EnrichedGithubRepo } from "@/app/api/github/repos/route";

export type SourceItem = {
  id: string;
  name: string;
  type: string;
  github_url: string | null;
  created_at: string;
  chunk_count?: number;
};

export type InstallationItem = {
  installation_id: number;
  user_id?: string | null;
  account_login: string;
  account_type: string;
  updated_at: string;
};

type KpiStats = {
  totalSources: number;
  totalChunks: number;
  totalQuestions: number;
  userPlan: "free" | "pro" | "team";
  planLimit: number;
  usedRepos: number;
};

type DashboardClientProps = {
  initialSources: SourceItem[];
  initialInstallations: InstallationItem[];
  kpiStats: KpiStats;
  githubAutoSyncEnabled: boolean;
  githubAppConfigured: boolean;
  githubAppSlug: string;
  notificationMessage: { type: "success" | "error"; text: string } | null;
};

type TabFilter = "all" | "unindexed" | "indexed" | "private" | "public";

export function DashboardClient({
  initialSources,
  initialInstallations,
  kpiStats: initialKpi,
  githubAutoSyncEnabled,
  githubAppConfigured,
  githubAppSlug,
  notificationMessage,
}: DashboardClientProps) {
  const router = useRouter();

  // State
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [installations, setInstallations] = useState<InstallationItem[]>(initialInstallations);
  const [kpi, setKpi] = useState<KpiStats>(initialKpi);

  const [repos, setRepos] = useState<EnrichedGithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [reposError, setReposError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const [indexingUrl, setIndexingUrl] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<string | null>(null);

  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Quick Ask bar state
  const [quickAskQuestion, setQuickAskQuestion] = useState("");
  const [quickAskSourceId, setQuickAskSourceId] = useState<string>(
    initialSources.length > 0 ? initialSources[0].id : "",
  );

  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
    sourceId?: string;
  } | null>(notificationMessage ? { type: notificationMessage.type, text: notificationMessage.text } : null);

  const [upgradeModal, setUpgradeModal] = useState<{
    planRequired: "pro" | "team";
    message: string;
  } | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [manualGithubUrl, setManualGithubUrl] = useState("");
  const [manualZipFile, setManualZipFile] = useState<File | null>(null);
  const [importTab, setImportTab] = useState<"github" | "zip">("github");
  const [uploadingZip, setUploadingZip] = useState(false);

  // Update default selected quick ask source if sources change
  useEffect(() => {
    if (sources.length > 0 && !quickAskSourceId) {
      setQuickAskSourceId(sources[0].id);
    }
  }, [sources, quickAskSourceId]);

  // Load repositories from GitHub API
  const loadGithubRepos = async () => {
    setLoadingRepos(true);
    setReposError(null);

    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load GitHub repositories.");
      }

      if (data.repositories) {
        setRepos(data.repositories);
      }
      if (data.installations && data.installations.length > 0) {
        setInstallations(data.installations);
      }
    } catch (err) {
      setReposError(err instanceof Error ? err.message : "Failed to load GitHub repositories.");
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    void loadGithubRepos();
  }, []);

  // 1-Click Repo Ingestion
  const handleIndexRepo = async (repoUrl: string, repoName: string) => {
    setIndexingUrl(repoUrl);
    setIndexingStatus(`Indexing ${repoName}...`);
    setFeedback(null);

    try {
      const res = await fetch("/api/ingest/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });

      const data = await res.json();

      if (res.status === 402 && data.error === "LIMIT_EXCEEDED") {
        setUpgradeModal({
          planRequired: data.plan_required || "pro",
          message: data.message || "You have reached your plan's repository limits.",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to ingest GitHub repository.");
      }

      // Successfully indexed! Update state
      const newSourceId = data.sourceId;
      setRepos((prev) =>
        prev.map((r) =>
          r.html_url.toLowerCase() === repoUrl.toLowerCase()
            ? { ...r, is_indexed: true, source_id: newSourceId }
            : r,
        ),
      );

      const newSource: SourceItem = {
        id: newSourceId,
        name: repoName,
        type: "github",
        github_url: repoUrl,
        created_at: new Date().toISOString(),
      };

      setSources((prev) => [newSource, ...prev]);
      setKpi((prev) => ({
        ...prev,
        totalSources: prev.totalSources + 1,
        usedRepos: prev.usedRepos + 1,
      }));

      setFeedback({
        type: "success",
        text: `Successfully indexed "${repoName}". You can now start querying this codebase.`,
        sourceId: newSourceId,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to index repository.",
      });
    } finally {
      setIndexingUrl(null);
      setIndexingStatus(null);
    }
  };

  // Delete Source Handler
  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    setDeletingSourceId(sourceId);
    try {
      const res = await fetch(`/api/sources/${sourceId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete source");
      }

      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      setRepos((prev) =>
        prev.map((r) =>
          r.source_id === sourceId ? { ...r, is_indexed: false, source_id: null } : r,
        ),
      );
      setKpi((prev) => ({
        ...prev,
        totalSources: Math.max(0, prev.totalSources - 1),
        usedRepos: Math.max(0, prev.usedRepos - 1),
      }));

      setFeedback({
        type: "info",
        text: `Removed indexed source "${sourceName}".`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete source.",
      });
    } finally {
      setDeletingSourceId(null);
      setConfirmDeleteId(null);
    }
  };

  // Manual URL Ingest Handler
  const handleManualIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualGithubUrl.trim()) return;

    const url = manualGithubUrl.trim();
    const repoName = url.split("/").filter(Boolean).slice(-1)[0] || url;
    setIsImportModalOpen(false);
    setManualGithubUrl("");
    await handleIndexRepo(url, repoName);
  };

  // ZIP Upload Handler
  const handleZipIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualZipFile) return;

    setUploadingZip(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", manualZipFile);

      const res = await fetch("/api/ingest/zip", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.status === 402 && data.error === "LIMIT_EXCEEDED") {
        setIsImportModalOpen(false);
        setUpgradeModal({
          planRequired: data.plan_required || "pro",
          message: data.message || "You have reached your plan's repository limits.",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload and index ZIP file.");
      }

      const newSourceId = data.sourceId;
      const newSource: SourceItem = {
        id: newSourceId,
        name: manualZipFile.name.replace(/\.zip$/i, ""),
        type: "zip",
        github_url: null,
        created_at: new Date().toISOString(),
      };

      setSources((prev) => [newSource, ...prev]);
      setKpi((prev) => ({
        ...prev,
        totalSources: prev.totalSources + 1,
        usedRepos: prev.usedRepos + 1,
      }));

      setIsImportModalOpen(false);
      setManualZipFile(null);

      setFeedback({
        type: "success",
        text: `Indexed archive "${newSource.name}" with ${data.chunkCount || 0} chunks!`,
        sourceId: newSourceId,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to process ZIP file.",
      });
    } finally {
      setUploadingZip(false);
    }
  };

  // Quick Ask submission
  const handleQuickAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAskQuestion.trim()) return;
    if (quickAskSourceId) {
      router.push(
        `/ask?sourceId=${encodeURIComponent(quickAskSourceId)}&q=${encodeURIComponent(
          quickAskQuestion.trim(),
        )}`,
      );
    } else {
      router.push(`/ask?q=${encodeURIComponent(quickAskQuestion.trim())}`);
    }
  };

  // Filtered Repos
  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTab === "indexed") return repo.is_indexed;
      if (activeTab === "unindexed") return !repo.is_indexed;
      if (activeTab === "private") return repo.private;
      if (activeTab === "public") return !repo.private;
      return true;
    });
  }, [repos, searchQuery, activeTab]);

  const hasLinkedInstallation = installations.length > 0;
  const primaryInstallation = installations[0];

  return (
    <div className="space-y-8">
      {/* Editorial Header in Cohere Style */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="cohere-mono-label">WORKSPACE CONTROL CENTER</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
            Codebase Intelligence Hub
          </h1>
          <p className="mt-1 text-xs text-white/60">
            Enterprise repository index, semantic vectors, and citation-backed verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="btn-cohere-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Index New Codebase</span>
          </button>
        </div>
      </div>

      {/* Quick Ask Search / Jump Bar */}
      {sources.length > 0 && (
        <form
          onSubmit={handleQuickAskSubmit}
          className="rounded-xl border border-white/10 bg-[#17171c] p-3 sm:p-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={quickAskQuestion}
                onChange={(e) => setQuickAskQuestion(e.target.value)}
                placeholder="Ask any question about your codebase (e.g., How is auth implemented?)"
                className="w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={quickAskSourceId}
                onChange={(e) => setQuickAskSourceId(e.target.value)}
                className="rounded-full border border-white/10 bg-[#141418] px-3.5 py-2.5 text-xs text-white font-mono focus:border-white/30 focus:outline-none max-w-[180px] truncate"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#17171c] text-white">
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!quickAskQuestion.trim()}
                className="btn-cohere-primary shrink-0 !py-2.5"
              >
                <span>Ask</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start justify-between rounded-xl border p-4 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : feedback.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : feedback.type === "error" ? (
              <X className="h-4 w-4 shrink-0 text-red-400" />
            ) : (
              <Zap className="h-4 w-4 shrink-0 text-blue-400" />
            )}
            <div>
              <p className="font-medium">{feedback.text}</p>
              {feedback.sourceId && (
                <div className="mt-1.5 flex items-center gap-3">
                  <Link
                    href={`/ask?sourceId=${feedback.sourceId}`}
                    className="inline-flex items-center gap-1 font-mono text-[11px] underline underline-offset-2 hover:opacity-80"
                  >
                    <span>Launch Ask Session</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 text-white/50 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Metrics in Cohere Enterprise Style */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Repositories Indexed */}
        <div className="rounded-xl border border-white/10 bg-[#17171c] p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="cohere-mono-label text-[10px]">REPOSITORIES</span>
            <div className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70">
              <Github className="h-3.5 w-3.5 text-[#ff7759]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">{kpi.totalSources}</span>
            <span className="text-xs text-white/40 font-mono">
              / {Number.isFinite(kpi.planLimit) ? kpi.planLimit : "∞"} max
            </span>
          </div>
          {Number.isFinite(kpi.planLimit) && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[#ff7759] transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((kpi.totalSources / kpi.planLimit) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Card 2: Knowledge Base Chunks */}
        <div className="rounded-xl border border-white/10 bg-[#17171c] p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="cohere-mono-label text-[10px]">CODE CHUNKS</span>
            <div className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {kpi.totalChunks.toLocaleString()}
            </span>
            <span className="text-xs text-white/40 font-mono">vectors</span>
          </div>
          <p className="mt-2 text-[11px] text-white/40 font-mono">768-dim semantic embeddings</p>
        </div>

        {/* Card 3: Questions Answered */}
        <div className="rounded-xl border border-white/10 bg-[#17171c] p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="cohere-mono-label text-[10px]">QUERIES ANALYZED</span>
            <div className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {kpi.totalQuestions.toLocaleString()}
            </span>
            <span className="text-xs text-white/40 font-mono">queries</span>
          </div>
          <Link
            href="/history"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white underline underline-offset-4"
          >
            <span>Audit history</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Card 4: Plan & Auto-Sync */}
        <div className="rounded-xl border border-white/10 bg-[#17171c] p-5 transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="cohere-mono-label text-[10px]">SYNC PIPELINE</span>
            <div className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold font-mono text-emerald-300">
              {hasLinkedInstallation ? "Auto-Sync Ready" : "Setup App"}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-white/40 font-mono truncate">
            {hasLinkedInstallation
              ? `@${primaryInstallation.account_login}`
              : "Install GitHub App"}
          </p>
        </div>
      </div>

      {/* GitHub Integration Status (Cohere Agent-Console Card) */}
      <div className="cohere-console-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-white font-mono">GitHub Integration Engine</h2>
                {hasLinkedInstallation ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-white/60 max-w-2xl leading-relaxed">
                {hasLinkedInstallation
                  ? `Active installation linked with GitHub account @${primaryInstallation.account_login} (${primaryInstallation.account_type}). Public and private repositories are accessible for automated webhook indexing.`
                  : "Connect your GitHub account or organization via the RepoLens GitHub App to automatically synchronize code on push webhooks and access private repositories."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasLinkedInstallation ? (
              <>
                <button
                  type="button"
                  onClick={loadGithubRepos}
                  disabled={loadingRepos}
                  className="btn-cohere-outline !py-1.5 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingRepos ? "animate-spin" : ""}`} />
                  <span>Sync Repos</span>
                </button>
                <a
                  href={`https://github.com/settings/installations/${primaryInstallation.installation_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-cohere-outline !py-1.5 text-xs"
                >
                  <span>Manage on GitHub</span>
                  <ExternalLink className="h-3 w-3 text-white/40" />
                </a>
                <a
                  href="/api/github/app/install"
                  className="btn-cohere-outline !py-1.5 text-xs"
                  title="Install on another account or organization"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Org</span>
                </a>
              </>
            ) : (
              <a
                href="/api/github/app/install"
                className="btn-cohere-primary"
              >
                <Github className="h-3.5 w-3.5" />
                <span>Install GitHub App</span>
              </a>
            )}
          </div>
        </div>

        {installations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
            {installations.map((inst) => (
              <div
                key={inst.installation_id}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono text-white/70"
              >
                <span className="font-semibold text-white">{inst.account_login}</span>
                <span className="text-white/40">({inst.account_type})</span>
                <span className="text-white/30">• ID {inst.installation_id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GitHub Repositories Browser */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white font-mono">Available GitHub Repositories</h2>
            <p className="text-xs text-white/50">
              Select &quot;Index Repo&quot; to parse and vectorize any codebase for semantic question answering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-56 rounded-full border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-white placeholder-white/40 outline-none focus:border-white/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={loadGithubRepos}
              disabled={loadingRepos}
              className="btn-cohere-outline !py-1 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${loadingRepos ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs as Cohere Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.08] pb-3">
          {(
            [
              { id: "all", label: "All Repos", count: repos.length },
              { id: "unindexed", label: "Not Indexed", count: repos.filter((r) => !r.is_indexed).length },
              { id: "indexed", label: "Indexed", count: repos.filter((r) => r.is_indexed).length },
              { id: "private", label: "Private", count: repos.filter((r) => r.private).length },
              { id: "public", label: "Public", count: repos.filter((r) => !r.private).length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-[#17171c] font-semibold"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  activeTab === tab.id ? "bg-[#17171c] text-white" : "bg-white/10 text-white/50"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Repositories List / Grid */}
        {loadingRepos && repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#141418] py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            <p className="mt-3 text-xs font-mono text-white/70">Connecting to GitHub App installation...</p>
          </div>
        ) : reposError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-xs font-medium text-red-200">{reposError}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={loadGithubRepos}
                className="btn-cohere-outline !py-1 text-xs"
              >
                Retry
              </button>
              <a
                href="/api/github/app/install"
                className="btn-cohere-primary !py-1 text-xs"
              >
                Reinstall App
              </a>
            </div>
          </div>
        ) : filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRepos.map((repo) => {
              const isCurrentlyIndexing = indexingUrl?.toLowerCase() === repo.html_url.toLowerCase();

              return (
                <div
                  key={repo.id}
                  className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                    repo.is_indexed
                      ? "border-emerald-500/30 bg-[#121714] hover:border-emerald-500/50"
                      : "border-white/10 bg-[#141418] hover:border-white/20"
                  }`}
                >
                  <div>
                    {/* Header: Name + Visibility badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 truncate text-xs font-semibold font-mono text-white transition-colors hover:text-[#ff7759]"
                          title={repo.full_name}
                        >
                          <span className="truncate">{repo.name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                        </a>
                        <p className="truncate font-mono text-[10px] text-white/40">{repo.owner.login}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {repo.private ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60"
                            title="Private repository"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60"
                            title="Public repository"
                          >
                            <Unlock className="h-2.5 w-2.5" />
                            <span>Public</span>
                          </span>
                        )}

                        {repo.is_indexed && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                            <Check className="h-2.5 w-2.5" />
                            <span>Indexed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-2 line-clamp-2 min-h-[32px] text-xs text-white/50 leading-relaxed">
                      {repo.description || "No description provided."}
                    </p>

                    {/* Meta info: Language, Stars, Updated */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-mono text-white/40">
                      {repo.language && (
                        <span className="inline-flex items-center gap-1 text-white/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ff7759]" />
                          {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-400" />
                          {repo.stargazers_count}
                        </span>
                      )}
                      <span>
                        Updated {new Date(repo.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 border-t border-white/[0.06] pt-3">
                    {repo.is_indexed && repo.source_id ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/ask?sourceId=${repo.source_id}`}
                          className="btn-cohere-primary flex-1 !py-1.5 text-xs text-center justify-center"
                        >
                          Ask Repo
                        </Link>
                        <Link
                          href={`/history?sourceId=${repo.source_id}`}
                          className="btn-cohere-outline !p-1.5"
                          title="View Q&A History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Link>
                        {confirmDeleteId === repo.source_id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(repo.source_id!, repo.name)}
                              disabled={deletingSourceId === repo.source_id}
                              className="rounded-full bg-red-600/30 px-2.5 py-1 text-[10px] font-mono text-red-200 hover:bg-red-600/50"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:bg-white/10"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(repo.source_id!)}
                            className="btn-cohere-outline !p-1.5 hover:!border-red-500/30 hover:!text-red-300"
                            title="Remove from Indexed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleIndexRepo(repo.html_url, repo.name)}
                        disabled={isCurrentlyIndexing || Boolean(indexingUrl)}
                        className="btn-cohere-outline w-full !py-1.5 text-xs text-center justify-center"
                      >
                        {isCurrentlyIndexing ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Indexing files...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            <span>Index Repo</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#141418] py-14 text-center">
            <Github className="h-8 w-8 text-white/30" />
            <h3 className="mt-3 text-sm font-semibold text-white font-mono">No repositories found</h3>
            <p className="mt-1 max-w-sm text-xs text-white/50">
              {searchQuery
                ? `No repositories matching "${searchQuery}".`
                : hasLinkedInstallation
                  ? "Your GitHub App is connected, but no repositories are granted in the installation."
                  : "Install the RepoLens GitHub App to view and index your repositories."}
            </p>
            <div className="mt-5">
              {hasLinkedInstallation ? (
                <a
                  href={`https://github.com/settings/installations/${primaryInstallation.installation_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-cohere-outline"
                >
                  Configure on GitHub
                </a>
              ) : (
                <a
                  href="/api/github/app/install"
                  className="btn-cohere-primary"
                >
                  Install GitHub App
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Recent Indexed Sources Section (Cohere Research Table Style) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white font-mono">Active Indexed Sources</h2>
            <p className="text-xs text-white/50">
              Currently vectorized codebases ready for deep semantic Q&A and architecture refactoring.
            </p>
          </div>

          <Link
            href="/ask"
            className="btn-cohere-outline !py-1 text-xs"
          >
            <span>Open Ask Session</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {sources.length > 0 ? (
          <div className="divide-y divide-white/[0.08] rounded-xl border border-white/10 bg-[#141418] overflow-hidden">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70">
                    {source.type === "github" ? (
                      <Github className="h-4 w-4" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-white font-mono">{source.name}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.2 font-mono text-[9px] uppercase tracking-wider text-white/50">
                        {source.type}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-white/40">
                      Indexed {new Date(source.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/ask?sourceId=${source.id}`}
                    className="btn-cohere-primary !py-1 !px-3 text-xs"
                  >
                    Ask
                  </Link>
                  <Link
                    href={`/history?sourceId=${source.id}`}
                    className="btn-cohere-outline !py-1 !px-2.5 text-xs"
                  >
                    History
                  </Link>

                  {confirmDeleteId === source.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(source.id, source.name)}
                        disabled={deletingSourceId === source.id}
                        className="rounded-full bg-red-600/30 px-2.5 py-1 text-[10px] font-mono text-red-200 hover:bg-red-600/50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(source.id)}
                      className="btn-cohere-outline !p-1.5 hover:!border-red-500/30 hover:!text-red-300"
                      title="Delete indexed source"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#141418] p-8 text-center">
            <Database className="mx-auto h-7 w-7 text-white/30" />
            <p className="mt-2 text-xs font-semibold text-white font-mono">No repositories indexed yet</p>
            <p className="mt-1 text-xs text-white/40">
              Pick a repository from the list above or upload a ZIP archive.
            </p>
          </div>
        )}
      </section>

      {/* Quick Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#17171c] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white font-mono">Index New Codebase</h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="mt-4 flex gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setImportTab("github")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  importTab === "github"
                    ? "bg-white text-[#17171c] font-semibold"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Github className="h-3 w-3" />
                <span>GitHub URL</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTab("zip")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  importTab === "zip"
                    ? "bg-white text-[#17171c] font-semibold"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Upload className="h-3 w-3" />
                <span>Upload ZIP</span>
              </button>
            </div>

            {importTab === "github" ? (
              <form onSubmit={handleManualIngest} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="modal-github-url" className="cohere-mono-label text-[10px]">
                    REPOSITORY URL
                  </label>
                  <input
                    id="modal-github-url"
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    value={manualGithubUrl}
                    onChange={(e) => setManualGithubUrl(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-white/30"
                  />
                  <p className="mt-1.5 text-[11px] text-white/40">
                    Public or private GitHub repositories. Private repos require the GitHub App.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="btn-cohere-outline !py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!manualGithubUrl.trim()}
                    className="btn-cohere-primary !py-1.5 text-xs"
                  >
                    Start Ingest
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleZipIngest} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="modal-zip-file" className="cohere-mono-label text-[10px]">
                    ZIP ARCHIVE (MAX 45 MB)
                  </label>
                  <input
                    id="modal-zip-file"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setManualZipFile(e.target.files?.[0] || null)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-dashed border-white/20 bg-white/5 p-4 text-xs text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#17171c]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="btn-cohere-outline !py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!manualZipFile || uploadingZip}
                    className="btn-cohere-primary !py-1.5 text-xs"
                  >
                    {uploadingZip ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Uploading ZIP...</span>
                      </>
                    ) : (
                      <span>Upload & Index</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Required Modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#17171c] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white font-mono">Plan Limit Reached</h3>
            <p className="mt-2 text-xs text-white/70">{upgradeModal.message}</p>
            <p className="mt-2 cohere-mono-label text-[10px] text-[#ff7759]">
              Upgrade to {upgradeModal.planRequired.toUpperCase()} for more repository capacity.
            </p>
            <div className="mt-6 flex gap-2 border-t border-white/10 pt-4">
              <Link
                href="/dashboard/billing"
                className="btn-cohere-primary !py-1.5 text-xs"
              >
                Upgrade to {upgradeModal.planRequired === "pro" ? "Pro" : "Team"}
              </Link>
              <button
                type="button"
                onClick={() => setUpgradeModal(null)}
                className="btn-cohere-outline !py-1.5 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

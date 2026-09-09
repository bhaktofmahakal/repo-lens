"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Github,
  History,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
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
        text: `Successfully indexed "${repoName}"! You can now start asking questions.`,
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

  // Delete Source
  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    setDeletingSourceId(sourceId);
    setConfirmDeleteId(null);
    setFeedback(null);

    try {
      const res = await fetch(`/api/sources/${sourceId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete repository.");
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
        text: `"${sourceName}" removed from your indexed repositories.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete repository.",
      });
    } finally {
      setDeletingSourceId(null);
    }
  };

  // Manual GitHub URL Ingestion
  const handleManualIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualGithubUrl.trim()) return;

    const url = manualGithubUrl.trim();
    const repoName = url.split("/").filter(Boolean).pop()?.replace(/\.git$/, "") || "repo";
    setIsImportModalOpen(false);
    setManualGithubUrl("");
    await handleIndexRepo(url, repoName);
  };

  // Manual ZIP Ingestion
  const handleZipIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualZipFile) return;

    setUploadingZip(true);
    setFeedback(null);

    try {
      // Step 1: Presign
      const presignRes = await fetch("/api/ingest/zip/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: manualZipFile.name, fileSize: manualZipFile.size }),
      });
      const presignData = await presignRes.json();

      if (presignRes.status === 402) {
        setUpgradeModal({
          planRequired: presignData.plan_required || "pro",
          message: presignData.message || "Quota exceeded.",
        });
        setIsImportModalOpen(false);
        return;
      }
      if (!presignRes.ok) throw new Error(presignData.error || "Failed to prepare upload.");

      // Step 2: Upload
      const uploadRes = await fetch(presignData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: manualZipFile,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload ZIP archive to storage.");

      // Step 3: Process
      const processRes = await fetch("/api/ingest/zip/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: presignData.sourceId }),
      });
      const processData = await processRes.json();
      if (!processRes.ok) throw new Error(processData.error || "Failed to process ZIP archive.");

      setIsImportModalOpen(false);
      setManualZipFile(null);
      router.push(`/ask?sourceId=${presignData.sourceId}`);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "ZIP upload failed.",
      });
    } finally {
      setUploadingZip(false);
    }
  };

  // Filtering repos
  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = repo.full_name.toLowerCase().includes(q) || repo.name.toLowerCase().includes(q);
        const matchesDesc = repo.description?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesDesc) return false;
      }

      // Tab filter
      if (activeTab === "unindexed") return !repo.is_indexed;
      if (activeTab === "indexed") return repo.is_indexed;
      if (activeTab === "private") return repo.private;
      if (activeTab === "public") return !repo.private;

      return true;
    });
  }, [repos, searchQuery, activeTab]);

  const hasLinkedInstallation = installations.length > 0;
  const primaryInstallation = installations[0];

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                kpi.userPlan === "team"
                  ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                  : kpi.userPlan === "pro"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                    : "border-white/20 bg-white/5 text-white/70"
              }`}
            >
              {kpi.userPlan} plan
            </span>
          </div>
          <p className="mt-1.5 text-sm text-white/60">
            Index, explore, and run semantic AI queries across all your GitHub repositories and codebases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F04D26] to-[#ff633d] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#F04D26]/20 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Index New Repo</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast / Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm transition-all ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : feedback.type === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-blue-500/40 bg-blue-500/10 text-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <Zap className="h-5 w-5 shrink-0 text-amber-400" />
            )}
            <div>
              <p className="font-medium">{feedback.text}</p>
              {feedback.sourceId && (
                <div className="mt-2 flex items-center gap-3">
                  <Link
                    href={`/ask?sourceId=${feedback.sourceId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
                  >
                    <span>Open Q&A Ask</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Repositories Indexed */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-sm transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-white/50">
              Repositories Indexed
            </span>
            <div className="rounded-xl bg-[#F04D26]/10 p-2 text-[#F04D26]">
              <Github className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{kpi.totalSources}</span>
            <span className="text-xs text-white/40">
              / {Number.isFinite(kpi.planLimit) ? kpi.planLimit : "∞"} max
            </span>
          </div>
          {Number.isFinite(kpi.planLimit) && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#F04D26] to-amber-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((kpi.totalSources / kpi.planLimit) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Card 2: Knowledge Base Chunks */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-sm transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-white/50">
              Code Chunks (Vectors)
            </span>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {kpi.totalChunks.toLocaleString()}
            </span>
            <span className="text-xs text-white/40">embedded</span>
          </div>
          <p className="mt-2 text-xs text-white/40">768-dim semantic code embeddings</p>
        </div>

        {/* Card 3: Questions Answered */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-sm transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-white/50">
              Q&A Inquiries
            </span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {kpi.totalQuestions.toLocaleString()}
            </span>
            <span className="text-xs text-white/40">queries</span>
          </div>
          <Link
            href="/history"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
          >
            <span>View audit history</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Card 4: Plan & Auto-Sync */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-sm transition-all hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-white/50">
              GitHub Sync
            </span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-base font-semibold text-emerald-200">
              {hasLinkedInstallation ? "Auto-Sync Ready" : "Setup GitHub App"}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/40">
            {hasLinkedInstallation
              ? `Connected via @${primaryInstallation.account_login}`
              : "Install GitHub App to sync"}
          </p>
        </div>
      </div>

      {/* GitHub Integration Status Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#181818] to-[#121212] p-6 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white shadow-inner">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-semibold text-white">GitHub App Integration</h2>
                {hasLinkedInstallation ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-white/60">
                {hasLinkedInstallation
                  ? `Active connection with GitHub account @${primaryInstallation.account_login} (${primaryInstallation.account_type}). Public & private repositories are accessible.`
                  : "Connect your GitHub account or organization via the RepoLens GitHub App to load private and public repositories and keep them synced automatically."}
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingRepos ? "animate-spin" : ""}`} />
                  <span>Refresh Repos</span>
                </button>
                <a
                  href={`https://github.com/settings/installations/${primaryInstallation.installation_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span>Manage on GitHub</span>
                  <ExternalLink className="h-3 w-3 text-white/40" />
                </a>
                <a
                  href="/api/github/app/install"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white"
                  title="Install on another account or organization"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Org</span>
                </a>
              </>
            ) : (
              <a
                href="/api/github/app/install"
                className="inline-flex items-center gap-2 rounded-xl bg-[#F04D26] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#F04D26]/20 transition-all hover:bg-[#de4723]"
              >
                <Github className="h-4 w-4" />
                <span>Install GitHub App</span>
              </a>
            )}
          </div>
        </div>

        {/* Installation metadata badges */}
        {installations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
            {installations.map((inst) => (
              <div
                key={inst.installation_id}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-white/70"
              >
                <span className="font-medium text-white">{inst.account_login}</span>
                <span className="text-white/40">({inst.account_type})</span>
                <span className="text-white/30">• ID {inst.installation_id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area: GitHub Repositories Browser */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Your GitHub Repositories</h2>
            <p className="text-xs text-white/55">
              Click &quot;Index Repo&quot; on any repository to parse its codebase and enable AI semantic search.
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
                className="h-9 w-60 rounded-xl border border-white/10 bg-[#181818] pl-8 pr-3 text-xs text-white placeholder-white/40 outline-none transition-colors focus:border-[#F04D26]/50 focus:ring-1 focus:ring-[#F04D26]/30"
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
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-[#181818] px-3 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRepos ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 pb-2">
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
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === tab.id ? "bg-[#F04D26] text-white" : "bg-white/10 text-white/50"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Repositories List / Grid */}
        {loadingRepos && repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#131313] py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#F04D26]" />
            <p className="mt-3 text-sm font-medium text-white">Loading your GitHub repositories...</p>
            <p className="mt-1 text-xs text-white/45">Fetching via GitHub App installation</p>
          </div>
        ) : reposError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-medium text-red-200">{reposError}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={loadGithubRepos}
                className="rounded-lg bg-red-500/20 px-3.5 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/30"
              >
                Retry
              </button>
              <a
                href="/api/github/app/install"
                className="rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
              >
                Reinstall GitHub App
              </a>
            </div>
          </div>
        ) : filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRepos.map((repo) => {
              const isCurrentlyIndexing = indexingUrl?.toLowerCase() === repo.html_url.toLowerCase();

              return (
                <div
                  key={repo.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all ${
                    repo.is_indexed
                      ? "border-emerald-500/30 bg-gradient-to-b from-[#131814] to-[#111311] hover:border-emerald-500/50"
                      : "border-white/10 bg-[#141414] hover:border-white/25 hover:bg-[#181818]"
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
                          className="group-hover:text-[#F04D26] inline-flex items-center gap-1.5 truncate text-sm font-semibold text-white transition-colors"
                          title={repo.full_name}
                        >
                          <span className="truncate">{repo.name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                        </a>
                        <p className="truncate text-xs text-white/40">{repo.owner.login}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {repo.private ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300"
                            title="Private repository"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60"
                            title="Public repository"
                          >
                            <Unlock className="h-2.5 w-2.5" />
                            <span>Public</span>
                          </span>
                        )}

                        {repo.is_indexed && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            <Check className="h-2.5 w-2.5" />
                            <span>Indexed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-2 line-clamp-2 min-h-[32px] text-xs text-white/55">
                      {repo.description || "No description provided."}
                    </p>

                    {/* Meta info: Language, Stars, Updated */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/45">
                      {repo.language && (
                        <span className="inline-flex items-center gap-1 font-medium text-white/70">
                          <span className="h-2 w-2 rounded-full bg-[#F04D26]" />
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
                  <div className="mt-4 border-t border-white/5 pt-3">
                    {repo.is_indexed && repo.source_id ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/ask?sourceId=${repo.source_id}`}
                          className="flex-1 rounded-lg bg-emerald-600/20 py-1.5 text-center text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-600/30"
                        >
                          Ask Repo
                        </Link>
                        <Link
                          href={`/history?sourceId=${repo.source_id}`}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5 hover:text-white"
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
                              className="rounded-lg bg-red-600/30 px-2 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-600/50"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-white/10 px-1.5 py-1.5 text-[11px] text-white/50 hover:bg-white/10"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(repo.source_id!)}
                            className="rounded-lg border border-white/10 p-1.5 text-white/40 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
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
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F04D26]/15 py-2 text-xs font-semibold text-[#F04D26] transition-all hover:bg-[#F04D26] hover:text-white disabled:opacity-50"
                      >
                        {isCurrentlyIndexing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Indexing files...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#131313] py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
              <Github className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-white">No repositories found</h3>
            <p className="mt-1 max-w-sm text-xs text-white/55">
              {searchQuery
                ? `No repositories matching "${searchQuery}". Try adjusting your search term.`
                : hasLinkedInstallation
                  ? "Your GitHub App is connected, but no repositories were granted. Manage your installation on GitHub to grant repository access."
                  : "Install the RepoLens GitHub App to view and index your repositories with one click."}
            </p>
            <div className="mt-5 flex gap-3">
              {hasLinkedInstallation ? (
                <a
                  href={`https://github.com/settings/installations/${primaryInstallation.installation_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-[#F04D26] px-4 py-2 text-xs font-medium text-white hover:bg-[#de4723]"
                >
                  Configure Repos on GitHub
                </a>
              ) : (
                <a
                  href="/api/github/app/install"
                  className="rounded-xl bg-[#F04D26] px-4 py-2 text-xs font-medium text-white hover:bg-[#de4723]"
                >
                  Install GitHub App
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Recent Sources (Indexed Codebases) Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">All Indexed Sources</h2>
            <p className="text-xs text-white/55">
              Active knowledge bases indexed and ready for semantic Q&A and architecture refactoring.
            </p>
          </div>

          <Link
            href="/ask"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
          >
            <span>Ask Q&A</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {sources.length > 0 ? (
          <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70">
                    {source.type === "github" ? (
                      <Github className="h-5 w-5" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{source.name}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">
                        {source.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">
                      Added {new Date(source.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/ask?sourceId=${source.id}`}
                    className="rounded-lg bg-[#F04D26] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#de4723]"
                  >
                    Ask Repo
                  </Link>
                  <Link
                    href={`/history?sourceId=${source.id}`}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    History
                  </Link>

                  {confirmDeleteId === source.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(source.id, source.name)}
                        disabled={deletingSourceId === source.id}
                        className="rounded-lg bg-red-600/40 px-2 py-1.5 text-[11px] font-semibold text-red-200 hover:bg-red-600/60"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-white/50 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(source.id)}
                      className="rounded-lg border border-white/10 p-2 text-white/40 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                      title="Delete indexed source"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-8 text-center">
            <Database className="mx-auto h-8 w-8 text-white/30" />
            <p className="mt-2 text-sm text-white/60">No repositories indexed yet.</p>
            <p className="mt-1 text-xs text-white/40">
              Pick a repository from above or use the Quick Ingest button.
            </p>
          </div>
        )}
      </section>

      {/* Quick Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white">Index New Codebase</h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="mt-4 flex gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setImportTab("github")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  importTab === "github"
                    ? "bg-[#F04D26] text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub URL</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTab("zip")}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  importTab === "zip"
                    ? "bg-[#F04D26] text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload ZIP</span>
              </button>
            </div>

            {importTab === "github" ? (
              <form onSubmit={handleManualIngest} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="modal-github-url" className="text-xs font-medium text-white/70">
                    Repository URL
                  </label>
                  <input
                    id="modal-github-url"
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    value={manualGithubUrl}
                    onChange={(e) => setManualGithubUrl(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1c1c1c] px-3.5 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-[#F04D26]"
                  />
                  <p className="mt-1.5 text-[11px] text-white/40">
                    Public or private GitHub repositories. Private repos require the RepoLens GitHub App.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!manualGithubUrl.trim()}
                    className="rounded-xl bg-[#F04D26] px-4 py-2 text-xs font-semibold text-white hover:bg-[#de4723] disabled:opacity-50"
                  >
                    Start Ingest
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleZipIngest} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="modal-zip-file" className="text-xs font-medium text-white/70">
                    ZIP Archive (Max 45 MB)
                  </label>
                  <input
                    id="modal-zip-file"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setManualZipFile(e.target.files?.[0] || null)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-dashed border-white/20 bg-[#1c1c1c] p-4 text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#F04D26] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!manualZipFile || uploadingZip}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F04D26] px-4 py-2 text-xs font-semibold text-white hover:bg-[#de4723] disabled:opacity-50"
                  >
                    {uploadingZip ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Plan Limit Reached</h3>
            <p className="mt-2 text-sm text-white/70">{upgradeModal.message}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-[#F04D26]">
              Upgrade to {upgradeModal.planRequired.toUpperCase()} for more repository capacity and higher limits.
            </p>
            <div className="mt-5 flex gap-2">
              <Link
                href="/dashboard/billing"
                className="rounded-xl bg-[#F04D26] px-4 py-2 text-xs font-semibold text-white hover:bg-[#de4723]"
              >
                Upgrade to {upgradeModal.planRequired === "pro" ? "Pro" : "Team"}
              </Link>
              <button
                type="button"
                onClick={() => setUpgradeModal(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70 hover:bg-white/5"
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

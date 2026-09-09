"use client";

import { useState, useEffect, Suspense } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Cpu, Database, Server, ShieldCheck } from "lucide-react";
import { StatusResult } from "@/types";
import { CohereNavbar } from "@/components/navigation/CohereNavbar";

function StatusContent() {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const subsystems = [
    {
      id: "backend",
      title: "API Engine & Ingestion",
      state: status?.backend,
      icon: Server,
      desc: "Next.js edge runtime, GitHub webhooks, and rate-limiting middleware",
    },
    {
      id: "db",
      title: "Vector DB (Supabase pgvector)",
      state: status?.db,
      icon: Database,
      desc: "PostgreSQL database, embeddings storage, and row-level security",
    },
    {
      id: "llm",
      title: "Groq Cloud LLM Inference",
      state: status?.llm,
      icon: Cpu,
      desc: "Ultra-low-latency Llama 3.3 70B inference engine",
    },
  ];

  const allHealthy = status?.backend === "healthy" && status?.db === "healthy" && status?.llm === "healthy";

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white">
      <CohereNavbar />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Header with Cohere research/editorial style */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="cohere-mono-label">SYSTEM HEALTH & TELEMETRY</span>
              <span className={`h-2 w-2 rounded-full ${allHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
              Subsystem Diagnostics
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Live operational metrics and service availability checks across RepoLens infrastructure.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastChecked && (
              <span className="font-mono text-[11px] text-white/40">
                Updated at {lastChecked}
              </span>
            )}
            <button
              type="button"
              onClick={fetchStatus}
              disabled={refreshing}
              className="btn-cohere-outline !py-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Summary Status Banner */}
        <div className="mb-8 rounded-xl border border-white/10 bg-[#17171c] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                allHealthy ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  {allHealthy ? "All Subsystems Operational" : "Degraded Service Detected"}
                </h2>
                <p className="text-xs text-white/60">
                  {allHealthy
                    ? "Inference, vector search, and repository synchronization are running with optimal latency."
                    : "One or more infrastructure components require attention."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white/50">PLATFORM SLA:</span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-400">
                99.9%
              </span>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            <p className="font-mono text-xs text-white/50">Querying platform endpoints...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {subsystems.map((sub) => {
              const Icon = sub.icon;
              const isHealthy = sub.state === "healthy";
              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-white/10 bg-[#141418] p-5 transition-all hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${
                        isHealthy
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isHealthy ? "bg-emerald-400" : "bg-red-400"}`} />
                      {sub.state || "unknown"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-white tracking-tight">
                    {sub.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/50 leading-relaxed min-h-[36px]">
                    {sub.desc}
                  </p>

                  <div className="mt-4 border-t border-white/[0.06] pt-3 flex items-center justify-between text-[11px] font-mono text-white/40">
                    <span>Protocol: HTTPS</span>
                    <span>State: {isHealthy ? "Verified" : "Degraded"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 text-center text-xs text-white/40 font-mono">
          <span>Continuous automated probes run every 60 seconds. Powered by Groq & Supabase.</span>
        </div>
      </main>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0e0e11] text-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}



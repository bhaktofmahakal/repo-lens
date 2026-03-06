"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusResult } from "@/types";

export default function StatusPage() {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error("Failed to fetch status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const StatusCard = ({ title, state }: { title: string; state?: "healthy" | "unhealthy" }) => (
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/[0.07] bg-[#1a1a1a] p-[5px]">
      <div className="flex w-full flex-col items-center gap-4 rounded-[25px] border border-white/[0.04] bg-[#111111] p-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7d7d87]">{title}</span>
        {state === "healthy" ? (
          <CheckCircle2 className="w-14 h-14 text-emerald-400" />
        ) : (
          <XCircle className="w-14 h-14 text-red-400" />
        )}
        <span className={`rounded-full px-4 py-1 text-sm font-semibold uppercase tracking-wider ${
          state === "healthy"
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            : "bg-red-500/10 text-red-400 border border-red-500/30"
        }`}>
          {state || "unknown"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#151515]">
    <div className="mx-auto max-w-4xl px-4 py-16">
      <header className="mb-12 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4">
        <button
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#111111] text-white/70 transition-colors hover:border-[#F04D26]/50 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-white">System Health</h1>
          <p className="text-sm text-[#7d7d87]">Real-time diagnostics for all subsystems</p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin w-10 h-10 text-[#F04D26]" />
          <p className="text-base font-medium text-[#7d7d87]">Diagnosing subsystems...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatusCard title="Backend" state={status?.backend} />
          <StatusCard title="Database" state={status?.db} />
          <StatusCard title="LLM Provider" state={status?.llm} />
        </div>
      )}

      <footer className="mt-16 text-center text-sm text-[#7d7d87]">
        <p>All checks are performed in real-time. If any service is unhealthy, please check the logs.</p>
      </footer>
    </div>
    </div>
  );
}

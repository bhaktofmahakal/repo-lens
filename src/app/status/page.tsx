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
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-8 text-center">
      <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {state === "healthy" ? (
        <CheckCircle2 className="w-16 h-16 text-green-500" />
      ) : (
        <XCircle className="w-16 h-16 text-red-500" />
      )}
      <span className={`rounded-full px-4 py-1 text-sm font-bold uppercase ${state === "healthy" ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
        {state || "unknown"}
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <header className="mb-12 flex items-center gap-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
        <button
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-4xl font-semibold text-white">System Health</h1>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
          <p className="animate-pulse text-xl font-medium text-slate-300">Diagnosing subsystems...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatusCard title="Backend" state={status?.backend} />
          <StatusCard title="Database" state={status?.db} />
          <StatusCard title="LLM Provider" state={status?.llm} />
        </div>
      )}

      <footer className="mt-20 text-center text-sm text-slate-400">
        <p>All checks are performed in real-time. If any service is unhealthy, please check the logs.</p>
      </footer>
    </div>
  );
}

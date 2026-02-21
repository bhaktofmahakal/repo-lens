/* utsav */
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
    <div className="p-8 border rounded-2xl shadow-sm bg-white dark:bg-slate-900 flex flex-col items-center text-center gap-4">
      <h2 className="text-xl font-semibold uppercase tracking-wider opacity-60">{title}</h2>
      {state === "healthy" ? (
        <CheckCircle2 className="w-16 h-16 text-green-500" />
      ) : (
        <XCircle className="w-16 h-16 text-red-500" />
      )}
      <span className={`px-4 py-1 rounded-full text-sm font-bold uppercase ${state === "healthy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
        {state || "unknown"}
      </span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <header className="flex items-center gap-4 mb-12">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-4xl font-extrabold">System Health</h1>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
          <p className="text-xl font-medium animate-pulse">Diagnosing subsystems...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatusCard title="Backend" state={status?.backend} />
          <StatusCard title="Database" state={status?.db} />
          <StatusCard title="LLM Provider" state={status?.llm} />
        </div>
      )}

      <footer className="mt-20 text-center opacity-60 text-sm">
        <p>All checks are performed in real-time. If any service is unhealthy, please check the logs.</p>
      </footer>
    </div>
  );
}

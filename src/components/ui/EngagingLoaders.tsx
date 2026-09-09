"use client";

import { useEffect, useState } from "react";
import { Cpu, Database, FileCode, GitBranch, Github, Layers, Sparkles, Terminal, Wand2, Zap } from "lucide-react";

/**
 * QuerySynthesisLoader: Ultra-engaging telemetry state shown during /ask question synthesis.
 * Replaces generic spinners with live pipeline steps, elapsed timer, and cybernetic code wireframes.
 */
export function QuerySynthesisLoader() {
  const [elapsed, setElapsed] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Database,
      title: "Dense Vector Embedding",
      desc: "Encoding query with all-mpnet-base-v2 into 768-D semantic space...",
    },
    {
      icon: Layers,
      title: "pgvector Cosine Search",
      desc: "Retrieving nearest 60-line AST code chunks with distance threshold...",
    },
    {
      icon: Cpu,
      title: "Groq Qwen 3.8 27B / GPT-OSS Synthesis",
      desc: "Streaming neural inference (~280 tokens/sec) over retrieved evidence...",
    },
    {
      icon: FileCode,
      title: "Citation Grounding & Verification",
      desc: "Validating AST line numbers and anchoring source code links...",
    },
  ];

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const ms = Date.now() - startTime;
      setElapsed(Number((ms / 1000).toFixed(1)));
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => {
      clearInterval(timer);
      clearInterval(stepInterval);
    };
  }, [steps.length]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#121216] shadow-2xl backdrop-blur-xl">
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#17171c] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="cohere-mono-label text-[10px] text-white/90">
            NEURAL CODE SYNTHESIS ENGINE
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/60">
            GROQ QWEN-3.8 27B · GPT-OSS
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300">
            ELAPSED: {elapsed.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Cybernetic Progress Laser Bar */}
      <div className="relative h-[2px] w-full overflow-hidden bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-[#ff7759] via-[#10b981] to-[#3b82f6] transition-all duration-700 ease-out"
          style={{ width: `${Math.min(95, (currentStep + 1) * 25)}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
      </div>

      <div className="p-6 space-y-6">
        {/* Active Pipeline Stepper */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                  isActive
                    ? "border-[#ff7759]/40 bg-[#ff7759]/[0.06] shadow-sm"
                    : isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                      : "border-white/[0.06] bg-white/[0.02] opacity-40"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs ${
                    isActive
                      ? "border-[#ff7759]/50 bg-[#ff7759]/20 text-[#ff7759] animate-pulse"
                      : isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-mono text-xs font-semibold ${isActive ? "text-white" : isCompleted ? "text-emerald-300" : "text-white/50"}`}>
                      {step.title}
                    </p>
                    <span className="font-mono text-[9px] text-white/40">STEP 0{idx + 1}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/60 truncate">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shimmering Code Synthesis Preview Wireframe */}
        <div className="rounded-xl border border-white/10 bg-[#0d0d10] p-4 font-mono text-xs">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2 text-[11px] text-white/40">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-[#ff7759]" />
              <span>AST_EVIDENCE_STREAM.tsx</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">● STREAMING TOKENS</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-white/20 select-none">01</span>
              <div className="h-3.5 rounded bg-white/15 w-2/5 animate-pulse" />
              <div className="h-3.5 rounded bg-[#ff7759]/30 w-1/5 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/20 select-none">02</span>
              <div className="h-3.5 rounded bg-[#3b82f6]/25 w-1/4 animate-pulse" />
              <div className="h-3.5 rounded bg-white/10 w-2/5 animate-pulse" />
              <div className="h-3.5 rounded bg-emerald-500/25 w-1/6 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/20 select-none">03</span>
              <div className="h-3.5 rounded bg-white/10 w-3/5 animate-pulse" />
              <div className="h-3.5 rounded bg-[#ff7759]/20 w-1/4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RefactorAnalysisLoader: Radar analysis shown during Refactor Suggestions generation.
 */
export function RefactorAnalysisLoader() {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Analyzing retrieved code AST hierarchies...",
    "Evaluating cyclomatic complexity & coupling points...",
    "Formulating focused helper & unit-test recommendations...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase((p) => (p + 1) % phases.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [phases.length]);

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-[#ff7759]/30 animate-ping opacity-60" />
        <div className="absolute inset-2 rounded-full border border-white/20 animate-spin" />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff7759]/10 border border-[#ff7759]/40 text-[#ff7759]">
          <Wand2 className="h-5 w-5" />
        </div>
      </div>

      <span className="cohere-mono-label text-[10px] text-[#ff7759]">
        AI ARCHITECTURAL REFACTOR
      </span>
      <h4 className="mt-1 font-mono text-sm font-bold text-white">
        Synthesizing Code Recommendations
      </h4>
      <p className="mt-2 font-mono text-xs text-white/60 min-h-[20px] transition-all">
        {phases[phase]}
      </p>

      {/* Shimmering Recommendation Wireframe */}
      <div className="mt-6 w-full max-w-md space-y-3 text-left">
        <div className="rounded-xl border border-white/10 bg-[#141418] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3.5 rounded bg-white/20 w-1/2 animate-pulse" />
            <div className="h-3 rounded bg-white/10 w-16 animate-pulse" />
          </div>
          <div className="h-2.5 rounded bg-white/10 w-4/5 animate-pulse" />
          <div className="h-6 rounded border border-emerald-500/20 bg-emerald-500/5 w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * RepoGridLoader: High-tech grid wireframe shown while GitHub repositories are syncing.
 */
export function RepoGridLoader() {
  return (
    <div className="space-y-4">
      {/* GitHub Beacon Banner */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#141418] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="absolute h-full w-full animate-ping rounded-full bg-[#ff7759] opacity-75" />
            <span className="relative h-3 w-3 rounded-full bg-[#ff7759]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-white/70" />
              <span className="font-mono text-xs font-semibold text-white">
                Connecting to GitHub App Installation Beacon...
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-white/40">
              Querying authorized repositories and webhook push subscriptions
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-white/60">
          SYNCING...
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-[#141418] p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-3/4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 rounded bg-white/20 w-32 animate-pulse" />
                </div>
                <div className="h-3 rounded bg-white/10 w-44 animate-pulse" />
              </div>
              <div className="h-4 rounded-full bg-white/10 w-12 animate-pulse" />
            </div>

            <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
              <div className="h-3 rounded bg-white/10 w-16 animate-pulse" />
              <div className="h-3 rounded bg-white/10 w-20 animate-pulse" />
            </div>

            <div className="h-8 rounded-full border border-white/10 bg-white/5 w-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * HistoryLoader: Shown when loading historical Q&A sessions.
 */
export function HistoryLoader() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-[#141418] p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="h-3.5 rounded bg-white/20 w-48 animate-pulse" />
            <div className="h-3 rounded bg-white/10 w-20 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 rounded bg-white/10 w-full animate-pulse" />
            <div className="h-3 rounded bg-white/10 w-5/6 animate-pulse" />
            <div className="h-3 rounded bg-white/10 w-3/4 animate-pulse" />
          </div>
          <div className="flex gap-2 pt-2">
            <div className="h-5 rounded-full bg-white/10 w-24 animate-pulse" />
            <div className="h-5 rounded-full bg-white/10 w-28 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * FullPageCyberLoader: Branded high-end Suspense fallback.
 */
export function FullPageCyberLoader({ label = "Initializing Codebase Intelligence Engine..." }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#0e0e11] text-white flex flex-col items-center justify-center px-4">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl border border-white/15 bg-[#17171c] rotate-45 animate-pulse" />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff7759]/20 border border-[#ff7759]/40 text-[#ff7759]">
          <Cpu className="h-5 w-5 animate-pulse" />
        </div>
      </div>
      <span className="cohere-mono-label text-[10px] text-[#ff7759] tracking-widest">
        REPOLENS ENTERPRISE
      </span>
      <h3 className="mt-1 font-mono text-sm font-bold text-white text-center">
        {label}
      </h3>
      <p className="mt-2 font-mono text-xs text-white/40">
        Authenticating session & verifying vector index
      </p>
    </div>
  );
}

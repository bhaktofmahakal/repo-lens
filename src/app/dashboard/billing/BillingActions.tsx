"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, Zap, Shield, ArrowRight, ExternalLink } from "lucide-react";

type PlanTarget = "pro" | "team";

type BillingActionsProps = {
  currentPlan: string;
  nextBillingDate: string | null;
  billingEnabled: boolean;
  disabledReason?: string;
};

export function BillingActions({
  currentPlan,
  nextBillingDate,
  billingEnabled,
  disabledReason,
}: BillingActionsProps) {
  const [loadingAction, setLoadingAction] = useState<PlanTarget | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedCurrentPlan = currentPlan.toLowerCase();

  const launchCheckout = async (plan: PlanTarget) => {
    if (!billingEnabled) return;

    setLoadingAction(plan);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        if (data?.code === "BILLING_NOT_CONFIGURED") {
          throw new Error("Stripe checkout is currently in test mode or unconfigured.");
        }
        throw new Error(data.error || "Unable to start checkout session.");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open checkout. Please try again.");
      setLoadingAction(null);
    }
  };

  const openBillingPortal = async () => {
    if (!billingEnabled) return;

    setLoadingAction("portal");
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        if (data?.code === "BILLING_NOT_CONFIGURED") {
          throw new Error("Billing portal is currently unavailable.");
        }
        throw new Error(data.error || "Unable to open billing portal.");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open billing portal. Please try again.");
      setLoadingAction(null);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Free Explorer",
      badge: "DEVELOPER",
      price: "$0",
      period: "forever",
      description: "Basic codebase interrogation and citation verification for open-source repositories.",
      features: [
        "Up to 3 public repositories",
        "50 queries per month",
        "5,000 code chunks per repo",
        "Fast Groq Llama 3.3 70B inference",
        "Verifiable line citations",
        "Community support",
      ],
      current: normalizedCurrentPlan === "free",
      cta: "Current Active Tier",
    },
    {
      id: "pro",
      name: "Pro Engineer",
      badge: "MOST POPULAR",
      price: "$29",
      period: "per month",
      description: "Unrestricted private repository intelligence, webhook auto-sync, and automated refactors.",
      features: [
        "Up to 20 repositories",
        "Private GitHub repos included",
        "2,000 queries per month",
        "50,000 code chunks per repo",
        "GitHub App real-time auto-sync on push",
        "AI refactoring suggestions with diffs",
        "Shareable public audit session links",
        "Priority inference queue",
      ],
      current: normalizedCurrentPlan === "pro",
      cta: "Upgrade to Pro",
      highlight: true,
    },
    {
      id: "team",
      name: "Team & Enterprise",
      badge: "HIGH CAPACITY",
      price: "$99",
      period: "per month",
      description: "Dedicated limits, multi-seat developer workspaces, and direct API key programmatic access.",
      features: [
        "Unlimited repositories",
        "Private & organization repos",
        "Unlimited monthly queries",
        "250,000 code chunks per repo",
        "Programmatic REST API keys",
        "Instant webhook auto-sync",
        "Multi-model routing (Llama 3.3 / Scout)",
        "Dedicated SLA & email support",
      ],
      current: normalizedCurrentPlan === "team",
      cta: "Upgrade to Team",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Notice if Stripe is not live */}
      {!billingEnabled && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-300">
          {disabledReason || "Payment processing is currently in test preview. You can continue using your active plan without interruptions."}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Cohere Product Cards (3-Column Grid) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((p) => {
          const isPro = p.id === "pro";
          const isTeam = p.id === "team";
          const isCurrent = p.current;

          return (
            <div
              key={p.id}
              className={`relative flex flex-col justify-between rounded-xl p-6 transition-all ${
                p.highlight
                  ? "border border-white/25 bg-[#17171c] shadow-2xl"
                  : "border border-white/10 bg-[#141418]"
              }`}
            >
              {p.badge && (
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`cohere-mono-label text-[10px] rounded-full px-2.5 py-0.5 border ${
                      p.highlight
                        ? "border-[#ff7759]/40 bg-[#ff7759]/10 text-[#ff7759]"
                        : "border-white/10 bg-white/5 text-white/60"
                    }`}
                  >
                    {p.badge}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-400">
                      Active
                    </span>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold tracking-tight text-white font-mono">{p.name}</h3>
                <p className="mt-1 text-xs text-white/50 leading-relaxed min-h-[34px]">
                  {p.description}
                </p>

                <div className="mt-4 flex items-baseline gap-1 border-b border-white/[0.08] pb-4">
                  <span className="text-3xl font-extrabold text-white font-mono">{p.price}</span>
                  <span className="text-xs text-white/50">/ {p.period}</span>
                </div>

                <div className="mt-5 space-y-2.5">
                  <span className="cohere-mono-label text-[10px]">CAPABILITIES</span>
                  <ul className="space-y-2">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-white/80">
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.08]">
                {isCurrent ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-full border border-white/20 bg-white/5 py-2 text-xs font-semibold text-white/60 cursor-default"
                    >
                      Active Plan
                    </button>
                    {normalizedCurrentPlan !== "free" && (
                      <button
                        type="button"
                        onClick={openBillingPortal}
                        disabled={loadingAction !== null}
                        className="btn-cohere-outline w-full !py-1.5 text-xs text-center justify-center"
                      >
                        {loadingAction === "portal" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                        <span>Manage Subscription</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => launchCheckout(p.id as PlanTarget)}
                    disabled={!billingEnabled || loadingAction !== null}
                    className={`w-full ${
                      p.highlight
                        ? "btn-cohere-primary"
                        : "btn-cohere-outline"
                    } !py-2.5 text-xs text-center justify-center`}
                  >
                    {loadingAction === p.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Redirecting to Stripe...</span>
                      </>
                    ) : (
                      <>
                        <span>{p.cta}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise SLA Banner */}
      <div className="rounded-xl border border-white/10 bg-[#17171c] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
              <Shield className="h-5 w-5 text-[#ff7759]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Need Custom Limits or On-Premise Vector DB?</h4>
              <p className="text-xs text-white/50">
                Contact our solutions engineering team for self-hosted instances, custom LLM fine-tuning, and dedicated VPC deployments.
              </p>
            </div>
          </div>
          <a
            href="mailto:support@repolens.dev"
            className="btn-cohere-outline !py-2 text-xs shrink-0 self-start sm:self-auto"
          >
            Contact Enterprise Sales
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

type PlanTarget = "pro" | "team";

type BillingActionsProps = {
  billingEnabled: boolean;
  disabledReason?: string;
};

export function BillingActions({ billingEnabled, disabledReason }: BillingActionsProps) {
  const [loadingAction, setLoadingAction] = useState<PlanTarget | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          throw new Error("Billing is currently disabled. Share Lemon Squeezy creds and I can wire it in.");
        }
        throw new Error(data.error || "Unable to start checkout.");
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
          throw new Error("Billing is currently disabled. Share Lemon Squeezy creds and I can wire it in.");
        }
        throw new Error(data.error || "Unable to open billing portal.");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open billing portal. Please try again.");
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-3">
      {!billingEnabled ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          {disabledReason || "Billing is disabled right now. You can continue using Free plan features."}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => launchCheckout("pro")}
          disabled={!billingEnabled || loadingAction !== null}
          className="rounded-lg bg-[#F04D26] px-4 py-2 text-sm font-medium text-white hover:bg-[#de4723] disabled:opacity-50"
        >
          {loadingAction === "pro" ? "Redirecting..." : "Upgrade to Pro"}
        </button>
        <button
          type="button"
          onClick={() => launchCheckout("team")}
          disabled={!billingEnabled || loadingAction !== null}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
        >
          {loadingAction === "team" ? "Redirecting..." : "Upgrade to Team"}
        </button>
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={!billingEnabled || loadingAction !== null}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
        >
          {loadingAction === "portal" ? "Opening..." : "Manage Billing"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

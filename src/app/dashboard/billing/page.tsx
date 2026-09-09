import { createClient } from "@/lib/supabase/server";
import { getStripeClient, isStripeCheckoutConfigured, isStripeConfigured } from "@/lib/stripe";
import { BillingActions } from "./BillingActions";

type BillingView = {
  plan: string;
  nextBillingDate: string | null;
};

async function loadBillingView(userId: string): Promise<BillingView> {
  const supabase = await createClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("plan, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  let nextBillingDate: string | null = null;

  if (userRow?.stripe_customer_id && isStripeConfigured()) {
    try {
      const stripe = getStripeClient();
      const subscriptions = await stripe.subscriptions.list({
        customer: userRow.stripe_customer_id,
        status: "all",
        limit: 1,
      });

      const current = subscriptions.data[0];
      const nextPeriodEnd = current?.items.data[0]?.current_period_end;
      if (nextPeriodEnd) {
        nextBillingDate = new Date(nextPeriodEnd * 1000).toISOString();
      }
    } catch {
      nextBillingDate = null;
    }
  }

  return {
    plan: userRow?.plan || "free",
    nextBillingDate,
  };
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const billing = await loadBillingView(user.id);
  const billingEnabled = isStripeCheckoutConfigured();

  return (
    <section className="space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-white/[0.08] pb-6">
        <span className="cohere-mono-label">WORKSPACE SUBSCRIPTION</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono sm:text-3xl">
          Plans & Resource Tiers
        </h1>
        <p className="mt-1 text-xs text-white/60">
          Scale indexing capacity, private repository sync, and team intelligence capabilities.
        </p>
      </div>

      {/* Active Subscription Bar */}
      <div className="rounded-xl border border-white/10 bg-[#17171c] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="cohere-mono-label text-[10px]">CURRENT ACTIVE PLAN</span>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="text-xl font-bold uppercase tracking-tight text-white font-mono">
                {billing.plan}
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-400">
                Active Tier
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="cohere-mono-label text-[10px]">RENEWAL / CYCLE</span>
              <p className="mt-0.5 text-xs text-white/80 font-mono">
                {billing.nextBillingDate
                  ? new Date(billing.nextBillingDate).toLocaleDateString()
                  : "No scheduled charge (Free)"}
              </p>
            </div>
            <div>
              <span className="cohere-mono-label text-[10px]">ORGANIZATION</span>
              <p className="mt-0.5 text-xs text-white/80 font-mono">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards Component */}
      <BillingActions
        currentPlan={billing.plan}
        nextBillingDate={billing.nextBillingDate}
        billingEnabled={billingEnabled}
        disabledReason={
          billingEnabled
            ? undefined
            : "Billing is operating in preview test mode. You can continue using your account without charge."
        }
      />
    </section>
  );
}


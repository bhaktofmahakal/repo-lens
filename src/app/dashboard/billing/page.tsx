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
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-white/65">Upgrade your plan and manage subscriptions.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111111] p-5">
        <p className="text-sm text-white/60">Current plan</p>
        <p className="mt-1 text-xl font-semibold capitalize">{billing.plan}</p>
        <p className="mt-4 text-sm text-white/60">Next billing date</p>
        <p className="mt-1 text-sm text-white/90">
          {billing.nextBillingDate
            ? new Date(billing.nextBillingDate).toLocaleDateString()
            : "No active subscription"}
        </p>
      </div>

      <BillingActions
        billingEnabled={billingEnabled}
        disabledReason={
          billingEnabled
            ? undefined
            : "Stripe/GitHub billing is paused for now. Share Lemon Squeezy creds and I will switch billing provider."
        }
      />
    </section>
  );
}

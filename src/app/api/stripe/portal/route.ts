import { NextRequest, NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/auth-guard";
import { supabase } from "@/lib/db";
import { config } from "@/lib/config";
import { getStripeClient, isStripeBillingEnabled, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    if (!isStripeBillingEnabled() || !isStripeConfigured()) {
      return NextResponse.json(
        {
          error: "Billing is currently disabled. Configure Stripe or switch to Lemon Squeezy integration.",
          code: "BILLING_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const auth = await requireRequestAuth(req);
    if ("response" in auth) {
      return auth.response;
    }

    const { data: userRow, error } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Unable to load billing profile.", code: "BILLING_PROFILE_ERROR" },
        { status: 500 },
      );
    }

    if (!userRow?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing profile found.", code: "NO_BILLING_PROFILE" },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userRow.stripe_customer_id,
      return_url: `${config.appUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch {
    return NextResponse.json(
      { error: "Failed to create billing portal session.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

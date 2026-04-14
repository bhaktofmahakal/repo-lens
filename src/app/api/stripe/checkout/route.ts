import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestAuth } from "@/lib/auth-guard";
import { supabase } from "@/lib/db";
import { config } from "@/lib/config";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "team"]),
});

type CheckoutRequest = z.infer<typeof checkoutSchema>;

function getPriceId(plan: CheckoutRequest["plan"]): string {
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID;

  if (!proPriceId || !teamPriceId) {
    throw new Error("Missing STRIPE_PRO_PRICE_ID or STRIPE_TEAM_PRICE_ID");
  }

  return plan === "pro" ? proPriceId : teamPriceId;
}

export async function POST(req: NextRequest) {
  try {
    if (!isStripeCheckoutConfigured()) {
      return NextResponse.json(
        {
          error: "Billing is currently unavailable.",
          code: "BILLING_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const auth = await requireRequestAuth(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { plan } = parsed.data;
    const stripe = getStripeClient();

    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id, email, stripe_customer_id")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: "Unable to load billing profile.", code: "BILLING_PROFILE_ERROR" },
        { status: 500 },
      );
    }

    const email = auth.user.email || existingUser?.email;
    if (!email) {
      return NextResponse.json(
        { error: "User email is required for billing.", code: "MISSING_EMAIL" },
        { status: 400 },
      );
    }

    let customerId = existingUser?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          user_id: auth.user.id,
        },
      });
      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("users")
        .upsert({
          id: auth.user.id,
          email,
          stripe_customer_id: customerId,
        });

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update customer profile.", code: "CUSTOMER_SAVE_FAILED" },
          { status: 500 },
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: getPriceId(plan),
          quantity: 1,
        },
      ],
      success_url: `${config.appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${config.appUrl}/dashboard/billing?checkout=cancelled`,
      metadata: {
        user_id: auth.user.id,
        plan,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Unable to create checkout session.", code: "CHECKOUT_URL_MISSING" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Failed to create checkout session.", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

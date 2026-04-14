import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { capturePosthogEvent } from "@/lib/posthog";
import { getStripeClient, isStripeWebhookConfigured } from "@/lib/stripe";

type Plan = "free" | "pro" | "team";

function resolvePlanByPriceId(priceId: string | undefined): Plan {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return "team";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

async function applyPlanByUserId(userId: string, plan: Plan, customerId?: string | null) {
  await supabase
    .from("users")
    .update({
      plan,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })
    .eq("id", userId);
}

async function applyPlanByCustomerId(customerId: string, plan: Plan) {
  await supabase
    .from("users")
    .update({ plan })
    .eq("stripe_customer_id", customerId);
}

async function handleStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = (session.metadata?.plan as Plan | undefined) || "free";

    if (userId) {
      await applyPlanByUserId(userId, plan, typeof session.customer === "string" ? session.customer : null);
      void capturePosthogEvent(userId, {
        event: "plan_upgraded",
        properties: {
          from_plan: "free",
          to_plan: plan,
        },
      });
    }

    return;
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : "";
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = resolvePlanByPriceId(priceId);

    if (customerId) {
      await applyPlanByCustomerId(customerId, plan);
    }

    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : "";

    if (customerId) {
      await applyPlanByCustomerId(customerId, "free");
    }
  }
}

export async function POST(req: NextRequest) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe webhook is disabled or not configured.",
        code: "BILLING_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET", code: "CONFIG_ERROR" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature", code: "MISSING_SIGNATURE" },
      { status: 400 },
    );
  }

  const payload = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe signature", code: "INVALID_SIGNATURE" },
      { status: 400 },
    );
  }

  queueMicrotask(() => {
    void handleStripeEvent(event);
  });

  return NextResponse.json({ received: true });
}

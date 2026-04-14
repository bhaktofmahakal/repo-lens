import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isStripeBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_STRIPE_BILLING === "true";
}

export function isStripeConfigured(): boolean {
  return isNonEmpty(process.env.STRIPE_SECRET_KEY);
}

export function hasStripePriceConfig(): boolean {
  return isNonEmpty(process.env.STRIPE_PRO_PRICE_ID) && isNonEmpty(process.env.STRIPE_TEAM_PRICE_ID);
}

export function isStripeCheckoutConfigured(): boolean {
  return isStripeBillingEnabled() && isStripeConfigured() && hasStripePriceConfig();
}

export function isStripeWebhookConfigured(): boolean {
  return (
    isStripeBillingEnabled() &&
    isStripeConfigured() &&
    isNonEmpty(process.env.STRIPE_WEBHOOK_SECRET)
  );
}

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    const config = {
      apiVersion: "2024-12-18.acacia",
    } as unknown as ConstructorParameters<typeof Stripe>[1];

    stripeClient = new Stripe(secretKey, config);
  }

  return stripeClient;
}

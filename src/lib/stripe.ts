import Stripe from "stripe";
import type { BillingInterval } from "@/generated/prisma/enums";
import type { Plan } from "@/lib/plans";

/**
 * Server-only Stripe integration. Price IDs are read from environment
 * variables (never hardcoded, never trusted from the client) — see
 * README.md for exactly which Stripe Dashboard objects to create and which
 * env vars to set.
 */

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set — billing is not configured.");
  }
  cachedClient = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
  return cachedClient;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export type PaidPlan = Extract<Plan, "PRO" | "PRO_PLUS">;

/** Resolves the Stripe Price ID for a (plan, interval) pair from env vars.
 * The only place that mapping exists — never trust a price ID or plan
 * sent from the client. */
export function resolvePriceId(plan: PaidPlan, interval: BillingInterval): string {
  const key = `STRIPE_${plan}_${interval}_PRICE_ID` as const;
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable ${key} — add it before enabling checkout.`);
  }
  return value;
}

/** The inverse of resolvePriceId, used by the webhook handler to figure out
 * which plan/interval a Stripe subscription's price corresponds to. */
export function planFromPriceId(priceId: string): { plan: PaidPlan; interval: BillingInterval } | null {
  const pairs: [PaidPlan, BillingInterval][] = [
    ["PRO", "MONTHLY"],
    ["PRO", "YEARLY"],
    ["PRO_PLUS", "MONTHLY"],
    ["PRO_PLUS", "YEARLY"],
  ];
  for (const [plan, interval] of pairs) {
    const key = `STRIPE_${plan}_${interval}_PRICE_ID` as const;
    if (process.env[key] === priceId) return { plan, interval };
  }
  return null;
}

/** Finds or creates the Stripe Customer for a user, persisting the ID. */
export async function getOrCreateStripeCustomer(user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  const { db } = await import("@/lib/db");
  await db.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

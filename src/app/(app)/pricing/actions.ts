"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  getStripeClient,
  isStripeConfigured,
  resolvePriceId,
  getOrCreateStripeCustomer,
  type PaidPlan,
} from "@/lib/stripe";
import type { BillingInterval } from "@/generated/prisma/enums";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export type BillingActionResult = { error: string } | { url: string };

function baseUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

/**
 * Creates a Stripe Checkout session for the given plan/interval. The plan
 * and interval are only ever used to look up a real Price ID server-side —
 * the client never supplies (or can influence) an actual price.
 */
export async function createCheckoutSessionAction(
  plan: string,
  interval: string
): Promise<BillingActionResult> {
  const userId = await requireUserId();

  if (!isStripeConfigured()) {
    return {
      error: "Billing isn't configured yet — add STRIPE_SECRET_KEY to the server's environment.",
    };
  }

  if (plan !== "PRO" && plan !== "PRO_PLUS") {
    return { error: "Invalid plan." };
  }
  if (interval !== "MONTHLY" && interval !== "YEARLY") {
    return { error: "Invalid billing interval." };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });

  let priceId: string;
  try {
    priceId = resolvePriceId(plan as PaidPlan, interval as BillingInterval);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Billing is misconfigured." };
  }

  try {
    const customerId = await getOrCreateStripeCustomer(user);
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl()}/billing?checkout=success`,
      cancel_url: `${baseUrl()}/pricing?checkout=canceled`,
      subscription_data: { metadata: { userId } },
      metadata: { userId },
      allow_promotion_codes: true,
    });

    if (!session.url) return { error: "Stripe didn't return a checkout URL. Please try again." };
    return { url: session.url };
  } catch (error) {
    console.error("createCheckoutSessionAction failed:", error);
    return { error: "Couldn't start checkout. Please try again in a moment." };
  }
}

/**
 * Switches an existing paid subscriber directly to a different plan/interval
 * by updating their existing Stripe subscription in place (never creates a
 * second concurrent subscription). Used for Pro -> Pro+ upgrades and
 * monthly <-> yearly switches on the same plan.
 */
export async function changePlanAction(
  plan: string,
  interval: string
): Promise<BillingActionResult> {
  const userId = await requireUserId();

  if (!isStripeConfigured()) {
    return {
      error: "Billing isn't configured yet — add STRIPE_SECRET_KEY to the server's environment.",
    };
  }
  if (plan !== "PRO" && plan !== "PRO_PLUS") {
    return { error: "Invalid plan." };
  }
  if (interval !== "MONTHLY" && interval !== "YEARLY") {
    return { error: "Invalid billing interval." };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });
  if (!user.stripeSubscriptionId) {
    return { error: "You don't have an active subscription to change yet." };
  }

  let priceId: string;
  try {
    priceId = resolvePriceId(plan as PaidPlan, interval as BillingInterval);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Billing is misconfigured." };
  }

  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return { error: "Couldn't find your subscription details. Please try again." };

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
    });

    return { url: `${baseUrl()}/billing?checkout=success` };
  } catch (error) {
    console.error("changePlanAction failed:", error);
    return { error: "Couldn't change your plan. Please try again in a moment." };
  }
}

/** Creates a Stripe Billing Portal session so the user can manage payment
 * method, invoices, and cancellation directly through Stripe. */
export async function createPortalSessionAction(): Promise<BillingActionResult> {
  const userId = await requireUserId();

  if (!isStripeConfigured()) {
    return {
      error: "Billing isn't configured yet — add STRIPE_SECRET_KEY to the server's environment.",
    };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user.stripeCustomerId) {
    return { error: "You don't have a billing account yet — subscribe to a plan first." };
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl()}/billing`,
    });
    return { url: session.url };
  } catch (error) {
    console.error("createPortalSessionAction failed:", error);
    return { error: "Couldn't open the billing portal. Please try again in a moment." };
  }
}

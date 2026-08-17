"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  isLemonSqueezyConfigured,
  resolveVariantId,
  createCheckout,
  getSubscription,
  updateSubscriptionVariant,
  type PaidPlan,
} from "@/lib/lemonsqueezy";
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
 * Creates a Lemon Squeezy Checkout for the given plan/interval. The plan and
 * interval are only ever used to look up a real Variant ID server-side —
 * the client never supplies (or can influence) an actual price.
 */
export async function createCheckoutSessionAction(
  plan: string,
  interval: string
): Promise<BillingActionResult> {
  const userId = await requireUserId();

  if (!isLemonSqueezyConfigured()) {
    return {
      error: "Billing isn't configured yet — add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID to the server's environment.",
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
    select: { id: true, email: true },
  });

  let variantId: string;
  try {
    variantId = resolveVariantId(plan as PaidPlan, interval as BillingInterval);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Billing is misconfigured." };
  }

  try {
    const { url } = await createCheckout({
      variantId,
      userId,
      email: user.email,
      redirectUrl: `${baseUrl()}/billing?checkout=success`,
    });
    return { url };
  } catch (error) {
    console.error("createCheckoutSessionAction failed:", error);
    return { error: "Couldn't start checkout. Please try again in a moment." };
  }
}

/**
 * Switches an existing paid subscriber directly to a different plan/interval
 * by updating their existing Lemon Squeezy subscription in place (never
 * creates a second concurrent subscription). Used for Pro -> Pro+ upgrades
 * and monthly <-> yearly switches on the same plan.
 */
export async function changePlanAction(
  plan: string,
  interval: string
): Promise<BillingActionResult> {
  const userId = await requireUserId();

  if (!isLemonSqueezyConfigured()) {
    return {
      error: "Billing isn't configured yet — add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID to the server's environment.",
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
    select: { lemonSqueezySubscriptionId: true },
  });
  if (!user.lemonSqueezySubscriptionId) {
    return { error: "You don't have an active subscription to change yet." };
  }

  let variantId: string;
  try {
    variantId = resolveVariantId(plan as PaidPlan, interval as BillingInterval);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Billing is misconfigured." };
  }

  try {
    await updateSubscriptionVariant(user.lemonSqueezySubscriptionId, variantId);
    return { url: `${baseUrl()}/billing?checkout=success` };
  } catch (error) {
    console.error("changePlanAction failed:", error);
    return { error: "Couldn't change your plan. Please try again in a moment." };
  }
}

/** Returns Lemon Squeezy's hosted customer portal URL for the user's
 * subscription, so they can manage payment method, invoices, and
 * cancellation directly through Lemon Squeezy. Unlike Stripe, there's no
 * separate "create a portal session" call — the portal URL is a signed URL
 * on the subscription object itself, refreshed on every fetch since it
 * expires after 24h. */
export async function createPortalSessionAction(): Promise<BillingActionResult> {
  const userId = await requireUserId();

  if (!isLemonSqueezyConfigured()) {
    return {
      error: "Billing isn't configured yet — add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID to the server's environment.",
    };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lemonSqueezySubscriptionId: true },
  });

  if (!user.lemonSqueezySubscriptionId) {
    return { error: "You don't have a billing account yet — subscribe to a plan first." };
  }

  try {
    const subscription = await getSubscription(user.lemonSqueezySubscriptionId);
    return { url: subscription.attributes.urls.customer_portal };
  } catch (error) {
    console.error("createPortalSessionAction failed:", error);
    return { error: "Couldn't open the billing portal. Please try again in a moment." };
  }
}

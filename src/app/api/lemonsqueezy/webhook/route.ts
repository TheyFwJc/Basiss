import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSubscription, variantIdToPlan, type LemonSqueezySubscription } from "@/lib/lemonsqueezy";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * Lemon Squeezy webhook — the single place subscription state is written
 * from Lemon Squeezy into our database. The database row is the source of
 * truth for feature access everywhere else in the app; nothing here trusts
 * anything the client claims about its own plan.
 *
 * Idempotent via LemonSqueezyWebhookEvent: unlike Stripe, Lemon Squeezy
 * webhook payloads don't carry a stable per-event ID, so the dedupe key is a
 * hash of (event name + raw body) — same pattern as the TradingView webhook.
 * A redelivered event either no-ops (already recorded) or safely reprocesses
 * (if the first attempt failed before recording).
 */

type SubscriptionStatusValue = LemonSqueezySubscription["attributes"]["status"];
type PauseValue = LemonSqueezySubscription["attributes"]["pause"];

function mapLemonSqueezyStatus(status: SubscriptionStatusValue, pause: PauseValue): SubscriptionStatus {
  switch (status) {
    case "on_trial":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    // A "free" pause keeps the customer's access with no charge; a "void"
    // pause means we can't serve them during the pause. Neither has a
    // dedicated slot in our SubscriptionStatus enum, so map to the closest
    // access-equivalent status instead of adding a rarely-used PAUSED value.
    case "paused":
      return pause?.mode === "free" ? "ACTIVE" : "UNPAID";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    // Both "cancelled" (mid-grace-period) and "expired" (grace period over)
    // map to CANCELED — getEffectivePlan() already gates access on
    // currentPeriodEnd, so the same status value correctly grants access
    // during the grace period and revokes it once ends_at has passed.
    case "cancelled":
    case "expired":
      return "CANCELED";
    default:
      return "UNPAID";
  }
}

/** Writes a Lemon Squeezy subscription's current state onto whichever user
 * it belongs to (matched by customer ID, falling back to the userId passed
 * through checkout's custom data). No-ops if no matching user is found
 * rather than throwing, since that's a data issue redelivery won't fix. */
async function syncSubscription(subscription: LemonSqueezySubscription, fallbackUserId?: string) {
  const customerId = String(subscription.attributes.customer_id);

  const user = await db.user.findFirst({
    where: {
      OR: [
        { lemonSqueezyCustomerId: customerId },
        ...(fallbackUserId ? [{ id: fallbackUserId }] : []),
      ],
    },
    select: { id: true, subscriptionStartedAt: true, subscriptionStatus: true },
  });
  if (!user) return;

  const resolved = variantIdToPlan(String(subscription.attributes.variant_id));
  const status = mapLemonSqueezyStatus(subscription.attributes.status, subscription.attributes.pause);

  // ends_at is set once a subscription is cancelled/expiring — it's the
  // grace-period end date. While active, renews_at is the next billing date.
  // Preferring ends_at when present mirrors Stripe's single
  // current_period_end field serving both purposes.
  const currentPeriodEnd = subscription.attributes.ends_at
    ? new Date(subscription.attributes.ends_at)
    : subscription.attributes.renews_at
      ? new Date(subscription.attributes.renews_at)
      : null;

  const justCancelled = subscription.attributes.cancelled && user.subscriptionStatus !== "CANCELED";

  await db.user.update({
    where: { id: user.id },
    data: {
      lemonSqueezyCustomerId: customerId,
      lemonSqueezySubscriptionId: subscription.id,
      ...(resolved ? { subscriptionPlan: resolved.plan, billingInterval: resolved.interval } : {}),
      subscriptionStatus: status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.attributes.cancelled,
      subscriptionStartedAt: user.subscriptionStartedAt ?? new Date(subscription.attributes.created_at),
      // Lemon Squeezy doesn't expose the original cancellation timestamp
      // (only a `cancelled` boolean), so this is a best-effort "first time
      // we observed it" timestamp rather than the exact moment requested.
      ...(justCancelled ? { subscriptionCanceledAt: new Date() } : {}),
    },
  });
}

/** Payment-related events (`subscription_payment_*`) carry a Subscription
 * Invoice object, not the Subscription itself — re-fetch the full
 * subscription by ID and reuse the same sync path, mirroring how the old
 * Stripe webhook handled `invoice.paid`/`invoice.payment_failed`. */
async function handlePaymentEvent(invoiceAttributes: { subscription_id: number }) {
  const subscription = await getSubscription(String(invoiceAttributes.subscription_id));
  await syncSubscription(subscription);
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const digest = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(signatureHeader, "utf8");
  if (digest.length !== signature.length) return false;
  return timingSafeEqual(digest, signature);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Lemon Squeezy webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-signature");

  if (!verifySignature(rawBody, signatureHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let payload: {
    meta: { event_name: string; custom_data?: { user_id?: string } };
    data: { type: string; id: string; attributes: Record<string, unknown> };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventName = payload.meta.event_name;
  const eventId = createHash("sha256").update(`${eventName}:${rawBody}`).digest("hex");

  const alreadyProcessed = await db.lemonSqueezyWebhookEvent.findUnique({ where: { id: eventId } });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_cancelled":
      case "subscription_resumed":
      case "subscription_expired":
      case "subscription_paused":
      case "subscription_unpaused": {
        const subscription = payload.data as unknown as LemonSqueezySubscription;
        await syncSubscription(subscription, payload.meta.custom_data?.user_id);
        break;
      }
      case "subscription_payment_success":
      case "subscription_payment_failed":
      case "subscription_payment_recovered": {
        const attributes = payload.data.attributes as { subscription_id: number };
        await handlePaymentEvent(attributes);
        break;
      }
      default:
        break;
    }

    await db.lemonSqueezyWebhookEvent.create({ data: { id: eventId, type: eventName } });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Lemon Squeezy webhook handling failed for event ${eventName}:`, error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

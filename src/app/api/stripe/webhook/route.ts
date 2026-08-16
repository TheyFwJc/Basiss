import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient, isStripeConfigured, planFromPriceId } from "@/lib/stripe";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * Stripe webhook — the single place subscription state is written from
 * Stripe into our database. The database row is the source of truth for
 * feature access everywhere else in the app; nothing here trusts anything
 * the client claims about its own plan.
 *
 * Idempotent via StripeWebhookEvent: each Stripe event ID is recorded only
 * after it's been successfully handled, so a redelivered event either
 * no-ops (already recorded) or safely reprocesses (if the first attempt
 * failed before recording).
 */

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
      return "INCOMPLETE";
    case "unpaid":
    case "paused":
    default:
      return "UNPAID";
  }
}

/** Writes a Stripe subscription's current state onto whichever user it
 * belongs to (matched by Stripe customer ID, falling back to the userId
 * stashed in metadata at checkout time). No-ops if no matching user is
 * found rather than throwing, since that's a data issue Stripe retrying
 * won't fix. */
async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const metadataUserId = subscription.metadata?.userId;

  const user = await db.user.findFirst({
    where: {
      OR: [
        { stripeCustomerId: customerId },
        ...(metadataUserId ? [{ id: metadataUserId }] : []),
      ],
    },
    select: { id: true, subscriptionStartedAt: true },
  });
  if (!user) return;

  const item = subscription.items.data[0];
  const resolved = item ? planFromPriceId(item.price.id) : null;
  const currentPeriodEnd = item ? new Date(item.current_period_end * 1000) : null;
  const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null;
  const status = mapStripeStatus(subscription.status);

  await db.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      ...(resolved
        ? { subscriptionPlan: resolved.plan, billingInterval: resolved.interval }
        : {}),
      subscriptionStatus: status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      subscriptionStartedAt: user.subscriptionStartedAt ?? new Date(subscription.start_date * 1000),
      subscriptionCanceledAt: canceledAt,
    },
  });
}

/** Explicit final-downgrade path for when Stripe actually deletes the
 * subscription object (immediate cancellation, or the scheduled
 * cancellation finally taking effect) — belt-and-suspenders alongside the
 * grace-period logic in getEffectivePlan(). */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) return;

  await db.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "CANCELED",
      subscriptionCanceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date(),
    },
  });
}

async function handleInvoiceEvent(invoice: Stripe.Invoice) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef) return;
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription);
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const alreadyProcessed = await db.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        await handleInvoiceEvent(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        break;
    }

    await db.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook handling failed for event ${event.id} (${event.type}):`, error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

import type { BillingInterval } from "@/generated/prisma/enums";
import type { Plan } from "@/lib/plans";

/**
 * Server-only Lemon Squeezy integration. Lemon Squeezy is the merchant of
 * record (it collects/remits sales tax and VAT itself, unlike a raw Stripe
 * integration), so there's no tax registration to manage here. Variant IDs
 * are read from environment variables (never hardcoded, never trusted from
 * the client) — see README.md for exactly which Lemon Squeezy Dashboard
 * objects to create and which env vars to set.
 *
 * No official SDK is used — this is a thin `fetch` wrapper over their
 * JSON:API, which keeps the surface area small and easy to reason about.
 */

const API_BASE = "https://api.lemonsqueezy.com/v1";

export function isLemonSqueezyConfigured(): boolean {
  return !!process.env.LEMONSQUEEZY_API_KEY && !!process.env.LEMONSQUEEZY_STORE_ID;
}

function requireApiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) {
    throw new Error("LEMONSQUEEZY_API_KEY is not set — billing is not configured.");
  }
  return key;
}

function requireStoreId(): string {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error("LEMONSQUEEZY_STORE_ID is not set — billing is not configured.");
  }
  return storeId;
}

async function lsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${requireApiKey()}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Lemon Squeezy API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

export type PaidPlan = Extract<Plan, "PRO" | "PRO_PLUS">;

/** Resolves the Lemon Squeezy Variant ID for a (plan, interval) pair from
 * env vars. The only place that mapping exists — never trust a variant ID
 * sent from the client. */
export function resolveVariantId(plan: PaidPlan, interval: BillingInterval): string {
  const key = `LEMONSQUEEZY_${plan}_${interval}_VARIANT_ID` as const;
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable ${key} — add it before enabling checkout.`);
  }
  return value;
}

/** The inverse of resolveVariantId, used by the webhook handler to figure
 * out which plan/interval a Lemon Squeezy subscription's variant corresponds
 * to. */
export function variantIdToPlan(variantId: string): { plan: PaidPlan; interval: BillingInterval } | null {
  const pairs: [PaidPlan, BillingInterval][] = [
    ["PRO", "MONTHLY"],
    ["PRO", "YEARLY"],
    ["PRO_PLUS", "MONTHLY"],
    ["PRO_PLUS", "YEARLY"],
  ];
  for (const [plan, interval] of pairs) {
    const key = `LEMONSQUEEZY_${plan}_${interval}_VARIANT_ID` as const;
    if (process.env[key] === variantId) return { plan, interval };
  }
  return null;
}

export type LemonSqueezySubscription = {
  type: "subscriptions";
  id: string;
  attributes: {
    store_id: number;
    customer_id: number;
    order_id: number;
    variant_id: number;
    status: "on_trial" | "active" | "paused" | "past_due" | "unpaid" | "cancelled" | "expired";
    cancelled: boolean;
    pause: { mode: "free" | "void"; resumes_at: string | null } | null;
    renews_at: string | null;
    ends_at: string | null;
    created_at: string;
    updated_at: string;
    urls: {
      update_payment_method: string;
      customer_portal: string;
      customer_portal_update_subscription?: string;
    };
    test_mode: boolean;
  };
};

/** Creates a hosted Checkout for a subscription variant. Unlike Stripe,
 * there's no separate "create a customer" step — Lemon Squeezy creates (or
 * matches, by email) the customer automatically on successful purchase, and
 * its ID arrives via the subscription_created webhook. `userId` is passed
 * through as custom checkout data so the webhook handler can match the
 * resulting subscription back to a user even before a stored
 * lemonSqueezyCustomerId exists. */
export async function createCheckout(options: {
  variantId: string;
  userId: string;
  email: string;
  redirectUrl: string;
}): Promise<{ url: string }> {
  const storeId = requireStoreId();

  const result = await lsFetch<{ data: { attributes: { url: string } } }>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          product_options: { redirect_url: options.redirectUrl },
          checkout_data: {
            email: options.email,
            custom: { user_id: options.userId },
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: options.variantId } },
        },
      },
    }),
  });

  return { url: result.data.attributes.url };
}

/** Fetches a subscription's current state — including a freshly-signed
 * `urls.customer_portal` (portal URLs expire after 24h, so this must be
 * called fresh each time rather than caching a stored URL). */
export async function getSubscription(subscriptionId: string): Promise<LemonSqueezySubscription> {
  const result = await lsFetch<{ data: LemonSqueezySubscription }>(`/subscriptions/${subscriptionId}`);
  return result.data;
}

/** Switches a subscription to a different variant (plan/interval), in
 * place — Lemon Squeezy prorates by default, matching how Stripe's
 * `proration_behavior: "create_prorations"` is used elsewhere in this app. */
export async function updateSubscriptionVariant(
  subscriptionId: string,
  variantId: string
): Promise<LemonSqueezySubscription> {
  const result = await lsFetch<{ data: LemonSqueezySubscription }>(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        type: "subscriptions",
        id: subscriptionId,
        attributes: { variant_id: Number(variantId) },
      },
    }),
  });
  return result.data;
}

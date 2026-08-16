/**
 * Centralized plan/feature configuration — the single place pricing,
 * feature gates, and the free trade limit are defined. Change a price or
 * the trade limit here; nothing else should hardcode these values.
 *
 * Deliberately pure/DB-free so it's cheap to unit test and safe to import
 * from both server and client code. DB-touching subscription lookups live
 * in src/lib/subscription.ts.
 */

export type Plan = "FREE" | "PRO" | "PRO_PLUS";

/** How many trades a Free-plan user may create per calendar month. Existing
 * trades are never hidden or deleted when this is reached or lowered. */
export const FREE_TRADE_LIMIT = 50;

export const PLAN_RANK: Record<Plan, number> = {
  FREE: 0,
  PRO: 1,
  PRO_PLUS: 2,
};

/** True if `current` grants at least as much access as `required`. */
export function hasPlan(current: Plan, required: Plan): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export const FEATURES = {
  UNLIMITED_TRADES: "PRO",
  ADVANCED_ANALYTICS: "PRO",
  SCREENSHOTS: "PRO",
  ADVANCED_DASHBOARD_STATS: "PRO",
  STRATEGY_ANALYTICS: "PRO",
  CALENDAR_WEEKLY_MONTHLY: "PRO",
  AI_INSIGHTS: "PRO_PLUS",
} as const satisfies Record<string, Plan>;

export type FeatureKey = keyof typeof FEATURES;

/** True if `current` unlocks the given feature. */
export function hasFeature(current: Plan, feature: FeatureKey): boolean {
  return hasPlan(current, FEATURES[feature]);
}

export type PlanDefinition = {
  id: Plan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
};

export const PLANS: Record<Plan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "Get started journaling your trades.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Basic dashboard",
      `Up to ${FREE_TRADE_LIMIT} trades / month`,
      "Basic P&L tracking",
      "Basic win/loss statistics",
      "Basic trade history",
      "Basic account settings",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "For traders who want the full picture.",
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
    features: [
      "Unlimited trades",
      "Full P&L tracking",
      "Advanced analytics & filters",
      "Trade screenshots",
      "Profit factor, expectancy, avg win/loss, avg R",
      "Maximum drawdown",
      "Daily, weekly & monthly performance",
      "Strategy analytics",
      "Detailed dashboard statistics",
    ],
  },
  PRO_PLUS: {
    id: "PRO_PLUS",
    name: "Pro+",
    tagline: "Everything in Pro, plus AI-assisted analysis.",
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
    features: [
      "Everything in Pro",
      "AI-powered trade analysis",
      "Advanced performance breakdowns",
      "Detailed trading reports",
      "Strategy performance comparisons",
      "Advanced behavioral insights",
      "Early access to new premium features",
    ],
  },
};

/** Rounded-up percent saved by paying yearly instead of 12x monthly. */
export function yearlySavingsPercent(plan: PlanDefinition): number {
  if (plan.monthlyPrice <= 0) return 0;
  const yearlyAtMonthlyRate = plan.monthlyPrice * 12;
  return Math.round((1 - plan.yearlyPrice / yearlyAtMonthlyRate) * 100);
}

export type SubscriptionStatusValue =
  | "FREE"
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "UNPAID";

export type SubscriptionSnapshot = {
  plan: Plan;
  status: SubscriptionStatusValue;
  currentPeriodEnd: Date | null;
};

/**
 * The plan a user actually has access to right now — Stripe's subscription
 * status is the source of truth, not just the stored `plan` column.
 *
 * - active/trialing/past_due: full access to the stored plan (past_due
 *   still grants access — Stripe is still retrying the charge; we only
 *   drop access once Stripe itself moves the subscription to canceled or
 *   unpaid).
 * - canceled: still grants access until the already-paid period ends —
 *   cancellation takes effect at the end of the billing period, not
 *   immediately.
 * - incomplete/unpaid/free: no paid access.
 */
export function getEffectivePlan(
  sub: SubscriptionSnapshot,
  now: Date = new Date()
): Plan {
  if (sub.plan === "FREE") return "FREE";

  if (sub.status === "ACTIVE" || sub.status === "TRIALING" || sub.status === "PAST_DUE") {
    return sub.plan;
  }

  if (sub.status === "CANCELED") {
    if (sub.currentPeriodEnd && sub.currentPeriodEnd > now) return sub.plan;
    return "FREE";
  }

  return "FREE";
}

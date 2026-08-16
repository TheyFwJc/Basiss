import { startOfMonth } from "date-fns";
import { db } from "@/lib/db";
import {
  getEffectivePlan,
  hasFeature,
  FREE_TRADE_LIMIT,
  type Plan,
  type FeatureKey,
  type SubscriptionSnapshot,
} from "@/lib/plans";

export type UserSubscription = SubscriptionSnapshot & {
  effectivePlan: Plan;
  billingInterval: "MONTHLY" | "YEARLY" | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
};

const SUBSCRIPTION_SELECT = {
  subscriptionPlan: true,
  subscriptionStatus: true,
  billingInterval: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  stripeCustomerId: true,
} as const;

/** The single place a user's current subscription snapshot is read — every
 * page/action that needs plan/feature access should go through this (or
 * `canUseFeature`/`canAddTrade` below), never re-derive it ad hoc. */
export async function getSubscription(userId: string): Promise<UserSubscription> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: SUBSCRIPTION_SELECT,
  });

  return {
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    billingInterval: user.billingInterval,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    stripeCustomerId: user.stripeCustomerId,
    effectivePlan: getEffectivePlan({
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
    }),
  };
}

/** Server-side feature check — always gate protected functionality with
 * this (or `requireFeature`), never trust a client-supplied plan. */
export async function canUseFeature(userId: string, feature: FeatureKey): Promise<boolean> {
  const { effectivePlan } = await getSubscription(userId);
  return hasFeature(effectivePlan, feature);
}

/** Throws if the user's current plan doesn't unlock `feature` — for Server
 * Actions that should hard-fail rather than silently no-op. */
export async function requireFeature(userId: string, feature: FeatureKey): Promise<void> {
  if (!(await canUseFeature(userId, feature))) {
    throw new Error(`This feature requires a higher plan.`);
  }
}

export type TradeLimitCheck = { allowed: boolean; count: number; limit: number | null };

/** Free-plan users are capped at FREE_TRADE_LIMIT trades created per
 * calendar month (by `createdAt`, not the trade's own date — this is a
 * logging-activity limit, so backdated/imported trades count the same as
 * trades entered live). Paid plans are always unlimited. */
export async function canAddTrade(userId: string): Promise<TradeLimitCheck> {
  const { effectivePlan } = await getSubscription(userId);
  if (effectivePlan !== "FREE") return { allowed: true, count: 0, limit: null };

  const count = await db.trade.count({
    where: { userId, createdAt: { gte: startOfMonth(new Date()) } },
  });
  return { allowed: count < FREE_TRADE_LIMIT, count, limit: FREE_TRADE_LIMIT };
}

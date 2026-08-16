/**
 * Pure "does this condition currently hold" checks for each notification
 * type. Each takes already-computed primitives (not raw DB rows) and
 * returns a candidate to upsert, or null. Kept separate from the
 * DB-touching generation step (in the (app) route's server actions) so
 * the logic itself is deterministic and unit-testable, same rule as
 * pnl.ts/metrics.ts/analytics.ts.
 */

export type NotificationCandidate = {
  type:
    | "DAILY_LOSS_LIMIT"
    | "WEEKLY_DRAWDOWN"
    | "MISSING_JOURNAL"
    | "REVIEW_REMINDER"
    | "RISK_LIMIT"
    | "WEEKLY_REVIEW";
  message: string;
  dedupeKey: string;
};

/** Fires once per calendar day the first time today's realized loss reaches the daily limit. */
export function checkDailyLossLimit(params: {
  dateKey: string;
  todayPnl: number;
  limitAmount: number | null;
}): NotificationCandidate | null {
  const { dateKey, todayPnl, limitAmount } = params;
  if (limitAmount == null || limitAmount <= 0) return null;
  if (-todayPnl < limitAmount) return null;
  return {
    type: "DAILY_LOSS_LIMIT",
    message: "You've hit your daily loss limit — consider stepping away for the rest of the day.",
    dedupeKey: `daily-loss:${dateKey}`,
  };
}

/** Fires once per calendar week the first time this week's realized loss reaches the weekly limit. */
export function checkWeeklyDrawdown(params: {
  weekStartKey: string;
  weekPnl: number;
  limitAmount: number | null;
}): NotificationCandidate | null {
  const { weekStartKey, weekPnl, limitAmount } = params;
  if (limitAmount == null || limitAmount <= 0) return null;
  if (-weekPnl < limitAmount) return null;
  return {
    type: "WEEKLY_DRAWDOWN",
    message: "You've hit your weekly loss limit — consider reducing size or pausing until next week.",
    dedupeKey: `weekly-loss:${weekStartKey}`,
  };
}

/** Fires once for a given past day if it had no journal entry — only checked for days that have already ended. */
export function checkMissingJournal(params: {
  dateKey: string;
  hadEntry: boolean;
}): NotificationCandidate | null {
  if (params.hadEntry) return null;
  return {
    type: "MISSING_JOURNAL",
    message: `No journal entry for ${params.dateKey} — log a quick recap while it's fresh.`,
    dedupeKey: `missing-journal:${params.dateKey}`,
  };
}

/** Fires once per week when there are closed trades from the last 7 days with no review written. */
export function checkReviewReminder(params: {
  weekStartKey: string;
  unreviewedCount: number;
}): NotificationCandidate | null {
  if (params.unreviewedCount <= 0) return null;
  return {
    type: "REVIEW_REMINDER",
    message: `You have ${params.unreviewedCount} closed trade${
      params.unreviewedCount === 1 ? "" : "s"
    } from this week without a review.`,
    dedupeKey: `review-reminder:${params.weekStartKey}`,
  };
}

/** Fires once per trade whose risk-per-trade exceeded the user's own default risk rule. */
export function checkRiskLimit(params: {
  tradeId: string;
  symbol: string;
  riskPercent: number | null;
  defaultRiskPerTradePct: number | null;
}): NotificationCandidate | null {
  const { tradeId, symbol, riskPercent, defaultRiskPerTradePct } = params;
  if (riskPercent == null || defaultRiskPerTradePct == null) return null;
  if (riskPercent <= defaultRiskPerTradePct) return null;
  return {
    type: "RISK_LIMIT",
    message: `${symbol} risked ${riskPercent.toFixed(2)}% — above your ${defaultRiskPerTradePct}% default risk per trade.`,
    dedupeKey: `risk-limit:${tradeId}`,
  };
}

/** A once-a-week nudge to review overall performance, independent of any specific trade. */
export function checkWeeklyReview(params: {
  weekStartKey: string;
  closedTradeCount: number;
}): NotificationCandidate | null {
  if (params.closedTradeCount <= 0) return null;
  return {
    type: "WEEKLY_REVIEW",
    message: "Your week's trades are in — check Analytics for how it went.",
    dedupeKey: `weekly-review:${params.weekStartKey}`,
  };
}

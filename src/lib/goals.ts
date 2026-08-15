import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { computeWinLossStats, computeRStats, type MetricsTrade } from "./metrics";

/**
 * Progress engine for process Goals — one place computing "how am I doing
 * against this goal right now", parallel to how pnl.ts/metrics.ts own their
 * formulas.
 */

export type GoalMetric =
  | "MAX_DAILY_LOSS"
  | "MONTHLY_PNL_TARGET"
  | "TRADE_COUNT"
  | "WIN_RATE"
  | "AVERAGE_R"
  | "RULE_FOLLOWING";

export type GoalPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type GoalTrade = MetricsTrade & { ruleAdherence: number | null };

export function periodWindow(period: GoalPeriod, now: Date) {
  switch (period) {
    case "DAILY":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "WEEKLY":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "MONTHLY":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "YEARLY":
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

export type GoalProgress = {
  /** The metric's current value over the goal's period. */
  actual: number;
  target: number;
  /** 0-100, clamped — how close `actual` is to `target` in the goal's favorable direction. */
  progressPct: number;
  achieved: boolean;
};

/**
 * MAX_DAILY_LOSS is the one metric where lower is better (a loss ceiling
 * not to exceed) — every other metric is a floor to reach or beat.
 */
function isLowerBetter(metric: GoalMetric) {
  return metric === "MAX_DAILY_LOSS";
}

export function computeGoalProgress(
  goal: { metric: GoalMetric; period: GoalPeriod; targetValue: number },
  trades: GoalTrade[],
  now: Date
): GoalProgress {
  const { start, end } = periodWindow(goal.period, now);
  const target = goal.targetValue;
  const inWindow = trades.filter(
    (t) => t.status === "CLOSED" && t.exitAt && t.exitAt >= start && t.exitAt <= end
  );

  let actual = 0;

  switch (goal.metric) {
    case "MAX_DAILY_LOSS": {
      const pnl = inWindow.reduce(
        (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
        0
      );
      actual = Math.max(0, -pnl);
      break;
    }
    case "MONTHLY_PNL_TARGET": {
      actual = inWindow.reduce(
        (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
        0
      );
      break;
    }
    case "TRADE_COUNT": {
      actual = inWindow.length;
      break;
    }
    case "WIN_RATE": {
      actual = computeWinLossStats(inWindow).winRate ?? 0;
      break;
    }
    case "AVERAGE_R": {
      const avgR = computeRStats(inWindow).avgR;
      actual = avgR ? Number(avgR) : 0;
      break;
    }
    case "RULE_FOLLOWING": {
      const rated = inWindow.filter((t) => t.ruleAdherence != null);
      actual =
        rated.length > 0
          ? rated.reduce((sum, t) => sum + (t.ruleAdherence ?? 0), 0) / rated.length
          : 0;
      break;
    }
  }

  const lowerIsBetter = isLowerBetter(goal.metric);
  const achieved = lowerIsBetter ? actual <= target : actual >= target;
  const progressPct =
    target > 0 ? Math.min(100, Math.max(0, actual) / target * 100) : 0;

  return { actual, target, progressPct, achieved };
}

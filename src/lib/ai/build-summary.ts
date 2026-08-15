import Decimal from "decimal.js";
import {
  computeWinLossStats,
  computeProfitStats,
  computeRStats,
  computeStreaks,
  buildEquityCurve,
  computeMaxDrawdown,
} from "@/lib/metrics";
import {
  groupBySymbol,
  groupByStrategy,
  groupBySession,
  groupByDayOfWeek,
  groupByHourOfDay,
  groupByHoldingTime,
  groupByRisk,
  computeMistakeCost,
  groupByRating,
  type AnalyticsTrade,
  type DimensionGroup,
} from "@/lib/analytics";
import { computeGoalProgress, type GoalMetric, type GoalPeriod } from "@/lib/goals";

/**
 * Builds the compact, aggregated JSON payload sent to the LLM for AI-assisted
 * analysis — deliberately statistics-only (win rates, breakdowns, costs),
 * never raw trade-by-trade rows. Reuses the same engines the Analytics/Goals
 * pages already compute from, so the numbers Claude sees always match what
 * the user sees on screen.
 */

function round(n: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function money(d: Decimal): number {
  return round(d.toNumber());
}

type GroupRow = { label: string; trades: number; winRate: number | null; netPnl: number; avgR: number | null };

function toGroupRow(g: DimensionGroup): GroupRow {
  return {
    label: g.label,
    trades: g.count,
    winRate: g.count > 0 ? round((g.wins / g.count) * 100, 0) : null,
    netPnl: money(g.netPnl),
    avgR: g.avgR ? round(g.avgR.toNumber()) : null,
  };
}

export type TradingSummary = {
  totalClosedTrades: number;
  overall: {
    netPnl: number;
    winRate: number | null;
    profitFactor: number | null;
    expectancy: number | null;
    avgWin: number | null;
    avgLoss: number | null;
    avgR: number | null;
    maxDrawdownPct: number;
  };
  streaks: { currentType: "WIN" | "LOSS" | null; currentCount: number; bestWinStreak: number; worstLossStreak: number };
  topSymbolsByPnl: GroupRow[];
  bottomSymbolsByPnl: GroupRow[];
  byStrategy: GroupRow[];
  bySession: GroupRow[];
  byDayOfWeek: GroupRow[];
  byHourOfDay: GroupRow[];
  byHoldingTime: GroupRow[];
  byRiskPerTrade: GroupRow[];
  mistakeCosts: { mistake: string; trades: number; netPnl: number }[];
  psychology: {
    confidence: { rating: number; trades: number; winRate: number | null; netPnl: number }[];
    executionQuality: { rating: number; trades: number; winRate: number | null; netPnl: number }[];
    ruleAdherence: { rating: number; trades: number; winRate: number | null; netPnl: number }[];
  };
  goals: { metric: GoalMetric; period: GoalPeriod; target: number; actual: number; achieved: boolean }[];
};

export function buildTradingSummary(
  trades: AnalyticsTrade[],
  goalRows: { metric: GoalMetric; period: GoalPeriod; targetValue: number }[],
  totalStartingBalance: number,
  now: Date
): TradingSummary {
  const winLoss = computeWinLossStats(trades);
  const profit = computeProfitStats(trades);
  const rStats = computeRStats(trades);
  const streaks = computeStreaks(trades);
  const equityCurve = buildEquityCurve(totalStartingBalance, trades);
  const drawdown = computeMaxDrawdown(equityCurve);

  const bySymbol = groupBySymbol(trades);
  const topSymbols = bySymbol.slice(0, 5).map(toGroupRow);
  const bottomSymbolKeys = new Set(topSymbols.map((s) => s.label));
  const bottomSymbols = bySymbol
    .slice(-5)
    .reverse()
    .filter((g) => !bottomSymbolKeys.has(g.label))
    .map(toGroupRow);

  return {
    totalClosedTrades: winLoss.closedTrades,
    overall: {
      netPnl: money(profit.netPnl),
      winRate: winLoss.winRate != null ? round(winLoss.winRate, 0) : null,
      profitFactor: profit.profitFactor ? round(profit.profitFactor.toNumber()) : null,
      expectancy: profit.expectancy ? money(profit.expectancy) : null,
      avgWin: profit.avgWin ? money(profit.avgWin) : null,
      avgLoss: profit.avgLoss ? money(profit.avgLoss) : null,
      avgR: rStats.avgR ? round(rStats.avgR.toNumber()) : null,
      maxDrawdownPct: round(drawdown.maxDrawdownPercent.toNumber()),
    },
    streaks: {
      currentType: streaks.current.type,
      currentCount: streaks.current.count,
      bestWinStreak: streaks.bestWinStreak,
      worstLossStreak: streaks.worstLossStreak,
    },
    topSymbolsByPnl: topSymbols,
    bottomSymbolsByPnl: bottomSymbols,
    byStrategy: groupByStrategy(trades).slice(0, 10).map(toGroupRow),
    bySession: groupBySession(trades).slice(0, 10).map(toGroupRow),
    byDayOfWeek: groupByDayOfWeek(trades).map(toGroupRow),
    byHourOfDay: groupByHourOfDay(trades).slice(0, 10).map(toGroupRow),
    byHoldingTime: groupByHoldingTime(trades).map(toGroupRow),
    byRiskPerTrade: groupByRisk(trades).map(toGroupRow),
    mistakeCosts: computeMistakeCost(trades)
      .slice(0, 10)
      .map((c) => ({ mistake: c.name, trades: c.count, netPnl: money(c.netPnl) })),
    psychology: {
      confidence: groupByRating(trades, (t) => t.confidence).map((r) => ({
        rating: r.rating,
        trades: r.count,
        winRate: r.winRate != null ? round(r.winRate, 0) : null,
        netPnl: money(r.netPnl),
      })),
      executionQuality: groupByRating(trades, (t) => t.executionRating).map((r) => ({
        rating: r.rating,
        trades: r.count,
        winRate: r.winRate != null ? round(r.winRate, 0) : null,
        netPnl: money(r.netPnl),
      })),
      ruleAdherence: groupByRating(trades, (t) => t.ruleAdherence).map((r) => ({
        rating: r.rating,
        trades: r.count,
        winRate: r.winRate != null ? round(r.winRate, 0) : null,
        netPnl: money(r.netPnl),
      })),
    },
    goals: goalRows.map((g) => {
      const progress = computeGoalProgress(g, trades, now);
      return {
        metric: g.metric,
        period: g.period,
        target: g.targetValue,
        actual: round(progress.actual),
        achieved: progress.achieved,
      };
    }),
  };
}

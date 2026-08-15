import { describe, it, expect } from "vitest";
import { buildTradingSummary } from "./build-summary";
import type { AnalyticsTrade } from "@/lib/analytics";

function trade(overrides: Partial<AnalyticsTrade> = {}): AnalyticsTrade {
  return {
    symbol: "AAPL",
    direction: "LONG",
    netPnl: 100,
    rMultiple: 1,
    riskPercent: null,
    status: "CLOSED",
    entryAt: new Date(2026, 0, 5, 9, 0),
    exitAt: new Date(2026, 0, 5, 9, 30),
    strategyId: null,
    strategyName: null,
    session: null,
    confidence: null,
    executionRating: null,
    ruleAdherence: null,
    mistakes: [],
    ...overrides,
  };
}

describe("buildTradingSummary", () => {
  it("summarizes overall performance from closed trades", () => {
    const trades = [
      trade({ symbol: "AAPL", netPnl: 200, rMultiple: 2 }),
      trade({ symbol: "AAPL", netPnl: -50, rMultiple: -1 }),
      trade({ symbol: "MSFT", netPnl: 100, rMultiple: 1 }),
    ];
    const summary = buildTradingSummary(trades, [], 10000, new Date(2026, 0, 10));

    expect(summary.totalClosedTrades).toBe(3);
    expect(summary.overall.netPnl).toBe(250);
    expect(summary.overall.winRate).toBe(67);
  });

  it("splits top and bottom symbols without duplicating when there are few symbols", () => {
    const trades = [
      trade({ symbol: "AAPL", netPnl: 500 }),
      trade({ symbol: "MSFT", netPnl: -200 }),
    ];
    const summary = buildTradingSummary(trades, [], 10000, new Date(2026, 0, 10));

    expect(summary.topSymbolsByPnl.map((s) => s.label)).toEqual(["AAPL", "MSFT"]);
    // Both symbols already appear in the top list, so the bottom list is empty rather than duplicated.
    expect(summary.bottomSymbolsByPnl).toHaveLength(0);
  });

  it("includes mistake costs and psychology buckets", () => {
    const trades = [
      trade({ netPnl: -80, mistakes: [{ id: "m1", name: "FOMO" }] }),
      trade({ netPnl: 150, confidence: 5 }),
    ];
    const summary = buildTradingSummary(trades, [], 10000, new Date(2026, 0, 10));

    expect(summary.mistakeCosts).toEqual([{ mistake: "FOMO", trades: 1, netPnl: -80 }]);
    expect(summary.psychology.confidence).toHaveLength(5);
    const five = summary.psychology.confidence.find((r) => r.rating === 5)!;
    expect(five.trades).toBe(1);
    expect(five.netPnl).toBe(150);
  });

  it("computes goal progress against the provided trades", () => {
    const trades = [trade({ netPnl: 300 }), trade({ netPnl: 200 })];
    const summary = buildTradingSummary(
      trades,
      [{ metric: "MONTHLY_PNL_TARGET", period: "MONTHLY", targetValue: 400 }],
      10000,
      new Date(2026, 0, 10)
    );

    expect(summary.goals).toEqual([
      { metric: "MONTHLY_PNL_TARGET", period: "MONTHLY", target: 400, actual: 500, achieved: true },
    ]);
  });

  it("handles an empty trade list without throwing", () => {
    const summary = buildTradingSummary([], [], 10000, new Date(2026, 0, 10));
    expect(summary.totalClosedTrades).toBe(0);
    expect(summary.overall.winRate).toBeNull();
    expect(summary.topSymbolsByPnl).toHaveLength(0);
  });
});

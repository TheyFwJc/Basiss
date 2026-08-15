import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  computeWinLossStats,
  computeProfitStats,
  computeRStats,
  computeStreaks,
  buildEquityCurve,
  computeMaxDrawdown,
  type MetricsTrade,
} from "./metrics";

function trade(
  netPnl: number | null,
  rMultiple: number | null = null,
  status: "OPEN" | "CLOSED" = "CLOSED",
  exitAt: Date | null = new Date("2026-01-01")
): MetricsTrade {
  return { netPnl, rMultiple, status, exitAt };
}

describe("computeWinLossStats", () => {
  it("counts wins, losses, and breakevens separately", () => {
    const stats = computeWinLossStats([
      trade(100),
      trade(-50),
      trade(0),
      trade(200),
      trade(null, null, "OPEN", null),
    ]);
    expect(stats.totalTrades).toBe(5);
    expect(stats.closedTrades).toBe(4);
    expect(stats.openTrades).toBe(1);
    expect(stats.winningTrades).toBe(2);
    expect(stats.losingTrades).toBe(1);
    expect(stats.breakevenTrades).toBe(1);
  });

  it("computes win rate excluding breakevens from the denominator", () => {
    const stats = computeWinLossStats([trade(100), trade(-50), trade(0)]);
    expect(stats.winRate).toBe(50); // 1 win / (1 win + 1 loss)
  });

  it("returns null win rate when there are no decisive trades", () => {
    const stats = computeWinLossStats([trade(0), trade(null, null, "OPEN", null)]);
    expect(stats.winRate).toBeNull();
  });
});

describe("computeProfitStats", () => {
  it("computes gross profit, gross loss, and net P&L", () => {
    const stats = computeProfitStats([trade(100), trade(-40), trade(300)]);
    expect(stats.grossProfit.toString()).toBe("400");
    expect(stats.grossLoss.toString()).toBe("-40");
    expect(stats.netPnl.toString()).toBe("360");
  });

  it("computes average win, average loss, and largest of each", () => {
    const stats = computeProfitStats([trade(100), trade(300), trade(-40), trade(-10)]);
    expect(stats.avgWin?.toString()).toBe("200");
    expect(stats.avgLoss?.toString()).toBe("-25");
    expect(stats.largestWin?.toString()).toBe("300");
    expect(stats.largestLoss?.toString()).toBe("-40");
  });

  it("computes profit factor as gross profit over absolute gross loss", () => {
    const stats = computeProfitStats([trade(300), trade(-100)]);
    expect(stats.profitFactor?.toString()).toBe("3");
  });

  it("returns a null profit factor when there are no losses", () => {
    const stats = computeProfitStats([trade(100), trade(200)]);
    expect(stats.profitFactor).toBeNull();
  });

  it("computes expectancy as win-rate-weighted average win plus loss-rate-weighted average loss", () => {
    // 2 wins of +100, 2 losses of -50 => winRate 0.5, avgWin 100, lossRate 0.5, avgLoss -50
    // expectancy = 0.5*100 + 0.5*-50 = 25
    const stats = computeProfitStats([trade(100), trade(100), trade(-50), trade(-50)]);
    expect(stats.expectancy?.toString()).toBe("25");
  });
});

describe("computeRStats", () => {
  it("computes average, total, best, and worst R", () => {
    const stats = computeRStats([
      trade(100, 2),
      trade(-50, -1),
      trade(300, 3),
    ]);
    expect(stats.totalR?.toString()).toBe("4");
    expect(stats.avgR?.toString()).toBe("1.3333333333333333333");
    expect(stats.bestR?.toString()).toBe("3");
    expect(stats.worstR?.toString()).toBe("-1");
  });

  it("returns nulls when there are no closed trades with an R value", () => {
    const stats = computeRStats([trade(null, null, "OPEN", null)]);
    expect(stats.avgR).toBeNull();
  });
});

describe("computeStreaks", () => {
  it("tracks the best win streak and worst loss streak", () => {
    const trades = [
      trade(100, null, "CLOSED", new Date("2026-01-01")),
      trade(100, null, "CLOSED", new Date("2026-01-02")),
      trade(100, null, "CLOSED", new Date("2026-01-03")),
      trade(-50, null, "CLOSED", new Date("2026-01-04")),
      trade(-50, null, "CLOSED", new Date("2026-01-05")),
    ];
    const stats = computeStreaks(trades);
    expect(stats.bestWinStreak).toBe(3);
    expect(stats.worstLossStreak).toBe(2);
    expect(stats.current).toEqual({ type: "LOSS", count: 2 });
  });
});

describe("buildEquityCurve", () => {
  it("starts at the starting balance and accumulates realized P&L in order", () => {
    const curve = buildEquityCurve(10000, [
      trade(500, null, "CLOSED", new Date("2026-01-02")),
      trade(-200, null, "CLOSED", new Date("2026-01-01")),
    ]);
    // Sorted by exitAt regardless of input order.
    expect(curve.map((p) => p.equity.toString())).toEqual([
      "10000",
      "9800",
      "10300",
    ]);
  });
});

describe("computeMaxDrawdown", () => {
  it("finds the largest peak-to-trough drop", () => {
    const points = [
      { date: new Date(0), equity: new Decimal(10000) },
      { date: new Date(1), equity: new Decimal(11000) },
      { date: new Date(2), equity: new Decimal(9000) },
      { date: new Date(3), equity: new Decimal(9500) },
      { date: new Date(4), equity: new Decimal(12000) },
    ];
    const stats = computeMaxDrawdown(points);
    expect(stats.maxDrawdownAmount.toString()).toBe("2000");
    expect(stats.peakEquity.toString()).toBe("12000");
    expect(stats.currentEquity.toString()).toBe("12000");
  });
});

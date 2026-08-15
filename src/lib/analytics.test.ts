import { describe, it, expect } from "vitest";
import {
  filterTrades,
  groupByDimension,
  groupByHourOfDay,
  groupByHoldingTime,
  groupByRisk,
  computeMistakeCost,
  groupByRating,
  buildDayVsSessionHeatmap,
  type AnalyticsTrade,
} from "./analytics";

function trade(overrides: Partial<AnalyticsTrade> = {}): AnalyticsTrade {
  return {
    symbol: "AAPL",
    direction: "LONG",
    netPnl: 100,
    rMultiple: 1,
    riskPercent: null,
    status: "CLOSED",
    entryAt: new Date(2026, 0, 5, 14, 30), // a Monday, local time
    exitAt: new Date(2026, 0, 5, 15, 0),
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

describe("filterTrades", () => {
  it("combines multiple filters with AND, not OR", () => {
    const trades = [
      trade({ symbol: "AAPL", direction: "LONG" }),
      trade({ symbol: "AAPL", direction: "SHORT" }),
      trade({ symbol: "MSFT", direction: "LONG" }),
    ];
    const result = filterTrades(trades, { symbol: "AAPL", direction: "LONG" });
    expect(result).toHaveLength(1);
  });

  it("filters by day of week using exitAt when present", () => {
    const monday = trade({ exitAt: new Date(2026, 0, 5, 15, 0) });
    const tuesday = trade({ exitAt: new Date(2026, 0, 6, 15, 0) });
    const result = filterTrades([monday, tuesday], { dayOfWeek: 1 });
    expect(result).toEqual([monday]);
  });

  it("filters by a tagged mistake", () => {
    const withMistake = trade({ mistakes: [{ id: "m1", name: "FOMO" }] });
    const without = trade({ mistakes: [] });
    const result = filterTrades([withMistake, without], { mistakeId: "m1" });
    expect(result).toEqual([withMistake]);
  });

  it("returns everything when no filters are set", () => {
    const trades = [trade(), trade({ symbol: "MSFT" })];
    expect(filterTrades(trades, {})).toHaveLength(2);
  });
});

describe("groupByDimension", () => {
  it("sums net P&L and counts wins per group, sorted by net P&L descending", () => {
    const trades = [
      trade({ symbol: "AAPL", netPnl: 100 }),
      trade({ symbol: "AAPL", netPnl: -20 }),
      trade({ symbol: "MSFT", netPnl: 500 }),
    ];
    const groups = groupByDimension(trades, (t) => ({ key: t.symbol, label: t.symbol }));
    expect(groups.map((g) => g.key)).toEqual(["MSFT", "AAPL"]);
    expect(groups[1].netPnl.toString()).toBe("80");
    expect(groups[1].count).toBe(2);
    expect(groups[1].wins).toBe(1);
  });

  it("averages R only across trades that have one", () => {
    const trades = [
      trade({ symbol: "AAPL", rMultiple: 2 }),
      trade({ symbol: "AAPL", rMultiple: null }),
    ];
    const [group] = groupByDimension(trades, (t) => ({ key: t.symbol, label: t.symbol }));
    expect(group.avgR?.toString()).toBe("2");
  });

  it("skips trades the key function excludes", () => {
    const trades = [trade({ strategyId: null }), trade({ strategyId: "s1", strategyName: "ORB" })];
    const groups = groupByDimension(trades, (t) =>
      t.strategyId ? { key: t.strategyId, label: t.strategyName! } : null
    );
    expect(groups).toHaveLength(1);
  });
});

describe("groupByHourOfDay", () => {
  it("buckets by the entry hour and sorts chronologically", () => {
    const trades = [
      trade({ entryAt: new Date(2026, 0, 5, 20, 0, 0) }),
      trade({ entryAt: new Date(2026, 0, 5, 9, 0, 0) }),
    ];
    const groups = groupByHourOfDay(trades);
    expect(groups.map((g) => g.key)).toEqual(["09", "20"]);
  });
});

describe("groupByHoldingTime", () => {
  it("excludes open trades with no exit", () => {
    const groups = groupByHoldingTime([trade({ exitAt: null, status: "OPEN" })]);
    expect(groups).toHaveLength(0);
  });

  it("buckets a 3-minute trade as under 5 minutes and a 2-hour trade as 1-4 hours", () => {
    const quick = trade({
      entryAt: new Date(2026, 0, 5, 14, 0),
      exitAt: new Date(2026, 0, 5, 14, 3),
    });
    const slow = trade({
      entryAt: new Date(2026, 0, 5, 14, 0),
      exitAt: new Date(2026, 0, 5, 16, 0),
    });
    const groups = groupByHoldingTime([quick, slow]);
    const keys = groups.map((g) => g.key);
    expect(keys).toContain("u5m");
    expect(keys).toContain("1-4h");
  });
});

describe("groupByRisk", () => {
  it("excludes trades with no riskPercent", () => {
    expect(groupByRisk([trade({ riskPercent: null })])).toHaveLength(0);
  });

  it("buckets by risk percent boundary", () => {
    const groups = groupByRisk([
      trade({ riskPercent: 0.3 }),
      trade({ riskPercent: 4 }),
    ]);
    const keys = groups.map((g) => g.key);
    expect(keys).toContain("u0.5");
    expect(keys).toContain("3+");
  });
});

describe("computeMistakeCost", () => {
  it("sums net P&L per mistake across trades, worst first", () => {
    const trades = [
      trade({ netPnl: -100, mistakes: [{ id: "m1", name: "Moved stop" }] }),
      trade({ netPnl: -50, mistakes: [{ id: "m1", name: "Moved stop" }] }),
      trade({ netPnl: -10, mistakes: [{ id: "m2", name: "FOMO" }] }),
    ];
    const costs = computeMistakeCost(trades);
    expect(costs[0].mistakeId).toBe("m1");
    expect(costs[0].netPnl.toString()).toBe("-150");
    expect(costs[0].count).toBe(2);
    expect(costs[1].mistakeId).toBe("m2");
  });

  it("attributes a trade's P&L to every mistake it's tagged with", () => {
    const trades = [
      trade({ netPnl: -60, mistakes: [{ id: "m1", name: "A" }, { id: "m2", name: "B" }] }),
    ];
    const costs = computeMistakeCost(trades);
    expect(costs).toHaveLength(2);
    expect(costs.every((c) => c.netPnl.toString() === "-60")).toBe(true);
  });

  it("ignores trades with no tagged mistakes", () => {
    expect(computeMistakeCost([trade({ mistakes: [] })])).toHaveLength(0);
  });
});

describe("groupByRating", () => {
  it("always returns all five ratings, zero-filled where there's no data", () => {
    const groups = groupByRating([trade({ ruleAdherence: 5, netPnl: 200 })], (t) => t.ruleAdherence);
    expect(groups).toHaveLength(5);
    expect(groups.map((g) => g.rating)).toEqual([1, 2, 3, 4, 5]);
    const five = groups.find((g) => g.rating === 5)!;
    expect(five.count).toBe(1);
    expect(five.netPnl.toString()).toBe("200");
    const one = groups.find((g) => g.rating === 1)!;
    expect(one.count).toBe(0);
    expect(one.winRate).toBeNull();
  });

  it("computes win rate per rating bucket", () => {
    const groups = groupByRating(
      [
        trade({ confidence: 4, netPnl: 100 }),
        trade({ confidence: 4, netPnl: -50 }),
      ],
      (t) => t.confidence
    );
    const four = groups.find((g) => g.rating === 4)!;
    expect(four.winRate).toBeCloseTo(50);
  });
});

describe("buildDayVsSessionHeatmap", () => {
  it("aggregates net P&L per day/session combination", () => {
    const trades = [
      trade({ session: "OPEN", exitAt: new Date(2026, 0, 5, 15, 0), netPnl: 100 }),
      trade({ session: "OPEN", exitAt: new Date(2026, 0, 5, 15, 30), netPnl: 50 }),
      trade({ session: "MIDDAY", exitAt: new Date(2026, 0, 5, 18, 0), netPnl: -20 }),
    ];
    const cells = buildDayVsSessionHeatmap(trades);
    const monOpen = cells.find((c) => c.day === 1 && c.session === "OPEN")!;
    expect(monOpen.netPnl.toString()).toBe("150");
    expect(monOpen.count).toBe(2);
  });

  it("skips trades with no session", () => {
    expect(buildDayVsSessionHeatmap([trade({ session: null })])).toHaveLength(0);
  });
});

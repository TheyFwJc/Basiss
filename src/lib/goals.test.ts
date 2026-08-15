import { describe, it, expect } from "vitest";
import { computeGoalProgress, type GoalTrade } from "./goals";

const now = new Date("2026-08-14T12:00:00.000Z");

function trade(overrides: Partial<GoalTrade>): GoalTrade {
  return {
    netPnl: null,
    rMultiple: null,
    status: "CLOSED",
    exitAt: now,
    ruleAdherence: null,
    ...overrides,
  };
}

describe("computeGoalProgress", () => {
  it("treats MAX_DAILY_LOSS as a ceiling — under the limit is achieved", () => {
    const trades = [trade({ netPnl: "-100" }), trade({ netPnl: "-50" })];
    const progress = computeGoalProgress(
      { metric: "MAX_DAILY_LOSS", period: "DAILY", targetValue: 200 },
      trades,
      now
    );
    expect(progress.actual).toBe(150);
    expect(progress.achieved).toBe(true);
    expect(progress.progressPct).toBeCloseTo(75);
  });

  it("flags MAX_DAILY_LOSS as breached once losses exceed the target", () => {
    const trades = [trade({ netPnl: "-300" })];
    const progress = computeGoalProgress(
      { metric: "MAX_DAILY_LOSS", period: "DAILY", targetValue: 200 },
      trades,
      now
    );
    expect(progress.achieved).toBe(false);
    expect(progress.progressPct).toBe(100);
  });

  it("sums realized P&L for MONTHLY_PNL_TARGET", () => {
    const trades = [trade({ netPnl: "500" }), trade({ netPnl: "-100" })];
    const progress = computeGoalProgress(
      { metric: "MONTHLY_PNL_TARGET", period: "MONTHLY", targetValue: 1000 },
      trades,
      now
    );
    expect(progress.actual).toBe(400);
    expect(progress.achieved).toBe(false);
    expect(progress.progressPct).toBeCloseTo(40);
  });

  it("counts closed trades in the window for TRADE_COUNT", () => {
    const trades = [trade({}), trade({}), trade({ status: "OPEN", exitAt: null })];
    const progress = computeGoalProgress(
      { metric: "TRADE_COUNT", period: "WEEKLY", targetValue: 2 },
      trades,
      now
    );
    expect(progress.actual).toBe(2);
    expect(progress.achieved).toBe(true);
  });

  it("excludes trades outside the goal's period window", () => {
    const outside = new Date("2020-01-01T00:00:00.000Z");
    const trades = [trade({ netPnl: "1000", exitAt: outside })];
    const progress = computeGoalProgress(
      { metric: "MONTHLY_PNL_TARGET", period: "MONTHLY", targetValue: 500 },
      trades,
      now
    );
    expect(progress.actual).toBe(0);
    expect(progress.achieved).toBe(false);
  });

  it("computes win rate for WIN_RATE goals", () => {
    const trades = [
      trade({ netPnl: "100" }),
      trade({ netPnl: "100" }),
      trade({ netPnl: "-50" }),
    ];
    const progress = computeGoalProgress(
      { metric: "WIN_RATE", period: "MONTHLY", targetValue: 60 },
      trades,
      now
    );
    expect(progress.actual).toBeCloseTo(66.67, 1);
    expect(progress.achieved).toBe(true);
  });

  it("averages rMultiple for AVERAGE_R goals", () => {
    const trades = [trade({ rMultiple: "2" }), trade({ rMultiple: "1" })];
    const progress = computeGoalProgress(
      { metric: "AVERAGE_R", period: "MONTHLY", targetValue: 1.5 },
      trades,
      now
    );
    expect(progress.actual).toBeCloseTo(1.5);
    expect(progress.achieved).toBe(true);
  });

  it("averages ruleAdherence across rated trades only for RULE_FOLLOWING", () => {
    const trades = [
      trade({ ruleAdherence: 5 }),
      trade({ ruleAdherence: 3 }),
      trade({ ruleAdherence: null }),
    ];
    const progress = computeGoalProgress(
      { metric: "RULE_FOLLOWING", period: "MONTHLY", targetValue: 4 },
      trades,
      now
    );
    expect(progress.actual).toBe(4);
    expect(progress.achieved).toBe(true);
  });

  it("returns zero progress when the target is zero or less", () => {
    const progress = computeGoalProgress(
      { metric: "TRADE_COUNT", period: "DAILY", targetValue: 0 },
      [],
      now
    );
    expect(progress.progressPct).toBe(0);
  });
});

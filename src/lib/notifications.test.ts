import { describe, it, expect } from "vitest";
import {
  checkDailyLossLimit,
  checkWeeklyDrawdown,
  checkMissingJournal,
  checkReviewReminder,
  checkRiskLimit,
  checkWeeklyReview,
} from "./notifications";

describe("checkDailyLossLimit", () => {
  it("returns null when there is no limit set", () => {
    expect(checkDailyLossLimit({ dateKey: "2026-08-16", todayPnl: -500, limitAmount: null })).toBeNull();
  });

  it("returns null when the loss is under the limit", () => {
    expect(
      checkDailyLossLimit({ dateKey: "2026-08-16", todayPnl: -100, limitAmount: 500 })
    ).toBeNull();
  });

  it("returns null when today is profitable", () => {
    expect(
      checkDailyLossLimit({ dateKey: "2026-08-16", todayPnl: 200, limitAmount: 500 })
    ).toBeNull();
  });

  it("fires when the loss reaches the limit", () => {
    const result = checkDailyLossLimit({ dateKey: "2026-08-16", todayPnl: -500, limitAmount: 500 });
    expect(result?.type).toBe("DAILY_LOSS_LIMIT");
    expect(result?.dedupeKey).toBe("daily-loss:2026-08-16");
  });
});

describe("checkWeeklyDrawdown", () => {
  it("fires when the weekly loss reaches the limit", () => {
    const result = checkWeeklyDrawdown({
      weekStartKey: "2026-08-10",
      weekPnl: -1200,
      limitAmount: 1000,
    });
    expect(result?.type).toBe("WEEKLY_DRAWDOWN");
    expect(result?.dedupeKey).toBe("weekly-loss:2026-08-10");
  });

  it("returns null under the limit", () => {
    expect(
      checkWeeklyDrawdown({ weekStartKey: "2026-08-10", weekPnl: -100, limitAmount: 1000 })
    ).toBeNull();
  });
});

describe("checkMissingJournal", () => {
  it("returns null when an entry exists", () => {
    expect(checkMissingJournal({ dateKey: "2026-08-15", hadEntry: true })).toBeNull();
  });

  it("fires when no entry exists for that day", () => {
    const result = checkMissingJournal({ dateKey: "2026-08-15", hadEntry: false });
    expect(result?.type).toBe("MISSING_JOURNAL");
    expect(result?.dedupeKey).toBe("missing-journal:2026-08-15");
  });
});

describe("checkReviewReminder", () => {
  it("returns null when there is nothing unreviewed", () => {
    expect(checkReviewReminder({ weekStartKey: "2026-08-10", unreviewedCount: 0 })).toBeNull();
  });

  it("fires with a count when trades are unreviewed", () => {
    const result = checkReviewReminder({ weekStartKey: "2026-08-10", unreviewedCount: 3 });
    expect(result?.message).toContain("3 closed trades");
    expect(result?.dedupeKey).toBe("review-reminder:2026-08-10");
  });

  it("uses singular wording for exactly one", () => {
    const result = checkReviewReminder({ weekStartKey: "2026-08-10", unreviewedCount: 1 });
    expect(result?.message).toContain("1 closed trade ");
  });
});

describe("checkRiskLimit", () => {
  it("returns null when under the default risk", () => {
    expect(
      checkRiskLimit({
        tradeId: "t1",
        symbol: "AAPL",
        riskPercent: 1,
        defaultRiskPerTradePct: 2,
      })
    ).toBeNull();
  });

  it("returns null when either value is missing", () => {
    expect(
      checkRiskLimit({ tradeId: "t1", symbol: "AAPL", riskPercent: null, defaultRiskPerTradePct: 2 })
    ).toBeNull();
    expect(
      checkRiskLimit({ tradeId: "t1", symbol: "AAPL", riskPercent: 3, defaultRiskPerTradePct: null })
    ).toBeNull();
  });

  it("fires when risk exceeds the default", () => {
    const result = checkRiskLimit({
      tradeId: "t1",
      symbol: "AAPL",
      riskPercent: 3.5,
      defaultRiskPerTradePct: 2,
    });
    expect(result?.type).toBe("RISK_LIMIT");
    expect(result?.dedupeKey).toBe("risk-limit:t1");
  });
});

describe("checkWeeklyReview", () => {
  it("returns null with no closed trades", () => {
    expect(checkWeeklyReview({ weekStartKey: "2026-08-10", closedTradeCount: 0 })).toBeNull();
  });

  it("fires when there were closed trades this week", () => {
    const result = checkWeeklyReview({ weekStartKey: "2026-08-10", closedTradeCount: 5 });
    expect(result?.type).toBe("WEEKLY_REVIEW");
    expect(result?.dedupeKey).toBe("weekly-review:2026-08-10");
  });
});

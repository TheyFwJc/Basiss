import { describe, it, expect } from "vitest";
import { timeframeForTrade } from "./alpaca";

describe("timeframeForTrade", () => {
  it("uses 5-minute bars for a same-day trade", () => {
    const entry = new Date("2026-08-10T14:00:00Z");
    const exit = new Date("2026-08-10T16:00:00Z");
    const result = timeframeForTrade(entry, exit);
    expect(result.timeframe).toBe("5Min");
    expect(result.start.getTime()).toBeLessThan(entry.getTime());
    expect(result.end.getTime()).toBeGreaterThan(exit.getTime());
  });

  it("uses 15-minute bars for a multi-day swing", () => {
    const entry = new Date("2026-08-01T14:00:00Z");
    const exit = new Date("2026-08-03T16:00:00Z");
    expect(timeframeForTrade(entry, exit).timeframe).toBe("15Min");
  });

  it("uses hourly bars for a ~1-2 week swing", () => {
    const entry = new Date("2026-08-01T14:00:00Z");
    const exit = new Date("2026-08-10T16:00:00Z");
    expect(timeframeForTrade(entry, exit).timeframe).toBe("1Hour");
  });

  it("uses daily bars for a long-held position", () => {
    const entry = new Date("2026-07-01T14:00:00Z");
    const exit = new Date("2026-08-15T16:00:00Z");
    expect(timeframeForTrade(entry, exit).timeframe).toBe("1Day");
  });

  it("treats a still-open trade as ending now", () => {
    const entry = new Date(Date.now() - 60 * 60 * 1000);
    const result = timeframeForTrade(entry, null);
    expect(result.timeframe).toBe("5Min");
    expect(result.end.getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});

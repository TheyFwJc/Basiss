import { describe, it, expect } from "vitest";
import { normalizeSide, parseExecutedAt, tradingViewPayloadSchema } from "./tradingview-webhook";

describe("normalizeSide", () => {
  it("recognizes buy/long as BUY", () => {
    expect(normalizeSide("buy")).toBe("BUY");
    expect(normalizeSide("Buy")).toBe("BUY");
    expect(normalizeSide("long")).toBe("BUY");
  });

  it("recognizes sell/short as SELL", () => {
    expect(normalizeSide("sell")).toBe("SELL");
    expect(normalizeSide("SHORT")).toBe("SELL");
  });

  it("returns null for anything else", () => {
    expect(normalizeSide("hold")).toBeNull();
    expect(normalizeSide("")).toBeNull();
  });
});

describe("parseExecutedAt", () => {
  it("defaults to now when time is missing", () => {
    const before = Date.now();
    const result = parseExecutedAt(undefined);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("interprets a unix-seconds number", () => {
    const result = parseExecutedAt(1_700_000_000);
    expect(result.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("interprets a unix-milliseconds number", () => {
    const result = parseExecutedAt(1_700_000_000_000);
    expect(result.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("interprets a numeric string the same as a number", () => {
    expect(parseExecutedAt("1700000000").toISOString()).toBe(
      parseExecutedAt(1_700_000_000).toISOString()
    );
  });

  it("interprets an ISO string", () => {
    expect(parseExecutedAt("2024-01-01T00:00:00Z").toISOString()).toBe(
      "2024-01-01T00:00:00.000Z"
    );
  });

  it("falls back to now for garbage input", () => {
    const before = Date.now();
    expect(parseExecutedAt("not a date").getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("tradingViewPayloadSchema", () => {
  it("accepts a well-formed payload", () => {
    const result = tradingViewPayloadSchema.safeParse({
      symbol: "AAPL",
      side: "buy",
      quantity: "10",
      price: "192.35",
      time: 1700000000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const result = tradingViewPayloadSchema.safeParse({
      symbol: "AAPL",
      side: "buy",
      quantity: "10",
    });
    expect(result.success).toBe(false);
  });
});

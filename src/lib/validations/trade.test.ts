import { describe, it, expect } from "vitest";
import { tradeSchema, executionInputSchema } from "./trade";

const baseExecution = {
  side: "BUY" as const,
  quantity: 100,
  price: 10,
  executedAt: "2026-01-01T09:30",
  fees: 0,
  commission: 0,
};

describe("executionInputSchema", () => {
  it("accepts a valid execution", () => {
    expect(executionInputSchema.safeParse(baseExecution).success).toBe(true);
  });

  it("rejects a zero or negative quantity", () => {
    expect(
      executionInputSchema.safeParse({ ...baseExecution, quantity: 0 }).success
    ).toBe(false);
  });

  it("defaults fees and commission to 0 when omitted", () => {
    const rest: Partial<typeof baseExecution> = { ...baseExecution };
    delete rest.fees;
    delete rest.commission;
    const result = executionInputSchema.parse(rest);
    expect(result.fees).toBe(0);
    expect(result.commission).toBe(0);
  });
});

describe("tradeSchema", () => {
  const baseTrade = {
    tradingAccountId: "acct_1",
    symbol: "aapl",
    assetClass: "EQUITY" as const,
    direction: "LONG" as const,
    executions: [baseExecution],
  };

  it("accepts a minimal valid trade and uppercases the symbol", () => {
    const result = tradeSchema.parse(baseTrade);
    expect(result.symbol).toBe("AAPL");
  });

  it("requires at least one execution", () => {
    const result = tradeSchema.safeParse({ ...baseTrade, executions: [] });
    expect(result.success).toBe(false);
  });

  it("requires an account", () => {
    const result = tradeSchema.safeParse({ ...baseTrade, tradingAccountId: "" });
    expect(result.success).toBe(false);
  });

  it("treats an empty stopLoss string as undefined", () => {
    const result = tradeSchema.parse({ ...baseTrade, stopLoss: "" });
    expect(result.stopLoss).toBeUndefined();
  });

  it("coerces a numeric stopLoss string", () => {
    const result = tradeSchema.parse({ ...baseTrade, stopLoss: "95.5" });
    expect(result.stopLoss).toBe(95.5);
  });

  it("rejects an out-of-range confidence rating", () => {
    const result = tradeSchema.safeParse({ ...baseTrade, confidence: "9" });
    expect(result.success).toBe(false);
  });

  it("treats an empty confidence string as undefined", () => {
    const result = tradeSchema.parse({ ...baseTrade, confidence: "" });
    expect(result.confidence).toBeUndefined();
  });
});

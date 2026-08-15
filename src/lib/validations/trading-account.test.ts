import { describe, it, expect } from "vitest";
import { tradingAccountSchema } from "./trading-account";

describe("tradingAccountSchema", () => {
  it("accepts a valid brokerage account", () => {
    const result = tradingAccountSchema.safeParse({
      name: "Main brokerage",
      broker: "Interactive Brokers",
      accountType: "BROKERAGE",
      startingBalance: "25000",
      currency: "usd",
      status: "ACTIVE",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("rejects a negative starting balance", () => {
    const result = tradingAccountSchema.safeParse({
      name: "Main brokerage",
      accountType: "BROKERAGE",
      startingBalance: "-100",
      currency: "USD",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown account type", () => {
    const result = tradingAccountSchema.safeParse({
      name: "Main brokerage",
      accountType: "HEDGE_FUND",
      startingBalance: "1000",
      currency: "USD",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a currency code that isn't 3 letters", () => {
    const result = tradingAccountSchema.safeParse({
      name: "Main brokerage",
      accountType: "BROKERAGE",
      startingBalance: "1000",
      currency: "US",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("requires a name", () => {
    const result = tradingAccountSchema.safeParse({
      name: "",
      accountType: "BROKERAGE",
      startingBalance: "1000",
      currency: "USD",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });
});

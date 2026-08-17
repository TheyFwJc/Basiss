import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { computeTradePnl, computeRiskAmount, computeRMultiple } from "./pnl";

function d(value: Decimal.Value) {
  return new Decimal(value);
}

describe("computeTradePnl — long trades", () => {
  it("computes a winning long trade", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 100, price: 10 },
      { side: "SELL", quantity: 100, price: 12 },
    ]);
    expect(result.avgEntryPrice.toString()).toBe("10");
    expect(result.avgExitPrice?.toString()).toBe("12");
    expect(result.grossPnl?.toString()).toBe("200");
    expect(result.netPnl?.toString()).toBe("200");
    expect(result.status).toBe("CLOSED");
  });

  it("computes a losing long trade", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 50, price: 20 },
      { side: "SELL", quantity: 50, price: 18 },
    ]);
    expect(result.grossPnl?.toString()).toBe("-100");
  });

  it("computes a breakeven long trade", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 10, price: 5 },
      { side: "SELL", quantity: 10, price: 5 },
    ]);
    expect(result.grossPnl?.toString()).toBe("0");
    expect(result.netPnl?.toString()).toBe("0");
  });

  it("handles multiple entries (averaging in)", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 100, price: 10 },
      { side: "BUY", quantity: 100, price: 12 },
      { side: "SELL", quantity: 200, price: 13 },
    ]);
    // avg entry = (100*10 + 100*12) / 200 = 11
    expect(result.avgEntryPrice.toString()).toBe("11");
    expect(result.grossPnl?.toString()).toBe("400"); // (13-11)*200
  });

  it("handles multiple exits (scaling out)", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 100, price: 10 },
      { side: "SELL", quantity: 50, price: 12 },
      { side: "SELL", quantity: 50, price: 14 },
    ]);
    // avg exit = (50*12 + 50*14) / 100 = 13
    expect(result.avgExitPrice?.toString()).toBe("13");
    expect(result.grossPnl?.toString()).toBe("300"); // (13-10)*100
    expect(result.status).toBe("CLOSED");
  });

  it("handles a partial exit and reports the trade as still open", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 100, price: 10 },
      { side: "SELL", quantity: 40, price: 12 },
    ]);
    expect(result.quantity.toString()).toBe("100");
    expect(result.closedQuantity.toString()).toBe("40");
    expect(result.status).toBe("OPEN");
    // Realized P&L is on the closed portion only.
    expect(result.grossPnl?.toString()).toBe("80"); // (12-10)*40
  });

  it("reports null P&L for a fully open trade with no exits", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 100, price: 10 },
    ]);
    expect(result.avgExitPrice).toBeNull();
    expect(result.grossPnl).toBeNull();
    expect(result.netPnl).toBeNull();
    expect(result.status).toBe("OPEN");
  });

  it("subtracts fees and commission from net P&L only", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 100, price: 10, fees: 1, commission: 2 },
      { side: "SELL", quantity: 100, price: 11, fees: 1, commission: 2 },
    ]);
    expect(result.grossPnl?.toString()).toBe("100");
    expect(result.fees.toString()).toBe("2");
    expect(result.commission.toString()).toBe("4");
    expect(result.netPnl?.toString()).toBe("94");
  });
});

describe("computeTradePnl — short trades", () => {
  it("computes a winning short trade", () => {
    const result = computeTradePnl("SHORT", [
      { side: "SELL", quantity: 100, price: 50 },
      { side: "BUY", quantity: 100, price: 45 },
    ]);
    expect(result.avgEntryPrice.toString()).toBe("50");
    expect(result.avgExitPrice?.toString()).toBe("45");
    expect(result.grossPnl?.toString()).toBe("500"); // (50-45)*100
  });

  it("computes a losing short trade", () => {
    const result = computeTradePnl("SHORT", [
      { side: "SELL", quantity: 100, price: 50 },
      { side: "BUY", quantity: 100, price: 55 },
    ]);
    expect(result.grossPnl?.toString()).toBe("-500");
  });
});

describe("computeTradePnl — validation", () => {
  it("throws when there are no executions", () => {
    expect(() => computeTradePnl("LONG", [])).toThrow();
  });

  it("throws when exit quantity exceeds entry quantity", () => {
    expect(() =>
      computeTradePnl("LONG", [
        { side: "BUY", quantity: 10, price: 10 },
        { side: "SELL", quantity: 20, price: 12 },
      ])
    ).toThrow();
  });

  it("throws when a long trade has no BUY (entry) executions", () => {
    expect(() =>
      computeTradePnl("LONG", [{ side: "SELL", quantity: 10, price: 10 }])
    ).toThrow();
  });
});

describe("computeTradePnl — contract multiplier", () => {
  it("defaults to a multiplier of 1 (shares/units-style instruments)", () => {
    const result = computeTradePnl("LONG", [
      { side: "BUY", quantity: 1, price: 20000 },
      { side: "SELL", quantity: 1, price: 20010 },
    ]);
    expect(result.grossPnl?.toString()).toBe("10");
  });

  it("scales gross/net P&L by the contract multiplier (Micro Nasdaq, $2/point)", () => {
    const result = computeTradePnl(
      "LONG",
      [
        { side: "BUY", quantity: 1, price: 20000, commission: 1 },
        { side: "SELL", quantity: 1, price: 20010 },
      ],
      2
    );
    expect(result.grossPnl?.toString()).toBe("20"); // (20010-20000)*1*2
    expect(result.netPnl?.toString()).toBe("19");
  });

  it("scales a short futures trade's P&L by the multiplier too", () => {
    const result = computeTradePnl(
      "SHORT",
      [
        { side: "SELL", quantity: 3, price: 20000 },
        { side: "BUY", quantity: 3, price: 19990 },
      ],
      2
    );
    expect(result.grossPnl?.toString()).toBe("60"); // (20000-19990)*3*2
  });
});

describe("computeRiskAmount", () => {
  it("computes risk for a long trade", () => {
    const risk = computeRiskAmount("LONG", 100, 95, 10);
    expect(risk?.toString()).toBe("50"); // (100-95)*10
  });

  it("computes risk for a short trade", () => {
    const risk = computeRiskAmount("SHORT", 100, 105, 10);
    expect(risk?.toString()).toBe("50"); // (105-100)*10
  });

  it("returns null when there is no stop loss", () => {
    expect(computeRiskAmount("LONG", 100, null, 10)).toBeNull();
  });

  it("scales risk by the contract multiplier", () => {
    const risk = computeRiskAmount("LONG", 20000, 19990, 1, 2);
    expect(risk?.toString()).toBe("20"); // (20000-19990)*1*2
  });
});

describe("computeRMultiple", () => {
  it("expresses a win as a positive multiple of risk", () => {
    const r = computeRMultiple(d(300), d(100));
    expect(r?.toString()).toBe("3");
  });

  it("expresses a loss as a negative multiple of risk", () => {
    const r = computeRMultiple(d(-100), d(100));
    expect(r?.toString()).toBe("-1");
  });

  it("returns null when P&L or risk is unavailable", () => {
    expect(computeRMultiple(null, d(100))).toBeNull();
    expect(computeRMultiple(d(100), null)).toBeNull();
    expect(computeRMultiple(d(100), d(0))).toBeNull();
  });
});

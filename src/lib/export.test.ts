import { describe, it, expect } from "vitest";
import { buildTradesCsv, type TradeExportRow } from "./export";

function row(overrides: Partial<TradeExportRow> = {}): TradeExportRow {
  return {
    id: "t1",
    account: "Demo Brokerage",
    currency: "USD",
    symbol: "AAPL",
    assetClass: "EQUITY",
    direction: "LONG",
    status: "CLOSED",
    quantity: "100",
    avgEntryPrice: "150",
    avgExitPrice: "160",
    entryAt: "2026-01-01T10:00:00.000Z",
    exitAt: "2026-01-01T11:00:00.000Z",
    stopLoss: null,
    takeProfit: null,
    fees: "0",
    commission: "0",
    grossPnl: "1000",
    netPnl: "1000",
    riskAmount: null,
    riskPercent: null,
    rMultiple: null,
    strategy: null,
    playbook: null,
    session: null,
    marketCondition: null,
    notesBefore: null,
    notesDuring: null,
    notesAfter: null,
    emotionBefore: null,
    emotionDuring: null,
    emotionAfter: null,
    confidence: null,
    executionRating: null,
    ruleAdherence: null,
    executionCount: 2,
    ...overrides,
  };
}

describe("buildTradesCsv", () => {
  it("writes a header row followed by one row per trade", () => {
    const csv = buildTradesCsv([row(), row({ id: "t2", symbol: "MSFT" })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0].split(",")[0]).toBe("id");
    expect(lines[1]).toContain("AAPL");
    expect(lines[2]).toContain("MSFT");
  });

  it("renders null fields as empty", () => {
    const csv = buildTradesCsv([row({ strategy: null })]);
    const [, dataLine] = csv.split("\r\n");
    const strategyIndex = csv.split("\r\n")[0].split(",").indexOf("strategy");
    expect(dataLine.split(",")[strategyIndex]).toBe("");
  });

  it("quotes and escapes a value containing a comma", () => {
    const csv = buildTradesCsv([row({ marketCondition: "Trending, high volume" })]);
    expect(csv).toContain('"Trending, high volume"');
  });

  it("doubles embedded quotes", () => {
    const csv = buildTradesCsv([row({ notesBefore: 'Said "go long" at open' })]);
    expect(csv).toContain('"Said ""go long"" at open"');
  });

  it("quotes a value containing a newline", () => {
    const csv = buildTradesCsv([row({ notesAfter: "Line one\nLine two" })]);
    expect(csv).toContain('"Line one\nLine two"');
  });

  it("returns just the header row for an empty trade list", () => {
    const csv = buildTradesCsv([]);
    expect(csv.split("\r\n")).toHaveLength(1);
  });
});

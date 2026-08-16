import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  applyMapping,
  markDuplicates,
  groupExecutionsIntoTrades,
  guessColumnMapping,
  type ImportedExecutionRow,
} from "./import";
import { parseCsv } from "./import-parse";
import type { ColumnMapping } from "./validations/import";

const MAPPING: ColumnMapping = {
  symbol: "Symbol",
  side: "Side",
  quantity: "Qty",
  price: "Price",
  executedAt: "Date",
  fees: "Fees",
  commission: "Commission",
  assetClass: "",
};

function row(
  overrides: Partial<{
    rowIndex: number;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    executedAt: string;
    fees: number;
    commission: number;
  }> = {}
): ImportedExecutionRow {
  return {
    rowIndex: overrides.rowIndex ?? 1,
    symbol: overrides.symbol ?? "AAPL",
    assetClass: "EQUITY",
    side: overrides.side ?? "BUY",
    quantity: new Decimal(overrides.quantity ?? 100),
    price: new Decimal(overrides.price ?? 100),
    executedAt: new Date(overrides.executedAt ?? "2026-01-01T10:00:00.000Z"),
    fees: new Decimal(overrides.fees ?? 0),
    commission: new Decimal(overrides.commission ?? 0),
  };
}

describe("parseCsv", () => {
  it("splits a header row from data rows", () => {
    const { headers, rows } = parseCsv("Symbol,Side,Qty\nAAPL,Buy,100\nAAPL,Sell,100\n");
    expect(headers).toEqual(["Symbol", "Side", "Qty"]);
    expect(rows).toEqual([
      ["AAPL", "Buy", "100"],
      ["AAPL", "Sell", "100"],
    ]);
  });

  it("strips a UTF-8 BOM and skips blank lines", () => {
    const { headers, rows } = parseCsv("﻿Symbol,Qty\n\nAAPL,100\n");
    expect(headers[0]).toBe("Symbol");
    expect(rows).toEqual([["AAPL", "100"]]);
  });

  it("returns empty headers/rows for empty input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });
});

describe("guessColumnMapping", () => {
  it("maps headers that exactly match a field name", () => {
    const mapping = guessColumnMapping(["Symbol", "Side", "Quantity", "Price", "Date"]);
    expect(mapping).toMatchObject({
      symbol: "Symbol",
      side: "Side",
      quantity: "Quantity",
      price: "Price",
      executedAt: "Date",
    });
  });

  it("matches common broker aliases regardless of case/spacing", () => {
    const mapping = guessColumnMapping([
      "Ticker",
      "Action",
      "Qty",
      "Fill Price",
      "Execution Time",
      "Fee",
      "Comm",
    ]);
    expect(mapping).toMatchObject({
      symbol: "Ticker",
      side: "Action",
      quantity: "Qty",
      price: "Fill Price",
      executedAt: "Execution Time",
      fees: "Fee",
      commission: "Comm",
    });
  });

  it("recognizes common TradingView paper-trading export column names", () => {
    const mapping = guessColumnMapping([
      "Symbol",
      "Side",
      "Contracts",
      "Fill Price",
      "Closing Time",
    ]);
    expect(mapping).toMatchObject({
      symbol: "Symbol",
      side: "Side",
      quantity: "Contracts",
      price: "Fill Price",
      executedAt: "Closing Time",
    });
  });

  it("leaves a field blank when no header matches", () => {
    const mapping = guessColumnMapping(["Symbol", "Qty"]);
    expect(mapping.side).toBe("");
    expect(mapping.executedAt).toBe("");
  });

  it("never assigns the same column to two fields", () => {
    const mapping = guessColumnMapping(["Type"]);
    const assignedCount = Object.values(mapping).filter((v) => v === "Type").length;
    expect(assignedCount).toBeLessThanOrEqual(1);
  });
});

describe("applyMapping", () => {
  const headers = ["Symbol", "Side", "Qty", "Price", "Date", "Fees", "Commission"];

  it("maps a valid row", () => {
    const [result] = applyMapping(
      headers,
      [["AAPL", "Buy", "100", "150.25", "2026-01-05T14:30:00", "1.00", "0.50"]],
      MAPPING,
      "EQUITY"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.symbol).toBe("AAPL");
      expect(result.row.side).toBe("BUY");
      expect(result.row.quantity.toString()).toBe("100");
      expect(result.row.price.toString()).toBe("150.25");
      expect(result.row.fees.toString()).toBe("1");
      expect(result.row.commission.toString()).toBe("0.5");
    }
  });

  it("recognizes broker side abbreviations like BOT/SLD", () => {
    const [bot] = applyMapping(headers, [["AAPL", "BOT", "1", "1", "2026-01-01"]], MAPPING, "EQUITY");
    const [sld] = applyMapping(headers, [["AAPL", "SLD", "1", "1", "2026-01-01"]], MAPPING, "EQUITY");
    expect(bot.ok && bot.row.side).toBe("BUY");
    expect(sld.ok && sld.row.side).toBe("SELL");
  });

  it("flags a missing symbol", () => {
    const [result] = applyMapping(headers, [["", "Buy", "100", "1", "2026-01-01"]], MAPPING, "EQUITY");
    expect(result.ok).toBe(false);
  });

  it("flags an unrecognized side", () => {
    const [result] = applyMapping(headers, [["AAPL", "???", "100", "1", "2026-01-01"]], MAPPING, "EQUITY");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/side/i);
  });

  it("flags an invalid quantity or price", () => {
    const [badQty] = applyMapping(headers, [["AAPL", "Buy", "abc", "1", "2026-01-01"]], MAPPING, "EQUITY");
    const [badPrice] = applyMapping(headers, [["AAPL", "Buy", "1", "0", "2026-01-01"]], MAPPING, "EQUITY");
    expect(badQty.ok).toBe(false);
    expect(badPrice.ok).toBe(false);
  });

  it("flags an invalid execution time", () => {
    const [result] = applyMapping(headers, [["AAPL", "Buy", "1", "1", "not-a-date"]], MAPPING, "EQUITY");
    expect(result.ok).toBe(false);
  });

  it("strips currency symbols and thousands separators from price/fees", () => {
    const [result] = applyMapping(
      headers,
      [["AAPL", "Buy", "1,000", "$1,234.56", "2026-01-01", "$2.00", ""]],
      MAPPING,
      "EQUITY"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.quantity.toString()).toBe("1000");
      expect(result.row.price.toString()).toBe("1234.56");
      expect(result.row.fees.toString()).toBe("2");
      expect(result.row.commission.toString()).toBe("0");
    }
  });

  it("maps a broker asset-class code when a column is mapped, else falls back to the default", () => {
    const withCol = [...headers, "Type"];
    const mappingWithAssetClass: ColumnMapping = { ...MAPPING, assetClass: "Type" };
    const [mapped] = applyMapping(
      withCol,
      [["AAPL", "Buy", "1", "1", "2026-01-01", "", "", "OPT"]],
      mappingWithAssetClass,
      "EQUITY"
    );
    expect(mapped.ok && mapped.row.assetClass).toBe("OPTION");

    const [fallback] = applyMapping(headers, [["AAPL", "Buy", "1", "1", "2026-01-01"]], MAPPING, "FUTURES");
    expect(fallback.ok && fallback.row.assetClass).toBe("FUTURES");
  });
});

describe("markDuplicates", () => {
  it("flags a row matching an existing execution on symbol/side/qty/price/time", () => {
    const rows = [row({ rowIndex: 1 }), row({ rowIndex: 2, price: 200 })];
    const duplicates = markDuplicates(rows, [
      { symbol: "AAPL", side: "BUY", quantity: 100, price: 100, executedAt: new Date("2026-01-01T10:00:00.000Z") },
    ]);
    expect(duplicates.has(1)).toBe(true);
    expect(duplicates.has(2)).toBe(false);
  });
});

describe("groupExecutionsIntoTrades", () => {
  it("groups a simple round trip into one closed trade", () => {
    const rows = [
      row({ rowIndex: 1, side: "BUY", quantity: 100, price: 100, executedAt: "2026-01-01T10:00:00" }),
      row({ rowIndex: 2, side: "SELL", quantity: 100, price: 110, executedAt: "2026-01-01T11:00:00" }),
    ];
    const [group] = groupExecutionsIntoTrades(rows);
    expect(group.direction).toBe("LONG");
    expect(group.pnl.status).toBe("CLOSED");
    expect(group.pnl.grossPnl?.toString()).toBe("1000");
    expect(group.exitAt?.toISOString()).toBe(new Date("2026-01-01T11:00:00").toISOString());
  });

  it("scales a position across multiple entries and exits", () => {
    const rows = [
      row({ rowIndex: 1, side: "BUY", quantity: 50, price: 100, executedAt: "2026-01-01T10:00:00" }),
      row({ rowIndex: 2, side: "BUY", quantity: 50, price: 120, executedAt: "2026-01-01T10:05:00" }),
      row({ rowIndex: 3, side: "SELL", quantity: 60, price: 130, executedAt: "2026-01-01T11:00:00" }),
      row({ rowIndex: 4, side: "SELL", quantity: 40, price: 140, executedAt: "2026-01-01T11:05:00" }),
    ];
    const groups = groupExecutionsIntoTrades(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].pnl.avgEntryPrice.toString()).toBe("110");
    expect(groups[0].pnl.status).toBe("CLOSED");
  });

  it("leaves an unclosed position as an open trade", () => {
    const rows = [row({ rowIndex: 1, side: "BUY", quantity: 100 })];
    const [group] = groupExecutionsIntoTrades(rows);
    expect(group.pnl.status).toBe("OPEN");
    expect(group.exitAt).toBeNull();
  });

  it("splits a fill that flips direction into two trades", () => {
    const rows = [
      row({ rowIndex: 1, side: "BUY", quantity: 100, price: 100, executedAt: "2026-01-01T10:00:00", commission: 10 }),
      row({ rowIndex: 2, side: "SELL", quantity: 150, price: 110, executedAt: "2026-01-01T11:00:00", commission: 15 }),
    ];
    const groups = groupExecutionsIntoTrades(rows);
    expect(groups).toHaveLength(2);

    const [closed, flipped] = groups;
    expect(closed.direction).toBe("LONG");
    expect(closed.pnl.status).toBe("CLOSED");
    expect(closed.pnl.closedQuantity.toString()).toBe("100");
    // Entry commission ($10) plus 100/150 of the flip row's $15 commission ($10).
    expect(closed.pnl.commission.toString()).toBe("20");
    expect(closed.splitRowIndexes).toEqual([2]);

    expect(flipped.direction).toBe("SHORT");
    expect(flipped.pnl.status).toBe("OPEN");
    expect(flipped.pnl.quantity.toString()).toBe("50");
    expect(flipped.pnl.commission.toString()).toBe("5");
  });

  it("groups independent symbols separately", () => {
    const rows = [
      row({ rowIndex: 1, symbol: "AAPL", side: "BUY", quantity: 10 }),
      row({ rowIndex: 2, symbol: "MSFT", side: "BUY", quantity: 20 }),
    ];
    const groups = groupExecutionsIntoTrades(rows);
    expect(groups.map((g) => g.symbol).sort()).toEqual(["AAPL", "MSFT"]);
  });

  it("sorts out-of-order rows chronologically before grouping", () => {
    const rows = [
      row({ rowIndex: 2, side: "SELL", quantity: 100, price: 110, executedAt: "2026-01-01T11:00:00" }),
      row({ rowIndex: 1, side: "BUY", quantity: 100, price: 100, executedAt: "2026-01-01T10:00:00" }),
    ];
    const [group] = groupExecutionsIntoTrades(rows);
    expect(group.pnl.status).toBe("CLOSED");
    expect(group.entryAt.toISOString()).toBe(new Date("2026-01-01T10:00:00").toISOString());
  });
});

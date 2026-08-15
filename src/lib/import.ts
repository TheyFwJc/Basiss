import Decimal from "decimal.js";
import { computeTradePnl, type TradePnl } from "./pnl";
import type { ColumnMapping } from "./validations/import";

/**
 * CSV import engine: turns already-parsed CSV rows into Trade/Execution
 * data — mapping/validation, duplicate detection, and grouping into trades,
 * mirroring how pnl.ts/metrics.ts centralize their formulas. Nothing here
 * touches the database, and nothing here is Node-specific (see
 * import-parse.ts for the csv-parse-dependent parsing step) — this module
 * runs equally well in the browser, so the mapping/preview step can
 * recompute instantly as the user adjusts column choices, without a server
 * round trip.
 */

export type AssetClass =
  | "EQUITY"
  | "OPTION"
  | "FUTURES"
  | "FOREX"
  | "CRYPTO"
  | "OTHER";
export type ExecutionSide = "BUY" | "SELL";
export type TradeDirection = "LONG" | "SHORT";

// ---------------------------------------------------------------------------
// Stage 2: map + validate
// ---------------------------------------------------------------------------

export type ImportedExecutionRow = {
  /** 1-based position among data rows (excludes the header), for user-facing messages. */
  rowIndex: number;
  symbol: string;
  assetClass: AssetClass;
  side: ExecutionSide;
  quantity: Decimal;
  price: Decimal;
  executedAt: Date;
  fees: Decimal;
  commission: Decimal;
};

export type ImportRowResult =
  | { ok: true; row: ImportedExecutionRow }
  | { ok: false; rowIndex: number; error: string };

const ASSET_CLASS_ALIASES: Record<string, AssetClass> = {
  STK: "EQUITY",
  STOCK: "EQUITY",
  EQUITY: "EQUITY",
  OPT: "OPTION",
  OPTION: "OPTION",
  FUT: "FUTURES",
  FUTURE: "FUTURES",
  FUTURES: "FUTURES",
  FX: "FOREX",
  FOREX: "FOREX",
  CASH: "FOREX",
  CRYPTO: "CRYPTO",
  COIN: "CRYPTO",
};

/** Broker exports spell "buy"/"sell" inconsistently (Buy, BOT, Bought, B, buy_to_open…) — first letter is reliable across all of them. */
function normalizeSide(raw: string): ExecutionSide | null {
  const v = raw.trim().toUpperCase();
  if (v.startsWith("B")) return "BUY";
  if (v.startsWith("S")) return "SELL";
  return null;
}

function normalizeAssetClass(raw: string): AssetClass | null {
  return ASSET_CLASS_ALIASES[raw.trim().toUpperCase()] ?? null;
}

function parseDecimal(raw: string | undefined): Decimal | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  try {
    const value = new Decimal(cleaned);
    return value.isFinite() ? value : null;
  } catch {
    return null;
  }
}

/**
 * Applies a column mapping to raw CSV rows, producing a validated execution
 * per row or a per-row error — never throws, so one bad row never sinks the
 * whole file.
 */
export function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  defaultAssetClass: AssetClass
): ImportRowResult[] {
  const col = (name: string | undefined) =>
    name ? headers.indexOf(name) : -1;
  const idx = {
    symbol: col(mapping.symbol),
    side: col(mapping.side),
    quantity: col(mapping.quantity),
    price: col(mapping.price),
    executedAt: col(mapping.executedAt),
    fees: col(mapping.fees),
    commission: col(mapping.commission),
    assetClass: col(mapping.assetClass),
  };

  return rows.map((cells, i): ImportRowResult => {
    const rowIndex = i + 1;

    const symbol = cells[idx.symbol]?.trim().toUpperCase();
    if (!symbol) return { ok: false, rowIndex, error: "Missing symbol" };

    const sideRaw = cells[idx.side] ?? "";
    const side = normalizeSide(sideRaw);
    if (!side) {
      return { ok: false, rowIndex, error: `Unrecognized side "${sideRaw}"` };
    }

    const quantity = parseDecimal(cells[idx.quantity])?.abs();
    if (!quantity || quantity.lte(0)) {
      return { ok: false, rowIndex, error: "Invalid or missing quantity" };
    }

    const price = parseDecimal(cells[idx.price]);
    if (!price || price.lte(0)) {
      return { ok: false, rowIndex, error: "Invalid or missing price" };
    }

    const executedAtRaw = cells[idx.executedAt];
    const executedAt = executedAtRaw ? new Date(executedAtRaw) : null;
    if (!executedAt || Number.isNaN(executedAt.getTime())) {
      return {
        ok: false,
        rowIndex,
        error: `Invalid execution time "${executedAtRaw ?? ""}"`,
      };
    }

    const fees = parseDecimal(cells[idx.fees])?.abs() ?? new Decimal(0);
    const commission =
      parseDecimal(cells[idx.commission])?.abs() ?? new Decimal(0);
    const assetClass =
      (idx.assetClass >= 0 ? normalizeAssetClass(cells[idx.assetClass]) : null) ??
      defaultAssetClass;

    return {
      ok: true,
      row: { rowIndex, symbol, assetClass, side, quantity, price, executedAt, fees, commission },
    };
  });
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

export type ExistingExecutionKey = {
  symbol: string;
  side: ExecutionSide;
  quantity: Decimal.Value;
  price: Decimal.Value;
  executedAt: Date;
};

function executionKey(e: {
  symbol: string;
  side: string;
  quantity: Decimal.Value;
  price: Decimal.Value;
  executedAt: Date;
}) {
  return [
    e.symbol,
    e.side,
    new Decimal(e.quantity).toString(),
    new Decimal(e.price).toString(),
    e.executedAt.getTime(),
  ].join("|");
}

/**
 * Flags rows that match an existing execution on symbol/side/quantity/price/
 * timestamp — the same fill re-imported from an overlapping date range in a
 * broker export, not just a coincidentally similar trade.
 */
export function markDuplicates(
  rows: ImportedExecutionRow[],
  existing: ExistingExecutionKey[]
): Set<number> {
  const existingKeys = new Set(existing.map(executionKey));
  const duplicateRowIndexes = new Set<number>();
  for (const row of rows) {
    if (existingKeys.has(executionKey(row))) duplicateRowIndexes.add(row.rowIndex);
  }
  return duplicateRowIndexes;
}

// ---------------------------------------------------------------------------
// Stage 3: group into trades (FIFO position tracking)
// ---------------------------------------------------------------------------

export type TradeGroup = {
  symbol: string;
  assetClass: AssetClass;
  direction: TradeDirection;
  executions: ImportedExecutionRow[];
  entryAt: Date;
  exitAt: Date | null;
  pnl: TradePnl;
  /** rowIndexes of source rows that were split across two trades by a direction flip. */
  splitRowIndexes: number[];
};

function entrySideFor(direction: TradeDirection): ExecutionSide {
  return direction === "LONG" ? "BUY" : "SELL";
}

function finalizeGroup(
  symbol: string,
  assetClass: AssetClass,
  direction: TradeDirection,
  executions: ImportedExecutionRow[],
  splitRowIndexes: number[]
): TradeGroup {
  const entrySide = entrySideFor(direction);
  const entryTimes = executions.filter((e) => e.side === entrySide).map((e) => e.executedAt.getTime());
  const exitTimes = executions.filter((e) => e.side !== entrySide).map((e) => e.executedAt.getTime());

  return {
    symbol,
    assetClass,
    direction,
    executions,
    entryAt: new Date(Math.min(...entryTimes)),
    exitAt: exitTimes.length > 0 ? new Date(Math.max(...exitTimes)) : null,
    pnl: computeTradePnl(direction, executions),
    splitRowIndexes,
  };
}

/**
 * Groups a symbol's executions (already in chronological order) into trades
 * by tracking an open position FIFO-style: same-side fills scale the
 * position, opposite-side fills reduce it, and a reducing fill larger than
 * the open quantity closes the current trade and flips into a new one with
 * the remainder. A flip fill is split proportionally (by quantity) across
 * the two trades so fees/commission stay attributed correctly — the raw CSV
 * row becomes two Execution records, which is invisible to the user beyond
 * the preview calling it out.
 */
function groupSymbolExecutions(symbol: string, executions: ImportedExecutionRow[]): TradeGroup[] {
  const groups: TradeGroup[] = [];
  const splitRowIndexes: number[] = [];

  let direction: TradeDirection | null = null;
  let openQty = new Decimal(0);
  let current: ImportedExecutionRow[] = [];
  let assetClass: AssetClass = executions[0].assetClass;

  for (const row of executions) {
    if (direction === null) {
      direction = row.side === "BUY" ? "LONG" : "SHORT";
      assetClass = row.assetClass;
      current = [row];
      openQty = row.quantity;
      continue;
    }

    const entrySide = entrySideFor(direction);
    if (row.side === entrySide) {
      current.push(row);
      openQty = openQty.plus(row.quantity);
      continue;
    }

    if (row.quantity.lte(openQty)) {
      current.push(row);
      openQty = openQty.minus(row.quantity);
      if (openQty.isZero()) {
        groups.push(finalizeGroup(symbol, assetClass, direction, current, []));
        direction = null;
        current = [];
      }
      continue;
    }

    // This fill closes the open position and flips into a new one.
    const closingQty = openQty;
    const flipQty = row.quantity.minus(openQty);
    const closingShare = closingQty.dividedBy(row.quantity);
    const flipShare = flipQty.dividedBy(row.quantity);

    current.push({
      ...row,
      quantity: closingQty,
      fees: row.fees.times(closingShare),
      commission: row.commission.times(closingShare),
    });
    groups.push(finalizeGroup(symbol, assetClass, direction, current, [row.rowIndex]));
    splitRowIndexes.push(row.rowIndex);

    direction = row.side === "BUY" ? "LONG" : "SHORT";
    assetClass = row.assetClass;
    current = [
      {
        ...row,
        quantity: flipQty,
        fees: row.fees.times(flipShare),
        commission: row.commission.times(flipShare),
      },
    ];
    openQty = flipQty;
  }

  if (direction !== null && current.length > 0) {
    groups.push(finalizeGroup(symbol, assetClass, direction, current, []));
  }

  return groups;
}

/** Groups executions across all symbols, sorting each symbol's fills chronologically first. */
export function groupExecutionsIntoTrades(rows: ImportedExecutionRow[]): TradeGroup[] {
  const bySymbol = new Map<string, ImportedExecutionRow[]>();
  for (const row of rows) {
    const existing = bySymbol.get(row.symbol) ?? [];
    existing.push(row);
    bySymbol.set(row.symbol, existing);
  }

  const groups: TradeGroup[] = [];
  for (const [symbol, symbolRows] of bySymbol) {
    const sorted = [...symbolRows].sort(
      (a, b) => a.executedAt.getTime() - b.executedAt.getTime() || a.rowIndex - b.rowIndex
    );
    groups.push(...groupSymbolExecutions(symbol, sorted));
  }

  return groups.sort((a, b) => a.entryAt.getTime() - b.entryAt.getTime());
}

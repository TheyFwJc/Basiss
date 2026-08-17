import Decimal from "decimal.js";

/**
 * Centralized P&L engine. Every monetary/quantity value that flows through
 * here is a Decimal, and every value the rest of the app reads back out is a
 * Decimal — money never touches a JS `number` in between, to avoid float
 * error accumulating across partial fills.
 */

export type ExecutionSide = "BUY" | "SELL";
export type TradeDirection = "LONG" | "SHORT";

export type ExecutionInput = {
  side: ExecutionSide;
  quantity: Decimal.Value;
  price: Decimal.Value;
  fees?: Decimal.Value;
  commission?: Decimal.Value;
};

export type TradePnl = {
  /** Total quantity opened (sum of entry-side executions). */
  quantity: Decimal;
  avgEntryPrice: Decimal;
  /** Null until at least one exit execution exists. */
  avgExitPrice: Decimal | null;
  /** Quantity closed so far (sum of exit-side executions). */
  closedQuantity: Decimal;
  fees: Decimal;
  commission: Decimal;
  /** Realized gross P&L on the closed portion. Null while fully open. */
  grossPnl: Decimal | null;
  /** grossPnl minus fees and commission. Null while fully open. */
  netPnl: Decimal | null;
  status: "OPEN" | "CLOSED";
};

function entrySideFor(direction: TradeDirection): ExecutionSide {
  return direction === "LONG" ? "BUY" : "SELL";
}

/**
 * Computes a trade's position and realized P&L from its raw executions.
 * This is the only place average price / gross / net P&L should be derived —
 * everywhere else reads the result, never recomputes it ad hoc.
 */
export function computeTradePnl(
  direction: TradeDirection,
  executions: ExecutionInput[],
  /** Dollars of P&L per 1.00 price move, per unit of quantity — 1 for
   * shares/units-style instruments (equities, forex, crypto), and the
   * contract's point value for futures (e.g. 2 for a Micro Nasdaq/MNQ
   * contract). See src/lib/futures-contracts.ts for common defaults. */
  contractMultiplier: Decimal.Value = 1
): TradePnl {
  if (executions.length === 0) {
    throw new Error("A trade must have at least one execution.");
  }

  const entrySide = entrySideFor(direction);

  let entryQty = new Decimal(0);
  let entryNotional = new Decimal(0);
  let exitQty = new Decimal(0);
  let exitNotional = new Decimal(0);
  let fees = new Decimal(0);
  let commission = new Decimal(0);

  for (const execution of executions) {
    const qty = new Decimal(execution.quantity);
    const price = new Decimal(execution.price);
    fees = fees.plus(execution.fees ?? 0);
    commission = commission.plus(execution.commission ?? 0);

    if (execution.side === entrySide) {
      entryQty = entryQty.plus(qty);
      entryNotional = entryNotional.plus(qty.times(price));
    } else {
      exitQty = exitQty.plus(qty);
      exitNotional = exitNotional.plus(qty.times(price));
    }
  }

  if (entryQty.lte(0)) {
    throw new Error(
      `A ${direction} trade needs at least one ${entrySide} execution.`
    );
  }
  if (exitQty.gt(entryQty)) {
    throw new Error(
      "Exit quantity cannot exceed entry quantity — check the executions."
    );
  }

  const avgEntryPrice = entryNotional.dividedBy(entryQty);
  const avgExitPrice = exitQty.gt(0) ? exitNotional.dividedBy(exitQty) : null;

  let grossPnl: Decimal | null = null;
  let netPnl: Decimal | null = null;
  if (avgExitPrice) {
    const priceMove =
      direction === "LONG"
        ? avgExitPrice.minus(avgEntryPrice)
        : avgEntryPrice.minus(avgExitPrice);
    grossPnl = priceMove.times(exitQty).times(contractMultiplier);
    netPnl = grossPnl.minus(fees).minus(commission);
  }

  return {
    quantity: entryQty,
    avgEntryPrice,
    avgExitPrice,
    closedQuantity: exitQty,
    fees,
    commission,
    grossPnl,
    netPnl,
    status: exitQty.gte(entryQty) ? "CLOSED" : "OPEN",
  };
}

/**
 * Dollar risk for a position: distance from entry to stop, times quantity.
 * Returns null when there's no stop loss to measure against.
 */
export function computeRiskAmount(
  direction: TradeDirection,
  avgEntryPrice: Decimal.Value,
  stopLoss: Decimal.Value | null | undefined,
  quantity: Decimal.Value,
  contractMultiplier: Decimal.Value = 1
): Decimal | null {
  if (stopLoss == null) return null;
  const entry = new Decimal(avgEntryPrice);
  const stop = new Decimal(stopLoss);
  const qty = new Decimal(quantity);
  const distance = direction === "LONG" ? entry.minus(stop) : stop.minus(entry);
  return distance.abs().times(qty).times(contractMultiplier);
}

/** R-multiple: net P&L expressed as a multiple of dollar risk. */
export function computeRMultiple(
  netPnl: Decimal.Value | null,
  riskAmount: Decimal.Value | null
): Decimal | null {
  if (netPnl == null || riskAmount == null) return null;
  const risk = new Decimal(riskAmount);
  if (risk.lte(0)) return null;
  return new Decimal(netPnl).dividedBy(risk);
}

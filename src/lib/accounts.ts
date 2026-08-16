import Decimal from "decimal.js";

/**
 * An account's current balance is its starting balance plus realized net
 * P&L from closed trades — it does not yet account for deposits or
 * withdrawals, since `EquitySnapshot` isn't populated by anything yet (see
 * ARCHITECTURE.md). This is the only place that combination is computed;
 * everywhere else reads the result.
 */
export function computeCurrentBalance(
  startingBalance: Decimal.Value,
  realizedNetPnl: Decimal.Value | null | undefined
): Decimal {
  return new Decimal(startingBalance).plus(realizedNetPnl ?? 0);
}

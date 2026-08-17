/**
 * Point value (dollars of P&L per 1.00 move in price, per contract) for
 * common CME-family futures — used only to prefill a sensible default
 * contract multiplier when someone logs a Futures trade. Not authoritative
 * or exhaustive (interest-rate and grain futures have fractional/tick-based
 * conventions that don't reduce to a single "$ per point" the way
 * equity-index and metal/energy contracts do), and always overridable —
 * this app has no live contract-spec feed. Deliberately keyed by root
 * symbol only (no expiry code), since that's what most people type/import.
 */
export const FUTURES_POINT_VALUES: Record<string, number> = {
  MNQ: 2, // Micro E-mini Nasdaq-100
  MES: 5, // Micro E-mini S&P 500
  MYM: 0.5, // Micro E-mini Dow
  M2K: 5, // Micro E-mini Russell 2000
  NQ: 20, // E-mini Nasdaq-100
  ES: 50, // E-mini S&P 500
  YM: 5, // E-mini Dow
  RTY: 50, // E-mini Russell 2000
  MCL: 100, // Micro WTI Crude Oil
  CL: 1000, // WTI Crude Oil
  MGC: 10, // Micro Gold
  GC: 100, // Gold
};

// Longest root first so e.g. "MNQ" wins over "NQ" for a symbol like "MNQZ25".
const KNOWN_ROOTS = Object.keys(FUTURES_POINT_VALUES).sort((a, b) => b.length - a.length);

/**
 * Matches a typed/imported symbol (which may carry an expiry code, e.g.
 * "MNQZ25") against the longest known futures root that prefixes it.
 * Returns null for anything not recognized — callers should fall back to a
 * multiplier of 1 rather than guessing.
 */
export function lookupFuturesPointValue(symbol: string): number | null {
  const upper = symbol.trim().toUpperCase();
  const root = KNOWN_ROOTS.find((r) => upper.startsWith(r));
  return root ? FUTURES_POINT_VALUES[root] : null;
}

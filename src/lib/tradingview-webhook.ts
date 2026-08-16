import { z } from "zod";
import type { ExecutionSide } from "./import";

/**
 * The JSON alert-message shape a TradingView Strategy alert should send —
 * matches placeholders available on strategy alerts ({{ticker}},
 * {{strategy.order.action}}, {{strategy.order.contracts}}, {{close}},
 * {{timenow}}), documented on the Help page and in the help assistant.
 */
export const tradingViewPayloadSchema = z.object({
  symbol: z.string().trim().min(1).max(40),
  side: z.string().trim().min(1),
  quantity: z.union([z.string(), z.number()]),
  price: z.union([z.string(), z.number()]),
  time: z.union([z.string(), z.number()]).optional(),
});

export type TradingViewPayload = z.infer<typeof tradingViewPayloadSchema>;

const BUY_ALIASES = new Set(["buy", "long", "b"]);
const SELL_ALIASES = new Set(["sell", "short", "s"]);

/** Normalizes TradingView's action strings ("buy"/"sell", from
 * {{strategy.order.action}}) to our BUY/SELL side — null if unrecognized. */
export function normalizeSide(raw: string): ExecutionSide | null {
  const value = raw.trim().toLowerCase();
  if (BUY_ALIASES.has(value)) return "BUY";
  if (SELL_ALIASES.has(value)) return "SELL";
  return null;
}

/** TradingView's {{timenow}}/{{time}} placeholders resolve to a unix
 * timestamp (seconds or milliseconds depending on context) or an ISO
 * string. Falls back to "now" if missing/unparseable, since some alert
 * templates omit a time field entirely. */
export function parseExecutedAt(time: string | number | undefined): Date {
  if (time === undefined) return new Date();

  if (typeof time === "number") {
    const ms = time > 10_000_000_000 ? time : time * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  const numeric = Number(time);
  if (!Number.isNaN(numeric) && time.trim() !== "") {
    return parseExecutedAt(numeric);
  }

  const parsed = new Date(time);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

import { z } from "zod";

export const assetClasses = [
  "EQUITY",
  "OPTION",
  "FUTURES",
  "FOREX",
  "CRYPTO",
  "OTHER",
] as const;

export const tradeDirections = ["LONG", "SHORT"] as const;
export const executionSides = ["BUY", "SELL"] as const;

export const tradingSessions = [
  "PRE_MARKET",
  "OPEN",
  "MIDDAY",
  "POWER_HOUR",
  "AFTER_HOURS",
  "OVERNIGHT",
] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

/** A number field that may arrive as "" from an empty optional input. */
const optionalPositiveNumber = z
  .union([z.literal(""), z.coerce.number().positive()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

/** Like optionalPositiveNumber, but falls back to a default instead of undefined. */
const positiveNumberWithDefault = (defaultValue: number) =>
  z
    .union([z.literal(""), z.coerce.number().positive()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? defaultValue : v));

const optionalRating = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(5)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const executionInputSchema = z.object({
  side: z.enum(executionSides),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  executedAt: z.string().min(1, "Execution time is required"),
  fees: z.coerce.number().min(0).default(0),
  commission: z.coerce.number().min(0).default(0),
});

export type ExecutionFormInput = z.infer<typeof executionInputSchema>;

export const tradeSchema = z.object({
  tradingAccountId: z.string().min(1, "Account is required"),
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required")
    .max(20)
    .transform((s) => s.toUpperCase()),
  assetClass: z.enum(assetClasses),
  direction: z.enum(tradeDirections),
  executions: z
    .array(executionInputSchema)
    .min(1, "At least one execution is required"),
  /** Dollars of P&L per 1.00 price move, per unit of quantity — 1 for
   * shares/units-style instruments, a futures contract's point value
   * otherwise (e.g. 2 for Micro Nasdaq/MNQ). */
  contractMultiplier: positiveNumberWithDefault(1),

  stopLoss: optionalPositiveNumber,
  takeProfit: optionalPositiveNumber,

  strategyId: optionalText(50),
  playbookId: optionalText(50),
  session: z.enum(tradingSessions).optional().or(z.literal("")),
  marketCondition: optionalText(200),

  notesBefore: optionalText(4000),
  notesDuring: optionalText(4000),
  notesAfter: optionalText(4000),

  emotionBefore: optionalText(50),
  emotionDuring: optionalText(50),
  emotionAfter: optionalText(50),
  confidence: optionalRating,
  executionRating: optionalRating,
  ruleAdherence: optionalRating,

  mistakeIds: z.array(z.string()).optional().default([]),
  checklistItemIds: z.array(z.string()).optional().default([]),
}).superRefine((data, ctx) => {
  const entrySide = data.direction === "LONG" ? "BUY" : "SELL";
  const entryTimestamps = data.executions
    .filter((e) => e.side === entrySide)
    .map((e) => new Date(e.executedAt).getTime())
    .filter((t) => !Number.isNaN(t));
  if (entryTimestamps.length === 0) return;

  const earliestEntry = Math.min(...entryTimestamps);
  data.executions.forEach((execution, index) => {
    if (execution.side === entrySide) return;
    const exitTime = new Date(execution.executedAt).getTime();
    if (!Number.isNaN(exitTime) && exitTime < earliestEntry) {
      ctx.addIssue({
        code: "custom",
        message: "Exit time cannot be before the trade's entry time.",
        path: ["executions", index, "executedAt"],
      });
    }
  });
});

export type TradeInput = z.infer<typeof tradeSchema>;

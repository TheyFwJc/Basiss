import { z } from "zod";

export const tradingAccountTypes = [
  "BROKERAGE",
  "FUTURES",
  "FOREX",
  "CRYPTO",
  "PROP_FIRM",
  "PAPER",
  "OTHER",
] as const;

export const tradingAccountStatuses = ["ACTIVE", "INACTIVE", "CLOSED"] as const;

export const tradingAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  broker: z.string().trim().max(80).optional().or(z.literal("")),
  accountType: z.enum(tradingAccountTypes),
  startingBalance: z.coerce
    .number()
    .finite()
    .refine((v) => v >= 0, "Starting balance must be zero or positive"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use a 3-letter currency code, e.g. USD")
    .default("USD"),
  status: z.enum(tradingAccountStatuses).default("ACTIVE"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type TradingAccountInput = z.infer<typeof tradingAccountSchema>;

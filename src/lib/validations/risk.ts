import { z } from "zod";

const optionalPercent = z
  .union([z.literal(""), z.coerce.number().min(0).max(100)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const riskSettingsSchema = z.object({
  defaultRiskPerTradePct: optionalPercent,
  maxDailyLossPct: optionalPercent,
  maxWeeklyLossPct: optionalPercent,
});

export type RiskSettingsInput = z.infer<typeof riskSettingsSchema>;

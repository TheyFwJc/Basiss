import { z } from "zod";

export const goalMetrics = [
  "MAX_DAILY_LOSS",
  "MONTHLY_PNL_TARGET",
  "TRADE_COUNT",
  "WIN_RATE",
  "AVERAGE_R",
  "RULE_FOLLOWING",
] as const;

export const goalPeriods = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export const goalSchema = z.object({
  metric: z.enum(goalMetrics),
  period: z.enum(goalPeriods),
  targetValue: z.coerce.number().positive("Target must be greater than 0"),
});

export type GoalInput = z.infer<typeof goalSchema>;

import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const strategySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: optionalText(2000),
  entryCriteria: optionalText(2000),
  exitCriteria: optionalText(2000),
  stopLossRules: optionalText(2000),
  takeProfitRules: optionalText(2000),
  timeframe: optionalText(50),
  marketConditions: optionalText(500),
});

export type StrategyInput = z.infer<typeof strategySchema>;

import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const ruleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: optionalText(500),
});

export type RuleInput = z.infer<typeof ruleSchema>;

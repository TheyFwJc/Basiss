import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const playbookSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  setupDescription: optionalText(2000),
  entryRules: optionalText(2000),
  stopRules: optionalText(2000),
  targetRules: optionalText(2000),
  invalidations: optionalText(2000),
});

export type PlaybookInput = z.infer<typeof playbookSchema>;

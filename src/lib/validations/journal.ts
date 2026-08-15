import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const journalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const journalEntrySchema = z.object({
  marketOverview: optionalText(4000),
  tradingPlan: optionalText(4000),
  goals: optionalText(2000),
  mentalState: optionalText(2000),
  importantLevels: optionalText(2000),
  newsEvents: optionalText(2000),
  endOfDayReview: optionalText(4000),
  lessonsLearned: optionalText(2000),
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;

import { z } from "zod";

export const checklistSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  playbookId: z.string().trim().max(50).optional().or(z.literal("")),
  itemLabels: z
    .array(z.string().trim().min(1).max(200))
    .max(50)
    .optional()
    .default([]),
});

export type ChecklistInput = z.infer<typeof checklistSchema>;

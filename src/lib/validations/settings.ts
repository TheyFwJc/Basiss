import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const preferencesSchema = z.object({
  timezone: z.string().trim().min(1).max(100),
  baseCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use a 3-letter currency code, e.g. USD"),
});

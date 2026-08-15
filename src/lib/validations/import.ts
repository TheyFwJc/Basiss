import { z } from "zod";
import { assetClasses } from "./trade";

/** Fields a CSV column can be mapped to. The first five are required to build an execution. */
export const requiredMappingFields = [
  "symbol",
  "side",
  "quantity",
  "price",
  "executedAt",
] as const;
export const optionalMappingFields = ["fees", "commission", "assetClass"] as const;

export const columnMappingSchema = z.object({
  symbol: z.string().min(1, "Map a column for symbol"),
  side: z.string().min(1, "Map a column for side"),
  quantity: z.string().min(1, "Map a column for quantity"),
  price: z.string().min(1, "Map a column for price"),
  executedAt: z.string().min(1, "Map a column for execution time"),
  fees: z.string().optional().or(z.literal("")),
  commission: z.string().optional().or(z.literal("")),
  assetClass: z.string().optional().or(z.literal("")),
});
export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const importStartSchema = z.object({
  tradingAccountId: z.string().min(1, "Account is required"),
  broker: z.string().trim().min(1, "Broker is required").max(80),
  defaultAssetClass: z.enum(assetClasses),
});
export type ImportStartInput = z.infer<typeof importStartSchema>;

const executionSides = ["BUY", "SELL"] as const;

/** A single already-mapped, already-validated row, serialized for the wire (Decimal/Date as strings). */
export const importRowSchema = z.object({
  rowIndex: z.number().int(),
  symbol: z.string().trim().min(1),
  assetClass: z.enum(assetClasses),
  side: z.enum(executionSides),
  quantity: z.string().min(1),
  price: z.string().min(1),
  executedAt: z.string().min(1),
  fees: z.string().min(1),
  commission: z.string().min(1),
});
export type ImportRowInput = z.infer<typeof importRowSchema>;

export const commitImportSchema = z.object({
  jobId: z.string().min(1),
  tradingAccountId: z.string().min(1),
  broker: z.string().trim().min(1).max(80),
  mapping: columnMappingSchema,
  rows: z.array(importRowSchema).min(1, "No rows selected to import"),
  skippedDuplicates: z.number().int().min(0),
  rowErrors: z.number().int().min(0),
});
export type CommitImportInput = z.infer<typeof commitImportSchema>;

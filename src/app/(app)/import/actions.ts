"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/import-parse";
import {
  groupExecutionsIntoTrades,
  tradeCreateDataFromGroup,
  type ImportedExecutionRow,
  type TradeGroup,
} from "@/lib/import";
import {
  importStartSchema,
  commitImportSchema,
  type ColumnMapping,
} from "@/lib/validations/import";
import { canAddTrade } from "@/lib/subscription";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export type StartImportResult =
  | { error: string }
  | {
      jobId: string;
      headers: string[];
      rows: string[][];
      savedMapping: ColumnMapping | null;
    };

/** Parses the uploaded file, opens an ImportJob, and returns headers/rows for the mapping step plus any previously-saved mapping for this broker. */
export async function startImportAction(formData: FormData): Promise<StartImportResult> {
  const userId = await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file uploaded." };
  if (file.size === 0) return { error: "The file is empty." };

  const parsedStart = importStartSchema.safeParse({
    tradingAccountId: formData.get("tradingAccountId"),
    broker: formData.get("broker"),
    defaultAssetClass: formData.get("defaultAssetClass"),
  });
  if (!parsedStart.success) {
    return { error: parsedStart.error.issues[0]?.message ?? "Invalid input." };
  }
  const { tradingAccountId, broker } = parsedStart.data;

  const account = await db.tradingAccount.findFirst({
    where: { id: tradingAccountId, userId },
  });
  if (!account) return { error: "Trading account not found." };

  const text = await file.text();
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) {
    return { error: "Couldn't find a header row in this file." };
  }
  if (rows.length === 0) {
    return { error: "No data rows found in this file." };
  }

  const job = await db.importJob.create({
    data: {
      userId,
      tradingAccountId,
      broker,
      fileName: file.name,
      status: "PENDING",
      rowCount: rows.length,
    },
  });
  await db.importJob.update({ where: { id: job.id }, data: { status: "MAPPING" } });

  const savedMapping = await db.importMapping.findUnique({
    where: { userId_broker: { userId, broker } },
  });

  return {
    jobId: job.id,
    headers,
    rows,
    savedMapping: savedMapping ? (savedMapping.mapping as unknown as ColumnMapping) : null,
  };
}

export type ExistingExecutionKeyDto = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  price: string;
  executedAt: string;
};

/** Existing executions for this account, serialized for client-side duplicate detection. */
export async function fetchExistingExecutionKeysAction(
  tradingAccountId: string
): Promise<ExistingExecutionKeyDto[]> {
  const userId = await requireUserId();
  const executions = await db.execution.findMany({
    where: { trade: { tradingAccountId, userId } },
    select: {
      side: true,
      quantity: true,
      price: true,
      executedAt: true,
      trade: { select: { symbol: true } },
    },
  });
  return executions.map((e) => ({
    symbol: e.trade.symbol,
    side: e.side,
    quantity: e.quantity.toString(),
    price: e.price.toString(),
    executedAt: e.executedAt.toISOString(),
  }));
}

export type CommitImportResult =
  | { error: string }
  | { tradesCreated: number; executionsCreated: number };

/** Re-derives trade groups from the client-confirmed rows and writes them, never trusting client-computed trades directly. */
export async function commitImportAction(input: unknown): Promise<CommitImportResult> {
  const userId = await requireUserId();
  const parsed = commitImportSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid import data." };
  }
  const { jobId, tradingAccountId, broker, mapping, rows, skippedDuplicates, rowErrors } =
    parsed.data;

  const job = await db.importJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return { error: "Import job not found." };

  const account = await db.tradingAccount.findFirst({
    where: { id: tradingAccountId, userId },
  });
  if (!account) return { error: "Trading account not found." };

  const executionRows: ImportedExecutionRow[] = rows.map((r) => ({
    rowIndex: r.rowIndex,
    symbol: r.symbol,
    assetClass: r.assetClass,
    side: r.side,
    quantity: new Decimal(r.quantity),
    price: new Decimal(r.price),
    executedAt: new Date(r.executedAt),
    fees: new Decimal(r.fees),
    commission: new Decimal(r.commission),
  }));

  let groups: TradeGroup[];
  try {
    groups = groupExecutionsIntoTrades(executionRows);
  } catch (error) {
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorLog: error instanceof Error ? error.message : "Failed to group executions.",
      },
    });
    return {
      error: "Couldn't group these executions into trades — check the data and try again.",
    };
  }

  const limit = await canAddTrade(userId);
  if (limit.limit != null) {
    const remaining = Math.max(0, limit.limit - limit.count);
    if (groups.length > remaining) {
      return {
        error:
          remaining === 0
            ? `You've reached the Free plan's limit of ${limit.limit} trades this month. Upgrade to Pro for unlimited trades.`
            : `This import would create ${groups.length} trades, but your Free plan only has ${remaining} left this month. Upgrade to Pro for unlimited trades, or import fewer rows.`,
      };
    }
  }

  try {
    await db.$transaction([
      ...groups.map((group) =>
        db.trade.create({ data: tradeCreateDataFromGroup(group, userId, tradingAccountId) })
      ),
      db.importMapping.upsert({
        where: { userId_broker: { userId, broker } },
        create: { userId, broker, mapping },
        update: { mapping },
      }),
      db.importJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          importedCount: executionRows.length,
          skippedCount: skippedDuplicates,
          errorCount: rowErrors,
        },
      }),
    ]);
  } catch (error) {
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorLog: error instanceof Error ? error.message : "Failed to save imported trades.",
      },
    });
    return { error: "Something went wrong committing this import. No trades were created." };
  }

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  revalidatePath("/import");
  return { tradesCreated: groups.length, executionsCreated: executionRows.length };
}

export async function deleteImportJobAction(id: string) {
  const userId = await requireUserId();
  await db.importJob.deleteMany({ where: { id, userId } });
  revalidatePath("/import");
}

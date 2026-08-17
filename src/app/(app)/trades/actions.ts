"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tradeSchema, type TradeInput } from "@/lib/validations/trade";
import { computeTradePnl, computeRiskAmount, computeRMultiple } from "@/lib/pnl";
import { canAddTrade } from "@/lib/subscription";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function entrySideFor(direction: "LONG" | "SHORT") {
  return direction === "LONG" ? "BUY" : "SELL";
}

async function buildTradeWriteData(userId: string, input: TradeInput) {
  const account = await db.tradingAccount.findFirst({
    where: { id: input.tradingAccountId, userId },
  });
  if (!account) throw new Error("Trading account not found.");

  const pnl = computeTradePnl(input.direction, input.executions, input.contractMultiplier);
  const riskAmount = computeRiskAmount(
    input.direction,
    pnl.avgEntryPrice,
    input.stopLoss,
    pnl.quantity,
    input.contractMultiplier
  );
  // Approximated against the account's starting balance — real running
  // equity tracking (deposits/withdrawals) isn't modeled yet.
  const riskPercent = riskAmount
    ? riskAmount.dividedBy(new Decimal(account.startingBalance)).times(100)
    : null;
  const rMultiple = computeRMultiple(pnl.netPnl, riskAmount);

  const entrySide = entrySideFor(input.direction);
  const entryTimestamps = input.executions
    .filter((e) => e.side === entrySide)
    .map((e) => new Date(e.executedAt).getTime());
  const exitTimestamps = input.executions
    .filter((e) => e.side !== entrySide)
    .map((e) => new Date(e.executedAt).getTime());

  const entryAt = new Date(Math.min(...entryTimestamps));
  const exitAt = exitTimestamps.length
    ? new Date(Math.max(...exitTimestamps))
    : null;

  return {
    tradingAccountId: input.tradingAccountId,
    symbol: input.symbol,
    assetClass: input.assetClass,
    direction: input.direction,
    status: pnl.status,
    contractMultiplier: input.contractMultiplier.toString(),
    quantity: pnl.quantity.toString(),
    avgEntryPrice: pnl.avgEntryPrice.toString(),
    avgExitPrice: pnl.avgExitPrice?.toString() ?? null,
    entryAt,
    exitAt,
    stopLoss: input.stopLoss?.toString() ?? null,
    takeProfit: input.takeProfit?.toString() ?? null,
    fees: pnl.fees.toString(),
    commission: pnl.commission.toString(),
    grossPnl: pnl.grossPnl?.toString() ?? null,
    netPnl: pnl.netPnl?.toString() ?? null,
    riskAmount: riskAmount?.toString() ?? null,
    riskPercent: riskPercent?.toString() ?? null,
    rMultiple: rMultiple?.toString() ?? null,
    strategyId: input.strategyId || null,
    playbookId: input.playbookId || null,
    session: input.session || null,
    marketCondition: input.marketCondition || null,
    notesBefore: input.notesBefore || null,
    notesDuring: input.notesDuring || null,
    notesAfter: input.notesAfter || null,
    emotionBefore: input.emotionBefore || null,
    emotionDuring: input.emotionDuring || null,
    emotionAfter: input.emotionAfter || null,
    confidence: input.confidence ?? null,
    executionRating: input.executionRating ?? null,
    ruleAdherence: input.ruleAdherence ?? null,
  };
}

/** Filters to only mistake IDs that actually belong to this user. */
async function ownedMistakeIds(userId: string, mistakeIds: string[]) {
  if (mistakeIds.length === 0) return [];
  const owned = await db.mistake.findMany({
    where: { id: { in: mistakeIds }, userId },
    select: { id: true },
  });
  return owned.map((m) => m.id);
}

/** Filters to only checklist item IDs whose checklist belongs to this user. */
async function ownedChecklistItemIds(userId: string, checklistItemIds: string[]) {
  if (checklistItemIds.length === 0) return [];
  const owned = await db.checklistItem.findMany({
    where: { id: { in: checklistItemIds }, checklist: { userId } },
    select: { id: true },
  });
  return owned.map((i) => i.id);
}

export async function createTradeAction(
  input: TradeInput
): Promise<{ error: string } | { id: string }> {
  const userId = await requireUserId();

  const limit = await canAddTrade(userId);
  if (!limit.allowed) {
    return {
      error: `You've reached the Free plan's limit of ${limit.limit} trades this month. Upgrade to Pro for unlimited trades.`,
    };
  }

  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let data;
  try {
    data = await buildTradeWriteData(userId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid trade." };
  }

  const mistakeIds = await ownedMistakeIds(userId, parsed.data.mistakeIds);
  const checklistItemIds = await ownedChecklistItemIds(
    userId,
    parsed.data.checklistItemIds
  );

  const trade = await db.trade.create({
    data: {
      ...data,
      userId,
      executions: {
        create: parsed.data.executions.map((e) => ({
          side: e.side,
          quantity: e.quantity.toString(),
          price: e.price.toString(),
          executedAt: new Date(e.executedAt),
          fees: e.fees.toString(),
          commission: e.commission.toString(),
        })),
      },
      mistakes: {
        create: mistakeIds.map((mistakeId) => ({ mistakeId })),
      },
      checklistEntries: {
        create: checklistItemIds.map((checklistItemId) => ({
          checklistItemId,
          completed: true,
        })),
      },
    },
  });

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  revalidatePath("/mistakes");
  return { id: trade.id };
}

export async function updateTradeAction(
  tradeId: string,
  input: TradeInput
): Promise<{ error: string } | { id: string }> {
  const userId = await requireUserId();
  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.trade.findFirst({ where: { id: tradeId, userId } });
  if (!existing) return { error: "Trade not found." };

  let data;
  try {
    data = await buildTradeWriteData(userId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid trade." };
  }

  const mistakeIds = await ownedMistakeIds(userId, parsed.data.mistakeIds);
  const checklistItemIds = await ownedChecklistItemIds(
    userId,
    parsed.data.checklistItemIds
  );

  await db.$transaction([
    db.execution.deleteMany({ where: { tradeId } }),
    db.tradeMistake.deleteMany({ where: { tradeId } }),
    db.tradeChecklistItem.deleteMany({ where: { tradeId } }),
    db.trade.update({
      where: { id: tradeId },
      data: {
        ...data,
        executions: {
          create: parsed.data.executions.map((e) => ({
            side: e.side,
            quantity: e.quantity.toString(),
            price: e.price.toString(),
            executedAt: new Date(e.executedAt),
            fees: e.fees.toString(),
            commission: e.commission.toString(),
          })),
        },
        mistakes: {
          create: mistakeIds.map((mistakeId) => ({ mistakeId })),
        },
        checklistEntries: {
          create: checklistItemIds.map((checklistItemId) => ({
            checklistItemId,
            completed: true,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/trades");
  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/mistakes");
  return { id: tradeId };
}

export async function deleteTradeAction(tradeId: string) {
  const userId = await requireUserId();
  await db.trade.deleteMany({ where: { id: tradeId, userId } });
  revalidatePath("/trades");
  revalidatePath("/dashboard");
  redirect("/trades");
}

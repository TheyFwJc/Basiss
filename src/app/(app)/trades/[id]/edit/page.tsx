import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { canUseFeature } from "@/lib/subscription";
import { TradeForm } from "../../trade-form";

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [trade, accounts, strategies, playbooks, mistakes, checklists, recentTrades, canUploadScreenshots] =
    await Promise.all([
      db.trade.findFirst({
        where: { id, userId },
        include: {
          executions: { orderBy: { executedAt: "asc" } },
          mistakes: { select: { mistakeId: true } },
          checklistEntries: { select: { checklistItemId: true } },
          screenshots: { orderBy: { createdAt: "asc" } },
        },
      }),
      db.tradingAccount.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      }),
      db.strategy.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.playbook.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.mistake.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.checklist.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      db.trade.findMany({
        where: { userId },
        distinct: ["symbol"],
        orderBy: { entryAt: "desc" },
        select: { symbol: true },
        take: 8,
      }),
      canUseFeature(userId, "SCREENSHOTS"),
    ]);

  if (!trade) notFound();
  const recentSymbols = recentTrades.map((t) => t.symbol);

  return (
    <div>
      <PageHeader
        title={`Edit ${trade.symbol} trade`}
        description="Update the executions or details — P&L and R are recalculated on save."
      />
      <TradeForm
        accounts={accounts}
        strategies={strategies}
        playbooks={playbooks}
        mistakes={mistakes}
        checklists={checklists}
        recentSymbols={recentSymbols}
        canUploadScreenshots={canUploadScreenshots}
        existingScreenshots={trade.screenshots}
        defaults={{
          id: trade.id,
          tradingAccountId: trade.tradingAccountId,
          symbol: trade.symbol,
          assetClass: trade.assetClass,
          direction: trade.direction,
          contractMultiplier: trade.contractMultiplier.toString(),
          stopLoss: trade.stopLoss?.toString() ?? null,
          takeProfit: trade.takeProfit?.toString() ?? null,
          strategyId: trade.strategyId,
          playbookId: trade.playbookId,
          session: trade.session,
          marketCondition: trade.marketCondition,
          notesBefore: trade.notesBefore,
          notesDuring: trade.notesDuring,
          notesAfter: trade.notesAfter,
          emotionBefore: trade.emotionBefore,
          emotionDuring: trade.emotionDuring,
          emotionAfter: trade.emotionAfter,
          confidence: trade.confidence,
          executionRating: trade.executionRating,
          ruleAdherence: trade.ruleAdherence,
          mistakeIds: trade.mistakes.map((m) => m.mistakeId),
          checklistItemIds: trade.checklistEntries.map((c) => c.checklistItemId),
          executions: trade.executions.map((e) => ({
            side: e.side,
            quantity: e.quantity.toString(),
            price: e.price.toString(),
            executedAt: e.executedAt.toISOString(),
            fees: e.fees.toString(),
            commission: e.commission.toString(),
          })),
        }}
      />
    </div>
  );
}

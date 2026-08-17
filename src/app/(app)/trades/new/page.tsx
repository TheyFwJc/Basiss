import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { canAddTrade, canUseFeature } from "@/lib/subscription";
import { TradeForm } from "../trade-form";

export default async function NewTradePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [
    accounts,
    strategies,
    playbooks,
    mistakes,
    checklists,
    recentTrades,
    tradeLimit,
    canUploadScreenshots,
  ] = await Promise.all([
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
      canAddTrade(userId),
      canUseFeature(userId, "SCREENSHOTS"),
    ]);
  const recentSymbols = recentTrades.map((t) => t.symbol);

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader title="Add trade" />
        <EmptyState
          icon={Wallet}
          title="Add a trading account first"
          description="Every trade belongs to an account. Add one, then come back here to log your trade."
          actions={
            <Button
              render={<Link href="/accounts">Go to accounts</Link>}
              nativeButton={false}
              size="sm"
            />
          }
        />
      </div>
    );
  }

  if (!tradeLimit.allowed) {
    return (
      <div>
        <PageHeader title="Add trade" />
        <UpgradePrompt feature="Unlimited trades" requiredPlan="PRO" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Add trade"
        description="Log entries and exits — P&L and R are calculated for you."
      />
      <TradeForm
        accounts={accounts}
        strategies={strategies}
        playbooks={playbooks}
        mistakes={mistakes}
        checklists={checklists}
        recentSymbols={recentSymbols}
        canUploadScreenshots={canUploadScreenshots}
      />
    </div>
  );
}

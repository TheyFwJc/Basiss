import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { canUseFeature } from "@/lib/subscription";
import { ACCOUNT_SCOPE_COOKIE, resolveScopedAccountId } from "@/lib/account-scope";
import { InsightsPanel } from "./insights-panel";

const MIN_TRADES_FOR_INSIGHTS = 10;

export default async function InsightsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [hasAccess, accountIds] = await Promise.all([
    canUseFeature(userId, "AI_INSIGHTS"),
    db.tradingAccount.findMany({ where: { userId }, select: { id: true } }),
  ]);
  const rawScope = (await cookies()).get(ACCOUNT_SCOPE_COOKIE)?.value;
  const scopedAccountId = resolveScopedAccountId(rawScope, accountIds.map((a) => a.id));
  const closedTradeCount = await db.trade.count({
    where: {
      userId,
      status: "CLOSED",
      ...(scopedAccountId ? { tradingAccountId: scopedAccountId } : {}),
    },
  });

  return (
    <div>
      <PageHeader
        title="Insights"
        description="Ask AI to review your own trading data — patterns, tendencies, and what's costing you. Never a market call, never a guarantee."
      />

      {!hasAccess ? (
        <UpgradePrompt feature="AI-Powered Trade Analysis" requiredPlan="PRO_PLUS" />
      ) : closedTradeCount < MIN_TRADES_FOR_INSIGHTS ? (
        <EmptyState
          icon={Sparkles}
          title="Not enough closed trades yet"
          description={`Insights need at least ${MIN_TRADES_FOR_INSIGHTS} closed trades to find real patterns — you have ${closedTradeCount} so far. Keep logging trades and check back.`}
        />
      ) : (
        <InsightsPanel />
      )}
    </div>
  );
}

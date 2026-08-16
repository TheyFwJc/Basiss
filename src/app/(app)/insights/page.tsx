import { Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { InsightsPanel } from "./insights-panel";

const MIN_TRADES_FOR_INSIGHTS = 10;

export default async function InsightsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const closedTradeCount = await db.trade.count({ where: { userId, status: "CLOSED" } });

  return (
    <div>
      <PageHeader
        title="Insights"
        description="Ask AI to review your own trading data — patterns, tendencies, and what's costing you. Never a market call, never a guarantee."
      />

      {closedTradeCount < MIN_TRADES_FOR_INSIGHTS ? (
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

import { Plus, Target, MoreHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StrategyFormDialog } from "./strategy-form-dialog";
import { EditStrategyItem } from "./edit-strategy-item";
import { DeleteStrategyButton } from "./delete-strategy-button";

export default async function StrategiesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const strategies = await db.strategy.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { trades: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Strategies"
        description="Define your trading strategies and track how each one performs."
        actions={
          <StrategyFormDialog
            trigger={
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-4" />
                New strategy
              </button>
            }
          />
        }
      />

      {strategies.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No strategies yet"
          description="Define entry/exit criteria, stop and target rules for a strategy, then tag trades with it to see how it performs (once analytics ship in Phase 3)."
          actions={
            <StrategyFormDialog
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Create your first strategy
                </button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <Card key={strategy.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{strategy.name}</CardTitle>
                  {strategy.timeframe && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {strategy.timeframe}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Actions for ${strategy.name}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon",
                          className: "size-8 shrink-0",
                        })}
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <EditStrategyItem
                      strategy={{
                        id: strategy.id,
                        name: strategy.name,
                        description: strategy.description,
                        entryCriteria: strategy.entryCriteria,
                        exitCriteria: strategy.exitCriteria,
                        stopLossRules: strategy.stopLossRules,
                        takeProfitRules: strategy.takeProfitRules,
                        timeframe: strategy.timeframe,
                        marketConditions: strategy.marketConditions,
                      }}
                    />
                    <DeleteStrategyButton id={strategy.id} name={strategy.name} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {strategy.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {strategy.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {strategy._count.trades} trade
                  {strategy._count.trades === 1 ? "" : "s"} tagged
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

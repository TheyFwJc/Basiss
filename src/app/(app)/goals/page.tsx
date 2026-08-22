import { cookies } from "next/headers";
import { Plus, Flag, MoreHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ACCOUNT_SCOPE_COOKIE, resolveScopedAccountId } from "@/lib/account-scope";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import { computeGoalProgress, type GoalMetric, type GoalPeriod, type GoalTrade } from "@/lib/goals";
import { GoalFormDialog } from "./goal-form-dialog";
import { METRIC_LABELS, PERIOD_LABELS, PERIOD_PHRASES } from "./goal-labels";
import { EditGoalItem } from "./edit-goal-item";
import { DeleteGoalButton } from "./delete-goal-button";

function formatGoalValue(metric: GoalMetric, value: number) {
  switch (metric) {
    case "MAX_DAILY_LOSS":
    case "MONTHLY_PNL_TARGET":
      return formatCurrency(value);
    case "WIN_RATE":
      return `${value.toFixed(0)}%`;
    case "AVERAGE_R":
      return `${value.toFixed(2)}R`;
    case "RULE_FOLLOWING":
      return value.toFixed(1);
    case "TRADE_COUNT":
      return value.toFixed(0);
  }
}

export default async function GoalsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [goals, accountIds] = await Promise.all([
    db.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.tradingAccount.findMany({ where: { userId }, select: { id: true } }),
  ]);
  const rawScope = (await cookies()).get(ACCOUNT_SCOPE_COOKIE)?.value;
  const scopedAccountId = resolveScopedAccountId(rawScope, accountIds.map((a) => a.id));

  const trades = await db.trade.findMany({
    where: {
      userId,
      status: "CLOSED",
      ...(scopedAccountId ? { tradingAccountId: scopedAccountId } : {}),
    },
    select: { netPnl: true, rMultiple: true, exitAt: true, status: true, ruleAdherence: true },
  });

  const goalTrades: GoalTrade[] = trades;
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Set targets for process and performance metrics — progress is tracked against your actual trades."
        actions={
          <GoalFormDialog
            trigger={
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-4" />
                New goal
              </button>
            }
          />
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No goals yet"
          description="Set a target for trade count, win rate, average R, rule adherence, a daily loss limit, or a P&L target — for a day, week, month, or year."
          actions={
            <GoalFormDialog
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Set your first goal
                </button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const metric = goal.metric as GoalMetric;
            const period = goal.period as GoalPeriod;
            const progress = computeGoalProgress(
              { metric, period, targetValue: Number(goal.targetValue) },
              goalTrades,
              now
            );

            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{METRIC_LABELS[metric]}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PERIOD_LABELS[period]}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          aria-label={`Actions for ${METRIC_LABELS[metric]} goal`}
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
                      <EditGoalItem
                        goal={{
                          id: goal.id,
                          metric: goal.metric,
                          period: goal.period,
                          targetValue: goal.targetValue.toString(),
                        }}
                      />
                      <DeleteGoalButton
                        id={goal.id}
                        label={`${PERIOD_LABELS[period]} ${METRIC_LABELS[metric]}`}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-numeric text-lg font-semibold tabular-nums">
                      {formatGoalValue(metric, progress.actual)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      of {formatGoalValue(metric, progress.target)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress.achieved ? "bg-profit" : "bg-primary"
                      }`}
                      style={{ width: `${progress.progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progress.achieved ? "On track" : "Not there yet"}{" "}
                    {PERIOD_PHRASES[period]}.
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

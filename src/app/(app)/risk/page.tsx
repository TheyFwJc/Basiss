import { cookies } from "next/headers";
import { endOfWeek, startOfWeek } from "date-fns";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ACCOUNT_SCOPE_COOKIE, resolveScopedAccountId } from "@/lib/account-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { RiskSettingsForm } from "./risk-settings-form";
import { PositionSizeCalculator } from "./position-size-calculator";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function LimitCard({
  label,
  pnl,
  limitAmount,
  currency,
}: {
  label: string;
  pnl: number;
  limitAmount: number | null;
  currency?: string;
}) {
  const loss = Math.max(0, -pnl);
  const usedPct = limitAmount && limitAmount > 0 ? Math.min(100, (loss / limitAmount) * 100) : null;
  const breached = usedPct != null && usedPct >= 100;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <span className={`font-numeric text-sm tabular-nums ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
            {formatCurrency(pnl, currency)}
          </span>
        </div>
        {limitAmount == null ? (
          <p className="text-xs text-muted-foreground">
            Set a limit below to track usage here.
          </p>
        ) : (
          <>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${breached ? "bg-loss" : "bg-primary"}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(loss, currency)} of {formatCurrency(limitAmount, currency)} limit used
              {breached && " — limit reached"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default async function RiskPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [accounts, settings] = await Promise.all([
    db.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, startingBalance: true, currency: true },
    }),
    db.userSettings.findUnique({ where: { userId } }),
  ]);
  const rawScope = (await cookies()).get(ACCOUNT_SCOPE_COOKIE)?.value;
  const scopedAccountId = resolveScopedAccountId(rawScope, accounts.map((a) => a.id));
  // Loss limits are computed against the scoped account's balance alone;
  // the position-size calculator below still gets every account, since it's
  // a forward-looking sizing tool rather than a data view.
  const balanceAccounts = scopedAccountId
    ? accounts.filter((a) => a.id === scopedAccountId)
    : accounts;

  const trades = await db.trade.findMany({
    where: {
      userId,
      status: "CLOSED",
      ...(scopedAccountId ? { tradingAccountId: scopedAccountId } : {}),
    },
    select: { netPnl: true, exitAt: true },
  });

  const totalStartingBalance = balanceAccounts.reduce(
    (sum, a) => sum + Number(a.startingBalance),
    0
  );

  const now = new Date();
  const today = dateKey(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const todayPnl = trades
    .filter((t) => t.exitAt && dateKey(t.exitAt) === today && t.netPnl)
    .reduce((sum, t) => sum + Number(t.netPnl), 0);

  const weekPnl = trades
    .filter((t) => t.exitAt && t.exitAt >= weekStart && t.exitAt <= weekEnd && t.netPnl)
    .reduce((sum, t) => sum + Number(t.netPnl), 0);

  const defaultRiskPerTradePct = settings?.defaultRiskPerTradePct
    ? Number(settings.defaultRiskPerTradePct)
    : null;
  const maxDailyLossPct = settings?.maxDailyLossPct ? Number(settings.maxDailyLossPct) : null;
  const maxWeeklyLossPct = settings?.maxWeeklyLossPct
    ? Number(settings.maxWeeklyLossPct)
    : null;

  const dailyLimitAmount =
    maxDailyLossPct != null ? totalStartingBalance * (maxDailyLossPct / 100) : null;
  const weeklyLimitAmount =
    maxWeeklyLossPct != null ? totalStartingBalance * (maxWeeklyLossPct / 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Risk Management"
        description="Position sizing, daily/weekly loss limits, and drawdown tracking."
      />

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add a trading account first — risk limits and position sizing are
          calculated against your account balance.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <LimitCard label="Today's P&L" pnl={todayPnl} limitAmount={dailyLimitAmount} />
            <LimitCard label="This week's P&L" pnl={weekPnl} limitAmount={weeklyLimitAmount} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk settings</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskSettingsForm
                defaultRiskPerTradePct={
                  defaultRiskPerTradePct != null ? String(defaultRiskPerTradePct) : ""
                }
                maxDailyLossPct={maxDailyLossPct != null ? String(maxDailyLossPct) : ""}
                maxWeeklyLossPct={maxWeeklyLossPct != null ? String(maxWeeklyLossPct) : ""}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Position size calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionSizeCalculator
                accounts={accounts.map((a) => ({
                  id: a.id,
                  name: a.name,
                  startingBalance: a.startingBalance.toString(),
                  currency: a.currency,
                }))}
                defaultRiskPct={defaultRiskPerTradePct}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

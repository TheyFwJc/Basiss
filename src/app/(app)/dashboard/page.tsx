import Link from "next/link";
import {
  Wallet,
  Plus,
  ArrowRight,
  ListChecks,
  Flame,
  Snowflake,
  DollarSign,
  CalendarClock,
  Percent,
  Scale,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  TrendingDown,
  TrendingUp,
  Activity,
  History,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { AnimatedNumber } from "@/components/animated-number";
import { SymbolBadge } from "@/components/symbol-badge";
import { LockedKpiCard, UpgradePrompt } from "@/components/upgrade-prompt";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatSignedNumber } from "@/lib/format";
import { AccountFormDialog } from "@/app/(app)/accounts/account-form-dialog";
import { computeCurrentBalance } from "@/lib/accounts";
import { canUseFeature } from "@/lib/subscription";
import {
  computeWinLossStats,
  computeProfitStats,
  computeRStats,
  computeStreaks,
  computeMaxDrawdown,
  buildEquityCurve,
  type MetricsTrade,
} from "@/lib/metrics";
import { EquityCurveChart } from "./equity-curve-chart";
import { DailyPnlChart } from "./daily-pnl-chart";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2 text-base">
      <span className="bg-brand-soft flex size-6 shrink-0 items-center justify-center rounded-md text-primary">
        <Icon className="size-3.5" strokeWidth={2.25} />
      </span>
      {children}
    </CardTitle>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [accounts, trades, hasAdvancedStats] = await Promise.all([
    db.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    db.trade.findMany({
      where: { userId },
      orderBy: { entryAt: "desc" },
      include: { strategy: true, tradingAccount: true },
    }),
    canUseFeature(userId, "ADVANCED_DASHBOARD_STATS"),
  ]);

  const totalStartingBalance = accounts.reduce(
    (sum, a) => sum + Number(a.startingBalance),
    0
  );

  const realizedPnlByAccount = new Map<string, number>();
  for (const t of trades) {
    if (!t.netPnl) continue;
    realizedPnlByAccount.set(
      t.tradingAccountId,
      (realizedPnlByAccount.get(t.tradingAccountId) ?? 0) + Number(t.netPnl)
    );
  }
  const currentBalances = accounts.map((a) =>
    computeCurrentBalance(a.startingBalance.toString(), realizedPnlByAccount.get(a.id))
  );
  const totalCurrentBalance = currentBalances.reduce(
    (sum, b) => sum + b.toNumber(),
    0
  );

  const metricsTrades: MetricsTrade[] = trades.map((t) => ({
    netPnl: t.netPnl,
    rMultiple: t.rMultiple,
    status: t.status,
    exitAt: t.exitAt,
  }));

  const winLoss = computeWinLossStats(metricsTrades);
  const profit = computeProfitStats(metricsTrades);
  const rStats = computeRStats(metricsTrades);
  const streaks = computeStreaks(metricsTrades);
  const equityCurve = buildEquityCurve(totalStartingBalance, metricsTrades);
  const drawdown = computeMaxDrawdown(equityCurve);

  const today = dateKey(new Date());
  const todayPnl = trades
    .filter((t) => t.exitAt && dateKey(t.exitAt) === today && t.netPnl)
    .reduce((sum, t) => sum + Number(t.netPnl), 0);

  const dailyPnlMap = new Map<string, number>();
  for (const t of trades) {
    if (!t.exitAt || !t.netPnl) continue;
    const key = dateKey(t.exitAt);
    dailyPnlMap.set(key, (dailyPnlMap.get(key) ?? 0) + Number(t.netPnl));
  }
  const dailyPnlData = Array.from(dailyPnlMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl }));

  const earliestEntryAt = trades.length > 0 ? trades[trades.length - 1].entryAt : new Date();
  const equityCurveData = equityCurve.map((p, i) => ({
    date: i === 0 ? dateKey(earliestEntryAt) : dateKey(p.date),
    equity: Number(p.equity),
  }));

  const setupMap = new Map<string, { name: string; netPnl: number; count: number }>();
  for (const t of trades) {
    if (!t.strategy || !t.netPnl) continue;
    const existing = setupMap.get(t.strategy.id) ?? {
      name: t.strategy.name,
      netPnl: 0,
      count: 0,
    };
    existing.netPnl += Number(t.netPnl);
    existing.count += 1;
    setupMap.set(t.strategy.id, existing);
  }
  const setups = Array.from(setupMap.values()).sort((a, b) => b.netPnl - a.netPnl);
  const bestSetups = setups.slice(0, 3);
  const worstSetups = setups.slice(-3).reverse().filter((s) => !bestSetups.includes(s));

  const closedTrades = trades.filter((t) => t.netPnl != null);
  const bestTrade = closedTrades.reduce<typeof closedTrades[number] | null>(
    (best, t) => (!best || Number(t.netPnl) > Number(best.netPnl) ? t : best),
    null
  );
  const worstTrade = closedTrades.reduce<typeof closedTrades[number] | null>(
    (worst, t) => (!worst || Number(t.netPnl) < Number(worst.netPnl) ? t : worst),
    null
  );

  const recentTrades = trades.slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Welcome back${session!.user.name ? `, ${session!.user.name}` : ""}`}
        description="Here's where your trading performance will live."
      />

      {accounts.length > 0 && trades.length > 0 && (
        <div className="animate-fade-in-up relative mb-6 overflow-hidden rounded-xl border border-border bg-brand-gradient p-6 text-white shadow-lg sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div
            aria-hidden
            className="animate-glow-pulse pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/20 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-drift pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-white/10 blur-3xl"
          />
          <p className="relative text-sm font-medium text-white/80">Total P&amp;L, all-time</p>
          <p className="animate-pop-in relative mt-1 font-numeric text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
            <AnimatedNumber value={profit.netPnl.toNumber()} format="currency" />
          </p>
          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {winLoss.winRate == null ? "—" : `${winLoss.winRate.toFixed(0)}%`} win rate
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {winLoss.totalTrades} trade{winLoss.totalTrades === 1 ? "" : "s"}
            </span>
            {streaks.current.type && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {streaks.current.type === "WIN" ? (
                  <Flame className="size-3" />
                ) : (
                  <Snowflake className="size-3" />
                )}
                {streaks.current.count} {streaks.current.type === "WIN" ? "win" : "loss"}
                {streaks.current.count === 1 ? "" : "es"} streak
              </span>
            )}
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Add a trading account to get started"
          description="Your dashboard, calendar, and analytics are all built from your trades, and every trade belongs to an account. Add one to begin."
          actions={
            <AccountFormDialog
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Add your first account
                </button>
              }
            />
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <SectionTitle icon={Wallet}>Your accounts</SectionTitle>
              <Button
                render={
                  <Link href="/accounts">
                    Manage
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
                nativeButton={false}
                variant="ghost"
                size="sm"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {accounts.map((account) => {
                const currentBalance = computeCurrentBalance(
                  account.startingBalance.toString(),
                  realizedPnlByAccount.get(account.id)
                );
                const delta = currentBalance.minus(account.startingBalance.toString());
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.broker || "No broker set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`font-numeric text-sm tabular-nums ${
                            delta.gt(0)
                              ? "text-profit"
                              : delta.lt(0)
                                ? "text-loss"
                                : "text-muted-foreground"
                          }`}
                        >
                          {formatCurrency(currentBalance.toString(), account.currency)}
                        </span>
                        {!delta.isZero() && (
                          <p className="text-[10px] text-muted-foreground">
                            {delta.gt(0) ? "+" : ""}
                            {formatCurrency(delta.toString(), account.currency)} from start
                          </p>
                        )}
                      </div>
                      <Badge variant={account.status === "ACTIVE" ? "default" : "secondary"}>
                        {account.status.charAt(0) + account.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              <p className="pt-1 text-xs text-muted-foreground">
                Combined current balance:{" "}
                <span className="font-numeric tabular-nums">
                  {formatCurrency(totalCurrentBalance)}
                </span>{" "}
                (started at{" "}
                <span className="font-numeric tabular-nums">
                  {formatCurrency(totalStartingBalance)}
                </span>
                ) across {accounts.length} account{accounts.length === 1 ? "" : "s"}.
                {accounts.length > 1 && (
                  <>
                    {" "}
                    Performance below combines all accounts, assuming they share
                    a currency.
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          {trades.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Log your first trade"
              description="P&L, R-multiple, win rate, equity curve, and drawdown are all built from your trades. Add one to get started."
              actions={
                <Button
                  render={
                    <Link href="/trades/new">
                      <Plus className="size-4" />
                      Add your first trade
                    </Link>
                  }
                  nativeButton={false}
                  size="sm"
                />
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <KpiCard
                  label="Total P&L"
                  value={formatCurrency(profit.netPnl.toString())}
                  valueClassName={profit.netPnl.gte(0) ? "text-profit" : "text-loss"}
                  animateValue={profit.netPnl.toNumber()}
                  format="currency"
                  icon={DollarSign}
                  delayMs={0}
                />
                <KpiCard
                  label="Today P&L"
                  value={formatCurrency(todayPnl)}
                  valueClassName={todayPnl >= 0 ? "text-profit" : "text-loss"}
                  animateValue={todayPnl}
                  format="currency"
                  icon={CalendarClock}
                  delayMs={40}
                />
                <KpiCard
                  label="Win rate"
                  value={winLoss.winRate == null ? "—" : `${winLoss.winRate.toFixed(0)}%`}
                  animateValue={winLoss.winRate ?? undefined}
                  format="percent"
                  icon={Percent}
                  delayMs={80}
                />
                {hasAdvancedStats ? (
                  <>
                    <KpiCard
                      label="Profit factor"
                      value={profit.profitFactor ? profit.profitFactor.toFixed(2) : "—"}
                      animateValue={profit.profitFactor?.toNumber()}
                      format="decimal2"
                      icon={Scale}
                      delayMs={120}
                    />
                    <KpiCard
                      label="Expectancy"
                      value={
                        profit.expectancy ? formatCurrency(profit.expectancy.toString()) : "—"
                      }
                      valueClassName={
                        profit.expectancy == null
                          ? ""
                          : profit.expectancy.gte(0)
                            ? "text-profit"
                            : "text-loss"
                      }
                      animateValue={profit.expectancy?.toNumber()}
                      format="currency"
                      icon={Target}
                      delayMs={160}
                    />
                    <KpiCard
                      label="Avg win"
                      value={profit.avgWin ? formatCurrency(profit.avgWin.toString()) : "—"}
                      valueClassName="text-profit"
                      animateValue={profit.avgWin?.toNumber()}
                      format="currency"
                      icon={ArrowUpRight}
                      delayMs={200}
                    />
                    <KpiCard
                      label="Avg loss"
                      value={profit.avgLoss ? formatCurrency(profit.avgLoss.toString()) : "—"}
                      valueClassName="text-loss"
                      animateValue={profit.avgLoss?.toNumber()}
                      format="currency"
                      icon={ArrowDownRight}
                      delayMs={240}
                    />
                    <KpiCard
                      label="Avg R"
                      value={
                        rStats.avgR ? `${formatSignedNumber(rStats.avgR.toString())}R` : "—"
                      }
                      animateValue={rStats.avgR?.toNumber()}
                      format="signedR"
                      icon={Gauge}
                      delayMs={280}
                    />
                    <KpiCard
                      label="Max drawdown"
                      value={
                        drawdown.maxDrawdownAmount.gt(0)
                          ? formatCurrency(drawdown.maxDrawdownAmount.toString())
                          : "—"
                      }
                      valueClassName={drawdown.maxDrawdownAmount.gt(0) ? "text-loss" : ""}
                      animateValue={
                        drawdown.maxDrawdownAmount.gt(0)
                          ? drawdown.maxDrawdownAmount.toNumber()
                          : undefined
                      }
                      format="currency"
                      icon={TrendingDown}
                      delayMs={320}
                    />
                  </>
                ) : (
                  <>
                    <LockedKpiCard label="Profit factor" requiredPlan="PRO" />
                    <LockedKpiCard label="Expectancy" requiredPlan="PRO" />
                    <LockedKpiCard label="Avg win" requiredPlan="PRO" />
                    <LockedKpiCard label="Avg loss" requiredPlan="PRO" />
                    <LockedKpiCard label="Avg R" requiredPlan="PRO" />
                    <LockedKpiCard label="Max drawdown" requiredPlan="PRO" />
                  </>
                )}
                <KpiCard
                  label="Total trades"
                  value={winLoss.totalTrades}
                  animateValue={winLoss.totalTrades}
                  format="integer"
                  icon={ListChecks}
                  delayMs={360}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <SectionTitle icon={TrendingUp}>Equity curve</SectionTitle>
                  </CardHeader>
                  <CardContent>
                    <EquityCurveChart data={equityCurveData} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <SectionTitle icon={Activity}>Daily P&L</SectionTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyPnlData.length === 0 ? (
                      <p className="py-16 text-center text-sm text-muted-foreground">
                        No closed trades yet.
                      </p>
                    ) : (
                      <DailyPnlChart data={dailyPnlData} />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <SectionTitle icon={History}>Recent trades</SectionTitle>
                    <Button
                      render={
                        <Link href="/trades">
                          View all
                          <ArrowRight className="size-3.5" />
                        </Link>
                      }
                      nativeButton={false}
                      variant="ghost"
                      size="sm"
                    />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {recentTrades.map((trade) => {
                      const pnl = trade.netPnl ? Number(trade.netPnl) : null;
                      return (
                        <Link
                          key={trade.id}
                          href={`/trades/${trade.id}`}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <SymbolBadge symbol={trade.symbol} />
                            <Badge
                              variant={trade.direction === "LONG" ? "default" : "secondary"}
                            >
                              {trade.direction}
                            </Badge>
                            <span className="font-medium">{trade.symbol}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(trade.entryAt)}
                            </span>
                          </div>
                          <span
                            className={`font-numeric tabular-nums ${
                              pnl == null ? "text-muted-foreground" : pnl >= 0 ? "text-profit" : "text-loss"
                            }`}
                          >
                            {pnl == null
                              ? "Open"
                              : formatCurrency(pnl, trade.tradingAccount.currency)}
                          </span>
                        </Link>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <SectionTitle icon={Flame}>Streaks</SectionTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="flex items-center gap-2 text-sm">
                        {streaks.current.type === "WIN" ? (
                          <Flame className="size-4 text-profit" />
                        ) : (
                          <Snowflake className="size-4 text-loss" />
                        )}
                        Current
                      </span>
                      <span className="font-numeric text-sm tabular-nums">
                        {streaks.current.type
                          ? `${streaks.current.count} ${streaks.current.type === "WIN" ? "win" : "loss"}${streaks.current.count === 1 ? "" : "es"}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-sm text-muted-foreground">Best win streak</span>
                      <span className="font-numeric text-sm tabular-nums text-profit">
                        {streaks.bestWinStreak}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-sm text-muted-foreground">Worst loss streak</span>
                      <span className="font-numeric text-sm tabular-nums text-loss">
                        {streaks.worstLossStreak}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {(bestTrade || worstTrade) && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <SectionTitle icon={ArrowUpRight}>Best trade</SectionTitle>
                    </CardHeader>
                    <CardContent>
                      {bestTrade ? (
                        <Link
                          href={`/trades/${bestTrade.id}`}
                          className="flex items-center justify-between rounded-md border border-profit/30 bg-profit-muted px-3 py-2 text-sm transition-colors hover:bg-profit-muted/80"
                        >
                          <div className="flex items-center gap-2.5">
                            <SymbolBadge symbol={bestTrade.symbol} />
                            <Badge
                              variant={bestTrade.direction === "LONG" ? "default" : "secondary"}
                            >
                              {bestTrade.direction}
                            </Badge>
                            <span className="font-medium">{bestTrade.symbol}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(bestTrade.entryAt)}
                            </span>
                          </div>
                          <span className="font-numeric tabular-nums text-profit">
                            {formatCurrency(bestTrade.netPnl!.toString(), bestTrade.tradingAccount.currency)}
                          </span>
                        </Link>
                      ) : (
                        <p className="text-sm text-muted-foreground">No closed trades yet.</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <SectionTitle icon={ArrowDownRight}>Worst trade</SectionTitle>
                    </CardHeader>
                    <CardContent>
                      {worstTrade ? (
                        <Link
                          href={`/trades/${worstTrade.id}`}
                          className="flex items-center justify-between rounded-md border border-loss/30 bg-loss-muted px-3 py-2 text-sm transition-colors hover:bg-loss-muted/80"
                        >
                          <div className="flex items-center gap-2.5">
                            <SymbolBadge symbol={worstTrade.symbol} />
                            <Badge
                              variant={worstTrade.direction === "LONG" ? "default" : "secondary"}
                            >
                              {worstTrade.direction}
                            </Badge>
                            <span className="font-medium">{worstTrade.symbol}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(worstTrade.entryAt)}
                            </span>
                          </div>
                          <span className="font-numeric tabular-nums text-loss">
                            {formatCurrency(worstTrade.netPnl!.toString(), worstTrade.tradingAccount.currency)}
                          </span>
                        </Link>
                      ) : (
                        <p className="text-sm text-muted-foreground">No closed trades yet.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {setups.length > 0 && !hasAdvancedStats && (
                <UpgradePrompt feature="Strategy Analytics" requiredPlan="PRO" />
              )}

              {setups.length > 0 && hasAdvancedStats && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <SectionTitle icon={Target}>Best setups</SectionTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {bestSetups.map((s) => (
                        <div
                          key={s.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {s.name}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({s.count})
                            </span>
                          </span>
                          <span className="font-numeric tabular-nums text-profit">
                            {formatCurrency(s.netPnl)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <SectionTitle icon={TrendingDown}>Worst setups</SectionTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {worstSetups.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No losing setups yet.
                        </p>
                      ) : (
                        worstSetups.map((s) => (
                          <div
                            key={s.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>
                              {s.name}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({s.count})
                              </span>
                            </span>
                            <span className="font-numeric tabular-nums text-loss">
                              {formatCurrency(s.netPnl)}
                            </span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

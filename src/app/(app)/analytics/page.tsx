import Decimal from "decimal.js";
import {
  BarChart3,
  ArrowLeftRight,
  Target,
  Clock,
  CalendarDays,
  Timer,
  ShieldAlert,
  AlertTriangle,
  Brain,
  Grid3x3,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { KpiCard } from "@/components/kpi-card";
import { canUseFeature } from "@/lib/subscription";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatSignedNumber } from "@/lib/format";
import {
  computeWinLossStats,
  computeProfitStats,
  computeRStats,
} from "@/lib/metrics";
import {
  filterTrades,
  groupBySymbol,
  groupByDirection,
  groupByStrategy,
  groupBySession,
  groupByDayOfWeek,
  groupByHourOfDay,
  groupByHoldingTime,
  groupByRisk,
  computeMistakeCost,
  groupByRating,
  buildDayVsSessionHeatmap,
  DAY_LABELS,
  SESSION_LABELS,
  type AnalyticsTrade,
  type AnalyticsFilters,
  type DimensionGroup,
  type MistakeCost,
  type RatingGroup,
} from "@/lib/analytics";
import { AnalyticsFilters as AnalyticsFilterBar } from "./analytics-filters";
import { BreakdownCard, type BreakdownBar } from "./breakdown-card";

function topBars(
  entries: { label: string; netPnl: Decimal }[],
  n = 6
): BreakdownBar[] {
  return [...entries]
    .sort((a, b) => Math.abs(b.netPnl.toNumber()) - Math.abs(a.netPnl.toNumber()))
    .slice(0, n)
    .map((e) => ({ label: e.label, value: e.netPnl.toNumber() }));
}

function BreakdownTable({ groups, dimensionLabel }: { groups: DimensionGroup[]; dimensionLabel: string }) {
  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No closed trades in this breakdown yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{dimensionLabel}</TableHead>
          <TableHead className="text-right">Trades</TableHead>
          <TableHead className="text-right">Win rate</TableHead>
          <TableHead className="text-right">Net P&L</TableHead>
          <TableHead className="text-right">Avg R</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((g) => (
          <TableRow key={g.key}>
            <TableCell className="font-medium">{g.label}</TableCell>
            <TableCell className="text-right font-numeric tabular-nums">{g.count}</TableCell>
            <TableCell className="text-right font-numeric tabular-nums">
              {Math.round((g.wins / g.count) * 100)}%
            </TableCell>
            <TableCell
              className={`text-right font-numeric tabular-nums ${
                g.netPnl.gte(0) ? "text-profit" : "text-loss"
              }`}
            >
              {formatCurrency(g.netPnl.toString())}
            </TableCell>
            <TableCell className="text-right font-numeric tabular-nums">
              {g.avgR ? `${formatSignedNumber(g.avgR.toString())}R` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MistakeCostTable({ costs }: { costs: MistakeCost[] }) {
  if (costs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No trades tagged with a mistake yet.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mistake</TableHead>
          <TableHead className="text-right">Trades</TableHead>
          <TableHead className="text-right">Net P&L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {costs.map((c) => (
          <TableRow key={c.mistakeId}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell className="text-right font-numeric tabular-nums">{c.count}</TableCell>
            <TableCell
              className={`text-right font-numeric tabular-nums ${
                c.netPnl.gte(0) ? "text-profit" : "text-loss"
              }`}
            >
              {formatCurrency(c.netPnl.toString())}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RatingTable({ title, groups }: { title: string; groups: RatingGroup[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rating</TableHead>
            <TableHead className="text-right">Trades</TableHead>
            <TableHead className="text-right">Win rate</TableHead>
            <TableHead className="text-right">Net P&L</TableHead>
            <TableHead className="text-right">Avg R</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <TableRow key={g.rating}>
              <TableCell className="font-medium">{g.rating}</TableCell>
              <TableCell className="text-right font-numeric tabular-nums">
                {g.count || "—"}
              </TableCell>
              <TableCell className="text-right font-numeric tabular-nums">
                {g.winRate == null ? "—" : `${Math.round(g.winRate)}%`}
              </TableCell>
              <TableCell
                className={`text-right font-numeric tabular-nums ${
                  g.count === 0 ? "text-muted-foreground" : g.netPnl.gte(0) ? "text-profit" : "text-loss"
                }`}
              >
                {g.count === 0 ? "—" : formatCurrency(g.netPnl.toString())}
              </TableCell>
              <TableCell className="text-right font-numeric tabular-nums">
                {g.avgR ? `${formatSignedNumber(g.avgR.toString())}R` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const SESSION_ORDER = ["PRE_MARKET", "OPEN", "MIDDAY", "POWER_HOUR", "AFTER_HOURS", "OVERNIGHT"];

function DayVsSessionHeatmap({ trades }: { trades: AnalyticsTrade[] }) {
  const cells = buildDayVsSessionHeatmap(trades);
  if (cells.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No trades with a session set yet.
      </p>
    );
  }

  const cellMap = new Map(cells.map((c) => [`${c.day}|${c.session}`, c]));
  const maxAbs = Math.max(...cells.map((c) => Math.abs(c.netPnl.toNumber())), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left font-medium text-muted-foreground">Day</th>
            {SESSION_ORDER.map((s) => (
              <th key={s} className="p-1 text-center font-medium text-muted-foreground">
                {SESSION_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_LABELS.map((dayLabel, day) => (
            <tr key={day}>
              <td className="p-1 font-medium text-muted-foreground">{dayLabel.slice(0, 3)}</td>
              {SESSION_ORDER.map((s) => {
                const cell = cellMap.get(`${day}|${s}`);
                if (!cell) {
                  return (
                    <td key={s} className="rounded-md bg-muted/30 p-2 text-center text-muted-foreground">
                      —
                    </td>
                  );
                }
                const netPnl = cell.netPnl.toNumber();
                const opacity = 0.15 + 0.85 * Math.min(1, Math.abs(netPnl) / maxAbs);
                return (
                  <td
                    key={s}
                    className="rounded-md p-2 text-center font-numeric tabular-nums"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--color-${netPnl >= 0 ? "profit" : "loss"}) ${Math.round(opacity * 100)}%, transparent)`,
                    }}
                    title={`${cell.count} trade${cell.count === 1 ? "" : "s"}`}
                  >
                    {formatCurrency(netPnl)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  if (!(await canUseFeature(userId, "ADVANCED_ANALYTICS"))) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Break performance down by symbol, direction, strategy, session, time of day, and more."
        />
        <UpgradePrompt feature="Advanced Analytics" requiredPlan="PRO" />
      </div>
    );
  }

  const [trades, strategies, mistakes] = await Promise.all([
    db.trade.findMany({
      where: { userId, status: "CLOSED" },
      include: { strategy: true, mistakes: { include: { mistake: true } } },
    }),
    db.strategy.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.mistake.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (trades.length === 0) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Break performance down by symbol, direction, strategy, session, time of day, and more."
        />
        <EmptyState
          icon={BarChart3}
          title="No closed trades yet"
          description="Analytics break down your performance once you have closed trades — by symbol, direction, strategy, session, time of day, holding time, risk, mistakes, and psychology."
        />
      </div>
    );
  }

  const analyticsTrades: AnalyticsTrade[] = trades.map((t) => ({
    symbol: t.symbol,
    direction: t.direction,
    netPnl: t.netPnl,
    rMultiple: t.rMultiple,
    riskPercent: t.riskPercent,
    status: t.status,
    entryAt: t.entryAt,
    exitAt: t.exitAt,
    strategyId: t.strategyId,
    strategyName: t.strategy?.name ?? null,
    session: t.session,
    confidence: t.confidence,
    executionRating: t.executionRating,
    ruleAdherence: t.ruleAdherence,
    mistakes: t.mistakes.map((tm) => ({ id: tm.mistake.id, name: tm.mistake.name })),
  }));

  const filters: AnalyticsFilters = {
    symbol: params.symbol ? params.symbol.toUpperCase() : undefined,
    direction: params.direction === "LONG" || params.direction === "SHORT" ? params.direction : undefined,
    strategyId: params.strategyId || undefined,
    session: params.session || undefined,
    dayOfWeek: params.dayOfWeek !== undefined ? Number(params.dayOfWeek) : undefined,
    mistakeId: params.mistakeId || undefined,
  };
  const filtered = filterTrades(analyticsTrades, filters);

  const winLoss = computeWinLossStats(filtered);
  const profit = computeProfitStats(filtered);
  const rStats = computeRStats(filtered);

  const bySymbol = groupBySymbol(filtered);
  const byDirection = groupByDirection(filtered);
  const byStrategy = groupByStrategy(filtered);
  const bySession = groupBySession(filtered);
  const byDay = groupByDayOfWeek(filtered);
  const byHour = groupByHourOfDay(filtered);
  const byHolding = groupByHoldingTime(filtered);
  const byRisk = groupByRisk(filtered);
  const mistakeCosts = computeMistakeCost(filtered);
  const byConfidence = groupByRating(filtered, (t) => t.confidence);
  const byExecution = groupByRating(filtered, (t) => t.executionRating);
  const byRuleAdherence = groupByRating(filtered, (t) => t.ruleAdherence);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Break performance down by symbol, direction, strategy, session, time of day, and more."
      />
      <AnalyticsFilterBar strategies={strategies} mistakes={mistakes} />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No closed trades match these filters.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              label="Net P&L"
              value={formatCurrency(profit.netPnl.toString())}
              valueClassName={profit.netPnl.gte(0) ? "text-profit" : "text-loss"}
              animateValue={profit.netPnl.toNumber()}
              format="currency"
            />
            <KpiCard
              label="Win rate"
              value={winLoss.winRate == null ? "—" : `${winLoss.winRate.toFixed(0)}%`}
              animateValue={winLoss.winRate ?? undefined}
              format="percent"
            />
            <KpiCard
              label="Profit factor"
              value={profit.profitFactor ? profit.profitFactor.toFixed(2) : "—"}
              animateValue={profit.profitFactor?.toNumber()}
              format="decimal2"
            />
            <KpiCard
              label="Avg R"
              value={rStats.avgR ? `${formatSignedNumber(rStats.avgR.toString())}R` : "—"}
              animateValue={rStats.avgR?.toNumber()}
              format="signedR"
            />
            <KpiCard
              label="Trades"
              value={winLoss.totalTrades}
              animateValue={winLoss.totalTrades}
              format="integer"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BreakdownCard
              title="Symbol"
              icon={<BarChart3 className="size-3.5 text-primary" />}
              bars={topBars(bySymbol)}
              detail={<BreakdownTable groups={bySymbol} dimensionLabel="Symbol" />}
            />
            <BreakdownCard
              title="Direction"
              icon={<ArrowLeftRight className="size-3.5 text-primary" />}
              bars={topBars(byDirection)}
              detail={<BreakdownTable groups={byDirection} dimensionLabel="Direction" />}
            />
            <BreakdownCard
              title="Strategy"
              icon={<Target className="size-3.5 text-primary" />}
              bars={topBars(byStrategy)}
              detail={<BreakdownTable groups={byStrategy} dimensionLabel="Strategy" />}
            />
            <BreakdownCard
              title="Session"
              icon={<Clock className="size-3.5 text-primary" />}
              bars={topBars(bySession)}
              detail={<BreakdownTable groups={bySession} dimensionLabel="Session" />}
            />
            <BreakdownCard
              title="Day of week"
              icon={<CalendarDays className="size-3.5 text-primary" />}
              bars={topBars(byDay)}
              detail={<BreakdownTable groups={byDay} dimensionLabel="Day" />}
            />
            <BreakdownCard
              title="Time of day"
              icon={<Clock className="size-3.5 text-primary" />}
              bars={topBars(byHour)}
              detail={<BreakdownTable groups={byHour} dimensionLabel="Entry hour" />}
            />
            <BreakdownCard
              title="Holding time"
              icon={<Timer className="size-3.5 text-primary" />}
              bars={topBars(byHolding)}
              detail={<BreakdownTable groups={byHolding} dimensionLabel="Holding time" />}
            />
            <BreakdownCard
              title="Risk per trade"
              icon={<ShieldAlert className="size-3.5 text-primary" />}
              bars={topBars(byRisk)}
              detail={<BreakdownTable groups={byRisk} dimensionLabel="Risk per trade" />}
            />
            <BreakdownCard
              title="Mistake cost"
              icon={<AlertTriangle className="size-3.5 text-primary" />}
              bars={topBars(mistakeCosts.map((c) => ({ label: c.name, netPnl: c.netPnl })))}
              detail={<MistakeCostTable costs={mistakeCosts} />}
            />
            <BreakdownCard
              title="Psychology"
              icon={<Brain className="size-3.5 text-primary" />}
              bars={topBars(
                byConfidence
                  .filter((g) => g.count > 0)
                  .map((g) => ({ label: `${g.rating}★ conf.`, netPnl: g.netPnl }))
              )}
              detail={
                <div className="flex flex-col gap-6">
                  <RatingTable title="Confidence" groups={byConfidence} />
                  <RatingTable title="Execution quality" groups={byExecution} />
                  <RatingTable title="Rule adherence" groups={byRuleAdherence} />
                </div>
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Grid3x3 className="size-4 text-primary" />
                Day × session heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DayVsSessionHeatmap trades={filtered} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

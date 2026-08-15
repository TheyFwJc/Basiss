import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatSignedNumber } from "@/lib/format";
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

function BreakdownTable({ groups, dimensionLabel }: { groups: DimensionGroup[]; dimensionLabel: string }) {
  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No closed trades in this breakdown yet.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
  );
}

function RatingTable({ title, groups }: { title: string; groups: RatingGroup[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="overflow-x-auto p-4">
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
      </CardContent>
    </Card>
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
        <Tabs defaultValue="symbol">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="symbol">Symbol</TabsTrigger>
            <TabsTrigger value="direction">Direction</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
            <TabsTrigger value="day">Day of week</TabsTrigger>
            <TabsTrigger value="hour">Time of day</TabsTrigger>
            <TabsTrigger value="holding">Holding time</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="mistakes">Mistake cost</TabsTrigger>
            <TabsTrigger value="psychology">Psychology</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          </TabsList>
          <TabsContent value="symbol" className="mt-4">
            <BreakdownTable groups={groupBySymbol(filtered)} dimensionLabel="Symbol" />
          </TabsContent>
          <TabsContent value="direction" className="mt-4">
            <BreakdownTable groups={groupByDirection(filtered)} dimensionLabel="Direction" />
          </TabsContent>
          <TabsContent value="strategy" className="mt-4">
            <BreakdownTable groups={groupByStrategy(filtered)} dimensionLabel="Strategy" />
          </TabsContent>
          <TabsContent value="session" className="mt-4">
            <BreakdownTable groups={groupBySession(filtered)} dimensionLabel="Session" />
          </TabsContent>
          <TabsContent value="day" className="mt-4">
            <BreakdownTable groups={groupByDayOfWeek(filtered)} dimensionLabel="Day" />
          </TabsContent>
          <TabsContent value="hour" className="mt-4">
            <BreakdownTable groups={groupByHourOfDay(filtered)} dimensionLabel="Entry hour" />
          </TabsContent>
          <TabsContent value="holding" className="mt-4">
            <BreakdownTable groups={groupByHoldingTime(filtered)} dimensionLabel="Holding time" />
          </TabsContent>
          <TabsContent value="risk" className="mt-4">
            <BreakdownTable groups={groupByRisk(filtered)} dimensionLabel="Risk per trade" />
          </TabsContent>
          <TabsContent value="mistakes" className="mt-4">
            <MistakeCostTable costs={computeMistakeCost(filtered)} />
          </TabsContent>
          <TabsContent value="psychology" className="mt-4 flex flex-col gap-4">
            <RatingTable title="Confidence" groups={groupByRating(filtered, (t) => t.confidence)} />
            <RatingTable
              title="Execution quality"
              groups={groupByRating(filtered, (t) => t.executionRating)}
            />
            <RatingTable
              title="Rule adherence"
              groups={groupByRating(filtered, (t) => t.ruleAdherence)}
            />
          </TabsContent>
          <TabsContent value="heatmap" className="mt-4">
            <DayVsSessionHeatmap trades={filtered} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

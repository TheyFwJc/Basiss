import Link from "next/link";
import { Plus, ListChecks, Download } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDuration, formatSignedNumber } from "@/lib/format";
import { TradeFilters } from "./trade-filters";

const PAGE_SIZE = 25;

function buildQueryString(
  params: Record<string, string | undefined>,
  overrides: Record<string, string>
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const accounts = await db.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const where: Prisma.TradeWhereInput = { userId };
  if (params.symbol) {
    where.symbol = { contains: params.symbol.toUpperCase() };
  }
  if (params.accountId) {
    where.tradingAccountId = params.accountId;
  }
  if (params.direction === "LONG" || params.direction === "SHORT") {
    where.direction = params.direction;
  }
  if (params.result === "win") {
    where.netPnl = { gt: 0 };
  } else if (params.result === "loss") {
    where.netPnl = { lt: 0 };
  } else if (params.result === "open") {
    where.status = "OPEN";
  }

  const page = Math.max(1, Number(params.page) || 1);

  const [trades, totalCount, totalTradeCount] = await Promise.all([
    db.trade.findMany({
      where,
      orderBy: { entryAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { tradingAccount: true, strategy: true },
    }),
    db.trade.count({ where }),
    db.trade.count({ where: { userId } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Trades"
        description="Every trade you've logged, with full entry/exit detail, P&L, and R."
        actions={
          <div className="flex items-center gap-2">
            <Button
              render={
                <a href="/api/export/trades?format=csv">
                  <Download className="size-4" />
                  CSV
                </a>
              }
              nativeButton={false}
              variant="outline"
              size="sm"
            />
            <Button
              render={
                <a href="/api/export/trades?format=json">
                  <Download className="size-4" />
                  JSON
                </a>
              }
              nativeButton={false}
              variant="outline"
              size="sm"
            />
            <Button
              render={
                <Link href="/trades/new">
                  <Plus className="size-4" />
                  Add trade
                </Link>
              }
              nativeButton={false}
              size="sm"
            />
          </div>
        }
      />

      {totalTradeCount === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No trades logged yet"
          description="Log your first trade — entries, exits, fees — and P&L and R are calculated for you automatically."
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
          <TradeFilters accounts={accounts} />
          {trades.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No trades match these filters"
              description="Try widening your search — clear a filter or search a different symbol."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead className="text-right">R</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Account</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => {
                      const netPnl = trade.netPnl ? Number(trade.netPnl) : null;
                      const duration = trade.exitAt
                        ? formatDuration(
                            trade.entryAt.getTime(),
                            trade.exitAt.getTime()
                          )
                        : "Open";
                      return (
                        <TableRow key={trade.id}>
                          <TableCell className="text-muted-foreground">
                            <Link
                              href={`/trades/${trade.id}`}
                              className="block"
                            >
                              {formatDate(trade.entryAt)}
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link href={`/trades/${trade.id}`} className="block">
                              {trade.symbol}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                trade.direction === "LONG" ? "default" : "secondary"
                              }
                            >
                              {trade.direction}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-numeric tabular-nums">
                            {trade.quantity.toString()}
                          </TableCell>
                          <TableCell className="text-right font-numeric tabular-nums">
                            {formatCurrency(
                              trade.avgEntryPrice.toString(),
                              trade.tradingAccount.currency
                            )}
                          </TableCell>
                          <TableCell className="text-right font-numeric tabular-nums">
                            {trade.avgExitPrice
                              ? formatCurrency(
                                  trade.avgExitPrice.toString(),
                                  trade.tradingAccount.currency
                                )
                              : "—"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-numeric tabular-nums ${
                              netPnl == null
                                ? ""
                                : netPnl >= 0
                                  ? "text-profit"
                                  : "text-loss"
                            }`}
                          >
                            {netPnl == null
                              ? "—"
                              : formatCurrency(netPnl, trade.tradingAccount.currency)}
                          </TableCell>
                          <TableCell className="text-right font-numeric tabular-nums">
                            {trade.rMultiple
                              ? `${formatSignedNumber(trade.rMultiple.toString())}R`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {trade.strategy?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {duration}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {trade.tradingAccount.name}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {totalCount} trade
                {totalCount === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button
                    render={
                      <Link
                        href={`/trades?${buildQueryString(params, { page: String(page - 1) })}`}
                      >
                        Previous
                      </Link>
                    }
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  />
                )}
                {page < totalPages && (
                  <Button
                    render={
                      <Link
                        href={`/trades?${buildQueryString(params, { page: String(page + 1) })}`}
                      >
                        Next
                      </Link>
                    }
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

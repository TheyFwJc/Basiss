import Link from "next/link";
import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { areFriends } from "@/lib/friendship";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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

export default async function FriendTradesPage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  if (!(await areFriends(userId, friendId))) notFound();

  const friend = await db.user.findUnique({
    where: { id: friendId },
    select: { name: true, email: true },
  });
  if (!friend) notFound();

  const trades = await db.trade.findMany({
    where: { userId: friendId },
    orderBy: { entryAt: "desc" },
    include: { tradingAccount: true, strategy: true },
  });

  return (
    <div>
      <PageHeader
        title={friend.name ?? friend.email}
        description="Read-only — you can open any trade to rate it and add a note."
      />

      {trades.length === 0 ? (
        <EmptyState icon={ListChecks} title="No trades logged yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Exit</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => {
                  const netPnl = trade.netPnl ? Number(trade.netPnl) : null;
                  const duration = trade.exitAt
                    ? formatDuration(trade.entryAt.getTime(), trade.exitAt.getTime())
                    : "Open";
                  return (
                    <TableRow key={trade.id}>
                      <TableCell className="text-muted-foreground">
                        <Link href={`/trades/${trade.id}`} className="block">
                          {formatDate(trade.entryAt)}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/trades/${trade.id}`} className="block">
                          {trade.symbol}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trade.direction === "LONG" ? "default" : "secondary"}>
                          {trade.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-numeric tabular-nums">
                        {formatCurrency(trade.avgEntryPrice.toString(), trade.tradingAccount.currency)}
                      </TableCell>
                      <TableCell className="text-right font-numeric tabular-nums">
                        {trade.avgExitPrice
                          ? formatCurrency(trade.avgExitPrice.toString(), trade.tradingAccount.currency)
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-numeric tabular-nums ${
                          netPnl == null ? "" : netPnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {netPnl == null ? "—" : formatCurrency(netPnl, trade.tradingAccount.currency)}
                      </TableCell>
                      <TableCell className="text-right font-numeric tabular-nums">
                        {trade.rMultiple ? `${formatSignedNumber(trade.rMultiple.toString())}R` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {trade.strategy?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{duration}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

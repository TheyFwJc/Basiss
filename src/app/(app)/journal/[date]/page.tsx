import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { journalDateSchema } from "@/lib/validations/journal";
import { JournalForm } from "../journal-form";

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!journalDateSchema.safeParse(date).success) notFound();

  const session = await auth();
  const userId = session!.user.id;

  const dateObj = new Date(`${date}T00:00:00`);
  const dayEnd = addDays(dateObj, 1);

  const [entry, dayTrades] = await Promise.all([
    db.journalEntry.findUnique({
      where: { userId_date: { userId, date: new Date(date) } },
    }),
    db.trade.findMany({
      where: {
        userId,
        OR: [
          { entryAt: { gte: dateObj, lt: dayEnd } },
          { exitAt: { gte: dateObj, lt: dayEnd } },
        ],
      },
      orderBy: { entryAt: "asc" },
      include: { tradingAccount: true },
    }),
  ]);

  const dayNetPnl = dayTrades.reduce(
    (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
    0
  );

  const prevDate = format(subDays(dateObj, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(dateObj, 1), "yyyy-MM-dd");

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {format(dateObj, "EEEE, MMMM d, yyyy")}
            <Badge variant={entry ? "default" : "outline"} className="font-normal">
              {entry ? "Entry saved" : "Not written yet"}
            </Badge>
          </span>
        }
        description="Plan before the session, review after it."
        actions={
          <div className="flex gap-2">
            <Button
              render={
                <Link href={`/journal/${prevDate}`}>
                  <ChevronLeft className="size-4" />
                </Link>
              }
              nativeButton={false}
              variant="outline"
              size="icon"
            />
            <Button
              render={
                <Link href={`/journal/${nextDate}`}>
                  <ChevronRight className="size-4" />
                </Link>
              }
              nativeButton={false}
              variant="outline"
              size="icon"
            />
          </div>
        }
      />

      {dayTrades.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-muted-foreground" />
              This day&apos;s trades
            </CardTitle>
            <span
              className={`font-numeric text-sm font-semibold tabular-nums ${
                dayNetPnl > 0 ? "text-profit" : dayNetPnl < 0 ? "text-loss" : "text-muted-foreground"
              }`}
            >
              {formatCurrency(dayNetPnl)} · {dayTrades.length} trade
              {dayTrades.length === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {dayTrades.map((trade) => {
              const netPnl = trade.netPnl ? Number(trade.netPnl) : null;
              return (
                <Link
                  key={trade.id}
                  href={`/trades/${trade.id}`}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2.5">
                    <Badge variant={trade.direction === "LONG" ? "default" : "secondary"}>
                      {trade.direction}
                    </Badge>
                    <span className="font-medium">{trade.symbol}</span>
                  </div>
                  <span
                    className={`font-numeric tabular-nums ${
                      netPnl == null ? "text-muted-foreground" : netPnl >= 0 ? "text-profit" : "text-loss"
                    }`}
                  >
                    {netPnl == null ? "Open" : formatCurrency(netPnl, trade.tradingAccount.currency)}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <JournalForm
        date={date}
        hasEntry={!!entry}
        defaults={{
          marketOverview: entry?.marketOverview ?? null,
          tradingPlan: entry?.tradingPlan ?? null,
          goals: entry?.goals ?? null,
          mentalState: entry?.mentalState ?? null,
          importantLevels: entry?.importantLevels ?? null,
          newsEvents: entry?.newsEvents ?? null,
          endOfDayReview: entry?.endOfDayReview ?? null,
          lessonsLearned: entry?.lessonsLearned ?? null,
        }}
      />
    </div>
  );
}

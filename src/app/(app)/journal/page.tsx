import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { Plus, NotebookPen } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JournalCalendar } from "./journal-calendar";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const todayKey = format(now, "yyyy-MM-dd");
  const year = Number(params.year) || now.getFullYear();
  const month = params.month ? Number(params.month) - 1 : now.getMonth();
  const monthDate = new Date(year, month, 1);

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [entries, gridEntries, gridTrades] = await Promise.all([
    db.journalEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 15,
    }),
    db.journalEntry.findMany({
      where: { userId, date: { gte: gridStart, lte: gridEnd } },
      select: { date: true },
    }),
    db.trade.findMany({
      where: {
        userId,
        OR: [
          { entryAt: { gte: gridStart, lte: gridEnd } },
          { exitAt: { gte: gridStart, lte: gridEnd } },
        ],
      },
      select: { entryAt: true, exitAt: true },
    }),
  ]);

  const entryDateKeys = gridEntries.map((e) => e.date.toISOString().slice(0, 10));
  const tradeDateKeys = Array.from(
    new Set(
      gridTrades.flatMap((t) => [
        t.entryAt.toISOString().slice(0, 10),
        ...(t.exitAt ? [t.exitAt.toISOString().slice(0, 10)] : []),
      ])
    )
  );

  return (
    <div>
      <PageHeader
        title="Journal"
        description="Daily trading plans, mental state, and end-of-day reviews."
        actions={
          <Button
            render={<Link href={`/journal/${todayKey}`}>
              <Plus className="size-4" />
              Today&apos;s entry
            </Link>}
            nativeButton={false}
            size="sm"
          />
        }
      />

      <JournalCalendar
        year={year}
        month={month}
        gridDays={gridDays.map((d) => d.toISOString())}
        monthStart={monthStart.toISOString()}
        monthEnd={monthEnd.toISOString()}
        entryDateKeys={entryDateKeys}
        tradeDateKeys={tradeDateKeys}
        todayKey={todayKey}
        isCurrentMonth={year === now.getFullYear() && month === now.getMonth()}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No journal entries yet"
          description="Write a plan before you trade and a review after — patterns show up faster in writing than in memory."
          actions={
            <Link href={`/journal/${todayKey}`} className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" />
              Write today&apos;s entry
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">Recent entries</h2>
          {entries.map((entry) => {
            // entry.date is a date-only column stored at UTC midnight — read
            // its calendar date directly rather than through local-timezone
            // Date getters, which can roll it back a day west of UTC.
            const dateKey = entry.date.toISOString().slice(0, 10);
            const localDate = new Date(`${dateKey}T00:00:00`);
            const snippet =
              entry.tradingPlan || entry.endOfDayReview || entry.marketOverview;
            return (
              <Link key={entry.id} href={`/journal/${dateKey}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-col gap-1 p-4">
                    <span className="text-sm font-medium">
                      {format(localDate, "EEEE, MMMM d, yyyy")}
                    </span>
                    {snippet && (
                      <span className="line-clamp-1 text-sm text-muted-foreground">
                        {snippet}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

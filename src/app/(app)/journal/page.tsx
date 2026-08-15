import Link from "next/link";
import { format } from "date-fns";
import { Plus, NotebookPen } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function JournalPage() {
  const session = await auth();
  const userId = session!.user.id;

  const today = format(new Date(), "yyyy-MM-dd");

  const entries = await db.journalEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title="Journal"
        description="Daily trading plans, mental state, and end-of-day reviews."
        actions={
          <Button
            render={<Link href={`/journal/${today}`}>
              <Plus className="size-4" />
              Today&apos;s entry
            </Link>}
            nativeButton={false}
            size="sm"
          />
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No journal entries yet"
          description="Write a plan before you trade and a review after — patterns show up faster in writing than in memory."
          actions={
            <Link href={`/journal/${today}`} className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" />
              Write today&apos;s entry
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
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

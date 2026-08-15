import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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

  const entry = await db.journalEntry.findUnique({
    where: { userId_date: { userId, date: new Date(date) } },
  });

  const dateObj = new Date(`${date}T00:00:00`);
  const prevDate = format(subDays(dateObj, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(dateObj, 1), "yyyy-MM-dd");

  return (
    <div>
      <PageHeader
        title={format(dateObj, "EEEE, MMMM d, yyyy")}
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

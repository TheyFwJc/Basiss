import Link from "next/link";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

/**
 * A month grid for the journal index — the only way, previously, to reach a
 * date without an entry already in the most recent 60 was to edit the URL
 * by hand. Every cell links straight to /journal/[date] (writing a new
 * entry works the same as editing one, so unwritten days are clickable
 * too), marks days that already have an entry, and separately flags days
 * that had trades but no entry — a gap nothing else in the app surfaces.
 */
export function JournalCalendar({
  year,
  month,
  gridDays,
  monthStart,
  monthEnd,
  entryDateKeys,
  tradeDateKeys,
  todayKey,
  isCurrentMonth,
}: {
  year: number;
  month: number;
  gridDays: string[];
  monthStart: string;
  monthEnd: string;
  entryDateKeys: string[];
  tradeDateKeys: string[];
  todayKey: string;
  isCurrentMonth: boolean;
}) {
  const entrySet = new Set(entryDateKeys);
  const tradeSet = new Set(tradeDateKeys);
  const monthStartKey = monthStart.slice(0, 10);
  const monthEndKey = monthEnd.slice(0, 10);

  const prevMonth = month === 0 ? { year: year - 1, month: 12 } : { year, month };
  const nextMonth = month === 11 ? { year: year + 1, month: 1 } : { year, month: month + 2 };

  return (
    <div className="mb-6">
      <div className="animate-fade-in-up mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            render={
              <Link href={`/journal?year=${prevMonth.year}&month=${prevMonth.month}`}>
                <ChevronLeft className="size-4" />
              </Link>
            }
            nativeButton={false}
            variant="outline"
            size="icon"
            aria-label="Previous month"
          />
          {!isCurrentMonth && (
            <Button
              render={<Link href="/journal">Today</Link>}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="text-xs"
            />
          )}
          <Button
            render={
              <Link href={`/journal?year=${nextMonth.year}&month=${nextMonth.month}`}>
                <ChevronRight className="size-4" />
              </Link>
            }
            nativeButton={false}
            variant="outline"
            size="icon"
            aria-label="Next month"
          />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 pb-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {gridDays.map((iso, i) => {
          const key = dayKey(iso);
          const inMonth = key >= monthStartKey && key <= monthEndKey;
          const hasEntry = entrySet.has(key);
          const hasTrades = tradeSet.has(key);
          const isToday = key === todayKey;

          return (
            <Link
              key={iso}
              href={`/journal/${key}`}
              style={{ animationDelay: `${Math.floor(i / 7) * 40}ms` }}
              className={`animate-fade-in-up relative flex min-h-14 flex-col items-center justify-center rounded-md border p-1 text-center transition-all hover:-translate-y-0.5 hover:shadow-md sm:min-h-16 ${
                isToday ? "ring-2 ring-primary/70 ring-offset-1 ring-offset-background" : ""
              } ${
                !inMonth
                  ? "border-transparent opacity-40"
                  : hasEntry
                    ? "border-primary/30 bg-brand-soft"
                    : "border-border hover:bg-muted/50"
              }`}
            >
              <span
                className={`text-xs sm:text-sm ${
                  isToday ? "font-semibold text-primary" : hasEntry ? "" : "text-muted-foreground"
                }`}
              >
                {Number(key.slice(8, 10))}
              </span>
              {hasEntry && (
                <Check className="absolute top-1 right-1 size-2.5 text-primary" strokeWidth={3} />
              )}
              {hasTrades && !hasEntry && inMonth && (
                <span
                  aria-hidden
                  className="absolute bottom-1.5 size-1.5 rounded-full bg-muted-foreground/60"
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="flex size-3 items-center justify-center rounded-sm border border-primary/30 bg-brand-soft">
            <Check className="size-2 text-primary" strokeWidth={3} />
          </span>
          Entry written
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          Traded, no entry yet
        </span>
      </div>
    </div>
  );
}

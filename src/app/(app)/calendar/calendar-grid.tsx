"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

export type CalendarTrade = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  netPnl: string | null;
  exitAt: string;
  currency: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function CalendarGrid({
  year,
  month,
  gridDays,
  monthStart,
  monthEnd,
  trades,
  showWeeklyMonthlyTotals,
}: {
  year: number;
  month: number;
  gridDays: string[];
  monthStart: string;
  monthEnd: string;
  trades: CalendarTrade[];
  showWeeklyMonthlyTotals: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const tradesByDay = new Map<string, CalendarTrade[]>();
  for (const trade of trades) {
    const key = dayKey(trade.exitAt);
    const existing = tradesByDay.get(key) ?? [];
    existing.push(trade);
    tradesByDay.set(key, existing);
  }

  const prevMonth = month === 0 ? { year: year - 1, month: 12 } : { year, month };
  const nextMonth = month === 11 ? { year: year + 1, month: 1 } : { year, month: month + 2 };

  const monthStartKey = monthStart.slice(0, 10);
  const monthEndKey = monthEnd.slice(0, 10);

  const monthTrades = trades.filter((t) => {
    const key = dayKey(t.exitAt);
    return key >= monthStartKey && key <= monthEndKey;
  });
  const monthNetPnl = monthTrades.reduce(
    (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
    0
  );
  const monthWins = monthTrades.filter(
    (t) => t.netPnl && Number(t.netPnl) > 0
  ).length;
  const monthWinRate =
    monthTrades.length > 0 ? Math.round((monthWins / monthTrades.length) * 100) : null;

  const selectedTrades = selectedDay ? tradesByDay.get(selectedDay) ?? [] : [];
  const selectedNetPnl = selectedTrades.reduce(
    (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
    0
  );

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  return (
    <div>
      <div className="animate-fade-in-up mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <div className="flex items-center gap-1.5">
            <Button
              render={
                <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}>
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
                render={<Link href="/calendar">Today</Link>}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="text-xs"
              />
            )}
            <Button
              render={
                <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}>
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
        {monthTrades.length > 0 &&
          (showWeeklyMonthlyTotals ? (
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`font-numeric font-semibold tabular-nums ${
                  monthNetPnl > 0
                    ? "text-profit"
                    : monthNetPnl < 0
                      ? "text-loss"
                      : "text-muted-foreground"
                }`}
              >
                {formatCurrency(monthNetPnl)}
              </span>
              <span className="text-muted-foreground">
                · {monthTrades.length} trade{monthTrades.length === 1 ? "" : "s"}
                {monthWinRate !== null && ` · ${monthWinRate}% win rate`}
              </span>
            </div>
          ) : (
            <Link
              href="/pricing"
              className="flex items-center gap-1 text-xs text-muted-foreground underline"
            >
              Upgrade to Pro to see monthly totals
            </Link>
          ))}
      </div>

      <div
        className={`grid grid-cols-7 gap-1 sm:gap-1.5 ${showWeeklyMonthlyTotals ? "sm:grid-cols-8" : ""}`}
      >
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 pb-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {showWeeklyMonthlyTotals && (
          <div className="hidden px-1 pb-1 text-center text-xs font-medium text-muted-foreground sm:block">
            Week
          </div>
        )}

        {Array.from({ length: gridDays.length / 7 }, (_, weekIndex) => {
          const week = gridDays.slice(weekIndex * 7, weekIndex * 7 + 7);
          const weekTrades = week.flatMap((iso) => tradesByDay.get(dayKey(iso)) ?? []);
          const weekNetPnl = weekTrades.reduce(
            (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
            0
          );

          return (
            <div key={weekIndex} className="contents">
              {week.map((iso) => {
                const key = dayKey(iso);
                const inMonth = key >= monthStartKey && key <= monthEndKey;
                const dayTrades = tradesByDay.get(key) ?? [];
                const netPnl = dayTrades.reduce(
                  (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
                  0
                );
                const wins = dayTrades.filter((t) => t.netPnl && Number(t.netPnl) > 0).length;
                const hasTrades = dayTrades.length > 0;
                const isToday = key === todayKey;
                const accent =
                  !hasTrades ? null : netPnl > 0 ? "profit" : netPnl < 0 ? "loss" : "neutral";

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!hasTrades}
                    onClick={() => setSelectedDay(key)}
                    style={{ animationDelay: `${weekIndex * 40}ms` }}
                    className={`animate-fade-in-up relative flex min-h-16 w-full min-w-0 flex-col items-start overflow-hidden rounded-md border p-1 text-left transition-all sm:min-h-24 sm:p-2 ${
                      isToday ? "ring-2 ring-primary/70 ring-offset-1 ring-offset-background" : ""
                    } ${
                      accent === "profit"
                        ? "border-profit/30 bg-profit-muted before:bg-profit hover:-translate-y-0.5 hover:bg-profit-muted/80 hover:shadow-md"
                        : accent === "loss"
                          ? "border-loss/30 bg-loss-muted before:bg-loss hover:-translate-y-0.5 hover:bg-loss-muted/80 hover:shadow-md"
                          : accent === "neutral"
                            ? "border-border bg-muted before:bg-primary/40 hover:-translate-y-0.5 hover:bg-muted/80 hover:shadow-md"
                            : !inMonth
                              ? "border-transparent opacity-40"
                              : "border-border cursor-default"
                    } ${hasTrades ? "before:absolute before:inset-x-0 before:top-0 before:h-0.5" : ""}`}
                  >
                    <span
                      className={`text-[11px] sm:text-xs ${
                        isToday
                          ? "font-semibold text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {Number(key.slice(8, 10))}
                    </span>
                    {hasTrades && (
                      <>
                        <span
                          className={`mt-1 w-full truncate font-numeric text-[11px] font-semibold tabular-nums sm:text-sm ${
                            netPnl > 0 ? "text-profit" : netPnl < 0 ? "text-loss" : ""
                          }`}
                        >
                          <span className="sm:hidden">{formatCurrencyCompact(netPnl)}</span>
                          <span className="hidden sm:inline">{formatCurrency(netPnl)}</span>
                        </span>
                        <span className="mt-auto w-full truncate text-[9px] text-muted-foreground sm:text-xs">
                          {dayTrades.length}
                          <span className="hidden sm:inline">
                            {" "}
                            trade{dayTrades.length === 1 ? "" : "s"}
                          </span>
                          {" · "}
                          {Math.round((wins / dayTrades.length) * 100)}%
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
              {showWeeklyMonthlyTotals &&
                (() => {
                  const weekAccent =
                    weekTrades.length === 0
                      ? "none"
                      : weekNetPnl > 0
                        ? "profit"
                        : weekNetPnl < 0
                          ? "loss"
                          : "neutral";
                  const weekAccentClass =
                    weekAccent === "profit"
                      ? "border-profit/25 bg-profit-muted/40 before:bg-profit"
                      : weekAccent === "loss"
                        ? "border-loss/25 bg-loss-muted/40 before:bg-loss"
                        : weekAccent === "neutral"
                          ? "border-border bg-muted/40 before:bg-primary/40"
                          : "border-border/60 bg-transparent before:bg-transparent";

                  return (
                    <>
                      {/* Desktop: week total as a side column, same row as the 7 days. */}
                      <div
                        style={{ animationDelay: `${weekIndex * 40}ms` }}
                        className={`animate-fade-in-up relative hidden min-h-20 w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border p-1.5 text-center before:absolute before:inset-y-0 before:left-0 before:w-0.5 sm:flex sm:min-h-24 sm:p-2 ${weekAccentClass}`}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Week {weekIndex + 1}
                        </span>
                        {weekTrades.length > 0 ? (
                          <>
                            <span
                              className={`w-full truncate font-numeric text-xs font-semibold tabular-nums sm:text-sm ${
                                weekNetPnl > 0 ? "text-profit" : weekNetPnl < 0 ? "text-loss" : ""
                              }`}
                            >
                              {formatCurrency(weekNetPnl)}
                            </span>
                            <span className="mt-1 text-[10px] text-muted-foreground">
                              {weekTrades.length} trade{weekTrades.length === 1 ? "" : "s"}
                            </span>
                          </>
                        ) : (
                          <span className="mt-1 text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Mobile: week total as a full-width bar under the week's days. */}
                      <div
                        style={{ animationDelay: `${weekIndex * 40}ms` }}
                        className={`animate-fade-in-up relative col-span-7 -mt-0.5 mb-1 flex items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2 py-1.5 text-xs before:absolute before:inset-y-0 before:left-0 before:w-0.5 sm:hidden ${weekAccentClass}`}
                      >
                        <span className="text-muted-foreground">Week {weekIndex + 1}:</span>
                        {weekTrades.length > 0 ? (
                          <>
                            <span
                              className={`font-numeric font-semibold tabular-nums ${
                                weekNetPnl > 0 ? "text-profit" : weekNetPnl < 0 ? "text-loss" : ""
                              }`}
                            >
                              {formatCurrency(weekNetPnl)}
                            </span>
                            <span className="text-muted-foreground">
                              · {weekTrades.length} trade{weekTrades.length === 1 ? "" : "s"}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </>
                  );
                })()}
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDay}</DialogTitle>
            <DialogDescription>
              {selectedTrades.length} trade{selectedTrades.length === 1 ? "" : "s"} ·{" "}
              Net P&L:{" "}
              <span className={selectedNetPnl >= 0 ? "text-profit" : "text-loss"}>
                {formatCurrency(selectedNetPnl)}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {selectedTrades.map((t) => (
              <Link
                key={t.id}
                href={`/trades/${t.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={t.direction === "LONG" ? "default" : "secondary"}>
                    {t.direction}
                  </Badge>
                  <span className="font-medium">{t.symbol}</span>
                </div>
                <span
                  className={`font-numeric tabular-nums ${
                    t.netPnl == null
                      ? "text-muted-foreground"
                      : Number(t.netPnl) >= 0
                        ? "text-profit"
                        : "text-loss"
                  }`}
                >
                  {t.netPnl == null ? "Open" : formatCurrency(t.netPnl, t.currency)}
                </span>
              </Link>
            ))}
          </div>
          {selectedDay && (
            <Button
              render={
                <Link href={`/journal/${selectedDay}`}>
                  <NotebookPen className="size-4" />
                  Journal entry for this day
                </Link>
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-2 w-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

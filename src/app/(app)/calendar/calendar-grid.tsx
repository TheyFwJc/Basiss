"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
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
        <div className="flex gap-2">
          <Button
            render={
              <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}>
                <ChevronLeft className="size-4" />
              </Link>
            }
            nativeButton={false}
            variant="outline"
            size="icon"
          />
          <Button
            render={
              <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}>
                <ChevronRight className="size-4" />
              </Link>
            }
            nativeButton={false}
            variant="outline"
            size="icon"
          />
        </div>
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

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!hasTrades}
                    onClick={() => setSelectedDay(key)}
                    className={`flex min-h-16 w-full min-w-0 flex-col items-start overflow-hidden rounded-md border p-1 text-left transition-colors sm:min-h-24 sm:p-2 ${
                      !inMonth
                        ? "border-transparent opacity-40"
                        : hasTrades
                          ? netPnl > 0
                            ? "border-profit/30 bg-profit-muted hover:bg-profit-muted/80"
                            : netPnl < 0
                              ? "border-loss/30 bg-loss-muted hover:bg-loss-muted/80"
                              : "border-border bg-muted hover:bg-muted/80"
                          : "border-border cursor-default"
                    }`}
                  >
                    <span className="text-[11px] text-muted-foreground sm:text-xs">
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
              {showWeeklyMonthlyTotals && (
                <>
                  {/* Desktop: week total as a side column, same row as the 7 days. */}
                  <div
                    className={`hidden min-h-20 w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border border-dashed p-1.5 text-center sm:flex sm:min-h-24 sm:p-2 ${
                      weekTrades.length === 0
                        ? "border-border/60"
                        : weekNetPnl > 0
                          ? "border-profit/30"
                          : weekNetPnl < 0
                            ? "border-loss/30"
                            : "border-border/60"
                    }`}
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
                    className={`col-span-7 -mt-0.5 mb-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed px-2 py-1 text-xs sm:hidden ${
                      weekTrades.length === 0
                        ? "border-border/60"
                        : weekNetPnl > 0
                          ? "border-profit/30"
                          : weekNetPnl < 0
                            ? "border-loss/30"
                            : "border-border/60"
                    }`}
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
              )}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

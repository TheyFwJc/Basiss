import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { canUseFeature } from "@/lib/subscription";
import { CalendarGrid, type CalendarTrade } from "./calendar-grid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = params.month ? Number(params.month) - 1 : now.getMonth();
  const monthDate = new Date(year, month, 1);

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [trades, hasWeeklyMonthly] = await Promise.all([
    db.trade.findMany({
      where: {
        userId,
        exitAt: { gte: gridStart, lte: gridEnd },
      },
      orderBy: { exitAt: "asc" },
      include: { tradingAccount: true },
    }),
    canUseFeature(userId, "CALENDAR_WEEKLY_MONTHLY"),
  ]);

  const calendarTrades: CalendarTrade[] = trades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    netPnl: t.netPnl ? t.netPnl.toString() : null,
    exitAt: t.exitAt!.toISOString(),
    currency: t.tradingAccount.currency,
  }));

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Daily P&L, trade counts, and win rate at a glance."
      />
      <CalendarGrid
        year={year}
        month={month}
        gridDays={gridDays.map((d) => d.toISOString())}
        monthStart={monthStart.toISOString()}
        monthEnd={monthEnd.toISOString()}
        trades={calendarTrades}
        showWeeklyMonthlyTotals={hasWeeklyMonthly}
      />
    </div>
  );
}

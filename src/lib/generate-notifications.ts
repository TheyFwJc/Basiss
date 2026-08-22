import { startOfWeek, subDays } from "date-fns";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  checkDailyLossLimit,
  checkWeeklyDrawdown,
  checkMissingJournal,
  checkReviewReminder,
  checkRiskLimit,
  checkWeeklyReview,
  type NotificationCandidate,
} from "@/lib/notifications";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Checks current data against the user's own settings/history and upserts
 * any notifications that should exist right now — idempotent via
 * `dedupeKey`, so calling this on every app-shell render is safe (no
 * duplicate rows, no background job/cron needed).
 */
export async function generateNotifications(userId: string): Promise<void> {
  const now = new Date();
  const today = dateKey(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekStartKey = dateKey(weekStart);
  const yesterdayKey = dateKey(subDays(now, 1));

  const [accounts, settings, recentTrades, journalYesterday] = await Promise.all([
    db.tradingAccount.findMany({ where: { userId }, select: { startingBalance: true } }),
    db.userSettings.findUnique({ where: { userId } }),
    db.trade.findMany({
      where: { userId, entryAt: { gte: subDays(now, 30) } },
      select: {
        id: true,
        symbol: true,
        status: true,
        netPnl: true,
        riskPercent: true,
        exitAt: true,
        reviewWhatWentWell: true,
        reviewWhatWentWrong: true,
        reviewWhatToChange: true,
      },
    }),
    db.journalEntry.findUnique({
      where: { userId_date: { userId, date: new Date(yesterdayKey) } },
      select: { id: true },
    }),
  ]);

  const totalStartingBalance = accounts.reduce((sum, a) => sum + Number(a.startingBalance), 0);
  const maxDailyLossPct = settings?.maxDailyLossPct ? Number(settings.maxDailyLossPct) : null;
  const maxWeeklyLossPct = settings?.maxWeeklyLossPct ? Number(settings.maxWeeklyLossPct) : null;
  const defaultRiskPerTradePct = settings?.defaultRiskPerTradePct
    ? Number(settings.defaultRiskPerTradePct)
    : null;
  const dailyLimitAmount = maxDailyLossPct != null ? totalStartingBalance * (maxDailyLossPct / 100) : null;
  const weeklyLimitAmount =
    maxWeeklyLossPct != null ? totalStartingBalance * (maxWeeklyLossPct / 100) : null;

  const todayPnl = recentTrades
    .filter((t) => t.exitAt && dateKey(t.exitAt) === today && t.netPnl)
    .reduce((sum, t) => sum + Number(t.netPnl), 0);
  const weekClosedTrades = recentTrades.filter(
    (t) => t.status === "CLOSED" && t.exitAt && t.exitAt >= weekStart
  );
  const weekPnl = weekClosedTrades.reduce(
    (sum, t) => sum + (t.netPnl ? Number(t.netPnl) : 0),
    0
  );
  const unreviewedCount = weekClosedTrades.filter(
    (t) => !t.reviewWhatWentWell && !t.reviewWhatWentWrong && !t.reviewWhatToChange
  ).length;

  const candidates: (NotificationCandidate | null)[] = [
    checkDailyLossLimit({ dateKey: today, todayPnl, limitAmount: dailyLimitAmount }),
    checkWeeklyDrawdown({ weekStartKey, weekPnl, limitAmount: weeklyLimitAmount }),
    checkMissingJournal({ dateKey: yesterdayKey, hadEntry: !!journalYesterday }),
    checkReviewReminder({ weekStartKey, unreviewedCount }),
    checkWeeklyReview({ weekStartKey, closedTradeCount: weekClosedTrades.length }),
    ...recentTrades.map((t) =>
      checkRiskLimit({
        tradeId: t.id,
        symbol: t.symbol,
        riskPercent: t.riskPercent ? Number(t.riskPercent) : null,
        defaultRiskPerTradePct,
      })
    ),
  ];

  const toCreate = candidates.filter((c): c is NotificationCandidate => c != null);
  if (toCreate.length === 0) return;

  await Promise.all(
    toCreate.map((c) =>
      db.notification
        .upsert({
          where: { userId_dedupeKey: { userId, dedupeKey: c.dedupeKey } },
          create: { userId, type: c.type, message: c.message, dedupeKey: c.dedupeKey },
          update: {},
        })
        .catch((err) => {
          // Two concurrent requests (e.g. two tabs) can both race this
          // upsert for the same brand-new dedupeKey; the loser hits a
          // unique-constraint error rather than the update branch. The
          // notification already exists either way, so it's a no-op.
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            return;
          }
          throw err;
        })
    )
  );
}

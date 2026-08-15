/**
 * Demo data seed script — creates a dedicated demo account
 * (demo@basisapp.dev) with realistic sample trades so Dashboard, Calendar,
 * and Analytics have something meaningful to render. Never touches real user
 * data: it only ever creates/updates the one demo@basisapp.dev user.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@basisapp.dev";
const DEMO_PASSWORD = "demopassword123";

const SYMBOLS = ["AAPL", "MSFT", "TSLA", "NVDA", "SPY", "AMZN"];
const SESSIONS = ["PRE_MARKET", "OPEN", "MIDDAY", "POWER_HOUR", "AFTER_HOURS"] as const;

function daysAgo(n: number, hour: number, minute: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      name: "Demo Trader",
      passwordHash,
      settings: { create: {} },
    },
    update: {},
  });

  console.log(`Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (id ${user.id})`);

  // Reset this demo user's trading data so re-running the seed is idempotent.
  await db.trade.deleteMany({ where: { userId: user.id } });
  await db.tradingAccount.deleteMany({ where: { userId: user.id } });
  await db.strategy.deleteMany({ where: { userId: user.id } });

  const account = await db.tradingAccount.create({
    data: {
      userId: user.id,
      name: "Demo Brokerage",
      broker: "Interactive Brokers",
      accountType: "BROKERAGE",
      startingBalance: "50000",
      currency: "USD",
      status: "ACTIVE",
    },
  });

  const strategies = await Promise.all(
    ["Opening Range Breakout", "Pullback to VWAP", "Momentum Reversal"].map(
      (name) =>
        db.strategy.create({
          data: { userId: user.id, name, timeframe: "5m" },
        })
    )
  );

  // A realistic-ish mix: more winners than losers, varied sizes, spread across ~18 days.
  const outcomes = [
    1.5, -1, 2.2, 1.1, -0.6, 3, -1.4, 0.8, 1.9, -1, 2.6, 1.2, -0.9, 1.4, -2, 2, 1, -0.5,
  ];

  for (let i = 0; i < outcomes.length; i++) {
    const daysBack = outcomes.length - i;
    const direction = i % 3 === 0 ? "SHORT" : "LONG";
    const symbol = pick(SYMBOLS, i);
    const strategy = pick(strategies, i);
    const session = pick(SESSIONS, i);

    const entryPrice = 100 + i * 3.7;
    const quantity = 50 + (i % 4) * 25;
    const winLossR = outcomes[i];
    const stopDistance = 1.5;
    const priceMove = stopDistance * Math.abs(winLossR) * (winLossR >= 0 ? 1 : -1);
    const exitPrice =
      direction === "LONG" ? entryPrice + priceMove : entryPrice - priceMove;
    const stopLoss = direction === "LONG" ? entryPrice - stopDistance : entryPrice + stopDistance;

    const grossPnl = (direction === "LONG" ? exitPrice - entryPrice : entryPrice - exitPrice) * quantity;
    const fees = 1;
    const commission = 2;
    const netPnl = grossPnl - fees - commission;
    const riskAmount = stopDistance * quantity;
    const rMultiple = netPnl / riskAmount;

    const entryAt = daysAgo(daysBack, 9, 30 + (i % 5));
    const exitAt = daysAgo(daysBack, 10, 15 + (i % 20));

    await db.trade.create({
      data: {
        userId: user.id,
        tradingAccountId: account.id,
        symbol,
        assetClass: "EQUITY",
        direction,
        status: "CLOSED",
        quantity: String(quantity),
        avgEntryPrice: entryPrice.toFixed(2),
        avgExitPrice: exitPrice.toFixed(2),
        entryAt,
        exitAt,
        stopLoss: stopLoss.toFixed(2),
        fees: fees.toFixed(2),
        commission: commission.toFixed(2),
        grossPnl: grossPnl.toFixed(2),
        netPnl: netPnl.toFixed(2),
        riskAmount: riskAmount.toFixed(2),
        rMultiple: rMultiple.toFixed(4),
        strategyId: strategy.id,
        session,
        executions: {
          create: [
            {
              side: direction === "LONG" ? "BUY" : "SELL",
              quantity: String(quantity),
              price: entryPrice.toFixed(2),
              executedAt: entryAt,
              fees: fees.toFixed(2),
              commission: commission.toFixed(2),
            },
            {
              side: direction === "LONG" ? "SELL" : "BUY",
              quantity: String(quantity),
              price: exitPrice.toFixed(2),
              executedAt: exitAt,
            },
          ],
        },
      },
    });
  }

  console.log(`Seeded ${outcomes.length} demo trades for ${DEMO_EMAIL}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

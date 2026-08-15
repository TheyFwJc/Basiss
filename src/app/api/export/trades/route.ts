import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildTradesCsv, type TradeExportRow } from "@/lib/export";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const userId = session.user.id;
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

  const trades = await db.trade.findMany({
    where: { userId },
    orderBy: { entryAt: "desc" },
    include: {
      tradingAccount: true,
      strategy: true,
      playbook: true,
      executions: { orderBy: { executedAt: "asc" } },
    },
  });

  const rows: TradeExportRow[] = trades.map((t) => ({
    id: t.id,
    account: t.tradingAccount.name,
    currency: t.tradingAccount.currency,
    symbol: t.symbol,
    assetClass: t.assetClass,
    direction: t.direction,
    status: t.status,
    quantity: t.quantity.toString(),
    avgEntryPrice: t.avgEntryPrice.toString(),
    avgExitPrice: t.avgExitPrice?.toString() ?? null,
    entryAt: t.entryAt.toISOString(),
    exitAt: t.exitAt?.toISOString() ?? null,
    stopLoss: t.stopLoss?.toString() ?? null,
    takeProfit: t.takeProfit?.toString() ?? null,
    fees: t.fees.toString(),
    commission: t.commission.toString(),
    grossPnl: t.grossPnl?.toString() ?? null,
    netPnl: t.netPnl?.toString() ?? null,
    riskAmount: t.riskAmount?.toString() ?? null,
    riskPercent: t.riskPercent?.toString() ?? null,
    rMultiple: t.rMultiple?.toString() ?? null,
    strategy: t.strategy?.name ?? null,
    playbook: t.playbook?.name ?? null,
    session: t.session ?? null,
    marketCondition: t.marketCondition ?? null,
    notesBefore: t.notesBefore ?? null,
    notesDuring: t.notesDuring ?? null,
    notesAfter: t.notesAfter ?? null,
    emotionBefore: t.emotionBefore ?? null,
    emotionDuring: t.emotionDuring ?? null,
    emotionAfter: t.emotionAfter ?? null,
    confidence: t.confidence ?? null,
    executionRating: t.executionRating ?? null,
    ruleAdherence: t.ruleAdherence ?? null,
    executionCount: t.executions.length,
  }));

  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return new NextResponse(buildTradesCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="basis-trades-${timestamp}.csv"`,
      },
    });
  }

  // JSON keeps execution-level detail — full fidelity for backup/re-import, unlike the flat CSV.
  const json = trades.map((t, i) => ({
    ...rows[i],
    executions: t.executions.map((e) => ({
      side: e.side,
      quantity: e.quantity.toString(),
      price: e.price.toString(),
      executedAt: e.executedAt.toISOString(),
      fees: e.fees.toString(),
      commission: e.commission.toString(),
    })),
  }));

  return new NextResponse(JSON.stringify(json, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="basis-trades-${timestamp}.json"`,
    },
  });
}

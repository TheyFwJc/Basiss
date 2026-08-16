import { createHash } from "crypto";
import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import {
  groupExecutionsIntoTrades,
  tradeCreateDataFromGroup,
  type ImportedExecutionRow,
} from "@/lib/import";
import { tradingViewPayloadSchema, normalizeSide, parseExecutedAt } from "@/lib/tradingview-webhook";
import { canAddTrade } from "@/lib/subscription";

/**
 * Incoming webhook for TradingView Strategy alerts. There is no signature
 * to verify (TradingView can't sign these) — the URL's token IS the secret,
 * exactly like a Slack/Zapier incoming webhook, so it's looked up by hash
 * (never stored in plaintext) and the URL must be kept private.
 *
 * Each call is ONE execution (a single entry or exit fill), not a whole
 * trade — it's merged with whatever open trade already exists for this
 * account+symbol and re-grouped through the same FIFO logic the CSV
 * importer uses, so partial fills/scale-ins behave identically either way.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const webhook = await db.tradingViewWebhook.findUnique({ where: { tokenHash } });
  if (!webhook) {
    return NextResponse.json({ error: "Unknown webhook." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = tradingViewPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 }
    );
  }

  const side = normalizeSide(parsed.data.side);
  if (!side) {
    return NextResponse.json(
      { error: `Unrecognized side "${parsed.data.side}" — expected buy or sell.` },
      { status: 400 }
    );
  }

  let quantity: Decimal;
  let price: Decimal;
  try {
    quantity = new Decimal(parsed.data.quantity);
    price = new Decimal(parsed.data.price);
  } catch {
    return NextResponse.json({ error: "quantity/price must be numeric." }, { status: 400 });
  }
  if (!quantity.isFinite() || !price.isFinite() || quantity.lte(0) || price.lte(0)) {
    return NextResponse.json({ error: "quantity/price must be positive numbers." }, { status: 400 });
  }

  const symbol = parsed.data.symbol.toUpperCase();
  const executedAt = parseExecutedAt(parsed.data.time);

  const openTrade = await db.trade.findFirst({
    where: {
      userId: webhook.userId,
      tradingAccountId: webhook.tradingAccountId,
      symbol,
      status: "OPEN",
    },
    include: { executions: true },
  });

  const rows: ImportedExecutionRow[] = [
    ...(openTrade?.executions ?? []).map((e, i) => ({
      rowIndex: i,
      symbol,
      assetClass: webhook.defaultAssetClass,
      side: e.side,
      quantity: new Decimal(e.quantity.toString()),
      price: new Decimal(e.price.toString()),
      executedAt: e.executedAt,
      fees: new Decimal(e.fees.toString()),
      commission: new Decimal(e.commission.toString()),
    })),
    {
      rowIndex: openTrade?.executions.length ?? 0,
      symbol,
      assetClass: webhook.defaultAssetClass,
      side,
      quantity,
      price,
      executedAt,
      fees: new Decimal(0),
      commission: new Decimal(0),
    },
  ];

  let groups;
  try {
    groups = groupExecutionsIntoTrades(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't process this execution." },
      { status: 400 }
    );
  }

  // Re-deriving from [prior open trade + new fill] usually still yields one
  // trade (an update, not a new one) — only count it against the free-plan
  // limit when this execution genuinely opens an additional trade (e.g. a
  // closing fill that's oversized and flips into a new position).
  const netNewTrades = Math.max(0, groups.length - (openTrade ? 1 : 0));
  if (netNewTrades > 0) {
    const limit = await canAddTrade(webhook.userId);
    if (limit.limit != null && netNewTrades > Math.max(0, limit.limit - limit.count)) {
      return NextResponse.json(
        { error: `Free plan limit of ${limit.limit} trades/month reached.` },
        { status: 402 }
      );
    }
  }

  try {
    await db.$transaction([
      ...(openTrade ? [db.trade.delete({ where: { id: openTrade.id } })] : []),
      ...groups.map((group) =>
        db.trade.create({
          data: tradeCreateDataFromGroup(group, webhook.userId, webhook.tradingAccountId),
        })
      ),
      db.tradingViewWebhook.update({
        where: { id: webhook.id },
        data: { lastTriggeredAt: new Date() },
      }),
    ]);
  } catch {
    return NextResponse.json({ error: "Failed to save this execution." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tradesAffected: groups.length });
}

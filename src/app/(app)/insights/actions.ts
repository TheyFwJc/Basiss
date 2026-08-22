"use server";

import { cookies } from "next/headers";
import { GoogleGenAI, ApiError } from "@google/genai";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildTradingSummary } from "@/lib/ai/build-summary";
import { canUseFeature } from "@/lib/subscription";
import { ACCOUNT_SCOPE_COOKIE, resolveScopedAccountId } from "@/lib/account-scope";
import type { AnalyticsTrade } from "@/lib/analytics";

/**
 * AI-assisted analysis (Phase 8): Gemini reviews the user's own aggregated
 * trading statistics — never raw trade rows, never market data — and writes
 * a plain-language performance review. The system prompt is the only thing
 * standing between "here's what your own data shows" and "here's what AAPL
 * will do next week"; it earns the verbosity below.
 *
 * Uses Google's Gemini API (free tier, no billing required) rather than a
 * paid provider — see ARCHITECTURE.md for why.
 */
const SYSTEM_PROMPT = `You are a trading performance analyst inside Basis, a trading journal app. You are given one JSON object: aggregated statistics computed from a trader's own historical, closed trades in this app. You are never given raw trade rows, account numbers, personal information, or any live market data.

Your job is to help the trader understand their own patterns — not to advise them on what to trade next.

Hard rules, no exceptions:
- Never predict future price movement, market direction, or the future performance of any symbol or instrument.
- Never give financial, investment, or trading advice — no "you should buy/sell/hold X", no position sizing recommendations, no market timing calls.
- Never use guaranteed-outcome language. Describe correlations and tendencies ("trades tagged with X have a lower win rate"), never certainties ("doing Y will fix this" or "you will improve if..."). Frame suggestions as things worth investigating, not prescriptions.
- Every claim must be traceable to a number actually present in the JSON you're given. Do not invent or assume data that isn't there.
- If a breakdown has very few trades (single digits), say so explicitly and caveat the pattern as low-confidence rather than treating it as established.
- If the trader has fewer than roughly 20 closed trades in total, lead with a note that the sample is still small and patterns may not hold up.

What to do:
- Identify the most notable patterns in the data: where performance is strongest/weakest (symbol, strategy, session, day, time of day, holding time, risk size), what mistakes are costing the most, and whether confidence/execution-quality/rule-adherence ratings correlate with outcomes.
- Reference concrete numbers from the data (win rates, net P&L, R-multiples, trade counts) rather than vague language.
- If goals are included, note whether they're on track and why, based on the data.
- Write in direct, concrete prose for the trader themselves — a few short sections with plain headers, not a wall of text and not a bulleted data dump. Aim for something a trader would actually want to read, roughly 300-500 words.`;

// "-latest" alias so this keeps working as Google rotates dated model
// versions in and out of availability for new API accounts.
const MODEL = "gemini-flash-latest";

export type InsightsResult = { error: string } | { insight: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

const MIN_TRADES_FOR_INSIGHTS = 10;

export async function generateInsightsAction(): Promise<InsightsResult> {
  const userId = await requireUserId();

  if (!(await canUseFeature(userId, "AI_INSIGHTS"))) {
    return { error: "AI Insights is a Pro+ feature. Upgrade to Pro+ to unlock it." };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      error:
        "AI insights aren't configured yet — add GEMINI_API_KEY to the server's environment to enable this feature.",
    };
  }

  const [goals, allAccounts] = await Promise.all([
    db.goal.findMany({ where: { userId } }),
    db.tradingAccount.findMany({ where: { userId }, select: { id: true, startingBalance: true } }),
  ]);
  const rawScope = (await cookies()).get(ACCOUNT_SCOPE_COOKIE)?.value;
  const scopedAccountId = resolveScopedAccountId(rawScope, allAccounts.map((a) => a.id));
  const accounts = scopedAccountId
    ? allAccounts.filter((a) => a.id === scopedAccountId)
    : allAccounts;

  const trades = await db.trade.findMany({
    where: {
      userId,
      status: "CLOSED",
      ...(scopedAccountId ? { tradingAccountId: scopedAccountId } : {}),
    },
    include: { strategy: true, mistakes: { include: { mistake: true } } },
  });

  if (trades.length < MIN_TRADES_FOR_INSIGHTS) {
    return {
      error: `You need at least ${MIN_TRADES_FOR_INSIGHTS} closed trades before there's enough data for a meaningful analysis — you have ${trades.length} so far.`,
    };
  }

  const analyticsTrades: AnalyticsTrade[] = trades.map((t) => ({
    symbol: t.symbol,
    direction: t.direction,
    netPnl: t.netPnl,
    rMultiple: t.rMultiple,
    riskPercent: t.riskPercent,
    status: t.status,
    entryAt: t.entryAt,
    exitAt: t.exitAt,
    strategyId: t.strategyId,
    strategyName: t.strategy?.name ?? null,
    session: t.session,
    confidence: t.confidence,
    executionRating: t.executionRating,
    ruleAdherence: t.ruleAdherence,
    mistakes: t.mistakes.map((tm) => ({ id: tm.mistake.id, name: tm.mistake.name })),
  }));

  const totalStartingBalance = accounts.reduce(
    (sum, a) => sum + Number(a.startingBalance),
    0
  );
  const goalRows = goals.map((g) => ({
    metric: g.metric,
    period: g.period,
    targetValue: Number(g.targetValue),
  }));

  const summary = buildTradingSummary(analyticsTrades, goalRows, totalStartingBalance, new Date());

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: `Here is my aggregated trading performance data as JSON. Write me a performance review based only on this.\n\n${JSON.stringify(summary, null, 2)}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 4096,
      },
    });

    if (!response.text) {
      return { error: "No analysis was returned. Please try again." };
    }

    return { insight: response.text };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return { error: "The configured GEMINI_API_KEY was rejected. Check the server's environment." };
      }
      if (error.status === 429) {
        return { error: "Rate limited by the AI provider — try again in a moment." };
      }
      return { error: `AI request failed: ${error.message}` };
    }
    return { error: "Something went wrong generating insights. Please try again." };
  }
}

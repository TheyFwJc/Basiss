"use server";

import { GoogleGenAI, ApiError } from "@google/genai";
import { auth } from "@/auth";

/**
 * The in-app help assistant — answers questions about how Basis itself
 * works, grounded in a hand-written summary of the app's actual features
 * (kept in sync with the Help & FAQ page below). Deliberately scoped away
 * from trading/investment advice: this is a product-support bot, not a
 * second AI Insights feature, so it's available to every plan.
 */
const APP_KNOWLEDGE = `
Basis is a trading journal for tracking performance, risk, and psychology.

- Accounts: every trade belongs to a trading account (Accounts page). Current
  balance = starting balance + realized net P&L from that account's closed
  trades; it does not yet track deposits/withdrawals made outside of trading.
- Trades: built from fills (Entry/Exit rows), not a single entry/exit price —
  this handles partial fills and scaling in/out. P&L, R-multiple, and average
  price are computed automatically with decimal-safe math. Log manually from
  "Add trade", or bring in history via CSV Import (auto column-mapping,
  duplicate detection, FIFO grouping of raw fills into trades).
- Dashboard: KPI row (P&L, win rate, profit factor, expectancy, avg win/loss,
  avg R, max drawdown), equity curve, daily P&L chart, recent trades,
  best/worst setups, streaks. Some KPIs are Pro-gated on the Free plan.
- Calendar: month grid of daily P&L, trade count, win rate; weekly/monthly
  totals are a Pro feature. Click a day to see its trades.
- Analytics: combinable filters (symbol, direction, strategy, session, day of
  week, mistake) applied across breakdowns by symbol, session, time of day,
  holding time, risk, mistake cost, and a psychology-rating correlation, plus
  a day-of-week x session P&L heatmap. Pro feature.
- Strategies / Playbooks / Mistakes / Checklists: tag trades with a Strategy
  and/or Playbook to compare setups; track recurring Mistakes and what
  they're costing; build reusable Checklists (optionally tied to a Playbook).
- Risk Management: default risk-per-trade, daily/weekly loss limits with live
  usage against realized P&L, and a position-size calculator.
- Goals: targets for P&L, trade count, win rate, avg R, rule adherence, or
  max daily loss, tracked automatically per day/week/month/year.
- Daily Journal: a plan-before/review-after entry per calendar day.
- Insights (/insights): a Pro+ feature — AI reviews the user's own aggregated
  stats and writes a plain-language performance review. Never a market call.
- Trade screenshots: attached from a trade's detail page; Pro feature, needs
  storage configured on the server (Vercel Blob) or it shows "not configured".
- Subscriptions: Free (capped trades/month), Pro, and Pro+ plans via Stripe,
  managed from /billing; /pricing shows plan comparisons.
- Import/export: CSV import at /import; export everything back out as
  CSV/JSON from the Trades page. TradingView paper-trading trade history can
  be exported to CSV and imported the same way — type "TradingView" as the
  broker name so the column mapping is remembered for next time.
- TradingView auto-import: on the Settings page, "TradingView auto-import"
  creates a private webhook URL. Pasted into a TradingView Strategy alert's
  webhook field (with the given JSON message template using placeholders
  like {{ticker}}, {{strategy.order.action}}, {{strategy.order.contracts}},
  {{close}}, {{timenow}}), each alert automatically logs an entry/exit fill
  as a trade here — no manual entry needed. Only works with alerts created
  from a Strategy (not a plain indicator), since only strategies resolve
  the strategy.order.* placeholders. The webhook URL is shown only once at
  creation time, so it must be copied immediately.
`.trim();

const SYSTEM_PROMPT = `You are the in-app help assistant for Basis, a trading journal web app. Below is the ONLY information you know about the app — answer questions about how to use Basis using it:

${APP_KNOWLEDGE}

Rules, no exceptions:
- Only answer questions about how Basis itself works — navigation, features, terminology, what a number means, how to do something in the app.
- Never give trading, investment, or financial advice of any kind — no market predictions, no "buy/sell/hold" opinions, no position sizing recommendations for a real trade, never comment on a specific stock/symbol/market.
- If asked something outside Basis's own features (general trading advice, market questions, unrelated topics), politely say that's outside what you can help with here and redirect to what Basis itself covers.
- If you don't know the answer from the information above, say so honestly rather than guessing — do not invent features that aren't listed.
- Keep answers short and conversational — a few sentences, chat-style, not an essay. Use plain text, no markdown headers.`;

// "-latest" alias so this keeps working as Google rotates dated model
// versions in and out of availability for new API accounts.
const MODEL = "gemini-flash-latest";

const MAX_HISTORY_MESSAGES = 12;

export type HelpChatMessage = { role: "user" | "assistant"; content: string };
export type HelpChatResult = { error: string } | { reply: string };

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function askHelpAssistantAction(
  history: HelpChatMessage[],
  message: string
): Promise<HelpChatResult> {
  await requireUserId();

  if (!process.env.GEMINI_API_KEY) {
    return {
      error:
        "The AI help assistant isn't configured yet — add GEMINI_API_KEY to the server's environment to enable it.",
    };
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return { error: "Type a question first." };
  }

  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  const contents = [
    ...recentHistory.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: trimmedMessage }] },
  ];

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 1024,
      },
    });

    if (!response.text) {
      return { error: "No response was returned. Please try again." };
    }

    return { reply: response.text };
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
    return { error: "Something went wrong reaching the AI assistant. Please try again." };
  }
}

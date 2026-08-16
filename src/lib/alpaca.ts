/**
 * Server-only Alpaca market-data client (Phase 7, backtesting foundation).
 * Free tier only has the IEX feed (not the full-market SIP feed), which is
 * what's requested here — good enough for a reference price chart, not a
 * claim of exact fill-quality historical data.
 */

export type Bar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Timeframe = "5Min" | "15Min" | "1Hour" | "1Day";

export function isAlpacaConfigured(): boolean {
  return !!process.env.ALPACA_API_KEY_ID && !!process.env.ALPACA_API_SECRET_KEY;
}

/** Picks a bar granularity and lookback/lookahead padding from how long the
 * trade actually took — an intraday scalp gets 5-minute bars for that day,
 * a multi-week swing gets daily bars with a few weeks of context either side. */
export function timeframeForTrade(
  entryAt: Date,
  exitAt: Date | null
): { timeframe: Timeframe; start: Date; end: Date } {
  const now = new Date();
  const effectiveExit = exitAt ?? now;
  const durationMs = effectiveExit.getTime() - entryAt.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (durationMs <= 6 * hour) {
    return {
      timeframe: "5Min",
      start: new Date(entryAt.getTime() - 2 * hour),
      end: new Date(effectiveExit.getTime() + 2 * hour),
    };
  }
  if (durationMs <= 3 * day) {
    return {
      timeframe: "15Min",
      start: new Date(entryAt.getTime() - day),
      end: new Date(effectiveExit.getTime() + day),
    };
  }
  if (durationMs <= 14 * day) {
    return {
      timeframe: "1Hour",
      start: new Date(entryAt.getTime() - 2 * day),
      end: new Date(effectiveExit.getTime() + 2 * day),
    };
  }
  return {
    timeframe: "1Day",
    start: new Date(entryAt.getTime() - 14 * day),
    end: new Date(effectiveExit.getTime() + 14 * day),
  };
}

export type FetchBarsResult = { error: string } | { bars: Bar[] };

/** Fetches historical OHLCV bars for a US equity symbol. Only equities are
 * supported so far — Alpaca's crypto bars live on a different endpoint,
 * left for a later pass. */
export async function fetchBars(
  symbol: string,
  start: Date,
  end: Date,
  timeframe: Timeframe
): Promise<FetchBarsResult> {
  if (!isAlpacaConfigured()) {
    return { error: "Alpaca isn't configured — add ALPACA_API_KEY_ID/ALPACA_API_SECRET_KEY." };
  }

  const params = new URLSearchParams({
    timeframe,
    start: start.toISOString(),
    end: end.toISOString(),
    limit: "1000",
    feed: "iex",
    adjustment: "raw",
  });

  let response: Response;
  try {
    response = await fetch(
      `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars?${params}`,
      {
        headers: {
          "APCA-API-KEY-ID": process.env.ALPACA_API_KEY_ID!,
          "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET_KEY!,
        },
        // Historical bars for a specific trade never change — safe to cache.
        next: { revalidate: 3600 },
      }
    );
  } catch {
    return { error: "Couldn't reach Alpaca's market data API." };
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { error: "Alpaca rejected the configured API key." };
    }
    if (response.status === 429) {
      return { error: "Rate limited by Alpaca — try again in a moment." };
    }
    return { error: `Alpaca returned an error (${response.status}).` };
  }

  const data = (await response.json()) as {
    bars?: { t: string; o: number; h: number; l: number; c: number; v: number }[];
  };

  const bars: Bar[] = (data.bars ?? []).map((b) => ({
    time: b.t,
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
  }));

  if (bars.length === 0) {
    return { error: "No market data found for this symbol/time range (free tier only covers US equities)." };
  }

  return { bars };
}

import Decimal from "decimal.js";

/**
 * Centralized performance-metrics engine. Every formula here is documented
 * inline so "why does the dashboard say X" always has one answer — nothing
 * recomputes these ad hoc in a component.
 */

export type MetricsTrade = {
  netPnl: Decimal.Value | null;
  rMultiple: Decimal.Value | null;
  status: "OPEN" | "CLOSED";
  exitAt: Date | null;
};

export type WinLossStats = {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  /** 0-100. Null when there are no closed trades to divide by. */
  winRate: number | null;
};

/** Win rate excludes breakeven trades from the denominator, matching how most traders read "win %". */
export function computeWinLossStats(trades: MetricsTrade[]): WinLossStats {
  const closed = trades.filter((t) => t.status === "CLOSED");
  let winning = 0;
  let losing = 0;
  let breakeven = 0;

  for (const t of closed) {
    const pnl = t.netPnl == null ? null : new Decimal(t.netPnl);
    if (pnl == null || pnl.isZero()) breakeven += 1;
    else if (pnl.gt(0)) winning += 1;
    else losing += 1;
  }

  const decisive = winning + losing;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: trades.length - closed.length,
    winningTrades: winning,
    losingTrades: losing,
    breakevenTrades: breakeven,
    winRate: decisive > 0 ? (winning / decisive) * 100 : null,
  };
}

export type ProfitStats = {
  grossProfit: Decimal;
  grossLoss: Decimal;
  netPnl: Decimal;
  avgTrade: Decimal | null;
  avgWin: Decimal | null;
  avgLoss: Decimal | null;
  largestWin: Decimal | null;
  largestLoss: Decimal | null;
  /** grossProfit / abs(grossLoss). Null with no losses to divide by (undefined, not infinite). */
  profitFactor: Decimal | null;
  /** (winRate * avgWin) + (lossRate * avgLoss) — the average $ you expect per trade. */
  expectancy: Decimal | null;
};

export function computeProfitStats(trades: MetricsTrade[]): ProfitStats {
  const closed = trades.filter((t) => t.status === "CLOSED" && t.netPnl != null);

  let grossProfit = new Decimal(0);
  let grossLoss = new Decimal(0);
  let winCount = 0;
  let lossCount = 0;
  let largestWin: Decimal | null = null;
  let largestLoss: Decimal | null = null;

  for (const t of closed) {
    const pnl = new Decimal(t.netPnl!);
    if (pnl.gt(0)) {
      grossProfit = grossProfit.plus(pnl);
      winCount += 1;
      if (!largestWin || pnl.gt(largestWin)) largestWin = pnl;
    } else if (pnl.lt(0)) {
      grossLoss = grossLoss.plus(pnl);
      lossCount += 1;
      if (!largestLoss || pnl.lt(largestLoss)) largestLoss = pnl;
    }
  }

  const netPnl = grossProfit.plus(grossLoss);
  const avgWin = winCount > 0 ? grossProfit.dividedBy(winCount) : null;
  const avgLoss = lossCount > 0 ? grossLoss.dividedBy(lossCount) : null;
  const avgTrade = closed.length > 0 ? netPnl.dividedBy(closed.length) : null;
  const profitFactor = grossLoss.isZero()
    ? grossProfit.gt(0)
      ? null // undefined (no losses to divide by), not infinite
      : null
    : grossProfit.dividedBy(grossLoss.abs());

  let expectancy: Decimal | null = null;
  if (closed.length > 0) {
    const winRate = new Decimal(winCount).dividedBy(closed.length);
    const lossRate = new Decimal(lossCount).dividedBy(closed.length);
    expectancy = winRate
      .times(avgWin ?? 0)
      .plus(lossRate.times(avgLoss ?? 0));
  }

  return {
    grossProfit,
    grossLoss,
    netPnl,
    avgTrade,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    profitFactor,
    expectancy,
  };
}

export type RStats = {
  avgR: Decimal | null;
  totalR: Decimal | null;
  bestR: Decimal | null;
  worstR: Decimal | null;
};

export function computeRStats(trades: MetricsTrade[]): RStats {
  const rValues = trades
    .filter((t) => t.status === "CLOSED" && t.rMultiple != null)
    .map((t) => new Decimal(t.rMultiple!));

  if (rValues.length === 0) {
    return { avgR: null, totalR: null, bestR: null, worstR: null };
  }

  const totalR = rValues.reduce((sum, r) => sum.plus(r), new Decimal(0));
  const bestR = rValues.reduce((best, r) => (r.gt(best) ? r : best));
  const worstR = rValues.reduce((worst, r) => (r.lt(worst) ? r : worst));

  return {
    avgR: totalR.dividedBy(rValues.length),
    totalR,
    bestR,
    worstR,
  };
}

export type StreakStats = {
  current: { type: "WIN" | "LOSS" | null; count: number };
  bestWinStreak: number;
  worstLossStreak: number;
};

/** Trades must already be sorted chronologically (oldest first) by exit date. */
export function computeStreaks(trades: MetricsTrade[]): StreakStats {
  const closed = trades
    .filter((t) => t.status === "CLOSED" && t.netPnl != null && t.exitAt)
    .sort((a, b) => a.exitAt!.getTime() - b.exitAt!.getTime());

  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let runType: "WIN" | "LOSS" | null = null;
  let runLength = 0;

  for (const t of closed) {
    const pnl = new Decimal(t.netPnl!);
    const type: "WIN" | "LOSS" | null = pnl.gt(0) ? "WIN" : pnl.lt(0) ? "LOSS" : null;

    if (type && type === runType) {
      runLength += 1;
    } else {
      runType = type;
      runLength = type ? 1 : 0;
    }

    if (runType === "WIN") bestWinStreak = Math.max(bestWinStreak, runLength);
    if (runType === "LOSS") worstLossStreak = Math.max(worstLossStreak, runLength);
  }

  return {
    current: { type: runType, count: runLength },
    bestWinStreak,
    worstLossStreak,
  };
}

export type EquityPoint = { date: Date; equity: Decimal };

/** Cumulative equity from realized P&L only — deposits/withdrawals aren't tracked yet (later phase). */
export function buildEquityCurve(
  startingBalance: Decimal.Value,
  trades: MetricsTrade[]
): EquityPoint[] {
  const closed = trades
    .filter((t) => t.status === "CLOSED" && t.netPnl != null && t.exitAt)
    .sort((a, b) => a.exitAt!.getTime() - b.exitAt!.getTime());

  let running = new Decimal(startingBalance);
  const points: EquityPoint[] = [{ date: new Date(0), equity: running }];

  for (const t of closed) {
    running = running.plus(new Decimal(t.netPnl!));
    points.push({ date: t.exitAt!, equity: running });
  }

  return points;
}

export type DrawdownStats = {
  peakEquity: Decimal;
  currentEquity: Decimal;
  maxDrawdownAmount: Decimal;
  /** 0-100. */
  maxDrawdownPercent: Decimal;
};

/** Walks the equity curve tracking the running peak vs. the largest drop from any peak. */
export function computeMaxDrawdown(equityCurve: EquityPoint[]): DrawdownStats {
  if (equityCurve.length === 0) {
    const zero = new Decimal(0);
    return { peakEquity: zero, currentEquity: zero, maxDrawdownAmount: zero, maxDrawdownPercent: zero };
  }

  let peak = equityCurve[0].equity;
  let maxDrawdownAmount = new Decimal(0);
  let maxDrawdownPercent = new Decimal(0);

  for (const point of equityCurve) {
    if (point.equity.gt(peak)) peak = point.equity;
    const drawdown = peak.minus(point.equity);
    if (drawdown.gt(maxDrawdownAmount)) {
      maxDrawdownAmount = drawdown;
      maxDrawdownPercent = peak.gt(0) ? drawdown.dividedBy(peak).times(100) : new Decimal(0);
    }
  }

  return {
    peakEquity: peak,
    currentEquity: equityCurve[equityCurve.length - 1].equity,
    maxDrawdownAmount,
    maxDrawdownPercent,
  };
}

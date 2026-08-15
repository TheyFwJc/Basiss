import Decimal from "decimal.js";

/**
 * Advanced analytics engine (Phase 6): combinable filtering plus every
 * breakdown dimension on the Analytics page — symbol/direction/strategy/
 * session/day-of-week (Phase 3) and time-of-day/holding-time/risk/mistake
 * cost/psychology (Phase 6). One place per formula, tested, same rule as
 * pnl.ts/metrics.ts/goals.ts.
 */

export type AnalyticsTrade = {
  symbol: string;
  direction: "LONG" | "SHORT";
  netPnl: Decimal.Value | null;
  rMultiple: Decimal.Value | null;
  riskPercent: Decimal.Value | null;
  status: "OPEN" | "CLOSED";
  entryAt: Date;
  exitAt: Date | null;
  strategyId: string | null;
  strategyName: string | null;
  session: string | null;
  confidence: number | null;
  executionRating: number | null;
  ruleAdherence: number | null;
  mistakes: { id: string; name: string }[];
};

// ---------------------------------------------------------------------------
// Combinable filters
// ---------------------------------------------------------------------------

export type AnalyticsFilters = {
  symbol?: string;
  direction?: "LONG" | "SHORT";
  strategyId?: string;
  session?: string;
  /** 0 (Sunday) - 6 (Saturday), matching Date#getDay(). */
  dayOfWeek?: number;
  mistakeId?: string;
};

/** Every filter that's set must match (AND, not OR) — that's what makes them "combinable" rather than mutually exclusive tabs. */
export function filterTrades(
  trades: AnalyticsTrade[],
  filters: AnalyticsFilters
): AnalyticsTrade[] {
  return trades.filter((t) => {
    if (filters.symbol && t.symbol !== filters.symbol) return false;
    if (filters.direction && t.direction !== filters.direction) return false;
    if (filters.strategyId && t.strategyId !== filters.strategyId) return false;
    if (filters.session && t.session !== filters.session) return false;
    if (filters.dayOfWeek != null && (t.exitAt ?? t.entryAt).getDay() !== filters.dayOfWeek) {
      return false;
    }
    if (filters.mistakeId && !t.mistakes.some((m) => m.id === filters.mistakeId)) {
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Generic dimension grouping
// ---------------------------------------------------------------------------

export type DimensionGroup = {
  key: string;
  label: string;
  count: number;
  wins: number;
  netPnl: Decimal;
  avgR: Decimal | null;
};

/** Groups trades by an arbitrary key, summing net P&L and averaging R with Decimal precision throughout. */
export function groupByDimension(
  trades: AnalyticsTrade[],
  keyFn: (t: AnalyticsTrade) => { key: string; label: string } | null
): DimensionGroup[] {
  const map = new Map<
    string,
    { label: string; count: number; wins: number; netPnl: Decimal; rSum: Decimal; rCount: number }
  >();

  for (const t of trades) {
    const grouped = keyFn(t);
    if (!grouped) continue;

    const pnl = t.netPnl != null ? new Decimal(t.netPnl) : null;
    const r = t.rMultiple != null ? new Decimal(t.rMultiple) : null;
    const existing = map.get(grouped.key) ?? {
      label: grouped.label,
      count: 0,
      wins: 0,
      netPnl: new Decimal(0),
      rSum: new Decimal(0),
      rCount: 0,
    };

    existing.count += 1;
    if (pnl && pnl.gt(0)) existing.wins += 1;
    if (pnl) existing.netPnl = existing.netPnl.plus(pnl);
    if (r) {
      existing.rSum = existing.rSum.plus(r);
      existing.rCount += 1;
    }
    map.set(grouped.key, existing);
  }

  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      count: v.count,
      wins: v.wins,
      netPnl: v.netPnl,
      avgR: v.rCount > 0 ? v.rSum.dividedBy(v.rCount) : null,
    }))
    .sort((a, b) => b.netPnl.comparedTo(a.netPnl));
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const SESSION_LABELS: Record<string, string> = {
  PRE_MARKET: "Pre-market",
  OPEN: "Open",
  MIDDAY: "Midday",
  POWER_HOUR: "Power hour",
  AFTER_HOURS: "After-hours",
  OVERNIGHT: "Overnight",
};

export function groupBySymbol(trades: AnalyticsTrade[]): DimensionGroup[] {
  return groupByDimension(trades, (t) => ({ key: t.symbol, label: t.symbol }));
}

export function groupByDirection(trades: AnalyticsTrade[]): DimensionGroup[] {
  return groupByDimension(trades, (t) => ({
    key: t.direction,
    label: t.direction === "LONG" ? "Long" : "Short",
  }));
}

export function groupByStrategy(trades: AnalyticsTrade[]): DimensionGroup[] {
  return groupByDimension(trades, (t) =>
    t.strategyId ? { key: t.strategyId, label: t.strategyName ?? "Unknown" } : null
  );
}

export function groupBySession(trades: AnalyticsTrade[]): DimensionGroup[] {
  return groupByDimension(trades, (t) =>
    t.session ? { key: t.session, label: SESSION_LABELS[t.session] ?? t.session } : null
  );
}

export function groupByDayOfWeek(trades: AnalyticsTrade[]): DimensionGroup[] {
  return groupByDimension(trades, (t) => {
    const day = (t.exitAt ?? t.entryAt).getDay();
    return { key: String(day), label: DAY_LABELS[day] };
  }).sort((a, b) => Number(a.key) - Number(b.key));
}

// ---------------------------------------------------------------------------
// Time-of-day
// ---------------------------------------------------------------------------

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

/** Buckets by the entry execution's local hour (0-23) — when in the day a trade was taken, not closed. */
export function groupByHourOfDay(trades: AnalyticsTrade[]): DimensionGroup[] {
  return groupByDimension(trades, (t) => {
    const hour = t.entryAt.getHours();
    return { key: String(hour).padStart(2, "0"), label: formatHourLabel(hour) };
  }).sort((a, b) => Number(a.key) - Number(b.key));
}

// ---------------------------------------------------------------------------
// Holding time
// ---------------------------------------------------------------------------

export const HOLDING_TIME_BUCKETS = [
  { key: "u5m", label: "Under 5 min", maxMinutes: 5 },
  { key: "5-15m", label: "5–15 min", maxMinutes: 15 },
  { key: "15-30m", label: "15–30 min", maxMinutes: 30 },
  { key: "30-60m", label: "30–60 min", maxMinutes: 60 },
  { key: "1-4h", label: "1–4 hours", maxMinutes: 240 },
  { key: "4h+", label: "Over 4 hours", maxMinutes: Infinity },
] as const;

function holdingMinutes(t: AnalyticsTrade): number | null {
  return t.exitAt ? (t.exitAt.getTime() - t.entryAt.getTime()) / 60000 : null;
}

/** Only closed trades have a holding time; open trades are excluded rather than bucketed as "unknown". */
export function groupByHoldingTime(trades: AnalyticsTrade[]): DimensionGroup[] {
  const closed = trades.filter((t) => t.exitAt != null);
  const groups = groupByDimension(closed, (t) => {
    const minutes = holdingMinutes(t)!;
    const bucket =
      HOLDING_TIME_BUCKETS.find((b) => minutes <= b.maxMinutes) ??
      HOLDING_TIME_BUCKETS[HOLDING_TIME_BUCKETS.length - 1];
    return { key: bucket.key, label: bucket.label };
  });
  const order: string[] = HOLDING_TIME_BUCKETS.map((b) => b.key);
  return groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

// ---------------------------------------------------------------------------
// Risk (position sizing)
// ---------------------------------------------------------------------------

export const RISK_BUCKETS = [
  { key: "u0.5", label: "Under 0.5%", max: 0.5 },
  { key: "0.5-1", label: "0.5–1%", max: 1 },
  { key: "1-2", label: "1–2%", max: 2 },
  { key: "2-3", label: "2–3%", max: 3 },
  { key: "3+", label: "Over 3%", max: Infinity },
] as const;

/** Only trades with a stop loss (and therefore a riskPercent) can be sized against — the rest are excluded. */
export function groupByRisk(trades: AnalyticsTrade[]): DimensionGroup[] {
  const withRisk = trades.filter((t) => t.riskPercent != null);
  const groups = groupByDimension(withRisk, (t) => {
    const pct = Number(t.riskPercent);
    const bucket = RISK_BUCKETS.find((b) => pct <= b.max) ?? RISK_BUCKETS[RISK_BUCKETS.length - 1];
    return { key: bucket.key, label: bucket.label };
  });
  const order: string[] = RISK_BUCKETS.map((b) => b.key);
  return groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

// ---------------------------------------------------------------------------
// Mistake cost
// ---------------------------------------------------------------------------

export type MistakeCost = {
  mistakeId: string;
  name: string;
  count: number;
  netPnl: Decimal;
};

/** Sorted worst-first (most negative net P&L) — "how expensive is each mistake" is the point of this table. */
export function computeMistakeCost(trades: AnalyticsTrade[]): MistakeCost[] {
  const map = new Map<string, { name: string; count: number; netPnl: Decimal }>();

  for (const t of trades) {
    if (t.mistakes.length === 0) continue;
    const pnl = t.netPnl != null ? new Decimal(t.netPnl) : new Decimal(0);
    for (const m of t.mistakes) {
      const existing = map.get(m.id) ?? { name: m.name, count: 0, netPnl: new Decimal(0) };
      existing.count += 1;
      existing.netPnl = existing.netPnl.plus(pnl);
      map.set(m.id, existing);
    }
  }

  return Array.from(map.entries())
    .map(([mistakeId, v]) => ({ mistakeId, name: v.name, count: v.count, netPnl: v.netPnl }))
    .sort((a, b) => a.netPnl.comparedTo(b.netPnl));
}

// ---------------------------------------------------------------------------
// Psychology correlation
// ---------------------------------------------------------------------------

export type RatingGroup = {
  rating: number;
  count: number;
  winRate: number | null;
  netPnl: Decimal;
  avgR: Decimal | null;
};

/** Always returns all five ratings (1-5), zero-filled, so a chart/table has a stable, complete x-axis even with sparse data. */
export function groupByRating(
  trades: AnalyticsTrade[],
  ratingFn: (t: AnalyticsTrade) => number | null
): RatingGroup[] {
  const rated = trades.filter((t) => ratingFn(t) != null);
  const groups = groupByDimension(rated, (t) => {
    const r = ratingFn(t)!;
    return { key: String(r), label: String(r) };
  });

  return [1, 2, 3, 4, 5].map((rating) => {
    const g = groups.find((x) => x.key === String(rating));
    return {
      rating,
      count: g?.count ?? 0,
      winRate: g && g.count > 0 ? (g.wins / g.count) * 100 : null,
      netPnl: g?.netPnl ?? new Decimal(0),
      avgR: g?.avgR ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

export type HeatmapCell = { day: number; session: string; netPnl: Decimal; count: number };

/** Sparse — only (day, session) combinations that actually occurred get a cell; the UI fills in the rest of the grid. */
export function buildDayVsSessionHeatmap(trades: AnalyticsTrade[]): HeatmapCell[] {
  const map = new Map<string, { netPnl: Decimal; count: number }>();

  for (const t of trades) {
    if (!t.session) continue;
    const day = (t.exitAt ?? t.entryAt).getDay();
    const key = `${day}|${t.session}`;
    const pnl = t.netPnl != null ? new Decimal(t.netPnl) : new Decimal(0);
    const existing = map.get(key) ?? { netPnl: new Decimal(0), count: 0 };
    existing.netPnl = existing.netPnl.plus(pnl);
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([key, v]) => {
    const [day, session] = key.split("|");
    return { day: Number(day), session, netPnl: v.netPnl, count: v.count };
  });
}

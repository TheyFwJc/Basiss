"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/format";

type TooltipPayloadItem = { payload: { date: string; pnl: number } };

function DailyPnlTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const { date, pnl } = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--color-popover)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "var(--color-muted-foreground)", margin: 0 }}>{formatDate(date)}</p>
      <p
        style={{
          margin: 0,
          fontWeight: 600,
          color: pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)",
        }}
      >
        {formatCurrency(pnl)}
      </p>
    </div>
  );
}

export function DailyPnlChart({
  data,
}: {
  data: { date: string; pnl: number }[];
}) {
  // Split into two series that both pass through zero on the "off" side, so
  // each Area naturally fills toward the zero baseline instead of the chart
  // edge — a smooth diverging chart instead of a bar per day.
  const chartData = data.map((d) => ({
    date: d.date,
    pnl: d.pnl,
    gain: d.pnl >= 0 ? d.pnl : 0,
    loss: d.pnl < 0 ? d.pnl : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gainFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-profit)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-profit)" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="lossFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--color-loss)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-loss)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => formatDate(v)}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={(v: number) => formatCurrency(v)}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <ReferenceLine y={0} stroke="var(--color-border)" />
        <Tooltip content={<DailyPnlTooltip />} />
        <Area
          type="monotone"
          dataKey="gain"
          stroke="var(--color-profit)"
          strokeWidth={2}
          fill="url(#gainFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-background)" }}
        />
        <Area
          type="monotone"
          dataKey="loss"
          stroke="var(--color-loss)"
          strokeWidth={2}
          fill="url(#lossFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-background)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

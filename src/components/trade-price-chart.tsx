"use client";

import * as React from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Bar } from "@/lib/alpaca";

const CANDLE_UNIT = 12;
const BODY_RATIO = 0.62;
const MAIN_HEIGHT = 320;
const VOLUME_HEIGHT = 64;
const PANE_GAP = 14;
const AXIS_WIDTH = 64;
const X_AXIS_HEIGHT = 22;
const LEFT_PAD = 8;

function nearestBarIndex(bars: Bar[], iso: string): number {
  const target = new Date(iso).getTime();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < bars.length; i++) {
    const diff = Math.abs(new Date(bars[i].time).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

export function TradePriceChart({
  bars,
  entryPrice,
  entryAt,
  exitPrice,
  exitAt,
  currency,
}: {
  bars: Bar[];
  entryPrice: number;
  entryAt: string;
  exitPrice: number | null;
  exitAt: string | null;
  currency: string;
}) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const width = LEFT_PAD + bars.length * CANDLE_UNIT + AXIS_WIDTH;
  const totalHeight = MAIN_HEIGHT + PANE_GAP + VOLUME_HEIGHT + X_AXIS_HEIGHT;

  // Always include entry/exit so their reference lines/markers never fall
  // outside the visible range — matters most for demo/synthetic data whose
  // recorded price has no relationship to the real symbol's actual range.
  const low = Math.min(...bars.map((b) => b.low), entryPrice, exitPrice ?? entryPrice);
  const high = Math.max(...bars.map((b) => b.high), entryPrice, exitPrice ?? entryPrice);
  const pricePad = (high - low) * 0.08 || 1;
  const priceMin = low - pricePad;
  const priceMax = high + pricePad;
  const maxVolume = Math.max(...bars.map((b) => b.volume), 1);

  function priceToY(price: number) {
    return MAIN_HEIGHT - ((price - priceMin) / (priceMax - priceMin)) * MAIN_HEIGHT;
  }
  function volumeToHeight(volume: number) {
    return (volume / maxVolume) * VOLUME_HEIGHT;
  }
  function centerX(i: number) {
    return LEFT_PAD + i * CANDLE_UNIT + CANDLE_UNIT / 2;
  }

  const entryIndex = nearestBarIndex(bars, entryAt);
  const exitIndex = exitAt ? nearestBarIndex(bars, exitAt) : null;
  const isProfit = exitPrice != null && exitPrice >= entryPrice;

  const priceTicks = 5;
  const tickValues = Array.from(
    { length: priceTicks },
    (_, i) => priceMin + ((priceMax - priceMin) * i) / (priceTicks - 1)
  );

  const labelEvery = Math.max(1, Math.ceil(bars.length / 6));

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    const index = Math.round((localX - LEFT_PAD - CANDLE_UNIT / 2) / CANDLE_UNIT);
    setHoverIndex(Math.max(0, Math.min(bars.length - 1, index)));
  }

  const hovered = hoverIndex != null ? bars[hoverIndex] : null;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${totalHeight}`}
        width="100%"
        height={totalHeight}
        className="block min-w-full"
        style={{ minWidth: Math.min(width, 1400) }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Price grid + right-side axis labels */}
        {tickValues.map((v, i) => (
          <g key={i}>
            <line
              x1={0}
              x2={width - AXIS_WIDTH}
              y1={priceToY(v)}
              y2={priceToY(v)}
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text
              x={width - AXIS_WIDTH + 6}
              y={priceToY(v) + 4}
              fontSize={10}
              fill="var(--color-muted-foreground)"
            >
              {formatCurrency(v, currency)}
            </text>
          </g>
        ))}

        {/* Entry/exit reference lines */}
        <line
          x1={0}
          x2={width - AXIS_WIDTH}
          y1={priceToY(entryPrice)}
          y2={priceToY(entryPrice)}
          stroke="var(--color-primary)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {exitPrice != null && (
          <line
            x1={0}
            x2={width - AXIS_WIDTH}
            y1={priceToY(exitPrice)}
            y2={priceToY(exitPrice)}
            stroke={isProfit ? "var(--color-profit)" : "var(--color-loss)"}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Trade span tint */}
        {exitIndex != null && (
          <rect
            x={centerX(Math.min(entryIndex, exitIndex)) - CANDLE_UNIT / 2}
            y={0}
            width={Math.abs(exitIndex - entryIndex) * CANDLE_UNIT + CANDLE_UNIT}
            height={MAIN_HEIGHT}
            fill={isProfit ? "var(--color-profit)" : "var(--color-loss)"}
            opacity={0.06}
          />
        )}

        {/* Candles */}
        {bars.map((bar, i) => {
          const up = bar.close >= bar.open;
          const color = up ? "var(--color-profit)" : "var(--color-loss)";
          const bodyTop = priceToY(Math.max(bar.open, bar.close));
          const bodyBottom = priceToY(Math.min(bar.open, bar.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);
          const x = centerX(i);

          return (
            <g key={bar.time}>
              <line
                x1={x}
                x2={x}
                y1={priceToY(bar.high)}
                y2={priceToY(bar.low)}
                stroke={color}
                strokeWidth={1}
              />
              <rect
                x={x - (CANDLE_UNIT * BODY_RATIO) / 2}
                y={bodyTop}
                width={CANDLE_UNIT * BODY_RATIO}
                height={bodyHeight}
                fill={color}
              />
              <rect
                x={x - CANDLE_UNIT / 2}
                y={MAIN_HEIGHT + PANE_GAP + VOLUME_HEIGHT - volumeToHeight(bar.volume)}
                width={CANDLE_UNIT * BODY_RATIO}
                height={volumeToHeight(bar.volume)}
                fill={color}
                opacity={0.5}
                transform={`translate(${(CANDLE_UNIT - CANDLE_UNIT * BODY_RATIO) / 2}, 0)`}
              />
            </g>
          );
        })}

        {/* Entry/exit markers */}
        <circle
          cx={centerX(entryIndex)}
          cy={priceToY(entryPrice)}
          r={3.5}
          fill="var(--color-background)"
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
        {exitIndex != null && exitPrice != null && (
          <circle
            cx={centerX(exitIndex)}
            cy={priceToY(exitPrice)}
            r={3.5}
            fill="var(--color-background)"
            stroke={isProfit ? "var(--color-profit)" : "var(--color-loss)"}
            strokeWidth={2}
          />
        )}

        {/* Hover crosshair */}
        {hovered && (
          <>
            <line
              x1={centerX(hoverIndex!)}
              x2={centerX(hoverIndex!)}
              y1={0}
              y2={MAIN_HEIGHT + PANE_GAP + VOLUME_HEIGHT}
              stroke="var(--color-muted-foreground)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <line
              x1={0}
              x2={width - AXIS_WIDTH}
              y1={priceToY(hovered.close)}
              y2={priceToY(hovered.close)}
              stroke="var(--color-muted-foreground)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          </>
        )}

        {/* X-axis labels */}
        {bars.map((bar, i) =>
          i % labelEvery === 0 ? (
            <text
              key={bar.time}
              x={centerX(i)}
              y={MAIN_HEIGHT + PANE_GAP + VOLUME_HEIGHT + 16}
              fontSize={9}
              textAnchor="middle"
              fill="var(--color-muted-foreground)"
            >
              {formatDateTime(bar.time).replace(/, \d+:\d+ (AM|PM)$/, "")}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-0 left-2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
          <p className="font-medium">{formatDateTime(hovered.time)}</p>
          <p className="font-numeric text-muted-foreground">
            O <span className="text-foreground">{formatCurrency(hovered.open, currency)}</span>{" "}
            H <span className="text-foreground">{formatCurrency(hovered.high, currency)}</span>{" "}
            L <span className="text-foreground">{formatCurrency(hovered.low, currency)}</span>{" "}
            C <span className="text-foreground">{formatCurrency(hovered.close, currency)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

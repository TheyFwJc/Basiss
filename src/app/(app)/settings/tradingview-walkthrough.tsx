"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A schematic mockup of a small app window — not a real screenshot of
 * Basis or TradingView, just enough shape to orient the two panes. */
function AppFrame({
  label,
  x,
  children,
}: {
  label: string;
  x: number;
  children: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <rect
        x={0}
        y={0}
        width={190}
        height={200}
        rx={10}
        fill="var(--color-card)"
        stroke="var(--color-border)"
      />
      <rect x={0} y={0} width={190} height={22} rx={10} fill="var(--color-muted)" />
      <rect x={0} y={12} width={190} height={10} fill="var(--color-muted)" />
      <circle cx={12} cy={11} r={3} fill="var(--color-loss)" opacity={0.6} />
      <circle cx={22} cy={11} r={3} fill="var(--color-muted-foreground)" opacity={0.4} />
      <circle cx={32} cy={11} r={3} fill="var(--color-profit)" opacity={0.6} />
      <text x={95} y={15} textAnchor="middle" className="fill-current text-[9px] font-medium text-muted-foreground">
        {label}
      </text>
      {children}
    </g>
  );
}

const STEPS = [
  {
    title: "Create a webhook in Basis",
    body: "Settings → TradingView auto-import → fill in a label, account, and asset class.",
    illustration: (
      <AppFrame label="Basis — Settings" x={0}>
        <rect x={14} y={36} width={162} height={14} rx={4} fill="var(--color-muted)" />
        <rect x={14} y={58} width={162} height={14} rx={4} fill="var(--color-muted)" />
        <rect x={14} y={80} width={162} height={14} rx={4} fill="var(--color-muted)" />
        <rect
          x={14}
          y={106}
          width={110}
          height={20}
          rx={6}
          className="fill-primary"
        />
        <text x={69} y={120} textAnchor="middle" className="fill-current text-[9px] font-medium text-white">
          Create webhook
        </text>
      </AppFrame>
    ),
  },
  {
    title: "Add a Strategy alert in TradingView",
    body: "Add your Strategy to the chart (not a plain indicator), then create an alert set to trigger on Order fills.",
    illustration: (
      <AppFrame label="TradingView" x={0}>
        <path
          d="M14 100 L40 70 L64 90 L92 40 L120 60 L150 30"
          fill="none"
          stroke="var(--color-profit)"
          strokeWidth={2}
        />
        <rect x={14} y={130} width={60} height={16} rx={8} className="fill-primary/15" />
        <text x={44} y={141} textAnchor="middle" className="fill-current text-[8px] font-medium text-primary">
          Strategy
        </text>
        <rect
          x={14}
          y={156}
          width={162}
          height={22}
          rx={6}
          fill="var(--color-background)"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <text x={95} y={171} textAnchor="middle" className="fill-current text-[8px] font-medium text-foreground">
          Condition: Order fills
        </text>
      </AppFrame>
    ),
  },
  {
    title: "Paste the URL and message template",
    body: "Paste the webhook URL into the alert's Webhook URL field, and the JSON template into the Message field.",
    illustration: (
      <AppFrame label="TradingView — Alert" x={0}>
        <text x={14} y={42} className="fill-current text-[8px] text-muted-foreground">
          Webhook URL
        </text>
        <rect
          x={14}
          y={48}
          width={162}
          height={18}
          rx={5}
          fill="var(--color-background)"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
        />
        <text x={20} y={60} className="fill-current text-[7px] font-mono text-primary">
          .../api/tradingview/...
        </text>
        <text x={14} y={82} className="fill-current text-[8px] text-muted-foreground">
          Message
        </text>
        <rect
          x={14}
          y={88}
          width={162}
          height={72}
          rx={5}
          fill="var(--color-muted)"
        />
        <text x={20} y={102} className="fill-current text-[7px] font-mono text-muted-foreground">
          {"{ \"symbol\":"}
        </text>
        <text x={20} y={114} className="fill-current text-[7px] font-mono text-muted-foreground">
          {"  \"{{ticker}}\","}
        </text>
        <text x={20} y={126} className="fill-current text-[7px] font-mono text-muted-foreground">
          {"  \"side\": \"..\","}
        </text>
        <text x={20} y={138} className="fill-current text-[7px] font-mono text-muted-foreground">
          {"  ... }"}
        </text>
      </AppFrame>
    ),
  },
  {
    title: "Save — trades log themselves",
    body: "Every entry/exit the strategy fires posts to Basis automatically and shows up in Trades.",
    illustration: (
      <AppFrame label="Basis — Trades" x={0}>
        <rect x={14} y={36} width={162} height={26} rx={6} className="fill-profit/10 stroke-profit/40" strokeWidth={1} />
        <text x={20} y={53} className="fill-current text-[8px] font-medium text-foreground">
          AAPL · LONG
        </text>
        <text x={150} y={53} textAnchor="end" className="fill-current text-[8px] font-semibold text-profit">
          +$154
        </text>
        <rect x={14} y={70} width={162} height={16} rx={5} fill="var(--color-muted)" />
        <rect x={14} y={92} width={162} height={16} rx={5} fill="var(--color-muted)" />
        <rect x={14} y={114} width={162} height={16} rx={5} fill="var(--color-muted)" />
      </AppFrame>
    ),
  },
];

export function TradingViewWalkthrough() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Step {index + 1} of {STEPS.length}: {step.title}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            aria-label="Previous step"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={index === STEPS.length - 1}
            onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            aria-label="Next step"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <svg
        viewBox="0 0 190 200"
        className="mx-auto h-[180px] w-full max-w-[240px]"
        role="img"
        aria-label={step.title}
      >
        {step.illustration}
      </svg>

      <p className="text-center text-xs text-muted-foreground">{step.body}</p>

      <div className="flex items-center justify-center gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to step ${i + 1}`}
            className={cn(
              "size-1.5 rounded-full transition-all",
              i === index ? "w-4 bg-primary" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}

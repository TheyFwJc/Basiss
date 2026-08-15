"use client";

import { AnimatedNumber } from "@/components/animated-number";

const BARS = [38, 52, 44, 61, 58, 74, 69, 82, 77, 91];

/**
 * A stylized illustration of the app's own dashboard for the marketing page —
 * not real user data, just this component's own mock numbers rendered in the
 * product's actual visual language (KPI tile + equity bars).
 */
export function LandingPreview() {
  return (
    <div className="animate-fade-in-up delay-300 relative w-full max-w-md rounded-2xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Total P&L</p>
        <span className="rounded-full bg-profit-muted px-2 py-0.5 text-[10px] font-semibold text-profit">
          +18.4%
        </span>
      </div>
      <p className="font-numeric text-3xl font-bold tracking-tight text-profit">
        <AnimatedNumber value={12847.5} format="currency" />
      </p>
      <div className="mt-5 flex h-20 items-end gap-1.5">
        {BARS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-brand-gradient opacity-80"
            style={{
              height: `${h}%`,
              animation: `fade-in-up 0.6s ${0.4 + i * 0.05}s cubic-bezier(0.16,1,0.3,1) both`,
            }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground">Win rate</p>
          <p className="font-numeric text-sm font-semibold">64%</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Profit factor</p>
          <p className="font-numeric text-sm font-semibold">2.4</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Avg R</p>
          <p className="font-numeric text-sm font-semibold">+1.3R</p>
        </div>
      </div>
    </div>
  );
}

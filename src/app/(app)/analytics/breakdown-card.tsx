"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

export type BreakdownBar = { label: string; value: number };

/**
 * A compact "small multiple" for one analytics dimension: a mini bar list
 * plus a click-to-expand Dialog holding the full breakdown table. `detail`
 * is already-rendered server JSX passed down as a prop (not a render
 * function — functions can't cross the Server->Client Component boundary).
 */
export function BreakdownCard({
  title,
  icon,
  bars,
  detail,
}: {
  title: string;
  icon: React.ReactNode;
  bars: BreakdownBar[];
  detail: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const maxAbs = Math.max(...bars.map((b) => Math.abs(b.value)), 1);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left"
      >
        <Card className="h-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              {icon}
              {title}
            </CardTitle>
            <Maximize2 className="size-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {bars.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No data yet</p>
            ) : (
              bars.map((bar) => {
                const pct = (Math.abs(bar.value) / maxAbs) * 100;
                return (
                  <div key={bar.label} className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 truncate text-muted-foreground">
                      {bar.label}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: bar.value >= 0 ? "var(--color-profit)" : "var(--color-loss)",
                        }}
                      />
                    </div>
                    <span
                      className={`w-16 shrink-0 text-right font-numeric tabular-nums ${
                        bar.value >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatCurrency(bar.value)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
          </DialogHeader>
          {detail}
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import * as React from "react";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TourStep = {
  target: string;
  title: string;
  description: string;
};

const STEPS: TourStep[] = [
  {
    target: "nav-dashboard",
    title: "Your dashboard",
    description: "KPIs, your equity curve, and recent trades — the whole picture at a glance.",
  },
  {
    target: "nav-trades",
    title: "Log your trades",
    description: "Add trades manually, with multi-leg fills handled automatically, or browse your full history.",
  },
  {
    target: "nav-calendar",
    title: "Calendar view",
    description: "See daily P&L on a month grid — click any day to see exactly what you traded.",
  },
  {
    target: "nav-analytics",
    title: "Deep analytics",
    description: "Break your performance down by symbol, session, time of day, and risk — then filter it all at once.",
  },
  {
    target: "nav-import",
    title: "Broker CSV import",
    description: "Already trading elsewhere? Upload an export and we'll map columns and group fills into trades for you.",
  },
  {
    target: "nav-insights",
    title: "AI-assisted insights",
    description: "Get a plain-language review of your own stats — patterns and tendencies, never a market call.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function useTargetRect(target: string, active: boolean): Rect | null {
  const [rect, setRect] = React.useState<Rect | null>(null);

  React.useEffect(() => {
    if (!active) return;

    function measure() {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [target, active]);

  return rect;
}

/**
 * A guided walkthrough shown once after a new user clicks through the
 * welcome screen. On viewports with the desktop sidebar visible it's a
 * spotlight tour pointing at real nav links; on narrower viewports (where
 * the sidebar lives in a hidden drawer) it falls back to a plain card
 * carousel with the same content, since there's nothing to spotlight.
 */
export function ProductTour({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = React.useState(0);
  const [hasSidebar, setHasSidebar] = React.useState(true);
  const current = STEPS[step];
  const rect = useTargetRect(current.target, hasSidebar);

  React.useEffect(() => {
    function check() {
      setHasSidebar(window.matchMedia("(min-width: 768px)").matches);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) {
      onFinish();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  const cardStyle: React.CSSProperties =
    hasSidebar && rect
      ? {
          position: "fixed",
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width + 16,
          transform: "translateY(-50%)",
        }
      : {
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };

  return (
    <div className="fixed inset-0 z-50">
      {hasSidebar && rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 rounded-md transition-all duration-300"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-black/55" />
      )}

      <div
        className="animate-fade-in-up w-[calc(100%-2rem)] max-w-xs rounded-xl border border-border bg-card p-5 shadow-2xl"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
          <button
            type="button"
            onClick={onFinish}
            aria-label="Skip tour"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <h3 className="mt-2 font-semibold">{current.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{current.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s.target}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === step ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={back}>
                <ArrowLeft className="size-3.5" />
                Back
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onFinish}>
              Skip
            </Button>
            <Button size="sm" onClick={next}>
              {isLast ? "Done" : "Next"}
              {!isLast && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

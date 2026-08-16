"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";

/**
 * A one-shot splash that plays once per app-shell mount (i.e. once per fresh
 * page load, which is exactly what happens right after login/signup
 * redirects here) — the brand mark fills the screen then zooms out and
 * fades, revealing the dashboard underneath. Calls `onDone` once it's safe
 * to unmount and let the rest of the shell take over.
 */
export function EntryTransition({ onDone }: { onDone: () => void }) {
  const [entered, setEntered] = React.useState(false);
  const [zooming, setZooming] = React.useState(false);

  React.useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onDone();
      return;
    }
    const enterTimer = window.setTimeout(() => setEntered(true), 20);
    const startTimer = window.setTimeout(() => setZooming(true), 350);
    const doneTimer = window.setTimeout(onDone, 1050);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(startTimer);
      window.clearTimeout(doneTimer);
    };
    // Runs once on mount — onDone is stable enough for this one-shot effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center bg-background transition-opacity duration-500 ease-in",
        zooming && "opacity-0"
      )}
    >
      <BrandMark
        glow={entered && !zooming}
        className={cn(
          "size-24 text-4xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          !entered && "scale-75 opacity-0",
          entered && !zooming && "scale-100 opacity-100",
          zooming && "scale-[0.35] opacity-0"
        )}
      />
    </div>
  );
}

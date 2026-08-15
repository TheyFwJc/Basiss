"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatSignedNumber } from "@/lib/format";

const DURATION_MS = 900;

export type AnimatedNumberFormat = "currency" | "percent" | "decimal2" | "signedR" | "integer";

function applyFormat(format: AnimatedNumberFormat, n: number) {
  switch (format) {
    case "currency":
      return formatCurrency(n);
    case "percent":
      return `${n.toFixed(0)}%`;
    case "decimal2":
      return n.toFixed(2);
    case "signedR":
      return `${formatSignedNumber(n)}R`;
    case "integer":
      return Math.round(n).toLocaleString();
  }
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animates a number counting up to `value` on mount/change. `format` is a
 * serializable identifier (not a function) so this can be driven from Server
 * Component props — a function prop can't cross the server/client boundary.
 */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: AnimatedNumberFormat;
}) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const duration =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : DURATION_MS;
    const from = displayRef.current;
    startRef.current = null;

    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = duration === 0 ? 1 : Math.min(1, elapsed / duration);
      const next = from + (value - from) * easeOutExpo(t);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    }

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return <>{applyFormat(format, display)}</>;
}

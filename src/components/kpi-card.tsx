import type { LucideIcon } from "lucide-react";
import { AnimatedNumber, type AnimatedNumberFormat } from "@/components/animated-number";

function sentimentFrom(valueClassName?: string): "profit" | "loss" | "neutral" {
  if (!valueClassName) return "neutral";
  if (valueClassName.includes("profit")) return "profit";
  if (valueClassName.includes("loss")) return "loss";
  return "neutral";
}

const ACCENT_CLASS: Record<ReturnType<typeof sentimentFrom>, string> = {
  profit: "before:bg-profit",
  loss: "before:bg-loss",
  neutral: "before:bg-primary/40",
};

const ICON_BADGE_CLASS: Record<ReturnType<typeof sentimentFrom>, string> = {
  profit: "bg-profit-muted text-profit",
  loss: "bg-loss-muted text-loss",
  neutral: "bg-brand-soft text-primary",
};

export function KpiCard({
  label,
  value,
  valueClassName,
  animateValue,
  format,
  icon: Icon,
  delayMs,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  /** When provided (with `format`), the value counts up on mount instead of rendering `value` statically. */
  animateValue?: number;
  format?: AnimatedNumberFormat;
  icon?: LucideIcon;
  /** Stagger this card's entrance animation behind others in the same grid. */
  delayMs?: number;
}) {
  const sentiment = sentimentFrom(valueClassName);

  return (
    <div
      className={`animate-fade-in-up relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200 before:absolute before:inset-x-0 before:top-0 before:h-0.5 hover:shadow-md hover:-translate-y-0.5 ${ACCENT_CLASS[sentiment]}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-md ${ICON_BADGE_CLASS[sentiment]}`}
          >
            <Icon className="size-3.5" strokeWidth={2.25} />
          </span>
        )}
      </div>
      <p
        className={`mt-1.5 font-numeric text-2xl font-bold tracking-tight tabular-nums ${valueClassName ?? ""}`}
      >
        {animateValue != null && format ? (
          <AnimatedNumber value={animateValue} format={format} />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

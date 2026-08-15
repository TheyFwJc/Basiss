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

export function KpiCard({
  label,
  value,
  valueClassName,
  animateValue,
  format,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  /** When provided (with `format`), the value counts up on mount instead of rendering `value` statically. */
  animateValue?: number;
  format?: AnimatedNumberFormat;
}) {
  const sentiment = sentimentFrom(valueClassName);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200 before:absolute before:inset-x-0 before:top-0 before:h-0.5 hover:shadow-md hover:-translate-y-0.5 ${ACCENT_CLASS[sentiment]}`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
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

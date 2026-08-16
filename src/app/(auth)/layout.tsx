import Link from "next/link";
import {
  LineChart,
  BarChart3,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LandingPreview } from "@/app/landing-preview";
import { PLANS } from "@/lib/plans";
import { formatCurrency } from "@/lib/format";

const SIDE_FEATURES = [
  { icon: LineChart, text: "Decimal-safe P&L, R-multiple, and win rate — computed for you" },
  { icon: BarChart3, text: "Deep analytics by symbol, session, time of day, and risk" },
  { icon: ShieldAlert, text: "Daily/weekly loss limits and position sizing" },
  { icon: Sparkles, text: "AI-assisted performance reviews of your own data" },
  { icon: Upload, text: "One-click broker CSV import" },
];

const PRICING_STRIP = [PLANS.FREE, PLANS.PRO, PLANS.PRO_PLUS];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background lg:flex-row">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-32 left-1/4 size-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="animate-drift absolute top-1/2 -right-32 size-96 rounded-full bg-brand-gradient opacity-15 blur-3xl [animation-delay:3s]" />
      </div>

      {/* Marketing panel — stacked above the form on phone/tablet, a fixed
          left half on large screens. Always rendered (never `hidden`) so
          the page never collapses to a bare form at any width. */}
      <div className="relative z-10 flex flex-col justify-center gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:w-1/2 lg:gap-10 lg:px-16 lg:py-0">
        <div>
          <Link
            href="/"
            className="mb-6 flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          >
            <BrandMark className="size-8 text-base" />
            Basis
          </Link>
          <h1 className="max-w-md text-3xl font-bold tracking-tight sm:text-4xl">
            Know exactly <span className="text-brand-gradient">how you trade.</span>
          </h1>
          <p className="mt-3 max-w-sm text-muted-foreground">
            Turn your raw trade history into a clear picture of performance,
            risk, and behavior — so you can see what&apos;s actually working.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {SIDE_FEATURES.map((f) => (
            <li key={f.text} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft">
                <f.icon className="size-3.5 text-primary" />
              </span>
              <span className="text-muted-foreground">{f.text}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Simple pricing</p>
            <Link href="/pricing" className="text-xs text-primary hover:underline">
              See all plans →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {PRICING_STRIP.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-border bg-background/60 p-3 text-center"
              >
                <p className="text-xs text-muted-foreground">{plan.name}</p>
                <p className="font-numeric text-lg font-bold tracking-tight">
                  {plan.monthlyPrice === 0 ? "Free" : formatCurrency(plan.monthlyPrice)}
                </p>
                {plan.monthlyPrice > 0 && (
                  <p className="text-[10px] text-muted-foreground">/mo</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          <LandingPreview />
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center border-t border-border px-4 py-10 lg:border-t-0 lg:border-l lg:py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

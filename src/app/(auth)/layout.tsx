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

const SIDE_FEATURES = [
  { icon: LineChart, text: "Decimal-safe P&L, R-multiple, and win rate — computed for you" },
  { icon: BarChart3, text: "Deep analytics by symbol, session, time of day, and risk" },
  { icon: ShieldAlert, text: "Daily/weekly loss limits and position sizing" },
  { icon: Sparkles, text: "AI-assisted performance reviews of your own data" },
  { icon: Upload, text: "One-click broker CSV import" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-32 left-1/4 size-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="animate-drift absolute top-1/2 -right-32 size-96 rounded-full bg-brand-gradient opacity-15 blur-3xl [animation-delay:3s]" />
      </div>

      <div className="relative z-10 hidden w-1/2 flex-col justify-center gap-10 px-16 lg:flex">
        <div>
          <div className="mb-6 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <BrandMark className="size-8 text-base" />
            Basis
          </div>
          <h1 className="max-w-md text-3xl font-bold tracking-tight">
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

        <LandingPreview />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 text-lg font-semibold tracking-tight lg:hidden"
        >
          <BrandMark className="size-8 text-base" />
          Basis
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

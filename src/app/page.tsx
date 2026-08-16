import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LineChart,
  BarChart3,
  ShieldAlert,
  Sparkles,
  Upload,
  NotebookPen,
  ArrowRight,
  CalendarDays,
  Flag,
  ImagePlus,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { LandingPreview } from "./landing-preview";

const FEATURES = [
  {
    icon: LineChart,
    title: "Decimal-safe P&L engine",
    description:
      "Multi-leg entries and exits, partial fills, R-multiple — computed once, correctly, from your raw executions.",
  },
  {
    icon: BarChart3,
    title: "Analytics that go deep",
    description:
      "Break performance down by symbol, session, time of day, holding time, and risk — then cross-filter all of it at once.",
  },
  {
    icon: ShieldAlert,
    title: "Risk & psychology",
    description:
      "Daily loss limits, position sizing, mistake tracking, and rule-adherence ratings — the discipline side of trading.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted review",
    description:
      "A plain-language performance review grounded only in your own stats — patterns and tendencies, never a market call.",
  },
  {
    icon: Upload,
    title: "Broker CSV import",
    description:
      "Upload a broker export and it maps columns, catches duplicates, and groups fills into trades automatically.",
  },
  {
    icon: NotebookPen,
    title: "Daily journal",
    description:
      "Plan before, review after — one page per trading day, tied to the trades you actually took.",
  },
  {
    icon: CalendarDays,
    title: "Calendar & weekly totals",
    description:
      "A month grid of daily P&L with weekly and monthly totals built in, so you can spot streaks and slumps at a glance.",
  },
  {
    icon: Flag,
    title: "Goals",
    description:
      "Set targets for P&L, win rate, average R, or rule adherence, tracked automatically per day, week, month, or year.",
  },
  {
    icon: ImagePlus,
    title: "Trade screenshots",
    description:
      "Attach chart screenshots to any trade so your setup, entry, and exit are right there next to the numbers.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "Log or import your trades",
    description:
      "Enter a trade in seconds, or upload a broker CSV export — columns map themselves and duplicates are caught automatically.",
  },
  {
    title: "Everything's computed for you",
    description:
      "P&L, R-multiple, win rate, and every breakdown by symbol, session, and time of day are derived automatically — nothing hand-calculated.",
  },
  {
    title: "Review and improve",
    description:
      "Spot patterns in Analytics, get a plain-language AI review of your own stats, and track goals over time.",
  },
];

const FAQS = [
  {
    question: "Is Basis free to use?",
    answer: "Yes — Basis is free to use, no credit card required.",
  },
  {
    question: "Is my trading data private?",
    answer:
      "Yes. Your trades belong to you. AI-assisted reviews only ever see your own aggregated statistics — never your raw trade rows, and never market data.",
  },
  {
    question: "Does Basis give me trading advice or predictions?",
    answer:
      "No. Basis analyzes your own historical performance — it never makes a market call, a prediction, or a guarantee about future results.",
  },
  {
    question: "Can I import my trade history from my broker?",
    answer:
      "Yes — the CSV importer maps common broker export formats, flags likely duplicates before importing, and groups raw fills into trades for you.",
  },
  {
    question: "Does it work with my asset class and broker?",
    answer:
      "Basis supports equities, options, futures, forex, and crypto, across as many trading accounts as you want to track.",
  },
  {
    question: "What if I'm new to trading?",
    answer:
      "Basis works from your very first logged trade — the analytics and breakdowns build up automatically as your history grows.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="animate-drift absolute -top-32 left-1/4 size-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="animate-drift absolute top-1/3 -right-32 size-96 rounded-full bg-brand-gradient opacity-15 blur-3xl [animation-delay:3s]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <BrandMark className="size-8 text-base" />
          Basis
        </div>
        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/login">Log in</Link>}
            nativeButton={false}
            variant="ghost"
            size="sm"
          />
          <Button
            render={<Link href="/signup">Sign up</Link>}
            nativeButton={false}
            size="sm"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 pt-12 pb-24 sm:pt-20">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="animate-fade-in-up mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Now with AI-assisted performance reviews
            </div>
            <h1 className="animate-fade-in-up delay-100 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
              Know exactly{" "}
              <span className="text-brand-gradient">how you trade.</span>
            </h1>
            <p className="animate-fade-in-up delay-200 mt-5 max-w-lg text-balance text-muted-foreground sm:text-lg">
              Basis turns your raw trade history into a clear picture of
              performance, risk, and behavior — so you can see what&apos;s
              actually working.
            </p>
            <div className="animate-fade-in-up delay-300 mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                render={
                  <Link href="/signup">
                    Start journaling — it&apos;s free
                    <ArrowRight className="size-4" />
                  </Link>
                }
                nativeButton={false}
                size="lg"
                className="border-glow"
              />
              <Button
                render={<Link href="/login">Log in</Link>}
                nativeButton={false}
                variant="outline"
                size="lg"
              />
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <LandingPreview />
          </div>
        </div>

        <div className="mt-28 w-full">
          <h2 className="animate-fade-in-up text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="animate-fade-in-up flex flex-col items-center text-center sm:items-start sm:text-left" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mb-4 flex size-9 items-center justify-center rounded-full bg-brand-gradient font-numeric text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-28 w-full">
          <h2 className="animate-fade-in-up text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Everything a serious trading practice needs
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="animate-fade-in-up group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-soft transition-transform duration-200 group-hover:scale-110">
                  <feature.icon className="size-5 text-primary" strokeWidth={2} />
                </div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-28 w-full max-w-2xl">
          <h2 className="animate-fade-in-up text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
          <Accordion className="animate-fade-in-up mt-10 rounded-xl border border-border bg-card px-5 shadow-sm">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="animate-fade-in-up relative mt-28 w-full overflow-hidden rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
          <div
            aria-hidden
            className="animate-gradient-pan absolute inset-0 bg-brand-gradient opacity-[0.08]"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Start seeing your trading clearly.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Free to use. No credit card required.
            </p>
            <Button
              render={
                <Link href="/signup">
                  Create your account
                  <ArrowRight className="size-4" />
                </Link>
              }
              nativeButton={false}
              size="lg"
              className="border-glow mt-6"
            />
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-muted-foreground">
        Basis is a journaling and analytics tool. It does not provide
        personalized investment advice and does not guarantee trading
        results.
      </footer>
    </div>
  );
}

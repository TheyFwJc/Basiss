import Link from "next/link";
import {
  ListChecks,
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Target,
  ShieldAlert,
  Flag,
  Upload,
  ImagePlus,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpAssistant } from "./help-assistant";

type Section = {
  id: string;
  title: string;
  icon: LucideIcon;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    title: "Getting started",
    icon: Wallet,
    body: (
      <>
        <p>
          Add a <Link href="/accounts" className="underline">trading account</Link> first
          — every trade belongs to one. Then log your first trade from{" "}
          <Link href="/trades/new" className="underline">Add trade</Link>, or bring in
          existing history with the <Link href="/import" className="underline">CSV
          importer</Link>.
        </p>
        <p>
          Want to look around before entering real trades? Log in with the demo
          account (<code>demo@basisapp.dev</code>) to see a populated dashboard.
        </p>
      </>
    ),
  },
  {
    id: "trades",
    title: "Trades & the P&L engine",
    icon: ListChecks,
    body: (
      <>
        <p>
          A trade is built from its <strong>fills</strong> — Entries and Exits — not a
          single entry/exit price pair. Add one fill per partial entry or exit; the
          form starts you with one of each, since most trades you log are already
          closed. Delete the exit fill if you&apos;re still in the position.
        </p>
        <p>
          Average price, realized P&L, and R-multiple are all derived from those fills
          using decimal-safe math, so partial fills and scaling in/out are always
          accurate — nothing is hand-entered or estimated.
        </p>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    body: (
      <>
        <p>
          Your KPI row (P&L, win rate, profit factor, expectancy, avg win/loss, avg R,
          max drawdown) and equity curve are computed from every trade on your
          accounts. Best/worst trade cards link straight to that trade.
        </p>
        <p>
          Each account shows its <strong>current balance</strong> — starting balance
          plus realized P&L from closed trades — not just what you set it up with.
          See the Accounts section below for more on how that&apos;s calculated.
        </p>
      </>
    ),
  },
  {
    id: "calendar",
    title: "Calendar",
    icon: CalendarDays,
    body: (
      <p>
        A month grid of daily P&L, trade count, and win rate, with a monthly total
        next to the month name. Click any day with trades to see that day&apos;s list.
      </p>
    ),
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    body: (
      <p>
        Combinable filters (symbol, direction, strategy, session, day of week,
        mistake) apply across every breakdown at once — by symbol, session, time of
        day, holding time, risk, mistake cost, and a psychology-rating correlation,
        plus a day-of-week × session P&L heatmap.
      </p>
    ),
  },
  {
    id: "tagging",
    title: "Strategies, Playbooks, Mistakes & Checklists",
    icon: Target,
    body: (
      <p>
        Tag trades with a <Link href="/strategies" className="underline">Strategy</Link>{" "}
        and/or <Link href="/playbooks" className="underline">Playbook</Link> to track
        performance per setup. Track recurring{" "}
        <Link href="/mistakes" className="underline">Mistakes</Link> to see what
        they&apos;re costing you, and build reusable{" "}
        <Link href="/checklists" className="underline">Checklists</Link> (optionally
        tied to a Playbook) to check off before/during a trade.
      </p>
    ),
  },
  {
    id: "risk",
    title: "Risk Management",
    icon: ShieldAlert,
    body: (
      <p>
        Set a default risk-per-trade and daily/weekly loss limits in{" "}
        <Link href="/risk" className="underline">Risk Management</Link>, see live
        usage against today&apos;s and this week&apos;s realized P&L, and use the
        position-size calculator to size a trade against your account balance and
        stop distance.
      </p>
    ),
  },
  {
    id: "goals",
    title: "Goals",
    icon: Flag,
    body: (
      <p>
        Set a target for P&L, trade count, win rate, average R, rule adherence, or a
        max daily loss, tracked per day/week/month/year against your actual trades —
        no manual updating.
      </p>
    ),
  },
  {
    id: "import",
    title: "Import & export",
    icon: Upload,
    body: (
      <>
        <p>
          Upload a broker CSV export on the <Link href="/import" className="underline">
          Import</Link> page. Columns with recognizable names (Symbol, Qty, Price,
          Time, etc.) map themselves automatically — you can always adjust any
          mapping before reviewing. Likely duplicate fills are flagged and excluded
          by default; fills are grouped into trades using FIFO position tracking.
        </p>
        <p>
          Export everything back out anytime as CSV or JSON from the Trades page.
        </p>
        <p>
          Trading on TradingView paper trading? Export your trade history to CSV
          (from the Trade History table&apos;s menu) and import it the same way —
          just type <code>TradingView</code> as the broker so the mapping gets
          saved and reused next time.
        </p>
      </>
    ),
  },
  {
    id: "screenshots",
    title: "Screenshots",
    icon: ImagePlus,
    body: (
      <p>
        Attach chart screenshots to a trade from its detail page. This needs a
        storage connection (Vercel Blob) set up on the server — if you see a
        &quot;storage isn&apos;t configured&quot; message, that step hasn&apos;t been
        done yet.
      </p>
    ),
  },
  {
    id: "insights",
    title: "AI Insights",
    icon: Sparkles,
    body: (
      <p>
        <Link href="/insights" className="underline">Insights</Link> asks AI to
        write a plain-language performance review from your own aggregated stats —
        never a market call or a guarantee, and never raw trade rows or market data.
        Requires a <code>GEMINI_API_KEY</code> on the server and at least 10
        closed trades.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Accounts & balances",
    icon: Wallet,
    body: (
      <>
        <p>
          <strong>Starting balance</strong> is what you set when you created the
          account — it never changes on its own.{" "}
          <strong>Current balance</strong> is starting balance plus realized net P&L
          from that account&apos;s closed trades, and updates automatically as you
          log trades.
        </p>
        <p>
          This doesn&apos;t yet account for deposits or withdrawals made outside of
          trading — if you add cash to an account, the current balance won&apos;t
          reflect that until deposit/withdrawal tracking is added.
        </p>
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help & FAQ"
        description="What each part of Basis does, and how the numbers are calculated."
      />

      <div className="mb-6">
        <HelpAssistant />
      </div>

      <nav
        aria-label="Section links"
        className="mb-6 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <Card key={section.id} id={section.id} className="scroll-mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <section.icon className="size-4 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground [&_a]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_strong]:text-foreground">
              {section.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

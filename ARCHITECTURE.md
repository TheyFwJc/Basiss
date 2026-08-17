# Architecture

## UI kit: shadcn/ui on Base UI, not Radix

This project's shadcn/ui was scaffolded on **Base UI** (`@base-ui/react`)
instead of the Radix primitives shadcn traditionally uses. Two conventions
differ from what you'd expect from Radix-based shadcn code (or from training
data, which mostly predates this):

- **Polymorphic rendering uses `render`, not `asChild`.** Composing a custom
  element into a primitive is `<Trigger render={<Button/>} />`, not
  `<Trigger asChild><Button/></Trigger>`. Set `nativeButton={false}` on
  `Dialog`/`AlertDialog`/`Menu` triggers whenever the `render` target isn't a
  real `<button>`.
- **`Menu.Item` takes `onClick`, not `onSelect`.** Radix's `onSelect` is a
  no-op here — it silently does nothing, which is easy to miss since nothing
  errors.
- **A controlled `Select` needs an `items` prop to display a label.**
  `<Select value={id} onValueChange={...}>` without `items` renders the raw
  `value` in the trigger (e.g. a database ID, or `"EQUITY"` instead of
  "Equity") instead of the matching `SelectItem`'s children — again, no error,
  just a wrong-looking trigger. Pass `items={{ [value]: label, ... }}` (a
  `Record<string, ReactNode>`) to `Select` for every select whose value isn't
  already human-readable, including selects driven by `defaultValue` — this
  slipped past in Phase 1's account form until it was caught in Phase 2.

**Never nest one Base UI primitive inside another's `render` prop** — e.g.
`<DialogTrigger render={<Button/>} />` where `Button` itself wraps
`@base-ui/react/button`. Both primitives try to own `data-slot` and other
attributes on the same DOM node, and the merge is non-deterministic between
the server and client render passes: it silently produces a hydration
mismatch, and the affected trigger stops responding to clicks (the failure
mode is "nothing happens on click," not a visible error) until you notice the
hydration warning in the console. `src/components/ui/menu-item-trigger.tsx`
(`MenuItemTrigger`) is a plain, non-primitive stand-in for `DropdownMenuItem`
built for exactly this case — use it (or a plain styled `<button>`) whenever a
dropdown item, or any other trigger, itself needs to open a nested
Dialog/AlertDialog. This bit Edit/Delete on the accounts page and the "Add
account" and row-action buttons before being tracked down; watch for it in
every dropdown-triggered dialog in later phases.

## Overview

Basis is a Next.js App Router application. Server Components read data directly
from the database via Prisma; mutations go through Server Actions. There is no
separate API layer for the web app itself — Next.js server functions are the
backend. This keeps the "backend" colocated with the routes that use it, which
matters for a feature set this wide (12+ major sections) without turning into a
sprawl of hand-rolled REST endpoints.

## Route structure

```
src/app/
  (auth)/          Public: login, signup, password reset. Centered card layout.
  (app)/           Protected: everything behind the sidebar shell.
    dashboard/
    trades/        accounts/  strategies/  playbooks/  ...
  api/auth/[...nextauth]/   Auth.js request handler
  page.tsx         Landing page (redirects to /dashboard if already signed in)
```

Route groups `(auth)` and `(app)` don't affect URLs — they exist to give each
half of the app its own layout (`(app)/layout.tsx` renders the sidebar shell and
enforces there's a session; `(auth)/layout.tsx` renders a centered card).

## Authentication

Auth.js v5 (`next-auth@beta`) with the **Credentials provider** and **JWT
sessions** — deliberately *not* database sessions, and deliberately *not* the
Prisma adapter:

- The `PrismaAdapter` + `Credentials` combination has known rough edges in
  Auth.js (database sessions aren't officially supported with credentials
  auth), so `src/auth.ts` implements `authorize()` by hand: look up the user by
  email, verify the password with `bcryptjs`, return the minimal user object.
- Splitting `src/auth.config.ts` (edge-safe: no Prisma, no bcrypt) from
  `src/auth.ts` (Node-only: the real `authorize` implementation) is required
  because `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) runs on
  the Edge runtime and can't bundle Prisma's query engine or bcrypt.
- Route protection is a single `authorized()` callback in `auth.config.ts`: an
  allow-list of public path prefixes (`/`, `/login`, `/signup`,
  `/reset-password`), everything else requires a session.

Adding an OAuth provider later means adding it to `src/auth.ts`'s `providers`
array and (if you want database-backed sessions/account linking at that point)
introducing the `Account`/`Session`/`VerificationToken` Prisma models Auth.js
expects — deliberately not created now since nothing uses them yet.

Password reset does not send real email yet (no transactional email provider
is configured). `requestPasswordResetAction` generates a token, stores its
SHA-256 hash in `PasswordResetToken`, and returns the reset URL directly to the
UI with a visible "development mode" notice. Swap this for a real provider
(Resend, Postmark, SES) before any real user relies on it — the token
generation/validation logic doesn't change, only how the link is delivered.

## Database

PostgreSQL via Prisma ORM 7, using the `prisma-client` generator (Prisma 7's
newer, driver-adapter-based client — not the legacy `prisma-client-js`).
Prisma 7 requires an explicit driver adapter; this project uses
`@prisma/adapter-pg` (node-postgres) in `src/lib/db.ts`. This is unrelated to
which Postgres host you use (Neon, Supabase, RDS, local) — the adapter talks
`pg`'s wire protocol either way.

`prisma/schema.prisma` models the full domain (see section below), not just
what Phase 1 uses. Reasoning: multi-leg trade execution and the P&L engine
(Phase 2) depend on `Trade`/`Execution` being modeled correctly from day one,
and getting the relational shape right up front is far cheaper than migrating
it later. Phase 1 only *builds UI and logic* for `User`, `UserSettings`,
`TradingAccount`, and `PasswordResetToken` — the rest of the schema exists so
later phases have a stable foundation, not because the features are built yet.

Money fields use `Decimal(20, 8)` (via Prisma's `Decimal` type, backed by
Postgres `numeric`), not `Float`/`Int` cents — see "Financial calculations"
below.

Every table scoped to a user carries `userId` with an index, and ownership is
enforced in the query itself (`where: { id, userId }` on every read/update/
delete), never assumed from a client-supplied ID.

## Financial calculation engine

`src/lib/pnl.ts` is the single place P&L, average price, risk, and R-multiple
are computed — no UI component or Server Action does this math independently.

- All monetary math uses `decimal.js`, from the raw execution inputs through
  to the final result. Nothing passes through a JS `number` in between, so
  float error can't accumulate across partial fills — the same reason the
  schema uses `Decimal` columns instead of `Float`.
- A `Trade` is a rollup of its `Execution` rows, not a hand-entered pair of
  entry/exit prices. `computeTradePnl(direction, executions)` separates
  executions into the entry side (BUY for LONG, SELL for SHORT) and the exit
  side, and derives average entry/exit price, closed quantity, and status
  (`OPEN` while `closedQuantity < quantity`, `CLOSED` once fully exited) from
  that split. Adding/editing a trade always replaces its executions and
  recomputes from scratch (`createTradeAction`/`updateTradeAction` in
  `src/app/(app)/trades/actions.ts`) rather than patching stored fields.
- Gross P&L: `(exit − avgEntry) × closedQty` for longs, `(avgEntry − exit) ×
  closedQty` for shorts — on the closed portion only, so a partially-exited
  trade reports real realized P&L on what's closed and `null` for the rest.
  Net P&L subtracts total fees and commission. `computeRiskAmount` derives
  dollar risk from the stop distance; `computeRMultiple` expresses net P&L as
  a multiple of that risk. All of it is covered by `src/lib/pnl.test.ts`
  (long/short, wins/losses, breakeven, multiple entries/exits, partial exits,
  fees/commission).
- Results are stored on `Trade` (denormalized) so dashboard/table queries
  don't replay every execution on every page load, but they're always
  *derived*, never edited independently of the executions that produced them.

## Performance metrics engine

`src/lib/metrics.ts` sits one layer above `pnl.ts`: it takes a list of
already-computed trades (their stored `netPnl`/`rMultiple`, not raw
executions) and derives dashboard/analytics-level statistics — win rate,
profit factor, expectancy, average win/loss, R stats, win/loss streaks, an
equity curve, and max drawdown. Same rule as the P&L engine: one place per
formula, documented inline, covered by `src/lib/metrics.test.ts`.

Two things worth knowing if you're extending this:
- The equity curve (`buildEquityCurve`) is realized P&L layered on top of
  account starting balance — it does **not** yet account for deposits or
  withdrawals, since `EquitySnapshot` isn't populated by anything yet. Don't
  read the dashboard equity curve as "actual account balance over time" until
  that lands.
- Dashboard/Analytics currently combine all of a user's trading accounts
  together, which silently assumes they share a currency. Fine for the demo
  data and for most single-currency users; will need an explicit
  per-account or currency-aware view before it's correct for someone mixing
  a USD and EUR account.

## Demo data

`prisma/seed.ts` (`npm run db:seed`) creates/resets one dedicated account —
`demo@basisapp.dev` — with a trading account and ~18 realistic trades spread
across symbols, strategies, sessions, and days, so Dashboard/Calendar/
Analytics have something to render. It only ever touches that one email; it
never runs against or mixes with a real user's data.

## File storage

Trade screenshots (`Screenshot.url`, a plain string field so the backend can
be swapped without a schema change): `src/lib/storage.ts` writes to local disk
under `public/uploads/screenshots/<userId>/` (served by Next directly at
`/uploads/screenshots/...`) when `BLOB_READ_WRITE_TOKEN` isn't set, and to
Vercel Blob (`@vercel/blob`) when it is — local disk covers dev and
single-server deploys for free; Blob is for serverless hosting where the
filesystem isn't persistent. `src/app/(app)/trades/[id]/screenshot-actions.ts`
enforces ownership (the trade must belong to the requesting user) and the
`SCREENSHOTS` Pro feature gate before every upload/delete. Attach screenshots
either while logging/editing a trade (`trade-form.tsx`) or from its detail
page (`screenshot-gallery.tsx`) — same actions either way.

## Import system (Phase 5)

A CSV import wizard at `/import`, built around a three-stage engine in
`src/lib/import.ts` (map+validate, duplicate detection, FIFO trade grouping)
kept deliberately free of Node-only dependencies — `csv-parse` lives in the
separate `src/lib/import-parse.ts` — so the same pure functions run
server-side (commit) and client-side (instant mapping/preview recompute as
the user adjusts column choices, no round trip per keystroke).

- **Upload**: the user picks a trading account, broker name, default asset
  class, and a CSV file. A Server Action (`startImportAction`) parses the
  file, opens an `ImportJob` (PENDING → MAPPING), and looks up any
  `ImportMapping` already saved for that broker.
- **Mapping**: the user maps required fields (symbol, side, quantity, price,
  execution time) and optional ones (fees, commission, asset class) to CSV
  columns. `applyMapping` validates every row independently — one bad row
  never sinks the file.
- **Duplicate detection**: `markDuplicates` compares each row against the
  account's existing executions (symbol, side, quantity, price, timestamp)
  — fetched once via `fetchExistingExecutionKeysAction` — and flags matches.
  Duplicates are excluded by default; the diff step lets the user opt back
  in row-by-row, never silently deduped or silently duplicated.
- **Grouping**: `groupExecutionsIntoTrades` walks each symbol's fills
  chronologically, tracking an open FIFO position. Same-side fills scale it;
  opposite-side fills reduce it; a reducing fill larger than the open
  quantity closes the trade and flips into a new one, splitting that one CSV
  row's fees/commission proportionally across both trades.
- **Commit**: `commitImportAction` re-derives trade groups server-side from
  the confirmed rows (never trusting client-computed groups directly),
  writes `Trade`/`Execution` rows in a transaction, upserts the
  `ImportMapping` for next time, and moves the `ImportJob` to
  COMPLETED/FAILED with counts.

## Export

`GET /api/export/trades?format=csv|json` streams the current user's trades.
JSON keeps full execution-level detail (for backup/re-import fidelity); CSV
is one row per trade (spreadsheet-friendly, no nested data) via
`buildTradesCsv` in `src/lib/export.ts`.

## Advanced analytics (Phase 6)

`src/lib/analytics.ts` centralizes everything the Analytics page (`/analytics`)
does, in the same "one place per formula, tested" style as pnl.ts/metrics.ts:

- **Combinable filters**: `filterTrades` ANDs together whatever subset of
  symbol/direction/strategy/session/day-of-week/mistake the user has picked
  — a real filter (narrows every breakdown at once), not a set of mutually
  exclusive tabs. `analytics-filters.tsx` drives these through URL search
  params, mirroring `trade-filters.tsx`'s pattern on `/trades`.
- **`groupByDimension`** is the shared aggregator (Decimal-safe net P&L and
  average R) that every breakdown — including the pre-existing symbol/
  direction/strategy/session/day-of-week ones — is built from.
- **Time-of-day** (`groupByHourOfDay`) buckets by the entry execution's local
  hour; **holding-time** (`groupByHoldingTime`) buckets closed trades by
  duration (open trades have no holding time and are excluded, not
  zero-bucketed); **risk** (`groupByRisk`) buckets by `riskPercent` (trades
  with no stop loss, and therefore no risk percent, are excluded).
- **Mistake cost** (`computeMistakeCost`) sums net P&L per `Mistake`, worst
  first — a trade tagged with two mistakes attributes its full P&L to both,
  since either one being absent might have changed the outcome.
- **Psychology correlation** (`groupByRating`) buckets by each 1-5 rating
  (confidence, execution quality, rule adherence) and always returns all
  five buckets zero-filled, so the table's rows are stable even with sparse
  ratings data.
- **Heatmap**: `buildDayVsSessionHeatmap` aggregates net P&L per (day of
  week, session) into sparse cells; the page fills in the full 7×6 grid and
  shades each cell's profit/loss color by relative magnitude via CSS
  `color-mix()` against the `--color-profit`/`--color-loss` theme tokens, so
  it stays correct in both themes without hand-picking colors.

## AI-assisted analysis (Phase 8)

`/insights` sends an AI model a written performance review request, built
entirely from the user's own already-computed statistics — never raw trade
rows, never market data. Uses Google's Gemini API (`gemini-2.5-flash`, via
the `@google/genai` SDK) rather than a paid provider, specifically because
it has a genuine free tier — deliberate, since this is a small-scale feature
that shouldn't require the app owner to pay per user just to let people try
it. Revisit if usage outgrows Gemini's free-tier rate limits. Two pieces:

- **`src/lib/ai/build-summary.ts`** (`buildTradingSummary`) assembles a
  compact JSON payload by calling the *existing* `metrics.ts`/`analytics.ts`/
  `goals.ts` engines — overall win rate/profit factor/expectancy/drawdown,
  streaks, top/bottom symbols, every breakdown dimension from Phase 6 (top
  N), mistake costs, psychology-rating buckets, and goal progress. Nothing
  here is a new formula; it's the same numbers the Analytics/Goals pages
  already show, repackaged for an LLM instead of a table. Pure and unit
  tested, no DB or network access.
- **`src/app/(app)/insights/actions.ts`** (`generateInsightsAction`) fetches
  the user's closed trades/goals/accounts, builds the summary, and calls
  Gemini with a system prompt that hard-bans market predictions,
  trading/financial advice, and guaranteed-outcome language, and requires
  every claim to trace back to a number in the JSON payload. Requires
  `GEMINI_API_KEY` in the environment — without it, the action returns a
  plain "not configured" message rather than failing; below
  `MIN_TRADES_FOR_INSIGHTS` (10) closed trades it declines with a
  not-enough-data message instead of calling the API at all.

## Subscriptions & billing

Free/Pro/Pro+ plans, gating, and Stripe integration. See README.md's
"Subscriptions & billing" section for the operator-facing setup steps
(Stripe Dashboard objects, env vars, webhook config, test-mode testing).

- **`src/lib/plans.ts`** is the single source of truth for plan definitions
  (pricing, feature list, `FREE_TRADE_LIMIT`) and pure plan-comparison logic
  (`hasPlan`, `hasFeature`, `getEffectivePlan`) — DB-free and unit tested, so
  it's cheap to reason about and safe to import from client code (e.g. the
  pricing page) as well as server code.
- **`getEffectivePlan`** is the one place cancellation grace periods are
  handled: a `CANCELED` subscription still grants its plan until
  `currentPeriodEnd` passes, matching Stripe's own "cancels at period end"
  behavior rather than revoking access the moment cancellation is requested.
  `PAST_DUE` also still grants access — Stripe is still retrying the charge;
  access is only pulled once Stripe itself moves the subscription to
  `canceled` or `unpaid`.
- **`src/lib/subscription.ts`** is the DB-touching layer built on top of
  `plans.ts` — `getSubscription`, `canUseFeature`, `requireFeature`, and
  `canAddTrade` (the Free-plan monthly trade cap, counted by `createdAt` so
  imported/backdated trades count the same as trades entered live). Every
  page and Server Action that gates a feature calls into this file — nothing
  re-derives plan access ad hoc.
- **`src/lib/stripe.ts`** wraps the Stripe SDK: a cached client, and
  `resolvePriceId`/`planFromPriceId` as the *only* place a (plan, interval)
  pair maps to/from an actual Stripe Price ID (read from environment
  variables). The client is never asked to choose or trust a price.
- **`src/app/(app)/pricing/actions.ts`** — `createCheckoutSessionAction`
  (new subscribers), `changePlanAction` (in-place plan/interval switches for
  existing subscribers, via `stripe.subscriptions.update` on the existing
  subscription — deliberately *not* a second Checkout session, which would
  create a second concurrent subscription), and
  `createPortalSessionAction` (Stripe's hosted Billing Portal handles
  payment method updates, invoices, and cancellation — no custom card UI).
- **`src/app/api/stripe/webhook/route.ts`** is the only place subscription
  state is written from Stripe into the database — the database is the
  source of truth for feature access everywhere else, never a client-supplied
  plan or the checkout return URL. Idempotent via the `StripeWebhookEvent`
  table (keyed by Stripe's event ID): an event is recorded as processed only
  *after* it's successfully handled, so a redelivered event either no-ops
  (already recorded) or safely reprocesses (if the first attempt failed
  before recording). `checkout.session.completed`,
  `customer.subscription.created/updated` all funnel through one
  `syncSubscription` function that reads the subscription's current price
  and status and upserts it onto whichever user matches the Stripe customer
  ID (falling back to `metadata.userId` stashed at checkout time).
- This route is also the one exception carved into the auth proxy's
  `PUBLIC_PATHS` (`src/auth.config.ts`) — Stripe calls it with no user
  session, authenticating via signature instead; the same class of bug that
  briefly broke the generated favicon route (see git history) would break
  this endpoint entirely if it required a session.
- **Gating pattern**: pages that gate a whole feature (Analytics, Insights,
  Screenshots' upload control) check `canUseFeature`/`requireFeature` both
  in the page (so the UI shows `UpgradePrompt`/`LockedKpiCard` instead of the
  real content) *and* in the underlying Server Action (so the feature can't
  be reached by calling the action directly, bypassing the page). The
  Dashboard KPI grid and Calendar's weekly/monthly totals use the same
  pattern at a per-widget level via `LockedKpiCard`.

## Build phases

1. **Foundation** *(done)* — auth, database, trading accounts, nav, design
   system, dashboard shell.
2. **Trading journal** *(done)* — trade entry/edit/delete, multi-leg
   executions, the P&L engine, R-multiple, notes, strategies, playbooks are
   done. Mistake tagging moved to Phase 4 alongside the rest of the
   psychology/risk work. Screenshots remain deferred — they need a storage
   backend decision (see below).
3. **Analytics** *(done)* — dashboard KPI grid (P&L, win rate, profit factor,
   expectancy, avg win/loss, avg R, max drawdown), equity curve and daily P&L
   charts, streaks, best/worst setups; a calendar with daily P&L and a
   click-through day view; breakdowns by symbol, direction, strategy,
   session, and day of week. Time-of-day, holding-time, and risk breakdowns,
   plus combinable cross-filters, shipped in Phase 6 (see below).
4. **Psychology + risk** *(done)* — emotion tracking shipped with the trade
   form in Phase 2; this phase adds mistake tracking (`Mistake`/`TradeMistake`,
   tagged on the trade form, shown on the trade detail page), reusable
   checklists (`Checklist`/`ChecklistItem`/`TradeChecklistItem`, optionally
   tied to a Playbook, checked off per trade), a daily journal
   (`JournalEntry`, one page per calendar date under `/journal/[date]`), a
   risk dashboard and position-size calculator (`/risk`, backed by
   `UserSettings`' risk fields), and process goals (`Goal`, progress computed
   in `src/lib/goals.ts` against real trades per day/week/month/year).
5. **Import/export** *(done)* — CSV import wizard (`/import`) with per-broker
   column mapping, duplicate detection, and FIFO trade grouping (see "Import
   system" above); CSV/JSON trade export at `/api/export/trades`.
6. **Advanced analytics** *(done)* — combinable filters (symbol, direction,
   strategy, session, day of week, mistake), a day-of-week × session
   heatmap, time-of-day and holding-time breakdowns, a risk-percent
   breakdown, mistake cost, and psychology correlation (confidence,
   execution quality, rule adherence) — see "Advanced analytics" above.
7. **Charts, replay, backtesting infrastructure** *(deferred)* — needs a
   historical market-data source (OHLC candles) this app has no integration
   for yet: no schema model, no provider account, no API key. Explicitly
   skipped for now pending a decision on a market-data provider; revisit once
   one is chosen.
8. **AI-assisted analysis** *(done)* — of the user's own trade data (no market
   predictions, no guaranteed-outcome language). See "AI-assisted analysis"
   below.

Each phase is expected to ship with working code and tests, not partial or
placeholder functionality — the placeholders currently in the sidebar exist
specifically so nothing pretends to be finished before it is.

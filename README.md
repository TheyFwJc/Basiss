# Basis

Basis is a trading journal for tracking performance, risk, and psychology across
every account and instrument you trade. It's built as a serious, production-shaped
foundation — not a demo — designed to grow feature-by-feature into a full trading
analytics platform.

This is an original product: no TradeZella (or any other vendor's) branding, code,
copy, or UI has been copied. Where existing trading-journal products informed the
feature set, only the general category of functionality was used as a reference.

## Current status

**Phases 1–6 and 8 are done** (Foundation, Trading journal, Analytics, Psychology + risk, Import/export, Advanced analytics, AI-assisted analysis) — Phase 7 (charts/replay/backtesting) is explicitly deferred pending a market-data source decision:

- Authentication (email + password, sessions, protected routes, password reset)
- Multi-account support (add/edit/delete trading accounts)
- App shell (responsive sidebar navigation, dark/light theme)
- Trade entry with multi-leg executions (partial fills, scaling in/out),
  a centralized decimal-safe P&L engine (gross/net P&L, R-multiple, risk),
  a filterable/sortable trades table, and a trade detail page with a review
  section
- Strategies and Playbooks (create/edit/delete, tag trades with them)
- Dashboard: full KPI grid (P&L, win rate, profit factor, expectancy,
  avg win/loss, avg R, max drawdown), equity curve and daily P&L charts,
  recent trades, best/worst setups, win/loss streaks
- Calendar: month grid with daily P&L, trade count, and win rate; click a
  day to see that day's trades
- Analytics: combinable filters (symbol, direction, strategy, session, day
  of week, mistake) applied across breakdowns by symbol, direction,
  strategy, session, day of week, time of day, holding time, and risk per
  trade, plus mistake cost, psychology correlation (confidence, execution
  quality, rule adherence), and a day-of-week × session P&L heatmap
- Mistake tracking (create/edit/delete, tag trades with them, see counts
  per mistake) and reusable Checklists (optionally tied to a Playbook,
  checked off per trade)
- Daily Journal: a plan-before/review-after entry per calendar day
- Risk Management: default risk-per-trade and daily/weekly loss-limit
  settings, live usage against today's/this week's realized P&L, and a
  position-size calculator
- Goals: targets for P&L, trade count, win rate, average R, rule adherence,
  or a max daily loss, tracked per day/week/month/year against actual trades
- Import: a CSV import wizard (`/import`) with per-broker column-mapping
  memory, duplicate detection (skip/import-anyway), and automatic FIFO
  trade grouping from raw broker fills — plus CSV/JSON trade export
  (`/api/export/trades`)
- Insights: `/insights` asks AI (Google Gemini, free tier) to review your
  own aggregated trading statistics and write a plain-language performance
  review — patterns, tendencies, what's costing you — grounded only in your
  data, never a market call or a guarantee. Requires a `GEMINI_API_KEY` (see
  below); the rest of the app works fully without one.
- Settings (profile, timezone, base currency)
- Subscriptions & billing: Free/Pro/Pro+ plans via Lemon Squeezy — pricing
  page (`/pricing`) with monthly/yearly toggle, hosted Checkout, a billing
  portal for managing/canceling, and centralized feature gating (trade
  screenshots, advanced analytics, advanced dashboard stats, AI Insights
  are Pro/Pro+; Free is capped at a configurable number of trades/month).
  Lemon Squeezy is a merchant of record, so sales tax/VAT is handled
  automatically. See "Subscriptions & billing" below for setup — the app
  runs fine without Lemon Squeezy configured, every paid feature just
  stays locked.
- A demo data seed script (`npm run db:seed`) creates a `demo@basisapp.dev`
  account with realistic sample trades, kept fully separate from real user
  accounts

Not yet built: charts/replay/backtesting infrastructure (Phase 7, deferred
pending a market-data provider decision) — see [ARCHITECTURE.md](./ARCHITECTURE.md)
for the full phase plan.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (Base UI primitives)
- **Database:** PostgreSQL via Prisma ORM 7 (driver adapters, `@prisma/adapter-pg`)
- **Auth:** Auth.js (NextAuth v5) — credentials provider, JWT sessions
- **Validation:** Zod
- **Forms:** React Hook Form (introduced as forms grow more complex in later phases)
- **Testing:** Vitest + Testing Library (unit), Playwright (e2e)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` guidance into `.env` (a starter `.env` already exists locally)
and fill in:

- `DATABASE_URL` — a PostgreSQL connection string (e.g. from
  [Neon](https://neon.tech) or [Supabase](https://supabase.com)). Include
  `?sslmode=require` for hosted Postgres.
- `AUTH_SECRET` — a random secret used to sign session tokens. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- `AUTH_URL` — the base URL of the app (`http://localhost:3000` in development).
- `GEMINI_API_KEY` — optional. Powers the AI-assisted analysis on
  `/insights` (free tier, get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
  Everything else in the app works without it.
- `RESEND_API_KEY` / `EMAIL_FROM` — optional in development (password reset
  falls back to showing the link directly in the UI), but required in
  production for password reset emails to actually send — get a key at
  [resend.com/api-keys](https://resend.com/api-keys).

### 3. Set up the database

```bash
npm run db:migrate
```

This applies the Prisma schema (`prisma/schema.prisma`) to your database and
generates the Prisma Client.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000), sign up for an account, and
add a trading account to see the dashboard populate.

## Development commands

| Command                | Purpose                                      |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start the dev server                          |
| `npm run build`         | Production build                              |
| `npm run start`         | Run the production build                      |
| `npm run lint`          | ESLint                                        |
| `npm run typecheck`     | `tsc --noEmit`                                |
| `npm run test`          | Unit tests (Vitest)                           |
| `npm run test:watch`    | Unit tests in watch mode                      |
| `npm run test:e2e`      | End-to-end tests (Playwright)                 |
| `npm run db:migrate`    | Create/apply a migration in development       |
| `npm run db:deploy`     | Apply migrations in production                |
| `npm run db:studio`     | Open Prisma Studio                            |
| `npm run db:seed`       | Seed `demo@basisapp.dev` with sample trades   |

## Production deployment

1. Provision a PostgreSQL database (Neon, Supabase, RDS, etc.) and set
   `DATABASE_URL` in your hosting provider's environment variables.
2. Set `AUTH_SECRET` (a strong random value, different from development) and
   `AUTH_URL` (your production URL).
3. Run `npm run db:deploy` as part of your deploy pipeline to apply migrations.
4. `npm run build && npm run start`, or deploy to a platform that runs these for
   you (Vercel, Railway, Fly.io, etc.).

Password reset email is wired up via Resend — set `RESEND_API_KEY` (see
above) before real users rely on it. Broker/market-data integrations are not
yet wired up — see [ARCHITECTURE.md](./ARCHITECTURE.md) for what's deferred
to later phases and why.

## Subscriptions & billing

Free/Pro/Pro+ plans are wired up via [Lemon Squeezy](https://www.lemonsqueezy.com/),
but **this is not production-ready out of the box** — it needs a real store,
products, and API keys before checkout or the webhook will work. Until you
set these up, `/pricing` and `/billing` show a "billing isn't configured yet"
message rather than failing, and every user is simply on the Free plan.

Lemon Squeezy is a **merchant of record** — it collects and remits sales tax
and VAT on your behalf in every jurisdiction, so unlike a raw payment
processor there's no separate tax registration step to do here.

### 1. Create a store and products

1. Sign up at [lemonsqueezy.com](https://www.lemonsqueezy.com/) and create a
   **Store**. Note its **Store ID** (Settings → General).
2. Create one **Product** per plan (Pro, Pro+), each with two **Variants**
   (a Lemon Squeezy "Variant" is the equivalent of a Stripe "Price" — a
   specific billing period/amount under a product):

   | Product | Variant name | Billing period | Amount |
   | ------- | ------------- | --------------- | ------ |
   | Pro     | Pro Monthly    | Monthly          | $4.99  |
   | Pro     | Pro Yearly     | Yearly           | $39.99 |
   | Pro+    | Pro+ Monthly   | Monthly          | $9.99  |
   | Pro+    | Pro+ Yearly    | Yearly           | $79.99 |

   After creating each Variant, copy its **Variant ID** (a plain integer,
   visible in the variant's URL/settings in the dashboard).

### 2. Set environment variables

Add these to `.env` (local) and to your hosting provider's environment
variables (production) — see `.env.example` for the full list with comments:

```
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID=...
LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID=...
LEMONSQUEEZY_PRO_PLUS_MONTHLY_VARIANT_ID=...
LEMONSQUEEZY_PRO_PLUS_YEARLY_VARIANT_ID=...
```

`LEMONSQUEEZY_API_KEY` is created under Settings → API.

### 3. Configure the webhook

The webhook endpoint is `/api/lemonsqueezy/webhook` and needs
`LEMONSQUEEZY_WEBHOOK_SECRET` to verify its signature (an HMAC-SHA256 of the
raw body, checked against the `X-Signature` header) — **the database is only
ever updated through this endpoint**, never from the client returning from
checkout.

In the Lemon Squeezy Dashboard, go to Settings → Webhooks → **+** → enter
your endpoint URL (`https://your-domain.com/api/lemonsqueezy/webhook`, or a
tunnel like [ngrok](https://ngrok.com)/ [Stripe-CLI-style forwarders don't
apply here] for local testing) → set a **signing secret** (any string,
6–40 characters — this is what you put in `LEMONSQUEEZY_WEBHOOK_SECRET`) →
select these events:

- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_paused`
- `subscription_unpaused`
- `subscription_payment_success`
- `subscription_payment_failed`
- `subscription_payment_recovered`

### 4. Test it end to end (Lemon Squeezy test mode)

Enable **Test mode** (toggle in the dashboard) before testing — it uses the
same webhook and API key, just flagged `test_mode: true` on every object.

1. Sign up/log in, go to `/pricing`, click **Upgrade to Pro**.
2. On the Lemon Squeezy Checkout page, use a
   [test card](https://docs.lemonsqueezy.com/help/getting-started/test-mode) —
   `4242 4242 4242 4242`, any future expiry, any CVC.
3. You should land back on `/billing` and, within a few seconds (once the
   webhook fires), see the Pro plan reflected.
4. To test cancellation, go to `/billing` → **Manage Billing** → cancel in
   the Lemon Squeezy portal → confirm the app still shows Pro access until
   the period end date, per the webhook update.
5. Use the subscription's "Simulate event" option (in test mode) to trigger
   `subscription_payment_failed`/`subscription_expired` without waiting for
   real renewal dates.

### Changing the free trade limit

Edit `FREE_TRADE_LIMIT` in `src/lib/plans.ts` — everywhere that enforces or
displays the limit reads from that one constant.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together: the
data model, the (planned) P&L engine, auth design, and the phase-by-phase build
plan.

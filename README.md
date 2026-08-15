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
- Insights: `/insights` asks Claude to review your own aggregated trading
  statistics and write a plain-language performance review — patterns,
  tendencies, what's costing you — grounded only in your data, never a
  market call or a guarantee. Requires an `ANTHROPIC_API_KEY` (see below);
  the rest of the app works fully without one.
- Settings (profile, timezone, base currency)
- A demo data seed script (`npm run db:seed`) creates a `demo@basisapp.dev`
  account with realistic sample trades, kept fully separate from real user
  accounts

Not yet built: trade screenshots (needs a storage backend decision) and
charts/replay/backtesting infrastructure (Phase 7, deferred pending a
market-data provider decision) — see [ARCHITECTURE.md](./ARCHITECTURE.md)
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
- `ANTHROPIC_API_KEY` — optional. Powers the AI-assisted analysis on
  `/insights` (get one at [console.anthropic.com](https://console.anthropic.com/settings/keys)).
  Everything else in the app works without it.

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

Screenshot/file storage, a transactional email provider (for password reset
emails), and broker/market-data integrations are not yet wired up — see
[ARCHITECTURE.md](./ARCHITECTURE.md) for what's deferred to later phases and why.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together: the
data model, the (planned) P&L engine, auth design, and the phase-by-phase build
plan.

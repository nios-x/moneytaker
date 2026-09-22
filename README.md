# Social by Chance — House Party with Strangers

A single-page registration and UPI payment flow for one event. Name, phone, email, gender → pay by UPI → submit your payment reference. No payment gateway, no aggregator, 0% fees; money moves directly to the organiser's bank account.

**→ [SETUP.md](SETUP.md) gets it live.**

## Quick start

```bash
npm run db:up          # Postgres in Docker + migrations
npm run dev            # http://localhost:3000
```

## Commands

```bash
npm run db:up        # start Postgres and apply migrations
npm run db:down      # stop it (data survives)
npm run db:migrate   # apply pending migrations (local or hosted)
npm run db:status    # what is applied, what is pending
npm run db:psql      # SQL prompt
npm run verify       # 53 unit checks — UPI URLs, QR, validation, capacity maths
npm run test:db      # 28 integration checks against real Postgres, in a throwaway database
npm run typecheck
npm run build
```

## Layout

```
docker-compose.yml      Postgres 17, and an optional DB UI behind --profile tools
db/migrations/          versioned .sql, each applied once and checksummed
scripts/migrate.mts     the migration runner
app/
  page.tsx              the event + the registration card
  actions.ts            register, submit UTR, resume a ticket
  admin/                password-gated guest list
lib/
  config.ts             event facts, prices, caps, reference generator
  capacity.ts           pure spot-counting maths (no I/O — unit tested)
  db.ts                 pooled pg client, server-only
  registrations.ts      every SQL statement in the app
  upi.ts                NPCI-spec UPI URL + QR
  validation.ts         zod schemas for the form and the UTR
components/
  register-flow.tsx     the three-step client flow
scripts/                the two check suites
```

`PRODUCT.md` records what is true about the event and what must never be fabricated. `DESIGN.md` records the visual decisions and why.

## Two things to know

**UPI cannot tell this site that a payment succeeded.** Guests self-report a 12-digit UTR, which proves nothing on its own — the organiser matches it against a bank statement and marks it paid in `/admin`. The UI never styles an unverified payment as confirmed.

**Docker Postgres is for development.** A container on your laptop can't back a public page. Point `DATABASE_URL` at a hosted Postgres (Neon, Supabase, Railway) before the event — nothing else changes. See [SETUP.md](SETUP.md#5-deploying).

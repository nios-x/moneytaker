# Social by Chance — House Party with Strangers

A single-page registration and UPI payment flow for one event. Name, phone, email, gender → pay by UPI → submit your payment reference. No payment gateway, no aggregator, 0% fees; money moves directly to the organiser's bank account.

**→ [SETUP.md](SETUP.md) gets it live.**

## Commands

```bash
npm run dev        # http://localhost:3000
npm run verify     # 50 checks on UPI URLs, QR, validation, capacity maths
npm run typecheck
npm run build
```

## Layout

```
app/
  page.tsx              the event + the registration card
  actions.ts            register, submit UTR, resume a ticket
  admin/                password-gated guest list
lib/
  config.ts             event facts, prices, caps, reference generator
  capacity.ts           pure spot-counting maths (no I/O — unit tested)
  upi.ts                NPCI-spec UPI URL + QR
  validation.ts         zod schemas for the form and the UTR
  supabase.ts           service-role client, server-only
components/
  register-flow.tsx     the three-step client flow
supabase/schema.sql     run this once in the Supabase SQL editor
scripts/verify.mts      the check suite
```

`PRODUCT.md` records what is true about the event and what must never be fabricated. `DESIGN.md` records the visual decisions and why.

## The one thing to know

UPI cannot tell this site that a payment succeeded. Guests self-report a 12-digit UTR, which proves nothing on its own — the organiser matches it against a bank statement and marks it paid in `/admin`. The UI never styles an unverified payment as confirmed. See [SETUP.md](SETUP.md#how-the-money-actually-works).

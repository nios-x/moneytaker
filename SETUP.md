# Getting this live

About 20 minutes, most of it waiting for Supabase and Vercel to finish thinking.

---

## 1. Database — Supabase (~5 min)

1. Go to [supabase.com](https://supabase.com) → **New project**. Any name, any region (Mumbai/Singapore is closest).
2. Wait for it to finish provisioning.
3. Open **SQL Editor** → **New query**, paste everything in [`supabase/schema.sql`](supabase/schema.sql), hit **Run**.
4. Go to **Project Settings → API** and copy two things:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **`service_role` secret** → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key bypasses all security rules. It is only ever read on the server — nothing in this app sends it to the browser. Don't paste it into a client component, and don't commit it.

---

## 2. Your UPI ID

Open any UPI app → Profile → UPI ID. It looks like `something@okhdfc` or `9876543210@paytm`.

That goes in `UPI_VPA`.

**Leave `UPI_PAYEE_NAME` blank.** If the name you type doesn't exactly match your bank's verified name, UPI apps throw a "payee name doesn't match" warning at the precise moment a stranger is deciding whether to trust you. Blank means the app shows your real verified bank name instead.

---

## 3. Fill in `.env.local`

`.env.example` is already copied to `.env.local`. Open it and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
UPI_VPA=yourname@okhdfc
UPI_PAYEE_NAME=
CAP_MALE=40
CAP_FEMALE=40
ORGANISER_EMAIL=you@example.com
INSTAGRAM_HANDLE=socialbychance
ADMIN_PASSWORD=<something long and random>
```

Set the caps to the real numbers. When a category hits its cap, registration closes for it automatically.

---

## 4. Check it

```bash
npm run verify     # 50 checks: UPI URL spec, QR, validation, capacity maths
npm run dev        # http://localhost:3000
```

Register yourself, scan the QR with your own phone, and **confirm your own UPI app shows the right name and amount before you share the link with anyone.** That is the one test nobody else can do for you.

Then open `http://localhost:3000/admin` and sign in with `ADMIN_PASSWORD`.

---

## 5. Deploy

Push to GitHub, import the repo at [vercel.com/new](https://vercel.com/new), and add **every variable from `.env.local`** under Settings → Environment Variables. Deploy.

Put the resulting URL in your Instagram bio.

---

## How the money actually works

There is no payment gateway, so **nothing tells this site that a payment succeeded.** The flow is:

| Stage | What the guest sees | Status in the database |
|---|---|---|
| Fills the form | Spot held, QR appears | `pending` |
| Pays in their UPI app | — | still `pending` |
| Types their 12-digit UTR | "Awaiting verification" | `submitted` |
| **You** check the bank statement | — | you set `paid` |

**A UTR is typed in by the guest. It proves nothing.** Anyone can invent twelve digits. The page never claims a payment is verified — it says "awaiting verification" in amber until you say otherwise.

### Your routine, twice a day

1. Open `/admin`. The **Awaiting check** tile is your queue.
2. Open your bank or UPI app statement.
3. Match by amount and by the reference (`SBC-4K9P`) in the payment note.
4. Found it → hit **Paid**. Didn't → leave it, or **Cancel** to free the spot.

Cancelled rows release their spot back into the count immediately.

### A note on holds

An unpaid registration holds a spot for **20 minutes**, then releases it. Without that, anyone who opened the form and wandered off would block a seat forever. Change it via `PENDING_HOLD_MS` in [`lib/config.ts`](lib/config.ts).

---

## What this deliberately does not do

Worth knowing before the night, not during it:

- **No automatic payment verification.** Impossible without a gateway. If you want it, you'd onboard with Razorpay or Cashfree and pay their fee.
- **No emails are sent.** The page tells guests you'll email them; you have to actually do it. Export from `/admin` or read the Supabase table. Wire up Resend or similar if you want it automated.
- **No refunds flow.** Cancel the row in `/admin` and refund by UPI yourself.
- **One registration per phone number.** A second attempt with the same number and the same name resumes the original; a different name is rejected.
- **`/admin` is one shared password**, not user accounts. Fine for one night. Don't reuse a password you use elsewhere.

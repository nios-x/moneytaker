# Getting this live

Local development runs against Postgres in Docker. Going live needs a database that is reachable from the internet — see [Deploying](#5-deploying) before the night.

---

## 1. Database — Postgres in Docker

Start Docker Desktop, then:

```bash
docker compose up -d
```

That's it. The schema in [`db/schema.sql`](db/schema.sql) is applied automatically the first time the volume is created.

| | |
|---|---|
| `npm run db:up` | start it |
| `npm run db:down` | stop it — **data survives** |
| `npm run db:psql` | open a SQL prompt |
| `docker compose down -v` | stop it and **delete every registration** |
| `docker compose --profile tools up -d` | also start a database UI on [localhost:8080](http://localhost:8080) |

Postgres is bound to `127.0.0.1` on purpose. Without that, Docker publishes on every network interface and punches straight through the Windows firewall.

### Changing the schema later

The init script only runs on a *fresh* volume. To apply changes to a database that already has data:

```bash
docker compose exec -T db psql -U sbc -d socialbychance < db/schema.sql
```

Every statement is idempotent, so that is safe to re-run.

---

## 2. Your UPI ID

Open any UPI app → Profile → UPI ID. It looks like `something@okhdfc` or `9876543210@paytm`. That goes in `UPI_VPA`.

**Leave `UPI_PAYEE_NAME` blank.** If the name you type doesn't exactly match your bank's verified name, UPI apps throw a "payee name doesn't match" warning at the precise moment a stranger is deciding whether to trust you. Blank means the app shows your real verified bank name instead.

---

## 3. Fill in `.env.local`

Copy `.env.example` if you haven't already. The database line already points at Docker:

```bash
DATABASE_URL=postgresql://sbc:sbc_local_dev@127.0.0.1:5432/socialbychance
UPI_VPA=yourname@okhdfc
UPI_PAYEE_NAME=
CAP_MALE=25
CAP_FEMALE=25
ORGANISER_EMAIL=you@example.com
INSTAGRAM_HANDLE=socialbychance
ADMIN_PASSWORD=<long and random>
```

Set the caps to the real numbers. When a category hits its cap, registration closes for it automatically.

---

## 4. Check it

```bash
npm run verify     # 50 unit checks: UPI URL spec, QR, validation, capacity maths
npm run test:db    # 25 integration checks against the real Docker Postgres
npm run dev        # http://localhost:3000
```

`npm run test:db` builds a throwaway `socialbychance_test` database, runs against it, and drops it. It never touches your real registrations.

Then register yourself, and **scan the QR with your own phone to confirm your UPI app shows the right name and amount before you share the link with anyone.** That is the one test nobody else can do for you.

`/admin` signs in with `ADMIN_PASSWORD`.

---

## 5. Deploying

**A Docker container on your laptop cannot back a live event page.** It is not reachable from the internet, and it stops when your machine sleeps. For the real thing you need a hosted Postgres. The app code is identical either way — only `DATABASE_URL` changes.

Free tiers that work directly:

- **[Neon](https://neon.tech)** — closest thing to "the same Postgres, hosted". Create a project, copy the connection string.
- **[Supabase](https://supabase.com)** — use the **direct connection string** from Project Settings → Database (not the REST API keys). Run `db/schema.sql` in their SQL editor first.
- **[Railway](https://railway.app)** — provision Postgres, copy `DATABASE_URL`.

Then:

1. Apply the schema to the hosted database (`psql "<url>" -f db/schema.sql`, or paste it into the provider's SQL editor).
2. Push to GitHub, import at [vercel.com/new](https://vercel.com/new).
3. Add **every variable from `.env.local`** under Settings → Environment Variables, with `DATABASE_URL` pointing at the hosted database.
4. Deploy, and put the URL in your Instagram bio.

Managed providers hand you a URL ending in `?sslmode=require`. Keep that parameter. If your host runs many serverless instances, point `DATABASE_URL` at the provider's **pooled** connection string and leave `DATABASE_POOL_MAX` small.

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

- **No automatic payment verification.** Impossible without a gateway. If you want it, onboard with Razorpay or Cashfree and pay their fee.
- **No emails are sent.** The page tells guests you'll email them; you have to actually do it. Read the list from `/admin` or `npm run db:psql`. Wire up Resend or similar if you want it automated.
- **No refunds flow.** Cancel the row in `/admin` and refund by UPI yourself.
- **One registration per phone number.** A second attempt with the same number and the same name resumes the original; a different name is rejected.
- **`/admin` is one shared password**, not user accounts. Fine for one night. Don't reuse a password you use elsewhere.
- **No backups.** `docker compose down -v` deletes everything. Before the event, take a dump: `docker compose exec -T db pg_dump -U sbc socialbychance > backup.sql`.

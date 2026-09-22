/**
 * Integration tests against the real Postgres in docker-compose.
 *
 *   docker compose up -d
 *   npm run test:db
 *
 * Runs in a throwaway database (`<yourdb>_test`) that is dropped and recreated
 * on every run, so it can never touch real registrations.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import pg from "pg";

const SOURCE_URL =
  process.env.DATABASE_URL?.trim() ??
  "postgresql://sbc:sbc_local_dev@127.0.0.1:5432/socialbychance";

const parsed = new URL(SOURCE_URL);
const TEST_DB = `${parsed.pathname.slice(1) || "postgres"}_test`;

const adminUrl = new URL(SOURCE_URL);
adminUrl.pathname = "/postgres";

const testUrl = new URL(SOURCE_URL);
testUrl.pathname = `/${TEST_DB}`;

/* ── Build the throwaway database ───────────────────────────────────────── */

const admin = new pg.Client({ connectionString: adminUrl.toString() });
try {
  await admin.connect();
} catch (error) {
  console.error(
    `\n  Can't reach Postgres at ${adminUrl.host}.\n  Start it with:  docker compose up -d\n\n  ${(error as Error).message}\n`,
  );
  process.exit(1);
}

// CREATE/DROP DATABASE cannot run inside a transaction, hence plain statements.
await admin.query(
  `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
  [TEST_DB],
);
await admin.query(`drop database if exists ${quoteIdent(TEST_DB)}`);
await admin.query(`create database ${quoteIdent(TEST_DB)}`);
await admin.end();

const seed = new pg.Client({ connectionString: testUrl.toString() });
await seed.connect();
await seed.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
await seed.end();

// Set before importing anything that builds a pool — lib/db.ts reads this lazily,
// but the import itself must not race the assignment.
process.env.DATABASE_URL = testUrl.toString();

const { createRegistration, findById, getAvailability, listAll, setStatus, setUtr } =
  await import("../lib/registrations.ts");
const { computeAvailability } = await import("../lib/capacity.ts");
const { pool, query } = await import("../lib/db.ts");

/* ── Harness ─────────────────────────────────────────────────────────────── */

let pass = 0;
const failures: string[] = [];

async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    pass++;
  } catch (e) {
    failures.push(`${name}\n      ${(e as Error).message.split("\n")[0]}`);
  }
}

let phoneSeq = 6000000000;
const nextPhone = () => String(++phoneSeq);

const base = { name: "Aarav Sharma", email: "aarav@example.com", gender: "male" as const, amount: 1700 };

/* ── Create ──────────────────────────────────────────────────────────────── */

const phoneA = nextPhone();
const created = await createRegistration({ ...base, phone: phoneA });

await check("inserts a registration", () => assert.equal(created.kind, "created"));
await check("returns a generated reference", () => {
  assert.equal(created.kind, "created");
  if (created.kind !== "created") return;
  assert.match(created.registration.ref, /^SBC-[2-9A-HJ-NP-Z]{4}$/);
});
await check("starts life as pending", () => {
  if (created.kind !== "created") throw new Error("not created");
  assert.equal(created.registration.status, "pending");
  assert.equal(created.registration.utr, null);
  assert.equal(created.registration.amount, 1700);
});
await check("row id is a real uuid", () => {
  if (created.kind !== "created") throw new Error("not created");
  assert.match(created.registration.id, /^[0-9a-f-]{36}$/);
});

const id = created.kind === "created" ? created.registration.id : "";

await check("findById round-trips the row", async () => {
  const found = await findById(id);
  assert.equal(found?.phone, phoneA);
  assert.equal(found?.email, "aarav@example.com");
});
await check("findById rejects a non-uuid without querying", async () =>
  assert.equal(await findById("'; drop table registrations; --"), null));
await check("findById returns null for an unknown uuid", async () =>
  assert.equal(await findById("00000000-0000-4000-8000-000000000000"), null));

/* ── Duplicate phone handling ───────────────────────────────────────────── */

await check("same phone + same name resumes the original", async () => {
  const again = await createRegistration({ ...base, phone: phoneA });
  assert.equal(again.kind, "resumed");
  if (again.kind !== "resumed") return;
  assert.equal(again.registration.id, id);
});
await check("same phone + same name, different case/spacing still resumes", async () => {
  const again = await createRegistration({ ...base, name: "  aarav SHARMA ", phone: phoneA });
  assert.equal(again.kind, "resumed");
});
await check("same phone + different name is refused", async () => {
  const other = await createRegistration({ ...base, name: "Someone Else", phone: phoneA });
  assert.equal(other.kind, "phone-taken");
});
await check("resuming never creates a second row", async () =>
  assert.equal((await query(`select 1 from registrations where phone = $1`, [phoneA])).length, 1));
await check("cancelling frees the phone to register again", async () => {
  await setStatus(id, "cancelled");
  const fresh = await createRegistration({ ...base, name: "Aarav Sharma", phone: phoneA });
  assert.equal(fresh.kind, "created");
  if (fresh.kind === "created") await setStatus(fresh.registration.id, "cancelled");
  await setStatus(id, "pending");
});

/* ── UTR ─────────────────────────────────────────────────────────────────── */

await check("setUtr records the reference and marks it submitted", async () => {
  assert.equal(await setUtr(id, "123456789012"), true);
  const row = await findById(id);
  assert.equal(row?.utr, "123456789012");
  assert.equal(row?.status, "submitted");
  assert.notEqual(row?.utr_at, null);
});
await check("a guest can correct their UTR while still submitted", async () =>
  assert.equal(await setUtr(id, "999999999999"), true));
await check("setUtr will NOT overwrite an organiser's 'paid'", async () => {
  await setStatus(id, "paid");
  assert.equal(await setUtr(id, "111111111111"), false);
  const row = await findById(id);
  assert.equal(row?.status, "paid");
  assert.equal(row?.utr, "999999999999");
});
await check("setUtr will NOT revive a cancelled registration", async () => {
  await setStatus(id, "cancelled");
  assert.equal(await setUtr(id, "222222222222"), false);
  assert.equal((await findById(id))?.status, "cancelled");
  await setStatus(id, "paid");
});
await check("setUtr on an unknown id reports failure", async () =>
  assert.equal(await setUtr("00000000-0000-4000-8000-000000000000", "123456789012"), false));

/* ── Constraints the database enforces for us ───────────────────────────── */

await check("database rejects an unknown gender", async () => {
  await assert.rejects(
    query(
      `insert into registrations (ref, name, phone, email, gender, amount)
       values ('SBC-XXXX','X','5000000001','x@y.z','other',1700)`,
    ),
  );
});
await check("database rejects a zero amount", async () => {
  await assert.rejects(
    query(
      `insert into registrations (ref, name, phone, email, gender, amount)
       values ('SBC-YYYY','X','5000000002','x@y.z','male',0)`,
    ),
  );
});
await check("database rejects a duplicate reference", async () => {
  const ref = (await findById(id))?.ref;
  await assert.rejects(
    query(
      `insert into registrations (ref, name, phone, email, gender, amount)
       values ($1,'X','5000000003','x@y.z','male',1700)`,
      [ref],
    ),
  );
});

/* ── Availability against real rows ─────────────────────────────────────── */

await check("availability counts live rows and ignores cancelled", async () => {
  await query(`delete from registrations`);

  const mk = async (gender: "male" | "female", n: number) => {
    for (let i = 0; i < n; i++) {
      await createRegistration({
        ...base,
        gender,
        amount: gender === "male" ? 1700 : 1200,
        phone: nextPhone(),
      });
    }
  };
  await mk("male", 3);
  await mk("female", 2);

  const rows = await query<{ gender: "male" | "female"; status: string; created_at: string }>(
    `select gender, status, created_at from registrations where status <> 'cancelled'`,
  );
  const avail = computeAvailability(rows as never, { male: 5, female: 5 });
  assert.deepEqual(avail.taken, { male: 3, female: 2 });
  assert.deepEqual(avail.left, { male: 2, female: 3 });
});

await check("cancelled rows are excluded from the SQL itself", async () => {
  const all = await listAll();
  await setStatus(all[0].id, "cancelled");
  const live = await query(`select 1 from registrations where status <> 'cancelled'`);
  assert.equal(live.length, all.length - 1);
});

await check("getAvailability reads through the real connection", async () => {
  const avail = await getAvailability();
  assert.equal(avail.unavailable, undefined);
  assert.equal(typeof avail.left.male, "number");
  assert.ok(avail.left.male >= 0 && avail.left.female >= 0);
});

await check("listAll comes back newest first", async () => {
  const all = await listAll();
  const times = all.map((r) => new Date(r.created_at).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
});

/* ── Injection ───────────────────────────────────────────────────────────── */

await check("a name full of SQL is stored as text, not executed", async () => {
  const nasty = "Robert'); DROP TABLE registrations; --";
  const r = await createRegistration({ ...base, name: nasty, phone: nextPhone() });
  assert.equal(r.kind, "created");
  if (r.kind === "created") assert.equal(r.registration.name, nasty);
  assert.ok((await listAll()).length > 0, "table still exists");
});

/* ── Teardown ────────────────────────────────────────────────────────────── */

await pool().end();

const cleanup = new pg.Client({ connectionString: adminUrl.toString() });
await cleanup.connect();
await cleanup.query(
  `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
  [TEST_DB],
);
await cleanup.query(`drop database if exists ${quoteIdent(TEST_DB)}`);
await cleanup.end();

console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
for (const f of failures) console.log(`  FAIL  ${f}`);
process.exit(failures.length ? 1 : 0);

function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return `"${name}"`;
}

import assert from "node:assert/strict";

import { buildQrSvg, buildUpiUrl, formatInr } from "../lib/upi.ts";
import { registrationSchema, utrSchema } from "../lib/validation.ts";
import { computeAvailability, holdsASpot } from "../lib/capacity.ts";
import { makeRef, PRICES } from "../lib/config.ts";

let pass = 0;
const fail: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
  } catch (e) {
    fail.push(`${name}\n      ${(e as Error).message.split("\n")[0]}`);
  }
}

/* ── UPI URL, against the NPCI spec ─────────────────────────────────────── */

const url = buildUpiUrl({ vpa: "socialbychance@okhdfc", amount: 1700, ref: "SBC-4K9P" });
const u = new URL(url);
const p = u.searchParams;

check("scheme is upi://pay", () => assert.equal(url.startsWith("upi://pay?"), true));
check("pa = payee VPA", () => assert.equal(p.get("pa"), "socialbychance@okhdfc"));
check("pn omitted when no payee name (avoids name-mismatch warning)", () =>
  assert.equal(p.has("pn"), false));
check("am is 2dp", () => assert.equal(p.get("am"), "1700.00"));
check("cu = INR", () => assert.equal(p.get("cu"), "INR"));
check("tn carries the ref into the bank statement", () =>
  assert.equal(p.get("tn"), "SBC-4K9P Social by Chance"));
check("tr is alphanumeric only", () => assert.match(p.get("tr") ?? "", /^[A-Za-z0-9]+$/));
check("pn included when payee name is set", () => {
  const withName = new URL(
    buildUpiUrl({ vpa: "a@b", amount: 1200, ref: "SBC-1", payeeName: "Social by Chance" }),
  );
  assert.equal(withName.searchParams.get("pn"), "Social by Chance");
});
check("female price renders 1200.00", () => {
  const f = new URL(buildUpiUrl({ vpa: "a@b", amount: PRICES.female, ref: "SBC-2" }));
  assert.equal(f.searchParams.get("am"), "1200.00");
});
check("formatInr -> Indian grouping", () => assert.equal(formatInr(1700), "₹1,700"));

/* ── QR ─────────────────────────────────────────────────────────────────── */

const svg = await buildQrSvg(url);
check("QR is an svg element", () => assert.match(svg, /^<svg[\s\S]*<\/svg>\s*$/));
// The xmlns declaration is a namespace, not a fetch. What must not appear is
// anything that would make the QR depend on the network to render.
check("QR fetches nothing at render time", () => {
  assert.equal(/<image|<script|xlink:href|url\(/.test(svg), false);
  assert.equal(svg.replace(/xmlns(:\w+)?="[^"]*"/g, "").includes("http"), false);
});
check("QR renders dark modules on white", () => {
  assert.match(svg, /#ffffff/i);
  assert.match(svg, /#0A0711/i);
});
check("QR scales (has viewBox)", () => assert.match(svg, /viewBox=/));

/* ── Refs ───────────────────────────────────────────────────────────────── */

const refs = new Set<string>();
for (let i = 0; i < 4000; i++) refs.add(makeRef());
check("ref shape SBC-XXXX", () => assert.match(makeRef(), /^SBC-[2-9A-HJ-NP-Z]{4}$/));
check("ref excludes 0/O/1/I (read aloud at a door)", () =>
  assert.equal([...refs].some((r) => /[01OI]/.test(r.slice(4))), false));
check("4000 refs have few collisions", () => assert.ok(refs.size > 3900, `got ${refs.size}`));

/* ── Registration validation ────────────────────────────────────────────── */

const good = { name: "Aarav Sharma", phone: "9876543210", email: "A@Example.COM ", gender: "male" };
check("accepts a valid registration", () => assert.equal(registrationSchema.safeParse(good).success, true));
check("lowercases + trims email", () =>
  assert.equal(registrationSchema.parse(good).email, "a@example.com"));

for (const [label, phone, ok] of [
  ["+91 prefix stripped", "+91 98765 43210", true],
  ["91 prefix stripped", "919876543210", true],
  ["dashes stripped", "98765-43210", true],
  ["starts with 5 rejected", "5876543210", false],
  ["9 digits rejected", "987654321", false],
  ["11 digits rejected", "98765432100", false],
  ["letters rejected", "98765abcde", false],
] as const) {
  check(`phone: ${label}`, () =>
    assert.equal(registrationSchema.safeParse({ ...good, phone }).success, ok));
}
check("phone normalises to bare 10 digits", () =>
  assert.equal(registrationSchema.parse({ ...good, phone: "+91 98765 43210" }).phone, "9876543210"));

check("rejects a 1-char name", () =>
  assert.equal(registrationSchema.safeParse({ ...good, name: "A" }).success, false));
check("accepts names with accents/apostrophes", () =>
  assert.equal(registrationSchema.safeParse({ ...good, name: "Zoë D'Souza" }).success, true));
check("rejects a script tag as a name", () =>
  assert.equal(registrationSchema.safeParse({ ...good, name: "<script>x</script>" }).success, false));
check("rejects a bad email", () =>
  assert.equal(registrationSchema.safeParse({ ...good, email: "nope" }).success, false));
check("rejects an unknown gender (price would be undefined)", () =>
  assert.equal(registrationSchema.safeParse({ ...good, gender: "other" }).success, false));

/* ── UTR validation ─────────────────────────────────────────────────────── */

const id = "6b1b0f2e-7f3a-4f3f-9a1e-5c2b9d4e8a10";
check("accepts 12 digits", () => assert.equal(utrSchema.safeParse({ id, utr: "123456789012" }).success, true));
check("strips spaces in a pasted UTR", () =>
  assert.equal(utrSchema.parse({ id, utr: "1234 5678 9012" }).utr, "123456789012"));
check("rejects 11 digits", () => assert.equal(utrSchema.safeParse({ id, utr: "12345678901" }).success, false));
check("rejects 13 digits", () => assert.equal(utrSchema.safeParse({ id, utr: "1234567890123" }).success, false));
check("rejects letters", () => assert.equal(utrSchema.safeParse({ id, utr: "12345678901a" }).success, false));
check("rejects a non-uuid id", () =>
  assert.equal(utrSchema.safeParse({ id: "x", utr: "123456789012" }).success, false));

/* ── Capacity holds ─────────────────────────────────────────────────────── */

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
check("paid holds a spot", () => assert.equal(holdsASpot({ status: "paid", created_at: iso(1e9) }, now), true));
check("submitted holds a spot", () =>
  assert.equal(holdsASpot({ status: "submitted", created_at: iso(1e9) }, now), true));
check("fresh pending holds a spot", () =>
  assert.equal(holdsASpot({ status: "pending", created_at: iso(60_000) }, now), true));
check("stale pending releases the spot", () =>
  assert.equal(holdsASpot({ status: "pending", created_at: iso(25 * 60_000) }, now), false));
check("cancelled never holds a spot", () =>
  assert.equal(holdsASpot({ status: "cancelled", created_at: iso(10) }, now), false));
check("a malformed timestamp holds rather than double-books", () =>
  assert.equal(holdsASpot({ status: "pending", created_at: "not-a-date" }, now), true));

const caps = { male: 3, female: 2 };
const rows = [
  { gender: "male", status: "paid", created_at: iso(1e9) },
  { gender: "male", status: "submitted", created_at: iso(1e9) },
  { gender: "male", status: "pending", created_at: iso(25 * 60_000) }, // expired, frees a spot
  { gender: "female", status: "pending", created_at: iso(60_000) }, // live hold
  { gender: "female", status: "cancelled", created_at: iso(10) }, // frees a spot
] as const;

const avail = computeAvailability([...rows], caps, now);
check("counts only rows that hold a spot", () =>
  assert.deepEqual(avail.taken, { male: 2, female: 1 }));
check("left = cap - held", () => assert.deepEqual(avail.left, { male: 1, female: 1 }));
check("not sold out while spots remain", () => assert.equal(avail.soldOut, false));
check("sold out only when both are zero", () => {
  const full = computeAvailability(
    [
      { gender: "male", status: "paid", created_at: iso(10) },
      { gender: "female", status: "paid", created_at: iso(10) },
    ],
    { male: 1, female: 1 },
    now,
  );
  assert.equal(full.soldOut, true);
  assert.deepEqual(full.left, { male: 0, female: 0 });
});
check("left never goes negative on an oversold cap", () => {
  const over = computeAvailability(
    [
      { gender: "male", status: "paid", created_at: iso(10) },
      { gender: "male", status: "paid", created_at: iso(10) },
    ],
    { male: 1, female: 1 },
    now,
  );
  assert.equal(over.left.male, 0);
});
check("empty list means everything is available", () =>
  assert.deepEqual(computeAvailability([], caps, now).left, caps));

/* ── Report ─────────────────────────────────────────────────────────────── */

console.log(`\n  ${pass} passed, ${fail.length} failed\n`);
for (const f of fail) console.log(`  FAIL  ${f}`);
process.exit(fail.length ? 1 : 0);

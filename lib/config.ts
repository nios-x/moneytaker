import "server-only";

/** Facts about the event. All of these are real — see PRODUCT.md. */
export const EVENT = {
  name: "House Party with Strangers",
  host: "Social by Chance",
  /** 26 Sep 2026, 19:00 IST. */
  startsAt: new Date("2026-09-26T19:00:00+05:30"),
  dateLabel: "Friday, 26 September",
  timeLabel: "7:00 PM onwards",
  city: "Gurugram",
  venueNote: "Exact address goes only to confirmed guests",
  dressCode: "Casual & comfy",
  poolNote: "Carry a change of clothes if you're getting in the pool",
  tagline: "Come as strangers. Leave with stories.",
} as const;

export type Gender = "male" | "female";

/**
 * The real prices. Override in .env.local to test a live UPI payment cheaply
 * (PRICE_MALE=1 PRICE_FEMALE=1) — that keeps the test amount out of committed
 * code, so there is no way to ship ₹1 by forgetting to change it back.
 *
 * Read at request time, never captured into a module-level constant. A constant
 * is frozen at whatever the environment held when the module first loaded, so
 * the page and a Server Action could be built from two different snapshots —
 * which is exactly how a form ends up promising one price and the server
 * charging another.
 */
export function prices(): Record<Gender, number> {
  return {
    male: intFromEnv("PRICE_MALE", 1700),
    female: intFromEnv("PRICE_FEMALE", 1200),
  };
}

export function caps(): Record<Gender, number> {
  return {
    male: intFromEnv("CAP_MALE", 40),
    female: intFromEnv("CAP_FEMALE", 40),
  };
}

/**
 * How long an unpaid registration holds a spot. Without this, anyone who opens
 * the form and wanders off blocks a seat forever; with it, the seat comes back.
 */
export const PENDING_HOLD_MS = 20 * 60 * 1000;

export const ORGANISER_EMAIL = process.env.ORGANISER_EMAIL?.trim() || "";

/**
 * The name the payer's UPI app will show — usually the account holder, not the
 * event. Purely informational: it warns the guest before they see an unfamiliar
 * personal name at the moment they are deciding to trust you. It is NEVER put
 * into the UPI URL; that is UPI_PAYEE_NAME's job, and a wrong value there
 * triggers a "payee name doesn't match" warning.
 */
export const UPI_PAYEE_DISPLAY = process.env.UPI_PAYEE_DISPLAY?.trim() || "";
export const INSTAGRAM_HANDLE =
  process.env.INSTAGRAM_HANDLE?.trim().replace(/^@/, "") || "";

/** True once the organiser has actually supplied a UPI ID. */
export function isPaymentConfigured(): boolean {
  return Boolean(process.env.UPI_VPA?.trim());
}

function intFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I — these get read aloud

/**
 * Short, unambiguous reference. It goes in the UPI note, so it is what the
 * organiser sees in the bank statement next to the money.
 */
export function makeRef(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let out = "";
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  return `SBC-${out}`;
}

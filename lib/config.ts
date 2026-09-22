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

export const PRICES: Record<Gender, number> = { male: 1700, female: 1200 };

export const CAPS: Record<Gender, number> = {
  male: intFromEnv("CAP_MALE", 40),
  female: intFromEnv("CAP_FEMALE", 40),
};

/**
 * How long an unpaid registration holds a spot. Without this, anyone who opens
 * the form and wanders off blocks a seat forever; with it, the seat comes back.
 */
export const PENDING_HOLD_MS = 20 * 60 * 1000;

export const ORGANISER_EMAIL = process.env.ORGANISER_EMAIL?.trim() || "";
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

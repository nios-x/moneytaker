import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { CAPS, PENDING_HOLD_MS, type Gender } from "./config";

export type RegistrationStatus = "pending" | "submitted" | "paid" | "cancelled";

export type Registration = {
  id: string;
  created_at: string;
  ref: string;
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  amount: number;
  utr: string | null;
  utr_at: string | null;
  status: RegistrationStatus;
  note: string | null;
};

let client: SupabaseClient | null = null;

/**
 * Service-role client. It bypasses row-level security, so it must only ever be
 * reached from a Server Action or Server Component — `server-only` above turns
 * an accidental client import into a build error rather than a leaked key.
 */
export function db(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example).",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export type Availability = {
  taken: Record<Gender, number>;
  left: Record<Gender, number>;
  caps: Record<Gender, number>;
  soldOut: boolean;
  /** Set when we could not reach the database — the UI hides the counter rather than lying. */
  unavailable?: boolean;
};

/**
 * A spot is held by anyone who has paid, says they have paid, or registered in
 * the last few minutes and is presumably staring at the QR right now. Everyone
 * else's abandoned attempt is returned to the pool.
 */
export function holdsASpot(row: Pick<Registration, "status" | "created_at">, now: number): boolean {
  if (row.status === "paid" || row.status === "submitted") return true;
  if (row.status === "cancelled") return false;
  return now - new Date(row.created_at).getTime() < PENDING_HOLD_MS;
}

export async function getAvailability(): Promise<Availability> {
  const empty = { male: 0, female: 0 } as Record<Gender, number>;

  if (!isDbConfigured()) {
    return { taken: empty, left: { ...CAPS }, caps: CAPS, soldOut: false, unavailable: true };
  }

  const { data, error } = await db()
    .from("registrations")
    .select("gender, status, created_at")
    .neq("status", "cancelled");

  if (error || !data) {
    return { taken: empty, left: { ...CAPS }, caps: CAPS, soldOut: false, unavailable: true };
  }

  const now = Date.now();
  const taken: Record<Gender, number> = { male: 0, female: 0 };
  for (const row of data as Pick<Registration, "gender" | "status" | "created_at">[]) {
    if (holdsASpot(row, now) && (row.gender === "male" || row.gender === "female")) {
      taken[row.gender] += 1;
    }
  }

  const left: Record<Gender, number> = {
    male: Math.max(0, CAPS.male - taken.male),
    female: Math.max(0, CAPS.female - taken.female),
  };

  return { taken, left, caps: CAPS, soldOut: left.male === 0 && left.female === 0 };
}

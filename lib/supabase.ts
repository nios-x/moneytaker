import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";

import { CAPS, type Gender } from "./config";
import {
  computeAvailability,
  emptyAvailability,
  type Availability,
  type SpotRow,
  type SpotStatus,
} from "./capacity";

export type { Availability } from "./capacity";
export type RegistrationStatus = SpotStatus;

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

export async function getAvailability(): Promise<Availability> {
  // Spots left change between one visitor and the next, and a prerendered
  // counter would be a lie about a real cap. Never serve this from the build.
  await connection();

  if (!isDbConfigured()) return emptyAvailability(CAPS);

  const { data, error } = await db()
    .from("registrations")
    .select("gender, status, created_at")
    .neq("status", "cancelled");

  if (error || !data) return emptyAvailability(CAPS);

  return computeAvailability(data as SpotRow[], CAPS);
}

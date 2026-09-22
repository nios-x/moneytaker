import "server-only";

import {
  computeAvailability,
  emptyAvailability,
  type Availability,
  type SpotRow,
  type SpotStatus,
} from "./capacity";
import { caps, makeRef, type Gender } from "./config";
import { isDbConfigured, PG, pgConstraint, pgErrorCode, query, queryOne } from "./db";

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

const COLUMNS = `
  id,
  created_at,
  ref,
  name,
  phone,
  email,
  gender,
  amount,
  utr,
  utr_at,
  status,
  note
`;

export { isDbConfigured };

/* ── Reads ───────────────────────────────────────────────────────────────── */

/**
 * Callers that render must opt out of prerendering themselves (`connection()`
 * in the page). Data access stays free of framework rendering concerns, which
 * also keeps this module testable outside Next.
 */
export async function getAvailability(): Promise<Availability> {
  const CAPS = caps();
  if (!isDbConfigured()) return emptyAvailability(CAPS);

  try {
    const rows = await query<SpotRow>(
      `select gender, status, created_at from registrations where status <> 'cancelled'`,
    );
    return computeAvailability(rows, CAPS);
  } catch (error) {
    // A counter that lies is worse than no counter — the UI hides it entirely
    // when `unavailable` is set.
    console.error("[db] availability:", error);
    return emptyAvailability(CAPS);
  }
}

export async function findById(id: string): Promise<Registration | null> {
  if (!isDbConfigured() || !isUuid(id)) return null;

  try {
    return await queryOne<Registration>(
      `select ${COLUMNS} from registrations where id = $1`,
      [id],
    );
  } catch (error) {
    console.error("[db] findById:", error);
    return null;
  }
}

export async function listAll(): Promise<Registration[]> {
  return query<Registration>(
    `select ${COLUMNS} from registrations order by created_at desc`,
  );
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

export type CreateResult =
  | { kind: "created"; registration: Registration }
  | { kind: "resumed"; registration: Registration }
  | { kind: "phone-taken" }
  | { kind: "error" };

/**
 * Insert a registration, retrying on the (roughly 1-in-a-million) chance that
 * a generated reference collides with an existing one.
 */
export async function createRegistration(input: {
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  amount: number;
}): Promise<CreateResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await queryOne<Registration>(
        `insert into registrations (ref, name, phone, email, gender, amount)
         values ($1, $2, $3, $4, $5, $6)
         returning ${COLUMNS}`,
        [makeRef(), input.name, input.phone, input.email, input.gender, input.amount],
      );
      if (row) return { kind: "created", registration: row };
      return { kind: "error" };
    } catch (error) {
      if (pgErrorCode(error) !== PG.UNIQUE_VIOLATION) {
        console.error("[db] createRegistration:", error);
        return { kind: "error" };
      }

      // A ref collision is ours to fix silently; a phone collision is the
      // guest's and needs an answer. The constraint name tells them apart.
      if (pgConstraint(error) === "registrations_ref_key") continue;

      const existing = await findLiveByPhoneAndName(input.phone, input.name);
      return existing
        ? { kind: "resumed", registration: existing }
        : { kind: "phone-taken" };
    }
  }

  console.error("[db] createRegistration: exhausted reference retries");
  return { kind: "error" };
}

/** Same phone and same name means the same person coming back. */
async function findLiveByPhoneAndName(
  phone: string,
  name: string,
): Promise<Registration | null> {
  try {
    return await queryOne<Registration>(
      `select ${COLUMNS} from registrations
       where phone = $1 and status <> 'cancelled' and lower(btrim(name)) = lower(btrim($2))`,
      [phone, name],
    );
  } catch (error) {
    console.error("[db] findLiveByPhoneAndName:", error);
    return null;
  }
}

export async function setUtr(id: string, utr: string): Promise<boolean> {
  if (!isUuid(id)) return false;

  try {
    const rows = await query<{ id: string }>(
      `update registrations
          set utr = $2, utr_at = now(), status = 'submitted'
        where id = $1
          -- Never let a late submission quietly overwrite an organiser's "paid",
          -- or revive something they cancelled.
          and status in ('pending', 'submitted')
      returning id`,
      [id, utr],
    );
    return rows.length > 0;
  } catch (error) {
    console.error("[db] setUtr:", error);
    return false;
  }
}

export async function setStatus(id: string, status: RegistrationStatus): Promise<void> {
  await query(`update registrations set status = $2 where id = $1`, [id, status]);
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

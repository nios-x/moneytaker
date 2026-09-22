import { PENDING_HOLD_MS, type Gender } from "./config";

/**
 * Pure capacity maths. No database, no framework — so it can be reasoned about
 * and tested on its own, which matters because getting it wrong means either
 * overselling a pool or turning away paying guests.
 */

export type SpotStatus = "pending" | "submitted" | "paid" | "cancelled";

export type SpotRow = { gender: Gender; status: SpotStatus; created_at: string };

export type Availability = {
  taken: Record<Gender, number>;
  left: Record<Gender, number>;
  caps: Record<Gender, number>;
  soldOut: boolean;
  /** Set when the database was unreachable — the UI hides the counter rather than lying. */
  unavailable?: boolean;
};

/**
 * A spot is held by anyone who has paid, says they have paid, or registered in
 * the last few minutes and is presumably staring at the QR right now. Everyone
 * else's abandoned attempt is returned to the pool.
 */
export function holdsASpot(
  row: Pick<SpotRow, "status" | "created_at">,
  now: number,
): boolean {
  if (row.status === "paid" || row.status === "submitted") return true;
  if (row.status === "cancelled") return false;

  const age = now - new Date(row.created_at).getTime();
  // A malformed timestamp yields NaN; treat that as "hold it" so a bad row
  // never silently hands the same spot to two people.
  return Number.isNaN(age) ? true : age < PENDING_HOLD_MS;
}

export function computeAvailability(
  rows: readonly SpotRow[],
  caps: Record<Gender, number>,
  now: number = Date.now(),
): Availability {
  const taken: Record<Gender, number> = { male: 0, female: 0 };

  for (const row of rows) {
    if ((row.gender === "male" || row.gender === "female") && holdsASpot(row, now)) {
      taken[row.gender] += 1;
    }
  }

  const left: Record<Gender, number> = {
    male: Math.max(0, caps.male - taken.male),
    female: Math.max(0, caps.female - taken.female),
  };

  return { taken, left, caps, soldOut: left.male === 0 && left.female === 0 };
}

export function emptyAvailability(caps: Record<Gender, number>): Availability {
  return {
    taken: { male: 0, female: 0 },
    left: { ...caps },
    caps,
    soldOut: false,
    unavailable: true,
  };
}

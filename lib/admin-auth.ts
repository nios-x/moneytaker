import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "sbc_admin";
const SESSION_DAYS = 7;

function secret(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value && value.length > 0 ? value : null;
}

/**
 * The cookie carries an HMAC of a fixed string keyed by the admin password, so
 * the password itself never leaves the server and a stolen cookie dies the
 * moment the password is rotated. Enough for a one-night guest list; this is
 * not a user-accounts system and does not pretend to be.
 */
function token(key: string): string {
  return createHmac("sha256", key).update("sbc-admin-v1").digest("hex");
}

function equal(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isAdminConfigured(): boolean {
  return secret() !== null;
}

export async function isAdmin(): Promise<boolean> {
  const key = secret();
  if (!key) return false;

  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value && equal(value, token(key)));
}

/** Returns false on a wrong password, without revealing which part was wrong. */
export async function signIn(password: string): Promise<boolean> {
  const key = secret();
  if (!key || !equal(password, key)) return false;

  (await cookies()).set(COOKIE, token(key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

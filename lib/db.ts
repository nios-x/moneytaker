import "server-only";

import { Pool, type QueryResultRow } from "pg";

/**
 * One pool per process. Stashed on globalThis because Next's dev server
 * re-evaluates modules on every edit, and a fresh Pool per reload would leak
 * connections until Postgres refused new ones.
 */
declare global {
  var __sbcPool: Pool | undefined;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function pool(): Pool {
  if (globalThis.__sbcPool) return globalThis.__sbcPool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Start Postgres with `docker compose up -d` and copy the URL from .env.example.",
    );
  }

  const created = new Pool({
    connectionString,
    // Serverless platforms run many short-lived instances against one database.
    // Keep each instance's share small; raise it for a long-running server.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // An idle client erroring (database restarted, network dropped) emits on the
  // pool. Unhandled, it takes the whole process down.
  created.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
  });

  globalThis.__sbcPool = created;
  return created;
}

/** Parameterised query. Values are always bound, never interpolated. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool().query<T>(text, params as unknown[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Postgres error codes this app reacts to, rather than matching on messages. */
export const PG = { UNIQUE_VIOLATION: "23505" } as const;

export function pgErrorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : null;
}

export function pgConstraint(error: unknown): string | null {
  return typeof error === "object" && error !== null && "constraint" in error
    ? String((error as { constraint: unknown }).constraint)
    : null;
}

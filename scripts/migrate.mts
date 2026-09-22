/**
 * Migration runner.
 *
 *   npm run db:migrate     apply everything pending
 *   npm run db:status      show what has and hasn't been applied
 *
 * Every .sql file in db/migrations runs once, in filename order, inside a
 * transaction. Applied migrations are recorded in `schema_migrations` along
 * with a checksum, so editing a file that has already run is reported rather
 * than silently ignored.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const MIGRATIONS_DIR = fileURLToPath(new URL("../db/migrations", import.meta.url));

// Any process running migrations takes this lock first, so two deploys landing
// at once queue instead of racing.
const LOCK_KEY = "8274619283746";

export type Migration = { version: string; name: string; sql: string; checksum: string };

export function loadMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => {
      const sql = readFileSync(join(dir, file), "utf8");
      const version = basename(file).split("_")[0];
      if (!/^\d+$/.test(version)) {
        throw new Error(`Migration "${file}" must start with digits, e.g. 002_add_notes.sql`);
      }
      return {
        version,
        name: basename(file, ".sql"),
        sql,
        checksum: createHash("sha256").update(sql).digest("hex").slice(0, 16),
      };
    });
}

type AppliedRow = { version: string; name: string; checksum: string; applied_at: Date };

export type MigrateResult = {
  applied: string[];
  alreadyApplied: string[];
  changed: string[];
};

export async function migrate(
  connectionString: string,
  opts: { dir?: string; dryRun?: boolean; log?: (line: string) => void } = {},
): Promise<MigrateResult> {
  const log = opts.log ?? (() => {});
  const migrations = loadMigrations(opts.dir);
  const client = new pg.Client({ connectionString });
  await client.connect();

  const result: MigrateResult = { applied: [], alreadyApplied: [], changed: [] };

  try {
    await client.query(`select pg_advisory_lock($1)`, [LOCK_KEY]);

    await client.query(`
      create table if not exists schema_migrations (
        version     text primary key,
        name        text        not null,
        checksum    text        not null,
        applied_at  timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<AppliedRow>(
      `select version, name, checksum, applied_at from schema_migrations`,
    );
    const applied = new Map(rows.map((r) => [r.version, r]));

    for (const m of migrations) {
      const already = applied.get(m.version);

      if (already) {
        result.alreadyApplied.push(m.name);
        if (already.checksum !== m.checksum) {
          result.changed.push(m.name);
          log(`  !  ${m.name} — file changed since it was applied`);
        }
        continue;
      }

      if (opts.dryRun) {
        log(`  ·  ${m.name} — would apply`);
        result.applied.push(m.name);
        continue;
      }

      // One transaction per migration: a failure rolls that file back whole,
      // and earlier migrations stay applied.
      await client.query("begin");
      try {
        await client.query(m.sql);
        await client.query(
          `insert into schema_migrations (version, name, checksum) values ($1, $2, $3)`,
          [m.version, m.name, m.checksum],
        );
        await client.query("commit");
        log(`  +  ${m.name}`);
        result.applied.push(m.name);
      } catch (error) {
        await client.query("rollback");
        throw new Error(`${m.name} failed and was rolled back:\n    ${(error as Error).message}`);
      }
    }

    return result;
  } finally {
    await client.query(`select pg_advisory_unlock($1)`, [LOCK_KEY]).catch(() => {});
    await client.end();
  }
}

export async function status(connectionString: string): Promise<void> {
  const migrations = loadMigrations();
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const exists = await client.query<{ exists: boolean }>(
      `select to_regclass('public.schema_migrations') is not null as exists`,
    );
    const rows = exists.rows[0]?.exists
      ? (await client.query<AppliedRow>(`select version, checksum, applied_at from schema_migrations`))
          .rows
      : [];
    const applied = new Map(rows.map((r) => [r.version, r]));

    console.log("");
    for (const m of migrations) {
      const a = applied.get(m.version);
      if (!a) {
        console.log(`  pending   ${m.name}`);
      } else if (a.checksum !== m.checksum) {
        console.log(`  CHANGED   ${m.name}  (applied ${a.applied_at.toISOString().slice(0, 16)})`);
      } else {
        console.log(`  applied   ${m.name}  (${a.applied_at.toISOString().slice(0, 16)})`);
      }
    }
    console.log("");
  } finally {
    await client.end();
  }
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */

const isCli = process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]));

if (isCli) {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(
      "\n  DATABASE_URL is not set.\n  Start Postgres with `docker compose up -d`, then copy the URL from .env.example into .env.local.\n",
    );
    process.exit(1);
  }

  const mode = process.argv[2] ?? "up";

  try {
    if (mode === "status") {
      await status(url);
    } else {
      console.log("");
      const r = await migrate(url, {
        dryRun: mode === "--dry-run",
        log: (line) => console.log(line),
      });

      if (r.applied.length === 0) {
        console.log(`  Nothing to apply — ${r.alreadyApplied.length} migration(s) already run.`);
      } else {
        console.log(
          `\n  ${r.applied.length} migration(s) ${mode === "--dry-run" ? "pending" : "applied"}.`,
        );
      }

      if (r.changed.length > 0) {
        console.log(
          `\n  Warning: ${r.changed.join(", ")} changed after being applied.` +
            `\n  A migration that has already run is history — add a new numbered file instead.`,
        );
      }
      console.log("");
    }
  } catch (error) {
    console.error(`\n  Migration failed.\n\n  ${(error as Error).message}\n`);
    process.exit(1);
  }
}

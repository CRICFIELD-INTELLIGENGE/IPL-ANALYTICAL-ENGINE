// Uploads scout-serving.db into Supabase PostgreSQL, schema "scout".
// Loads into "scout_new" first and swaps it in one transaction, so the site never reads a half-loaded copy.
// Usage (from artifacts/api-server): npx tsx --env-file=../../env/supabase.env scripts/upload-scout-to-postgres.ts
// Build the source first: pnpm --filter @workspace/scripts run global:scout-serving
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { scoutPostgresClient, SCOUT_SCHEMA, ROWID_COLUMN, quote } from "../src/services/scout/scout-postgres.js";

const source = process.argv[2]
  ?? fileURLToPath(new URL("../../../lib/cricket-data/global/warehouse/scout-serving.db", import.meta.url));
const STAGE = `${SCOUT_SCHEMA}_new`;
const BATCH = 1000;
/** Read-only database login the website uses (PGUSER in Vercel); this script itself runs as the master user. */
const READER = "scout_reader";
const READER_ENV = fileURLToPath(new URL("../../../env/scout-reader.env", import.meta.url));

// Postgres column type from the values SQLite actually holds (SQLite typing is per value, not per column).
function pgType(kinds: Set<string>): string {
  kinds.delete("null");
  if (kinds.size === 0) return "text";
  if ([...kinds].every(k => k === "integer")) return "bigint";
  if ([...kinds].every(k => k === "integer" || k === "real")) return "double precision";
  if ([...kinds].every(k => k === "blob")) return "bytea";
  if ([...kinds].every(k => k === "text")) return "text";
  throw new Error(`mixed value types ${[...kinds]} cannot round-trip exactly`);
}

const db = new DatabaseSync(source, { readOnly: true });
const schema = db.prepare(
  "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid",
).all() as { type: string; name: string; sql: string }[];

const client = scoutPostgresClient();
await client.connect();
try {
  await client.query(`DROP SCHEMA IF EXISTS ${STAGE} CASCADE; CREATE SCHEMA ${STAGE}`);
  await client.query(`CREATE TABLE ${STAGE}._sqlite_schema (seq int PRIMARY KEY, type text NOT NULL, name text NOT NULL, sql text)`);
  for (const [seq, s] of schema.entries()) {
    await client.query(`INSERT INTO ${STAGE}._sqlite_schema VALUES ($1, $2, $3, $4)`, [seq, s.type, s.name, s.sql]);
  }

  let total = 0;
  for (const { name, sql } of schema.filter(s => s.type === "table")) {
    // Rowid tables keep their rowids (ROWID_COLUMN), so scan order, and tie order in results, survive the round trip.
    const hasRowid = !/without\s+rowid/i.test(sql);
    const cols = (db.prepare(`PRAGMA table_info(${quote(name)})`).all() as { name: string }[]).map(c => c.name);
    if (hasRowid) cols.unshift(ROWID_COLUMN);
    const types = cols.map(c => pgType(new Set(
      (db.prepare(`SELECT DISTINCT typeof(${c === ROWID_COLUMN ? "rowid" : quote(c)}) k FROM ${quote(name)}`).all() as { k: string }[]).map(r => r.k))));
    await client.query(`CREATE TABLE ${STAGE}.${quote(name)} (${cols.map((c, i) => `${quote(c)} ${types[i]}`).join(", ")})`);

    const rows = db.prepare(`SELECT ${hasRowid ? `rowid AS ${ROWID_COLUMN}, ` : ""}* FROM ${quote(name)}`).all() as Record<string, unknown>[];
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values: unknown[] = [];
      const tuples = chunk.map(r => `(${cols.map(c => { values.push(r[c]); return `$${values.length}`; }).join(", ")})`);
      await client.query(`INSERT INTO ${STAGE}.${quote(name)} VALUES ${tuples.join(", ")}`, values);
    }
    total += rows.length;
    console.log(`${name}: ${rows.length.toLocaleString()} rows`);
  }

  // Sanity check before the swap: every table's row count matches the source.
  for (const { name } of schema.filter(s => s.type === "table")) {
    const want = (db.prepare(`SELECT count(*) n FROM ${quote(name)}`).get() as { n: number }).n;
    const got = Number((await client.query(`SELECT count(*) n FROM ${STAGE}.${quote(name)}`)).rows[0].n);
    if (want !== got) throw new Error(`${name}: ${got} rows in Postgres, ${want} in SQLite`);
  }

  // First run only: create the read-only login and write its connection settings (git-ignored) for Vercel.
  const readerExists = (await client.query(`SELECT 1 FROM pg_roles WHERE rolname = '${READER}'`)).rowCount === 1;
  const readerPassword = readerExists ? null : randomBytes(24).toString("base64url"); // base64url: no quote characters

  // Swap, and (re)grant the reader, in one transaction.
  await client.query(`BEGIN;
    DROP SCHEMA IF EXISTS ${SCOUT_SCHEMA} CASCADE; ALTER SCHEMA ${STAGE} RENAME TO ${SCOUT_SCHEMA};
    ${readerPassword ? `CREATE ROLE ${READER} LOGIN PASSWORD '${readerPassword}';` : ""}
    GRANT USAGE ON SCHEMA ${SCOUT_SCHEMA} TO ${READER};
    GRANT SELECT ON ALL TABLES IN SCHEMA ${SCOUT_SCHEMA} TO ${READER};
    COMMIT`);
  console.log(`Uploaded ${total.toLocaleString()} rows to schema "${SCOUT_SCHEMA}".`);

  if (readerPassword) {
    // Supabase's pooler addresses a role as <role>.<project-ref>; reuse the master user's suffix.
    const suffix = (process.env.PGUSER ?? "").split(".")[1];
    // Never clobber an existing reader login (another database's), write beside it instead.
    const target = existsSync(READER_ENV) ? `${READER_ENV}.${process.env.PGHOST}` : READER_ENV;
    writeFileSync(target, [
      "# Read-only Scout login for the website. Paste these five into Vercel (Production). Git-ignored.",
      `PGHOST=${process.env.PGHOST}`,
      `PGPORT=${process.env.PGPORT ?? 5432}`,
      `PGDATABASE=${process.env.PGDATABASE ?? "postgres"}`,
      `PGUSER=${suffix ? `${READER}.${suffix}` : READER}`,
      `PGPASSWORD=${readerPassword}`,
      "",
    ].join("\n"), { mode: 0o600 });
    console.log(`Read-only login created; its settings are in ${target}`);
  } else if (!existsSync(READER_ENV)) {
    console.warn(`${READER} already existed but ${READER_ENV} is missing; reset its password to recreate it.`);
  }
} finally {
  await client.end();
  db.close();
}

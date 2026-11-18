// Scout data in Supabase PostgreSQL (schema "scout"), mirrored from scout-serving.db.
// The Scout engine is SQLite (44 synchronous queries), so the Vercel function rebuilds that SQLite file from
// Postgres at cold start instead of rewriting every query: same SQL, same indexes and planner stats, same answers.
// Connection: the standard PG* env vars (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD).
import pg from "pg";
import { DatabaseSync } from "node:sqlite";
import { SUPABASE_CA } from "./supabase-ca.js";

export const SCOUT_SCHEMA = "scout";
/** Holds the SQLite rowid of rowid tables in Postgres; restored as the rowid on load. */
export const ROWID_COLUMN = "__rowid";
const STAT_TABLE = "sqlite_stat1";

export function scoutPostgresConfigured(): boolean {
  return !!process.env.PGHOST?.trim() && !!process.env.PGPASSWORD;
}

export function scoutPostgresClient(extra: Partial<pg.ClientConfig> = {}): pg.Client {
  const host = process.env.PGHOST?.trim() ?? "";
  const client = new pg.Client({
    // Supabase signs with its own root CA; any other host must present a publicly trusted certificate.
    // A local test server (localhost) has no certificate; everything else is verified.
    ssl: host === "localhost" || host === "127.0.0.1" ? false
      : host.endsWith(".supabase.com") || host.endsWith(".supabase.co") ? { ca: SUPABASE_CA, rejectUnauthorized: true }
      : { rejectUnauthorized: true },
    connectionTimeoutMillis: 20_000,
    ...extra,
    // int8 arrives as a string by default; every Scout integer fits in a JS number.
    types: { getTypeParser: ((oid: number, format?: any) => (oid === 20 ? Number : pg.types.getTypeParser(oid, format))) as any },
  });
  // A dropped connection also fails the pending query; without a listener it would crash the whole process.
  client.on("error", error => console.error("Scout Postgres connection error", error.message));
  return client;
}

export const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** Rebuilds the Scout SQLite database at `file` from Postgres. Throws on any missing piece. */
export async function loadScoutFromPostgres(file: string): Promise<void> {
  const client = scoutPostgresClient();
  await client.connect();
  const db = new DatabaseSync(file);
  try {
    // Supabase defaults to 0 (15 digits), which rounds doubles read as text; 3 gives exact round-trip output.
    await client.query("SET extra_float_digits = 3");
    const schema = (await client.query<{ type: string; name: string; sql: string | null }>(
      `SELECT type, name, sql FROM ${SCOUT_SCHEMA}._sqlite_schema ORDER BY seq`)).rows;
    if (!schema.some(s => s.type === "table")) throw new Error("Postgres scout schema is empty");
    db.exec("PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;");

    for (const t of schema.filter(s => s.type === "table" && s.sql && s.name !== STAT_TABLE)) {
      db.exec(t.sql!);
      await copyRows(client, db, t.name);
    }
    for (const s of schema.filter(s => s.type !== "table" && s.sql)) db.exec(s.sql!);

    // Restore the original planner statistics so query plans (and tie order in results) match the source.
    if (schema.some(s => s.name === STAT_TABLE)) {
      db.exec(`ANALYZE; DELETE FROM ${STAT_TABLE};`);
      await copyRows(client, db, STAT_TABLE);
    }
  } finally {
    db.close();
    await client.end();
  }
}

async function copyRows(client: pg.Client, db: DatabaseSync, table: string) {
  const { rows, fields } = await client.query({ text: `SELECT * FROM ${SCOUT_SCHEMA}.${quote(table)}`, rowMode: "array" });
  if (!rows.length) return;
  const insert = db.prepare(
    `INSERT INTO ${quote(table)} (${fields.map(f => (f.name === ROWID_COLUMN ? "rowid" : quote(f.name))).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`);
  db.exec("BEGIN");
  for (const row of rows as unknown[][]) insert.run(...(row as any[]));
  db.exec("COMMIT");
}

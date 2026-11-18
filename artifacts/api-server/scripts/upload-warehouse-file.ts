// Uploads a SQLite file to Supabase as gzipped chunks (warehouse_files.chunks), for the Vercel function to load.
// Usage (from artifacts/api-server, as the master login):
//   npx tsx --env-file=../../env/supabase.env scripts/upload-warehouse-file.ts ../../sqlite.db sqlite.db
// The new copy is written under a staging name and swapped in one transaction, so readers never see a partial file.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { scoutPostgresClient } from "../src/services/scout/scout-postgres.js";
import { FILES_SCHEMA } from "../src/services/warehouse-files.js";

const [source, name] = process.argv.slice(2);
if (!source || !name) throw new Error("usage: upload-warehouse-file.ts <file> <name>");
const READER = "scout_reader"; // the read-only login the website uses
const CHUNK = 4 * 1024 * 1024;

const raw = readFileSync(source);
const gz = gzipSync(raw, { level: 9 });
if (!gunzipSync(gz).equals(raw)) throw new Error("gzip round-trip failed");
const sha256 = createHash("sha256").update(gz).digest("hex");
const parts = Math.ceil(gz.length / CHUNK);
console.log(`${name}: ${(raw.length / 1e6).toFixed(1)} MB -> ${(gz.length / 1e6).toFixed(1)} MB gzip, ${parts} chunks, sha256 ${sha256.slice(0, 12)}`);

const client = scoutPostgresClient();
await client.connect();
try {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${FILES_SCHEMA};
    CREATE TABLE IF NOT EXISTS ${FILES_SCHEMA}.chunks (
      name text NOT NULL, part int NOT NULL, parts int NOT NULL, sha256 text NOT NULL, data bytea NOT NULL,
      uploaded_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (name, part));
    GRANT USAGE ON SCHEMA ${FILES_SCHEMA} TO ${READER};
    GRANT SELECT ON ${FILES_SCHEMA}.chunks TO ${READER};`);
  const stage = `${name}.staging`;
  await client.query(`DELETE FROM ${FILES_SCHEMA}.chunks WHERE name = $1`, [stage]);
  for (let part = 0; part < parts; part++) {
    for (let attempt = 1; ; attempt++) {
      try {
        await client.query(`INSERT INTO ${FILES_SCHEMA}.chunks (name, part, parts, sha256, data) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name, part) DO UPDATE SET data = EXCLUDED.data`, [stage, part, parts, sha256, gz.subarray(part * CHUNK, (part + 1) * CHUNK)]);
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        console.warn(`chunk ${part} failed (${(e as Error).message}), retrying`);
      }
    }
    process.stdout.write(`\r  uploaded ${part + 1}/${parts}`);
  }
  console.log();
  // Server-side check before the swap: same bytes as local.
  const { rows: [check] } = await client.query<{ n: number; hash: string }>(
    `SELECT count(*)::int n, encode(sha256(string_agg(data, ''::bytea ORDER BY part)), 'hex') hash FROM ${FILES_SCHEMA}.chunks WHERE name = $1`, [stage]);
  if (check.n !== parts || check.hash !== sha256) throw new Error(`server copy differs: ${check.n} chunks, ${check.hash}`);
  await client.query("BEGIN");
  await client.query(`DELETE FROM ${FILES_SCHEMA}.chunks WHERE name = $1`, [name]);
  await client.query(`UPDATE ${FILES_SCHEMA}.chunks SET name = $1 WHERE name = $2`, [name, stage]);
  await client.query("COMMIT");
  console.log(`swapped in ${name} (verified server-side)`);
} finally {
  await client.end();
}

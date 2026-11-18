// Whole SQLite files kept in Supabase as gzipped chunks (table warehouse_files.chunks). The Vercel function
// rebuilds the file in /tmp at cold start. One file transfer is far smaller and faster than copying millions of
// rows, and the SQLite engines keep running unchanged. Connection: the PG* env vars (read-only login in Vercel).
import { createHash } from "node:crypto";
import { writeFileSync, renameSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { scoutPostgresClient } from "./scout/scout-postgres.js";

export const FILES_SCHEMA = "warehouse_files";
const ATTEMPTS = 3;
// A stalled read must fail fast and retry, not hang the cold start.
const connect = async () => { const c = scoutPostgresClient({ query_timeout: 30_000 }); await c.connect(); return c; };

/** Downloads `name` one chunk per query (a single 30 MB result can drop the pooler connection), checks its
 *  checksum, and writes the decompressed file to `dest` atomically. */
export async function loadWarehouseFile(name: string, dest: string): Promise<void> {
  let client = await connect();
  try {
    const { rows: [meta] } = await client.query<{ parts: number; sha256: string; n: number }>(
      `SELECT max(parts) parts, max(sha256) sha256, count(*)::int n FROM ${FILES_SCHEMA}.chunks WHERE name = $1`, [name]);
    if (!meta?.n) throw new Error(`warehouse file ${name} not found`);
    if (meta.n !== meta.parts) throw new Error(`warehouse file ${name} is incomplete`);
    const chunks: Buffer[] = [];
    for (let part = 0; part < meta.parts; part++) {
      for (let attempt = 1; ; attempt++) {
        try {
          const { rows } = await client.query<{ data: Buffer }>(
            `SELECT data FROM ${FILES_SCHEMA}.chunks WHERE name = $1 AND part = $2`, [name, part]);
          if (rows.length !== 1) throw new Error(`warehouse file ${name} chunk ${part} missing`);
          chunks.push(rows[0].data);
          break;
        } catch (error) {
          if (attempt >= ATTEMPTS) throw error;
          await client.end().catch(() => {});
          client = await connect();
        }
      }
    }
    const gz = Buffer.concat(chunks);
    if (createHash("sha256").update(gz).digest("hex") !== meta.sha256) throw new Error(`warehouse file ${name} checksum mismatch`);
    const tmp = `${dest}.loading`;
    rmSync(tmp, { force: true });
    writeFileSync(tmp, gunzipSync(gz));
    renameSync(tmp, dest);
  } finally {
    await client.end().catch(() => {});
  }
}

/** A folder stored as one JSON pack ({ "<file name>": "<contents>" }); unpacked into `destDir`. */
export async function loadWarehouseDir(name: string, destDir: string): Promise<void> {
  const packFile = `${destDir}.pack.json`;
  await loadWarehouseFile(name, packFile);
  const pack = JSON.parse(readFileSync(packFile, "utf8")) as Record<string, string>;
  const staging = `${destDir}.loading`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  for (const [file, body] of Object.entries(pack)) {
    if (file !== basename(file)) throw new Error(`bad file name in pack ${name}: ${file}`); // no paths, no traversal
    writeFileSync(join(staging, file), body);
  }
  rmSync(packFile, { force: true });
  renameSync(staging, destDir);
}

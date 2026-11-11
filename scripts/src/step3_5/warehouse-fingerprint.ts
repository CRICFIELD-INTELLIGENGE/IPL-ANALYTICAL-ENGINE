// Step 3.5 — logical fingerprint of a SQLite warehouse: row count and SHA-256 of every table's rows.
//
//   tsx src/step3_5/warehouse-fingerprint.ts --db <sqlite file> [--out fingerprint.json] [--compare other.json]
//
// Read-only. Rows are hashed in rowid order over every column except the five proposed per-type extras
// columns (wide_runs, noball_runs, bye_runs, legbye_runs, penalty_runs), so a migrated copy can be shown to
// hold exactly the original data. File hashes are not used: sqlite.db runs in WAL mode, so its bytes change
// on a checkpoint without any change to its content.

import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "../global/paths";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const { values } = parseArgs(process.argv.slice(2));
const dbPath = values.get("db");
if (!dbPath) throw new Error("--db <sqlite file> is required");
const NEW = new Set(["wide_runs", "noball_runs", "bye_runs", "legbye_runs", "penalty_runs"]);

const db = new DatabaseSync(dbPath, { readOnly: true });
const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Any[]).map((r) => r.name as string);
const out: Record<string, { rows: number; sha256: string; columns: number }> = {};
for (const t of tables) {
  const cols = (db.prepare(`PRAGMA table_info("${t}")`).all() as Any[]).map((c) => c.name as string).filter((c) => !NEW.has(c));
  const h = crypto.createHash("sha256");
  let rows = 0;
  for (const r of db.prepare(`SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "${t}" ORDER BY rowid`).iterate() as Iterable<Any>) {
    h.update(JSON.stringify(Object.values(r)));
    h.update("\n");
    rows++;
  }
  out[t] = { rows, sha256: h.digest("hex"), columns: cols.length };
}
db.close();
if (values.get("out")) fs.writeFileSync(values.get("out")!, JSON.stringify(out, null, 1));
const compare = values.get("compare");
if (compare) {
  const other: typeof out = JSON.parse(fs.readFileSync(compare, "utf8"));
  const diff = [...new Set([...Object.keys(out), ...Object.keys(other)])].filter((t) => out[t]?.sha256 !== other[t]?.sha256);
  console.log(diff.length ? `DIFFERENT tables: ${diff.join(", ")}` : `IDENTICAL: ${tables.length} tables, ${Object.values(out).reduce((a, x) => a + x.rows, 0)} rows`);
  process.exitCode = diff.length ? 1 : 0;
} else {
  console.log(`${tables.length} tables, ${Object.values(out).reduce((a, x) => a + x.rows, 0)} rows; deliveries ${out.deliveries?.rows} rows sha256 ${out.deliveries?.sha256.slice(0, 16)}`);
}

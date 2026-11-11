// Day 4.5 — logical fingerprint of a SQLite database (opened read-only): integrity_check, then per table the row
// count and a SHA-256 over every row in primary-key order. Two databases with equal fingerprints hold the same
// data, whatever their page layout (a VACUUM INTO copy has a different file hash but the same fingerprint).
//
//   tsx src/day4/db-fingerprint.ts <db> [<db2> ...] [--json out.json]

import crypto from "node:crypto";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export function fingerprint(file: string) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = (db.prepare("PRAGMA integrity_check").all() as { integrity_check: string }[]).map((r) => r.integrity_check).join("; ");
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[]).map((r) => r.name);
    const out: Record<string, { rows: number; sha256: string }> = {};
    for (const t of tables) {
      const cols = (db.prepare(`PRAGMA table_info("${t}")`).all() as { name: string; pk: number }[]);
      const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => `"${c.name}"`);
      const order = pk.length ? pk.join(", ") : cols.map((c) => `"${c.name}"`).join(", ");
      const h = crypto.createHash("sha256");
      let rows = 0;
      for (const r of db.prepare(`SELECT * FROM "${t}" ORDER BY ${order}`).iterate() as Iterable<Record<string, unknown>>) {
        h.update(JSON.stringify(cols.map((c) => r[c.name])));
        h.update("\n");
        rows++;
      }
      out[t] = { rows, sha256: h.digest("hex") };
    }
    const schema = crypto.createHash("sha256").update(JSON.stringify(db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all())).digest("hex");
    return { file, integrity, schema, tables: out };
  } finally {
    db.close();
  }
}

if (process.argv[1]?.endsWith("db-fingerprint.ts")) {
  const args = process.argv.slice(2);
  const ji = args.indexOf("--json");
  const jsonOut = ji >= 0 ? args.splice(ji, 2)[1] : undefined;
  const fps = args.map(fingerprint);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(fps, null, 2));
  for (const f of fps) console.log(f.file, "| integrity:", f.integrity, "| schema", f.schema.slice(0, 12), "| tables", Object.keys(f.tables).length, "| rows", Object.values(f.tables).reduce((s, t) => s + t.rows, 0));
  if (fps.length > 1) {
    const [a, ...rest] = fps;
    for (const b of rest) {
      const diff = [...new Set([...Object.keys(a.tables), ...Object.keys(b.tables)])].filter((t) => a.tables[t]?.sha256 !== b.tables[t]?.sha256);
      console.log(`${a.file} vs ${b.file}: schema ${a.schema === b.schema ? "same" : "DIFFERENT"}; tables differing: ${diff.length ? diff.map((t) => `${t} (${a.tables[t]?.rows} → ${b.tables[t]?.rows})`).join(", ") : "none"}`);
    }
  }
}

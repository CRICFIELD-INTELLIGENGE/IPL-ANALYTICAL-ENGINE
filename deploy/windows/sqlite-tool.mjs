// Tiny SQLite helper for the PowerShell scripts (avoids quoting SQL through PowerShell).
//   node sqlite-tool.mjs check  <db>          → prints "ok" or the integrity_check problems; exit 1 if not ok
//   node sqlite-tool.mjs backup <db> <out>    → consistent copy via VACUUM INTO, then integrity_check of the copy
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

const [cmd, db, out] = process.argv.slice(2);
const check = (file) => {
  const rows = new DatabaseSync(file, { readOnly: true }).prepare("PRAGMA integrity_check").all();
  return rows.map((r) => r.integrity_check).join("; ");
};

if (cmd === "check" && db) {
  const result = check(db);
  console.log(result);
  process.exit(result === "ok" ? 0 : 1);
} else if (cmd === "backup" && db && out) {
  if (existsSync(out)) throw new Error(`refusing to overwrite ${out}`);
  const src = new DatabaseSync(db, { readOnly: true });
  src.prepare("VACUUM INTO ?").run(out);
  src.close();
  const result = check(out);
  console.log(result);
  process.exit(result === "ok" ? 0 : 1);
} else {
  console.error("usage: sqlite-tool.mjs check <db> | backup <db> <out>");
  process.exit(2);
}

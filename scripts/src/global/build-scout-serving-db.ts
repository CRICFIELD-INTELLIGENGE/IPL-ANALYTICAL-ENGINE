// Builds scout-serving.db: global.db minus the ball-by-ball rows Scout never reads, small enough for the
// Turso snapshot the Vercel function loads (its cap is 220 MB; full global.db is ~231 MB).
// Scout reads deliveries only for SMAT Plate matches (scout-service.ts lower-tier split), so those are kept.
// Verified 2026-11-17: every /api/scout/* response was byte-identical against full global.db.
// Usage: pnpm --filter @workspace/scripts run global:scout-serving
import { DatabaseSync } from "node:sqlite";
import { rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const warehouse = fileURLToPath(new URL("../../../lib/cricket-data/global/warehouse/", import.meta.url));
const src = `${warehouse}global.db`;
const out = `${warehouse}scout-serving.db`;

rmSync(out, { force: true });
const source = new DatabaseSync(src, { readOnly: true });
source.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
source.close();

const db = new DatabaseSync(out);
db.exec(`
  DELETE FROM deliveries WHERE match_id NOT IN (SELECT match_id FROM matches WHERE event_group LIKE '%Plate%');
  DELETE FROM wickets; DELETE FROM wicket_fielders; DELETE FROM reviews; DELETE FROM replacements; DELETE FROM powerplays;
  VACUUM;
`);
const check = (db.prepare("PRAGMA quick_check").get() as { quick_check: string }).quick_check;
db.close();
if (check !== "ok") throw new Error(`scout-serving.db failed quick_check: ${check}`);
const mb = statSync(out).size / 1048576;
if (mb > 220) throw new Error(`scout-serving.db is ${mb.toFixed(1)} MB, over the 220 MB snapshot cap`);
console.log(`Wrote ${out} (${mb.toFixed(1)} MB)`);

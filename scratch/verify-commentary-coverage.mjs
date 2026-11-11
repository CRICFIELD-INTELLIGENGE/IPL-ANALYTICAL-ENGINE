// How many of the 1243 matches can actually show ball-by-ball commentary, and
// how complete each one is against the delivery count for that match.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("sqlite.db", { readOnly: true });
const ids = fs.readdirSync("lib/cricket-data/raw").filter(f => /^\d+\.json$/.test(f)).map(f => f.replace(".json", ""));

const balls = new Map(db.prepare("select match_id, count(*) c from deliveries group by match_id").all().map(r => [String(r.match_id), r.c]));
const comm = new Map(db.prepare("select match_id, count(*) c from delivery_commentary group by match_id").all().map(r => [String(r.match_id), r.c]));

let full = 0, partial = 0, none = 0, totalBalls = 0, totalComm = 0;
const partials = [];
for (const id of ids) {
  const b = balls.get(id) ?? 0;
  const c = comm.get(id) ?? 0;
  totalBalls += b; totalComm += c;
  if (c === 0) none++;
  else if (b > 0 && c >= b * 0.98) full++;
  else { partial++; if (partials.length < 8) partials.push(`${id}: ${c}/${b} balls`); }
}
console.log(`matches: ${ids.length}`);
console.log(`  full commentary   : ${full}`);
console.log(`  partial           : ${partial}`);
console.log(`  none              : ${none}`);
console.log(`\nballs: ${totalComm} of ${totalBalls} carry commentary (${((totalComm / totalBalls) * 100).toFixed(1)}%)`);
for (const p of partials) console.log("   partial — " + p);
const missing = ids.filter(id => (comm.get(id) ?? 0) === 0);
if (missing.length) console.log("\nno commentary: " + missing.join(", "));

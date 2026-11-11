// Unclassified deliveries from one season only, so era-specific phrasing can be
// read directly instead of being averaged away by the modern seasons.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { parseDelivery } from "./parse-commentary.mjs";
const [, , dir, wantSeason, field, limit = "16"] = process.argv;
const db = new DatabaseSync("sqlite.db");
const season = new Map(db.prepare("select match_id, season_id from matches").all().map(r => [String(r.match_id), String(r.season_id)]));
let n = 0, seen = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  if (season.get(String(j.matchId)) !== wantSeason) continue;
  for (const inn of j.innings ?? []) for (const d of inn.deliveries ?? []) {
    if (!d.text) continue;
    seen++;
    if (parseDelivery(d.text)[field] == null && n < Number(limit)) { console.log("  •", d.text.slice(0, 105)); n++; }
  }
  if (n >= Number(limit)) break;
}
console.log(`\n(${seen} deliveries scanned in ${wantSeason})`);

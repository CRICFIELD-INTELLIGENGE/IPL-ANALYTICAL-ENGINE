// Coverage broken down by season. Commentary style changed a lot over 18 years,
// and a rule set tuned on 2017 could quietly fail on 2008 while the overall
// average still looks healthy.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { parseDelivery, FIELDS } from "./parse-commentary.mjs";

const dir = process.argv[2];
const db = new DatabaseSync("sqlite.db");
const season = new Map(
  db.prepare("select match_id, season_id from matches").all().map(r => [String(r.match_id), r.season_id]),
);

const acc = new Map();
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  const s = season.get(String(j.matchId)) ?? "?";
  let a = acc.get(s);
  if (!a) { a = { balls: 0, ...Object.fromEntries(FIELDS.map(k => [k, 0])) }; acc.set(s, a); }
  for (const inn of j.innings ?? []) for (const d of inn.deliveries ?? []) {
    if (d.over == null || !d.text) continue;
    a.balls++;
    const p = parseDelivery(d.text);
    for (const k of FIELDS) if (p[k] != null) a[k]++;
  }
}

const show = ["length", "line", "variation", "shot", "zone"];
console.log("season   balls   " + show.map(s => s.padStart(9)).join(""));
for (const [s, a] of [...acc].sort()) {
  const pct = (n) => (((n / a.balls) * 100).toFixed(0) + "%").padStart(9);
  console.log(String(s).padEnd(8) + String(a.balls).padStart(6) + "   " + show.map(k => pct(a[k])).join(""));
}

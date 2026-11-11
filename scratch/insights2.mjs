import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("sqlite.db", { readOnly: true });
const all = (s, ...a) => db.prepare(s).all(...a);

// margin_type is NULL for every row in the DB, so the chase/defend split comes
// from the archived match list, where the margin is recorded as text.
const ms = JSON.parse(fs.readFileSync("artifacts/ipl-analytics/public/data/matches.json", "utf8"));
const era = m => (Number(String(m.season).slice(0, 4)) >= 2023 ? "2023-2026" : "2008-2022");
const acc = {};
for (const m of ms) {
  if (!m.winner || !m.margin) continue;
  const e = era(m);
  acc[e] ??= { n: 0, chased: 0 };
  acc[e].n++;
  if (/wkt|wicket/i.test(m.margin)) acc[e].chased++;
}
console.log("Chase win rate by era (from archived margins):");
for (const [e, v] of Object.entries(acc)) console.log(`  ${e}: ${((v.chased / v.n) * 100).toFixed(1)}% chased of ${v.n} decided`);

console.log("\nDeath-over economy (min 900 death balls):");
for (const r of all(`select p.name, count(*) b, round(sum(d.total_runs)*6.0/count(*),2) econ
  from deliveries d join players p on p.player_id=d.bowler_id
  where d.over_num>=15 group by d.bowler_id having b>=900 order by econ asc limit 6`))
  console.log(`  ${r.name.padEnd(22)} ${r.econ} econ (${r.b} balls)`);

console.log("\nRuns per over conceded, by length (league-wide):");
for (const r of all(`select c.length, count(*) b, round(sum(d.batter_runs)*6.0/count(*),2) rpo,
    sum(case when dis.dismissal_id is not null then 1 else 0 end) w
  from deliveries d join delivery_commentary c on c.delivery_id=d.delivery_id
  left join dismissals dis on dis.delivery_id=d.delivery_id
  where c.length is not null group by c.length order by rpo asc`))
  console.log(`  ${r.length.padEnd(20)} ${String(r.rpo).padStart(5)} rpo | ${String(r.w).padStart(5)} wkts | ${r.b} balls`);

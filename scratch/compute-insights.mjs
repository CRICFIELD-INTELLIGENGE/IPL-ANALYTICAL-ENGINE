// Computes candidate insight numbers from the engine's own data.
//
// Several of these deliberately test claims made in the referenced articles —
// an insight that independently reproduces (or fails to reproduce) someone
// else's published finding is worth more than one asserted from nowhere.

import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("sqlite.db", { readOnly: true });
const all = (s, ...a) => db.prepare(s).all(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

const seasonYear = "CAST(substr(m.season_id, 1, 4) AS INTEGER)";

console.log("=== 1. Runs per innings, before vs during the Impact Player era ===");
for (const [label, cond] of [["2008-2022", `${seasonYear} < 2023`], ["2023-2026", `${seasonYear} >= 2023`]]) {
  const r = one(`
    SELECT COUNT(DISTINCT d.innings_id) inns, SUM(d.total_runs) runs, COUNT(*) balls
      FROM deliveries d JOIN matches m ON m.match_id = d.match_id
     WHERE ${cond}`);
  console.log(`  ${label}: ${(r.runs / r.inns).toFixed(1)} runs/innings over ${r.inns} innings`);
}

console.log("\n=== 2. Toss-winner win rate, both eras (Misra: 51.8% in both) ===");
for (const [label, cond] of [["2008-2022", `${seasonYear} < 2023`], ["2023-2026", `${seasonYear} >= 2023`]]) {
  const r = one(`
    SELECT COUNT(*) n,
           SUM(CASE WHEN m.toss_winner_id = m.winner_id THEN 1 ELSE 0 END) won
      FROM matches m
     WHERE ${cond} AND m.winner_id IS NOT NULL AND m.toss_winner_id IS NOT NULL`);
  console.log(`  ${label}: ${((r.won / r.n) * 100).toFixed(1)}% of ${r.n} decided matches`);
}

console.log("\n=== 3. Sixes per match, both eras ===");
for (const [label, cond] of [["2008-2022", `${seasonYear} < 2023`], ["2023-2026", `${seasonYear} >= 2023`]]) {
  const r = one(`
    SELECT COUNT(DISTINCT d.match_id) mts, SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes
      FROM deliveries d JOIN matches m ON m.match_id = d.match_id WHERE ${cond}`);
  console.log(`  ${label}: ${(r.sixes / r.mts).toFixed(1)} sixes/match`);
}

console.log("\n=== 4. Death-over economy, all time (best, min 1500 balls) ===");
for (const r of all(`
  SELECT p.name, COUNT(*) balls, SUM(d.total_runs) runs,
         ROUND(SUM(d.total_runs) * 6.0 / COUNT(*), 2) econ
    FROM deliveries d JOIN players p ON p.player_id = d.bowler_id
   WHERE d.over_num >= 15
   GROUP BY d.bowler_id HAVING balls >= 1500 ORDER BY econ ASC LIMIT 5`)) {
  console.log(`  ${r.name.padEnd(22)} ${r.econ} econ over ${r.balls} death balls`);
}

console.log("\n=== 5. What the commentary says a batter faces (top run-scorers) ===");
for (const name of ["V Kohli", "RG Sharma", "MS Dhoni", "AB de Villiers", "SK Raina"]) {
  const rows = all(`
    SELECT c.length, COUNT(*) balls, SUM(d.batter_runs) runs,
           ROUND(SUM(d.batter_runs) * 100.0 / COUNT(*), 1) sr
      FROM deliveries d
      JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
      JOIN players p ON p.player_id = d.batter_id
     WHERE p.name = ? AND c.length IS NOT NULL AND d.is_wide = 0
     GROUP BY c.length HAVING balls >= 150 ORDER BY sr DESC`, name);
  if (!rows.length) continue;
  const best = rows[0], worst = rows[rows.length - 1];
  console.log(`  ${name}: best ${best.length} SR ${best.sr} (${best.balls}b) | worst ${worst.length} SR ${worst.sr} (${worst.balls}b)`);
}

console.log("\n=== 6. Where the league scores: top zones by runs ===");
for (const r of all(`
  SELECT c.zone, SUM(d.batter_runs) runs, COUNT(*) balls,
         ROUND(SUM(d.batter_runs) * 100.0 / COUNT(*), 1) sr
    FROM deliveries d JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
   WHERE c.zone IS NOT NULL GROUP BY c.zone ORDER BY runs DESC LIMIT 6`)) {
  console.log(`  ${r.zone.padEnd(18)} ${r.runs} runs @ SR ${r.sr}`);
}

console.log("\n=== 7. Chasing vs defending win rate, both eras ===");
for (const [label, cond] of [["2008-2022", `${seasonYear} < 2023`], ["2023-2026", `${seasonYear} >= 2023`]]) {
  const r = one(`
    SELECT COUNT(*) n,
           SUM(CASE WHEN m.margin_type = 'wickets' THEN 1 ELSE 0 END) chased
      FROM matches m WHERE ${cond} AND m.winner_id IS NOT NULL`);
  console.log(`  ${label}: chases won ${((r.chased / r.n) * 100).toFixed(1)}% of ${r.n} decided matches`);
}

console.log("\n=== 8. Venue extremes (min 30 matches) ===");
for (const r of all(`
  SELECT v.name, COUNT(DISTINCT d.match_id) mts,
         ROUND(SUM(d.total_runs) * 6.0 / COUNT(*), 2) rpo
    FROM deliveries d
    JOIN matches m ON m.match_id = d.match_id
    JOIN venues v ON v.venue_id = m.venue_id
   GROUP BY v.venue_id HAVING mts >= 30 ORDER BY rpo DESC LIMIT 3`)) {
  console.log(`  HIGH ${r.name.slice(0, 40).padEnd(42)} ${r.rpo} rpo over ${r.mts} matches`);
}
for (const r of all(`
  SELECT v.name, COUNT(DISTINCT d.match_id) mts,
         ROUND(SUM(d.total_runs) * 6.0 / COUNT(*), 2) rpo
    FROM deliveries d
    JOIN matches m ON m.match_id = d.match_id
    JOIN venues v ON v.venue_id = m.venue_id
   GROUP BY v.venue_id HAVING mts >= 30 ORDER BY rpo ASC LIMIT 3`)) {
  console.log(`  LOW  ${r.name.slice(0, 40).padEnd(42)} ${r.rpo} rpo over ${r.mts} matches`);
}

console.log("\n=== 9. Most common dismissal, and the bowler's length when it happens ===");
for (const r of all(`
  SELECT c.length, COUNT(*) n FROM dismissals dis
    JOIN delivery_commentary c ON c.delivery_id = dis.delivery_id
   WHERE c.length IS NOT NULL AND dis.kind NOT IN ('run out','retired hurt','retired out')
   GROUP BY c.length ORDER BY n DESC LIMIT 5`)) {
  console.log(`  ${r.length.padEnd(20)} ${r.n} wickets`);
}

console.log("\n=== 10. Schema check ===");
console.log("  matches cols:", Object.keys(one("select * from matches limit 1")).join(", "));

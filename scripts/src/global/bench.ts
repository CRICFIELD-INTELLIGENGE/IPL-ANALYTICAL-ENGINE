// Global data engine — storage and query benchmarks.
//
//   pnpm --filter @workspace/scripts run global:bench [--vacuum]
//
// Reports global.db size (overall and per table) and times representative
// read-only queries on a fresh connection. --vacuum compacts the file first.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { GLOBAL_DIR, REPORT_DIR, WAREHOUSE_PATH, ensureDir, parseArgs, today } from "./paths";

function dirSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

function time<T>(fn: () => T, runs = 5): { ms: number; coldMs: number; result: T } {
  const t0 = performance.now();
  const result = fn();
  const coldMs = performance.now() - t0;
  const t1 = performance.now();
  for (let i = 1; i < runs; i++) fn();
  return { ms: runs > 1 ? (performance.now() - t1) / (runs - 1) : coldMs, coldMs, result };
}

const MB = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

const { flags } = parseArgs(process.argv.slice(2));
if (flags.has("vacuum")) {
  const w = new DatabaseSync(WAREHOUSE_PATH);
  const before = fs.statSync(WAREHOUSE_PATH).size;
  w.exec("PRAGMA wal_checkpoint(TRUNCATE); VACUUM; PRAGMA optimize;");
  w.close();
  console.log(`VACUUM: ${MB(before)} → ${MB(fs.statSync(WAREHOUSE_PATH).size)}`);
}

const openStart = performance.now();
const db = new DatabaseSync(WAREHOUSE_PATH, { readOnly: true });
const openMs = performance.now() - openStart;
const q = <T>(sql: string, ...p: (string | number)[]) => db.prepare(sql).all(...p) as unknown as T[];

const sizes = q<{ name: string; bytes: number }>("SELECT name, SUM(pgsize) bytes FROM dbstat GROUP BY name ORDER BY bytes DESC");
const counts = q<{ balls: number; matches: number }>("SELECT (SELECT COUNT(*) FROM deliveries) balls, (SELECT COUNT(*) FROM matches) matches")[0];
const dbBytes = fs.statSync(WAREHOUSE_PATH).size;

// A player who appears in several Batch 1 competitions, chosen from the data rather than by name.
const traveller = q<{ player_key: number; cricsheet_id: string; unique_name: string }>(`
  SELECT a.player_key, p.cricsheet_id, p.unique_name FROM agg_appearances a JOIN players p USING (player_key)
  GROUP BY a.player_key ORDER BY COUNT(DISTINCT a.competition_id) DESC, SUM(a.matches) DESC LIMIT 1`)[0];

const benches = [
  {
    name: "Cross-league profile: one player, every competition and season (batting + bowling, all phases)",
    run: () => [
      ...q("SELECT competition, season_label, matches, runs, balls_faced, strike_rate, average FROM v_batting WHERE player_key = ? AND phase = 'all' ORDER BY competition, season_label", traveller.player_key),
      ...q("SELECT competition, season_label, legal_balls, wickets, economy FROM v_bowling WHERE player_key = ? AND phase = 'all' ORDER BY competition, season_label", traveller.player_key),
    ].length,
  },
  {
    name: "Leaderboard: SMAT batting strike rate, career, ≥120 balls faced",
    run: () => q(`SELECT player_key, SUM(runs) r, SUM(balls_faced) b, 100.0 * SUM(runs) / SUM(balls_faced) sr FROM agg_batting
      WHERE competition_id = (SELECT competition_id FROM competitions WHERE code = 'smat') AND phase = 'all'
      GROUP BY player_key HAVING b >= 120 ORDER BY sr DESC LIMIT 25`).length,
  },
  {
    name: "Scouting filter: middle-overs bowlers in SMAT, SA20 and BBL, ≥120 legal balls, by economy",
    run: () => q(`SELECT player_key, c.code, SUM(legal_balls) lb, SUM(wickets) w, 6.0 * SUM(runs_conceded) / SUM(legal_balls) econ
      FROM agg_bowling JOIN competitions c USING (competition_id) WHERE c.code IN ('smat', 'sa20', 'bbl') AND phase = 'middle'
      GROUP BY player_key, competition_id HAVING lb >= 120 ORDER BY econ LIMIT 50`).length,
  },
  {
    name: "Ball-level drill-down: every delivery faced by that player (index on batter)",
    run: () => q("SELECT COUNT(*) n, SUM(runs_batter) r FROM deliveries WHERE batter = ?", traveller.player_key).length,
  },
  {
    name: "Competition baselines by season and phase (all Batch 1)",
    run: () => q("SELECT competition, season_label, phase, run_rate, economy, boundary_pct FROM v_competition_baselines").length,
  },
];

const results = benches.map((b) => { const t = time(b.run); return { name: b.name, coldMs: t.coldMs, warmMs: t.ms, rows: t.result }; });
const rss = process.memoryUsage().rss;
db.close();

const md: string[] = [`# Benchmarks — ${today()}`, ""];
md.push(`- global.db: **${MB(dbBytes)}** for ${counts.matches.toLocaleString("en-US")} matches and ${counts.balls.toLocaleString("en-US")} deliveries (${Math.round(dbBytes / counts.balls)} bytes per delivery, all tables and indexes).`);
md.push(`- Raw archives + registers kept: ${MB(dirSize(path.join(GLOBAL_DIR, "raw")))}.`);
md.push(`- Open read-only connection: ${openMs.toFixed(1)} ms. Process RSS after all queries: ${MB(rss)}.`);
md.push(`- Example player for the profile queries (most competitions in the data): ${traveller.unique_name} (${traveller.cricsheet_id}).`, "");
md.push("| Query | First run | Warm (avg of 4) | Rows |", "|---|---:|---:|---:|");
for (const r of results) md.push(`| ${r.name} | ${r.coldMs.toFixed(1)} ms | ${r.warmMs.toFixed(1)} ms | ${r.rows} |`);
md.push("", "Largest tables and indexes:", "", "| Object | Size |", "|---|---:|");
for (const s of sizes.slice(0, 16)) md.push(`| ${s.name} | ${MB(s.bytes)} |`);
ensureDir(REPORT_DIR);
fs.writeFileSync(path.join(REPORT_DIR, `bench-${today()}.md`), md.join("\n") + "\n");
console.log(md.join("\n"));

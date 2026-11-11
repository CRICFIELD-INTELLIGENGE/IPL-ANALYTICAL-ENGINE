// Day 4 — compare derived analytics tables between two databases (both opened read-only).
//   tsx src/day4/diff-derived.ts <a.db> <b.db> [--json out.json]
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const [aPath, bPath] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : undefined;
const KEYS: Record<string, string[]> = {
  player_career_stats: ["player_id"], player_team_stats: ["player_id", "team_id"], player_season_stats: ["player_id", "season_id"],
  player_phase_stats: ["player_id", "phase"], player_matchups: ["batter_id", "bowler_id"], venue_intelligence: ["venue_id"],
  team_intelligence: ["team_id"], auction_roi: ["player_id"],
};
const A = new DatabaseSync(aPath, { readOnly: true }), B = new DatabaseSync(bPath, { readOnly: true });
const report: Record<string, unknown> = {};
for (const [t, key] of Object.entries(KEYS)) {
  const cols = (A.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
  if (!key.every((k) => cols.includes(k))) { report[t] = { error: `key ${key} not in ${cols}` }; continue; }
  const load = (d: DatabaseSync) => new Map((d.prepare(`SELECT * FROM ${t}`).all() as Record<string, unknown>[]).map((r) => [key.map((k) => r[k]).join(":"), r]));
  const a = load(A), b = load(B);
  const byCol: Record<string, number> = {};
  let changed = 0;
  const examples: unknown[] = [];
  for (const [k, ra] of a) {
    const rb = b.get(k); if (!rb) continue;
    const diff = cols.filter((c) => !(typeof ra[c] === "number" && typeof rb[c] === "number" ? Math.abs((ra[c] as number) - (rb[c] as number)) < 1e-9 : ra[c] === rb[c]));
    if (diff.length) { changed++; for (const c of diff) byCol[c] = (byCol[c] ?? 0) + 1; if (examples.length < 5) examples.push({ k, ...Object.fromEntries(diff.map((c) => [c, `${ra[c]} → ${rb[c]}`])) }); }
  }
  report[t] = { rowsA: a.size, rowsB: b.size, onlyA: [...a.keys()].filter((k) => !b.has(k)).length, onlyB: [...b.keys()].filter((k) => !a.has(k)).length, changedRows: changed, byColumn: byCol, examples };
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));

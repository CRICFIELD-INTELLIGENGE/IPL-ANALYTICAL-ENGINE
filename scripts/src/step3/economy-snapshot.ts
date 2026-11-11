// Step 3 review harness — snapshot of IPL outputs that depend (or must not depend) on runs conceded.
//
//   tsx src/step3/economy-snapshot.ts --src <api-server/src directory> --out <snapshot.json>
//
// Run once against the current source (baseline) and once against a patched copy, then compare with
// economy-compare.ts. Run from the repository root: the warehouse modules locate sqlite.db from the
// working directory. Read-only: only SELECT statements run against sqlite.db.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { REPO, parseArgs } from "../global/paths";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const { values } = parseArgs(process.argv.slice(2));
const src = path.resolve(values.get("src") ?? path.join(REPO, "artifacts", "api-server", "src"));
const out = values.get("out") ?? "economy-snapshot.json";
const load = (rel: string): Promise<Any> => import(pathToFileURL(path.join(src, rel)).href);

const ipl = new DatabaseSync(path.join(REPO, "sqlite.db"), { readOnly: true });
const idOf = (name: string) => (ipl.prepare("SELECT player_id FROM players WHERE name = ?").get(name) as { player_id: number } | undefined)?.player_id;
const BOWLERS = ["JJ Bumrah", "Rashid Khan", "YS Chahal", "Arshdeep Singh", "SP Narine", "B Kumar"];
const BATTERS = ["V Kohli", "SA Yadav", "RG Sharma", "AB de Villiers"];

const { getBallColumns, F_LEGAL, F_WICKET } = await load("services/decision/ball-context.ts");
const { runStatQuery } = await load("services/decision/stats-engine.ts");
const { getSeasonLines } = await load("services/decision/player-profiles.ts");
const { scanPlayer } = await load("services/decision/weakness-detector.ts");
const { getProfiles, bowlerPhaseLine, batterPhaseLine } = await load("services/decision/match-model.ts");
const { aggregateQueryStats } = await load("services/stats-aggregator.ts");

// 1. Column store.
const c = getBallColumns();
const bowlerConceded: Record<number, number> = {}, batterRuns: Record<number, number> = {};
let totalRuns = 0, batRuns = 0, conceded = 0, legal = 0, wickets = 0;
for (let i = 0; i < c.n; i++) {
  totalRuns += c.totalRuns[i]; batRuns += c.batterRuns[i]; conceded += c.conceded[i];
  if (c.flags[i] & F_LEGAL) legal++;
  if (c.flags[i] & F_WICKET) wickets++;
  bowlerConceded[c.bowler[i]] = (bowlerConceded[c.bowler[i]] ?? 0) + c.conceded[i];
  batterRuns[c.batter[i]] = (batterRuns[c.batter[i]] ?? 0) + c.batterRuns[i];
}

// 2. Advanced-stats engine (decision OS). `related` queries may change; the rest must be identical.
const q = (perspective: string, metric: string, groupBy: string, filters: Record<string, unknown> = {}, limit = 40) =>
  ({ perspective, metric, groupBy, order: "desc", sortBy: "metric", limit, filters });
const QUERIES: { id: string; related: boolean; query: Any }[] = [
  { id: "bowl_economy_by_player", related: true, query: { ...q("bowling", "economy", "player"), order: "asc" } },
  { id: "bowl_runs_conceded_2025", related: true, query: q("bowling", "runs_conceded", "player", { seasonFrom: 2025, seasonTo: 2025 }) },
  { id: "bowl_dot_pct_death", related: true, query: q("bowling", "dot_pct", "player", { phase: "death" }) },
  { id: "bowl_average_by_team", related: true, query: { ...q("bowling", "bowling_average", "team"), order: "asc" } },
  { id: "bowl_economy_by_season", related: true, query: { ...q("bowling", "economy", "season", {}, 25), sortBy: "key" } },
  { id: "bowl_economy_by_phase", related: true, query: q("bowling", "economy", "phase") },
  { id: "bowl_wickets_by_player", related: false, query: q("bowling", "wickets", "player") },
  { id: "bowl_balls_by_player", related: false, query: q("bowling", "balls_bowled", "player") },
  { id: "bowl_five_fors", related: false, query: q("bowling", "five_wicket_hauls", "player", {}, 20) },
  { id: "bat_runs_by_player", related: false, query: q("batting", "runs", "player") },
  { id: "bat_sr_powerplay", related: false, query: q("batting", "strike_rate", "player", { phase: "powerplay" }) },
  { id: "bat_average_2024", related: false, query: q("batting", "average", "player", { seasonFrom: 2024, seasonTo: 2024 }) },
  { id: "results_win_pct", related: false, query: q("results", "win_pct", "team") },
];
const statsEngine: Record<string, Any> = {};
for (const x of QUERIES) {
  const r = runStatQuery(x.query);
  statsEngine[x.id] = { related: x.related, rows: r.rows, qualification: r.qualification, groupsConsidered: r.groupsConsidered };
}

// 3. Season lines (player profiles → dugout, impact model, War Room, insight feed).
const lines = getSeasonLines() as Map<number, Any[]>;
const seasonTotals: Record<number, Any> = {};
for (const [pid, ls] of lines) {
  const t = { batRuns: 0, batBalls: 0, batOuts: 0, bowlBalls: 0, bowlRuns: 0, wickets: 0 };
  for (const l of ls) { t.batRuns += l.batRuns; t.batBalls += l.batBalls; t.batOuts += l.batOuts; t.bowlBalls += l.bowlBalls; t.bowlRuns += l.bowlRuns; t.wickets += l.wickets; }
  seasonTotals[pid] = t;
}

// 4. Weakness detector and match-model phase lines for named players.
const weakness: Record<string, Any> = {};
for (const n of [...BOWLERS, ...BATTERS]) {
  const id = idOf(n);
  const rep = id != null ? scanPlayer(id, "career") : null;
  weakness[n] = rep ? JSON.parse(JSON.stringify(rep, (k, v) => (k === "ms" || k === "generatedAt" ? undefined : v))) : null;
}
const prof = getProfiles();
const matchModel: Record<string, Any> = {};
for (const n of BOWLERS) { const id = idOf(n); if (id != null) matchModel[`bowler:${n}`] = [0, 1, 2].map((ph) => bowlerPhaseLine(prof, id, ph)); }
for (const n of BATTERS) { const id = idOf(n); if (id != null) matchModel[`batter:${n}`] = [0, 1, 2].map((ph) => batterPhaseLine(prof, id, ph)); }

// 5. Legacy SQL aggregator (/api/stats/query): bowlers may change, batters must not.
const legacy: Record<string, Any> = {};
for (const [id, f] of [["all", {}], ["2025", { season: "2025" }], ["death_2024", { season: "2024", phase: "Death" }]] as const) {
  const r = await aggregateQueryStats(f as Any);
  const strip = (rows: Any[]) => rows.map((x) => JSON.parse(JSON.stringify(x)));
  legacy[id] = { batters: strip(r.batters ?? []), bowlers: strip(r.bowlers ?? []) };
}

const snapshot = {
  src, capturedAt: new Date().toISOString(),
  ballContext: { n: c.n, totalRuns, batRuns, conceded, legal, wickets, bowlerConceded, batterRuns },
  statsEngine, seasonTotals, weakness, matchModel, legacy,
};
fs.writeFileSync(out, JSON.stringify(snapshot));
console.log(`snapshot → ${out}: ${c.n} balls, conceded ${conceded}, ${Object.keys(statsEngine).length} engine queries, ${Object.keys(seasonTotals).length} season-line players`);
process.exit(0);

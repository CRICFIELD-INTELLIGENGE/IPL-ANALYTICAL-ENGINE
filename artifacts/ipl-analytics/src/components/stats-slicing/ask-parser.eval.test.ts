// Ask AI evaluation: 50+ representative questions → expected typed query (intent, role, entities, filters).
// Run: cd artifacts/api-server && npx tsx --test ../ipl-analytics/src/components/stats-slicing/ask-parser.eval.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseAsk, type AskContext, type AskQuery } from "./ask-parser";

const data = join(dirname(fileURLToPath(import.meta.url)), "../../../public/data");
const read = (f: string) => JSON.parse(readFileSync(join(data, f), "utf8"));
const career = read("player-career-stats.json");
const squads = read("squads-by-season.json") as Record<string, Record<string, { name?: string; cricsheetName?: string | null }[]>>;
const counts = new Map<string, Map<string, number>>();
for (const season of Object.values(squads)) for (const team of Object.values(season)) for (const p of team) {
  if (!p.cricsheetName || !p.name) continue;
  const m = counts.get(p.cricsheetName) ?? counts.set(p.cricsheetName, new Map()).get(p.cricsheetName)!;
  m.set(p.name, (m.get(p.name) ?? 0) + 1);
}
const display = (n: string) => [...(counts.get(n) ?? new Map([[n, 1]]))].sort((a, b) => b[1] - a[1])[0][0];
const ctx: AskContext = {
  players: [
    ...career.batters.map((r: any) => ({ name: r.player, display: display(r.player), balls: r.balls ?? 0, role: "batters" as const })),
    ...career.bowlers.filter((r: any) => !career.batters.some((b: any) => b.player === r.player) || (r.balls ?? 0) > 300)
      .map((r: any) => ({ name: r.player, display: display(r.player), balls: (r.balls ?? 0) * 2, role: "bowlers" as const })),
  ],
  venues: read("venues.json").map((v: any) => v.venue || v.name),
  years: Array.from({ length: 19 }, (_, i) => String(2008 + i)),
};

type Expect = Partial<Pick<AskQuery, "intent" | "role" | "metric" | "order" | "limit" | "minBalls">> & { f?: Record<string, string>; ms?: Record<string, number>; players?: string[]; venue?: RegExp };
const cases: [string, Expect][] = [
  // player statistics
  ["How many runs did Sanju Samson score in IPL 2025?", { intent: "player", role: "batters", players: ["SV Samson"], f: { season: "2025" }, metric: "runs" }],
  ["Virat Kohli strike rate in 2016", { intent: "player", players: ["V Kohli"], f: { season: "2016" }, metric: "sr" }],
  ["Jasprit Bumrah wickets since 2022", { intent: "player", role: "bowlers", players: ["JJ Bumrah"], f: { seasonFrom: "2022", seasonTo: "2026" }, metric: "wickets" }],
  ["Rashid Khan economy in the death overs", { intent: "player", role: "bowlers", metric: "econ", f: { phase: "Death" } }],
  ["How many sixes has Andre Russell hit?", { intent: "player", metric: "sixes", players: ["AD Russell"] }],
  // rankings
  ["Top 10 Indian death-over batters since 2022 with at least 250 balls", { intent: "leaderboard", role: "batters", limit: 10, minBalls: 250, f: { nationality: "indian", phase: "Death", seasonFrom: "2022" } }],
  ["Most runs in IPL 2024", { intent: "leaderboard", role: "batters", metric: "runs", f: { season: "2024" } }],
  ["Most wickets in the powerplay", { intent: "leaderboard", role: "bowlers", metric: "wickets", f: { phase: "Powerplay" } }],
  ["Best economy in the death overs since 2023", { role: "bowlers", metric: "econ", order: "asc", f: { phase: "Death", seasonFrom: "2023" } }],
  ["Highest strike rate in the middle overs, minimum 300 balls", { role: "batters", metric: "sr", minBalls: 300, f: { phase: "Middle" } }],
  ["Top 5 overseas batters by average", { role: "batters", metric: "avg", limit: 5, f: { nationality: "overseas" } }],
  ["Who hit the most sixes in 2023?", { role: "batters", metric: "sixes", f: { season: "2023" } }],
  ["Lowest dot ball percentage among batters in the powerplay", { role: "batters", metric: "dotPct", order: "asc", f: { phase: "Powerplay" } }],
  ["Top 20 bowlers by wickets in playoffs", { role: "bowlers", metric: "wickets", limit: 20, f: { match_context: "Playoffs" } }],
  ["Most runs in IPL finals", { role: "batters", metric: "runs", f: { match_context: "Final" } }],
  ["Most runs while chasing in 2022", { role: "batters", f: { innings: "2nd Innings (Chasing)", season: "2022" } }],
  ["Best bowling average batting first", { role: "bowlers", metric: "bowlAvg", f: { innings: "1st Innings (Setting)" } }],
  ["Most wickets between 2018 and 2020", { role: "bowlers", f: { seasonFrom: "2018", seasonTo: "2020" } }],
  ["Most runs over the last three seasons", { f: { seasonFrom: "2024", seasonTo: "2026" } }],
  ["Most runs in overs 17-20", { f: { overRange: "17-20" } }],
  // comparisons
  ["Compare Jaiswal and Gill in powerplay strike rate between 2022 and 2026", { intent: "compare", role: "batters", players: ["YBK Jaiswal", "Shubman Gill"], metric: "sr", f: { phase: "Powerplay", seasonFrom: "2022", seasonTo: "2026" } }],
  ["Compare Kohli and Rohit Sharma", { intent: "compare", players: ["V Kohli", "RG Sharma"] }],
  ["Bumrah vs Chahal economy since 2021", { intent: "compare", role: "bowlers", metric: "econ" }],
  ["Compare Buttler, Head and Klaasen in the death overs", { intent: "compare", f: { phase: "Death" } }],
  // batter vs bowler
  ["Show Kohli's performance against Rashid Khan", { intent: "matchup", f: { batter: "V Kohli", bowler: "Rashid Khan" } }],
  ["MS Dhoni vs Jasprit Bumrah", { intent: "matchup", f: { batter: "MS Dhoni", bowler: "JJ Bumrah" } }],
  ["How has Suryakumar Yadav done against Yuzvendra Chahal?", { intent: "matchup" }],
  // handedness / style
  ["Which leg-spinners perform best against left-handed batters?", { role: "bowlers", f: { bowlStyle: "leg-spin", batterHandedness: "vs LHB" }, metric: "econ" }],
  ["Best off-spinners in the powerplay", { role: "bowlers", f: { bowlStyle: "right-arm-off-spin", phase: "Powerplay" } }],
  ["Left-arm orthodox bowlers with most wickets", { role: "bowlers", f: { bowlStyle: "left-arm-orthodox" }, metric: "wickets" }],
  ["Batters with the best strike rate against spin", { role: "batters", metric: "sr", f: { bowler_type: "Spinner" } }],
  ["Most runs against pace in the death overs", { role: "batters", f: { bowler_type: "Pacer", phase: "Death" } }],
  ["Best economy against right-handed batters", { role: "bowlers", f: { batterHandedness: "vs RHB" } }],
  // venues
  ["Best death-over bowlers at Jaipur", { role: "bowlers", f: { phase: "Death" }, venue: /Sawai Mansingh/ }],
  ["Highest individual scores at Guwahati", { role: "batters", metric: "highest", venue: /Barsapara|Guwahati/ }],
  ["Most runs at Wankhede since 2020", { venue: /Wankhede/, f: { seasonFrom: "2020" } }],
  ["Most wickets at Eden Gardens", { role: "bowlers", venue: /Eden Gardens/ }],
  // teams (supported slices and an explained unsupported family)
  ["Most runs for RR in 2024", { f: { team: "RR", season: "2024" } }],
  ["Most wickets against CSK", { role: "bowlers", f: { opposition: "CSK" } }],
  ["How successful has Rajasthan Royals been when chasing 180+?", { intent: "unsupported" }],
  // match state
  ["Which batters score fastest when the required rate exceeds 12?", { role: "batters", metric: "sr", ms: { minRequiredRate: 12 }, f: { innings: "2nd Innings (Chasing)" } }],
  ["Most runs when chasing 200+", { ms: { minTarget: 200 }, f: { innings: "2nd Innings (Chasing)" } }],
  ["Strike rate with 30 needed from 12 balls", { ms: { minRunsNeeded: 30, maxRunsNeeded: 30, minBallsLeft: 12, maxBallsLeft: 12 } }],
  ["Most runs in clutch moments", { f: { pressure_state: "Clutch Moment" } }],
  // pressure / batter lens hand-offs (results come from the engines themselves)
  ["Who are the most reliable pressure batters since 2022?", { intent: "pressure", role: "batters", f: { seasonFrom: "2022" } }],
  ["Most reliable pressure bowlers", { intent: "pressure", role: "bowlers" }],
  ["Rank batters by RAA per 100 balls against spin", { intent: "batter-lens", f: { bowler_type: "Spinner" } }],
  // trends
  ["How has Riyan Parag's middle-over performance changed since 2022?", { intent: "trend", players: ["R Parag"], f: { phase: "Middle", seasonFrom: "2022" } }],
  ["Season-by-season strike rate for Travis Head", { intent: "trend", metric: "sr" }],
  // unsupported
  ["Find batters with a role and statistical profile similar to Hetmyer", { intent: "unsupported" }],
  ["Show the matches and deliveries supporting this ranking", { intent: "unsupported" }],
  // misspelling
  ["Runs for Jaiswaal in 2024", { intent: "player", players: ["YBK Jaiswal"] }],
];

for (const [question, want] of cases) {
  test(question, () => {
    const got = parseAsk(question, ctx);
    for (const k of ["intent", "role", "metric", "order", "limit", "minBalls"] as const) if (want[k] !== undefined) assert.equal(got[k], want[k], `${k}`);
    for (const [k, v] of Object.entries(want.f ?? {})) assert.equal((got.filters as any)[k], v, `filter ${k}`);
    for (const [k, v] of Object.entries(want.ms ?? {})) assert.equal((got.matchState as any)[k], v, `matchState ${k}`);
    if (want.players) assert.deepEqual(got.players, want.players);
    if (want.venue) assert.match(got.filters.venue ?? "", want.venue);
  });
}

test("follow-ups keep the validated context and change only what they name", () => {
  let q = parseAsk("Top 10 death-over batters since 2022", ctx);
  assert.equal(q.filters.phase, "Death");
  q = parseAsk("Only Indian players", ctx, q);
  assert.equal(q.filters.nationality, "indian");
  assert.equal(q.filters.phase, "Death");
  assert.equal(q.filters.seasonFrom, "2022");
  q = parseAsk("Minimum 250 balls", ctx, q);
  assert.equal(q.minBalls, 250);
  assert.equal(q.filters.nationality, "indian");
  q = parseAsk("Now rank by strike rate", ctx, q);
  assert.equal(q.metric, "sr");
  assert.equal(q.minBalls, 250);
  q = parseAsk("Compare the top three", ctx, q, ["A", "B", "C", "D"]);
  assert.equal(q.intent, "compare");
  assert.deepEqual(q.players, ["A", "B", "C"]);
  assert.equal(q.filters.phase, "Death");
});

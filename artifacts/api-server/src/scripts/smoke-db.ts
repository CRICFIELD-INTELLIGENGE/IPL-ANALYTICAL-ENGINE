// Day 4.5 — smoke-test the real API against a chosen warehouse file, in-process and isolated.
//
//   CRICFIELD_DB_PATH=<copy.db> tsx src/scripts/smoke-db.ts <out-dir>
//   tsx src/scripts/smoke-db.ts --compare <out-dir-a> <out-dir-b>
//
// Imports the Express app (same routing, validation and middleware as production), listens on an ephemeral
// localhost port, GETs a fixed list of endpoints and writes each status + body to <out-dir>. Refuses to run
// without CRICFIELD_DB_PATH so it can never touch the live sqlite.db (insights.ts writes to the warehouse).

import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";

export const ENDPOINTS: string[] = [
  "/api/healthz",
  "/api/history/overview",
  "/api/ipl/overview",
  "/api/ipl/seasons",
  "/api/ipl/matches",
  "/api/ipl/match/1304066/scorecard",          // C1: R Ashwin retired out (Avesh Khan)
  "/api/ipl/match/335988/scorecard",           // C2: 5 penalty runs (PP Ojha)
  "/api/ipl/match/729309/scorecard",           // C2/C3: penalty wide (Malinga), Harbhajan retired hurt
  "/api/ipl/match/1082625/scorecard",          // C7: tie, super-over winner Mumbai Indians
  "/api/ipl/match/1473469/scorecard",          // C3 + C7 + long over
  "/api/ipl/points-tables",
  "/api/ipl/teams",
  "/api/ipl/teams/head-to-head",
  "/api/ipl/team-analytics?team=Mumbai%20Indians",
  "/api/ipl/team-analytics?team=Delhi%20Capitals",
  "/api/ipl/venue-analytics?venue=Wankhede%20Stadium",
  "/api/ipl/venues",
  "/api/ipl/top-bowlers",
  "/api/ipl/top-batters",
  "/api/ipl/bowlers",
  "/api/ipl/batsmen",
  "/api/ipl/player-career-stats",
  "/api/ipl/player-season-stats",
  "/api/ipl/phase-analysis",
  "/api/ipl/records",
  "/api/ipl/dismissals",
  "/api/ipl/stats/query",
  "/api/ipl/stats/query?season=2025",
  "/api/players/39/summary",                   // JJ Bumrah
  "/api/players/186/summary",                  // Avesh Khan (C1)
  "/api/players/123/summary",                  // SL Malinga (C2)
  "/api/players/220/summary",                  // JC Archer (no-ball byes, C4)
  "/api/players/135/summary",                  // V Kohli (batting: must not change)
  "/api/weakness/39",
  "/api/pressure/135",
  "/api/pressure/leaders",
  "/api/rankings",
  "/api/decision/catalog",
  "/api/scout/rankings?discipline=batting",
];

// Day 4.6 profile set (SMOKE_SET=profiles): players touched by the identity merges and the bio-lookup fix, and the
// legacy stats filters that read player bios (pace/spin, batting hand, nationality).
export const PROFILE_ENDPOINTS: string[] = [
  ...[155, 484, 495, 331, 244, 912, 67, 204, 271, 554, 557, 761].map((id) => `/api/players/${id}/summary`),
  ...["j-yadav", "jayant-yadav", "ka-maharaj", "keshav-maharaj", "rj-gleeson", "richard-gleeson", "wanindu-hasaranga",
    "pwh-de-silva", "navdeep-saini", "n-saini", "kuldeep-yadav", "rk-singh"].map((k) => `/api/intel/player/${k}`),
  "/api/ipl/stats/query",
  "/api/ipl/stats/query?bowlerType=Spinner",
  "/api/ipl/stats/query?bowlerType=Pacer",
  "/api/ipl/stats/query?battingHand=LHB",
  "/api/ipl/stats/query?battingHand=RHB",
  "/api/ipl/stats/query?nationality=Indian",
  "/api/ipl/stats/query?nationality=Overseas",
  "/api/ipl/stats/query?season=2026",
  "/api/ipl/squads-by-season",
  "/api/ipl/current-squads",
];
// Day 6 set (SMOKE_SET=day6): everything the identity (player-profiles) and Unknown-bowler-type changes can move.
export const DAY6_ENDPOINTS: string[] = [
  ...PROFILE_ENDPOINTS,
  ...[762, 930, 966, 560].map((id) => `/api/players/${id}/summary`),
  "/api/ipl/stats/query?bowlerType=Spinner&season=2026",
  "/api/ipl/stats/query?bowlerType=Pacer&season=2026",
  "/api/ipl/team-analytics?team=Mumbai%20Indians",
  "/api/ipl/team-analytics?team=Chennai%20Super%20Kings",
  "/api/ipl/team-analytics?team=Kolkata%20Knight%20Riders",
  "/api/ipl/venue-analytics?venue=Wankhede%20Stadium",
  "/api/ipl/venue-analytics?venue=MA%20Chidambaram%20Stadium",
  "/api/opposition?team=MI&opponent=CSK&sims=400",
  "/api/opposition?team=KKR&opponent=RCB&sims=400",
  "/api/squad-dna/profile?team=CSK",
  "/api/squad-dna/profile?team=KKR",
  "/api/pool/39",
  "/api/pool/135",
  "/api/pool/1083?side=bowling",
  "/api/pool/553?side=bowling",
  "/api/strategy/setup?battingTeam=MI&bowlingTeam=KKR",
  "/api/insights/daily",
  "/api/history/overview",
];
const SET = process.env.SMOKE_SET === "profiles" ? PROFILE_ENDPOINTS : process.env.SMOKE_SET === "day6" ? DAY6_ENDPOINTS : ENDPOINTS;

async function capture(outDir: string) {
  if (!process.env.CRICFIELD_DB_PATH) throw new Error("set CRICFIELD_DB_PATH to a database COPY");
  fs.mkdirSync(outDir, { recursive: true });
  const { default: app } = await import("../app");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const summary: Record<string, { status: number; bytes: number }> = {};
  for (const ep of SET) {
    const res = await fetch(base + ep);
    const text = await res.text();
    summary[ep] = { status: res.status, bytes: text.length };
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }
    fs.writeFileSync(path.join(outDir, encodeURIComponent(ep) + ".json"), JSON.stringify({ status: res.status, body }, null, 1));
  }
  server.close();
  fs.writeFileSync(path.join(outDir, "_summary.json"), JSON.stringify({ db: process.env.CRICFIELD_DB_PATH, summary }, null, 1));
  const bad = Object.entries(summary).filter(([, s]) => s.status >= 500);
  console.log(`${SET.length} endpoints, ${bad.length} server errors${bad.length ? ": " + bad.map(([e, s]) => `${e} ${s.status}`).join(", ") : ""}`);
  process.exit(0);
}

/** Leaf paths that differ between two JSON values; array elements matched by position. */
export function diffPaths(a: unknown, b: unknown, p = "", out: Map<string, number> = new Map()): Map<string, number> {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === "object" && typeof b === "object") {
    const isArr = Array.isArray(a);
    if (isArr && Array.isArray(b) && a.length !== b.length) { out.set(`${p}[length]`, (out.get(`${p}[length]`) ?? 0) + 1); }
    for (const k of new Set([...Object.keys(a as object), ...Object.keys(b as object)])) {
      diffPaths((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${p}${isArr ? "[]" : "." + k}`, out);
    }
    return out;
  }
  out.set(p, (out.get(p) ?? 0) + 1);
  return out;
}

function compare(aDir: string, bDir: string) {
  const report: Record<string, unknown> = {};
  for (const ep of SET) {
    const f = encodeURIComponent(ep) + ".json";
    const a = JSON.parse(fs.readFileSync(path.join(aDir, f), "utf8")), b = JSON.parse(fs.readFileSync(path.join(bDir, f), "utf8"));
    const d = diffPaths(a, b);
    report[ep] = d.size === 0 ? "identical" : Object.fromEntries([...d].sort((x, y) => y[1] - x[1]).slice(0, 25));
  }
  console.log(JSON.stringify(report, null, 1));
}

if (process.argv[2] === "--compare") compare(process.argv[3], process.argv[4]);
else capture(process.argv[2] ?? "smoke-out").catch((e) => { console.error(e); process.exit(1); });

// Pressure Intelligence: per-ball pre-delivery state + outcome, one compact binary per league.
//
//   cd artifacts/api-server && node --import tsx scripts/pressure/build-pressure-intel.ts
//
// Writes artifacts/ipl-analytics/public/data/pressure-intel/{index.json,<comp>.json,<comp>.bin.gz}.
// Static on purpose: production serves no warehouse API, so the query engine
// (ipl-analytics/src/lib/pressure-intel/engine.ts) runs on these files.
// Every state column is known BEFORE the ball; outcomes are kept in separate columns.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { getGlobalDb, getProjectRoot } from "../../src/services/scout/db";
import { stageBucket } from "../../src/services/pressure/situations";
import { COLUMNS, FLAG } from "../../../ipl-analytics/src/lib/pressure-intel/format";

const db = getGlobalDb();
if (!db) throw new Error("global.db not found");

const TEAM_WICKET_EXCLUDED = new Set(["retired hurt", "retired not out"]);
const BOWLER_KINDS = new Set(["bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"]);
const outDir = path.join(getProjectRoot(), "artifacts", "ipl-analytics", "public", "data", "pressure-intel");
fs.mkdirSync(outDir, { recursive: true });

const attr = (a: string) => new Map((db.prepare(
  `SELECT player_key k, MIN(normalized) v FROM player_attributes WHERE attribute = ? AND normalized IN ('pace','spin','left','right') GROUP BY player_key`,
).all(a) as any[]).map(r => [r.k as number, r.v as string]));
const bowlType = attr("bowling_style"), batHand = attr("batting_hand");
const names = new Map((db.prepare("SELECT player_key, cricsheet_id, COALESCE(unique_name, name) name FROM players").all() as any[]).map(r => [r.player_key, r]));
const coverage = new Map((db.prepare("SELECT competition_id, season_label, status FROM scout_coverage").all() as any[]).map(r => [`${r.competition_id}:${r.season_label}`, r.status as string]));

const comps = db.prepare("SELECT competition_id id, code, name FROM competitions ORDER BY competition_id").all() as any[];
const index: any[] = [];

// ICC Full Members (Cricsheet withholds Afghanistan). Associate T20Is get their own file: bowlers there face much
// weaker batting, so pooling them with Full Member matches floods rankings with associate players.
const FULL_MEMBERS = new Set(["Afghanistan", "Australia", "Bangladesh", "England", "India", "Ireland", "New Zealand", "Pakistan", "South Africa", "Sri Lanka", "West Indies", "Zimbabwe"]);
const units = comps.flatMap(c => {
  const ms = db.prepare(`SELECT m.match_id id, m.season_label season, m.start_date date, m.stage, a.name t1, b.name t2 FROM matches m
    JOIN teams a ON a.team_id = m.team1_id JOIN teams b ON b.team_id = m.team2_id
    WHERE m.competition_id = ? AND m.scheduled_overs = 20 AND m.balls_per_over = 6 ORDER BY m.start_date, m.match_id`).all(c.id) as any[];
  if (c.code !== "t20i") return [{ ...c, ms }];
  const fm = (m: any) => FULL_MEMBERS.has(m.t1) && FULL_MEMBERS.has(m.t2);
  return [{ ...c, name: "Men's T20Is (Full Members)", ms: ms.filter(fm) }, { ...c, code: "t20i_assoc", name: "Men's T20Is (Associates)", ms: ms.filter(m => !fm(m)) }];
});

for (const c of units) {
  const ms = c.ms;
  if (!ms.length) continue;
  const seasons = [...new Set(ms.map(m => m.season as string))];
  const stageOf = new Map<number, number>(); // 0..2 league thirds by date, 3 knockout
  for (const s of seasons) {
    const inS = ms.filter(m => m.season === s);
    const league = inS.filter(m => stageBucket(m.stage) === null);
    league.forEach((m, i) => stageOf.set(m.id, Math.min(2, Math.floor((3 * i) / league.length))));
    inS.filter(m => stageBucket(m.stage) !== null).forEach(m => stageOf.set(m.id, 3));
  }
  const mIdx = new Map(ms.map((m, i) => [m.id as number, i]));
  const target = new Map((db.prepare(`SELECT i.match_id, i.target_runs t, i.target_overs o FROM innings i JOIN matches m USING(match_id)
    WHERE m.competition_id = ? AND i.innings_no = 2 AND i.super_over = 0`).all(c.id) as any[])
    .map(r => [r.match_id as number, { runs: r.t as number | null, balls: r.o == null ? 120 : Math.floor(r.o) * 6 + Math.round((r.o % 1) * 10) }]));
  const wkts = new Map<string, { kind: string; out: number }[]>();
  for (const w of db.prepare(`SELECT w.match_id, w.innings_no, w.over_no, w.seq, w.kind, w.player_out FROM wickets w JOIN matches m USING(match_id)
    WHERE m.competition_id = ? AND w.innings_no IN (1,2)`).iterate(c.id) as Iterable<any>) {
    const k = `${w.match_id}:${w.innings_no}:${w.over_no}:${w.seq}`;
    (wkts.get(k) ?? wkts.set(k, []).get(k)!).push({ kind: w.kind, out: w.player_out });
  }

  const pIdx = new Map<number, number>();
  const pid = (k: number) => pIdx.get(k) ?? pIdx.set(k, pIdx.size).get(k)!;
  const cols: Record<string, number[]> = Object.fromEntries(COLUMNS.map(([n]) => [n, []]));
  let inn = "", runs = 0, legal = 0, down = 0, order = new Map<number, number>();
  for (const d of db.prepare(`SELECT d.match_id, d.innings_no, d.over_no, d.seq, d.batter, d.non_striker, d.bowler, d.runs_batter, d.runs_total, d.wides, d.noballs
    FROM deliveries d JOIN matches m USING(match_id) WHERE m.competition_id = ? AND d.innings_no IN (1,2)
    ORDER BY d.match_id, d.innings_no, d.over_no, d.seq`).iterate(c.id) as Iterable<any>) {
    const mi = mIdx.get(d.match_id);
    if (mi === undefined) continue;
    const key = `${d.match_id}:${d.innings_no}`;
    if (key !== inn) { inn = key; runs = 0; legal = 0; down = 0; order = new Map(); }
    for (const p of [d.batter, d.non_striker]) if (!order.has(p)) order.set(p, order.size + 1);
    const ws = wkts.get(`${key}:${d.over_no}:${d.seq}`) ?? [];
    const teamW = ws.filter(w => !TEAM_WICKET_EXCLUDED.has(w.kind));
    const isLegal = d.wides === 0 && d.noballs === 0;
    const t = d.innings_no === 2 ? target.get(d.match_id) : undefined;
    const chase = d.innings_no === 2 && t?.runs != null;
    cols.match.push(mi); cols.batter.push(pid(d.batter)); cols.bowler.push(pid(d.bowler));
    cols.runsBefore.push(runs); cols.target.push(chase ? t!.runs! : 0);
    cols.inn.push(d.innings_no); cols.over.push(Math.min(19, d.over_no));
    cols.ballsLeft.push(Math.max(0, Math.min(255, (chase ? t!.balls : 120) - legal)));
    cols.wkts.push(down); cols.pos.push(Math.min(11, order.get(d.batter)!));
    cols.runsBat.push(Math.min(255, d.runs_batter)); cols.conceded.push(Math.min(255, d.runs_batter + d.wides + d.noballs));
    cols.flags.push((isLegal ? FLAG.legal : 0) | (d.wides === 0 ? FLAG.faced : 0)
      | (teamW.some(w => w.out === d.batter) ? FLAG.strikerOut : 0) | (ws.some(w => BOWLER_KINDS.has(w.kind)) ? FLAG.bowlerWkt : 0));
    runs += d.runs_total; legal += isLegal ? 1 : 0; down += teamW.length;
  }
  const n = cols.match.length;
  const parts = COLUMNS.map(([name, type]) => Buffer.from((type === "u16" ? Uint16Array : Uint8Array).from(cols[name]).buffer));
  // Pre-gzipped: static hosts rarely compress binary types. The client gunzips (DecompressionStream).
  fs.writeFileSync(path.join(outDir, `${c.code}.bin.gz`), zlib.gzipSync(Buffer.concat(parts), { level: 9 }));
  const keys = [...pIdx.keys()];
  fs.writeFileSync(path.join(outDir, `${c.code}.json`), JSON.stringify({
    comp: c.code, balls: n, seasons,
    matches: ms.map(m => [seasons.indexOf(m.season), stageOf.get(m.id) ?? 0, m.date]),
    players: keys.map(k => { const r = names.get(k); return [r?.cricsheet_id ?? `k${k}`, r?.name ?? `player ${k}`, bowlType.get(k) ?? "", batHand.get(k) ?? ""]; }),
  }));
  const typed = (side: number[], m: Map<number, string>) => side.length ? side.filter(p => m.has(keys[p])).length / side.length : 0;
  index.push({
    code: c.code, name: c.name, balls: n, matches: ms.length, seasons,
    partialSeasons: seasons.filter(s => coverage.get(`${c.id}:${s}`) === "partial"),
    // Share of balls whose bowler type / batter hand is known (from player bios).
    bowlerTypeCoverage: +typed(cols.bowler, bowlType).toFixed(3), batterHandCoverage: +typed(cols.batter, batHand).toFixed(3),
    bytes: n * COLUMNS.reduce((s, [, t]) => s + (t === "u16" ? 2 : 1), 0),
  });
  console.log(`${c.code}: ${n} balls, ${(index.at(-1).bytes / 1e6).toFixed(1)} MB`);
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({
  builtAt: new Date().toISOString(), source: "Cricsheet via global.db (ODC-BY 1.0)", competitions: index,
}));

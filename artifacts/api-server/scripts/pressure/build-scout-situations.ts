// Scout Lab "Under Pressure" splits: per player × season × situation counts, one file per league.
//
//   cd artifacts/api-server && node --import tsx scripts/pressure/build-scout-situations.ts
//
// Writes artifacts/ipl-analytics/public/data/scout-situations/<comp>.json (static, so it works
// on the API-less production deploy). Match state is rebuilt from deliveries; nothing is modelled.

import fs from "node:fs";
import path from "node:path";
import { getGlobalDb, getProjectRoot } from "../../src/services/scout/db";
import { SITUATIONS, situationsOf, stageBucket, type BallCtx } from "../../src/services/pressure/situations";

const db = getGlobalDb();
if (!db) throw new Error("global.db not found");

const TEAM_WICKET_EXCLUDED = new Set(["retired hurt", "retired not out"]);
const BOWLER_KINDS = new Set(["bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"]);
const outDir = path.join(getProjectRoot(), "artifacts", "ipl-analytics", "public", "data", "scout-situations");
fs.mkdirSync(outDir, { recursive: true });

const attr = (a: string) => new Map((db.prepare(
  `SELECT player_key k, MIN(normalized) v FROM player_attributes WHERE attribute = ? AND normalized IN ('pace','spin','left','right') GROUP BY player_key`,
).all(a) as any[]).map(r => [r.k as number, r.v as string]));
const bowlType = attr("bowling_style"), batHand = attr("batting_hand");
const names = new Map((db.prepare("SELECT player_key, cricsheet_id, COALESCE(unique_name, name) name FROM players").all() as any[]).map(r => [r.player_key, r]));

const comps = db.prepare("SELECT competition_id id, code, name FROM competitions ORDER BY competition_id").all() as any[];
const index: { code: string; name: string; seasons: string[]; file: string }[] = [];

for (const c of comps) {
  const ms = db.prepare(`SELECT match_id id, season_label season, start_date date, stage FROM matches
    WHERE competition_id = ? AND scheduled_overs = 20 AND balls_per_over = 6 ORDER BY start_date, match_id`).all(c.id) as any[];
  if (!ms.length) continue;
  const seasons = [...new Set(ms.map(m => m.season as string))];
  // League-stage buckets: thirds of the season's non-knockout matches, by date.
  const stageOf = new Map<number, number>();
  for (const s of seasons) {
    const inS = ms.filter(m => m.season === s);
    const league = inS.filter(m => stageBucket(m.stage) === null);
    league.forEach((m, i) => stageOf.set(m.id, Math.min(2, Math.floor((3 * i) / league.length))));
    inS.filter(m => stageBucket(m.stage) !== null).forEach(m => stageOf.set(m.id, 3));
  }
  const seasonOf = new Map(ms.map(m => [m.id as number, seasons.indexOf(m.season)]));
  const target = new Map((db.prepare(`SELECT i.match_id, i.target_runs t, i.target_overs o FROM innings i JOIN matches m USING(match_id)
    WHERE m.competition_id = ? AND i.innings_no = 2 AND i.super_over = 0`).all(c.id) as any[])
    .map(r => [r.match_id as number, { runs: r.t as number | null, balls: r.o == null ? 120 : Math.floor(r.o) * 6 + Math.round((r.o % 1) * 10) }]));
  const wkts = new Map<string, { kind: string; out: number }[]>();
  for (const w of db.prepare(`SELECT w.match_id, w.innings_no, w.over_no, w.seq, w.kind, w.player_out FROM wickets w JOIN matches m USING(match_id)
    WHERE m.competition_id = ? AND w.innings_no IN (1,2)`).iterate(c.id) as Iterable<any>) {
    const k = `${w.match_id}:${w.innings_no}:${w.over_no}:${w.seq}`;
    (wkts.get(k) ?? wkts.set(k, []).get(k)!).push({ kind: w.kind, out: w.player_out });
  }

  // key = player|season|role|situation → [balls, runs, outs, dots, boundaries]
  const agg = new Map<string, number[]>();
  const bump = (player: number, season: number, role: 0 | 1, sits: number[], f: number[]) => {
    for (const s of sits) {
      const k = `${player}|${season}|${role}|${s}`;
      const a = agg.get(k) ?? agg.set(k, [0, 0, 0, 0, 0]).get(k)!;
      for (let i = 0; i < 5; i++) a[i] += f[i];
    }
  };
  let inn = "", runs = 0, legal = 0, down = 0;
  let order = new Map<number, number>();
  for (const d of db.prepare(`SELECT d.match_id, d.innings_no, d.over_no, d.seq, d.batter, d.non_striker, d.bowler, d.runs_batter, d.runs_total, d.wides, d.noballs
    FROM deliveries d JOIN matches m USING(match_id) WHERE m.competition_id = ? AND d.innings_no IN (1,2)
    ORDER BY d.match_id, d.innings_no, d.over_no, d.seq`).iterate(c.id) as Iterable<any>) {
    const season = seasonOf.get(d.match_id);
    if (season === undefined) continue;
    const key = `${d.match_id}:${d.innings_no}`;
    if (key !== inn) { inn = key; runs = 0; legal = 0; down = 0; order = new Map(); }
    for (const p of [d.batter, d.non_striker]) if (!order.has(p)) order.set(p, order.size + 1);
    const ws = wkts.get(`${key}:${d.over_no}:${d.seq}`) ?? [];
    const teamW = ws.filter(w => !TEAM_WICKET_EXCLUDED.has(w.kind));
    const isLegal = d.wides === 0 && d.noballs === 0;
    const t = d.innings_no === 2 ? target.get(d.match_id) : undefined;
    const ctx: BallCtx = {
      over: d.over_no, innings: d.innings_no, runsBefore: runs, legalBefore: legal, wktsBefore: down,
      target: t?.runs ?? null, targetBalls: t?.balls ?? 120,
      bowlerType: bowlType.get(d.bowler) ?? null, batterHand: batHand.get(d.batter) ?? null,
      stage: stageOf.get(d.match_id) ?? null, position: order.get(d.batter)!,
    };
    const sits = situationsOf(ctx);
    const boundary = d.runs_batter === 4 || d.runs_batter === 6 ? 1 : 0;
    if (d.wides === 0) bump(d.batter, season, 0, sits, [1, d.runs_batter, teamW.some(w => w.out === d.batter) ? 1 : 0, d.runs_batter === 0 ? 1 : 0, boundary]);
    const conceded = d.runs_batter + d.wides + d.noballs;
    bump(d.bowler, season, 1, sits, [isLegal ? 1 : 0, conceded, ws.some(w => BOWLER_KINDS.has(w.kind)) ? 1 : 0, isLegal && conceded === 0 ? 1 : 0, boundary]);
    runs += d.runs_total; legal += isLegal ? 1 : 0; down += teamW.length;
  }

  const playerKeys = [...new Set([...agg.keys()].map(k => Number(k.split("|")[0])))].sort((a, b) => a - b);
  const pIdx = new Map(playerKeys.map((k, i) => [k, i]));
  const rows = [...agg.entries()].map(([k, v]) => { const [p, s, r, x] = k.split("|").map(Number); return [pIdx.get(p)!, s, r, x, ...v]; });
  const file = `${c.code}.json`;
  fs.writeFileSync(path.join(outDir, file), JSON.stringify({
    comp: c.code, seasons,
    players: playerKeys.map(k => { const n = names.get(k); return [n?.cricsheet_id ?? "", n?.name ?? `player ${k}`, bowlType.get(k) ?? "", batHand.get(k) ?? ""]; }),
    fields: ["player", "season", "role", "situation", "balls", "runs", "outs", "dots", "boundaries"],
    rows,
  }));
  index.push({ code: c.code, name: c.name, seasons, file });
  console.log(`${c.code}: ${rows.length} rows, ${(fs.statSync(path.join(outDir, file)).size / 1e6).toFixed(1)} MB`);
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({
  builtAt: new Date().toISOString(), source: "Cricsheet via global.db (ODC-BY 1.0)",
  situations: SITUATIONS, competitions: index,
}));

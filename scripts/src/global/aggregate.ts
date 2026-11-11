// Global data engine — analytics layer (precomputed, additive counts).
//
//   pnpm --filter @workspace/scripts run global:aggregate [--only ipl,smat]
//
// Rebuilds agg_batting, agg_bowling, agg_fielding, agg_appearances and
// competition_baselines for the selected competitions. Each competition is
// recomputed whole (a few seconds), which keeps the logic simple and exact.
// Super-over innings and matches no longer in the newest archive are excluded.
// Every predicate comes from metrics.ts.

import type { DatabaseSync } from "node:sqlite";
import { all, openGlobalDb, setMeta, transaction } from "./db";
import { parseArgs } from "./paths";
import {
  type Ball, type Phase, isBattingDot, isBowlerWicket, isBowlingDot, isDismissal, isFaced, isFour, isLegal, isSix, phaseOf, runsConceded,
} from "./metrics";

type PhaseKey = Phase | "all";

interface BatAcc { matches: Set<number>; innings: Set<string>; balls: number; runs: number; fours: number; sixes: number; dots: number; outs: number }
interface BowlAcc { matches: Set<number>; innings: Set<string>; balls: number; legal: number; conceded: number; wickets: number; dots: number; fours: number; sixes: number; wides: number; noballs: number }
interface FieldAcc { catches: number; subCatches: number; stumpings: number; runOuts: number }
interface BaseAcc { innings: Set<string>; faced: number; legal: number; runsBatter: number; runsTotal: number; conceded: number; teamWkts: number; bowlerWkts: number; fours: number; sixes: number; dots: number }

interface BallRow {
  match_id: number; innings_no: number; over_no: number; seq: number; batter: number; non_striker: number; bowler: number;
  runs_batter: number; runs_total: number; non_boundary: number; wides: number; noballs: number; byes: number; legbyes: number; penalty: number;
  season_label: string; balls_per_over: number;
}

const newBat = (): BatAcc => ({ matches: new Set(), innings: new Set(), balls: 0, runs: 0, fours: 0, sixes: 0, dots: 0, outs: 0 });
const newBowl = (): BowlAcc => ({ matches: new Set(), innings: new Set(), balls: 0, legal: 0, conceded: 0, wickets: 0, dots: 0, fours: 0, sixes: 0, wides: 0, noballs: 0 });
const newBase = (): BaseAcc => ({ innings: new Set(), faced: 0, legal: 0, runsBatter: 0, runsTotal: 0, conceded: 0, teamWkts: 0, bowlerWkts: 0, fours: 0, sixes: 0, dots: 0 });

function get<T>(m: Map<string, T>, k: string, make: () => T): T {
  let v = m.get(k);
  if (!v) { v = make(); m.set(k, v); }
  return v;
}

export interface AggregateSummary { code: string; balls: number; battingRows: number; bowlingRows: number; ms: number }

export function aggregateCompetition(db: DatabaseSync, competitionId: number, code: string): AggregateSummary {
  const started = performance.now();
  const balls = all<BallRow>(db, `
    SELECT d.match_id, d.innings_no, d.over_no, d.seq, d.batter, d.non_striker, d.bowler, d.runs_batter, d.runs_total, d.non_boundary,
      d.wides, d.noballs, d.byes, d.legbyes, d.penalty, m.season_label, m.balls_per_over
    FROM deliveries d
    JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
    JOIN matches m ON m.match_id = d.match_id
    WHERE m.competition_id = ? AND m.in_latest_source = 1 AND i.super_over = 0
    ORDER BY d.match_id, d.innings_no, d.over_no, d.seq`, competitionId);

  const wkts = new Map<string, { kind: string; player_out: number }[]>();
  for (const w of all<{ match_id: number; innings_no: number; over_no: number; seq: number; kind: string; player_out: number }>(db, `
    SELECT w.match_id, w.innings_no, w.over_no, w.seq, w.kind, w.player_out FROM wickets w
    JOIN innings i ON i.match_id = w.match_id AND i.innings_no = w.innings_no
    JOIN matches m ON m.match_id = w.match_id
    WHERE m.competition_id = ? AND m.in_latest_source = 1 AND i.super_over = 0`, competitionId)) {
    get(wkts, `${w.match_id}|${w.innings_no}|${w.over_no}|${w.seq}`, () => []).push(w);
  }

  const bat = new Map<string, BatAcc>();
  const bowl = new Map<string, BowlAcc>();
  const base = new Map<string, BaseAcc>();
  const phasesOf = (p: Phase): PhaseKey[] => ["all", p];

  for (const r of balls) {
    const b: Ball = {
      runsBatter: r.runs_batter, runsTotal: r.runs_total, nonBoundary: r.non_boundary === 1,
      wides: r.wides, noballs: r.noballs, byes: r.byes, legbyes: r.legbyes, penalty: r.penalty,
    };
    const phase = phaseOf(r.over_no, r.balls_per_over);
    const inningsKey = `${r.match_id}|${r.innings_no}`;
    const ws = wkts.get(`${r.match_id}|${r.innings_no}|${r.over_no}|${r.seq}`) ?? [];
    for (const ph of phasesOf(phase)) {
      const s = `${r.season_label}|${ph}`;
      // Batting: striker and non-striker are both at the crease for this ball.
      for (const pk of [r.batter, r.non_striker]) {
        const a = get(bat, `${pk}|${s}`, newBat);
        a.matches.add(r.match_id);
        a.innings.add(inningsKey);
      }
      const a = bat.get(`${r.batter}|${s}`)!;
      if (isFaced(b)) { a.balls++; if (isBattingDot(b)) a.dots++; }
      a.runs += b.runsBatter;
      if (isFour(b)) a.fours++;
      if (isSix(b)) a.sixes++;
      for (const w of ws) {
        if (!isDismissal(w.kind)) continue;
        const o = get(bat, `${w.player_out}|${s}`, newBat);
        o.matches.add(r.match_id);
        o.innings.add(inningsKey);
        o.outs++;
      }
      // Bowling.
      const o = get(bowl, `${r.bowler}|${s}`, newBowl);
      o.matches.add(r.match_id);
      o.innings.add(inningsKey);
      o.balls++;
      if (isLegal(b)) o.legal++;
      o.conceded += runsConceded(b);
      if (isBowlingDot(b)) o.dots++;
      if (isFour(b)) o.fours++;
      if (isSix(b)) o.sixes++;
      if (b.wides > 0) o.wides++;
      if (b.noballs > 0) o.noballs++;
      for (const w of ws) if (isBowlerWicket(w.kind)) o.wickets++;
      // Competition baseline.
      const z = get(base, s, newBase);
      z.innings.add(inningsKey);
      if (isFaced(b)) { z.faced++; if (isBattingDot(b)) z.dots++; }
      if (isLegal(b)) z.legal++;
      z.runsBatter += b.runsBatter;
      z.runsTotal += b.runsTotal;
      z.conceded += runsConceded(b);
      if (isFour(b)) z.fours++;
      if (isSix(b)) z.sixes++;
      for (const w of ws) {
        if (isDismissal(w.kind)) z.teamWkts++;
        if (isBowlerWicket(w.kind)) z.bowlerWkts++;
      }
    }
  }

  // Fielding: catches (caught-and-bowled credited to the bowler), stumpings, run-out involvement.
  const field = new Map<string, FieldAcc>();
  const newField = (): FieldAcc => ({ catches: 0, subCatches: 0, stumpings: 0, runOuts: 0 });
  for (const f of all<{ season_label: string; kind: string; player_key: number | null; substitute: number }>(db, `
    SELECT m.season_label, w.kind, wf.player_key, wf.substitute FROM wicket_fielders wf
    JOIN wickets w USING (match_id, innings_no, over_no, seq, n)
    JOIN innings i ON i.match_id = w.match_id AND i.innings_no = w.innings_no
    JOIN matches m ON m.match_id = w.match_id
    WHERE m.competition_id = ? AND m.in_latest_source = 1 AND i.super_over = 0 AND wf.player_key IS NOT NULL`, competitionId)) {
    const a = get(field, `${f.player_key}|${f.season_label}`, newField);
    if (f.kind === "caught") { a.catches++; if (f.substitute) a.subCatches++; }
    else if (f.kind === "stumped") a.stumpings++;
    else if (f.kind === "run out") a.runOuts++;
  }
  for (const c of all<{ season_label: string; bowler: number }>(db, `
    SELECT m.season_label, d.bowler FROM wickets w
    JOIN deliveries d USING (match_id, innings_no, over_no, seq)
    JOIN innings i ON i.match_id = w.match_id AND i.innings_no = w.innings_no
    JOIN matches m ON m.match_id = w.match_id
    WHERE m.competition_id = ? AND m.in_latest_source = 1 AND i.super_over = 0 AND w.kind = 'caught and bowled'`, competitionId)) {
    get(field, `${c.bowler}|${c.season_label}`, newField).catches++;
  }

  let battingRows = 0, bowlingRows = 0;
  transaction(db, () => {
    for (const t of ["agg_batting", "agg_bowling", "agg_fielding", "agg_appearances", "competition_baselines"]) {
      db.prepare(`DELETE FROM ${t} WHERE competition_id = ?`).run(competitionId);
    }
    const ib = db.prepare(`INSERT INTO agg_batting (player_key, competition_id, season_label, phase, matches, innings, balls_faced, runs, fours, sixes, dots, dismissals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const [k, a] of bat) {
      const [pk, season, phase] = k.split("|");
      ib.run(Number(pk), competitionId, season, phase, a.matches.size, a.innings.size, a.balls, a.runs, a.fours, a.sixes, a.dots, a.outs);
      battingRows++;
    }
    const iw = db.prepare(`INSERT INTO agg_bowling (player_key, competition_id, season_label, phase, matches, innings, balls, legal_balls, runs_conceded,
      wickets, dots, fours, sixes, wides, noballs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const [k, a] of bowl) {
      const [pk, season, phase] = k.split("|");
      iw.run(Number(pk), competitionId, season, phase, a.matches.size, a.innings.size, a.balls, a.legal, a.conceded, a.wickets, a.dots, a.fours, a.sixes, a.wides, a.noballs);
      bowlingRows++;
    }
    const iff = db.prepare(`INSERT INTO agg_fielding (player_key, competition_id, season_label, catches, catches_as_sub, stumpings, run_outs)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const [k, a] of field) {
      const [pk, season] = k.split("|");
      iff.run(Number(pk), competitionId, season, a.catches, a.subCatches, a.stumpings, a.runOuts);
    }
    db.prepare(`INSERT INTO agg_appearances (player_key, competition_id, season_label, team_id, matches)
      SELECT mp.player_key, m.competition_id, m.season_label, mp.team_id, COUNT(*) FROM match_players mp JOIN matches m USING (match_id)
      WHERE m.competition_id = ? AND m.in_latest_source = 1 GROUP BY mp.player_key, m.season_label, mp.team_id`).run(competitionId);
    const iz = db.prepare(`INSERT INTO competition_baselines (competition_id, season_label, phase, innings, balls_faced, legal_balls, runs_batter, runs_total,
      runs_conceded, team_wickets, bowler_wickets, fours, sixes, batting_dots) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const [k, z] of base) {
      const [season, phase] = k.split("|");
      iz.run(competitionId, season, phase, z.innings.size, z.faced, z.legal, z.runsBatter, z.runsTotal, z.conceded, z.teamWkts, z.bowlerWkts, z.fours, z.sixes, z.dots);
    }
  });
  return { code, balls: balls.length, battingRows, bowlingRows, ms: Math.round(performance.now() - started) };
}

export function aggregate(db: DatabaseSync, only?: Set<string> | null): AggregateSummary[] {
  const comps = all<{ competition_id: number; code: string }>(db, "SELECT competition_id, code FROM competitions ORDER BY competition_id")
    .filter((c) => !only || only.has(c.code));
  const out = comps.map((c) => aggregateCompetition(db, c.competition_id, c.code));
  setMeta(db, "aggregated_at", new Date().toISOString());
  return out;
}

if (process.argv[1] && /aggregate\.ts$/.test(process.argv[1])) {
  const { only } = parseArgs(process.argv.slice(2));
  const db = openGlobalDb();
  console.log("Aggregating analytics layer");
  for (const s of aggregate(db, only)) {
    console.log(`  ${s.code.padEnd(6)} ${s.balls} balls → ${s.battingRows} batting rows, ${s.bowlingRows} bowling rows (${s.ms} ms)`);
  }
  db.close();
}

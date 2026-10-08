// Decision Intelligence OS — match state for every ball, as a column store.
//
// The deliveries table's own pressure columns are placeholders
// (required_rr = 0 and pressure_state = 'Standard' on every row), so the
// state is rebuilt here: runs, legal balls and wickets before each ball,
// and for chases the real target from the raw Cricsheet file — including
// the 34 rain-reduced (DLS) targets — giving runs needed and required rate.
//
// The result is held as typed-array columns (~25 MB for 295k balls) so every
// module can scan all balls in milliseconds instead of re-querying SQLite.
//
// Ordering is by delivery_id within an innings: the stored ball_num restarts
// after the 9th ball of an over (Cricsheet "2.10" was parsed as 2.1), but ids
// follow bowling order. Across matches ids follow ingest order, not dates.

import fs from "fs";
import path from "path";
import { getProjectRoot, getDecisionDb, normalizeSeason, queryAll } from "./db";
import { getMatchStages } from "./stats-engine";

export interface BallState {
  matchId: string;
  inningsId: number;
  inningsNumber: 1 | 2;
  season: string;
  over: number; // 0-indexed
  batter: number;
  nonStriker: number;
  bowler: number;
  battingTeam: number;
  bowlingTeam: number;
  venue: number;
  batterRuns: number;
  totalRuns: number;
  conceded: number; // runs charged to the bowler
  legal: boolean; // counts as a ball bowled
  faced: boolean; // counts as a ball faced (not a wide)
  wide: boolean;
  noball: boolean;
  /** Any dismissal except retired hurt (team loses a wicket). */
  wicket: boolean;
  outPlayer: number | null;
  strikerOut: boolean;
  bowlerWicket: boolean;
  /** Team state before this ball. */
  runsBefore: number;
  legalBefore: number;
  wicketsBefore: number;
  /** Chases only. */
  runsNeeded: number | null;
  ballsLeft: number | null;
  requiredRate: number | null;
  knockout: boolean;
}

export interface MatchInfo {
  matchId: string;
  season: string;
  date: string;
  venue: number;
  team1: number;
  team2: number;
  winner: number | null;
  marginType: string | null;
  marginValue: number | null;
  tossWinner: number | null;
  tossDecision: string | null;
  knockout: boolean;
  stage: string | null;
  /** Chase target (runs, balls) when there was a second innings. */
  target: { runs: number; balls: number } | null;
}

export interface BallColumns {
  n: number;
  match: Int32Array; // index into matches[]
  innings: Int32Array; // innings_id
  inningsNumber: Uint8Array;
  season: Uint16Array;
  over: Uint8Array;
  batter: Int32Array;
  nonStriker: Int32Array;
  bowler: Int32Array;
  battingTeam: Int16Array;
  bowlingTeam: Int16Array;
  venue: Int16Array;
  batterRuns: Uint8Array;
  totalRuns: Uint8Array;
  conceded: Uint8Array;
  flags: Uint8Array; // bit0 legal, bit1 faced, bit2 wicket, bit3 strikerOut, bit4 bowlerWicket, bit5 knockout
  outPlayer: Int32Array; // -1 when none
  runsBefore: Int16Array;
  legalBefore: Uint8Array;
  wicketsBefore: Uint8Array;
  runsNeeded: Int16Array; // -1 when not a chase
  ballsLeft: Int16Array; // -1 when not a chase
  matches: MatchInfo[];
  matchIndex: Map<string, number>;
}

export const F_LEGAL = 1, F_FACED = 2, F_WICKET = 4, F_STRIKER_OUT = 8, F_BOWLER_WICKET = 16, F_KNOCKOUT = 32;

const BOWLER_KINDS = new Set(["bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"]);

let targetCache: Map<string, { runs: number; balls: number }> | null = null;

/** Chase targets from the raw files ("target": {"overs": 20, "runs": 208}). */
export function getTargets(): Map<string, { runs: number; balls: number }> {
  if (targetCache) return targetCache;
  targetCache = new Map();
  const dir = path.join(getProjectRoot(), "lib", "cricket-data", "raw");
  if (!fs.existsSync(dir)) return targetCache;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const m = /"target"\s*:\s*\{([^}]*)\}/.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!m) continue;
    try {
      const t = JSON.parse(`{${m[1]}}`) as { overs?: number; runs?: number };
      if (!t.runs) continue;
      const overs = t.overs ?? 20;
      // Reduced targets can be fractional overs: 5.3 = 5 overs 3 balls.
      const balls = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
      targetCache.set(file.replace(/\.json$/, ""), { runs: t.runs, balls });
    } catch {
      /* skip */
    }
  }
  return targetCache;
}

interface Row {
  id: number; inn: number; num: number; mid: string; ov: number;
  bat: number; ns: number; bowl: number; bt: number; wt: number;
  br: number; tr: number; w: number; nb: number; extra: number; kind: string | null; out: number | null;
}

let columns: BallColumns | null = null;

export function getBallColumns(): BallColumns {
  if (columns) return columns;
  const db = getDecisionDb();
  const empty = () => ({ n: 0 }) as unknown as BallColumns;
  if (!db) return empty();

  const targets = getTargets();
  const stages = getMatchStages();
  const knockouts = new Set(stages.playoffs);
  const finals = new Set(stages.finals);
  const firstInnings = new Map(
    queryAll<{ mid: string; runs: number }>(`
      SELECT d.match_id mid, SUM(d.total_runs) runs FROM deliveries d
      JOIN innings i ON i.innings_id = d.innings_id WHERE i.innings_number = 1 GROUP BY d.match_id`).map((r) => [r.mid, r.runs]),
  );
  const matches: MatchInfo[] = queryAll<{
    mid: string; season: string; date: string; venue: number; t1: number; t2: number; winner: number | null;
    mt: string | null; mv: number | null; tw: number | null; td: string | null;
  }>(`SELECT match_id mid, season_id season, date, venue_id venue, team1_id t1, team2_id t2, winner_id winner,
        margin_type mt, margin_value mv, toss_winner_id tw, toss_decision td FROM matches`).map((m) => ({
    matchId: m.mid,
    season: normalizeSeason(m.season),
    date: m.date,
    venue: m.venue,
    team1: m.t1,
    team2: m.t2,
    winner: m.winner,
    marginType: m.mt,
    marginValue: m.mv,
    tossWinner: m.tw,
    tossDecision: m.td,
    knockout: knockouts.has(m.mid),
    stage: finals.has(m.mid) ? "Final" : knockouts.has(m.mid) ? "Playoff" : null,
    target: targets.get(m.mid) ?? (firstInnings.has(m.mid) ? { runs: firstInnings.get(m.mid)! + 1, balls: 120 } : null),
  }));
  const matchIndex = new Map(matches.map((m, i) => [m.matchId, i]));

  const total = (queryAll<{ n: number }>(`
    SELECT COUNT(*) n FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id WHERE i.innings_number IN (1, 2)`)[0]?.n ?? 0) + 64;
  const c: BallColumns = {
    n: 0,
    match: new Int32Array(total), innings: new Int32Array(total), inningsNumber: new Uint8Array(total),
    season: new Uint16Array(total), over: new Uint8Array(total), batter: new Int32Array(total),
    nonStriker: new Int32Array(total), bowler: new Int32Array(total), battingTeam: new Int16Array(total),
    bowlingTeam: new Int16Array(total), venue: new Int16Array(total), batterRuns: new Uint8Array(total),
    totalRuns: new Uint8Array(total), conceded: new Uint8Array(total), flags: new Uint8Array(total),
    outPlayer: new Int32Array(total), runsBefore: new Int16Array(total), legalBefore: new Uint8Array(total),
    wicketsBefore: new Uint8Array(total), runsNeeded: new Int16Array(total), ballsLeft: new Int16Array(total),
    matches, matchIndex,
  };

  const stmt = db.prepare(`
    SELECT d.delivery_id id, d.innings_id inn, i.innings_number num, d.match_id mid, d.over_num ov,
      d.batter_id bat, d.non_striker_id ns, d.bowler_id bowl, i.batting_team_id bt, i.bowling_team_id wt,
      d.batter_runs br, d.total_runs tr, d.is_wide w, d.is_noball nb,
      CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 OR d.is_penalty = 1 THEN d.extra_runs ELSE 0 END extra,
      x.kind kind, x.player_out_id out
    FROM deliveries d
    JOIN innings i ON i.innings_id = d.innings_id
    LEFT JOIN dismissals x ON x.delivery_id = d.delivery_id
    WHERE i.innings_number IN (1, 2)
    ORDER BY d.innings_id, d.delivery_id`);

  let curInnings = -1, lastId = -1;
  let runs = 0, legal = 0, wkts = 0;
  let k = -1;
  for (const raw of stmt.iterate() as Iterable<unknown>) {
    const r = raw as Row;
    const counts = r.kind !== null && r.kind !== "retired hurt";
    // A ball with two dismissal rows (rare): fold the second into the first.
    if (r.id === lastId && k >= 0) {
      if (counts) { wkts++; c.flags[k] |= F_WICKET; c.outPlayer[k] = r.out ?? c.outPlayer[k]; }
      if (counts && r.out === c.batter[k]) c.flags[k] |= F_STRIKER_OUT;
      if (r.kind && BOWLER_KINDS.has(r.kind)) c.flags[k] |= F_BOWLER_WICKET;
      continue;
    }
    // Close the previous ball's effect on the running totals.
    if (k >= 0) {
      runs += c.totalRuns[k];
      if (c.flags[k] & F_LEGAL) legal++;
    }
    if (r.inn !== curInnings) { curInnings = r.inn; runs = 0; legal = 0; wkts = 0; }
    lastId = r.id;
    k++;
    const mi = matchIndex.get(r.mid) ?? -1;
    const m = mi >= 0 ? matches[mi] : null;
    c.match[k] = mi;
    c.innings[k] = r.inn;
    c.inningsNumber[k] = r.num;
    c.season[k] = Number(m?.season ?? 0);
    c.over[k] = r.ov;
    c.batter[k] = r.bat;
    c.nonStriker[k] = r.ns;
    c.bowler[k] = r.bowl;
    c.battingTeam[k] = r.bt;
    c.bowlingTeam[k] = r.wt;
    c.venue[k] = m?.venue ?? -1;
    c.batterRuns[k] = r.br;
    c.totalRuns[k] = r.tr;
    c.conceded[k] = r.tr - r.extra;
    let f = 0;
    if (!r.w && !r.nb) f |= F_LEGAL;
    if (!r.w) f |= F_FACED;
    if (counts) f |= F_WICKET;
    if (counts && r.out === r.bat) f |= F_STRIKER_OUT;
    if (r.kind && BOWLER_KINDS.has(r.kind)) f |= F_BOWLER_WICKET;
    if (m?.knockout) f |= F_KNOCKOUT;
    c.flags[k] = f;
    c.outPlayer[k] = counts && r.out !== null ? r.out : -1;
    c.runsBefore[k] = runs;
    c.legalBefore[k] = legal;
    c.wicketsBefore[k] = wkts;
    if (r.num === 2 && m?.target) {
      c.runsNeeded[k] = m.target.runs - runs;
      c.ballsLeft[k] = m.target.balls - legal;
    } else {
      c.runsNeeded[k] = -1;
      c.ballsLeft[k] = -1;
    }
    if (counts) wkts++;
  }
  c.n = k + 1;
  columns = c;
  return c;
}

/** One ball as an object (for code that prefers readability over speed). */
export function ballAt(c: BallColumns, i: number): BallState {
  const f = c.flags[i];
  const rn = c.runsNeeded[i];
  const bl = c.ballsLeft[i];
  const chase = rn !== -1 || bl !== -1;
  return {
    matchId: c.matches[c.match[i]]?.matchId ?? "",
    inningsId: c.innings[i],
    inningsNumber: c.inningsNumber[i] as 1 | 2,
    season: String(c.season[i]),
    over: c.over[i],
    batter: c.batter[i],
    nonStriker: c.nonStriker[i],
    bowler: c.bowler[i],
    battingTeam: c.battingTeam[i],
    bowlingTeam: c.bowlingTeam[i],
    venue: c.venue[i],
    batterRuns: c.batterRuns[i],
    totalRuns: c.totalRuns[i],
    conceded: c.conceded[i],
    legal: Boolean(f & F_LEGAL),
    faced: Boolean(f & F_FACED),
    wide: !(f & F_FACED),
    noball: Boolean(f & F_FACED) && !(f & F_LEGAL),
    wicket: Boolean(f & F_WICKET),
    outPlayer: c.outPlayer[i] >= 0 ? c.outPlayer[i] : null,
    strikerOut: Boolean(f & F_STRIKER_OUT),
    bowlerWicket: Boolean(f & F_BOWLER_WICKET),
    runsBefore: c.runsBefore[i],
    legalBefore: c.legalBefore[i],
    wicketsBefore: c.wicketsBefore[i],
    runsNeeded: chase ? rn : null,
    ballsLeft: chase ? bl : null,
    requiredRate: chase && bl > 0 ? (rn / bl) * 6 : null,
    knockout: Boolean(f & F_KNOCKOUT),
  };
}

/** Stream every ball of innings 1–2 in bowling order, with the match state before it. */
export function forEachBall(cb: (b: BallState) => void): void {
  const c = getBallColumns();
  for (let i = 0; i < c.n; i++) cb(ballAt(c, i));
}

/** Index range [start, end) of each innings in the column store, in bowling order. */
let inningsRanges: Map<number, [number, number]> | null = null;
export function getInningsRanges(): Map<number, [number, number]> {
  if (inningsRanges) return inningsRanges;
  const c = getBallColumns();
  const m = new Map<number, [number, number]>();
  for (let i = 0; i < c.n; i++) {
    const r = m.get(c.innings[i]);
    if (r) r[1] = i + 1;
    else m.set(c.innings[i], [i, i + 1]);
  }
  inningsRanges = m;
  return m;
}

/** innings_id of each innings of a match, by innings number. */
export function inningsOfMatch(matchId: string): { 1?: number; 2?: number } {
  const out: { 1?: number; 2?: number } = {};
  for (const r of queryAll<{ id: number; num: number }>("SELECT innings_id id, innings_number num FROM innings WHERE match_id = ? AND innings_number IN (1, 2)", matchId)) {
    out[r.num as 1 | 2] = r.id;
  }
  return out;
}

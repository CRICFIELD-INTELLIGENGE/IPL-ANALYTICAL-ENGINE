// Full scorecard and ball-by-ball commentary for any of the 1243 archived
// matches, computed from the Cricsheet delivery record rather than invented.
//
// What this replaces: the match page used to build an archived scorecard as
//
//   batting: [{ name: mom || "Best Performer", runs: 85, balls: 45, ... }]
//   bowling: [{ name: "Bowler", overs: 4, runs: 24, wickets: 3 }]
//
// — the same fictional 85 off 45 for every match in league history — and served
// the same four lines of IPL-2026-final commentary for all of them.
//
// Everything here is derived per ball: batting and bowling figures, extras,
// fall of wickets, the playing XIs, and the dismissal descriptions. The
// commentary text comes from `delivery_commentary`, scraped from ESPN and
// joined ball-for-ball.
//
// Scoring conventions follow the ones scorecards actually use:
//   * A batter faces no-balls but not wides, so wides do not count as balls
//     faced or as balls bowled in an over.
//   * A bowler is charged with wides and no-balls but not byes or leg-byes.
//   * Run outs, retirements and obstruction are not credited to the bowler.

import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { warehousePath } from "./decision/db";

let projectRoot: string | null = null;
function getRoot(): string {
  if (projectRoot) return projectRoot;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "lib", "cricket-data", "raw"))) { projectRoot = dir; return dir; }
    dir = path.dirname(dir);
  }
  projectRoot = process.cwd();
  return projectRoot;
}

const rawCache = new Map<string, any>();
function loadRaw(matchId: string): any | null {
  if (rawCache.has(matchId)) return rawCache.get(matchId);
  const fp = path.join(getRoot(), "lib", "cricket-data", "raw", `${matchId}.json`);
  if (!fs.existsSync(fp)) { rawCache.set(matchId, null); return null; }
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  rawCache.set(matchId, data);
  return data;
}

export interface BattingLine {
  name: string; dismissal: string; runs: number; balls: number;
  fours: number; sixes: number; sr: number; notOut: boolean; out: boolean;
}
export interface BowlingLine {
  name: string; overs: string; maidens: number; runs: number; wickets: number;
  econ: number; dots: number; wides: number; noballs: number;
}

/** "c Mandeep Singh b A Choudhary", "lbw b Chahal", "run out (Kohli)". */
function describeDismissal(w: any, bowler: string): string {
  const kind = String(w.kind || "").toLowerCase();
  const fielders = (w.fielders || []).map((f: any) => f?.name).filter(Boolean);
  const f = fielders.join(", ");
  switch (kind) {
    case "caught":
      // A bowler who catches his own dismissal is written "c & b".
      return fielders.length && fielders[0] === bowler ? `c & b ${bowler}` : `c ${f || "?"} b ${bowler}`;
    case "caught and bowled": return `c & b ${bowler}`;
    case "bowled":            return `b ${bowler}`;
    case "lbw":               return `lbw b ${bowler}`;
    case "stumped":           return `st ${f || "?"} b ${bowler}`;
    case "run out":           return f ? `run out (${f})` : "run out";
    case "hit wicket":        return `hit wicket b ${bowler}`;
    case "retired hurt":      return "retired hurt";
    case "retired out":       return "retired out";
    case "retired not out":   return "retired not out";
    case "obstructing the field": return "obstructing the field";
    case "handled the ball":  return "handled the ball";
    case "hit the ball twice": return "hit the ball twice";
    case "timed out":         return "timed out";
    default:                  return kind ? `${kind} b ${bowler}` : "not out";
  }
}

/** Wickets that do not go to the bowler's figures. */
const UNCREDITED = new Set(["run out", "retired hurt", "retired out", "retired not out", "obstructing the field", "handled the ball", "timed out", "hit the ball twice"]);

function buildInnings(inn: any, squad: string[]) {
  const bat = new Map<string, BattingLine>();
  const order: string[] = [];
  const bowl = new Map<string, BowlingLine & { balls: number }>();
  const extras = { total: 0, wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0 };
  const fow: { wicket: number; name: string; score: string; over: string }[] = [];

  let runs = 0, wickets = 0, legalBalls = 0;

  const batter = (name: string): BattingLine => {
    let b = bat.get(name);
    if (!b) {
      b = { name, dismissal: "not out", runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0, notOut: true, out: false };
      bat.set(name, b);
      order.push(name);
    }
    return b;
  };
  const bowler = (name: string) => {
    let b = bowl.get(name);
    if (!b) {
      b = { name, overs: "0.0", maidens: 0, runs: 0, wickets: 0, econ: 0, dots: 0, wides: 0, noballs: 0, balls: 0 };
      bowl.set(name, b);
    }
    return b;
  };

  for (const over of inn.overs ?? []) {
    let overRunsOffBowler = 0;
    let overLegalBalls = 0;
    let overBowler: string | null = null;

    for (const d of over.deliveries ?? []) {
      const ex = d.extras ?? {};
      const wides = Number(ex.wides || 0);
      const noballs = Number(ex.noballs || 0);
      const byes = Number(ex.byes || 0);
      const legbyes = Number(ex.legbyes || 0);
      const penalty = Number(ex.penalty || 0);
      const batRuns = Number(d.runs?.batter || 0);
      const totalRuns = Number(d.runs?.total || 0);
      const isWide = wides > 0;

      runs += totalRuns;
      extras.wides += wides; extras.noballs += noballs;
      extras.byes += byes; extras.legbyes += legbyes; extras.penalty += penalty;
      extras.total += Number(d.runs?.extras || 0);

      // Batter: faces everything except a wide.
      const b = batter(d.batter);
      // The non-striker still belongs on the card even before facing a ball.
      batter(d.non_striker);
      b.runs += batRuns;
      if (!isWide) b.balls++;
      if (batRuns === 4) b.fours++;
      if (batRuns === 6) b.sixes++;

      // Bowler: charged with wides and no-balls, not byes or leg-byes.
      const bw = bowler(d.bowler);
      overBowler = d.bowler;
      const charged = batRuns + wides + noballs;
      bw.runs += charged;
      overRunsOffBowler += charged;
      if (isWide) bw.wides += wides;
      if (noballs) bw.noballs += noballs;
      if (!isWide && noballs === 0) {
        bw.balls++; legalBalls++; overLegalBalls++;
        if (totalRuns === 0) bw.dots++;
      } else if (noballs > 0) {
        // A no-ball is bowled but does not count towards the over.
        if (totalRuns === 0) bw.dots++;
      }

      for (const w of d.wickets ?? []) {
        wickets++;
        const out = batter(w.player_out);
        out.dismissal = describeDismissal(w, d.bowler);
        out.notOut = false;
        out.out = true;
        if (!UNCREDITED.has(String(w.kind || "").toLowerCase())) bw.wickets++;
        const ballLabel = d.actual_delivery ?? `${over.over}.${overLegalBalls}`;
        fow.push({ wicket: wickets, name: w.player_out, score: `${runs}/${wickets}`, over: String(ballLabel) });
      }
    }

    // A maiden is an over in which the bowler conceded nothing and bowled it out.
    if (overBowler && overRunsOffBowler === 0 && overLegalBalls >= 6) bowler(overBowler).maidens++;
  }

  const battingList = order.map(n => {
    const b = bat.get(n)!;
    b.sr = b.balls > 0 ? Math.round((b.runs / b.balls) * 1000) / 10 : 0;
    return b;
  })
    // A non-striker who never faced a ball and never got out did not bat.
    .filter(b => b.balls > 0 || b.out || b.runs > 0);

  const bowlingList = [...bowl.values()].map(b => {
    const overs = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
    const econ = b.balls > 0 ? Math.round((b.runs / (b.balls / 6)) * 100) / 100 : 0;
    const { balls, ...rest } = b;
    return { ...rest, overs, econ };
  });

  const batted = new Set(battingList.map(b => b.name));
  const didNotBat = squad.filter(p => !batted.has(p));

  return {
    team: inn.team,
    runs,
    wickets,
    overs: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`,
    runRate: legalBalls > 0 ? Math.round((runs / (legalBalls / 6)) * 100) / 100 : 0,
    extras,
    batting: battingList,
    bowling: bowlingList,
    fallOfWickets: fow,
    didNotBat,
    superOver: !!inn.super_over,
  };
}

export function getMatchScorecard(matchId: string) {
  const raw = loadRaw(matchId);
  if (!raw) return null;
  const info = raw.info ?? {};
  const teams: string[] = info.teams ?? [];
  const players: Record<string, string[]> = info.players ?? {};

  // Cricsheet uses six outcome shapes across the archive and all six occur:
  //   winner + by.runs (545)      winner + by.wickets (650)
  //   winner + by + method (23, D/L)
  //   eliminator + result:"tie" (16, decided by super over)
  //   result:"no result" (9, abandoned)
  // Reading only `winner` left the 25 tied and abandoned matches showing no
  // result at all, including the 2020 RCB–MI super over.
  const outcome = info.outcome ?? {};
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const result = outcome.winner
    ? {
        winner: outcome.winner,
        by: outcome.by?.runs != null ? plural(outcome.by.runs, "run")
          : outcome.by?.wickets != null ? plural(outcome.by.wickets, "wicket")
          : null,
        method: outcome.method ?? null,
        result: null as string | null,
      }
    : outcome.eliminator
      ? {
          winner: outcome.eliminator,
          by: "Super Over",
          method: outcome.method ?? null,
          result: outcome.result ?? "tie",
        }
      : { winner: null, by: null, method: outcome.method ?? null, result: outcome.result ?? null };

  return {
    matchId,
    season: info.season ?? null,
    date: info.dates?.[0] ?? null,
    venue: info.venue ?? null,
    city: info.city ?? null,
    teams,
    event: { name: info.event?.name ?? null, matchNumber: info.event?.match_number ?? null, stage: info.event?.stage ?? null },
    toss: info.toss ? { winner: info.toss.winner, decision: info.toss.decision } : null,
    result,
    playerOfMatch: info.player_of_match ?? [],
    officials: {
      umpires: info.officials?.umpires ?? [],
      tvUmpires: info.officials?.tv_umpires ?? [],
      matchReferees: info.officials?.match_referees ?? [],
    },
    squads: teams.map(t => ({ team: t, players: players[t] ?? [] })),
    innings: (raw.innings ?? []).map((inn: any) => buildInnings(inn, players[inn.team] ?? [])),
  };
}

/* ---------------------------- commentary ---------------------------- */

let db: DatabaseSync | null = null;
let dbTried = false;
function getDb(): DatabaseSync | null {
  if (dbTried) return db;
  dbTried = true;
  const fp = warehousePath();
  if (!fs.existsSync(fp)) return null;
  try {
    db = new DatabaseSync(fp, { readOnly: true });
  } catch {
    db = null;
  }
  return db;
}

export interface CommentaryBall {
  innings: number;
  over: string;
  batter: string | null;
  bowler: string | null;
  runs: number;
  text: string;
  isWicket: boolean;
  isBoundary: boolean;
  dismissal: string | null;
  length: string | null;
  line: string | null;
  variation: string | null;
  shot: string | null;
  zone: string | null;
  speedKph: number | null;
}

/**
 * Ball-by-ball commentary for a match, newest ball first within each innings —
 * the order a scorecard reader expects.
 *
 * Returns an empty list rather than filler when the match has no commentary:
 * one match (the abandoned PBKS v DC of 8 May 2025) has none at source, and a
 * handful of innings were refused by the ball-for-ball join rather than risk
 * attaching text to the wrong delivery.
 */
export function getMatchCommentary(matchId: string): { matchId: string; innings: { innings: number; team: string | null; balls: CommentaryBall[] }[] } {
  const d = getDb();
  const raw = loadRaw(matchId);
  const empty = { matchId, innings: [] as any[] };
  if (!d) return empty;

  const rows = d.prepare(`
    SELECT dl.innings_id, dl.over_num, dl.ball_num, dl.batter_runs, dl.total_runs,
           dl.is_boundary, pb.name AS batter, pw.name AS bowler,
           dis.kind AS dismissal_kind, dis.player_out_id,
           po.name AS player_out,
           c.commentary, c.length, c.line, c.variation, c.shot, c.zone, c.speed_kph
      FROM deliveries dl
      JOIN delivery_commentary c ON c.delivery_id = dl.delivery_id
      LEFT JOIN players pb ON pb.player_id = dl.batter_id
      LEFT JOIN players pw ON pw.player_id = dl.bowler_id
      LEFT JOIN dismissals dis ON dis.delivery_id = dl.delivery_id
      LEFT JOIN players po ON po.player_id = dis.player_out_id
     WHERE dl.match_id = ?
     ORDER BY dl.delivery_id
  `).all(matchId) as any[];

  if (rows.length === 0) return empty;

  // innings_id is global across the database, so reduce it to 1st/2nd/… here.
  const seen: number[] = [];
  for (const r of rows) if (!seen.includes(r.innings_id)) seen.push(r.innings_id);
  const ordinalOf = new Map(seen.map((id, i) => [id, i + 1]));
  const teamOf = (ord: number) => raw?.innings?.[ord - 1]?.team ?? null;

  const grouped = new Map<number, CommentaryBall[]>();
  for (const r of rows) {
    const ord = ordinalOf.get(r.innings_id)!;
    if (!grouped.has(ord)) grouped.set(ord, []);
    grouped.get(ord)!.push({
      innings: ord,
      over: `${r.over_num}.${r.ball_num}`,
      batter: r.batter ?? null,
      bowler: r.bowler ?? null,
      runs: Number(r.total_runs ?? 0),
      text: r.commentary ?? "",
      isWicket: !!r.dismissal_kind,
      isBoundary: Number(r.batter_runs) === 4 || Number(r.batter_runs) === 6,
      dismissal: r.dismissal_kind ? `${r.player_out ?? "Batter"} — ${r.dismissal_kind}` : null,
      length: r.length ?? null,
      line: r.line ?? null,
      variation: r.variation ?? null,
      shot: r.shot ?? null,
      zone: r.zone ?? null,
      speedKph: r.speed_kph ?? null,
    });
  }

  return {
    matchId,
    innings: [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([innings, balls]) => ({ innings, team: teamOf(innings), balls: balls.reverse() })),
  };
}

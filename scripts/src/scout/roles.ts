// Scouting layer — usage-derived, season-specific roles.
//
// Roles describe how a player was used, not how well they did. Inputs come
// from every ball (super overs excluded): order of arrival at the crease, the
// legal-ball count when they arrived, the phases in which they faced or
// bowled, and whether they took the new ball. Rules are versioned; every role
// row stores the inputs that produced it.

import type { DatabaseSync } from "node:sqlite";
import { all, transaction } from "../global/db";
import { phaseOf } from "../global/metrics";

export const ROLE_RULES_VERSION = "roles-v1";

export type BattingRole = "opener" | "top_order" | "middle_order" | "finisher" | "lower_order" | "insufficient";
export type BowlingRole = "powerplay_specialist" | "middle_specialist" | "death_specialist" | "multi_phase" | "part_time" | "insufficient" | "none";

export interface BattingInputs { innings: number; openShare: number; medianPosition: number; medianEntryBall: number; ballsFaced: number; deathShare: number; powerplayShare: number }
export interface BowlingInputs { innings: number; legalBalls: number; oversPerInnings: number; powerplayShare: number; middleShare: number; deathShare: number; newBallShare: number }

/** Minimum usage before a role is assigned. */
export const MIN_BATTING_INNINGS = 3;
export const MIN_BOWLING_BALLS = 60;
export const PART_TIME_OVERS_PER_INNINGS = 1.5;

/**
 * Batting role, rules evaluated in order (roles-v1):
 *  1. fewer than 3 innings at the crease → insufficient
 *  2. opened (position 1–2) in at least half the innings → opener
 *  3. median arrival position 8 or lower → lower_order
 *  4. median arrival after 72 legal balls (over 13+), or half the balls faced in the death with median position ≥ 5 → finisher
 *  5. median arrival before 36 legal balls (inside the powerplay) → top_order
 *  6. otherwise → middle_order
 */
export function battingRole(x: BattingInputs): BattingRole {
  if (x.innings < MIN_BATTING_INNINGS) return "insufficient";
  if (x.openShare >= 0.5) return "opener";
  if (x.medianPosition >= 8) return "lower_order";
  if (x.medianEntryBall >= 72 || (x.deathShare >= 0.5 && x.medianPosition >= 5)) return "finisher";
  if (x.medianEntryBall < 36) return "top_order";
  return "middle_order";
}

/** Each phase's share of a full T20 innings (overs 1–6, 7–15, 16–20). */
export const T20_PHASE_SHARE = { powerplay: 6 / 20, middle: 9 / 20, death: 5 / 20 };
/** A specialist bowls a phase at least 1.6× as often as an even spread would (T20: ≥48% powerplay, ≥72% middle, ≥40% death). */
export const SPECIALIST_FACTOR = 1.6;

/**
 * Bowling role (roles-v1):
 *  1. never bowled → none; fewer than 60 legal balls → insufficient
 *  2. under 1.5 overs per innings bowled → part_time
 *  3. exactly one phase reaches 1.6× its natural share of their legal balls → that phase's specialist
 *  4. otherwise (no phase concentrated, or two) → multi_phase
 * Thresholds scale with phase length; a flat 50% would make death specialists (5 of 20 overs) almost impossible.
 */
export function bowlingRole(x: BowlingInputs, share = T20_PHASE_SHARE): BowlingRole {
  if (x.legalBalls === 0) return "none";
  if (x.legalBalls < MIN_BOWLING_BALLS) return "insufficient";
  if (x.oversPerInnings < PART_TIME_OVERS_PER_INNINGS) return "part_time";
  const qualifying = ([["powerplay", x.powerplayShare], ["middle", x.middleShare], ["death", x.deathShare]] as const)
    .filter(([phase, s]) => s >= SPECIALIST_FACTOR * share[phase]);
  if (qualifying.length === 1) return `${qualifying[0][0]}_specialist` as BowlingRole;
  return "multi_phase";
}

export function usageProfile(bat: BattingRole, bowl: BowlingRole, stumpings: number): string {
  const bats = bat !== "insufficient" && bat !== "lower_order";
  const bowls = bowl !== "none" && bowl !== "insufficient" && bowl !== "part_time";
  if (stumpings > 0 && bats) return "keeper_batter";
  if (bats && bowls) return "all_rounder";
  if (bowls) return "bowler";
  if (bats) return "batter";
  return "limited";
}

export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface BattingInningsRow { position: number; entry_legal_ball: number; balls_faced: number; faced_powerplay: number; faced_death: number }
export interface BowlingInningsRow { legal_balls: number; legal_powerplay: number; legal_middle: number; legal_death: number; new_ball: number }

export function battingInputs(rows: BattingInningsRow[]): BattingInputs {
  const faced = rows.reduce((s, r) => s + r.balls_faced, 0);
  return {
    innings: rows.length,
    openShare: rows.length ? rows.filter((r) => r.position <= 2).length / rows.length : 0,
    medianPosition: median(rows.map((r) => r.position)),
    medianEntryBall: median(rows.map((r) => r.entry_legal_ball)),
    ballsFaced: faced,
    deathShare: faced ? rows.reduce((s, r) => s + r.faced_death, 0) / faced : 0,
    powerplayShare: faced ? rows.reduce((s, r) => s + r.faced_powerplay, 0) / faced : 0,
  };
}

export function bowlingInputs(rows: BowlingInningsRow[]): BowlingInputs {
  const legal = rows.reduce((s, r) => s + r.legal_balls, 0);
  return {
    innings: rows.length,
    legalBalls: legal,
    oversPerInnings: rows.length ? legal / 6 / rows.length : 0,
    powerplayShare: legal ? rows.reduce((s, r) => s + r.legal_powerplay, 0) / legal : 0,
    middleShare: legal ? rows.reduce((s, r) => s + r.legal_middle, 0) / legal : 0,
    deathShare: legal ? rows.reduce((s, r) => s + r.legal_death, 0) / legal : 0,
    newBallShare: rows.length ? rows.filter((r) => r.new_ball).length / rows.length : 0,
  };
}

interface Ball {
  match_id: number; innings_no: number; over_no: number; batter: number; non_striker: number; bowler: number;
  runs_batter: number; wides: number; noballs: number; season_label: string; competition_id: number; balls_per_over: number;
}

/** Rebuilds the per-innings tables, phase variance, coverage and season roles for one competition. */
export function buildCompetitionRoles(db: DatabaseSync, competitionId: number): { battingInnings: number; bowlingInnings: number; roles: number } {
  const balls = all<Ball>(db, `
    SELECT d.match_id, d.innings_no, d.over_no, d.batter, d.non_striker, d.bowler, d.runs_batter, d.wides, d.noballs,
      m.season_label, m.competition_id, m.balls_per_over
    FROM deliveries d JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no JOIN matches m ON m.match_id = d.match_id
    WHERE m.competition_id = ? AND m.in_latest_source = 1 AND i.super_over = 0
    ORDER BY d.match_id, d.innings_no, d.over_no, d.seq`, competitionId);
  const outs = new Set(all<{ k: string }>(db, `
    SELECT w.match_id || '|' || w.innings_no || '|' || w.player_out k FROM wickets w JOIN matches m USING (match_id)
    JOIN innings i ON i.match_id = w.match_id AND i.innings_no = w.innings_no
    WHERE m.competition_id = ? AND i.super_over = 0 AND w.kind NOT IN ('retired hurt', 'retired not out')`, competitionId).map((r) => r.k));

  type Bat = { position: number; entry: number; faced: number; runs: number; pp: number; mid: number; death: number };
  type Bowl = { legal: number; pp: number; mid: number; death: number; newBall: number };
  const batRows = new Map<string, Bat & { season: string }>();
  const bowlRows = new Map<string, Bowl & { season: string }>();
  const variance = new Map<string, { fn: number; fs: number; fq: number; ln: number; cs: number; cq: number }>();

  let curInnings = "", arrivals = 0, legalSoFar = 0;
  for (const b of balls) {
    const innKey = `${b.match_id}|${b.innings_no}`;
    if (innKey !== curInnings) { curInnings = innKey; arrivals = 0; legalSoFar = 0; }
    const phase = phaseOf(b.over_no, b.balls_per_over);
    // Arrivals: striker first, then non-striker (so the opening striker is position 1).
    for (const pk of [b.batter, b.non_striker]) {
      const k = `${innKey}|${pk}`;
      if (!batRows.has(k)) batRows.set(k, { position: ++arrivals, entry: legalSoFar, faced: 0, runs: 0, pp: 0, mid: 0, death: 0, season: b.season_label });
    }
    const legal = b.wides === 0 && b.noballs === 0;
    const r = batRows.get(`${innKey}|${b.batter}`)!;
    if (b.wides === 0) {
      r.faced++;
      if (phase === "powerplay") r.pp++; else if (phase === "middle") r.mid++; else r.death++;
    }
    r.runs += b.runs_batter;
    const bk = `${innKey}|${b.bowler}`;
    let o = bowlRows.get(bk);
    if (!o) { o = { legal: 0, pp: 0, mid: 0, death: 0, newBall: 0, season: b.season_label }; bowlRows.set(bk, o); }
    if (b.over_no <= 1) o.newBall = 1;
    if (legal) {
      o.legal++;
      if (phase === "powerplay") o.pp++; else if (phase === "middle") o.mid++; else o.death++;
    }
    for (const ph of ["all", phase]) {
      const vk = `${b.season_label}|${ph}`;
      const v = variance.get(vk) ?? variance.set(vk, { fn: 0, fs: 0, fq: 0, ln: 0, cs: 0, cq: 0 }).get(vk)!;
      if (b.wides === 0) { v.fn++; v.fs += b.runs_batter; v.fq += b.runs_batter * b.runs_batter; }
      if (legal) { v.ln++; v.cs += b.runs_batter; v.cq += b.runs_batter * b.runs_batter; }
    }
    if (legal) legalSoFar++;
  }

  const stumpings = new Map(all<{ player_key: number; season_label: string; stumpings: number }>(db,
    "SELECT player_key, season_label, stumpings FROM agg_fielding WHERE competition_id = ?", competitionId).map((r) => [`${r.player_key}|${r.season_label}`, r.stumpings]));

  let roles = 0;
  transaction(db, () => {
    for (const t of ["scout_batting_innings", "scout_bowling_innings", "scout_roles", "scout_phase_variance"]) {
      db.prepare(`DELETE FROM ${t} WHERE competition_id = ?`).run(competitionId);
    }
    const ib = db.prepare(`INSERT INTO scout_batting_innings (match_id, innings_no, player_key, competition_id, season_label, position, entry_legal_ball,
      balls_faced, runs, dismissed, faced_powerplay, faced_middle, faced_death) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const [k, r] of batRows) {
      const [m, i, pk] = k.split("|").map(Number);
      ib.run(m, i, pk, competitionId, r.season, r.position, r.entry, r.faced, r.runs, outs.has(`${m}|${i}|${pk}`) ? 1 : 0, r.pp, r.mid, r.death);
    }
    const io = db.prepare(`INSERT INTO scout_bowling_innings (match_id, innings_no, player_key, competition_id, season_label, legal_balls, legal_powerplay,
      legal_middle, legal_death, new_ball) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const [k, r] of bowlRows) {
      const [m, i, pk] = k.split("|").map(Number);
      io.run(m, i, pk, competitionId, r.season, r.legal, r.pp, r.mid, r.death, r.newBall);
    }
    const iv = db.prepare(`INSERT INTO scout_phase_variance (competition_id, season_label, phase, faced_n, faced_sum, faced_sumsq, legal_n, conceded_sum, conceded_sumsq)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    for (const [k, v] of variance) {
      const [season, phase] = k.split("|");
      iv.run(competitionId, season, phase, v.fn, v.fs, v.fq, v.ln, v.cs, v.cq);
    }

    // Season roles from the per-innings rows just written.
    const batBy = new Map<string, BattingInningsRow[]>();
    for (const [k, r] of batRows) {
      const pk = k.split("|")[2];
      const key = `${pk}|${r.season}`;
      (batBy.get(key) ?? batBy.set(key, []).get(key)!).push({ position: r.position, entry_legal_ball: r.entry, balls_faced: r.faced, faced_powerplay: r.pp, faced_death: r.death });
    }
    const bowlBy = new Map<string, BowlingInningsRow[]>();
    for (const [k, r] of bowlRows) {
      const pk = k.split("|")[2];
      const key = `${pk}|${r.season}`;
      (bowlBy.get(key) ?? bowlBy.set(key, []).get(key)!).push({ legal_balls: r.legal, legal_powerplay: r.pp, legal_middle: r.mid, legal_death: r.death, new_ball: r.newBall });
    }
    const ir = db.prepare("INSERT INTO scout_roles (player_key, competition_id, season_label, batting_role, bowling_role, usage_profile, inputs) VALUES (?,?,?,?,?,?,?)");
    for (const key of new Set([...batBy.keys(), ...bowlBy.keys()])) {
      const [pk, season] = [Number(key.split("|")[0]), key.split("|").slice(1).join("|")];
      const bi = battingInputs(batBy.get(key) ?? []);
      const oi = bowlingInputs(bowlBy.get(key) ?? []);
      const br = battingRole(bi), or = bowlingRole(oi);
      const st = stumpings.get(key) ?? 0;
      ir.run(pk, competitionId, season, br, or, usageProfile(br, or, st), JSON.stringify({ batting: bi, bowling: oi, stumpings: st }));
      roles++;
    }

    // Coverage: matches per season against the competition's median season.
    db.prepare("DELETE FROM scout_coverage WHERE competition_id = ?").run(competitionId);
    const seasons = all<{ season_label: string; matches: number }>(db, "SELECT season_label, matches FROM seasons WHERE competition_id = ?", competitionId);
    const typical = median(seasons.map((s) => s.matches));
    const ic = db.prepare("INSERT INTO scout_coverage (competition_id, season_label, matches, typical, ratio, status) VALUES (?,?,?,?,?,?)");
    for (const s of seasons) {
      const ratio = typical ? s.matches / typical : 0;
      ic.run(competitionId, s.season_label, s.matches, typical, ratio, ratio < 0.6 ? "partial" : "complete");
    }
  });
  return { battingInnings: batRows.size, bowlingInnings: bowlRows.size, roles };
}

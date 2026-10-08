// Decision Intelligence OS — Slice 1: `/api/players/:id/summary`.
//
// One call returns everything a decision module needs about a player:
// merged metadata, career line, season-by-season line, phase splits
// (powerplay / middle / death) and the head-to-head matchups with the most
// balls on record.

import { queryAll } from "./db";
import { estimateImpact, round, type ImpactEstimate } from "./impact-model";
import {
  getPlayerMeta,
  getSeasonLines,
  getSeasons,
  type PlayerMeta,
  type PlayingRole,
} from "./player-profiles";

export interface CareerLine {
  matches: number;
  runs: number;
  ballsFaced: number;
  outs: number;
  battingAverage: number | null;
  strikeRate: number | null;
  fours: number;
  sixes: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  economy: number | null;
  bowlingAverage: number | null;
  bowlingStrikeRate: number | null;
}

export interface SeasonSummary extends CareerLine {
  season: string;
}

export interface PhaseSummary {
  phase: "powerplay" | "middle" | "death";
  battingRuns: number;
  battingBalls: number;
  battingStrikeRate: number | null;
  bowlingRuns: number;
  bowlingBalls: number;
  bowlingWickets: number;
  bowlingEconomy: number | null;
}

export interface MatchupSummary {
  opponentId: number;
  opponentName: string;
  balls: number;
  runs: number;
  dismissals: number;
  strikeRate: number | null;
}

export interface PlayerSummary {
  player: PlayerMeta & { role: PlayingRole };
  career: CareerLine;
  seasons: SeasonSummary[];
  phases: PhaseSummary[];
  headToHead: { asBatter: MatchupSummary[]; asBowler: MatchupSummary[] };
  impact: ImpactEstimate & { season: string };
}

const ratio = (a: number, b: number, mult = 1): number | null => (b > 0 ? round((a / b) * mult) : null);

function toCareer(l: {
  matches: number; batRuns: number; batBalls: number; batOuts: number; fours: number; sixes: number;
  bowlBalls: number; bowlRuns: number; wickets: number;
}): CareerLine {
  return {
    matches: l.matches,
    runs: l.batRuns,
    ballsFaced: l.batBalls,
    outs: l.batOuts,
    battingAverage: ratio(l.batRuns, l.batOuts),
    strikeRate: ratio(l.batRuns, l.batBalls, 100),
    fours: l.fours,
    sixes: l.sixes,
    wickets: l.wickets,
    ballsBowled: l.bowlBalls,
    runsConceded: l.bowlRuns,
    economy: ratio(l.bowlRuns, l.bowlBalls, 6),
    bowlingAverage: ratio(l.bowlRuns, l.wickets),
    bowlingStrikeRate: ratio(l.bowlBalls, l.wickets),
  };
}

/**
 * Accepts a numeric player_id, a Cricsheet id ("ba607b88"), an exact Cricsheet
 * name ("V Kohli") or a profile-page slug ("v-kohli"). Slugs resolve only when
 * exactly one player's name or full name matches.
 */
export function resolvePlayerId(key: string): number | null {
  if (/^\d+$/.test(key)) {
    const id = Number(key);
    return getPlayerMeta().has(id) ? id : null;
  }
  const row = queryAll<{ player_id: number }>(
    "SELECT player_id FROM players WHERE cricsheet_id = ? OR lower(name) = lower(?) LIMIT 1",
    key,
    key,
  )[0];
  if (row) return row.player_id;
  if (!key.includes("-")) return null;
  const flat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const want = flat(key);
  const hits = [...getPlayerMeta().values()].filter((m) => flat(m.name) === want || (m.fullName !== null && flat(m.fullName) === want));
  return hits.length === 1 ? hits[0].playerId : null;
}

export interface PlayerSearchHit {
  playerId: number;
  name: string;
  fullName: string | null;
  country: string | null;
  matches: number;
  lastSeason: string | null;
  primary: "batting" | "bowling";
}

/** Name search for player pickers: prefix matches first, then by matches played. */
export function searchPlayers(q: string, limit = 8): PlayerSearchHit[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const lines = getSeasonLines();
  const hits: (PlayerSearchHit & { rank: number })[] = [];
  for (const m of getPlayerMeta().values()) {
    const ls = lines.get(m.playerId);
    if (!ls?.length) continue;
    const names = [m.name, m.fullName ?? ""].map((n) => n.toLowerCase());
    const words = names.flatMap((n) => n.split(/\s+/));
    // Any word starting with the query ranks first ("pan" → Pant before Pankaj only by matches played).
    const rank = words.some((w) => w.startsWith(needle)) || names.some((n) => n.startsWith(needle)) ? 0 : names.some((n) => n.includes(needle)) ? 1 : -1;
    if (rank < 0) continue;
    const batBalls = ls.reduce((s, l) => s + l.batBalls, 0);
    const bowlBalls = ls.reduce((s, l) => s + l.bowlBalls, 0);
    hits.push({
      playerId: m.playerId, name: m.name, fullName: m.fullName, country: m.country,
      matches: ls.reduce((s, l) => s + l.matches, 0), lastSeason: ls.at(-1)?.season ?? null,
      primary: bowlBalls > batBalls ? "bowling" : "batting", rank,
    });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || b.matches - a.matches)
    .slice(0, limit)
    .map(({ rank: _rank, ...h }) => h);
}

export function getPlayerSummary(playerId: number): PlayerSummary | null {
  const meta = getPlayerMeta().get(playerId);
  if (!meta) return null;

  const lines = getSeasonLines().get(playerId) ?? [];
  const total = lines.reduce(
    (t, l) => ({
      matches: t.matches + l.matches, batRuns: t.batRuns + l.batRuns, batBalls: t.batBalls + l.batBalls,
      batOuts: t.batOuts + l.batOuts, fours: t.fours + l.fours, sixes: t.sixes + l.sixes,
      bowlBalls: t.bowlBalls + l.bowlBalls, bowlRuns: t.bowlRuns + l.bowlRuns, wickets: t.wickets + l.wickets,
    }),
    { matches: 0, batRuns: 0, batBalls: 0, batOuts: 0, fours: 0, sixes: 0, bowlBalls: 0, bowlRuns: 0, wickets: 0 },
  );

  const phases = queryAll<{
    phase: PhaseSummary["phase"]; batting_runs: number; batting_balls: number;
    bowling_runs: number; bowling_balls: number; bowling_wickets: number;
  }>(
    `SELECT phase, batting_runs, batting_balls, bowling_runs, bowling_balls, bowling_wickets
     FROM player_phase_stats WHERE player_id = ?
     ORDER BY CASE phase WHEN 'powerplay' THEN 0 WHEN 'middle' THEN 1 ELSE 2 END`,
    playerId,
  ).map((p) => ({
    phase: p.phase,
    battingRuns: p.batting_runs,
    battingBalls: p.batting_balls,
    battingStrikeRate: ratio(p.batting_runs, p.batting_balls, 100),
    bowlingRuns: p.bowling_runs,
    bowlingBalls: p.bowling_balls,
    bowlingWickets: p.bowling_wickets,
    bowlingEconomy: ratio(p.bowling_runs, p.bowling_balls, 6),
  }));

  const matchups = (sql: string) =>
    queryAll<{ id: number; name: string; balls: number; runs: number; dismissals: number }>(sql, playerId).map((r) => ({
      opponentId: r.id,
      opponentName: r.name,
      balls: r.balls,
      runs: r.runs,
      dismissals: r.dismissals,
      strikeRate: ratio(r.runs, r.balls, 100),
    }));

  const asBatter = matchups(
    `SELECT m.bowler_id id, p.name, m.balls, m.runs, m.dismissals FROM player_matchups m
     JOIN players p ON p.player_id = m.bowler_id WHERE m.batter_id = ? ORDER BY m.balls DESC LIMIT 8`,
  );
  const asBowler = matchups(
    `SELECT m.batter_id id, p.name, m.balls, m.runs, m.dismissals FROM player_matchups m
     JOIN players p ON p.player_id = m.batter_id WHERE m.bowler_id = ? ORDER BY m.balls DESC LIMIT 8`,
  );

  const latest = getSeasons().at(-1) ?? "2026";
  const impact = estimateImpact(playerId, latest);

  return {
    player: { ...meta, role: impact.usage.role },
    career: toCareer(total),
    seasons: lines.map((l) => ({ season: l.season, ...toCareer(l) })),
    phases,
    headToHead: { asBatter, asBowler },
    impact: { ...impact, season: latest },
  };
}

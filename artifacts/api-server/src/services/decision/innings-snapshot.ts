// Decision Intelligence OS — Phase 3 helpers: reconstruct a real innings
// from the column store at any over, and describe matches.

import { F_LEGAL, F_WICKET, getBallColumns, getInningsRanges, type MatchInfo } from "./ball-context";
import { getPlayerMeta } from "./player-profiles";
import { franchiseOf, venueOf } from "./stats-engine";

export const playerName = (pid: number) => getPlayerMeta().get(pid)?.name ?? `#${pid}`;
export const teamShort = (teamId: number) => franchiseOf(teamId)?.short ?? `T${teamId}`;
export const teamName = (teamId: number) => franchiseOf(teamId)?.name ?? `Team ${teamId}`;

export function matchTitle(m: MatchInfo): string {
  return `${teamShort(m.team1)} vs ${teamShort(m.team2)}`;
}

export function resultText(m: MatchInfo): string {
  if (m.winner === null) return "No result";
  const by = m.marginType === "runs" ? `${m.marginValue} run${m.marginValue === 1 ? "" : "s"}`
    : m.marginType === "wickets" ? `${m.marginValue} wicket${m.marginValue === 1 ? "" : "s"}`
    : m.marginType ? m.marginType : "";
  return `${teamShort(m.winner)} won${by ? ` by ${by}` : ""}`;
}

export interface MatchSummary {
  matchId: string;
  season: string;
  date: string;
  title: string;
  stage: string | null;
  venue: string;
  result: string;
}

export function summarizeMatch(m: MatchInfo): MatchSummary {
  return { matchId: m.matchId, season: m.season, date: m.date, title: matchTitle(m), stage: m.stage, venue: venueOf(m.venue)?.name ?? "", result: resultText(m) };
}

export interface InningsSnapshot {
  matchIndex: number;
  match: MatchInfo;
  inningsId: number;
  inningsNumber: 1 | 2;
  battingTeam: number;
  bowlingTeam: number;
  season: number;
  totalBalls: number;
  /** State at the first ball of `fromOver`. */
  runs: number;
  legal: number;
  wickets: number;
  striker: number;
  nonStriker: number;
  /** Batters still to come, in actual order, then the rest of the XI. */
  queue: number[];
  oversBowled: Map<number, number>;
  lastBowler: number | null;
  /** Actual bowler of every over in the innings (over → bowler). */
  script: Map<number, number>;
  /** Every bowler who bowled in this innings. */
  attack: number[];
  /** Actual over-by-over runs, wickets and cumulative score. */
  actualOvers: { over: number; bowler: number; runs: number; wickets: number; cumulative: number; cumulativeWickets: number }[];
  finalRuns: number;
  finalWickets: number;
  appearanceOrder: number[];
  ended: boolean; // innings finished before fromOver
}

/** Players of a team in a match: anyone who batted for them or bowled for them. */
function teamPlayersInMatch(matchIndex: number, teamId: number): number[] {
  const c = getBallColumns();
  const ranges = getInningsRanges();
  const players: number[] = [];
  const add = (p: number) => { if (!players.includes(p)) players.push(p); };
  const innings = new Set<number>();
  for (const [inn, [s]] of ranges) if (c.match[s] === matchIndex) innings.add(inn);
  for (const inn of innings) {
    const [s, e] = ranges.get(inn)!;
    for (let i = s; i < e; i++) {
      if (c.battingTeam[i] === teamId) { add(c.batter[i]); add(c.nonStriker[i]); }
      if (c.bowlingTeam[i] === teamId) add(c.bowler[i]);
    }
  }
  return players;
}

export function inningsSnapshot(matchId: string, inningsNumber: 1 | 2, fromOver: number): InningsSnapshot | null {
  const c = getBallColumns();
  const mi = c.matchIndex.get(matchId);
  if (mi === undefined) return null;
  const match = c.matches[mi];
  let range: [number, number] | null = null;
  for (const [, r] of getInningsRanges()) if (c.match[r[0]] === mi && c.inningsNumber[r[0]] === inningsNumber) range = r;
  if (!range) return null;
  const [s, e] = range;
  const battingTeam = c.battingTeam[s], bowlingTeam = c.bowlingTeam[s];

  const script = new Map<number, number>();
  const actualOvers: InningsSnapshot["actualOvers"] = [];
  const appearance: number[] = [];
  let cum = 0, cumW = 0;
  for (let i = s; i < e; i++) {
    const ov = c.over[i];
    if (!script.has(ov)) script.set(ov, c.bowler[i]);
    for (const p of [c.batter[i], c.nonStriker[i]]) if (!appearance.includes(p)) appearance.push(p);
    let row = actualOvers.find((o) => o.over === ov);
    if (!row) { row = { over: ov, bowler: c.bowler[i], runs: 0, wickets: 0, cumulative: 0, cumulativeWickets: 0 }; actualOvers.push(row); }
    row.runs += c.totalRuns[i];
    cum += c.totalRuns[i];
    if (c.flags[i] & F_WICKET) { row.wickets++; cumW++; }
    row.cumulative = cum;
    row.cumulativeWickets = cumW;
  }

  let k = s;
  while (k < e && c.over[k] < fromOver) k++;
  const ended = k >= e;
  const at = ended ? e - 1 : k;
  const runs = ended ? cum : c.runsBefore[at];
  const legal = ended ? c.legalBefore[at] + (c.flags[at] & F_LEGAL ? 1 : 0) : c.legalBefore[at];
  const wickets = ended ? cumW : c.wicketsBefore[at];
  const striker = c.batter[at], nonStriker = c.nonStriker[at];

  // Out before the snapshot: anyone dismissed in [s, k).
  const out = new Set<number>();
  for (let i = s; i < k; i++) if (c.flags[i] & F_WICKET && c.outPlayer[i] >= 0) out.add(c.outPlayer[i]);
  const xi = teamPlayersInMatch(mi, battingTeam);
  const order = [...appearance, ...xi.filter((p) => !appearance.includes(p))];
  // Still to come: not out, not at the crease, and either batted later in reality or never batted.
  const lastIn = Math.max(appearance.indexOf(striker), appearance.indexOf(nonStriker));
  const queue = order.filter((p) => !out.has(p) && p !== striker && p !== nonStriker && (appearance.indexOf(p) === -1 || appearance.indexOf(p) > lastIn));

  const oversBowled = new Map<number, number>();
  for (const [ov, b] of script) if (ov < fromOver) oversBowled.set(b, (oversBowled.get(b) ?? 0) + 1);
  const totalBalls = inningsNumber === 2 && match.target ? match.target.balls : match.target && match.target.balls < 120 ? match.target.balls : 120;

  return {
    matchIndex: mi, match, inningsId: c.innings[s], inningsNumber, battingTeam, bowlingTeam, season: Number(match.season), totalBalls,
    runs, legal, wickets, striker, nonStriker, queue, oversBowled,
    lastBowler: fromOver > 0 ? script.get(fromOver - 1) ?? null : null,
    script, attack: [...new Set(script.values())], actualOvers, finalRuns: cum, finalWickets: cumW, appearanceOrder: appearance, ended,
  };
}

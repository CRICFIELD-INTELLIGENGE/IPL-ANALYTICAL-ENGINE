// Decision Intelligence OS — Phase 3: Captain's Decision Replay.
//
// For a real chase, find the overs where the match turned (the biggest
// win-probability swings, from the calibrated state model) at which the
// bowling captain had a real choice. At each, every legal option — any
// bowler who had overs left and didn't bowl the previous over — is simulated
// from the exact match state, with the rest of the innings bowled as it
// really was where the rules allow. The user picks; the app reveals what the
// model says each option was worth, what the captain chose and what happened.

import { F_FACED, F_WICKET, getBallColumns, getInningsRanges } from "./ball-context";
import {
  bowlerPhaseLine, chaseWinProb, effectiveOver, getProfiles, overExpectation, phaseOf, rng, scriptedPolicy, simulateInnings,
  venueBoundaryFactor, type InningsState,
} from "./match-model";
import { inningsSnapshot, playerName, summarizeMatch, teamShort, type MatchSummary } from "./innings-snapshot";
import { bowlingSubtype, getPlayerMeta } from "./player-profiles";

export interface ReplayOption {
  playerId: number;
  name: string;
  type: string;
  phaseEconomy: number | null;
  phaseBallsPerWicket: number | null;
  vsStriker: { balls: number; runs: number; outs: number } | null;
  expRunsThisOver: number;
  wicketProbThisOver: number;
  defendProb: number; // bowling side wins, %
  verdict: "Best call" | "Reasonable" | "Costly";
  actual: boolean;
}

export interface DecisionPoint {
  over: number; // 1-based
  situation: string;
  striker: string;
  nonStriker: string;
  runsNeeded: number;
  ballsLeft: number;
  wickets: number;
  winProbBefore: number; // chasing side, %
  winProbAfter: number;
  options: ReplayOption[];
  actualChoice: string;
  actualOutcome: string;
  swing: number;
}

export interface ReplayResult {
  match: MatchSummary;
  chasingTeam: string;
  bowlingTeam: string;
  target: number;
  firstInnings: string;
  decisionPoints: DecisionPoint[];
  curve: WinProbPoint[];
  sims: number;
}

export interface WinProbPoint { ball: string; legal: number; winProb: number; event: string | null }

/** Ball-by-ball chase win probability (calibrated, league-average) for a match. */
export function chaseCurve(matchId: string): { curve: WinProbPoint[]; chasing: number; bowling: number; target: number } | null {
  const c = getBallColumns();
  const mi = c.matchIndex.get(matchId);
  if (mi === undefined) return null;
  const m = c.matches[mi];
  if (!m.target) return null;
  let range: [number, number] | null = null;
  for (const [, r] of getInningsRanges()) if (c.match[r[0]] === mi && c.inningsNumber[r[0]] === 2) range = r;
  if (!range) return null;
  const season = Number(m.season);
  const curve: WinProbPoint[] = [];
  for (let i = range[0]; i < range[1]; i++) {
    const wp = chaseWinProb(season, c.ballsLeft[i], c.runsNeeded[i], c.wicketsBefore[i], m.target.balls);
    const ev = c.flags[i] & F_WICKET ? "W" : c.batterRuns[i] === 6 ? "6" : c.batterRuns[i] === 4 ? "4" : null;
    curve.push({ ball: `${c.over[i]}.${(c.legalBefore[i] % 6) + 1}`, legal: c.legalBefore[i], winProb: Math.round(wp * 1000) / 10, event: ev });
  }
  const won = m.winner === c.battingTeam[range[0]];
  curve.push({ ball: "end", legal: c.legalBefore[range[1] - 1] + 1, winProb: m.winner === null ? 50 : won ? 100 : 0, event: null });
  return { curve, chasing: c.battingTeam[range[0]], bowling: c.bowlingTeam[range[0]], target: m.target.runs };
}

/**
 * Per-over win probability for an archived match, from team1's and team2's
 * side (the shape the match page's win-probability widget reads). Covers the
 * chase; the last point is the result. Null when the match has no chase on record.
 */
export function overWinProbability(matchId: string): { over: number; team1: number; team2: number }[] | null {
  const cv = chaseCurve(matchId);
  const c = getBallColumns();
  const mi = c.matchIndex.get(matchId);
  if (!cv || mi === undefined) return null;
  const chasingIsTeam1 = c.matches[mi].team1 === cv.chasing;
  const out: { over: number; team1: number; team2: number }[] = [];
  for (const p of cv.curve) {
    const over = p.ball === "end" ? Math.ceil(p.legal / 6) : Math.floor(p.legal / 6);
    if (p.ball !== "end" && p.legal % 6 !== 0) continue;
    if (out.length && out[out.length - 1].over === over && p.ball !== "end") continue;
    const t1 = chasingIsTeam1 ? p.winProb : 100 - p.winProb;
    out.push({ over, team1: Math.round(t1 * 10) / 10, team2: Math.round((100 - t1) * 10) / 10 });
  }
  return out;
}

/** Finals and close chases, most dramatic first within each group. */
export function listReplayMatches(q?: string, limit = 40): (MatchSummary & { maxSwing: number })[] {
  const c = getBallColumns();
  const needle = q?.trim().toLowerCase();
  const out: (MatchSummary & { maxSwing: number; rank: number })[] = [];
  for (const m of c.matches) {
    if (!m.target || m.winner === null) continue;
    const close = (m.marginType === "runs" && (m.marginValue ?? 99) <= 10) || (m.marginType === "wickets" && (m.marginValue ?? 99) <= 3);
    if (!close && m.stage !== "Final") continue;
    const s = summarizeMatch(m);
    if (needle && !`${s.title} ${s.season} ${s.venue} ${s.stage ?? ""} ${s.result}`.toLowerCase().includes(needle)) continue;
    out.push({ ...s, maxSwing: 0, rank: (m.stage === "Final" ? 2 : 0) + (close ? 1 : 0) });
  }
  out.sort((a, b) => b.rank - a.rank || b.date.localeCompare(a.date));
  return out.slice(0, limit).map((r) => {
    const cv = chaseCurve(r.matchId);
    let maxSwing = 0;
    if (cv) for (let i = 1; i < cv.curve.length; i++) maxSwing = Math.max(maxSwing, Math.abs(cv.curve[i].winProb - cv.curve[i - 1].winProb));
    const { rank: _r, ...rest } = r;
    return { ...rest, maxSwing: Math.round(maxSwing * 10) / 10 };
  });
}

const cache = new Map<string, ReplayResult>();

export function buildReplay(matchId: string, sims = 600): ReplayResult | null {
  const key = `${matchId}:${sims}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const first = inningsSnapshot(matchId, 2, 0);
  const inn1 = inningsSnapshot(matchId, 1, 0);
  if (!first || !first.match.target || !inn1) return null;
  const season = first.season;
  const target = first.match.target.runs;
  const totalBalls = first.totalBalls;
  const lastOver = Math.ceil(totalBalls / 6) - 1;
  const p = getProfiles(season);
  const venueFactor = venueBoundaryFactor([first.match.venue], season);
  const c = getBallColumns();
  const meta = getPlayerMeta();

  // Win probability at the start of every over that was bowled.
  const overStates: { o: number; snap: NonNullable<ReturnType<typeof inningsSnapshot>>; wp: number }[] = [];
  for (let o = 0; o <= lastOver; o++) {
    const s = inningsSnapshot(matchId, 2, o);
    if (!s || s.ended) break;
    overStates.push({ o, snap: s, wp: chaseWinProb(season, totalBalls - s.legal, target - s.runs, s.wickets, totalBalls) });
  }
  const chaseWon = first.match.winner === first.battingTeam;
  const endWp = first.match.winner === null ? 0.5 : chaseWon ? 1 : 0;
  const swings = overStates.map((st, i) => ({ ...st, after: i + 1 < overStates.length ? overStates[i + 1].wp : endWp }));

  const candidates = swings
    .map((s) => ({ ...s, options: s.snap.attack.filter((b) => (s.snap.oversBowled.get(b) ?? 0) < Math.ceil(totalBalls / 30) && b !== s.snap.lastBowler) }))
    .filter((s) => s.options.length >= 2 && s.snap.script.has(s.o))
    .sort((a, b) => Math.abs(b.after - b.wp) - Math.abs(a.after - a.wp))
    .slice(0, 5)
    .sort((a, b) => a.o - b.o);

  // Head-to-head up to (and including) this season.
  const h2h = (batter: number, bowler: number) => {
    let balls = 0, runs = 0, outs = 0;
    for (let i = 0; i < c.n; i++) {
      if (c.batter[i] !== batter || c.bowler[i] !== bowler || c.season[i] > season) continue;
      if (c.flags[i] & F_FACED) balls++;
      runs += c.batterRuns[i];
      if (c.outPlayer[i] === batter) outs++;
    }
    return balls ? { balls, runs, outs } : null;
  };

  const decisionPoints: DecisionPoint[] = candidates.map((cand) => {
    const s = cand.snap;
    const start: InningsState = {
      season, chase: true, target, totalBalls, legalBowled: s.legal, runs: s.runs, wickets: s.wickets,
      striker: s.striker, nonStriker: s.nonStriker, queue: s.queue, oversBowled: s.oversBowled, lastBowler: s.lastBowler, venueFactor,
    };
    const laterScript = new Map([...s.script].filter(([o]) => o > cand.o));
    const policy = scriptedPolicy(p, season, laterScript);
    const probCache = new Map<string, Float64Array>();
    const eo = effectiveOver(cand.o, totalBalls);
    const phase = phaseOf(eo);
    const raw = cand.options.map((b) => {
      const random = rng(9000 + cand.o); // same random stream for every option
      let defended = 0;
      for (let k = 0; k < sims; k++) if (!simulateInnings(p, start, s.attack, policy, random, new Map([[cand.o, b]]), probCache).won) defended++;
      const exp = overExpectation(p, season, eo, b, s.striker, venueFactor);
      const line = bowlerPhaseLine(p, b, phase);
      const m = meta.get(b);
      return {
        playerId: b, name: playerName(b), type: (m ? bowlingSubtype(m) : null) ?? "—",
        phaseEconomy: line.economy !== null ? Math.round(line.economy * 100) / 100 : null,
        phaseBallsPerWicket: line.ballsPerWicket !== null ? Math.round(line.ballsPerWicket * 10) / 10 : null,
        vsStriker: h2h(s.striker, b),
        expRunsThisOver: Math.round(exp.runs * 10) / 10,
        wicketProbThisOver: Math.round(exp.wicketProb * 100),
        defendProb: Math.round((defended / sims) * 1000) / 10,
        actual: b === s.script.get(cand.o),
      };
    });
    const best = Math.max(...raw.map((r) => r.defendProb));
    const options: ReplayOption[] = raw
      .map((r) => ({ ...r, verdict: (best - r.defendProb <= 1.5 ? "Best call" : best - r.defendProb <= 5 ? "Reasonable" : "Costly") as ReplayOption["verdict"] }))
      .sort((a, b) => b.defendProb - a.defendProb);
    const actualOver = s.actualOvers.find((x) => x.over === cand.o);
    return {
      over: cand.o + 1,
      situation: `${teamShort(s.battingTeam)} need ${target - s.runs} off ${totalBalls - s.legal}, ${10 - s.wickets} wickets left`,
      striker: playerName(s.striker),
      nonStriker: playerName(s.nonStriker),
      runsNeeded: target - s.runs,
      ballsLeft: totalBalls - s.legal,
      wickets: s.wickets,
      winProbBefore: Math.round(cand.wp * 1000) / 10,
      winProbAfter: Math.round(cand.after * 1000) / 10,
      options,
      actualChoice: playerName(s.script.get(cand.o)!),
      actualOutcome: actualOver ? `${actualOver.runs} run${actualOver.runs === 1 ? "" : "s"}${actualOver.wickets ? `, ${actualOver.wickets} wicket${actualOver.wickets > 1 ? "s" : ""}` : ""}` : "—",
      swing: Math.round((cand.after - cand.wp) * 1000) / 10,
    };
  });

  const result: ReplayResult = {
    match: summarizeMatch(first.match),
    chasingTeam: teamShort(first.battingTeam),
    bowlingTeam: teamShort(first.bowlingTeam),
    target,
    firstInnings: `${teamShort(inn1.battingTeam)} ${inn1.finalRuns}/${inn1.finalWickets}`,
    decisionPoints,
    curve: chaseCurve(matchId)?.curve ?? [],
    sims,
  };
  cache.set(key, result);
  return result;
}

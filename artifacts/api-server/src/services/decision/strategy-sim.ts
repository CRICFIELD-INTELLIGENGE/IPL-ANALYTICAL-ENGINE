// Decision Intelligence OS — Phase 3: Strategy Simulator ("Win This Match").
//
// A chase in progress, seen from the bowling side: given the target, score,
// balls bowled, wickets, who is batting and the attack's remaining overs, it
// simulates the rest of the innings thousands of times under three bowling
// plans and ranks the next-over options. Everything is drawn from the ball
// outcome tables and each player's own record (see match-model.ts); the
// league-average baseline and real historical chases from similar positions
// are shown alongside so the simulation can be sanity-checked.

import { getBallColumns } from "./ball-context";
import {
  bowlerPhaseLine, batterPhaseLine, bowlerType, chaseWinProb, getProfiles, histogram, likelyAttack, likelyBattingOrder,
  matchupPolicy, optimalPolicy, overExpectation, planOvers, quantile, rng, saveDeathPolicy, simulateInnings,
  teamSeasonSquad, venueBoundaryFactor, type BowlingPolicy, type InningsState,
} from "./match-model";
import { playerName, teamShort } from "./innings-snapshot";
import { bowlingSubtype, getPlayerMeta, getSeasons } from "./player-profiles";
import { resolveFranchise, resolveVenue } from "./stats-engine";

export interface StrategyRequest {
  battingTeam: string;
  bowlingTeam: string;
  season?: number;
  venue?: string;
  target: number; // runs to win
  runs: number;
  balls: number; // legal balls bowled so far
  wickets: number;
  striker?: number;
  nonStriker?: number;
  battingOrder?: number[];
  attack?: number[];
  oversUsed?: Record<string, number>;
  sims?: number;
  seed?: number;
}

export interface PlanResult {
  id: "optimal" | "save-death" | "matchup";
  name: string;
  description: string;
  defendProb: number; // bowling side wins (%)
  chaseProb: number;
  finalRuns: { p10: number; p50: number; p90: number };
  expectedWickets: number;
  overs: { over: number; bowler: number; bowlerName: string; share: number; expRuns: number; wicketProb: number; bowledProb: number }[];
}

export interface StrategyResult {
  context: {
    battingTeam: string; bowlingTeam: string; season: number; venue: string | null; venueFactor: number;
    target: number; runs: number; balls: number; wickets: number; runsNeeded: number; ballsLeft: number;
    requiredRate: number | null; currentRate: number | null;
  };
  batting: { striker: Person; nonStriker: Person; toCome: Person[] };
  attack: (Person & { type: string; oversUsed: number; oversLeft: number; deathEconomy: number | null; economyThisPhase: number | null })[];
  leagueBaseline: { chaseProb: number; note: string };
  plans: PlanResult[];
  nextBowler: { playerId: number; name: string; defendProb: number; expRunsThisOver: number; wicketProbThisOver: number }[];
  histogram: { from: number; to: number; count: number }[];
  parallels: { similar: number; chaseWinRate: number | null; examples: { matchId: string; season: string; date: string; batting: string; bowling: string; state: string; won: boolean }[] };
  sims: number;
  seed: number;
}

interface Person { playerId: number; name: string; strikeRateThisPhase?: number | null }

function person(pid: number, phase: number, season: number): Person {
  const line = batterPhaseLine(getProfiles(season), pid, phase);
  return { playerId: pid, name: playerName(pid), strikeRateThisPhase: line.strikeRate !== null ? Math.round(line.strikeRate * 10) / 10 : null };
}

export function simulateStrategy(req: StrategyRequest): StrategyResult {
  const season = req.season ?? Number(getSeasons().at(-1) ?? 2026);
  const bat = resolveFranchise(req.battingTeam);
  const bowl = resolveFranchise(req.bowlingTeam);
  if (!bat || !bowl) throw new Error("unknown_team");
  const p = getProfiles(season);
  const venueRef = req.venue ? resolveVenue(req.venue) : undefined;
  const venueFactor = venueRef ? venueBoundaryFactor(venueRef.venueIds, season) : 1;

  const batSquad = teamSeasonSquad(bat.teamIds, season);
  const bowlSquad = teamSeasonSquad(bowl.teamIds, season);
  const order = req.battingOrder?.length ? req.battingOrder : likelyBattingOrder(batSquad);
  const attack = req.attack?.length ? req.attack : likelyAttack(bowlSquad);
  if (order.length < 2 || attack.length < 2) throw new Error("squad_unavailable");

  const totalBalls = 120;
  const balls = Math.min(Math.max(0, req.balls), totalBalls - 1);
  const wickets = Math.min(Math.max(0, req.wickets), 9);
  const completedOvers = Math.floor(balls / 6);
  // At the crease: the next two batters after those dismissed, unless given.
  const striker = req.striker ?? order[Math.min(wickets, order.length - 1)];
  const nonStriker = req.nonStriker ?? order.find((x, i) => i > wickets && x !== striker) ?? order[Math.min(wickets + 1, order.length - 1)];
  const lastIn = Math.max(order.indexOf(striker), order.indexOf(nonStriker));
  const queue = order.filter((x, i) => x !== striker && x !== nonStriker && i > lastIn);

  // Overs already used: given, or what the optimal plan would have spent so far.
  const used = new Map<number, number>();
  let lastBowler: number | null = null;
  if (req.oversUsed && Object.keys(req.oversUsed).length) {
    for (const [k, v] of Object.entries(req.oversUsed)) used.set(Number(k), v);
  } else {
    const full = planOvers(p, season, 0, 20, attack, new Map(), null);
    for (let o = 0; o < completedOvers; o++) { const b = full.get(o)!; used.set(b, (used.get(b) ?? 0) + 1); }
    lastBowler = completedOvers > 0 ? full.get(completedOvers - 1) ?? null : null;
  }

  const start: InningsState = {
    season, chase: true, target: req.target, totalBalls, legalBowled: balls, runs: req.runs, wickets,
    striker, nonStriker, queue, oversBowled: used, lastBowler, venueFactor,
  };
  const sims = Math.min(Math.max(req.sims ?? 2000, 200), 5000);
  const seed = req.seed ?? 20260707;

  const plans: { id: PlanResult["id"]; name: string; description: string; policy: BowlingPolicy }[] = [
    { id: "optimal", name: "Data-optimal rotation", description: "Each over goes to the bowler whose record in that phase costs the fewest runs net of wickets, planning the remaining overs as a whole.", policy: optimalPolicy(p, season) },
    { id: "save-death", name: "Save the best for last", description: "Hold back the two best death bowlers so they bowl the final overs; use the rest of the attack first.", policy: saveDeathPolicy(p, season) },
    { id: "matchup", name: "Hunt the matchup", description: "Every over, bowl whoever is most effective against the batter on strike, without planning ahead.", policy: matchupPolicy(p, season) },
  ];

  const cache = new Map<string, Float64Array>();
  const planResults: PlanResult[] = [];
  let bestFinals: number[] = [];
  let bestDefend = -1;
  for (const pl of plans) {
    const random = rng(seed);
    let defended = 0, wkSum = 0;
    const finals: number[] = [];
    const perOver = new Map<number, { bowlers: Map<number, number>; runs: number; wk: number; n: number }>();
    for (let k = 0; k < sims; k++) {
      const r = simulateInnings(p, start, attack, pl.policy, random, new Map(), cache);
      if (!r.won) defended++;
      finals.push(r.runs);
      wkSum += r.wickets;
      for (let o = completedOvers; o < r.overBowler.length; o++) {
        const b = r.overBowler[o];
        if (b === undefined) continue;
        const e = perOver.get(o) ?? { bowlers: new Map(), runs: 0, wk: 0, n: 0 };
        e.bowlers.set(b, (e.bowlers.get(b) ?? 0) + 1);
        e.runs += r.overRuns[o] ?? 0;
        e.wk += (r.overWickets[o] ?? 0) > 0 ? 1 : 0;
        e.n++;
        perOver.set(o, e);
      }
    }
    finals.sort((a, b) => a - b);
    const defendProb = Math.round((defended / sims) * 1000) / 10;
    if (defendProb > bestDefend) { bestDefend = defendProb; bestFinals = finals; }
    planResults.push({
      id: pl.id, name: pl.name, description: pl.description,
      defendProb, chaseProb: Math.round((100 - defendProb) * 10) / 10,
      finalRuns: { p10: quantile(finals, 0.1), p50: quantile(finals, 0.5), p90: quantile(finals, 0.9) },
      expectedWickets: Math.round((wkSum / sims) * 10) / 10,
      overs: [...perOver.entries()].sort((a, b) => a[0] - b[0]).map(([o, e]) => {
        const [bowler, cnt] = [...e.bowlers.entries()].sort((a, b) => b[1] - a[1])[0];
        return { over: o + 1, bowler, bowlerName: playerName(bowler), share: Math.round((cnt / e.n) * 100), expRuns: Math.round((e.runs / e.n) * 10) / 10, wicketProb: Math.round((e.wk / e.n) * 100), bowledProb: Math.round((e.n / sims) * 100) };
      }),
    });
  }

  // Next over: try every legal option, then the optimal plan.
  const nextOver = completedOvers;
  const partial = balls % 6 !== 0;
  const options = partial ? [] : attack.filter((b) => (used.get(b) ?? 0) < 4 && b !== lastBowler);
  const optimal = optimalPolicy(p, season);
  const nextBowler = options.map((b) => {
    const random = rng(seed + 1);
    let defended = 0;
    const n = Math.round(sims / 2.5);
    for (let k = 0; k < n; k++) if (!simulateInnings(p, start, attack, optimal, random, new Map([[nextOver, b]]), cache).won) defended++;
    const exp = overExpectation(p, season, nextOver, b, striker, venueFactor);
    return { playerId: b, name: playerName(b), defendProb: Math.round((defended / n) * 1000) / 10, expRunsThisOver: Math.round(exp.runs * 10) / 10, wicketProbThisOver: Math.round(exp.wicketProb * 100) };
  }).sort((a, b) => b.defendProb - a.defendProb);

  const runsNeeded = req.target - req.runs;
  const ballsLeft = totalBalls - balls;
  const phase = completedOvers <= 5 ? 0 : completedOvers <= 14 ? 1 : 2;
  const meta = getPlayerMeta();
  return {
    context: {
      battingTeam: bat.short, bowlingTeam: bowl.short, season, venue: venueRef?.name ?? null, venueFactor: Math.round(venueFactor * 100) / 100,
      target: req.target, runs: req.runs, balls, wickets, runsNeeded, ballsLeft,
      requiredRate: ballsLeft > 0 ? Math.round((runsNeeded / ballsLeft) * 600) / 100 : null,
      currentRate: balls > 0 ? Math.round((req.runs / balls) * 600) / 100 : null,
    },
    batting: { striker: person(striker, phase, season), nonStriker: person(nonStriker, phase, season), toCome: queue.map((q) => person(q, phase, season)) },
    attack: attack.map((b) => {
      const m = meta.get(b);
      return {
        playerId: b, name: playerName(b),
        type: (m ? bowlingSubtype(m) : null) ?? (bowlerType(b) ? "Spin" : "Pace"),
        oversUsed: used.get(b) ?? 0, oversLeft: Math.max(0, 4 - (used.get(b) ?? 0)),
        deathEconomy: round1(bowlerPhaseLine(p, b, 2).economy),
        economyThisPhase: round1(bowlerPhaseLine(p, b, phase).economy),
      };
    }),
    leagueBaseline: {
      chaseProb: Math.round(chaseWinProb(season, ballsLeft, runsNeeded, wickets) * 1000) / 10,
      note: "Calibrated state model for league-average sides in this era — no player information.",
    },
    plans: planResults,
    nextBowler,
    histogram: histogram(bestFinals, 5),
    parallels: historicalParallels(ballsLeft, runsNeeded, wickets),
    sims,
    seed,
  };
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/** Real 20-over chases that stood at a similar point at the start of an over. */
function historicalParallels(ballsLeft: number, runsNeeded: number, wickets: number) {
  const c = getBallColumns();
  const seen = new Set<number>();
  const hits: { matchId: string; season: string; date: string; batting: string; bowling: string; state: string; won: boolean }[] = [];
  const tol = Math.max(6, Math.round(runsNeeded * 0.1));
  for (let i = 0; i < c.n; i++) {
    if (c.inningsNumber[i] !== 2 || c.legalBefore[i] % 6 !== 0) continue;
    if (i > 0 && c.innings[i - 1] === c.innings[i] && c.legalBefore[i - 1] === c.legalBefore[i]) continue;
    if (Math.abs(c.ballsLeft[i] - ballsLeft) > 3 || Math.abs(c.runsNeeded[i] - runsNeeded) > tol || Math.abs(c.wicketsBefore[i] - wickets) > 1) continue;
    const m = c.matches[c.match[i]];
    if (!m.target || m.target.balls !== 120 || m.winner === null || seen.has(c.match[i])) continue;
    seen.add(c.match[i]);
    hits.push({
      matchId: m.matchId, season: m.season, date: m.date, batting: teamShort(c.battingTeam[i]), bowling: teamShort(c.bowlingTeam[i]),
      state: `needed ${c.runsNeeded[i]} off ${c.ballsLeft[i]}, ${c.wicketsBefore[i]} down`, won: m.winner === c.battingTeam[i],
    });
  }
  hits.sort((a, b) => b.date.localeCompare(a.date));
  return {
    similar: hits.length,
    chaseWinRate: hits.length ? Math.round((hits.filter((h) => h.won).length / hits.length) * 1000) / 10 : null,
    examples: hits.slice(0, 6),
  };
}

// Decision Intelligence OS — Phase 3: Alternate Universe Engine.
//
// Pick a real innings and an over. From the real state at that moment (score,
// wickets, who is batting, who is still to come, overs each bowler has left)
// the rest of the innings is simulated twice with the same random numbers:
//
//   baseline  — the bowlers who actually bowled each over
//   alternate — the what-if: one bowler swapped for another (from any team),
//               or every remaining over bowled by a type ("only leg-spin")
//
// Same seeds on both sides means the difference is the change, not noise.
// The baseline is also compared with what really happened, so the model's
// error on this innings is visible next to the what-if.

import { getBallColumns } from "./ball-context";
import {
  SYNTHETIC, bowlerPhaseLine, chaseWinProb, effectiveOver, getProfiles, histogram, phaseOf, quantile, rng, scriptedPolicy,
  simulateInnings, syntheticBowler, venueBoundaryFactor, type InningsState,
} from "./match-model";
import { inningsSnapshot, playerName, summarizeMatch, teamShort, type MatchSummary } from "./innings-snapshot";
import { venueOf } from "./stats-engine";

export type AltChange =
  | { type: "none" }
  | { type: "swap_bowler"; out: number; in: number }
  | { type: "bowling_type"; bowlingType: string };

export interface AltRequest { matchId: string; innings: 1 | 2; fromOver: number; change: AltChange; sims?: number; seed?: number }

interface SideSummary {
  label: string;
  meanRuns: number;
  finalRuns: { p10: number; p50: number; p90: number };
  /** Innings 2: chase success %. Innings 1: batting-first win % vs a league-average chase of the era. */
  winProb: number;
  winProbFor: string;
  worm: { over: number; median: number }[];
}

export interface AltResult {
  match: MatchSummary;
  innings: 1 | 2;
  battingTeam: string;
  bowlingTeam: string;
  fromOver: number;
  state: { runs: number; wickets: number; legal: number; striker: string; nonStriker: string; target: number | null };
  description: string;
  actual: { runs: number; wickets: number; result: string; worm: { over: number; cumulative: number; bowler: string; runs: number; wickets: number }[] };
  baseline: SideSummary;
  alternate: SideSummary;
  histogram: { from: number; to: number; baseline: number; alternate: number }[];
  divergence: { over: number; actualBowler: string; alternateBowler: string; baselineRuns: number; alternateRuns: number; baselineWicketProb: number; alternateWicketProb: number }[];
  dossier: string[];
  modelCheck: string;
  sims: number;
}

export function listAltMatches(q?: string, season?: string, limit = 40): MatchSummary[] {
  const c = getBallColumns();
  const needle = q?.trim().toLowerCase();
  const rows = c.matches.filter((m) => m.target && (!season || m.season === season));
  const scored = rows.map((m) => {
    const s = summarizeMatch(m);
    const close = (m.marginType === "runs" && (m.marginValue ?? 99) <= 8) || (m.marginType === "wickets" && (m.marginValue ?? 99) <= 2);
    return { s, rank: (m.stage === "Final" ? 2 : 0) + (close ? 1 : 0) };
  }).filter(({ s }) => !needle || `${s.title} ${s.season} ${s.venue} ${s.stage ?? ""} ${s.result}`.toLowerCase().includes(needle));
  return scored.sort((a, b) => b.rank - a.rank || b.s.date.localeCompare(a.s.date)).slice(0, limit).map((x) => x.s);
}

/** Overs, bowlers and batters of a match, for building a what-if. */
export function altMatchDetail(matchId: string) {
  const out = [];
  for (const inn of [1, 2] as const) {
    const s = inningsSnapshot(matchId, inn, 0);
    if (!s) continue;
    out.push({
      innings: inn,
      battingTeam: teamShort(s.battingTeam),
      bowlingTeam: teamShort(s.bowlingTeam),
      total: `${s.finalRuns}/${s.finalWickets}`,
      overs: s.actualOvers.map((o) => ({ over: o.over, bowler: o.bowler, bowlerName: playerName(o.bowler), runs: o.runs, wickets: o.wickets, cumulative: o.cumulative })),
      bowlers: s.attack.map((b) => ({ playerId: b, name: playerName(b), overs: [...s.script.values()].filter((x) => x === b).length })),
      batters: s.appearanceOrder.map((b) => ({ playerId: b, name: playerName(b) })),
    });
  }
  const c = getBallColumns();
  const mi = c.matchIndex.get(matchId);
  return mi === undefined ? null : { match: summarizeMatch(c.matches[mi]), innings: out, bowlingTypes: SYNTHETIC.slice(2) };
}

export function simulateAlternate(req: AltRequest): AltResult {
  const snap = inningsSnapshot(req.matchId, req.innings, req.fromOver);
  if (!snap) throw new Error("innings_not_found");
  if (snap.ended) throw new Error("innings_already_over");
  const season = snap.season;
  const p = getProfiles(season);
  const venueFactor = venueBoundaryFactor([snap.match.venue], season);
  const target = req.innings === 2 ? snap.match.target?.runs ?? null : null;
  const start: InningsState = {
    season, chase: req.innings === 2, target, totalBalls: snap.totalBalls, legalBowled: snap.legal, runs: snap.runs, wickets: snap.wickets,
    striker: snap.striker, nonStriker: snap.nonStriker, queue: snap.queue, oversBowled: snap.oversBowled, lastBowler: snap.lastBowler, venueFactor,
  };

  // Baseline: the real bowler of each remaining over.
  const baseScript = new Map([...snap.script].filter(([o]) => o >= req.fromOver));
  const altScript = new Map(baseScript);
  let description = "Re-simulating the rest of the innings with the bowlers who actually bowled.";
  const change = req.change;
  let altAttack = [...snap.attack];
  if (change.type === "swap_bowler") {
    for (const [o, b] of altScript) if (b === change.out) altScript.set(o, change.in);
    altAttack = [...snap.attack.filter((b) => b !== change.out), change.in];
    description = `What if ${playerName(change.in)} had bowled ${playerName(change.out)}'s overs from over ${req.fromOver + 1}?`;
  } else if (change.type === "bowling_type") {
    const synth = syntheticBowler(change.bowlingType);
    if (synth === 0) throw new Error("unknown_bowling_type");
    for (const o of altScript.keys()) altScript.set(o, synth);
    altAttack = [synth];
    description = `What if every over from over ${req.fromOver + 1} had been bowled by a typical ${change.bowlingType.toLowerCase()} bowler (IPL average for that type, as of ${season})?`;
  }

  const sims = Math.min(Math.max(req.sims ?? 2000, 200), 5000);
  const seed = req.seed ?? 4242;
  const run = (script: Map<number, number>, attack: number[]) => {
    const random = rng(seed);
    const cache = new Map<string, Float64Array>();
    const policy = scriptedPolicy(p, season, script);
    const results = [];
    // Pin the scripted overs so a type-only attack can bowl consecutive overs.
    const forced = change.type === "bowling_type" && script === altScript ? script : new Map<number, number>();
    for (let k = 0; k < sims; k++) results.push(simulateInnings(p, start, attack, policy, random, forced, cache));
    return results;
  };
  const base = run(baseScript, snap.attack);
  const alt = change.type === "none" ? base : run(altScript, altAttack);

  const lastOver = Math.ceil(snap.totalBalls / 6) - 1;
  const summarize = (label: string, rs: ReturnType<typeof run>): SideSummary => {
    const finals = rs.map((r) => r.runs).sort((a, b) => a - b);
    const winProb = req.innings === 2
      ? rs.filter((r) => r.won).length / rs.length
      : rs.reduce((s, r) => s + (1 - chaseWinProb(season, 120, r.runs + 1, 0)), 0) / rs.length;
    const worm: { over: number; median: number }[] = [];
    for (let o = req.fromOver; o <= lastOver; o++) {
      const cum = rs.map((r) => {
        let x = snap.runs;
        for (let k = req.fromOver; k <= o; k++) x += r.overRuns[k] ?? 0;
        return x;
      }).sort((a, b) => a - b);
      worm.push({ over: o + 1, median: quantile(cum, 0.5) });
    }
    return {
      label, meanRuns: Math.round((finals.reduce((s, x) => s + x, 0) / finals.length) * 10) / 10,
      finalRuns: { p10: quantile(finals, 0.1), p50: quantile(finals, 0.5), p90: quantile(finals, 0.9) },
      winProb: Math.round(winProb * 1000) / 10,
      winProbFor: req.innings === 2 ? `${teamShort(snap.battingTeam)} completing the chase` : `${teamShort(snap.battingTeam)} winning, vs a league-average chase of the era`,
      worm,
    };
  };

  // Shared bins for the two distributions.
  const allFinals = [...base, ...alt].map((r) => r.runs);
  const bins = histogram(allFinals, 5).map((b) => ({ from: b.from, to: b.to, baseline: 0, alternate: 0 }));
  const lo = bins[0]?.from ?? 0;
  for (const r of base) bins[Math.floor((r.runs - lo) / 5)].baseline++;
  for (const r of alt) bins[Math.floor((r.runs - lo) / 5)].alternate++;

  const overMeans = (rs: ReturnType<typeof run>, o: number) => {
    const bowled = rs.filter((r) => r.overBowler[o] !== undefined);
    if (!bowled.length) return { runs: 0, wk: 0 };
    return { runs: bowled.reduce((s, r) => s + (r.overRuns[o] ?? 0), 0) / bowled.length, wk: bowled.filter((r) => (r.overWickets[o] ?? 0) > 0).length / bowled.length };
  };
  const divergence = [];
  for (let o = req.fromOver; o <= lastOver; o++) {
    const b = overMeans(base, o), a = overMeans(alt, o);
    const altBowler = altScript.get(o);
    divergence.push({
      over: o + 1,
      actualBowler: playerName(snap.script.get(o) ?? 0),
      alternateBowler: altBowler === undefined ? "—" : altBowler < 0 ? `Typical ${SYNTHETIC[-altBowler - 1].toLowerCase()}` : playerName(altBowler),
      baselineRuns: Math.round(b.runs * 10) / 10,
      alternateRuns: Math.round(a.runs * 10) / 10,
      baselineWicketProb: Math.round(b.wk * 100),
      alternateWicketProb: Math.round(a.wk * 100),
    });
  }
  divergence.sort((x, y) => Math.abs(y.alternateRuns - y.baselineRuns) + Math.abs(y.alternateWicketProb - y.baselineWicketProb) / 10 - (Math.abs(x.alternateRuns - x.baselineRuns) + Math.abs(x.alternateWicketProb - x.baselineWicketProb) / 10));

  const dossier: string[] = [];
  const phaseName = ["powerplay", "middle overs", "death overs"];
  const line = (pid: number, ph: number) => {
    const l = bowlerPhaseLine(p, pid, ph);
    return l.balls ? `${l.economy?.toFixed(2) ?? "—"} econ, a wicket every ${l.ballsPerWicket?.toFixed(1) ?? "—"} balls in the ${phaseName[ph]} (${l.balls} balls, recency-weighted to ${season})` : `no ${phaseName[ph]} record`;
  };
  const phaseOfOver = (o: number) => phaseOf(effectiveOver(o, snap.totalBalls));
  if (change.type === "swap_bowler") {
    const phases = [...new Set([...baseScript].filter(([, b]) => b === change.out).map(([o]) => phaseOfOver(o)))];
    for (const ph of phases) {
      dossier.push(`${playerName(change.out)}: ${line(change.out, ph)}.`);
      dossier.push(`${playerName(change.in)}: ${line(change.in, ph)}.`);
    }
    if (!phases.length) dossier.push(`${playerName(change.out)} bowled no overs from over ${req.fromOver + 1}, so the swap changes nothing.`);
  } else if (change.type === "bowling_type") {
    for (const ph of [...new Set([...baseScript.keys()].map(phaseOfOver))]) {
      dossier.push(`Typical ${change.bowlingType.toLowerCase()}: ${line(syntheticBowler(change.bowlingType), ph)}.`);
    }
  }
  const baseline = summarize("With the real bowlers", base);
  const alternate = summarize(change.type === "none" ? "With the real bowlers" : "What-if", alt);
  const diff = alternate.meanRuns - baseline.meanRuns;
  if (change.type !== "none") dossier.push(`Net effect: ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} runs on average for ${teamShort(snap.battingTeam)} versus the real attack.`);
  const actualResult = req.innings === 2 ? (snap.finalRuns >= (target ?? Infinity) ? "chase completed" : "chase fell short") : `set ${snap.finalRuns + 1} to win`;
  return {
    match: summarizeMatch(snap.match),
    innings: req.innings,
    battingTeam: teamShort(snap.battingTeam),
    bowlingTeam: teamShort(snap.bowlingTeam),
    fromOver: req.fromOver,
    state: { runs: snap.runs, wickets: snap.wickets, legal: snap.legal, striker: playerName(snap.striker), nonStriker: playerName(snap.nonStriker), target },
    description,
    actual: {
      runs: snap.finalRuns, wickets: snap.finalWickets, result: actualResult,
      worm: snap.actualOvers.map((o) => ({ over: o.over + 1, cumulative: o.cumulative, bowler: playerName(o.bowler), runs: o.runs, wickets: o.wickets })),
    },
    baseline,
    alternate,
    histogram: bins,
    divergence: divergence.slice(0, 5).sort((a, b) => a.over - b.over),
    dossier,
    modelCheck: `With the real bowlers the model expects ${baseline.meanRuns.toFixed(0)} (middle 80%: ${baseline.finalRuns.p10}–${baseline.finalRuns.p90}); the real innings finished on ${snap.finalRuns}${venueOf(snap.match.venue) ? ` at ${venueOf(snap.match.venue)!.name}` : ""}.`,
    sims,
  };
}

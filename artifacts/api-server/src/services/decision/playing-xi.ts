// Decision Intelligence OS — Slice 2: Playing XI optimizer.
//
// Mixed-integer linear program over a franchise squad:
//
//   maximise   Σ adjustedImpact_i · x_i            x_i ∈ {0,1}
//   subject to Σ x_i                    = 11
//              Σ overseas_i · x_i       ≤ maxOverseas      (IPL rule: 4)
//              Σ keeper_i · x_i         ≥ 1
//              Σ bowlingCapacity_i·x_i  ≥ 20 overs          (≤4 overs per bowler)
//              Σ bowlingOption_i · x_i  ≥ minBowlingOptions
//              Σ battingOption_i · x_i  ≥ minBattingOptions
//              Σ spinner_i · x_i ≥ minSpinners,  Σ pacer_i · x_i ≥ minPacers
//              x_i = 1 for locked players, x_i = 0 for excluded players
//
// adjustedImpact = expected runs above average per match (impact-model.ts)
// plus a pitch adjustment. After solving we re-solve once per selected
// player with that player removed: the objective drop is the player's
// marginal value to *this* XI, which is what the UI explains.

import solver, { type LpModel } from "javascript-lp-solver";
import { queryAll } from "./db";
import { estimateImpact, round, type Confidence } from "./impact-model";
import {
  getPlayerMeta,
  getRoster,
  getSeasons,
  type BowlingType,
  type PlayingRole,
} from "./player-profiles";

export type PitchType = "balanced" | "batting" | "pace" | "spin";

export interface PlayingXiRequest {
  teamId: number;
  season?: string;
  squadPlayerIds?: number[];
  pitch: PitchType;
  maxOverseas: number;
  minBowlingOvers: number;
  minBowlingOptions: number;
  minBattingOptions: number;
  minSpinners?: number;
  minPacers?: number;
  lockedIds: number[];
  excludedIds: number[];
  overrides: { playerId: number; overseas?: boolean; keeper?: boolean }[];
}

export interface XiCandidate {
  playerId: number;
  name: string;
  fullName: string | null;
  country: string | null;
  overseas: boolean;
  keeper: boolean;
  role: PlayingRole;
  bowlingType: BowlingType;
  bowlingStyle: string | null;
  battingHand: "L" | "R" | null;
  bowlingCapacity: number;
  ballsFacedPerMatch: number;
  matchesThisSeason: number;
  impact: { batting: number; bowling: number; total: number; pitchAdjustment: number; adjusted: number };
  confidence: Confidence;
  locked: boolean;
  /** Objective loss if this player is removed from the XI (selected players only). */
  marginalValue: number | null;
}

export interface XiComposition {
  overseas: number;
  keepers: number;
  bowlingOvers: number;
  bowlingOptions: number;
  battingOptions: number;
  spinners: number;
  pacers: number;
}

export interface PlayingXiResult {
  feasible: boolean;
  message: string | null;
  season: string;
  teamId: number;
  teamName: string;
  pitch: PitchType;
  objective: number;
  xi: XiCandidate[];
  bench: XiCandidate[];
  impactPlayer: { batting: XiCandidate | null; bowling: XiCandidate | null };
  composition: XiComposition;
  constraints: {
    maxOverseas: number; minBowlingOvers: number; minBowlingOptions: number;
    minBattingOptions: number; minSpinners: number; minPacers: number; requireKeeper: boolean;
  };
  warnings: string[];
  solver: { variables: number; solves: number; ms: number };
}

export interface Franchise {
  teamId: number;
  name: string;
  shortName: string;
  squadSize: number;
}

/* ─── Pitch model ────────────────────────────────────────────────────────── */

// bat: multiplier on positive batting impact. pace/spin: runs per over of
// bowling capacity added on top of the player's historical bowling impact.
const PITCH: Record<PitchType, { bat: number; pace: number; spin: number }> = {
  balanced: { bat: 1, pace: 0, spin: 0 },
  batting: { bat: 1.15, pace: -0.3, spin: -0.3 },
  pace: { bat: 0.95, pace: 0.8, spin: -0.5 },
  spin: { bat: 0.95, pace: -0.5, spin: 1.0 },
};

function pitchAdjustment(pitch: PitchType, batting: number, bowlingType: BowlingType, capacity: number): number {
  const p = PITCH[pitch];
  const batAdj = batting > 0 ? batting * (p.bat - 1) : 0;
  const perOver = bowlingType === "pace" ? p.pace : bowlingType === "spin" ? p.spin : (p.pace + p.spin) / 2;
  return batAdj + perOver * capacity;
}

/* ─── Franchises ─────────────────────────────────────────────────────────── */

// The teams table stores Cricsheet abbreviations; show the ones fans use.
const SHORT_NAME_FIX: Record<string, string> = { SH: "SRH", PK: "PBKS", KXP: "KXIP" };

function teamRows(): Map<number, { name: string; shortName: string }> {
  return new Map(
    queryAll<{ team_id: number; name: string; short_name: string }>("SELECT team_id, name, short_name FROM teams").map(
      (t) => [t.team_id, { name: t.name, shortName: SHORT_NAME_FIX[t.short_name] ?? t.short_name }],
    ),
  );
}

export function latestSeason(): string {
  return getSeasons().at(-1) ?? "2026";
}

export function listFranchises(season: string): Franchise[] {
  const teams = teamRows();
  const counts = new Map<number, number>();
  for (const r of getRoster(season)) counts.set(r.teamId, (counts.get(r.teamId) ?? 0) + 1);
  return [...counts]
    .filter(([, n]) => n >= 11)
    .map(([teamId, squadSize]) => ({
      teamId,
      squadSize,
      name: teams.get(teamId)?.name ?? `Team ${teamId}`,
      shortName: teams.get(teamId)?.shortName ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ─── Optimizer ──────────────────────────────────────────────────────────── */

const isBatOption = (c: XiCandidate) => c.role !== "bowler";
const isSpinner = (c: XiCandidate) => c.bowlingCapacity > 0 && c.bowlingType === "spin";
const isPacer = (c: XiCandidate) => c.bowlingCapacity > 0 && c.bowlingType === "pace";

function buildCandidates(req: PlayingXiRequest, season: string): XiCandidate[] {
  const meta = getPlayerMeta();
  const seasonMatches = new Map<number, number>();
  for (const r of getRoster(season)) {
    if (r.teamId === req.teamId) seasonMatches.set(r.playerId, r.matches);
  }
  const ids = req.squadPlayerIds?.length ? req.squadPlayerIds : [...seasonMatches.keys()];
  const overrides = new Map(req.overrides.map((o) => [o.playerId, o]));
  const locked = new Set(req.lockedIds);

  return ids
    .filter((id) => meta.has(id))
    .map((id) => {
      const m = meta.get(id)!;
      const est = estimateImpact(id, season);
      const ov = overrides.get(id);
      const keeper = ov?.keeper ?? m.keeper;
      const role: PlayingRole = keeper ? "wicketkeeper" : est.usage.role === "wicketkeeper" ? "batter" : est.usage.role;
      const adj = pitchAdjustment(req.pitch, est.batting, m.bowlingType, est.usage.bowlingCapacity);
      return {
        playerId: id,
        name: m.name,
        fullName: m.fullName,
        country: m.country,
        overseas: ov?.overseas ?? m.overseas,
        keeper,
        role,
        bowlingType: est.usage.bowlingCapacity > 0 ? m.bowlingType : "none",
        bowlingStyle: m.bowlingStyle,
        battingHand: m.battingHand,
        bowlingCapacity: est.usage.bowlingCapacity,
        ballsFacedPerMatch: round(est.usage.ballsFacedPerMatch, 1),
        matchesThisSeason: seasonMatches.get(id) ?? 0,
        impact: {
          batting: est.batting,
          bowling: est.bowling,
          total: est.total,
          pitchAdjustment: round(adj),
          adjusted: round(est.total + adj),
        },
        confidence: est.confidence,
        locked: locked.has(id),
        marginalValue: null,
      };
    });
}

interface Bounds {
  maxOverseas: number; minBowlingOvers: number; minBowlingOptions: number;
  minBattingOptions: number; minSpinners: number; minPacers: number; requireKeeper: boolean;
}

function solve(cands: XiCandidate[], b: Bounds): { ids: Set<number>; objective: number } | null {
  const model: LpModel = {
    optimize: "impact",
    opType: "max",
    constraints: {
      count: { equal: 11 },
      overseas: { max: b.maxOverseas },
      overs: { min: b.minBowlingOvers },
      bowlOpt: { min: b.minBowlingOptions },
      batOpt: { min: b.minBattingOptions },
      spin: { min: b.minSpinners },
      pace: { min: b.minPacers },
      ...(b.requireKeeper ? { keeper: { min: 1 } } : {}),
    },
    variables: {},
    binaries: {},
  };
  for (const c of cands) {
    const v = `p${c.playerId}`;
    model.variables[v] = {
      impact: c.impact.adjusted,
      count: 1,
      overseas: c.overseas ? 1 : 0,
      keeper: c.keeper ? 1 : 0,
      overs: c.bowlingCapacity,
      bowlOpt: c.bowlingCapacity > 0 ? 1 : 0,
      batOpt: isBatOption(c) ? 1 : 0,
      spin: isSpinner(c) ? 1 : 0,
      pace: isPacer(c) ? 1 : 0,
      ...(c.locked ? { [`lock_${c.playerId}`]: 1 } : {}),
    };
    if (c.locked) model.constraints[`lock_${c.playerId}`] = { equal: 1 };
    model.binaries![v] = 1;
  }
  const res = solver.Solve(model);
  if (!res.feasible) return null;
  const ids = new Set(cands.filter((c) => Number(res[`p${c.playerId}`] ?? 0) > 0.5).map((c) => c.playerId));
  if (ids.size !== 11) return null;
  const objective = cands.filter((c) => ids.has(c.playerId)).reduce((s, c) => s + c.impact.adjusted, 0);
  return { ids, objective };
}

function compose(xi: XiCandidate[]): XiComposition {
  return {
    overseas: xi.filter((c) => c.overseas).length,
    keepers: xi.filter((c) => c.keeper).length,
    bowlingOvers: xi.reduce((s, c) => s + c.bowlingCapacity, 0),
    bowlingOptions: xi.filter((c) => c.bowlingCapacity > 0).length,
    battingOptions: xi.filter(isBatOption).length,
    spinners: xi.filter(isSpinner).length,
    pacers: xi.filter(isPacer).length,
  };
}

/** Explain which hard constraint the squad cannot meet. */
function diagnose(cands: XiCandidate[], b: Bounds): string {
  const locked = cands.filter((c) => c.locked);
  if (locked.length > 11) return `${locked.length} players are locked in — at most 11 can be.`;
  if (locked.filter((c) => c.overseas).length > b.maxOverseas)
    return `More than ${b.maxOverseas} overseas players are locked in.`;
  const indian = cands.filter((c) => !c.overseas).length;
  if (indian < 11 - b.maxOverseas)
    return `Only ${indian} Indian players available; ${11 - b.maxOverseas} are needed with a ${b.maxOverseas}-overseas cap.`;
  const topOvers = cands.map((c) => c.bowlingCapacity).sort((x, y) => y - x).slice(0, 11).reduce((s, n) => s + n, 0);
  if (topOvers < b.minBowlingOvers)
    return `The available bowlers can only cover ${topOvers} overs; ${b.minBowlingOvers} are required.`;
  return "No XI satisfies every constraint together — try unlocking a player or loosening a minimum.";
}

export function optimizePlayingXi(req: PlayingXiRequest): PlayingXiResult {
  const t0 = Date.now();
  const season = req.season ?? latestSeason();
  const team = teamRows().get(req.teamId);
  const warnings: string[] = [];

  const all = buildCandidates(req, season);
  const excluded = new Set(req.excludedIds);
  const cands = all.filter((c) => !excluded.has(c.playerId) || c.locked);

  const spinAvail = cands.filter(isSpinner).length;
  const paceAvail = cands.filter(isPacer).length;
  const wantSpin = req.minSpinners ?? (req.pitch === "spin" ? 2 : 1);
  const wantPace = req.minPacers ?? (req.pitch === "pace" ? 3 : 2);
  const bounds: Bounds = {
    maxOverseas: req.maxOverseas,
    minBowlingOvers: req.minBowlingOvers,
    minBowlingOptions: req.minBowlingOptions,
    minBattingOptions: req.minBattingOptions,
    minSpinners: Math.min(wantSpin, spinAvail),
    minPacers: Math.min(wantPace, paceAvail),
    requireKeeper: cands.some((c) => c.keeper),
  };
  if (bounds.minSpinners < wantSpin) warnings.push(`Only ${spinAvail} spinner(s) in the squad — spin minimum lowered to ${spinAvail}.`);
  if (bounds.minPacers < wantPace) warnings.push(`Only ${paceAvail} pacer(s) in the squad — pace minimum lowered to ${paceAvail}.`);
  if (!bounds.requireKeeper) warnings.push("No recognised wicketkeeper in this squad — mark one using the keeper toggle.");
  const unknownStyle = cands.filter((c) => c.bowlingCapacity > 0 && c.bowlingType === "unknown");
  if (unknownStyle.length)
    warnings.push(`Bowling style unknown for ${unknownStyle.map((c) => c.name).join(", ")} — not counted as pace or spin.`);

  const base: Omit<PlayingXiResult, "feasible" | "message" | "objective" | "xi" | "bench" | "impactPlayer" | "composition"> = {
    season,
    teamId: req.teamId,
    teamName: team?.name ?? `Team ${req.teamId}`,
    pitch: req.pitch,
    constraints: bounds,
    warnings,
    solver: { variables: cands.length, solves: 0, ms: 0 },
  };
  const emptyComp = compose([]);
  const fail = (message: string): PlayingXiResult => ({
    ...base,
    feasible: false,
    message,
    objective: 0,
    xi: [],
    bench: all.sort((a, b) => b.impact.adjusted - a.impact.adjusted),
    impactPlayer: { batting: null, bowling: null },
    composition: emptyComp,
    solver: { ...base.solver, solves: 1, ms: Date.now() - t0 },
  });

  if (cands.length < 11) return fail(`Only ${cands.length} selectable players — 11 are needed.`);

  const best = solve(cands, bounds);
  if (!best) return fail(diagnose(cands, bounds));

  // Marginal value: re-solve without each selected player.
  let solves = 1;
  for (const c of cands) {
    if (!best.ids.has(c.playerId)) continue;
    if (c.locked) continue;
    const alt = solve(cands.filter((x) => x.playerId !== c.playerId), bounds);
    solves++;
    c.marginalValue = alt ? round(best.objective - alt.objective) : null;
  }

  // Batting order heuristic: whoever historically faces the most balls bats highest.
  const xi = cands.filter((c) => best.ids.has(c.playerId)).sort((a, b) => b.ballsFacedPerMatch - a.ballsFacedPerMatch);
  const bench = all.filter((c) => !best.ids.has(c.playerId)).sort((a, b) => b.impact.adjusted - a.impact.adjusted);
  const composition = compose(xi);

  // IPL Impact Player: a fifth overseas player is never allowed.
  const eligible = bench.filter((c) => !excluded.has(c.playerId) && (!c.overseas || composition.overseas < 4));
  const pick = (key: "batting" | "bowling", pool: XiCandidate[]) =>
    [...pool].sort((a, b) => b.impact[key] - a.impact[key])[0] ?? null;

  return {
    ...base,
    feasible: true,
    message: null,
    objective: round(best.objective),
    xi,
    bench,
    impactPlayer: {
      batting: pick("batting", eligible),
      bowling: pick("bowling", eligible.filter((c) => c.bowlingCapacity > 0)),
    },
    composition,
    solver: { variables: cands.length, solves, ms: Date.now() - t0 },
  };
}

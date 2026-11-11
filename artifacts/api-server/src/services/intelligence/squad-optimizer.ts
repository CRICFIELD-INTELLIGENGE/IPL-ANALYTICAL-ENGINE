// CricField Player Intelligence — constrained squad optimizer.
//
// Team strength is the best XII a squad can field, in runs above replacement per
// match. XII because of the Impact Player rule: at most four overseas players take
// part. Value is earned by doing a job in the match, not by being on the sheet:
//
//   batting   seven batting slots, at most three each for top order, middle order and finishers,
//             Σ batting rar of the batters who fill them
//   bowling   20 overs split 6 / 9 / 5 across powerplay, middle and death, each bowler
//             capped at a usual workload and limited to phases actually bowled
//   slack     any over nobody in the side can bowl is a forced over at −1 run
//
//   maximise  Σ rarBat_i·b_i + Σ value_i,phase·y_i,phase − Σ slack_phase
//   subject to Σ x_i = 12, b_i ≤ x_i, Σ b_i ≤ 7, Σ b_i by batting slot ≤ 3, y_i,phase ≤ 4·x_i, Σ_phase y_i,phase ≤ cap_i·x_i,
//              overseas ≤ 4, keeper ≥ 1, spinner ≥ 1, pacers ≥ 2, bowling options ≥ 5, batting options ≥ 6
//
// So the same player is worth different amounts to different sides: a death bowler
// replaces forced overs where a side has none and a useful bowler where it has
// several, a fourth strong opener adds little, and an eighth good batter adds nothing. Composition minimums fall to what
// the squad actually has and the shortfall is reported as a gap. The overseas limit
// never relaxes. Squad limits are the 2026 auction's: 25 players, 8 overseas.

import solver, { type LpModel } from "javascript-lp-solver";

export interface SquadCandidate {
  id: string;
  name: string;
  rar: number; // runs above replacement per match; 0 with no record
  rarBat: number;
  overseas: boolean;
  keeper: boolean;
  oversCapacity: number;
  bowlingType: "pace" | "spin" | "unknown" | "none";
  battingOption: boolean;
  battingSlot: BattingSlot;
  /** Runs per over above replacement by phase. Null: not a phase this player bowls. */
  phaseValue: Record<Phase, number | null>;
  ballsFacedPerMatch: number;
  evidence: boolean; // false: no IPL record behind the rating
}

export interface StrengthResult {
  feasible: boolean;
  message: string | null;
  size: number;
  strength: number;
  /** The two halves of strength: batting slots, and the bowling plan net of forced overs. */
  battingValue: number;
  bowlingValue: number;
  xii: SquadCandidate[];
  bench: SquadCandidate[];
  overs: Record<string, Record<Phase, number>>;
  composition: {
    overseas: number; keepers: number; bowlingOptions: number; battingOptions: number; spinners: number; pacers: number; oversCapacity: number;
    battingDepth: number; phaseCoverage: { powerplay: number; middle: number; death: number };
  };
  gaps: string[];
}

export type Phase = "powerplay" | "middle" | "death";
export type BattingSlot = "top" | "middle" | "finish";
const PHASES: Phase[] = ["powerplay", "middle", "death"];

export const SQUAD_RULES = { maxSquad: 25, maxOverseasInSquad: 8, maxOverseasPlaying: 4 };
const PHASE_OVERS: Record<Phase, number> = { powerplay: 6, middle: 9, death: 5 };
const BAT_SLOTS = 7;
const SLOTS_PER_POSITION = 3;
const FORCED_OVER = -1;

const memo = new Map<string, StrengthResult>();

interface Solved { ids: Set<string>; strength: number; batting: number; forced: Record<Phase, number>; overs: Record<string, Record<Phase, number>> }

function solve(c: SquadCandidate[], size: number, minSpin: number, minPace: number, minKeeper: number, maxOverseas: number): Solved | null {
  const model: LpModel = {
    optimize: "v", opType: "max",
    constraints: {
      count: { equal: size }, overseas: { max: maxOverseas }, bowl: { min: Math.min(5, c.filter((p) => p.oversCapacity > 0).length) }, bat: { min: 6 },
      spin: { min: minSpin }, pace: { min: minPace }, keeper: { min: minKeeper }, slots: { max: BAT_SLOTS },
      slot_top: { max: SLOTS_PER_POSITION }, slot_middle: { max: SLOTS_PER_POSITION }, slot_finish: { max: SLOTS_PER_POSITION },
      phase_powerplay: { equal: PHASE_OVERS.powerplay }, phase_middle: { equal: PHASE_OVERS.middle }, phase_death: { equal: PHASE_OVERS.death },
    },
    variables: {}, binaries: {},
  };
  for (const ph of PHASES) model.variables[`s_${ph}`] = { v: FORCED_OVER, [`phase_${ph}`]: 1 };
  c.forEach((p, i) => {
    const x: Record<string, number> = {
      count: 1, overseas: p.overseas ? 1 : 0, bowl: p.oversCapacity > 0 ? 1 : 0, bat: p.battingOption ? 1 : 0,
      spin: p.oversCapacity > 0 && p.bowlingType === "spin" ? 1 : 0, pace: p.oversCapacity > 0 && p.bowlingType === "pace" ? 1 : 0,
      keeper: p.keeper ? 1 : 0, [`linkb${i}`]: -1,
    };
    model.variables[`b${i}`] = { v: p.rarBat, slots: 1, [`slot_${p.battingSlot}`]: 1, [`linkb${i}`]: 1 };
    model.constraints[`linkb${i}`] = { max: 0 };
    if (p.oversCapacity > 0) {
      x[`cap${i}`] = -p.oversCapacity;
      model.constraints[`cap${i}`] = { max: 0 };
      for (const ph of PHASES) {
        const value = p.phaseValue[ph];
        if (value === null) continue;
        x[`lim${i}${ph}`] = -4;
        model.constraints[`lim${i}${ph}`] = { max: 0 };
        model.variables[`y${i}_${ph}`] = { v: value, [`phase_${ph}`]: 1, [`cap${i}`]: 1, [`lim${i}${ph}`]: 1 };
      }
    }
    model.variables[`x${i}`] = x;
    model.binaries![`x${i}`] = 1;
  });
  const res = solver.Solve(model);
  if (!res.feasible) return null;
  const ids = new Set(c.filter((_, i) => Number(res[`x${i}`] ?? 0) > 0.5).map((p) => p.id));
  if (ids.size !== size) return null;
  const forced = { powerplay: Number(res.s_powerplay ?? 0), middle: Number(res.s_middle ?? 0), death: Number(res.s_death ?? 0) };
  const overs: Solved["overs"] = {};
  c.forEach((p, i) => { overs[p.id] = { powerplay: Number(res[`y${i}_powerplay`] ?? 0), middle: Number(res[`y${i}_middle`] ?? 0), death: Number(res[`y${i}_death`] ?? 0) }; });
  const batting = c.reduce((s, p, i) => s + p.rarBat * Number(res[`b${i}`] ?? 0), 0);
  return { ids, strength: Number(res.result), batting, forced, overs };
}

export function bestSide(squad: SquadCandidate[], size = 12): StrengthResult {
  const key = `${size}:${squad.map((p) => p.id).sort().join(",")}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const blank = { overseas: 0, keepers: 0, bowlingOptions: 0, battingOptions: 0, spinners: 0, pacers: 0, oversCapacity: 0, battingDepth: 0, phaseCoverage: { powerplay: 0, middle: 0, death: 0 } };
  if (squad.length < size) return { feasible: false, message: `Only ${squad.length} players; ${size} are needed.`, size, strength: 0, battingValue: 0, bowlingValue: 0, xii: [], bench: squad, overs: {}, composition: blank, gaps: [] };

  const gaps: string[] = [];
  const spinners = squad.filter((p) => p.oversCapacity > 0 && p.bowlingType === "spin").length;
  const pacers = squad.filter((p) => p.oversCapacity > 0 && p.bowlingType === "pace").length;
  const keepers = squad.filter((p) => p.keeper).length;
  if (spinners < 1) gaps.push("No recognised spinner in the squad");
  if (pacers < 2) gaps.push(`Only ${pacers} recognised pacer${pacers === 1 ? "" : "s"} in the squad`);
  if (keepers < 1) gaps.push("No recognised wicketkeeper in the squad");

  let sol = solve(squad, size, Math.min(1, spinners), Math.min(2, pacers), Math.min(1, keepers), SQUAD_RULES.maxOverseasPlaying);
  if (!sol) {
    // Relax only the composition minimums; overseas is a law of the game and never relaxes.
    sol = solve(squad, size, 0, Math.min(1, pacers), 0, SQUAD_RULES.maxOverseasPlaying);
    if (sol) gaps.push("The squad cannot field a full bowling and keeping balance together");
  }
  if (!sol) return { feasible: false, message: "No legal XII: the squad cannot meet the overseas and bowling rules together.", size, strength: 0, battingValue: 0, bowlingValue: 0, xii: [], bench: squad, overs: {}, composition: blank, gaps };

  const { ids, forced, overs } = sol;
  const xii = squad.filter((p) => ids.has(p.id)).sort((a, b) => b.ballsFacedPerMatch - a.ballsFacedPerMatch);
  const bench = squad.filter((p) => !ids.has(p.id)).sort((a, b) => b.rar - a.rar);
  const sum = (f: (p: SquadCandidate) => number) => xii.reduce((s, p) => s + f(p), 0);
  const coverage = {
    powerplay: Math.round((1 - forced.powerplay / PHASE_OVERS.powerplay) * 100),
    middle: Math.round((1 - forced.middle / PHASE_OVERS.middle) * 100),
    death: Math.round((1 - forced.death / PHASE_OVERS.death) * 100),
  };
  for (const ph of PHASES) if (forced[ph] >= 0.5) gaps.push(`${forced[ph].toFixed(1)} ${ph} overs have no recognised bowler`);
  const out: StrengthResult = {
    feasible: true, message: null, size, strength: Math.round(sol.strength * 100) / 100, battingValue: Math.round(sol.batting * 100) / 100, bowlingValue: Math.round((sol.strength - sol.batting) * 100) / 100, xii, bench, overs: Object.fromEntries(xii.map((p) => [p.id, overs[p.id]])),
    composition: {
      overseas: xii.filter((p) => p.overseas).length, keepers: xii.filter((p) => p.keeper).length,
      bowlingOptions: xii.filter((p) => p.oversCapacity > 0).length, battingOptions: xii.filter((p) => p.battingOption).length,
      spinners: xii.filter((p) => p.oversCapacity > 0 && p.bowlingType === "spin").length,
      pacers: xii.filter((p) => p.oversCapacity > 0 && p.bowlingType === "pace").length,
      oversCapacity: sum((p) => p.oversCapacity), battingDepth: xii.filter((p) => p.ballsFacedPerMatch >= 10).length, phaseCoverage: coverage,
    },
    gaps,
  };
  if (memo.size > 20_000) memo.clear();
  memo.set(key, out);
  return out;
}

/** What adding one player changes. Zero when the player cannot get into the best side. */
export function incrementalValue(squad: SquadCandidate[], player: SquadCandidate) {
  const onSquad = squad.some((p) => p.id === player.id);
  const without = squad.filter((p) => p.id !== player.id);
  const before = bestSide(without);
  const after = bestSide(onSquad ? squad : [...squad, player]);
  const inSide = after.xii.some((p) => p.id === player.id);
  const displaced = inSide ? before.xii.filter((p) => !after.xii.some((q) => q.id === p.id)) : [];
  const overseasCount = without.filter((p) => p.overseas).length + (player.overseas ? 1 : 0);
  return {
    before: before.strength, after: after.strength, increment: Math.round((after.strength - before.strength) * 100) / 100,
    entersBestSide: inSide, replaces: displaced.map((p) => p.name),
    squadFull: without.length + 1 > SQUAD_RULES.maxSquad,
    overseasBlocked: player.overseas && overseasCount > SQUAD_RULES.maxOverseasInSquad,
    gapsClosed: before.gaps.filter((g) => !after.gaps.includes(g)),
    infeasibleBefore: !before.feasible,
  };
}

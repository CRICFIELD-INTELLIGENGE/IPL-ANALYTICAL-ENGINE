// Captain's Call — pick the bowler, plan and field, then see the distribution of outcomes.
//
// Base per-ball outcome rates come from real IPL deliveries for the scenario's phase (served by the API from
// the CRICFIELD warehouse). Everything a captain changes — bowler type, plan, field, batter type — is applied as
// SYNTHETIC game-balancing multipliers defined below. Results are estimates from repeated simulation, shown
// as ranges, never as a guarantee.

import { seeded, weighted } from "./rng";

export type Phase = "powerplay" | "middle" | "death";
/** Probabilities for one delivery: dot, 1, 2, 3, 4, 6, wicket, wide/no-ball. */
export type Rates = [number, number, number, number, number, number, number, number];
export type BaseRates = Record<Phase, { rates: Rates; balls: number }>;

export type BowlerType = "death_pacer" | "swing_pacer" | "wrist_spinner" | "finger_spinner" | "part_timer";
export type Plan = "yorkers" | "wide_line" | "slower_balls" | "bouncers" | "attack_stumps";
export type FieldSet = "attacking" | "balanced" | "defensive";
export type BatterType = "power_hitter" | "accumulator" | "spin_basher" | "new_batter";

export const BOWLER_TYPES: Record<BowlerType, string> = { death_pacer: "Death-overs pacer", swing_pacer: "New-ball swing bowler", wrist_spinner: "Wrist spinner", finger_spinner: "Finger spinner", part_timer: "Part-time option" };
export const PLANS: Record<Plan, string> = { yorkers: "Yorkers at the base of the stumps", wide_line: "Wide outside off to a packed off side", slower_balls: "Take pace off — slower balls and cutters", bouncers: "Short and at the body", attack_stumps: "Full and straight — hunt the wicket" };
export const FIELDS: Record<FieldSet, string> = { attacking: "Attacking — slips and catchers in", balanced: "Balanced", defensive: "Defensive — protect the rope" };
export const BATTERS: Record<BatterType, string> = { power_hitter: "Power hitter", accumulator: "Accumulator", spin_basher: "Spin specialist batter", new_batter: "New batter, just in" };

type Mod = [number, number, number, number, number, number, number, number];
const ONE: Mod = [1, 1, 1, 1, 1, 1, 1, 1];
// Multipliers on [dot, 1, 2, 3, 4, 6, W, extra]. Synthetic balancing, tuned so no option is free.
const BOWLER_MOD: Record<BowlerType, Partial<Record<Phase, Mod>>> = {
  death_pacer: { death: [1.15, 1, 1, 1, 0.85, 0.85, 1.15, 1.1], powerplay: [1, 1, 1, 1, 1.05, 1, 1, 1.1] },
  swing_pacer: { powerplay: [1.15, 0.95, 1, 1, 0.95, 0.85, 1.3, 1.2], death: [0.9, 1, 1, 1, 1.15, 1.2, 0.95, 1.1] },
  wrist_spinner: { middle: [1.1, 0.95, 1, 1, 0.95, 1.05, 1.3, 0.8], death: [0.9, 1, 1, 1, 1.1, 1.35, 1.1, 0.8], powerplay: [0.95, 1, 1, 1, 1.15, 1.2, 1.1, 0.8] },
  finger_spinner: { middle: [1.15, 1.05, 1, 1, 0.9, 0.95, 1, 0.7], death: [0.9, 1, 1, 1, 1.15, 1.35, 0.9, 0.7], powerplay: [1.05, 1, 1, 1, 1.1, 1.1, 0.95, 0.7] },
  part_timer: { powerplay: [0.85, 1, 1.1, 1, 1.25, 1.3, 0.85, 1.1], middle: [0.9, 1.05, 1.1, 1, 1.15, 1.2, 0.9, 1.1], death: [0.8, 1, 1.1, 1, 1.3, 1.45, 0.85, 1.2] },
};
const PLAN_MOD: Record<Plan, Mod> = {
  yorkers: [1.1, 1.05, 0.9, 1, 0.8, 0.75, 1, 1.3],
  wide_line: [1.15, 0.95, 1, 1, 0.9, 0.8, 0.9, 1.6],
  slower_balls: [1.05, 1, 1, 1, 0.95, 1.05, 1.15, 1],
  bouncers: [1.1, 0.9, 1, 1, 1.05, 1.1, 1.15, 1.4],
  attack_stumps: [1, 1, 1, 1, 1.1, 1.05, 1.3, 0.9],
};
const FIELD_MOD: Record<FieldSet, Mod> = { attacking: [0.95, 0.9, 1.1, 1.2, 1.2, 1.05, 1.2, 1], balanced: ONE, defensive: [0.9, 1.25, 1.15, 1, 0.75, 0.9, 0.9, 1] };
const BATTER_MOD: Record<BatterType, Mod> = { power_hitter: [1.05, 0.85, 0.9, 1, 1.15, 1.45, 1.1, 1], accumulator: [0.9, 1.25, 1.15, 1, 0.95, 0.7, 0.85, 1], spin_basher: ONE, new_batter: [1.15, 1, 1, 1, 0.9, 0.85, 1.2, 1] };
/** How each plan plays against a batter type (a power hitter feasts on bouncers, a new batter fears yorkers…). */
const MATCHUP: Partial<Record<BatterType, Partial<Record<Plan, Mod>>>> = {
  power_hitter: { bouncers: [0.95, 1, 1, 1, 1.1, 1.3, 1, 1], slower_balls: [1.05, 1, 1, 1, 0.95, 0.85, 1.15, 1], yorkers: [1.05, 1, 1, 1, 0.95, 0.85, 1.05, 1] },
  accumulator: { wide_line: [1.2, 0.9, 1, 1, 0.9, 1, 1.05, 1], attack_stumps: [0.95, 1.1, 1, 1, 1.05, 1, 1.15, 1] },
  new_batter: { yorkers: [1.05, 1, 1, 1, 1, 1, 1.3, 1], attack_stumps: [1, 1, 1, 1, 1, 1, 1.25, 1] },
  spin_basher: {},
};
const SPIN_VS_BASHER: Mod = [0.9, 1, 1, 1, 1.15, 1.3, 0.9, 1];

export interface Option { id: string; name: string; type: BowlerType; note: string }
export interface Scenario {
  id: string;
  title: string;
  brief: string;
  phase: Phase;
  balls: number; // legal balls to bowl
  objective: { kind: "defend"; runs: number } | { kind: "wickets"; wickets: number } | { kind: "contain"; runs: number };
  wicketsInHand: number;
  batter: BatterType;
  bowlers: Option[];
}

export const SCENARIOS: Scenario[] = [
  { id: "final-over-12", title: "Defend 12 off the last over", brief: "The final over. A set power hitter is on strike and they need 12.", phase: "death", balls: 6, objective: { kind: "defend", runs: 12 }, wicketsInHand: 4, batter: "power_hitter",
    bowlers: [{ id: "a", name: "Your death specialist", type: "death_pacer", note: "Last over left" }, { id: "b", name: "Your wrist spinner", type: "wrist_spinner", note: "Two overs, 0/31 so far" }, { id: "c", name: "Your new-ball swing bowler", type: "swing_pacer", note: "Expensive at the death in this game" }] },
  { id: "powerplay-two", title: "Two wickets in the powerplay", brief: "Overs 5–6. You need two wickets in 12 balls to swing the game.", phase: "powerplay", balls: 12, objective: { kind: "wickets", wickets: 2 }, wicketsInHand: 10, batter: "accumulator",
    bowlers: [{ id: "a", name: "Your new-ball swing bowler", type: "swing_pacer", note: "Ball still swinging" }, { id: "b", name: "Your wrist spinner", type: "wrist_spinner", note: "Fields up, risky" }, { id: "c", name: "Your finger spinner", type: "finger_spinner", note: "Tight, rarely takes wickets" }] },
  { id: "middle-destroyer", title: "Stop the middle-overs destroyer", brief: "A spin-hitting batter is taking your spinners apart. Concede 14 or fewer in the next two overs.", phase: "middle", balls: 12, objective: { kind: "contain", runs: 14 }, wicketsInHand: 6, batter: "spin_basher",
    bowlers: [{ id: "a", name: "Your finger spinner", type: "finger_spinner", note: "Matchup risk" }, { id: "b", name: "Your death specialist", type: "death_pacer", note: "Using him now means less at the death" }, { id: "c", name: "Your part-timer", type: "part_timer", note: "Surprise option" }] },
  { id: "small-total", title: "Protect a small total", brief: "You made 141. They need 27 off the last 18 balls with 5 wickets left.", phase: "death", balls: 18, objective: { kind: "defend", runs: 27 }, wicketsInHand: 5, batter: "accumulator",
    bowlers: [{ id: "a", name: "Your death specialist", type: "death_pacer", note: "Two overs left" }, { id: "b", name: "Your wrist spinner", type: "wrist_spinner", note: "One over left" }, { id: "c", name: "Your swing bowler", type: "swing_pacer", note: "Two overs left" }] },
  { id: "new-batter", title: "Attack the new batter", brief: "A wicket just fell. Six balls at a brand-new batter: take a wicket before they settle.", phase: "middle", balls: 6, objective: { kind: "wickets", wickets: 1 }, wicketsInHand: 6, batter: "new_batter",
    bowlers: [{ id: "a", name: "Your wrist spinner", type: "wrist_spinner", note: "Wicket-taker" }, { id: "b", name: "Your death specialist", type: "death_pacer", note: "Quickest bowler" }, { id: "c", name: "Your finger spinner", type: "finger_spinner", note: "Control option" }] },
];

export interface Choice { bowler: string; plan: Plan; field: FieldSet }

export function ballRates(base: BaseRates, s: Scenario, c: Choice): Rates {
  const bowler = s.bowlers.find((b) => b.id === c.bowler) ?? s.bowlers[0];
  const spin = bowler.type === "wrist_spinner" || bowler.type === "finger_spinner";
  const mods: Mod[] = [BOWLER_MOD[bowler.type][s.phase] ?? ONE, PLAN_MOD[c.plan], FIELD_MOD[c.field], BATTER_MOD[s.batter], MATCHUP[s.batter]?.[c.plan] ?? ONE, s.batter === "spin_basher" && spin ? SPIN_VS_BASHER : ONE];
  const r = base[s.phase].rates.map((p, i) => mods.reduce((v, m) => v * m[i], p));
  const t = r.reduce((a, b) => a + b, 0);
  return r.map((v) => v / t) as Rates;
}

const RUNS = [0, 1, 2, 3, 4, 6];
export interface SimSpell { runs: number; wickets: number; legal: number; success: boolean; log: string[] }

export function simulateSpell(rates: Rates, s: Scenario, rng: () => number, withLog = false): SimSpell {
  let runs = 0, wickets = 0, legal = 0;
  const log: string[] = [];
  const done = () => legal >= s.balls || wickets >= s.wicketsInHand || (s.objective.kind === "defend" && runs >= s.objective.runs);
  let guard = 0;
  while (!done() && guard++ < 200) {
    const i = weighted(rng, rates);
    if (i === 7) { runs += 1; if (withLog) log.push("wd"); continue; }
    legal++;
    if (i === 6) { wickets++; if (withLog) log.push("W"); continue; }
    runs += RUNS[i];
    if (withLog) log.push(String(RUNS[i]));
  }
  const o = s.objective;
  const success = o.kind === "defend" ? runs < o.runs : o.kind === "wickets" ? wickets >= o.wickets : runs <= o.runs;
  return { runs, wickets, legal, success, log };
}

export interface Estimate { pSuccess: number; low: number; high: number; medianRuns: number; meanWickets: number }
/** Monte Carlo estimate with a 90% interval for the success probability (normal approximation). */
export function estimate(base: BaseRates, s: Scenario, c: Choice, seed: string, n = 2000): Estimate {
  const rng = seeded(`${seed}|est|${c.bowler}|${c.plan}|${c.field}`);
  const rates = ballRates(base, s, c);
  let wins = 0, wk = 0;
  const runs: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = simulateSpell(rates, s, rng);
    wins += Number(r.success);
    wk += r.wickets;
    runs.push(r.runs);
  }
  runs.sort((a, b) => a - b);
  const p = wins / n, se = Math.sqrt((p * (1 - p)) / n);
  return { pSuccess: p, low: Math.max(0, p - 1.645 * se), high: Math.min(1, p + 1.645 * se), medianRuns: runs[Math.floor(n / 2)], meanWickets: wk / n };
}

export function allChoices(s: Scenario): Choice[] {
  const out: Choice[] = [];
  for (const b of s.bowlers) for (const plan of Object.keys(PLANS) as Plan[]) for (const field of Object.keys(FIELDS) as FieldSet[]) out.push({ bowler: b.id, plan, field });
  return out;
}

export interface CallResult { chosen: Estimate; best: { choice: Choice; est: Estimate }; outcome: SimSpell; points: number }
/** Score: up to 60 for decision quality (relative to the best option's estimate), 40 if the simulated spell succeeds. */
export function playCall(base: BaseRates, s: Scenario, c: Choice, seed: string): CallResult {
  const chosen = estimate(base, s, c, seed);
  let best = { choice: c, est: chosen };
  for (const alt of allChoices(s)) {
    const e = estimate(base, s, alt, seed, 800);
    if (e.pSuccess > best.est.pSuccess) best = { choice: alt, est: e };
  }
  const outcome = simulateSpell(ballRates(base, s, c), s, seeded(`${seed}|play|${s.id}`), true);
  const quality = best.est.pSuccess > 0 ? Math.min(1, chosen.pSuccess / best.est.pSuccess) : 1;
  return { chosen, best, outcome, points: Math.round(60 * quality) + (outcome.success ? 40 : 0) };
}

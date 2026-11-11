import retentionVersion from "../../../data/retention/model-version.json";
import rrStrategy from "../../../data/rr-2027-predictions.json";
import franchiseStrategy from "../../../data/franchise-2027-predictions.json";
import { getRegistry } from "../intelligence/identity";
// CRICFIELD Strategy Composite Retention Rating (CRR), version 3.
// Eight components plus explicit, auditable franchise decision-band constraints.
// Statistical evidence and declared planning policy are never described as equivalent evidence.
//
// A 0–100 recommendation of how strongly a franchise should keep a player. It is not a
// chance of being retained, and it is never converted into one; the forecast is a
// separate model with its own calibration gate.
//
// Five statistical components compare sporting output, market value and horizon.
// Three planning components add continuity, assigned roles and development investment.
// Explicit franchise policy may constrain the decision band; that constraint is exposed:
//   performance  three-season, shrunk, phase-adjusted runs above replacement (performance.ts)
//   scarcity     how far the best unsigned player in the same granular role falls short,
//                and how many teammates already cover the role
//   economics    expected auction price against the contract
//   fit          change to the franchise's best XII, from the squad optimiser
//   horizon      age effect over the next one and three seasons, measured from data
// A component without evidence is left out and the weights of the rest are scaled up,
// so a missing salary is never scored as a bad contract. Coverage reports what was left out.

import type { Snapshot, SnapshotPlayer } from "../intelligence/service";
import { marketEnvelope } from "../intelligence/service";
import { completedMoves, readLedger, resolvedMoves, SQUAD_CHANGING } from "./ledger";
import { computePicks as computeV1 } from "./picks";
import type { SeasonRules } from "./rules";

export const CRR_VERSION = retentionVersion.indexVersion;
export const CRR_WEIGHTS = { performance: 20, scarcity: 15, economics: 10, fit: 15, horizon: 5, continuity: 15, roleSecurity: 15, development: 5 } as const;
export type ComponentKey = keyof typeof CRR_WEIGHTS;
const LABELS: Record<ComponentKey, string> = {
  continuity: "Franchise continuity", roleSecurity: "Planned role and bowling balance", development: "Development investment",
  performance: "Three-season performance", scarcity: "Role scarcity", economics: "Auction economics", fit: "Tactical XI/XII fit", horizon: "Age and cycle horizon",
};
/** Alternative weightings used only to test whether a tier depends on the choice of weights. */
export const SENSITIVITY_SETS: Record<string, Record<ComponentKey, number>> = {
  equal: { performance: 12.5, scarcity: 12.5, economics: 12.5, fit: 12.5, horizon: 12.5, continuity: 12.5, roleSecurity: 12.5, development: 12.5 },
  "performance-led": { performance: 35, scarcity: 15, economics: 10, fit: 15, horizon: 5, continuity: 10, roleSecurity: 5, development: 5 },
  "money-led": { performance: 15, scarcity: 15, economics: 30, fit: 10, horizon: 5, continuity: 10, roleSecurity: 10, development: 5 },
  "no-age": { performance: 25, scarcity: 15, economics: 10, fit: 15, horizon: 0, continuity: 15, roleSecurity: 15, development: 5 },
};

export const CATEGORIES = ["Icons", "Franchise Cornerstone", "Priority Retain", "Strong Retain", "Retain", "Retention Dilemma", "Release / Buyback Review", "Release Candidate", "Insufficient Evidence"] as const;
export type Category = (typeof CATEGORIES)[number];
/** Provisional bands from the brief. No franchise decisions exist yet to calibrate them against. */
export const CRR_BANDS: { min: number; category: Category }[] = [
  { min: 98, category: "Icons" }, { min: 90, category: "Franchise Cornerstone" }, { min: 80, category: "Priority Retain" }, { min: 70, category: "Strong Retain" },
  { min: 60, category: "Retain" }, { min: 48, category: "Retention Dilemma" }, { min: 35, category: "Release / Buyback Review" }, { min: 0, category: "Release Candidate" },
];
export const MIN_COVERAGE = 60;
const RETAIN = new Set<Category>(["Icons", "Franchise Cornerstone", "Priority Retain", "Strong Retain", "Retain"]);
const RELEASE = new Set<Category>(["Release / Buyback Review", "Release Candidate"]);

export interface Metric { key: ComponentKey; label: string; max: number; score: number | null; measured: number; fraction: number | null; evidence: string }
export interface Scenario { kind: "retain" | "release_buyback" | "release_replace" | "trade"; label: string; available: boolean; detail: string; rarChange: number | null; purseChangeLakh: number | null; probability?: { value: number; meaning: string } | null; status?: string; sources?: { publisher: string; url: string; official: boolean }[] }
export interface Pick {
  id: string; name: string; warehouseId: number | null; team: string; role: string; granularRole: string; overseas: boolean | null; contractLakh: number | null; predictedLakh: number;
  strategy: { baseIndex: number; policyCategory: Category; rationale: string; scoreRange: [number, number]; basis: string } | null;
  strengths?: string | null;
  weaknesses?: string | null;
  inPlayingXI?: boolean;
  impactSub?: boolean;
  index: number; coverage: number; category: Category; cappedFrom: Category | null; recommendation: "retain" | "release" | "undecided"; confidence: "high" | "medium" | "low";
  metrics: Metric[]; reason: string; against: string | null; fitIncrement: number | null; limitations: string[];
  projection: { rar: number; sd: number; bat: number; bowl: number; seasonsUsed: number[] } | null;
  seasons: NonNullable<SnapshotPlayer["retentionV2"]>["seasons"];
  horizon: { age: number | null; oneYear: number | null; threeYear: number | null; megaNote: string };
  scenarios: Scenario[]; sensitivity: { tierStability: number; range: [number, number]; byWeights: { set: string; index: number; category: Category }[] };
  previous: { version: string; index: number; category: string } | null; acquisition: string | null; tradedIn: boolean;
}

const rank = (v: number, all: number[]) => (all.length > 1 ? all.filter((x) => x < v).length / (all.length - 1) : 0.5);
const cr = (lakh: number) => `₹${(lakh / 100).toFixed(2)} Cr`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const sign = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
const birthYear = (p: SnapshotPlayer) => { const m = /(\d{4})/.exec(p.birthDate ?? ""); return m ? Number(m[1]) : null; };
const ageBand = (age: number) => (age < 25 ? "under-25" : age <= 28 ? "25-28" : age <= 31 ? "29-31" : age <= 34 ? "32-34" : "35+");
const categoryOf = (index: number, coverage: number, rated: boolean): Category => (!rated || coverage < MIN_COVERAGE ? "Insufficient Evidence" : CRR_BANDS.find((b) => index >= b.min)!.category);

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + e) / 2 : (1 - e) / 2;
}

/** Role as a franchise plans it: nationality, then the job. Only recorded handedness and bowling type are used. */
export function granularRole(p: SnapshotPlayer): string {
  const v = p.retentionV2, c = p.candidate;
  const nat = p.overseas === true ? "Overseas" : p.overseas === false ? "Indian" : "Nationality unverified";
  const sub = v?.bowlingSubtype ?? "";
  const pace = /pace|seam|medium|fast/i.test(sub) || (!sub && c.bowlingType === "pace");
  const balls = (v?.seasons ?? []).reduce((a, s) => a.map((x, i) => x + s.phaseBallsBowled[i]), [0, 0, 0]);
  const total = balls[0] + balls[1] + balls[2];
  if (p.role === "wicketkeeper") return `${nat} wicketkeeper-batter`;
  if (p.role === "all-rounder") return `${nat} ${pace ? "seam" : "spin"} all-rounder`;
  if (p.role === "bowler") {
    if (pace) return total >= 120 && balls[2] / total >= 0.3 ? `${nat} death-overs pacer` : total >= 120 && balls[0] / total >= 0.4 ? `${nat} new-ball pacer` : `${nat} middle-overs pacer`;
    return /leg|wrist|chinaman/i.test(sub) ? `${nat} wrist spinner` : /off|orthodox|finger/i.test(sub) ? `${nat} finger spinner` : `${nat} spinner`;
  }
  if (c.battingSlot === "top") return `${nat} opener`;
  if (c.battingSlot === "finish") return `${nat} finisher`;
  return v?.battingHand === "L" ? `${nat} left-handed middle order` : `${nat} middle order`;
}

export function computeCrr(s: Snapshot, rules: SeasonRules): Pick[] {
  const squad = s.players.filter((p) => p.team);
  const proj = (p: SnapshotPlayer) => p.retentionV2?.projection ?? null;
  const roleOf = new Map(s.players.map((p) => [p.id, granularRole(p)]));
  const rated = squad.filter((p) => proj(p));
  const ownFit = (p: SnapshotPlayer) => (p.candidate.evidence ? p.fit.find((f) => f.team === p.team) ?? null : null);
  const marketOk = (p: SnapshotPlayer) => Boolean(p.contractLakh) && (p.performance.matchesCareer ?? 0) > 0 && marketEnvelope(s, p).status === "model_prediction";
  const money = (p: SnapshotPlayer) => Math.log(p.market.lakh / p.contractLakh!);
  const pricedAll = squad.filter(marketOk).map(money);
  const fitsAll = squad.filter((p) => ownFit(p)).map((p) => ownFit(p)!.increment);
  const aging = s.retentionModel?.aging;
  const curve = (disc: "bat" | "bowl", age: number) => aging?.[disc].find((b) => b.band === ageBand(age))?.change ?? 0;

  // The unsigned pool: rated players on no squad. Released players are not known until the deadline.
  const pool = s.players.filter((p) => !p.team && proj(p) && p.overseas !== null);
  const bestUnsigned = (p: SnapshotPlayer) => {
    const exact = pool.filter((q) => roleOf.get(q.id) === roleOf.get(p.id));
    const near = exact.length ? exact : pool.filter((q) => q.role === p.role && q.overseas === p.overseas);
    return near.sort((a, b) => proj(b)!.rar - proj(a)!.rar)[0] ?? null;
  };
  const gapOf = new Map<string, number>();
  for (const p of rated) { const b = bestUnsigned(p); gapOf.set(p.id, proj(p)!.rar - (b ? proj(b)!.rar : 0)); }
  const gapsAll = [...gapOf.values()];
  const horizonOf = (p: SnapshotPlayer, years: number) => {
    const by = birthYear(p), v = proj(p);
    if (!by || !v || !aging) return null;
    const last = p.retentionV2!.seasons.at(-1);
    const bowlShare = last && last.batBalls + last.bowlBalls ? last.bowlBalls / (last.batBalls + last.bowlBalls) : 0;
    let sum = 0;
    for (let k = 0; k < years; k++) { const age = s.targetSeason + k - by; sum += (1 - bowlShare) * curve("bat", age) + bowlShare * curve("bowl", age); }
    return r2(sum);
  };
  const horizonAll = squad.map((p) => horizonOf(p, 3)).filter((x): x is number => x !== null);

  const v1 = new Map(computeV1(s, rules).map((p) => [p.id, p]));
  const moves = resolvedMoves(readLedger().entries);
  const applied = new Set((s.transactionsApplied ?? []).map((m) => m.canonicalId));
  const pending = completedMoves(); // a completed entry not yet in this snapshot

  return squad.map((p): Pick => {
    const v = proj(p), team = p.team!;
    const normalize = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "").replace("suryavanshi", "sooryavanshi").replace("amanrao", "amanraoperala").replace("peralaperala", "perala");
    const fTeamStrategy = team === "RR" ? rrStrategy : (franchiseStrategy as any)?.teams?.[team];
    const plan = rules.season === 2027 && fTeamStrategy ? fTeamStrategy.players.find((r: any) => r.rosterStatus !== "external-review" && [p.name, ...(getRegistry().byCanonical.get(p.id)?.aliases ?? [])].some((n: string) => [r.name, ...(r.aliases ?? [])].some((alias: string) => normalize(n) === normalize(alias)))) : undefined;
    const plannedStarter = plan?.preferredPosition != null;
    const core = plan?.category === "Franchise Cornerstone";
    const policyValue = plan ? ({"Icons": 1, "Franchise Cornerstone": 1, "Priority Retain": .9, "Strong Retain": .75, "Retention Dilemma": .5, "Release / Buyback Review": .25, "Release Candidate": .1} as Record<string,number>)[plan.category] : null;
    const matches3 = (p.retentionV2?.seasons ?? []).filter((x) => x.season > s.ratedThrough - 3).reduce((a, x) => a + x.matches, 0);
    const metric = (key: ComponentKey, fraction: number | null, evidence: string): Metric => ({
      key, label: LABELS[key], max: CRR_WEIGHTS[key], measured: fraction === null ? 0 : CRR_WEIGHTS[key], fraction: fraction === null ? null : r2(fraction),
      score: fraction === null ? null : r1(CRR_WEIGHTS[key] * fraction), evidence,
    });

    const peers = rated.filter((q) => q.role === p.role).map((q) => proj(q)!.rar);
    const seasonsText = (p.retentionV2?.seasons ?? []).filter((x) => x.season > s.ratedThrough - 3).map((x) => `${x.season}: ${x.matches} m, ${sign(x.batPerMatch + x.bowlPerMatch)}/m`).join("; ");
    const performance = metric("performance", v ? rank(v.rar, peers) : null, v
      ? `${sign(v.rar)} runs above replacement per match over ${v.seasonsUsed.join(", ")} (±${v.sd.toFixed(1)}), ${Math.round(rank(v.rar, peers) * 100)}th percentile of squad ${p.role}s. ${seasonsText}`
      : "No IPL record in the last three seasons.");

    const repl = v ? bestUnsigned(p) : null;
    const gap = gapOf.get(p.id);
    const cover = v ? rated.filter((q) => q.team === team && q.id !== p.id && roleOf.get(q.id) === roleOf.get(p.id) && proj(q)!.rar >= v.rar - 0.5).length : 0;
    const scarcity = metric("scarcity", gap === undefined ? null : 0.7 * rank(gap, gapsAll) + 0.3 / (1 + cover), gap === undefined ? "No rating to compare with the market." :
      `${roleOf.get(p.id)}. ${repl ? `Best unsigned in the role: ${repl.name} at ${sign(proj(repl)!.rar)}, a gap of ${sign(gap)} per match` : "No unsigned player in the role"}; ${cover} teammate${cover === 1 ? "" : "s"} cover${cover === 1 ? "s" : ""} it${p.overseas ? `. Uses one of ${rules.maxOverseas} overseas places` : ""}.`);

    const mkt = marketEnvelope(s, p);
    const tolerance = rrStrategy.economics.fairValueTolerance;
    const maxPenalty = rrStrategy.economics.maximumPriceOnlyPenalty;
    const contract = p.contractLakh;
    const priceRatio = contract ? p.market.lakh / contract : null;
    const stableEconomics = marketOk(p) && priceRatio !== null ? contract! >= p.market.low && contract! <= p.market.high || Math.abs(priceRatio - 1) <= tolerance ? .5 : priceRatio > 1 ? Math.min(1, .5 + .5 * (priceRatio - 1) / (priceRatio + 1)) : Math.max(.5 - maxPenalty, .5 + .5 * (priceRatio - 1)) : null;
    const economics = metric("economics", stableEconomics, !p.contractLakh ? "Current salary is not on file." : (p.performance.matchesCareer ?? 0) === 0 ? "No IPL record behind a market estimate." :
      mkt.status !== "model_prediction" ? `Not scored: ${mkt.statusReason}` : `${cr(p.contractLakh)} contract against ${cr(p.market.lakh)} expected at auction (80% range ${cr(p.market.low)}–${cr(p.market.high)}).`);

    economics.evidence += ` Price-only decisions use a ${tolerance*100}% neutral band and at most ${maxPenalty*100} component-point penalty; replacement quality and retained role are assessed separately.`;

    const fit = ownFit(p);
    const fitFraction = fit ? 0.5 * rank(fit.increment, fitsAll) + 0.5 * (fit.entersBestSide ? 1 : 0) : null;
    const fitMetric = metric("fit", fitFraction, !fit ? "No record to place in this squad." : fit.entersBestSide ? `In the ${team} best XII; ${sign(fit.increment)} runs per match against the next-best squad option` : `Outside the ${team} best XII`);

    const by = birthYear(p), age = by ? s.targetSeason - by : null;
    const h1 = horizonOf(p, 1), h3 = horizonOf(p, 3);
    const horizon = metric("horizon", h3 === null ? null : rank(h3, horizonAll), h3 === null ? (age === null ? "Age is not verified." : "No rating to age.") : `Age ${age} in ${s.targetSeason}. Players this age change by ${sign(h1!)} runs per match next season and ${sign(h3)} over three, measured on IPL history`);

    const selection = p.selection;
    const continuity = metric("continuity", policyValue ?? (selection ? Math.min(1, .5 * Math.min(1, selection.seasonsWithTeam / 4) + .3 * (selection.teamMatches ? selection.matchesForTeam / selection.teamMatches : 0) + .2 * Number(selection.captain)) : null),
      plan ? `Declared franchise policy: ${plan.category}. ${plan.reason}` : selection ? `${selection.seasonsWithTeam} seasons with ${team}; ${selection.matchesForTeam}/${selection.teamMatches} latest team matches; captain: ${selection.captain ? "yes" : "no"}.` : "Franchise selection history unavailable.");
    const roleSecurity = metric("roleSecurity", plan ? plannedStarter ? 1 : policyValue : fit ? fit.entersBestSide ? .9 : .4 : null,
      plan ? `${plannedStarter ? `Planned XI position ${plan.preferredPosition}` : "Reserve / rotation role"}. ${plan.reason} This is a declared tactical input, not measured performance.` : fit ? `Historical best-XII role: ${fit.entersBestSide ? "starter" : "reserve"}.` : "No documented role assignment.");
    const development = metric("development", plan ? core ? 1 : plan.category === "Strong Retain" && !plannedStarter ? .8 : .5 : age === null ? null : age <= 23 ? .9 : age <= 27 ? .7 : .4,
      plan ? "Declared development and continuity investment; no unverified domestic statistics are assumed." : age === null ? "Age unavailable for development assessment." : `Provisional development rubric for verified age ${age}; not a measured future-performance forecast.`);
    const metrics = [performance, scarcity, economics, fitMetric, horizon, continuity, roleSecurity, development];
    const weighted = (w: Record<ComponentKey, number>) => {
      const m = metrics.filter((x) => x.fraction !== null && w[x.key] > 0);
      const total = m.reduce((a, x) => a + w[x.key], 0);
      return total ? r1((100 * m.reduce((a, x) => a + w[x.key] * x.fraction!, 0)) / total) : 0;
    };
    const baseIndex = weighted(CRR_WEIGHTS);
    // The franchise policy determines the decision band; evidence differentiates within it.
    // This is an explicit planning constraint, not an independently calibrated forecast.
    const policyRanges: Record<string, [number, number]> = {"Icons": [98,100], "Franchise Cornerstone": [90,100], "Franchise Core": [90,100], "Priority Retain": [80,89.9], "Strong Retain": [70,79.9], "Strong retain": [70,79.9], "Retain": [60,69.9], "Retention Dilemma": [48,59.9], "Release / Buyback Review": [35,47.9], "Release Candidate": [0,34.9], "RETIRED PLAYER": [0,20.0], "CANT PLAY(BAN)": [0,20.0], "Maybe retiring candidate": [20,34.9]};
    const range = plan ? policyRanges[plan.category] : null;
    const applyPolicy = (score: number) => range ? r1(range[0] + (range[1]-range[0]) * score / 100) : score;
    const index = applyPolicy(baseIndex);
    const coverage = metrics.reduce((a, x) => a + x.measured, 0);
    const confidence: Pick["confidence"] = coverage >= 90 && matches3 >= 25 ? "high" : coverage >= 75 && matches3 >= 10 ? "medium" : "low";
    // The top two tiers are claims of indispensability; thin evidence cannot carry them.
    const normPlanCat = plan ? (plan.category === "Icons" ? "Icons" : plan.category === "Franchise Core" ? "Franchise Cornerstone" : plan.category === "Strong retain" ? "Strong Retain" : (plan.category === "RETIRED PLAYER" || plan.category === "CANT PLAY(BAN)" || plan.category === "Maybe retiring candidate") ? "Release Candidate" : plan.category) : null;
    const raw = normPlanCat ? (normPlanCat as Category) : categoryOf(index, coverage, Boolean(v));
    const capped = !plan && confidence === "low" && CATEGORIES.indexOf(raw) < CATEGORIES.indexOf("Strong Retain");
    const category: Category = capped ? "Strong Retain" : raw;
    const byWeights = Object.entries(SENSITIVITY_SETS).map(([set, w]) => { const i = applyPolicy(weighted(w)); return { set, index: i, category: plan ? plan.category as Category : categoryOf(i, coverage, Boolean(v)) }; });
    const all = [index, ...byWeights.map((b) => b.index)];

    const effectiveSalaryLakh = p.contractLakh ?? (plan?.contractLakh ?? null);

    // Scenarios: what each choice does to output and purse. None of them is a forecast.
    const scenarios: Scenario[] = [];
    scenarios.push({ kind: "retain", label: "Retain", available: true, rarChange: 0, purseChangeLakh: p.contractLakh ? -p.contractLakh : null,
      detail: p.contractLakh ? `Keeps ${v ? sign(v.rar) : "an unrated"} runs per match for ${cr(p.contractLakh)} of the purse.` : "Keeps the player; the salary is not on file." });
    const sigma = (Math.log(p.market.high) - Math.log(p.market.low)) / (2 * 1.2816);
    const atOrBelow = p.contractLakh && marketOk(p) && sigma > 0 ? r2(phi((Math.log(p.contractLakh) - Math.log(p.market.lakh)) / sigma)) : null;
    scenarios.push({ kind: "release_buyback", label: "Release and buy back", available: Boolean(p.contractLakh) && mkt.status !== "unavailable", rarChange: 0,
      purseChangeLakh: p.contractLakh && mkt.status === "model_prediction" ? r1(p.contractLakh - p.market.lakh) : null,
      probability: atOrBelow === null ? null : { value: atOrBelow, meaning: "Chance the auction price falls at or below the current contract, from the price model's 80% interval. Not a chance of winning the bid." },
      detail: !p.contractLakh ? "Salary not on file." : mkt.status !== "model_prediction" ? `Price model cannot be relied on here: ${mkt.statusReason}` : `Expected price ${cr(p.market.lakh)}; buying back at that price would ${p.market.lakh < p.contractLakh ? "free" : "cost"} ${cr(Math.abs(p.contractLakh - p.market.lakh))}. Other franchises can bid.` });
    scenarios.push({ kind: "release_replace", label: "Release and replace", available: Boolean(repl), rarChange: repl && v ? r2(proj(repl)!.rar - v.rar) : null,
      purseChangeLakh: repl && p.contractLakh ? r1(p.contractLakh - repl.market.lakh) : null,
      detail: repl ? `Best unsigned ${roleOf.get(p.id)}: ${repl.name}, ${sign(proj(repl)!.rar)} per match, expected ${cr(repl.market.lakh)}.` : "No rated unsigned player in this role." });
    for (const m of moves.filter((x) => x.canonicalId === p.id && !SQUAD_CHANGING.has(x.status))) {
      const entry = readLedger().entries.find((e) => e.id === m.entryId)!;
      const incoming = moves.filter((x) => x.entryId === m.entryId && x.to === team && x.canonicalId);
      const inPlayers = incoming.map((x) => s.players.find((q) => q.id === x.canonicalId)).filter((q): q is SnapshotPlayer => Boolean(q));
      const rarIn = inPlayers.reduce((a, q) => a + (proj(q)?.rar ?? 0), 0);
      const payIn = inPlayers.reduce((a, q) => a + (q.contractLakh ?? 0), 0);
      scenarios.push({ kind: "trade", label: `Trade to ${m.to} (${entry.status})`, available: entry.status !== "Denied" && entry.status !== "Superseded", status: entry.status,
        rarChange: v ? r2(rarIn - v.rar) : null, purseChangeLakh: p.contractLakh ? r1(p.contractLakh - payIn) : null,
        sources: entry.sources.map((x) => ({ publisher: x.publisher, url: x.url, official: x.official })),
        detail: `Hypothetical. ${entry.status} as of ${entry.lastChecked}: ${p.name} to ${m.to}${inPlayers.length ? ` for ${inPlayers.map((q) => q.name).join(" and ")}` : ""}. Nothing changes until the trade is completed.` });
    }

    const ratio = (m: Metric) => m.fraction ?? 0;
    const scored = metrics.filter((m) => m.fraction !== null);
    const top = [...scored].sort((a, b) => ratio(b) * b.max - ratio(a) * a.max)[0];
    const low = [...scored].sort((a, b) => ratio(a) - ratio(b))[0];
    const old = v1.get(p.id);
    const tradedIn = applied.has(p.id);
    return {
      id: p.id, name: p.name, warehouseId: p.warehouseId, team, role: p.role, granularRole: roleOf.get(p.id)!, overseas: p.overseas, contractLakh: effectiveSalaryLakh, predictedLakh: p.market.lakh,
      strategy: plan && range ? {baseIndex, policyCategory: (normPlanCat || plan.category) as Category, rationale: plan.reason, scoreRange: range, basis: fTeamStrategy?.basis || "Franchise 2027 Master Retention Intelligence"} : null,
      strengths: plan?.strengths ?? null,
      weaknesses: plan?.weaknesses ?? null,
      inPlayingXI: Boolean(plan?.inPlayingXI),
      impactSub: Boolean(plan?.impactSub),
      index, coverage, category, confidence, cappedFrom: capped ? raw : null,
      recommendation: RETAIN.has(category) ? "retain" : RELEASE.has(category) ? "release" : "undecided",
      metrics, reason: plan ? plan.reason : top ? `${top.label}: ${top.evidence}` : "Too little evidence to make a case.", against: low && ratio(low) < 0.35 ? `${low.label}: ${low.evidence}` : null,
      fitIncrement: fit ? fit.increment : null, projection: v, seasons: p.retentionV2?.seasons ?? [],
      horizon: { age, oneYear: h1, threeYear: h3, megaNote: "The three-year view assumes a mega auction for 2028, which has not been confirmed." },
      scenarios, sensitivity: { tierStability: r2(byWeights.filter((b) => b.category === category).length / byWeights.length), range: [Math.min(...all), Math.max(...all)], byWeights },
      previous: old ? { version: "rri-1.0", index: old.index, category: old.category } : null, acquisition: p.acquisition, tradedIn,
      limitations: [
        ...metrics.filter((m) => m.fraction === null).map((m) => `${m.label}: ${m.evidence}`),
        ...(capped ? [`The rating reaches ${raw}, but the evidence is thin, so the tier is held at Strong Retain.`] : []),
        ...(p.acquisition === "unrecorded" ? ["Played for this franchise in the latest season, but no contract is on file, so salary is unknown."] : []),
        "Availability and injury status are not verified.",
        "Released players are not in the unsigned pool until the deadline, so replacement supply is understated.",
        ...(pending.has(p.id) && !tradedIn ? ["A completed trade involving this player is recorded but not yet in this snapshot."] : []),
        ...(plan ? ["Strategy CRR uses a declared policy band and measured evidence within that band. It is not an independent prediction or a retention probability."] : []),
        "Weights and tier bands are provisional. No franchise decisions exist yet to calibrate them.",
      ],
    };
  }).sort((a, b) => b.index - a.index);
}

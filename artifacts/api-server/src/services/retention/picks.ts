// CRICFIELD Picks V1 — the Retention Recommendation Index. Superseded by crr.ts and kept
// only so V2 can report how each player's category changed.
//
// A 100-point editorial recommendation of whom a franchise should keep. The weights
// are editorial and have not been validated against outcomes. It is not a chance of
// being retained and must never be converted into one.
//
// Scores are ranks and shares, so money and sporting output are compared as positions
// and never subtracted from one another. A component with no evidence earns nothing:
// the total is the sum of what could be measured, and coverage says how much that was.

import type { Snapshot, SnapshotPlayer } from "../intelligence/service";
import type { SeasonRules } from "./rules";

export const RRI_VERSION = "rri-1.0";
export const WEIGHTS = { performance: 25, fit: 20, economics: 15, future: 10, scarcity: 10, consistency: 10, ruleEfficiency: 5, continuity: 5 } as const;
export type MetricKey = keyof typeof WEIGHTS;
const LABELS: Record<MetricKey, string> = {
  performance: "Performance impact", fit: "Franchise fit", economics: "Auction economics", future: "Future potential",
  scarcity: "Role scarcity", consistency: "Consistency and reliability", ruleEfficiency: "Retention-rule efficiency", continuity: "Franchise continuity",
};

export type Category = "Priority Retain" | "Strong Retain" | "Retention Dilemma" | "Consider Release" | "Release Candidate" | "Insufficient Evidence";
export const CATEGORY_BANDS: { min: number; category: Category }[] = [
  { min: 62, category: "Priority Retain" }, { min: 50, category: "Strong Retain" }, { min: 38, category: "Retention Dilemma" }, { min: 26, category: "Consider Release" }, { min: 0, category: "Release Candidate" },
];
export const MIN_COVERAGE = 50;

export interface Metric { key: MetricKey; label: string; max: number; score: number | null; measured: number; evidence: string }
export interface Pick {
  id: string; name: string; warehouseId: number | null; team: string; role: string; overseas: boolean | null; contractLakh: number | null; predictedLakh: number;
  index: number; coverage: number; category: Category; recommendation: "retain" | "release" | "undecided";
  metrics: Metric[]; reason: string; against: string | null; fitIncrement: number | null; limitations: string[];
}

const rank = (v: number, all: number[]) => all.length ? all.filter((x) => x < v).length / Math.max(1, all.length - 1) : 0;
const cr = (lakh: number) => `₹${(lakh / 100).toFixed(2)} Cr`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const ordinal = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; };

/** Editorial age curve for T20 output, used only where a birth date is on file. */
function ageFactor(age: number) { return age <= 25 ? 1 : age <= 28 ? 0.85 : age <= 31 ? 0.6 : age <= 34 ? 0.35 : 0.15; }

function birthYear(p: SnapshotPlayer) { const m = /(\d{4})/.exec(p.birthDate ?? ""); return m ? Number(m[1]) : null; }

export function computePicks(s: Snapshot, rules: SeasonRules): Pick[] {
  const squad = s.players.filter((p) => p.team);
  const ownFit = (p: SnapshotPlayer) => p.fit.find((f) => f.team === p.team) ?? null;
  const rated = squad.filter((p) => p.performance.rar !== null && (p.performance.sampleMatches ?? 0) >= 3);
  const moneyRatio = (p: SnapshotPlayer) => Math.log(p.market.lakh / p.contractLakh!);
  const priced = squad.filter((p) => p.contractLakh && (p.performance.matchesCareer ?? 0) > 0);
  const trends = rated.filter((p) => p.performance.rarPrev !== null).map((p) => p.performance.rar! - p.performance.rarPrev!);
  const sds = rated.map((p) => p.performance.rarSd ?? 0);
  const fits = squad.filter((p) => p.candidate.evidence && ownFit(p)).map((p) => ownFit(p)!.increment);
  const teamPay = new Map<string, number>();
  for (const p of squad) teamPay.set(p.team!, (teamPay.get(p.team!) ?? 0) + (p.contractLakh ?? 0));
  const overseasOn = (team: string) => squad.filter((p) => p.team === team && p.overseas).length;

  return squad.map((p) => {
    const f = p.performance;
    const sel = p.selection;
    const hasRating = f.rar !== null && (f.sampleMatches ?? 0) >= 3;
    const peers = rated.filter((q) => q.role === p.role).map((q) => q.performance.rar!);
    const metric = (key: MetricKey, fraction: number | null, measuredShare: number, evidence: string): Metric => ({
      key, label: LABELS[key], max: WEIGHTS[key], measured: fraction === null ? 0 : r1(WEIGHTS[key] * measuredShare),
      score: fraction === null ? null : r1(WEIGHTS[key] * clamp01(fraction) * measuredShare), evidence,
    });
    const metrics: Metric[] = [];

    const perfRank = hasRating ? rank(f.rar!, peers) : null;
    metrics.push(metric("performance", perfRank, 1, perfRank === null ? "No reliable performance rating yet." : `${ordinal(Math.round(perfRank * 100))} percentile of ${p.role}s, at ${f.rar! >= 0 ? "+" : ""}${f.rar!.toFixed(1)} runs above replacement per match`));

    const fit = ownFit(p);
    const fitRank = fit && p.candidate.evidence ? rank(fit.increment, fits) : null;
    metrics.push(metric("fit", fitRank, 1, fitRank === null ? "No record to measure against this squad." : fit!.entersBestSide ? `${fit!.increment >= 0 ? "+" : ""}${fit!.increment.toFixed(1)} runs per match to the ${p.team} best XII compared with losing this player` : `Outside the ${p.team} best XII`));

    const canPrice = Boolean(p.contractLakh) && (f.matchesCareer ?? 0) > 0;
    const moneyRank = canPrice ? rank(moneyRatio(p), priced.map(moneyRatio)) : null;
    metrics.push(metric("economics", moneyRank, 1, !p.contractLakh ? "Current salary is not on file." : !canPrice ? "No IPL record behind the market estimate." : `${cr(p.contractLakh!)} contract against ${cr(p.market.lakh)} expected at auction`));

    const age = birthYear(p) ? s.targetSeason - birthYear(p)! : null;
    const trendValue = hasRating && f.rarPrev !== null ? f.rar! - f.rarPrev : null;
    const trendRank = trendValue === null ? null : rank(trendValue, trends);
    const futureParts = [trendRank, age === null ? null : ageFactor(age)].filter((x): x is number => x !== null);
    metrics.push(metric("future", futureParts.length ? futureParts.reduce((a, b) => a + b, 0) / futureParts.length : null, futureParts.length / 2,
      [trendValue === null ? null : `rating moved ${trendValue >= 0 ? "+" : ""}${trendValue.toFixed(1)} on last season`, age === null ? "age not verified" : `age ${age} in ${s.targetSeason}`].filter(Boolean).join("; ") || "No trend or age on file."));

    const group = rated.filter((q) => q.role === p.role && q.overseas === p.overseas);
    const better = hasRating ? group.filter((q) => q.performance.rar! > f.rar!).length : null;
    const supply = s.scarcity[p.role];
    const scarcity = better === null || !supply ? null : 0.7 * (1 - better / Math.max(1, group.length)) + 0.3 * (1 - supply.strong / Math.max(1, supply.players));
    metrics.push(metric("scarcity", scarcity, 1, scarcity === null ? "No comparable rating." : `${better} of ${group.length} comparable ${p.overseas ? "overseas" : "Indian"} ${p.role}s rate higher`));

    const share = sel?.teamMatches ? sel.matchesForTeam / sel.teamMatches : null;
    const sdRank = hasRating ? 1 - rank(f.rarSd ?? 0, sds) : null;
    const spread = sel && sel.seasonRate.length >= 2 ? Math.sqrt(sel.seasonRate.reduce((a, x, _i, all) => a + (x - all.reduce((m, y) => m + y, 0) / all.length) ** 2, 0) / sel.seasonRate.length) : null;
    const steady = spread === null ? null : clamp01(1 - spread / 10);
    const relParts: [number | null, number][] = [[share, 0.45], [sdRank, 0.25], [steady, 0.2]];
    const relMeasured = relParts.reduce((a, [v, w]) => a + (v === null ? 0 : w), 0);
    const relValue = relMeasured ? relParts.reduce((a, [v, w]) => a + (v ?? 0) * w, 0) / relMeasured : null;
    // The remaining tenth is verified availability, which no source on file provides.
    metrics.push(metric("consistency", relValue, relMeasured, share === null ? "No selection record." : `played ${sel!.matchesForTeam} of ${sel!.teamMatches} ${p.team} matches in ${s.ratedThrough}`));

    const payShare = p.contractLakh ? p.contractLakh / Math.max(1, teamPay.get(p.team!) ?? 1) : null;
    const overseasPenalty = p.overseas && overseasOn(p.team!) > rules.maxOverseas ? 0.6 : 1;
    metrics.push(metric("ruleEfficiency", payShare === null ? null : (1 - Math.min(1, payShare * 5)) * overseasPenalty, 1, payShare === null ? "Current salary is not on file." : `${Math.round(payShare * 100)}% of recorded ${p.team} contracts${p.overseas ? `, and one of ${rules.maxOverseas} overseas places` : ""}`));

    const tenure = sel ? Math.min(1, sel.seasonsWithTeam / 5) : null;
    metrics.push(metric("continuity", tenure === null ? null : 0.5 * tenure + 0.3 * (share ?? 0) + 0.2 * (sel!.captain ? 1 : 0), 1, tenure === null ? "No franchise history." : `${sel!.seasonsWithTeam} season${sel!.seasonsWithTeam === 1 ? "" : "s"} on the ${p.team} squad list${sel!.captain ? ", and led the side in 2026" : ""}`));

    const index = r1(metrics.reduce((a, m) => a + (m.score ?? 0), 0));
    const coverage = Math.round(metrics.reduce((a, m) => a + m.measured, 0));
    const category: Category = coverage < MIN_COVERAGE ? "Insufficient Evidence" : CATEGORY_BANDS.find((b) => index >= b.min)!.category;
    const ratio = (m: Metric) => (m.score ?? 0) / Math.max(0.1, m.measured);
    const measured = metrics.filter((m) => m.score !== null);
    const sorted = [...measured].sort((a, b) => ratio(b) * b.max - ratio(a) * a.max);
    const low = [...measured].sort((a, b) => ratio(a) - ratio(b))[0];
    const limitations = [
      ...metrics.filter((m) => m.score === null).map((m) => `${m.label}: ${m.evidence}`),
      age === null ? "Age is not verified." : null,
      "Availability and injury status are not verified.",
      "Weights are editorial and have not been validated against franchise decisions.",
    ].filter((x): x is string => x !== null);
    return {
      id: p.id, name: p.name, warehouseId: p.warehouseId, team: p.team!, role: p.role, overseas: p.overseas, contractLakh: p.contractLakh, predictedLakh: p.market.lakh,
      index, coverage, category,
      recommendation: (category === "Priority Retain" || category === "Strong Retain" ? "retain" : category === "Consider Release" || category === "Release Candidate" ? "release" : "undecided") as Pick["recommendation"],
      metrics, reason: sorted[0] ? `${sorted[0].label}: ${sorted[0].evidence}` : "Too little evidence to make a case.",
      against: low && ratio(low) < 0.45 ? `${low.label}: ${low.evidence}` : null, fitIncrement: fit && p.candidate.evidence ? fit.increment : null, limitations,
    };
  }).sort((a, b) => b.index - a.index);
}

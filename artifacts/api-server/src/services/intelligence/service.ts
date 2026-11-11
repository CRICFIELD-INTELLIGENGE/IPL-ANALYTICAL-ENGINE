// CricField Player Intelligence — the single source of truth for player values.
//
// Serving only reads a published snapshot. It never trains, never computes a price
// and holds no alternative formula, so Auction Intelligence, Scout Lab, Squad
// Builder, player profiles and the AI Analyst cannot disagree: they all call this.
// Old snapshots stay on disk, and `version` re-reads one, so a figure quoted in a
// report can be reproduced after a retrain.

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../decision/db";
import { getRegistry, identityCoverage, lookupPlayer, normName } from "./identity";
import type { DisplayStatus, Envelope, Factor, Lookup, PlayerIdentity, ScenarioMove, Team } from "./schema";
import { TEAMS } from "./schema";
import { pickFor } from "../retention/service";
import { bestSide, SQUAD_RULES, type SquadCandidate, type StrengthResult } from "./squad-optimizer";

export interface SnapshotPlayer {
  id: string;
  name: string;
  warehouseId: number | null;
  role: string;
  listedRole: string | null;
  overseas: boolean | null;
  team: string | null;
  contractLakh: number | null;
  acquisition: string | null;
  performance: Record<string, number | null>;
  birthDate: string | null;
  selection: { matchesForTeam: number; teamMatches: number | null; seasonsWithTeam: number; captain: boolean; seasonRate: number[] } | null;
  candidate: SquadCandidate;
  market: { lakh: number; low: number; high: number; factors: { label: string; percent: number }[] };
  soldLikelihood: number | null;
  retention: { probability: number; factors: { key: string; direction: "up" | "down" }[] } | null;
  fit: FitRow[];
  valueGap: { performancePct: number; pricePct: number; gap: number } | null;
  comparables: { id: string; name: string; similarity: number; rar: number | null; predictedLakh: number; betterValue: boolean }[];
  history: { season: number; team: string; paidLakh: number; predictedLakh: number }[];
  /** Retention V2 inputs; absent in snapshots published before it. */
  retentionV2?: {
    battingHand: "L" | "R" | null; bowlingSubtype: string | null;
    projection: { rar: number; sd: number; bat: number; bowl: number; seasonsUsed: number[] } | null;
    seasons: { season: number; matches: number; batBalls: number; bowlBalls: number; batPerMatch: number; bowlPerMatch: number; batPhase: number[]; bowlPhase: number[]; phaseBallsFaced: number[]; phaseBallsBowled: number[] }[];
  };
}
export interface FitRow { team: string; before: number; after: number; increment: number; entersBestSide: boolean; replaces: string[]; squadFull: boolean; overseasBlocked: boolean; gapsClosed: string[]; infeasibleBefore: boolean }
export interface TeamReport {
  team: string; squadSize: number; overseasInSquad: number; contractLakh: number; strength: number; feasible: boolean;
  composition: StrengthResult["composition"]; gaps: string[];
  xii: { id: string; name: string; rar: number | null; overseas: boolean; keeper: boolean; evidence: boolean }[];
  bench: { id: string; name: string; rar: number | null; overseas: boolean; keeper: boolean; evidence: boolean }[];
}
export interface Snapshot {
  version: string;
  generatedAt: string;
  dataCutoff: string;
  ratedThrough: number;
  targetSeason: number;
  governance: { identity: ReturnType<typeof identityCoverage>; validation: Validation; shrinkage: unknown };
  scarcity: Record<string, { players: number; aboveReplacement: number; strong: number; medianPredictedLakh: number | null }>;
  teams: Record<string, TeamReport>;
  players: SnapshotPlayer[];
  salesHistory: Record<string, SnapshotPlayer["history"]>;
  retentionBacktest: { season: number; team: string; canonicalId: string; retained: number; probability: number }[];
  transactionsApplied?: { entryId: string; canonicalId: string | null; player: string; from: string; to: string; feeLakh: number | null }[];
  retentionModel?: {
    performance: { chosen: string; chosenLabel: string; rule: string; rows: { key: string; label: string; selection: { n: number; rankCorrelation: number }; holdout: { n: number; rankCorrelation: number } }[] };
    aging: Record<"bat" | "bowl", { band: string; change: number; n: number }[]> & { shrink: number; note: string };
    decisionBacktest: { n: number; seasons: number[]; methods: { key: string; label: string; auc: number | null }[]; forecastModelAuc: number | null; note: string };
    ratedThrough: number;
  };
}
export interface RetentionScore { n: number; accuracy: number; precision: number; recall: number; brier: number; keptShare: number }
interface Validation {
  impact: { rankCorrelationWithNextSeason: number | null; previousModelRankCorrelation: number; intervalCoverage: { nominal: number; measured: number | null; n: number }; label: string; n: number };
  auction: { chosenModel: string; holdout: Record<string, unknown> & { maeCr: number; medianAeCr: number; typicalMultiple: number; seasons: number[] }; benchmarks: Record<string, { maeCr: number }>; intervalCoverage: { nominal: number; measured: number }; byRole: unknown[]; byBand: unknown[]; bySeason: unknown[]; trainingRange: { rarP95: number }; withBasePrice: unknown; trainedOn: unknown };
  retention: { classification: { threshold: number; holdout: RetentionScore; allFolds: RetentionScore }; bySeason: (RetentionScore & { season: number })[]; byFranchise: (RetentionScore & { team: string })[]; scope: string; chosenModel: string; holdout: { brier: number; baseRateBrier: number; ece: number; logLoss: number; calibration: unknown[]; seasons: number[] }; probabilityGate: { passed: boolean; rule: string }; trainedOn: unknown; allFolds: unknown };
  sold: { rows: number; note: string; sameAuctionCv: unknown };
  squadStrength: { seasonSimulationGate: { passed: boolean; rule: string }; testBrier: number; coinFlipBrier: number; teamSeasonRankCorrelationWithWins: number; brierSkill95: (number | null)[]; teamSeasons: number };
}

const dir = () => process.env.INTELLIGENCE_DIR ?? path.join(getProjectRoot(), "artifacts", "api-server", "data", "intelligence");

let current: { version: string; snapshot: Snapshot; byId: Map<string, SnapshotPlayer>; checkedAt: number } | null = null;
const archived = new Map<string, Snapshot>();
const CHECK_MS = 30_000;

function readPointer(): string | null {
  const fp = path.join(dir(), "current.json");
  if (!fs.existsSync(fp)) return null;
  return (JSON.parse(fs.readFileSync(fp, "utf8")) as { version: string }).version;
}
const safeVersion = (v: string) => /^cf-intel-[0-9a-z.]+$/.test(v);
function readSnapshot(version: string): Snapshot | null {
  if (!safeVersion(version)) return null;
  const fp = path.join(dir(), version, "snapshot.json");
  return fs.existsSync(fp) ? (JSON.parse(fs.readFileSync(fp, "utf8")) as Snapshot) : null;
}

/** Current snapshot. A new publication is picked up within CHECK_MS, which invalidates everything derived from the old one. */
export function getSnapshot(): Snapshot | null {
  const now = Date.now();
  if (current && now - current.checkedAt < CHECK_MS) return current.snapshot;
  const version = readPointer();
  if (!version) return (current = null);
  if (current?.version === version) { current.checkedAt = now; return current.snapshot; }
  const snapshot = readSnapshot(version);
  if (!snapshot) return (current = null);
  current = { version, snapshot, byId: new Map(snapshot.players.map((p) => [p.id, p])), checkedAt: now };
  return snapshot;
}

export function getSnapshotVersion(version: string): Snapshot | null {
  if (current?.version === version) return current.snapshot;
  if (archived.has(version)) return archived.get(version)!;
  const s = readSnapshot(version);
  if (s) archived.set(version, s);
  return s;
}

/** Forget the loaded snapshot; used by tests and after a publish in the same process. */
export function invalidateSnapshot(): void { current = null; archived.clear(); }

const snapshotPlayer = (id: string) => { getSnapshot(); return current?.byId.get(id) ?? null; };
export const getSnapshotPlayer = snapshotPlayer;
export const playerByWarehouseId = (id: number) => {
  const canon = getRegistry().byWarehouse.get(id);
  return canon ? snapshotPlayer(canon) : null;
};

/* ─── Envelopes ──────────────────────────────────────────────────────────── */

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

function base(s: Snapshot, p: SnapshotPlayer | null, id: string): Pick<Envelope, "canonicalId" | "targetSeason" | "modelVersion" | "predictionTimestamp" | "dataCutoff"> {
  return { canonicalId: p?.id ?? id, targetSeason: s.targetSeason, modelVersion: s.version, predictionTimestamp: s.generatedAt, dataCutoff: s.dataCutoff };
}

const unavailable = (s: Snapshot, id: string, units: string, reason: string): Envelope => ({
  ...base(s, null, id), value: null, units, uncertainty: null, sampleSize: null, inputs: { available: [], missing: [] }, status: "unavailable", statusReason: reason, factors: [],
});

export function performanceEnvelope(s: Snapshot, p: SnapshotPlayer): Envelope {
  const f = p.performance;
  const units = "runs above replacement per match";
  if (f.rar === null) return unavailable(s, p.id, units, "No IPL balls on record.");
  const n = f.sampleMatches ?? 0;
  const status: DisplayStatus = n >= 10 ? "model_prediction" : "limited_evidence";
  const sd = f.rarSd ?? 0;
  const factors: Factor[] = [
    { label: "Batting", detail: `${round(f.rarBat ?? 0, 1)} runs per match above a ${p.role} replacement` },
    { label: "Bowling", detail: `${round(f.rarBowl ?? 0, 1)} runs per match above a ${p.role} replacement` },
  ];
  return {
    ...base(s, p, p.id), value: round(f.rar), units,
    uncertainty: { low: round(f.rar - 1.2816 * sd), high: round(f.rar + 1.2816 * sd), level: 0.8 },
    sampleSize: { value: round(n, 1), unit: "recency-weighted matches" },
    inputs: { available: ["ball-by-ball record", "phase splits", "opposition and venue context"], missing: ["fielding runs saved"] },
    status, statusReason: status === "limited_evidence" ? "Fewer than 10 recency-weighted matches." : null, factors,
  };
}

export function marketEnvelope(s: Snapshot, p: SnapshotPlayer): Envelope {
  const v = s.governance.validation.auction;
  const f = p.performance;
  const n = f.sampleMatches ?? 0;
  const noRecord = (f.matchesCareer ?? 0) === 0;
  const outOfRange = (f.rar ?? 0) > v.trainingRange.rarP95;
  let status: DisplayStatus = "model_prediction", reason: string | null = null;
  if (noRecord) { status = "limited_evidence"; reason = "No IPL record: this rests on role, nationality and market level only."; }
  else if (n < 5) { status = "limited_evidence"; reason = "Fewer than 5 recency-weighted matches."; }
  else if (outOfRange) { status = "provisional_estimate"; reason = "Rated above nearly every player ever sold: players this good are usually retained, so few sales show what one would fetch."; }
  return {
    ...base(s, p, p.id), value: p.market.lakh, units: "₹ lakh expected auction price if sold",
    uncertainty: { low: p.market.low, high: p.market.high, level: 0.8 },
    sampleSize: { value: f.matchesCareer ?? 0, unit: "career IPL matches" },
    inputs: {
      available: ["performance rating", "role", "experience", ...(p.overseas !== null ? ["overseas status"] : []), ...(p.contractLakh ? ["previous price"] : [])],
      missing: ["2027 base price", "2027 auction pool", "franchise purses", ...(p.history.length ? [] : ["auction history"])],
    },
    status, statusReason: reason, factors: p.market.factors.map((x) => ({ label: x.label, detail: `${x.percent >= 0 ? "+" : "−"}${Math.abs(x.percent)}% against a typical lot` })),
  };
}

const RETENTION_FACTORS: Record<string, string> = {
  rar: "Performance rating", rarSd: "Certainty of the rating", rarPrev: "Previous rating", sampleMatches: "Recent match record", matchesCareer: "IPL experience",
  matchesForTeam: "Matches played for the franchise", teamMatchShare: "Share of the franchise's matches", seasonsWithTeam: "Seasons at the franchise", contractLakh: "Contract size",
  contractMissing: "No contract on file", lakhPerRarRank: "Pay rank against output rank", rarRankInSquad: "Output rank in the squad", contractRankInSquad: "Pay rank in the squad",
  overseas: "Overseas status", isBatter: "Role", isBowler: "Role", isAllRounder: "Role", isKeeper: "Role", age: "Age", mega: "Auction type",
  franchiseKeepRate: "Franchise's record of keeping players", boughtLastAuction: "Bought at the last auction",
};

let deskReader: (() => { retentions: { team: string; player: string; decision: string; sourceUrl: string; recordedAt?: string }[]; teams: { team: string; remainingLakhs: number | null }[] }) | null = null;
/** The IPL 2027 desk log supplies verified decisions and purses; wired by the route layer to avoid a dependency on it here. */
export function setDeskReader(fn: typeof deskReader) { deskReader = fn; }
export const readDesk = () => deskReader?.() ?? null;

function verifiedDecision(p: SnapshotPlayer) {
  const desk = deskReader?.();
  if (!desk || !p.team) return null;
  const names = new Set([p.name, ...(getRegistry().byCanonical.get(p.id)?.aliases ?? [])].map(normName));
  return desk.retentions.find((r) => r.team === p.team && names.has(normName(r.player))) ?? null;
}

const retentionPercentile = (s: Snapshot, prob: number) => {
  const all = s.players.map((x) => x.retention?.probability).filter((x): x is number => x !== undefined && x !== null);
  return Math.round((all.filter((x) => x <= prob).length / Math.max(1, all.length)) * 100);
};

export function retentionEnvelope(s: Snapshot, p: SnapshotPlayer): Envelope & { band: string | null; kind: "probability" | "index" | "decision" | "none" } {
  const none = (reason: string) => ({ ...unavailable(s, p.id, "not available", reason), band: null, kind: "none" as const });
  const d = verifiedDecision(p);
  if (d) {
    return {
      ...base(s, p, p.id), value: null, units: "official decision", uncertainty: null, sampleSize: null, inputs: { available: ["IPL 2027 desk record"], missing: [] },
      status: "verified_data", statusReason: `Source: ${d.sourceUrl}`, factors: [], band: d.decision === "retained" ? "Retained" : "Released", kind: "decision",
    };
  }
  if (!p.team || !p.retention) return none("Not on a 2026 squad, so there is no franchise decision to assess.");
  const v = s.governance.validation.retention;
  const passed = v.probabilityGate.passed;
  const index = retentionPercentile(s, p.retention.probability);
  const band = index >= 66 ? "Likely kept" : index >= 33 ? "Uncertain" : "Release risk";
  return {
    ...base(s, p, p.id),
    value: passed ? p.retention.probability : index,
    units: passed ? "probability the franchise keeps this player for 2027" : "provisional retention index, 0–100 rank across 2026 squads, not a probability",
    uncertainty: null, sampleSize: null,
    inputs: { available: ["performance rating", "contract", "matches for the franchise", "squad rank", "franchise history"], missing: ["injury and availability", "retention rules for 2027", "player's own intentions"] },
    status: passed ? "model_prediction" : "provisional_estimate",
    statusReason: passed ? null : `The model failed its calibration gate on the ${v.holdout.seasons.join(", ")} holdout (calibration error ${v.holdout.ece} against a 0.08 limit), so it is shown as a ranking and not a percentage.`,
    factors: p.retention.factors.map((x) => ({ label: RETENTION_FACTORS[x.key] ?? x.key, detail: x.direction === "up" ? "raises the score" : "lowers the score" })),
    band, kind: passed ? "probability" : "index",
  };
}

export function soldEnvelope(s: Snapshot, p: SnapshotPlayer): Envelope {
  if (p.soldLikelihood === null) return unavailable(s, p.id, "likelihood", "No score for this player.");
  return {
    ...base(s, p, p.id), value: p.soldLikelihood, units: "provisional likelihood of selling if listed", uncertainty: null,
    sampleSize: { value: s.governance.validation.sold.rows, unit: "listed players, 2026 auction only" }, inputs: { available: ["performance rating", "experience", "role"], missing: ["earlier unsold lists"] },
    status: "provisional_estimate", statusReason: s.governance.validation.sold.note, factors: [],
  };
}

export function valueAssessment(p: SnapshotPlayer) {
  if (!p.valueGap) return { verdict: "Not assessed", gap: null, performancePct: null, pricePct: null, note: "Needs at least 5 recency-weighted matches." };
  const g = p.valueGap.gap;
  return {
    verdict: g >= 20 ? "Undervalued" : g <= -20 ? "Overvalued" : "Fairly priced", ...p.valueGap,
    note: `Performance ranks at the ${p.valueGap.performancePct}th percentile of ${p.role}s, expected price at the ${p.valueGap.pricePct}th. The two are compared as ranks: no rupee value of a run is assumed.`,
  };
}

const FIT_CAVEAT = "Change in the best XII, in runs per match. Squad strength has not been shown to predict match results, so this measures fit, not wins.";

export function fitEnvelope(s: Snapshot, p: SnapshotPlayer) {
  const best = p.fit[0];
  const scarcity = s.scarcity[p.role] ?? null;
  return {
    ...base(s, p, p.id), value: best?.increment ?? null, units: "runs per match added to a franchise's best XII",
    uncertainty: null, sampleSize: null, inputs: { available: ["2026 squads", "overseas limits", "bowling phase coverage", "batting slots"], missing: ["2027 retentions", "2027 purses", "injury and availability"] },
    status: "provisional_estimate" as DisplayStatus, statusReason: FIT_CAVEAT, factors: [] as Factor[],
    teams: p.fit.map((f) => ({ ...f, isCurrentTeam: f.team === p.team })), scarcity,
    predictedPriceLakh: p.market.lakh,
  };
}

/* ─── Player reads ───────────────────────────────────────────────────────── */

export interface PlayerResolution { lookup: Lookup; player: SnapshotPlayer | null }

export function resolve(key: string | number): PlayerResolution {
  const lookup = lookupPlayer(key);
  return { lookup, player: lookup.player ? snapshotPlayer(lookup.player.canonicalId) : null };
}

function dataStatus(identity: PlayerIdentity) {
  return {
    identity: identity.identityStatus,
    evidence: identity.matches >= 10 ? "sufficient" : identity.matches > 0 ? "limited" : "none",
    auctionHistory: (getSnapshot()?.salesHistory[identity.canonicalId]?.length ?? 0) > 0 ? "on_file" : "missing",
    squad: identity.teamsBySeason.length ? "on_file" : "missing",
  };
}

export function playerIntelligence(key: string | number) {
  const s = getSnapshot();
  if (!s) return { error: "no_snapshot" as const };
  const { lookup, player: p } = resolve(key);
  if (lookup.status === "ambiguous") return { error: "ambiguous" as const, candidates: lookup.candidates };
  if (lookup.status === "not_found" || !lookup.player) return { error: "not_found" as const };
  const identity = lookup.player;
  const status = dataStatus(identity);
  if (!p) {
    const id = identity.canonicalId;
    return {
      identity, dataStatus: status, modelVersion: s.version, dataCutoff: s.dataCutoff, targetSeason: s.targetSeason, inCurrentPool: false,
      reason: "Not active in 2025 or 2026, so no current valuation is published.",
      performance: unavailable(s, id, "runs above replacement per match", "Outside the current player pool."),
      market: unavailable(s, id, "₹ lakh", "Outside the current player pool."),
      retention: { ...unavailable(s, id, "not available", "Outside the current player pool."), band: null, kind: "none" as const },
      soldLikelihood: unavailable(s, id, "likelihood", "Outside the current player pool."),
      history: s.salesHistory[id] ?? [],
    };
  }
  return {
    identity, dataStatus: status, modelVersion: s.version, dataCutoff: s.dataCutoff, targetSeason: s.targetSeason, inCurrentPool: true,
    current: { team: p.team, contractLakh: p.contractLakh, acquisition: p.acquisition, role: p.role, overseas: p.overseas },
    performance: performanceEnvelope(s, p), raw: p.performance, market: marketEnvelope(s, p), soldLikelihood: soldEnvelope(s, p),
    value: valueAssessment(p), franchise: fitEnvelope(s, p), retention: retentionEnvelope(s, p),
    comparables: p.comparables, history: p.history, seasonSimulation: seasonSimulationStatus(s),
  };
}

export interface ListQuery { role?: string; team?: string; q?: string; overseas?: "only" | "exclude"; minMatches?: number; minLakh?: number; maxLakh?: number; verdict?: string; fitTeam?: string; sort?: "impact" | "price" | "value" | "fit"; limit?: number; phase?: "powerplay" | "middle" | "death"; discipline?: "batting" | "bowling" }

/** Compact row: identical fields, from the same snapshot, for every list on the site. */
export function playerRow(s: Snapshot, p: SnapshotPlayer, fitTeam?: string) {
  const value = valueAssessment(p);
  const fit = fitTeam ? p.fit.find((f) => f.team === fitTeam) ?? null : null;
  const r = retentionEnvelope(s, p);
  const m = marketEnvelope(s, p);
  const pick = pickFor(p.id);
  return {
    id: p.id, warehouseId: p.warehouseId, name: p.name, role: p.role, overseas: p.overseas, team: p.team, contractLakh: p.contractLakh,
    rar: p.performance.rar, rarSd: p.performance.rarSd, sampleMatches: p.performance.sampleMatches, matchesCareer: p.performance.matchesCareer,
    priceLakh: p.market.lakh, priceLow: p.market.low, priceHigh: p.market.high, marketStatus: m.status,
    verdict: value.verdict, gap: value.gap, retentionBand: r.band, retentionKind: r.kind,
    retentionIndex: pick?.index ?? null, retentionCategory: pick?.category ?? null,
    bestFit: p.fit[0] ? { team: p.fit[0].team, increment: p.fit[0].increment } : null,
    fit: fit ? { team: fit.team, increment: fit.increment, entersBestSide: fit.entersBestSide, replaces: fit.replaces } : null,
    phases: { ppSR: p.performance.ppSR, midSR: p.performance.midSR, deathSR: p.performance.deathSR, ppEcon: p.performance.ppEcon, midEcon: p.performance.midEcon, deathEcon: p.performance.deathEcon },
  };
}

export function listPlayers(q: ListQuery) {
  const s = getSnapshot();
  if (!s) return null;
  let rows = s.players;
  if (q.role) rows = rows.filter((p) => p.role === q.role);
  if (q.team) rows = rows.filter((p) => p.team === q.team);
  if (q.overseas === "only") rows = rows.filter((p) => p.overseas === true);
  if (q.overseas === "exclude") rows = rows.filter((p) => p.overseas === false);
  if (q.minMatches) rows = rows.filter((p) => (p.performance.matchesCareer ?? 0) >= q.minMatches!);
  if (q.minLakh) rows = rows.filter((p) => p.market.lakh >= q.minLakh!);
  if (q.maxLakh) rows = rows.filter((p) => p.market.lakh <= q.maxLakh!);
  if (q.q) { const n = normName(q.q); rows = rows.filter((p) => normName(p.name).includes(n)); }
  if (q.verdict) rows = rows.filter((p) => valueAssessment(p).verdict === q.verdict);
  if (q.phase) {
    const bat = q.discipline !== "bowling";
    const key = bat ? ({ powerplay: "ppSR", middle: "midSR", death: "deathSR" } as const)[q.phase] : ({ powerplay: "ppEcon", middle: "midEcon", death: "deathEcon" } as const)[q.phase];
    rows = rows.filter((p) => p.performance[key] !== null).sort((a, b) => (bat ? b.performance[key]! - a.performance[key]! : a.performance[key]! - b.performance[key]!));
  } else {
    const sort = q.sort ?? (q.fitTeam ? "fit" : "impact");
    const fitOf = (p: SnapshotPlayer) => p.fit.find((f) => f.team === q.fitTeam)?.increment ?? -99;
    rows = [...rows].sort((a, b) =>
      sort === "price" ? b.market.lakh - a.market.lakh
      : sort === "value" ? (b.valueGap?.gap ?? -999) - (a.valueGap?.gap ?? -999)
      : sort === "fit" ? fitOf(b) - fitOf(a)
      : (b.performance.rar ?? -99) - (a.performance.rar ?? -99));
  }
  return {
    modelVersion: s.version, dataCutoff: s.dataCutoff, targetSeason: s.targetSeason, predictionTimestamp: s.generatedAt, total: rows.length,
    rows: rows.slice(0, q.limit ?? 50).map((p) => playerRow(s, p, q.fitTeam)),
  };
}

/* ─── Squad service ──────────────────────────────────────────────────────── */

export function squadOf(s: Snapshot, team: string): SquadCandidate[] {
  const t = s.teams[team];
  return [...t.xii, ...t.bench].map((x) => snapshotPlayer(x.id)?.candidate).filter((c): c is SquadCandidate => Boolean(c));
}

const seasonSimulationStatus = (s: Snapshot) => {
  const g = s.governance.validation.squadStrength;
  return {
    available: g.seasonSimulationGate.passed,
    reason: g.seasonSimulationGate.passed ? null : `Season simulation is off: pre-season squad strength did not predict results (Brier ${g.testBrier} on 2023–2026 matches against ${g.coinFlipBrier} for a coin flip). No playoff or title odds are shown.`,
  };
};

export function teamReport(team: string) {
  const s = getSnapshot();
  const t = s?.teams[team];
  if (!s || !t) return null;
  const side = bestSide(squadOf(s, team));
  const roster = [...t.xii, ...t.bench].map((x) => snapshotPlayer(x.id)).filter((p): p is SnapshotPlayer => Boolean(p));
  return {
    ...t, overs: side.overs, modelVersion: s.version, dataCutoff: s.dataCutoff, targetSeason: s.targetSeason, simulation: seasonSimulationStatus(s), rules: SQUAD_RULES,
    caveat: FIT_CAVEAT, retentionBoard: roster.map((p) => playerRow(s, p)).sort((a, b) => (b.rar ?? -99) - (a.rar ?? -99)),
    squadAsOf: "Squads as they stood for IPL 2026. 2027 retentions are not yet public.",
    roleGroups: Object.entries(roster.reduce<Record<string, number>>((acc, p) => { acc[p.role] = (acc[p.role] ?? 0) + 1; return acc; }, {})).map(([role, count]) => ({ role, count })),
  };
}

export function leagueTeams() {
  const s = getSnapshot();
  if (!s) return null;
  return { modelVersion: s.version, dataCutoff: s.dataCutoff, targetSeason: s.targetSeason, teams: TEAMS.map((t) => s.teams[t]).filter(Boolean).map(({ xii: _x, bench: _b, ...rest }) => rest), simulation: seasonSimulationStatus(s), caveat: FIT_CAVEAT };
}

type Resolved = { ok: true; player: SnapshotPlayer } | { ok: false; error: string };
function pick(name: string): Resolved {
  const { lookup, player } = resolve(name);
  if (lookup.status === "ambiguous") return { ok: false, error: `"${name}" matches more than one player: ${lookup.candidates.map((c) => c.name).join(", ")}.` };
  if (!lookup.player) return { ok: false, error: `"${name}" is not a known player.` };
  if (!player) return { ok: false, error: `${lookup.player.name} is outside the current player pool.` };
  return { ok: true, player };
}

export interface SideSummary { strength: number; feasible: boolean; composition: StrengthResult["composition"]; gaps: string[]; squadSize: number; overseasInSquad: number; committedLakh: number; xii: { id: string; name: string; rar: number }[] }

const summarise = (squad: SquadCandidate[], committedLakh: number): SideSummary => {
  const b = bestSide(squad);
  return { strength: b.strength, feasible: b.feasible, composition: b.composition, gaps: b.gaps, squadSize: squad.length, overseasInSquad: squad.filter((p) => p.overseas).length, committedLakh, xii: b.xii.map((p) => ({ id: p.id, name: p.name, rar: round(p.rar) })) };
};

export function simulateSquad(team: Team, moves: ScenarioMove[]) {
  const s = getSnapshot();
  if (!s?.teams[team]) return { error: "team_unavailable", messages: [] as string[] };
  let squad = squadOf(s, team);
  let committed = s.teams[team].contractLakh;
  const before = summarise(squad, committed);
  const messages: string[] = [], warnings: string[] = [];
  const steps: { move: ScenarioMove; strength: number; delta: number }[] = [];
  let estimatedSpend = 0;
  const has = (id: string) => squad.some((p) => p.id === id);
  const remove = (p: SnapshotPlayer) => { squad = squad.filter((x) => x.id !== p.id); committed -= p.contractLakh ?? 0; };
  const add = (p: SnapshotPlayer, paying: boolean) => {
    squad = [...squad, p.candidate];
    if (paying) { committed += p.market.lakh; estimatedSpend += p.market.lakh; }
    else committed += p.contractLakh ?? 0;
  };
  let last = before.strength;
  for (const m of moves) {
    const names = m.action === "trade" || m.action === "replace" ? [m.out, m.in] : [m.player];
    const found = names.map(pick);
    const bad = found.find((f) => !f.ok) as { ok: false; error: string } | undefined;
    if (bad) return { error: "bad_move", messages: [bad.error] };
    const a = (found[0] as { player: SnapshotPlayer }).player, b = found[1] ? (found[1] as { player: SnapshotPlayer }).player : null;
    if (m.action === "buy") { if (has(a.id)) { messages.push(`${a.name} is already in the squad.`); continue; } add(a, true); }
    else if (m.action === "release") { if (!has(a.id)) { messages.push(`${a.name} is not in the squad.`); continue; } remove(a); }
    else if (m.action === "retain") { if (!has(a.id)) { messages.push(`${a.name} is not in the squad.`); continue; } }
    else {
      if (!has(a.id)) { messages.push(`${a.name} is not in the squad.`); continue; }
      if (has(b!.id)) { messages.push(`${b!.name} is already in the squad.`); continue; }
      remove(a); add(b!, m.action === "replace");
    }
    const now = bestSide(squad).strength;
    steps.push({ move: m, strength: now, delta: round(now - last) });
    last = now;
  }
  const after = summarise(squad, committed);
  if (after.squadSize > SQUAD_RULES.maxSquad) warnings.push(`${after.squadSize} players is over the ${SQUAD_RULES.maxSquad}-player limit.`);
  if (after.overseasInSquad > SQUAD_RULES.maxOverseasInSquad) warnings.push(`${after.overseasInSquad} overseas players is over the limit of ${SQUAD_RULES.maxOverseasInSquad}.`);
  const redundant = bestSide(squad).bench.filter((p) => p.evidence && p.rar >= 1).map((p) => p.name);
  const desk = deskReader?.().teams.find((t) => t.team === team);
  return {
    team, modelVersion: s.version, targetSeason: s.targetSeason, dataCutoff: s.dataCutoff, before, after, delta: round(after.strength - before.strength), steps, messages, warnings,
    budget: {
      committedBeforeLakh: before.committedLakh, committedAfterLakh: after.committedLakh, estimatedSpendLakh: Math.round(estimatedSpend),
      remainingPurseLakh: desk?.remainingLakhs ?? null,
      note: desk?.remainingLakhs != null ? null : "2027 purses are not verified yet, so remaining budget is unavailable. Spend uses the predicted price.",
    },
    redundancy: redundant, simulation: seasonSimulationStatus(s), caveat: FIT_CAVEAT,
  };
}

export function comparePlayers(a: string, b: string, team?: Team) {
  const s = getSnapshot();
  if (!s) return { error: "no_snapshot", messages: [] as string[] };
  const x = pick(a), y = pick(b);
  if (!x.ok || !y.ok) return { error: "bad_player", messages: [x, y].flatMap((r) => (r.ok ? [] : [r.error])) };
  return { modelVersion: s.version, players: [x.player, y.player].map((p) => ({ ...playerRow(s, p, team), fit: team ? p.fit.find((f) => f.team === team) ?? null : null, comparableNames: p.comparables.slice(0, 3).map((c) => c.name) })) };
}

/** Best pool players for the hole a released player would leave at a franchise. */
export function replacementOptions(key: string, team: Team, limit = 5) {
  const s = getSnapshot();
  const target = pick(key);
  if (!s || !s.teams[team]) return { error: "team_unavailable", messages: [] as string[] };
  if (!target.ok) return { error: "bad_player", messages: [target.error] };
  const squad = squadOf(s, team).filter((p) => p.id !== target.player.id);
  const base2 = bestSide(squad).strength;
  const pool = s.players
    .filter((p) => p.team !== team && p.id !== target.player.id && (p.performance.sampleMatches ?? 0) >= 5 && p.role === target.player.role)
    .sort((a, b) => (b.performance.rar ?? 0) - (a.performance.rar ?? 0)).slice(0, 25);
  const options = pool.map((p) => ({ ...playerRow(s, p), increment: round(bestSide([...squad, p.candidate]).strength - base2) }))
    .sort((a, b) => b.increment - a.increment).slice(0, limit);
  return { player: target.player.name, team, withoutPlayer: base2, withPlayer: bestSide(squadOf(s, team)).strength, options, modelVersion: s.version, caveat: FIT_CAVEAT };
}

export function simulateAuction(team: Team, players: { player: string; bidLakh?: number }[], purseLakh?: number) {
  const s = getSnapshot();
  if (!s?.teams[team]) return { error: "team_unavailable", messages: [] as string[] };
  const desk = deskReader?.().teams.find((t) => t.team === team);
  const startPurse = purseLakh ?? desk?.remainingLakhs ?? null;
  let squad = squadOf(s, team);
  let purse = startPurse;
  const start = bestSide(squad).strength;
  let last = start;
  const lots: { player: string; priceLakh: number; basis: "your bid" | "predicted price"; delta: number; purseAfterLakh: number | null; blocked: string | null }[] = [];
  for (const entry of players) {
    const r = pick(entry.player);
    if (!r.ok) return { error: "bad_player", messages: [r.error] };
    const p = r.player;
    const price = entry.bidLakh ?? Math.round(p.market.lakh);
    const basis = entry.bidLakh ? "your bid" as const : "predicted price" as const;
    let blocked: string | null = null;
    if (squad.some((x) => x.id === p.id)) blocked = "Already in the squad.";
    else if (purse !== null && price > purse) blocked = "Not enough purse left.";
    else if (p.overseas && squad.filter((x) => x.overseas).length >= SQUAD_RULES.maxOverseasInSquad) blocked = `Already at ${SQUAD_RULES.maxOverseasInSquad} overseas players.`;
    if (blocked) { lots.push({ player: p.name, priceLakh: price, basis, delta: 0, purseAfterLakh: purse, blocked }); continue; }
    squad = [...squad, p.candidate];
    if (purse !== null) purse -= price;
    const now = bestSide(squad).strength;
    lots.push({ player: p.name, priceLakh: price, basis, delta: round(now - last), purseAfterLakh: purse, blocked: null });
    last = now;
  }
  return {
    team, modelVersion: s.version, before: start, after: last, delta: round(last - start), lots, startPurseLakh: startPurse, remainingPurseLakh: purse,
    purseNote: startPurse === null ? "No verified 2027 purse: enter one to track the budget." : null, simulation: seasonSimulationStatus(s), caveat: FIT_CAVEAT,
  };
}

/* ─── Site-wide tables ───────────────────────────────────────────────────── */

export function modelStatus(version?: string) {
  const s = version ? getSnapshotVersion(version) : getSnapshot();
  if (!s) return null;
  const v = s.governance.validation;
  return {
    modelVersion: s.version, generatedAt: s.generatedAt, dataCutoff: s.dataCutoff, ratedThrough: s.ratedThrough, targetSeason: s.targetSeason,
    models: {
      performance: { name: "CricField Runs Above Replacement", status: "model_prediction", validation: v.impact },
      auction: { name: "Auction price", method: v.auction.chosenModel, status: "model_prediction", validation: { holdout: v.auction.holdout, benchmarks: v.auction.benchmarks, intervalCoverage: v.auction.intervalCoverage, byRole: v.auction.byRole, byBand: v.auction.byBand, bySeason: v.auction.bySeason, withBasePrice: v.auction.withBasePrice, trainedOn: v.auction.trainedOn } },
      soldLikelihood: { name: "Sold likelihood", status: "provisional_estimate", validation: v.sold },
      retention: { name: "Retention", method: v.retention.chosenModel, status: v.retention.probabilityGate.passed ? "model_prediction" : "provisional_estimate", validation: v.retention },
      franchiseFit: { name: "Franchise fit", status: "provisional_estimate", validation: v.squadStrength },
      seasonSimulation: { name: "Season simulation", status: v.squadStrength.seasonSimulationGate.passed ? "model_prediction" : "unavailable", ...seasonSimulationStatus(s) },
      fairValue: { name: "Rupee value of performance", status: "unavailable", reason: "No validated conversion from runs to rupees exists, so performance and price are shown separately." },
    },
  };
}

export function diagnostics() {
  const s = getSnapshot();
  if (!s) return null;
  const by = (f: (p: SnapshotPlayer) => string) => Object.entries(s.players.reduce<Record<string, number>>((acc, p) => { const k = f(p); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {})).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  const ageDays = (Date.now() - Date.parse(s.generatedAt)) / 86_400_000;
  const status = (e: Envelope) => e.status;
  return {
    modelVersion: s.version, generatedAt: s.generatedAt, dataCutoff: s.dataCutoff, identity: s.governance.identity,
    coverage: {
      players: s.players.length,
      withEvidence: s.players.filter((p) => (p.performance.sampleMatches ?? 0) >= 5).length,
      withAuctionRecord: s.players.filter((p) => p.history.length).length,
      withPrediction: s.players.filter((p) => p.market.lakh > 0).length,
      withoutIplRecord: s.players.filter((p) => (p.performance.matchesCareer ?? 0) === 0).length,
      withContract: s.players.filter((p) => p.contractLakh).length,
      byRole: by((p) => p.role),
      byMarketStatus: by((p) => status(marketEnvelope(s, p))),
      byPerformanceStatus: by((p) => status(performanceEnvelope(s, p))),
      byRetentionStatus: by((p) => retentionEnvelope(s, p).status),
    },
    missingMetrics: ["Fielding runs saved", "Historic unsold lists (2014–2025)", "2027 retentions, purses and auction list", "Injury and availability", "Age for most players"],
    stale: ageDays > 30 ? `Snapshot is ${Math.round(ageDays)} days old.` : null,
  };
}

export function insights(limit = 8) {
  const s = getSnapshot();
  if (!s) return null;
  const evidenced = s.players.filter((p) => p.valueGap && (p.performance.sampleMatches ?? 0) >= 5);
  const row = (p: SnapshotPlayer) => playerRow(s, p);
  const undervalued = [...evidenced].filter((p) => p.valueGap!.gap >= 20).sort((a, b) => b.valueGap!.gap - a.valueGap!.gap).slice(0, limit).map(row);
  const overvalued = [...evidenced].filter((p) => p.valueGap!.gap <= -20).sort((a, b) => a.valueGap!.gap - b.valueGap!.gap).slice(0, limit).map(row);
  const movers = evidenced.filter((p) => p.performance.rarPrev !== null && (p.performance.matchesLast2 ?? 0) >= 10).map((p) => ({ ...row(p), change: round((p.performance.rar ?? 0) - p.performance.rarPrev!) })).sort((a, b) => b.change - a.change);
  const sales = s.players.flatMap((p) => p.history.filter((h) => h.season >= 2024).map((h) => ({ ...h, name: p.name, id: p.id, rar: p.performance.rar })));
  const spending = TEAMS.map((t) => {
    const bought = sales.filter((x) => x.team === t);
    return { team: t, lots: bought.length, paidLakh: bought.reduce((a, x) => a + x.paidLakh, 0), predictedLakh: Math.round(bought.reduce((a, x) => a + x.predictedLakh, 0)) };
  });
  const scatter = evidenced.map((p) => ({ id: p.id, name: p.name, role: p.role, rar: p.performance.rar, priceLakh: p.market.lakh, contractLakh: p.contractLakh, team: p.team }));
  return {
    modelVersion: s.version, dataCutoff: s.dataCutoff, targetSeason: s.targetSeason, generatedAt: s.generatedAt, kind: "model_output" as const,
    disclaimer: "Calculated model output, not reporting. Not an official IPL or franchise valuation.",
    undervalued, overvalued, risers: movers.slice(0, limit), fallers: movers.slice(-limit).reverse(),
    scarcity: s.scarcity, spending, scatter,
    teams: TEAMS.map((t) => s.teams[t]).filter(Boolean).map((t) => ({ team: t.team, strength: t.strength, contractLakh: t.contractLakh, gaps: t.gaps, battingDepth: t.composition.battingDepth, phaseCoverage: t.composition.phaseCoverage })),
  };
}

/** Frozen reference for a report or article. Quoting the version keeps a published figure reproducible after a retrain. */
export function citation(key: string, version?: string) {
  const s = version ? getSnapshotVersion(version) : getSnapshot();
  if (!s) return null;
  const { lookup } = resolve(key);
  if (!lookup.player) return null;
  const p = s.players.find((x) => x.id === lookup.player!.canonicalId);
  if (!p) return null;
  const figures = {
    runsAboveReplacementPerMatch: p.performance.rar, predictedPriceLakh: p.market.lakh, predictedRangeLakh: [p.market.low, p.market.high],
    bestFit: p.fit[0] ? { team: p.fit[0].team, runsPerMatch: p.fit[0].increment } : null,
  };
  return {
    canonicalId: p.id, name: p.name, modelVersion: s.version, dataCutoff: s.dataCutoff, generatedAt: s.generatedAt, targetSeason: s.targetSeason, figures,
    provenance: "Ball-by-ball data: Cricsheet. Auction and squad records: CricField datasets. CricField model output, not an official IPL or franchise valuation.",
    text: `${p.name}: predicted ${s.targetSeason} auction price ₹${(p.market.lakh / 100).toFixed(2)} Cr (80% range ₹${(p.market.low / 100).toFixed(2)}–${(p.market.high / 100).toFixed(2)} Cr). CricField model ${s.version}, data to ${s.dataCutoff}.`,
  };
}

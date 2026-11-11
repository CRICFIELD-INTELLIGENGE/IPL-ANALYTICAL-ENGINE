import rrPredictions from "../../../data/rr-2027-predictions.json";
import franchisePredictions from "../../../data/franchise-2027-predictions.json";
// CRICFIELD Retention Room — the one source of retention values.
//
// Three outputs, kept apart everywhere they appear:
//   Picks      who CricField would keep (Composite Retention Rating, crr.ts)
//   Forecast   who a franchise will keep (the trained model; gated on calibration)
//   Fan Picks  who signed-in fans would keep (votes, never a probability)
//
// Everything reads the published intelligence snapshot, so player values match the
// rest of the site. The squad is the outgoing IPL 2026 squad, because that is the
// list franchises decide from; the response says so and no other roster is used.

import { getRegistry, lookupPlayer, normName } from "../intelligence/identity";
import { getSnapshot, readDesk, retentionEnvelope, squadOf, type Snapshot, type SnapshotPlayer } from "../intelligence/service";
import { bestSide } from "../intelligence/squad-optimizer";
import type { Team } from "../intelligence/schema";
import { TEAMS } from "../intelligence/schema";
import { CATEGORIES, computeCrr, CRR_BANDS, CRR_VERSION, CRR_WEIGHTS, MIN_COVERAGE, SENSITIVITY_SETS, type Pick } from "./crr";
import { ledgerAudit, readLedger, resolvedMoves, SQUAD_CHANGING } from "./ledger";
import { allRules, checkRetained, liveSeason, remainingPurse, retainedCost, rulesFor, rulesSummary, votingOpen, type RulePlayer, type SeasonRules } from "./rules";
import { addEditorial, editorialFor, freezePayload, getBallot, insertFreeze, listFreezes, saveBallot, teamBallots, userBallots, type Choice } from "./store";

/** Forecast classes, used only if the model earns percentages. */
export const FORECAST_THRESHOLDS = { likelyRetained: 0.7, likelyReleased: 0.35 };
const MIN_BALLOTS_FOR_RANKINGS = 5;

const cr = (lakh: number) => `₹${(lakh / 100).toFixed(2)} Cr`;
const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

let cache: { version: string; picks: Pick[]; byId: Map<string, Pick> } | null = null;

export function allPicks(): { snapshot: Snapshot; rules: SeasonRules; picks: Pick[]; byId: Map<string, Pick> } | null {
  const snapshot = getSnapshot(), rules = liveSeason();
  if (!snapshot || !rules) return null;
  if (cache?.version !== snapshot.version) {
    const picks = computeCrr(snapshot, rules);
    cache = { version: snapshot.version, picks, byId: new Map(picks.map((p) => [p.id, p])) };
  }
  return { snapshot, rules, picks: cache.picks, byId: cache.byId };
}

export const pickFor = (canonicalId: string) => allPicks()?.byId.get(canonicalId) ?? null;

function playerOf(s: Snapshot, id: string): SnapshotPlayer | undefined { return s.players.find((p) => p.id === id); }

function meta(s: Snapshot, rules: SeasonRules, team: string | null) {
  const gap = team && team !== "RR" ? rules.contractGapsLakh[team] : undefined;
  return {
    season: rules.season, franchise: team, dataCutoff: s.dataCutoff, modelVersion: s.version, indexVersion: CRR_VERSION, generatedAt: s.generatedAt,
    rules: rulesSummary(rules),
    rosterBasis: {
      season: rules.squadSeason,
      label: `The squad for IPL ${rules.squadSeason}, the list franchises decide from, with completed trades applied: ${(s.transactionsApplied ?? []).map((m) => `${m.player} to ${m.to}`).join(", ") || "none"}.`,
      contractNote: team === "RR" ? "Latest user-supplied contracts are planning inputs. Shanaka INR 2 Cr is unverified; replacement and active-roster records still require reconciliation. No official purse reconciliation is asserted." : gap ? `Recorded contracts for ${team} fall ${cr(gap)} short of the official 2026 total, so salary totals here may be low.` : null,
    },
    provenance: "Ball-by-ball: Cricsheet. Squads, contracts and auctions: CricField records. Decisions: the sourced IPL 2027 desk log. CricField analysis, not an official IPL or franchise position.",
  };
}

const teamPlayers = (s: Snapshot, team: string) => s.players.filter((p) => p.team === team);
const asRule = (p: SnapshotPlayer): RulePlayer => ({ id: p.id, name: p.name, overseas: p.overseas, contractLakh: p.contractLakh });

/* ─── Season and franchise ───────────────────────────────────────────────── */

export function seasons() {
  return { seasons: allRules().map((r) => ({ season: r.season, cycle: r.cycle, live: r.live, rulesStatus: r.rulesStatus, deadline: r.retentionDeadline, votingOpen: votingOpen(r), archive: !r.live })) };
}

function live(season: number) {
  const a = allPicks();
  return a && a.rules.season === season ? a : null;
}

const coverageOf = (rows: Pick[]) => (rows.length ? Math.round(rows.reduce((s, p) => s + p.coverage, 0) / rows.length) : 0);

export function franchiseRoom(season: number, team: Team) {
  const a = live(season);
  if (!a) return null;
  const rows = a.picks.filter((p) => p.team === team);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, rows.filter((p) => p.category === c).length]));
  return { ...meta(a.snapshot, a.rules, team), squadSize: rows.length, counts, evidenceCoverage: coverageOf(rows), forecastStatus: forecastGate(a.snapshot), ballots: teamBallots(season, team).length };
}

/* ─── Picks ──────────────────────────────────────────────────────────────── */

function parseSalaryLakh(sal: string | number | null | undefined): number | null {
  if (typeof sal === "number") return sal;
  if (!sal) return null;
  const s = String(sal).replace(/[₹,\s]/g, "");
  const mCr = /([\d\.]+)Cr/i.exec(s);
  if (mCr) return Math.round(parseFloat(mCr[1]) * 100);
  const mL = /([\d\.]+)L/i.exec(s);
  if (mL) return Math.round(parseFloat(mL[1]));
  const num = parseFloat(s);
  return isNaN(num) ? null : Math.round(num);
}

export function teamPicks(season: number, team: Team) {
  const a = live(season);
  if (!a) return null;
  const notes = editorialFor(season, team, "override");
  const tPred = season === 2027 ? (franchisePredictions as any).teams?.[team] : null;
  const normalize = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "").replace("suryavanshi", "sooryavanshi").replace("amanrao", "amanraoperala").replace("peralaperala", "perala");

  const rows = a.picks.filter((p) => p.team === team).map((p) => {
    const n = notes.get(p.id);
    const sp = playerOf(a.snapshot, p.id)!;
    const pAliases = getRegistry().byCanonical.get(p.id)?.aliases ?? [];
    const pIntel = tPred?.players?.find((r: any) => [r.name, ...(r.aliases ?? [])].some((alias: string) => [p.name, ...pAliases].some((pa: string) => normalize(alias) === normalize(pa))));
    const effectiveContractLakh = p.contractLakh ?? (pIntel?.contractLakh ? pIntel.contractLakh : parseSalaryLakh(pIntel?.salary));

    return {
      ...p, // the computed score and category stay as they are; an override sits beside them
      contractLakh: effectiveContractLakh,
      aliases: pAliases,
      editorial: n ? { category: n.payload.category, rationale: n.payload.rationale, recordedAt: new Date(n.recordedAt).toISOString() } : (season === 2027 && pIntel) ? {
        category: pIntel.tierRecommendation || pIntel.category || p.category,
        rationale: pIntel.reason || p.reason,
        strengths: pIntel.strengths || null,
        weaknesses: pIntel.weaknesses || null,
        salary: pIntel.salary || (effectiveContractLakh ? (effectiveContractLakh >= 100 ? `₹${(effectiveContractLakh / 100).toFixed(2)} Cr` : `₹${effectiveContractLakh} L`) : null),
        inPlayingXI: Boolean(pIntel.inPlayingXI),
        impactSub: Boolean(pIntel.impactSub),
        recordedAt: tPred.updatedAt
      } : season === 2027 && team === "RR" ? { category: p.category, rationale: p.reason, recordedAt: rrPredictions.updatedAt } : null,
      financial: {
        contractLakh: effectiveContractLakh, predictedLakh: p.predictedLakh, predictedRange: { low: sp.market.low, high: sp.market.high },
        note: a.rules.cycle === "mini" ? (effectiveContractLakh ? `Keeping this player commits ${cr(effectiveContractLakh)}. Releasing returns that to the purse, and the auction may price the player near ${cr(p.predictedLakh)}.` : "Salary is not on file, so the cost of keeping this player is unavailable.") : "Mega-auction slabs apply, not the contract.",
      },
    };
  });
  return {
    ...meta(a.snapshot, a.rules, team), rows, evidenceCoverage: coverageOf(rows),
    method: methodOf(a.snapshot),
    planning: season === 2027 ? teamPlanning(team, rows) : null,
  };
}
function teamPlanning(team: Team, rows: {name:string;aliases:string[];id:string;recommendation:string;contractLakh:number|null}[]) {
  const normalize = (n:string) => n.toLowerCase().replace(/[^a-z]/g, "").replace("suryavanshi","sooryavanshi").replace("amanrao","amanraoperala").replace("peralaperala","perala");
  const tPred = (franchisePredictions as any).teams?.[team] || (team === "RR" ? rrPredictions : null);
  if (!tPred) return null;

  const coreLocks = tPred.coreLocks || [];
  const core = rows.filter(p => coreLocks.some((n: string) => [p.name,...p.aliases].some((alias: string) => normalize(n) === normalize(alias))));
  const keep = rows.filter(p => p.recommendation === "retain");
  const total = (players: typeof rows) => players.some(p => p.contractLakh === null) ? null : players.reduce((sum,p) => sum+p.contractLakh!,0);
  const committed = total(keep);

  return {
    status: "editorial-prediction",
    teamCode: team,
    coreLocks: core.map(p=>({id:p.id,name:p.name,contractLakh:p.contractLakh})),
    coreCommittedLakh: total(core),
    recommendedCommittedLakh: committed,
    budgetLakh: tPred.economics?.planningPurseLakh ?? null,
    retainedSpendCr: tPred.retainedPurseCr ?? null,
    remainingPurseCr: tPred.remainingPurseCr ?? null,
    vulnerabilityScore: tPred.vulnerabilityScore ?? null,
    preferredXI: tPred.xi ?? [],
    impactSubs: tPred.impactSubs ?? [],
    priorities: tPred.priorities ?? [],
    note: "Official 10-Team Master Retention Intelligence Board (2026-11-07). Core locks and tier recommendations reflect franchise strategic planning.",
    externalReviews: (tPred.players || []).filter((p: any) => p.rosterStatus === "external-review" || p.rosterStatus === "traded"),
    unclassifiedPlayers: rows.filter(p => !(tPred.players || []).some((r: any) => [r.name,...(r.aliases??[])].some((n: string) => [p.name,...p.aliases].some((alias: string) => normalize(n)===normalize(alias))))).map(p=>p.name)
  };
}

/** Model transparency: weights, bands, the tests behind the performance pillar, and what is unvalidated. */
export function methodOf(s: Snapshot) {
  const m = s.retentionModel;
  return {
    version: CRR_VERSION, weights: CRR_WEIGHTS, bands: CRR_BANDS, minCoverage: MIN_COVERAGE, sensitivitySets: SENSITIVITY_SETS,
    note: "A recommendation on a 0–100 scale, not a chance of being retained. Weights and bands are provisional: there are no franchise decisions yet to calibrate them against.",
    performance: m?.performance ?? null, aging: m?.aging ?? null, decisionBacktest: m?.decisionBacktest ?? null,
    components: {
      performance: "Three seasons, weighted by balls, shrunk toward the league prior by empirical Bayes; a missing season adds nothing rather than counting as zero. Phase, venue and opposition adjusted. Percentile among squad players of the same role.",
      scarcity: "Gap to the best unsigned player in the same granular role and nationality (70%), and how many teammates already cover the role (30%).",
      economics: "Contract inside the model interval or within 20% of its estimate is neutral. Price-only penalties are bounded; no release is triggered solely by a volatile estimate. Left out when salary or a reliable price model is unavailable.",
      fit: "Change to the franchise's best XII from the squad optimiser (50%) and whether the player is in that XII (50%). No captaincy bonus.",
      continuity: "Recorded tenure and selection continuity, or an explicitly declared franchise policy.",
      roleSecurity: "Planned XI or reserve assignment, including tactical role and bowling flexibility; historical fit is the fallback.",
      development: "Declared development investment or a provisional age rubric. Not a projected statistic.",
      horizon: "Age effect on output over the next three seasons, measured on IPL history. Left out where the birth date is not verified.",
    },
  };
}

/* ─── Forecast ───────────────────────────────────────────────────────────── */

function forecastGate(s: Snapshot) {
  const v = s.governance.validation.retention;
  return v.probabilityGate.passed
    ? { available: true, message: null as string | null, reason: null as string | null }
    : {
      available: false, message: "Forecast unavailable — insufficient validated evidence.",
      reason: `On the ${v.holdout.seasons.join(", ")} holdout the model's calibration error was ${v.holdout.ece}, over the ${0.08} limit set before testing. Without calibration its percentages cannot be trusted, so none are shown.`,
    };
}

export function teamForecast(season: number, team: Team) {
  const a = live(season);
  if (!a) return null;
  const s = a.snapshot;
  const gate = forecastGate(s);
  const rows = teamPlayers(s, team).map((p) => {
    const r = retentionEnvelope(s, p);
    const confirmed = r.kind === "decision";
    const prob = gate.available && r.kind === "probability" ? r.value : null;
    return {
      id: p.id, name: p.name, role: p.role, overseas: p.overseas, modelVersion: s.version, dataCutoff: s.dataCutoff,
      confirmed: confirmed ? { decision: r.band, source: r.statusReason } : null,
      probability: prob,
      category: prob === null ? null : prob >= FORECAST_THRESHOLDS.likelyRetained ? "Likely Retained" : prob < FORECAST_THRESHOLDS.likelyReleased ? "Likely Released" : "Uncertain",
      provisional: !confirmed && r.kind === "index" ? { index: r.value, band: r.band } : null,
      factors: team === "RR" ? [{label: "CricField editorial view", detail: a.byId.get(p.id)?.reason ?? "Review role coverage and replacement quality."}, ...r.factors] : r.factors,
    };
  }).sort((x, y) => (y.provisional?.index ?? y.probability ?? 0) - (x.provisional?.index ?? x.probability ?? 0));
  const v = s.governance.validation.retention;
  return {
    ...meta(s, a.rules, team), forecastStatus: gate, rows, thresholds: FORECAST_THRESHOLDS,
    disclaimer: "No franchise has been reported as deciding anything here unless a row is marked confirmed.",
    validation: { scope: v.scope, method: v.chosenModel, holdout: v.holdout, classification: v.classification, bySeason: v.bySeason, byFranchise: v.byFranchise, gate: v.probabilityGate },
  };
}

/* ─── Fan Picks ──────────────────────────────────────────────────────────── */

export function validateBallot(season: number, team: Team, choices: Record<string, Choice>, now = Date.now()) {
  const a = live(season);
  if (!a) return { status: "season_closed" as const, violations: [], notes: [] };
  if (!votingOpen(a.rules, now)) return { status: "locked" as const, violations: [], notes: [] };
  const squad = teamPlayers(a.snapshot, team);
  const ids = new Set(squad.map((p) => p.id));
  const unknown = Object.keys(choices).filter((id) => !ids.has(id));
  const missing = squad.filter((p) => !choices[p.id]);
  const violations = [
    ...(unknown.length ? [{ code: "unknown_player", message: `${unknown.length} selection${unknown.length === 1 ? " is" : "s are"} not in the eligible ${team} squad.` }] : []),
    ...(missing.length ? [{ code: "incomplete", message: `Choose retain or release for all ${squad.length} players: ${missing.length} left.` }] : []),
  ];
  const check = checkRetained(a.rules, squad.filter((p) => choices[p.id] === "retain").map(asRule));
  return { status: "ok" as const, violations: [...violations, ...check.violations], notes: check.notes };
}

export function submitBallot(userId: string, season: number, team: Team, choices: Record<string, Choice>, now = Date.now()) {
  const v = validateBallot(season, team, choices, now);
  if (v.status !== "ok") return { ok: false as const, code: v.status, violations: [], notes: [] };
  if (v.violations.length) return { ok: false as const, code: "invalid_ballot", violations: v.violations, notes: v.notes };
  return { ok: true as const, ballot: saveBallot(userId, season, team, choices, now), notes: v.notes };
}

export function myBallots(userId: string) {
  const a = allPicks();
  return {
    ballots: userBallots(userId).map((b) => {
      const retained = Object.values(b.choices).filter((c) => c === "retain").length;
      const rules = rulesFor(b.season);
      const agree = a && a.rules.season === b.season ? Object.entries(b.choices).filter(([id, c]) => { const p = a.byId.get(id); return p && p.recommendation !== "undecided" && p.recommendation === c; }).length : null;
      return { ...b, updatedAt: new Date(b.updatedAt).toISOString(), createdAt: new Date(b.createdAt).toISOString(), retained, released: Object.keys(b.choices).length - retained, agreesWithCricfield: agree, editable: rules ? votingOpen(rules) : false };
    }),
  };
}

export const myBallot = (userId: string, season: number, team: Team) => getBallot(userId, season, team);

export function fanResults(season: number, team: Team) {
  const a = live(season);
  if (!a) return null;
  const ballots = teamBallots(season, team);
  const total = ballots.length;
  const rows = teamPlayers(a.snapshot, team).map((p) => {
    const retain = ballots.filter((b) => b.choices[p.id] === "retain").length, release = ballots.filter((b) => b.choices[p.id] === "release").length;
    const votes = retain + release;
    const pick = a.byId.get(p.id);
    return { id: p.id, name: p.name, role: p.role, retainVotes: retain, releaseVotes: release, retainPct: votes ? round((retain / votes) * 100) : null, releasePct: votes ? round((release / votes) * 100) : null, cricfield: pick?.recommendation ?? "undecided", cricfieldCategory: pick?.category ?? null };
  }).sort((x, y) => (y.retainPct ?? -1) - (x.retainPct ?? -1));
  const voted = rows.filter((r) => r.retainPct !== null);
  const enough = total >= MIN_BALLOTS_FOR_RANKINGS;
  return {
    ...meta(a.snapshot, a.rules, team), totalBallots: total, label: "Fan voting results. These are opinions of signed-in voters, not statistical retention probabilities.",
    votingOpen: votingOpen(a.rules), rows,
    controversial: enough ? [...voted].sort((x, y) => Math.abs(x.retainPct! - 50) - Math.abs(y.retainPct! - 50)).slice(0, 5) : [],
    disagreements: enough ? voted.filter((r) => (r.cricfield === "retain" && r.retainPct! < 50) || (r.cricfield === "release" && r.retainPct! > 50)).sort((x, y) => Math.abs(y.retainPct! - 50) - Math.abs(x.retainPct! - 50)).slice(0, 5) : [],
    consensusSquad: total ? voted.filter((r) => r.retainPct! >= 50).map((r) => ({ id: r.id, name: r.name })) : [],
    rankingsNote: enough ? null : `Rankings appear after ${MIN_BALLOTS_FOR_RANKINGS} ballots.`,
  };
}

/* ─── Squad Impact ───────────────────────────────────────────────────────── */

export function simulate(season: number, team: Team, choices?: Record<string, Choice>) {
  const a = live(season);
  if (!a) return null;
  const s = a.snapshot, rules = a.rules;
  const players = teamPlayers(s, team);
  const candidates = new Map(squadOf(s, team).map((c) => [c.id, c]));
  const scenario = (label: string, keep: (p: SnapshotPlayer) => boolean, note: string | null = null) => {
    const retained = players.filter(keep);
    const released = players.filter((p) => !keep(p));
    const rulePlayers = retained.map(asRule);
    const cost = retainedCost(rules, rulePlayers);
    const purse = remainingPurse(rules, cost);
    const check = checkRetained(rules, rulePlayers);
    const side = bestSide(retained.map((p) => candidates.get(p.id)).filter((c): c is NonNullable<typeof c> => Boolean(c)));
    const overseas = retained.filter((p) => p.overseas === true).length;
    const roles = retained.reduce<Record<string, number>>((m, p) => { m[p.role] = (m[p.role] ?? 0) + 1; return m; }, {});
    return {
      label, note, retained: retained.length, released: released.length, releasedPlayers: released.map((p) => ({ id: p.id, name: p.name, role: p.role })),
      overseas, overseasSlotsLeft: rules.maxOverseas - overseas, squadSlotsLeft: rules.maxSquad - retained.length,
      committedLakh: cost.lakh, salaryKnownLakh: cost.knownLakh, salaryMissing: cost.missing,
      remainingPurseLakh: purse.remainingLakh, purseNote: purse.note, violations: check.violations,
      strength: side.feasible ? side.strength : null, battingValue: side.feasible ? side.battingValue : null, bowlingValue: side.feasible ? side.bowlingValue : null,
      strengthNote: side.feasible ? null : `${retained.length} retained cannot field a legal XII yet, so the auction has to fill it.`,
      composition: side.feasible ? side.composition : null, roles, gaps: side.gaps, bestXii: side.xii.map((p) => ({ id: p.id, name: p.name })),
    };
  };
  const fans = fanResults(season, team)!;
  const fanKeep = new Set(fans.consensusSquad.map((p) => p.id));
  const tPicks = teamPicks(season, team);
  const coreIds = new Set(tPicks?.planning?.coreLocks.map(p => p.id) ?? []);
  const out = [
    scenario("Current squad", () => true),
    scenario("CRICFIELD Picks", (p) => {
      const r = a.byId.get(p.id)?.recommendation;
      return tPicks?.planning ? r === "retain" : r !== "release";
    }, "Keeps recommended retain tiers and strategic assets according to the retention master board."),
    ...(coreIds.size > 0 ? [scenario("Core locks", p => coreIds.has(p.id), "Strategic franchise core locks; not official confirmations.")] : []),
    ...(team === "RR" ? [scenario("Keep Tushar", p => a.byId.get(p.id)?.recommendation === "retain" || p.name === "TU Deshpande", "Adds the Tushar dilemma to recommended retentions.")] : []),
    ...(fans.totalBallots ? [scenario("Fan Picks", (p) => fanKeep.has(p.id), `${fans.totalBallots} ballot${fans.totalBallots === 1 ? "" : "s"}. Players at 50% or more stay.`)] : []),
    ...(choices ? [scenario("Your choices", (p) => choices[p.id] !== "release")] : []),
  ];
return {
    ...meta(s, rules, team), scenarios: out, fanScenario: fans.totalBallots ? "available" : "No fan ballots yet, so there is no fan squad to compare.",
    caveat: "Strength is runs above replacement per match for the best XII. It measures squad composition, not expected wins.",
  };
}

/* ─── Dilemmas ───────────────────────────────────────────────────────────── */

interface Side { id: string; name: string; role: string; index: number; contractLakh: number | null; predictedLakh: number; rar: number | null; fit: number | null; case: string }
export interface Dilemma { id: string; type: string; title: string; question: string; a: Side; b: Side; evidence: string[]; opinion?: { text: string; recordedAt: string } | null }

export function teamDilemmas(season: number, team: Team): Dilemma[] | null {
  const a = live(season);
  if (!a) return null;
  const rows = a.picks.filter((p) => p.team === team && p.coverage >= MIN_COVERAGE);
  const s = a.snapshot;
  const sp = (p: Pick) => playerOf(s, p.id)!;
  const age = (p: Pick) => { const m = /(\d{4})/.exec(sp(p).birthDate ?? ""); return m ? s.targetSeason - Number(m[1]) : null; };
  const side = (p: Pick): Side => ({ id: p.id, name: p.name, role: p.role, index: p.index, contractLakh: p.contractLakh, predictedLakh: p.predictedLakh, rar: sp(p).performance.rar, fit: p.fitIncrement, case: p.reason });
  const out: Dilemma[] = [];
  const add = (type: string, title: string, question: string, x: Pick | undefined, y: Pick | undefined, evidence: (x: Pick, y: Pick) => string[]) => {
    if (!x || !y || x.id === y.id || out.some((d) => [d.a.id, d.b.id].includes(x.id) && [d.a.id, d.b.id].includes(y.id))) return;
    out.push({ id: `${type}:${x.id}:${y.id}`, type, title, question, a: side(x), b: side(y), evidence: evidence(x, y) });
  };
  const money = (p: Pick) => (p.contractLakh ? cr(p.contractLakh) : "salary not on file");
  const paid = [...rows].filter((p) => p.contractLakh).sort((x, y) => y.contractLakh! - x.contractLakh!);
  const young = rows.filter((p) => (age(p) ?? 99) <= 25 && (sp(p).performance.rar ?? -1) > 0 && p.contractLakh && p.contractLakh <= 500);
  add("star_or_talent", "Expensive superstar or emerging talent", "Where should the next rupee go?", paid.find((p) => p.contractLakh! >= p.predictedLakh * 1.3), young.sort((x, y) => y.index - x.index)[0],
    (x, y) => [`${x.name} costs ${money(x)} and the model expects ${cr(x.predictedLakh)} at auction.`, `${y.name} costs ${money(y)}, with ${age(y)} years on the clock in ${s.targetSeason}.`]);
  const finisher = rows.filter((p) => p.overseas && sp(p).candidate.battingSlot === "finish" && p.role !== "bowler").sort((x, y) => y.index - x.index)[0];
  const domesticAr = rows.filter((p) => !p.overseas && p.role === "all-rounder").sort((x, y) => y.index - x.index)[0];
  add("overseas_or_domestic", "Overseas finisher or domestic all-rounder", "Is the overseas slot worth more than the balance?", finisher, domesticAr,
    (x, y) => [`${x.name} uses one of ${a.rules.maxOverseas} overseas places.`, `${y.name} bats and bowls without using one.`]);
  const veteran = rows.filter((p) => sp(p).selection?.captain && (age(p) ?? 0) >= 33).sort((x, y) => y.index - x.index)[0];
  const successor = rows.filter((p) => veteran && p.id !== veteran.id && p.role === veteran.role && (age(p) ?? 99) <= 28).sort((x, y) => y.index - x.index)[0];
  add("veteran_or_successor", "Veteran leader or long-term replacement", "How much is experience worth next season?", veteran, successor,
    (x, y) => [`${x.name} is ${age(x)} in ${s.targetSeason} and led the side in 2026.`, `${y.name} is ${age(y)} and plays the same role.`]);
  const specialist = rows.filter((p) => p.role === "bowler" && (p.category === "Retention Dilemma" || p.category === "Release / Buyback Review")).sort((x, y) => y.index - x.index)[0];
  const flexible = rows.filter((p) => p.role === "all-rounder" && (p.category === "Retention Dilemma" || p.category === "Release / Buyback Review")).sort((x, y) => y.index - x.index)[0];
  add("specialist_or_flexible", "Specialist bowler or squad flexibility", "Pure skill or an extra option?", specialist, flexible,
    (x, y) => [`${x.name}: ${x.reason}.`, `${y.name}: ${y.reason}.`]);
  const close = rows.filter((p) => p.category === "Retention Dilemma").sort((x, y) => (y.contractLakh ?? 0) - (x.contractLakh ?? 0));
  if (close.length >= 2) add("close_call", "Two players, one budget", "Both sit in the dilemma band. Which case is stronger?", close[0], close[1],
    (x, y) => [`Index ${x.index} against ${y.index}, a gap too small to settle it.`, `${money(x)} against ${money(y)}.`]);
  const notes = editorialFor(season, team, "dilemma");
  return out.slice(0, 3).map((d) => { const n = notes.get(d.id); return { ...d, opinion: n ? { text: n.payload.opinion, recordedAt: new Date(n.recordedAt).toISOString() } : null }; });
}

export function editorialOverride(season: number, team: Team, player: string, category: string, rationale: string) {
  const a = live(season);
  const p = a ? lookupPlayer(player).player : null;
  if (!a || !p || a.byId.get(p.canonicalId)?.team !== team) return null;
  return addEditorial({ season, team, kind: "override", subject: p.canonicalId, payload: { category, rationale } });
}
export function editorialOpinion(season: number, team: Team, dilemmaId: string, opinion: string) {
  if (!teamDilemmas(season, team)?.some((d) => d.id === dilemmaId)) return null;
  return addEditorial({ season, team, kind: "dilemma", subject: dilemmaId, payload: { opinion } });
}

/* ─── One player, for profiles, Scout and the War Room ───────────────────── */

export function playerRetention(key: string | number) {
  const a = allPicks();
  if (!a) return null;
  const { player } = lookupPlayer(key);
  if (!player) return null;
  const pick = a.byId.get(player.canonicalId);
  if (!pick) return null;
  const sp = playerOf(a.snapshot, pick.id)!;
  const r = retentionEnvelope(a.snapshot, sp);
  const fans = fanResults(a.rules.season, pick.team as Team)!;
  const fan = fans.rows.find((x) => x.id === pick.id)!;
  return {
    season: a.rules.season, team: pick.team, modelVersion: a.snapshot.version, indexVersion: CRR_VERSION, dataCutoff: a.snapshot.dataCutoff,
    pick: { index: pick.index, coverage: pick.coverage, category: pick.category, confidence: pick.confidence, granularRole: pick.granularRole, reason: pick.reason, against: pick.against, fitIncrement: pick.fitIncrement, previous: pick.previous },
    forecast: { status: forecastGate(a.snapshot), band: r.band, kind: r.kind, value: r.value },
    fans: { totalBallots: fans.totalBallots, retainPct: fan.retainPct, releasePct: fan.releasePct, label: fans.label },
  };
}

/** Compact league view for previews and the AI Analyst. */
export function leagueSummary() {
  const a = allPicks();
  if (!a) return null;
  const teams = TEAMS.map((team) => {
    const rows = a.picks.filter((p) => p.team === team);
    return {
      team, squad: rows.length, priority: rows.filter((p) => p.category === "Franchise Cornerstone" || p.category === "Priority Retain").map((p) => p.name),
      dilemmas: rows.filter((p) => p.category === "Retention Dilemma").length, releaseCandidates: rows.filter((p) => p.category === "Release Candidate" || p.category === "Release / Buyback Review").length,
      insufficient: rows.filter((p) => p.category === "Insufficient Evidence").length, ballots: teamBallots(a.rules.season, team).length, topPick: rows[0] ? { name: rows[0].name, index: rows[0].index } : null,
    };
  });
  const last = listFreezes(a.rules.season)[0] ?? null;
  return {
    ...meta(a.snapshot, a.rules, null), teams, toughest: [...teams].sort((x, y) => y.dilemmas - x.dilemmas).slice(0, 3).map((t) => ({ team: t.team, dilemmas: t.dilemmas })),
    forecastStatus: forecastGate(a.snapshot), lastFreeze: last ? { at: new Date(last.frozenAt).toISOString(), modelVersion: last.modelVersion } : null,
  };
}

/* ─── Accountability ─────────────────────────────────────────────────────── */

interface FrozenTeam { team: string; picks: { id: string; name: string; index: number; category: string; recommendation: string }[]; forecast: { id: string; probability: number | null; band: string | null }[]; fans: { id: string; retainPct: number | null }[]; ballots: number }
export interface FrozenPayload { season: number; frozenAt: string; modelVersion: string; indexVersion: string; dataCutoff: string; rules: ReturnType<typeof rulesSummary>; forecastStatus: { available: boolean; message: string | null }; teams: FrozenTeam[] }

export function freezeSeason(season: number, reason: string, now = Date.now()) {
  const a = live(season);
  if (!a) return null;
  const teams: FrozenTeam[] = TEAMS.map((team) => {
    const forecast = teamForecast(season, team)!;
    const fans = fanResults(season, team)!;
    return {
      team, ballots: fans.totalBallots,
      picks: a.picks.filter((p) => p.team === team).map((p) => ({ id: p.id, name: p.name, index: p.index, category: p.category, recommendation: p.recommendation })),
      forecast: forecast.rows.map((r) => ({ id: r.id, probability: r.probability, band: r.provisional?.band ?? null })),
      fans: fans.rows.map((r) => ({ id: r.id, retainPct: r.retainPct })),
    };
  });
  const payload: FrozenPayload = { season, frozenAt: new Date(now).toISOString(), modelVersion: a.snapshot.version, indexVersion: CRR_VERSION, dataCutoff: a.snapshot.dataCutoff, rules: rulesSummary(a.rules), forecastStatus: forecastGate(a.snapshot), teams };
  return insertFreeze(season, reason, a.snapshot.version, payload, now);
}

/** Freezes once when voting locks, so a snapshot exists before any announcement. */
export function freezeAtLock(now = Date.now()) {
  const rules = liveSeason();
  if (!rules?.votingLocksAt || now < Date.parse(rules.votingLocksAt) || listFreezes(rules.season).length) return null;
  return freezeSeason(rules.season, "Automatic freeze at voting lock", now);
}

/** Runs on its own timer: PLATFORM_WORKER_ENABLED also sends email and WhatsApp, and a freeze must not depend on that. */
export function startRetentionFreeze() {
  const run = () => { try { freezeAtLock(); } catch { console.warn("Retention freeze failed; it will retry."); } };
  run();
  setInterval(run, 60_000).unref();
}

interface Actual { team: string; id: string | null; player: string; retained: boolean; sourceUrl: string; recordedAt: number }

function actualsFor(): Actual[] {
  const desk = readDesk();
  if (!desk) return [];
  const reg = getRegistry();
  return desk.retentions.map((r) => {
    const ids = reg.byAlias.get(normName(r.player));
    return { team: r.team, id: ids?.size === 1 ? [...ids][0] : null, player: r.player, retained: r.decision === "retained", sourceUrl: r.sourceUrl, recordedAt: r.recordedAt ? Date.parse(r.recordedAt) : 0 };
  });
}

function scoreFreeze(payload: FrozenPayload, actuals: Actual[]) {
  const teams = payload.teams.map((t) => {
    const here = actuals.filter((x) => x.team === t.team && x.id);
    const compare = (say: (id: string) => boolean | null) => {
      let right = 0, n = 0;
      for (const x of here) { const s = say(x.id!); if (s === null) continue; n++; if (s === x.retained) right++; }
      return { n, right, accuracy: n ? round((right / n) * 100) : null };
    };
    const pick = new Map(t.picks.map((p) => [p.id, p.recommendation]));
    const prob = new Map(t.forecast.map((p) => [p.id, p.probability]));
    const fan = new Map(t.fans.map((p) => [p.id, p.retainPct]));
    const scored = here.filter((x) => prob.get(x.id!) !== null && prob.get(x.id!) !== undefined);
    return {
      team: t.team, decisions: here.length,
      picks: compare((id) => { const r = pick.get(id); return r === undefined || r === "undecided" ? null : r === "retain"; }),
      forecast: { ...compare((id) => { const p = prob.get(id); return p === null || p === undefined ? null : p >= 0.5; }), brier: scored.length ? round(scored.reduce((s, x) => s + (prob.get(x.id!)! - (x.retained ? 1 : 0)) ** 2, 0) / scored.length, 4) : null },
      fans: compare((id) => { const p = fan.get(id); return p === null || p === undefined ? null : p >= 50; }),
      calls: here.map((x) => ({ player: x.player, retained: x.retained, cricfield: pick.get(x.id!) ?? null, sourceUrl: x.sourceUrl })),
    };
  });
  const sum = (k: "picks" | "fans" | "forecast") => {
    const n = teams.reduce((s, t) => s + t[k].n, 0), right = teams.reduce((s, t) => s + t[k].right, 0);
    return { n, right, accuracy: n ? round((right / n) * 100) : null };
  };
  return { teams, overall: { picks: sum("picks"), forecast: sum("forecast"), fans: sum("fans") } };
}

export function history() {
  const s = getSnapshot();
  const actuals = actualsFor();
  const first = actuals.length ? Math.min(...actuals.map((x) => x.recordedAt || Infinity)) : Infinity;
  const frozen = listFreezes().map((f) => {
    const full = freezePayload(f.id)!;
    const beforeDecisions = f.frozenAt < first;
    return {
      id: f.id, season: f.season, frozenAt: new Date(f.frozenAt).toISOString(), reason: f.reason, modelVersion: f.modelVersion, hash: f.hash, intact: full.intact, beforeDecisions,
      evaluation: actuals.length && beforeDecisions ? scoreFreeze(full.payload as FrozenPayload, actuals) : null,
    };
  });
  const v = s?.governance.validation.retention;
  return {
    frozen, officialDecisions: actuals.length, unmatchedDecisions: actuals.filter((x) => !x.id).map((x) => x.player),
    livePredictionStatus: frozen.length ? null : "Nothing has been frozen yet. A snapshot is taken before voting locks.",
    leaderboard: frozen.filter((f) => f.evaluation).map((f) => ({ season: f.season, frozenAt: f.frozenAt, ...f.evaluation!.overall })),
    retrospective: v ? {
      label: "Retrospective evaluation. Seasons were held out of training, but none of these were published as predictions at the time.",
      method: v.chosenModel, gate: v.probabilityGate, classification: v.classification, bySeason: v.bySeason, byFranchise: v.byFranchise,
    } : null,
  };
}

export const getFreeze = freezePayload;

/* ─── Trade intelligence ─────────────────────────────────────────────────── */

/** Ledger entries touching a franchise (or all), with each move's player rating. Only completed entries are facts. */
export function tradeIntelligence(team?: Team) {
  const s = getSnapshot();
  const l = readLedger();
  const moves = resolvedMoves(l.entries);
  const applied = new Set((s?.transactionsApplied ?? []).map((m) => m.entryId));
  const entries = l.entries.filter((e) => !team || e.moves.some((m) => m.from === team || m.to === team)).map((e) => ({
    ...e, changesSquads: SQUAD_CHANGING.has(e.status), inSnapshot: applied.has(e.id),
    label: SQUAD_CHANGING.has(e.status) ? (applied.has(e.id) ? "Completed: squads updated" : "Completed: applied at the next model publish") : "Not confirmed: shown as a scenario only",
    moves: moves.filter((m) => m.entryId === e.id).map((m) => {
      const p = m.canonicalId ? s?.players.find((x) => x.id === m.canonicalId) : undefined;
      const pick = m.canonicalId ? pickFor(m.canonicalId) : null;
      return { ...m, rar: p?.retentionV2?.projection?.rar ?? null, contractLakh: p?.contractLakh ?? null, crr: pick ? { index: pick.index, category: pick.category } : null };
    }),
  }));
  return { updatedAt: l.updatedAt, note: l.note, entries, audit: ledgerAudit() };
}
export const liveRetentionSeason = () => liveSeason()?.season ?? 0;

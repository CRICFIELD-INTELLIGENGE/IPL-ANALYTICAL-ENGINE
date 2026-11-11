// Step 3 of the intelligence pipeline: batch inference and publication.
//
// Combines the trained outputs with the ratings and writes one immutable snapshot:
//   data/intelligence/<version>/snapshot.json    data/intelligence/current.json points at it
// The API only ever reads a snapshot, so no page can compute a value of its own
// and a published figure can always be reproduced from its version.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getBallColumns } from "../../src/services/decision/ball-context";
import { bowlingSubtype, getPlayerMeta, getRoster, getSeasonLines } from "../../src/services/decision/player-profiles";
import { completedMoves } from "../../src/services/retention/ledger";
import { agingCurves, decisionBacktest, PERF_CONFIGS, project, validateConfigs } from "../../src/services/retention/performance";
import { getProjectRoot, warehousePath } from "../../src/services/decision/db";
import { getRegistry, identityCoverage, lookupPlayer } from "../../src/services/intelligence/identity";
import { getPlayerSeasons, ratingsAsOf, replacementRates, runsAboveReplacement } from "../../src/services/intelligence/impact-engine";
import { analyticRole, getContracts, LATEST_SEASON, leaguePhaseEcon, perfFeatures, ratingBundle, TARGET_SEASON, type AnalyticRole } from "../../src/services/intelligence/feature-store";
import { bestSide, incrementalValue, type SquadCandidate } from "../../src/services/intelligence/squad-optimizer";
import { franchiseOf } from "../../src/services/decision/stats-engine";
import { TEAMS } from "../../src/services/intelligence/schema";
import { getUsage } from "../../src/services/decision/player-profiles";

const dataDir = path.resolve(process.cwd(), "data", "intelligence");
const output = JSON.parse(fs.readFileSync(path.join(dataDir, "work", "model-output.json"), "utf8"));
const reg = getRegistry();
const round = (n: number | null | undefined, dp = 2) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp);

/* ─── Impact validation ──────────────────────────────────────────────────── */

function spearman(a: number[], b: number[]) {
  const rank = (v: number[]) => { const idx = v.map((x, i) => [x, i]).sort((x, y) => x[0] - y[0]); const r = new Array<number>(v.length); idx.forEach(([, i], k) => (r[i] = k)); return r; };
  const ra = rank(a), rb = rank(b), n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { cov += (ra[i] - ma) * (rb[i] - mb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mb) ** 2; }
  return cov / Math.sqrt(va * vb);
}

function impactValidation() {
  const { seasons } = getPlayerSeasons();
  const pred: number[] = [], actual: number[] = [];
  let covered = 0, total = 0;
  const roleOf = (asOf: number) => (id: number) => analyticRole(id, asOf, null);
  for (let s = 2015; s <= LATEST_SEASON; s++) {
    const r = ratingsAsOf(s - 1);
    const repl = replacementRates(r, roleOf(s - 1));
    for (const l of seasons.get(s) ?? []) {
      const rt = r.players.get(l.playerId);
      if (!rt || rt.matchesWeighted < 3) continue;
      const x = runsAboveReplacement(rt, repl.get(roleOf(s - 1)(l.playerId)) ?? { bat: 0, bowl: 0 });
      if (l.matches >= 7) {
        pred.push(x.perMatch);
        actual.push((l.batValue + l.bowlValue) / l.matches);
      }
      // Coverage of the batting rate interval: talent uncertainty plus this season's sampling noise.
      if (l.batBalls >= 60) {
        const noise = Math.sqrt(rt.batRateSd ** 2 + r.bat.perBallVariance / l.batBalls);
        const rate = l.batValue / l.batBalls;
        if (Math.abs(rate - rt.batRate) <= 1.2816 * noise) covered++;
        total++;
      }
    }
  }
  return {
    outOfTimeSeasons: "2015–2026, each rated on earlier seasons only", n: pred.length,
    rankCorrelationWithNextSeason: round(spearman(pred, actual), 3), previousModelRankCorrelation: 0.159,
    intervalCoverage: { nominal: 0.8, measured: round(covered / total, 3), n: total },
    label: "CricField Runs Above Replacement. Not WAR: no conversion to wins has been validated.",
  };
}

/* ─── Candidates ─────────────────────────────────────────────────────────── */

const PHASE_SHRINK_BALLS = 180;
const phaseEcon = new Map<number, ReturnType<typeof leaguePhaseEcon>>();

function candidate(id: string, asOf: number): SquadCandidate | null {
  const p = reg.byCanonical.get(id);
  if (!p) return null;
  const perf = perfFeatures(p.warehouseId, asOf, p.role);
  const meta = p.warehouseId !== null ? getPlayerMeta().get(p.warehouseId) : undefined;
  const usage = p.warehouseId !== null ? getUsage(p.warehouseId, String(asOf)) : null;
  const role = analyticRole(p.warehouseId, asOf, p.role);
  const seen = perf.sampleMatches > 0;
  const overs = seen ? usage?.bowlingCapacity ?? 0 : role === "bowler" ? 4 : role === "all-rounder" ? 2 : 0;
  const type = overs > 0 ? (meta?.bowlingType === "pace" || meta?.bowlingType === "spin" ? meta.bowlingType : "unknown") : "none";
  // Runs per over above replacement: the overall bowling rating, moved by how the player's phases compare
  // with each other. A phase never bowled stays closed, so a side cannot pretend it is covered.
  const lg = phaseEcon.get(asOf) ?? phaseEcon.set(asOf, leaguePhaseEcon(asOf)).get(asOf)!;
  const base = perf.ballsBowledPerMatch > 0 && perf.rarBowl !== null ? (perf.rarBowl / perf.ballsBowledPerMatch) * 6 : 0;
  const raw = { powerplay: { b: perf.ppBalls, e: perf.ppEcon }, middle: { b: perf.midBalls, e: perf.midEcon }, death: { b: perf.deathBalls, e: perf.deathEcon } };
  const delta = (ph: keyof typeof raw) => (raw[ph].e === null ? 0 : ((lg[ph] - raw[ph].e!) * raw[ph].b) / (raw[ph].b + PHASE_SHRINK_BALLS));
  const total = raw.powerplay.b + raw.middle.b + raw.death.b;
  const mean = total ? (delta("powerplay") * raw.powerplay.b + delta("middle") * raw.middle.b + delta("death") * raw.death.b) / total : 0;
  const faced = perf.ppFaced + perf.midFaced + perf.deathFaced;
  const battingSlot: SquadCandidate["battingSlot"] = faced && perf.ppFaced / faced >= 0.45 ? "top" : faced && perf.deathFaced / faced >= 0.35 ? "finish" : "middle";
  const open = (ph: keyof typeof raw) => (overs === 0 ? null : !seen ? 0 : raw[ph].b >= 12 ? round(base + delta(ph) - mean, 3) : null);
  return {
    id, name: p.name, rar: perf.rar ?? 0, rarBat: perf.rarBat ?? 0, overseas: Boolean(p.overseas), keeper: role === "wicketkeeper", oversCapacity: overs,
    bowlingType: type as SquadCandidate["bowlingType"], battingOption: role !== "bowler", battingSlot,
    phaseValue: { powerplay: open("powerplay"), middle: open("middle"), death: open("death") },
    ballsFacedPerMatch: perf.ballsFacedPerMatch, evidence: seen,
  };
}

function squadAt(team: string, season: number, asOf: number): SquadCandidate[] {
  const out: SquadCandidate[] = [];
  for (const [id, cs] of getContracts()) {
    if (cs.some((c) => c.season === season && c.team === team)) {
      const c = candidate(id, asOf);
      if (c) out.push(c);
    }
  }
  return out;
}

/* ─── Does squad strength predict matches? ───────────────────────────────── */

function strengthValidation() {
  const c = getBallColumns();
  const rows: { season: number; diff: number; win: number }[] = [];
  for (let s = 2016; s <= LATEST_SEASON; s++) {
    const strength = new Map<string, number>();
    for (const m of c.matches) {
      if (Number(m.season) !== s || m.winner === null) continue;
      const a = franchiseOf(m.team1)?.short, b = franchiseOf(m.team2)?.short;
      if (!a || !b) continue;
      for (const t of [a, b]) if (!strength.has(t)) strength.set(t, bestSide(squadAt(t, s, s - 1)).strength);
      rows.push({ season: s, diff: strength.get(a)! - strength.get(b)!, win: m.winner === m.team1 ? 1 : 0 });
    }
  }
  const train = rows.filter((r) => r.season <= 2022), test = rows.filter((r) => r.season > 2022);
  // One-parameter logistic: no intercept, since which side is listed first carries no meaning.
  let beta = 0;
  for (let i = 0; i < 50; i++) {
    let g = 0, h = 0;
    for (const r of train) { const p = 1 / (1 + Math.exp(-beta * r.diff)); g += r.diff * (r.win - p); h += r.diff ** 2 * p * (1 - p); }
    beta += g / Math.max(1e-9, h);
  }
  const wins = new Map<string, number>(), teamStrength: number[] = [], teamWins: number[] = [];
  for (const m of c.matches) {
    const w = m.winner === null ? undefined : franchiseOf(m.winner)?.short;
    if (w) wins.set(`${m.season}|${w}`, (wins.get(`${m.season}|${w}`) ?? 0) + 1);
  }
  for (let s = 2016; s <= LATEST_SEASON; s++) {
    const seen = new Set(c.matches.filter((m) => Number(m.season) === s).flatMap((m) => [franchiseOf(m.team1)?.short, franchiseOf(m.team2)?.short]));
    for (const t of seen) { if (!t) continue; teamStrength.push(bestSide(squadAt(t, s, s - 1)).strength); teamWins.push(wins.get(`${s}|${t}`) ?? 0); }
  }
  const brier = (data: typeof rows) => data.reduce((s, r) => s + (1 / (1 + Math.exp(-beta * r.diff)) - r.win) ** 2, 0) / data.length;
  const skill = (data: typeof rows) => 0.25 - brier(data);
  let seed = 20261102;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const boots: number[] = [];
  for (let b = 0; b < 2000; b++) boots.push(skill(test.map(() => test[Math.floor(rnd() * test.length)])));
  boots.sort((x, y) => x - y);
  const low = boots[Math.floor(0.025 * boots.length)], high = boots[Math.floor(0.975 * boots.length)];
  return {
    matches: { train: train.length, test: test.length }, trainSeasons: "2016–2022", testSeasons: "2023–2026",
    teamSeasonRankCorrelationWithWins: round(spearman(teamStrength, teamWins), 3), teamSeasons: teamStrength.length,
    logitPerRun: round(beta, 4), testBrier: round(brier(test), 4), coinFlipBrier: 0.25,
    brierSkill95: [round(low, 4), round(high, 4)],
    seasonSimulationGate: { passed: low > 0, rule: "The 95% bootstrap interval of Brier skill on 2023–2026 matches must lie above zero" },
  };
}

/* ─── Snapshot ───────────────────────────────────────────────────────────── */

const asOf = LATEST_SEASON;
const { r, repl } = ratingBundle(asOf);
const roles: Record<string, { replacementBat: number | null; replacementBowl: number | null; fringeSample: number }> = {};
for (const [role, v] of repl) roles[role] = { replacementBat: round(v.bat, 4), replacementBowl: round(v.bowl, 4), fringeSample: v.n };

const scored = Object.keys(output.auction);
const scoredSet = new Set(scored);
const contracts = getContracts();
// Completed or officially confirmed trades in the ledger move a player before anything is rated against squads.
const moved = completedMoves();
// A player who appeared for a franchise in the latest season belongs to its squad even when the
// contract table has no row for him; the salary then stays unknown rather than invented.
const playedFor = new Map<string, { team: string; matches: number }>();
for (const e of getRoster(String(LATEST_SEASON))) {
  const short = franchiseOf(e.teamId)?.short, id = reg.byWarehouse.get(e.playerId);
  if (short && id && (playedFor.get(id)?.matches ?? 0) < e.matches) playedFor.set(id, { team: short, matches: e.matches });
}
const unrecorded: string[] = [];
const contractTeam = (id: string) => {
  const c = (contracts.get(id) ?? []).filter((x) => x.season === LATEST_SEASON).at(-1);
  if (c) return c;
  const pf = playedFor.get(id);
  return pf ? { season: LATEST_SEASON, team: pf.team, lakh: null as number | null, acquisition: "unrecorded" } : null;
};
const currentTeam = (id: string) => {
  const c = contractTeam(id), m = moved.get(id);
  return c && m ? { ...c, team: m.to, lakh: m.feeLakh ?? c.lakh, acquisition: "traded" } : c;
};
for (const id of playedFor.keys()) if (!(contracts.get(id) ?? []).some((x) => x.season === LATEST_SEASON) && scoredSet.has(id)) unrecorded.push(id);
console.log("squad players with no contract row:", unrecorded.map((id) => reg.byCanonical.get(id)?.name).join(", "));
const squads = Object.fromEntries(TEAMS.map((t) => [t, [...new Set([...contracts.keys(), ...playedFor.keys()])].filter((id) => scoredSet.has(id) && currentTeam(id)?.team === t).map((id) => candidate(id, asOf)).filter((c): c is SquadCandidate => Boolean(c))]));
console.log("squads", Object.entries(squads).map(([t, s]) => `${t}:${s.length}`).join(" "));

const t0 = Date.now();
const teamReports = Object.fromEntries(TEAMS.map((t) => {
  const b = bestSide(squads[t]);
  const contract = squads[t].reduce((s, p) => s + (currentTeam(p.id)?.lakh ?? 0), 0);
  return [t, {
    team: t, squadSize: squads[t].length, overseasInSquad: squads[t].filter((p) => p.overseas).length, contractLakh: contract,
    strength: b.strength, feasible: b.feasible, composition: b.composition, gaps: b.gaps,
    xii: b.xii.map((p) => ({ id: p.id, name: p.name, rar: round(p.rar), overseas: p.overseas, keeper: p.keeper, evidence: p.evidence })),
    bench: b.bench.map((p) => ({ id: p.id, name: p.name, rar: round(p.rar), overseas: p.overseas, keeper: p.keeper, evidence: p.evidence })),
  }];
}));

const captainNames = new Set((JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "data", "captains.json"), "utf8")) as { captains: { player: string; lastSeason: number }[] }).captains.filter((c) => c.lastSeason >= LATEST_SEASON).map((c) => lookupPlayer(c.player).player?.canonicalId).filter(Boolean));
const rosterGames = new Map<string, number>(), teamGames = new Map<string, number>();
for (const e of getRoster(String(LATEST_SEASON))) {
  const short = franchiseOf(e.teamId)?.short, id = reg.byWarehouse.get(e.playerId);
  if (!short || !id) continue;
  rosterGames.set(`${short}|${id}`, e.matches);
  teamGames.set(short, Math.max(teamGames.get(short) ?? 0, e.matches));
}
/** Selection and tenure facts for the Retention Room. Null stays null: an absent record is not a zero. */
function selectionOf(id: string, team: string | null, warehouseId: number | null) {
  if (!team) return null;
  const seasons = warehouseId === null ? [] : (getPlayerSeasons().byPlayer.get(warehouseId) ?? []).filter((l) => l.season > LATEST_SEASON - 4 && l.matches >= 3);
  return {
    matchesForTeam: rosterGames.get(`${team}|${id}`) ?? 0, teamMatches: teamGames.get(team) ?? null,
    seasonsWithTeam: (contracts.get(id) ?? []).filter((c) => c.team === team).length, captain: captainNames.has(id),
    seasonRate: seasons.map((l) => round((l.batValue + l.bowlValue) / l.matches, 2)),
  };
}

/* ─── Retention V2 inputs ────────────────────────────────────────────────── */

const perfValidation = validateConfigs();
const perfWeights = PERF_CONFIGS[perfValidation.chosen].weights;
const yearOf = (d: string | null) => { const m = /(\d{4})/.exec(d ?? ""); return m ? Number(m[1]) : null; };
const bornByWarehouse = new Map<number, number>();
for (const p of reg.byCanonical.values()) { const y = yearOf(p.birthDate); if (p.warehouseId !== null && y) bornByWarehouse.set(p.warehouseId, y); }
const aging = agingCurves((id) => bornByWarehouse.get(id) ?? null, asOf);

/** Per-season record and the chosen projection, for the Retention Room's multi-year view. */
function retentionInputs(id: string, warehouseId: number | null, role: string) {
  const meta = warehouseId !== null ? getPlayerMeta().get(warehouseId) : undefined;
  const lines = warehouseId === null ? [] : getPlayerSeasons().byPlayer.get(warehouseId) ?? [];
  const p = project(lines, asOf, perfWeights, role);
  return {
    battingHand: meta?.battingHand ?? null, bowlingSubtype: meta ? bowlingSubtype(meta) : null,
    projection: p ? { rar: round(p.rar), sd: round(p.sd), bat: round(p.bat), bowl: round(p.bowl), seasonsUsed: p.seasonsUsed } : null,
    seasons: lines.filter((l) => l.season > asOf - 4 && l.matches > 0).map((l) => ({
      season: l.season, matches: l.matches, batBalls: l.batBalls, bowlBalls: l.bowlBalls,
      batPerMatch: round(l.batValue / l.matches), bowlPerMatch: round(l.bowlValue / l.matches),
      batPhase: l.batPhaseValue.map((v) => round(v / l.matches)), bowlPhase: l.bowlPhaseValue.map((v) => round(v / l.matches)),
      phaseBallsFaced: [l.bat.powerplay.balls, l.bat.middle.balls, l.bat.death.balls], phaseBallsBowled: [l.bowl.powerplay.balls, l.bowl.middle.balls, l.bowl.death.balls],
    })),
  };
}

const players = scored.map((id) => {
  const p = reg.byCanonical.get(id)!;
  const perf = perfFeatures(p.warehouseId, asOf, p.role);
  const c = candidate(id, asOf)!;
  const role: AnalyticRole = analyticRole(p.warehouseId, asOf, p.role);
  const cur = currentTeam(id);
  const m = output.auction[id];
  const fit = TEAMS.map((t) => {
    const v = incrementalValue(squads[t], c);
    return { team: t, ...v };
  }).sort((a, b) => b.increment - a.increment);
  const retention = cur ? output.retention[`${cur.team}|${id}`] ?? null : null;
  return {
    id, name: p.name, warehouseId: p.warehouseId, role, listedRole: p.role, overseas: p.overseas, team: cur?.team ?? null, contractLakh: cur?.lakh ?? null,
    acquisition: cur?.acquisition ?? null, performance: Object.fromEntries(Object.entries(perf).map(([k, v]) => [k, round(v as number, 3)])),
    selection: selectionOf(id, cur?.team ?? null, p.warehouseId), birthDate: p.birthDate, retentionV2: retentionInputs(id, p.warehouseId, role), candidate: c, market: m, soldLikelihood: output.sold[id] ?? null, retention, fit,
  };
});

// Rank gap: performance rank minus price rank inside a role. Two rankings are compared, so no rupee is ever
// subtracted from a run, and no conversion between the two is assumed.
const evidenced = players.filter((p) => p.performance.sampleMatches !== null && (p.performance.sampleMatches as number) >= 5);
const pct = (v: number, list: number[]) => Math.round((list.filter((x) => x <= v).length / Math.max(1, list.length)) * 100);
const gapOf = new Map<string, { performancePct: number; pricePct: number; gap: number } | null>();
for (const role of ["batter", "bowler", "all-rounder", "wicketkeeper"] as const) {
  const peers = evidenced.filter((p) => p.role === role);
  const rars = peers.map((p) => p.performance.rar as number), prices = peers.map((p) => p.market.lakh as number);
  for (const p of peers) {
    const a = pct(p.performance.rar as number, rars), b = pct(p.market.lakh, prices);
    gapOf.set(p.id, { performancePct: a, pricePct: b, gap: a - b });
  }
}
const scarcity = Object.fromEntries((["batter", "bowler", "all-rounder", "wicketkeeper"] as const).map((role) => {
  const peers = evidenced.filter((p) => p.role === role);
  const prices = peers.map((p) => p.market.lakh as number).sort((a, b) => a - b);
  return [role, { players: peers.length, aboveReplacement: peers.filter((p) => (p.performance.rar as number) > 0).length, strong: peers.filter((p) => (p.performance.rar as number) >= 1).length, medianPredictedLakh: prices[Math.floor(prices.length / 2)] ?? null }];
}));

const FEATURE_VECTOR = ["rarBat", "rarBowl", "ballsFacedPerMatch", "ballsBowledPerMatch", "ppOvers", "deathOvers"];
const vecOf = (p: (typeof players)[number]) => FEATURE_VECTOR.map((k) => Number(p.performance[k] ?? 0));
const sds = FEATURE_VECTOR.map((_, i) => { const v = evidenced.map((p) => vecOf(p)[i]); const mean = v.reduce((s, x) => s + x, 0) / v.length; return Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length) || 1; });
const comparablesOf = (p: (typeof players)[number]) => {
  const a = vecOf(p);
  return evidenced.filter((q) => q.id !== p.id && q.role === p.role)
    .map((q) => { const b = vecOf(q); return { q, d: Math.sqrt(a.reduce((s, x, i) => s + ((x - b[i]) / sds[i]) ** 2, 0) / a.length) }; })
    .sort((x, y) => x.d - y.d).slice(0, 6)
    .map(({ q, d }) => ({ id: q.id, name: q.name, similarity: Math.round(Math.exp(-d * d) * 100), rar: q.performance.rar, predictedLakh: q.market.lakh, betterValue: (q.performance.rar as number) >= (p.performance.rar as number) && q.market.lakh < p.market.lakh }));
};

const historyById: Record<string, { season: number; team: string; paidLakh: number; predictedLakh: number }[]> = {};
for (const h of output.history as { season: number; canonicalId: string; team: string; lakh: number; pred: number }[]) {
  (historyById[h.canonicalId] ??= []).push({ season: h.season, team: h.team, paidLakh: h.lakh, predictedLakh: h.pred });
}

const strength = strengthValidation();
const cutoff = new Date(Math.max(...getBallColumns().matches.map((m) => Date.parse(m.date)))).toISOString().slice(0, 10);
const body = {
  generatedAt: new Date().toISOString(), dataCutoff: cutoff, ratedThrough: asOf, targetSeason: TARGET_SEASON,
  governance: {
    identity: identityCoverage(), inputFiles: { warehouse: path.basename(warehousePath()), projectRoot: path.basename(getProjectRoot()) },
    validation: { impact: impactValidation(), auction: output.metrics.auction, retention: output.metrics.retention, sold: output.metrics.sold, squadStrength: strength },
    shrinkage: { batting: r.bat, bowling: r.bowl, replacement: roles },
  },
  scarcity, teams: teamReports, retentionBacktest: output.retentionBacktest,
  squadPlayersWithoutContract: unrecorded.map((id) => ({ id, name: reg.byCanonical.get(id)?.name ?? id, team: playedFor.get(id)!.team })),
  transactionsApplied: [...moved.values()].map((m) => ({ entryId: m.entryId, canonicalId: m.canonicalId, player: m.player, from: m.from, to: m.to, feeLakh: m.feeLakh })),
  retentionModel: {
    performance: { ...perfValidation, chosenLabel: PERF_CONFIGS[perfValidation.chosen].label }, aging, ratedThrough: asOf,
    decisionBacktest: decisionBacktest(output.retentionBacktest.map((r: { season: number; canonicalId: string; retained: number; probability: number }) => ({ ...r, warehouseId: reg.byCanonical.get(r.canonicalId)?.warehouseId ?? null }))),
  },
  players: players.map((p) => ({ ...p, valueGap: gapOf.get(p.id) ?? null, comparables: comparablesOf(p), history: historyById[p.id] ?? [] })),
  salesHistory: historyById,
};
// The version hashes the inputs and everything published. Any changed figure gets a new version, so a version
// never changes meaning and a report that quotes one stays reproducible.
const hasher = crypto.createHash("sha256");
for (const f of [warehousePath(), ...["player-auctions.json", "squads-by-season.json"].map((x) => path.join(process.cwd(), "data", x))]) hasher.update(fs.readFileSync(f));
hasher.update(JSON.stringify({ ...body, generatedAt: "" }));
const version = `cf-intel-${LATEST_SEASON}.${hasher.digest("hex").slice(0, 10)}`;
const snapshot = { version, ...body };
const dir = path.join(dataDir, version);
if (fs.existsSync(dir)) {
  console.log("unchanged: figures match the published version", version);
  process.exit(0);
}
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "snapshot.json"), JSON.stringify(snapshot));
fs.writeFileSync(path.join(dataDir, "current.json"), JSON.stringify({ version, publishedAt: snapshot.generatedAt }, null, 1));
console.log("published", version, "cutoff", cutoff, "players", players.length, "ms", Date.now() - t0);
console.log(JSON.stringify({ impact: snapshot.governance.validation.impact, strength }, null, 1));
console.log(Object.values(teamReports).map((t) => `${t.team} ${t.strength} depth ${t.composition.battingDepth} death ${t.composition.phaseCoverage.death}% ₹${Math.round(t.contractLakh / 100)}Cr ${t.gaps.join("; ")}`).join("\n"));
for (const n of ["JJ Bumrah", "V Kohli", "Rashid Khan", "H Klaasen"]) {
  const p = players.find((x) => x.name === n);
  if (p) console.log(n, p.role, "rar", p.performance.rar, "price", p.market.lakh, p.market.low, p.market.high, "fit", p.fit.slice(0, 3).map((f) => f.team + "+" + f.increment).join(" "), "gap", gapOf.get(p.id)?.gap, "keep", p.retention?.probability);
}

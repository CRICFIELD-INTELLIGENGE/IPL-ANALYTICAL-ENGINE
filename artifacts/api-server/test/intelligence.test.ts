// Player Intelligence: identity, point-in-time features, the optimizer, model status rules, the API and the
// promise that matters most: one player reads the same on every page.
//
//   pnpm --filter @workspace/api-server test

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getRegistry, getResolvedSales, identityCoverage, lookupPlayer, resolveSale } from "../src/services/intelligence/identity";
import { getPlayerSeasons, ratingsAsOf } from "../src/services/intelligence/impact-engine";
import { auctionRow, perfFeatures, TARGET_SEASON } from "../src/services/intelligence/feature-store";
import { bestSide, incrementalValue, SQUAD_RULES, type SquadCandidate } from "../src/services/intelligence/squad-optimizer";
import {
  diagnostics, getSnapshot, getSnapshotVersion, invalidateSnapshot, listPlayers, marketEnvelope, modelStatus, performanceEnvelope, playerIntelligence, retentionEnvelope, setDeskReader, simulateSquad, teamReport,
} from "../src/services/intelligence/service";
import { auctionBoard, auctionIntel } from "../src/services/decision/auction-war-room";
import { executeAnalystTool } from "../src/routes/ai-analyst";
import { getAuctionDeskSnapshot } from "../src/routes/auction-2027";
import { analystToolSchema } from "../src/services/cricfield-analyst";

let server: Server;
let base = "";
before(async () => {
  const { default: app } = await import("../src/app");
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server?.close());

const get = async (p: string) => { const r = await fetch(base + p); return { status: r.status, body: (await r.json()) as any }; };
const post = async (p: string, b: unknown) => { const r = await fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return { status: r.status, body: (await r.json()) as any }; };

/* ─── Identity ───────────────────────────────────────────────────────────── */

test("identity: display name, scorecard name and id all reach one immutable canonical id", () => {
  const a = lookupPlayer("Jasprit Bumrah"), b = lookupPlayer("JJ Bumrah");
  assert.equal(a.status, "verified");
  assert.equal(a.player!.canonicalId, b.player!.canonicalId);
  assert.match(a.player!.canonicalId, /^cs:[0-9a-f]{8}$/);
  assert.equal(lookupPlayer(a.player!.warehouseId!).player!.canonicalId, a.player!.canonicalId);
  assert.equal(lookupPlayer(a.player!.canonicalId).player!.name, "JJ Bumrah");
});

test("identity: two real people with one name are ambiguous and never merged", () => {
  const l = lookupPlayer("Harmeet Singh");
  assert.equal(l.status, "ambiguous");
  assert.equal(l.player, null);
  assert.equal(l.candidates.length, 2);
  assert.notEqual(l.candidates[0].canonicalId, l.candidates[1].canonicalId);
});

test("identity: a loose bio or squad-list match cannot take another player's name", () => {
  assert.equal(lookupPlayer("Jason Roy").player?.name, "JJ Roy");
  assert.equal(lookupPlayer("Ravi Bishnoi").player?.name, "Ravi Bishnoi");
  assert.notEqual(lookupPlayer("AS Roy").player?.fullName, "Jason Roy");
  assert.notEqual(lookupPlayer("Ravi Bishnoi").player?.canonicalId, lookupPlayer("R Bishnoi").player?.canonicalId);
});

test("identity: stub rows are not verified identities and each register id is one player", () => {
  const reg = getRegistry();
  const all = [...reg.byCanonical.values()];
  assert.ok(all.filter((p) => p.identityStatus === "verified").every((p) => p.cricsheetId && !p.cricsheetId.startsWith("json:")));
  const ids = all.filter((p) => p.cricsheetId).map((p) => p.cricsheetId);
  assert.equal(new Set(ids).size, ids.length);
});

test("identity: an unknown name is not_found, never the nearest match", () => {
  assert.equal(lookupPlayer("Prince Choudhary").status, "not_found");
  assert.equal(lookupPlayer("Virat Kohliii").status, "not_found");
});

test("identity: sales link exactly, by the same-season, same-franchise squad row where possible", () => {
  const c = identityCoverage();
  assert.equal(c.salesAmbiguous, 0);
  assert.ok(c.salesBySquadRow / c.rupeeSales > 0.99, "almost every sale links through a squad row");
  assert.equal(resolveSale(2022, "Punjab Kings", "Shikhar Dhawan").link, "squad_row");
  assert.equal(resolveSale(2022, "Punjab Kings", "Definitely Nobody").canonicalId, null);
  assert.ok(getResolvedSales().filter((s) => s.link === "unresolved").length < 15);
});

/* ─── No future information ──────────────────────────────────────────────── */

test("leakage: rewriting every later season changes no rating as of an earlier season", () => {
  const { byPlayer } = getPlayerSeasons();
  const asOf = 2023;
  const snapshot = (r: ReturnType<typeof ratingsAsOf>) => JSON.stringify([...r.players.values()].slice(0, 400).map((p) => [p.playerId, p.batRate, p.bowlRate, p.batRateSd]));
  const before = snapshot(ratingsAsOf(asOf));
  const touched: { l: { batValue: number; batBalls: number; bowlValue: number }; v: [number, number, number] }[] = [];
  for (const ls of byPlayer.values()) for (const l of ls) if (l.season > asOf) {
    touched.push({ l, v: [l.batValue, l.batBalls, l.bowlValue] });
    l.batValue += 500; l.batBalls += 300; l.bowlValue -= 500;
  }
  try {
    assert.ok(touched.length > 500);
    assert.equal(snapshot(ratingsAsOf(asOf)), before);
  } finally {
    for (const { l, v } of touched) { l.batValue = v[0]; l.batBalls = v[1]; l.bowlValue = v[2]; }
  }
});

test("leakage: an auction row knows nothing of its own auction", () => {
  const id = lookupPlayer("Cameron Green").player!.canonicalId;
  const row = auctionRow(id, 2024);
  assert.equal(row.priorLakh, 1750, "the 2023 fee is known in 2024");
  assert.equal(auctionRow(id, 2023).priorLakh ?? null, null, "and unknown before the 2023 auction");
  const f = perfFeatures(lookupPlayer("V Suryavanshi").player!.warehouseId, 2024, null);
  assert.equal(f.matchesCareer, 0, "no matches can appear before the debut season");
});

/* ─── Small samples ──────────────────────────────────────────────────────── */

test("small samples: shrinkage narrows with evidence and thin records are labelled", () => {
  const s = getSnapshot()!;
  const r = ratingsAsOf(s.ratedThrough);
  assert.ok(r.bat.k > 300 && r.bowl.k > 300, "prior weight is measured from the data");
  const rows = [...r.players.values()];
  const thin = rows.find((p) => p.batBallsWeighted > 5 && p.batBallsWeighted < 40)!;
  const deep = rows.reduce((a, b) => (b.batBallsWeighted > a.batBallsWeighted ? b : a));
  assert.ok(thin.batRateSd > deep.batRateSd);
  const limited = s.players.find((p) => (p.performance.sampleMatches ?? 0) > 0 && (p.performance.sampleMatches ?? 0) < 5)!;
  assert.equal(marketEnvelope(s, limited).status, "limited_evidence");
  assert.equal(performanceEnvelope(s, limited).status, "limited_evidence");
});

test("missing data stays null: no birth date, contract or fielding runs are invented", () => {
  const s = getSnapshot()!;
  const noRecord = s.players.find((p) => (p.performance.matchesCareer ?? 0) === 0)!;
  assert.equal(noRecord.performance.rar, null);
  assert.equal(performanceEnvelope(s, noRecord).status, "unavailable");
  assert.equal(marketEnvelope(s, noRecord).status, "limited_evidence");
  assert.equal(noRecord.candidate.evidence, false);
  assert.ok(getRegistry().byCanonical.get(noRecord.id)!.birthDate === null || typeof getRegistry().byCanonical.get(noRecord.id)!.birthDate === "string");
  assert.ok(performanceEnvelope(s, s.players[0]).inputs.missing.includes("fielding runs saved"));
});

test("a player with no auction record reports it, and an inactive player gets no valuation", () => {
  const s = getSnapshot()!;
  const unsoldBefore = s.players.find((p) => p.history.length === 0 && (p.performance.matchesCareer ?? 0) > 10)!;
  const d = playerIntelligence(unsoldBefore.id) as any;
  assert.equal(d.dataStatus.auctionHistory, "missing");
  assert.ok(d.market.inputs.missing.includes("auction history"));
  const gone = playerIntelligence("SK Raina") as any;
  assert.equal(gone.inCurrentPool, false);
  assert.equal(gone.market.status, "unavailable");
  assert.equal(gone.market.value, null);
});

/* ─── Optimizer ──────────────────────────────────────────────────────────── */

const mk = (id: string, o: Partial<SquadCandidate> = {}): SquadCandidate => ({
  id, name: id, rar: 0, rarBat: 0, overseas: false, keeper: false, oversCapacity: 0, bowlingType: "none", battingOption: true, battingSlot: "middle",
  phaseValue: { powerplay: null, middle: null, death: null }, ballsFacedPerMatch: 12, evidence: true, ...o,
});
const pacer = (id: string, value: number, o: Partial<SquadCandidate> = {}) => mk(id, { oversCapacity: 4, bowlingType: "pace", battingOption: false, ballsFacedPerMatch: 2, phaseValue: { powerplay: value, middle: value, death: null }, ...o });
const spinner = (id: string, value: number) => mk(id, { oversCapacity: 4, bowlingType: "spin", battingOption: false, ballsFacedPerMatch: 2, phaseValue: { powerplay: null, middle: value, death: null } });
const slotOf = (i: number) => (["top", "middle", "finish"] as const)[i % 3];
const baseSquad = () => [mk("k", { keeper: true, rarBat: 1 }), ...[1, 2, 3, 4, 5, 6].map((i) => mk(`b${i}`, { rarBat: 2 - i * 0.2, battingSlot: slotOf(i) })), pacer("p1", 0.5), pacer("p2", 0.4), pacer("p3", 0.3), spinner("s1", 0.3), spinner("s2", 0.2), mk("r1"), mk("r2")];

test("optimizer: at most four overseas players, even when overseas players are far better", () => {
  const squad = [...baseSquad(), ...[1, 2, 3, 4, 5, 6].map((i) => mk(`os${i}`, { overseas: true, rarBat: 5, battingSlot: slotOf(i) }))];
  const b = bestSide(squad);
  assert.equal(b.feasible, true);
  assert.equal(b.composition.overseas, SQUAD_RULES.maxOverseasPlaying);
  assert.equal(b.xii.length, 12);
});

test("optimizer: fewer than 12 players, or too few Indians for the overseas limit, is reported as infeasible", () => {
  assert.equal(bestSide(baseSquad().slice(0, 10)).feasible, false);
  const allOverseas = Array.from({ length: 14 }, (_, i) => mk(`o${i}`, { overseas: true }));
  const r = bestSide(allOverseas);
  assert.equal(r.feasible, false);
  assert.match(r.message!, /overseas/);
});

test("optimizer: one player is worth more to the side that lacks that skill", () => {
  const death = pacer("deathman", 0.6, { phaseValue: { powerplay: null, middle: null, death: 2 } });
  const short = baseSquad();
  const covered = [...baseSquad(), pacer("d1", 0.6, { phaseValue: { powerplay: null, middle: null, death: 1.8 } }), pacer("d2", 0.6, { phaseValue: { powerplay: null, middle: null, death: 1.7 } })];
  const a = incrementalValue(short, death), b = incrementalValue(covered, death);
  assert.ok(a.increment > b.increment * 2, `${a.increment} vs ${b.increment}`);
  assert.ok(bestSide(short).gaps.some((g) => /death/.test(g)));
});

test("optimizer: an eighth good batter adds little once the batting slots are full", () => {
  const extra = mk("extra", { rarBat: 1.2 });
  const squad = baseSquad();
  const gain = incrementalValue(squad, extra).increment;
  assert.ok(gain < 1.2, `displaces the weakest batter rather than adding his full value: ${gain}`);
  assert.ok(gain >= 0, "adding a player can never weaken the best side");
});

test("optimizer: a fourth strong opener adds less than the first finisher of the same quality", () => {
  const openers = [1, 2, 3].map((i) => mk(`o${i}`, { rarBat: 3, battingSlot: "top" }));
  const squad = [...baseSquad(), ...openers];
  const another = mk("opener", { rarBat: 3, battingSlot: "top" }), finisher = mk("finisher", { rarBat: 3, battingSlot: "finish" });
  const a = incrementalValue(squad, another).increment, b = incrementalValue(squad, finisher).increment;
  assert.ok(a < b, `${a} vs ${b}`);
  assert.ok(a < 0.01, "no fourth top-order slot exists");
});

test("simulation: buying, releasing and trading recalculate the side; unknown names are refused", () => {
  const add = simulateSquad("PBKS", [{ action: "buy", player: "JJ Bumrah" }]) as any;
  assert.ok(add.after.strength > add.before.strength);
  assert.equal(add.delta, Math.round((add.after.strength - add.before.strength) * 100) / 100);
  const star = getSnapshot()!.teams.RCB.xii[0].name;
  const drop = simulateSquad("RCB", [{ action: "release", player: star }]) as any;
  assert.ok(drop.after.strength <= drop.before.strength);
  const out = getSnapshot()!.teams.RCB.bench[0].name, into = "JJ Bumrah";
  const trade = simulateSquad("RCB", [{ action: "trade", out, in: into }]) as any;
  assert.equal(trade.after.squadSize, trade.before.squadSize);
  assert.equal(trade.steps.length, 1);
  assert.equal((simulateSquad("RCB", [{ action: "buy", player: "Nobody Real" }]) as any).error, "bad_move");
  assert.equal(add.budget.remainingPurseLakh, null, "an unverified purse is never assumed");
});

/* ─── Model claims ───────────────────────────────────────────────────────── */

test("auction model: price and interval are ordered, and it beats both simple benchmarks out of time", () => {
  const s = getSnapshot()!;
  for (const p of s.players) { assert.ok(p.market.low <= p.market.lakh && p.market.lakh <= p.market.high); assert.ok(p.market.lakh > 0); }
  const v = s.governance.validation.auction;
  assert.ok(v.holdout.maeCr < v.benchmarks.roleMedian.maeCr);
  assert.ok(v.holdout.maeCr < v.benchmarks.previousContract.maeCr);
  assert.ok(Math.abs(v.intervalCoverage.measured - 0.8) < 0.06, "80% interval is about 80%");
  assert.deepEqual(v.holdout.seasons, [2024, 2025, 2026]);
});

test("auction model: a player rated beyond almost every past sale is provisional, not a confident prediction", () => {
  const s = getSnapshot()!;
  const bumrah = s.players.find((p) => p.name === "JJ Bumrah")!;
  assert.equal(marketEnvelope(s, bumrah).status, "provisional_estimate");
});

test("retention: a failed calibration gate means a ranking, never a percentage", () => {
  const s = getSnapshot()!;
  const gate = s.governance.validation.retention.probabilityGate;
  const p = s.players.find((x) => x.retention)!;
  const r = retentionEnvelope(s, p);
  if (gate.passed) { assert.equal(r.kind, "probability"); return; }
  assert.equal(r.status, "provisional_estimate");
  assert.equal(r.kind, "index");
  assert.ok(Number.isInteger(r.value) && r.value! >= 0 && r.value! <= 100);
  assert.match(r.units, /not a probability/);
  assert.equal(modelStatus()!.models.retention.status, "provisional_estimate");
});

test("season simulation is off unless squad strength predicts matches; no odds are invented", () => {
  const s = getSnapshot()!;
  const m = modelStatus()!;
  assert.equal(m.models.seasonSimulation.available, s.governance.validation.squadStrength.seasonSimulationGate.passed);
  const t = simulateSquad("MI", []) as any;
  assert.equal(JSON.stringify(t).match(/playoffProbability|titleProbability/), null);
  assert.equal(m.models.fairValue.status, "unavailable");
});

test("the WAR label is not used without a wins conversion", () => {
  const m = modelStatus()!;
  assert.equal(m.models.performance.name, "CricField Runs Above Replacement");
  assert.match(m.models.performance.validation.label, /Not WAR/);
});

test("value is compared as ranks: nothing subtracts rupees from runs", () => {
  const s = getSnapshot()!;
  const p = s.players.find((x) => x.valueGap)!;
  assert.equal(p.valueGap!.gap, p.valueGap!.performancePct - p.valueGap!.pricePct);
  const row = auctionBoard({ view: "live" }).rows.find((r) => r.valueGap !== null && r.valueGap !== undefined)!;
  assert.equal(row.value, null);
  assert.equal(row.maxBid, null);
});

/* ─── One player, every page ─────────────────────────────────────────────── */

test("cross-page: Auction Intelligence, Scout Lab, Squad Builder and player profiles agree", async () => {
  for (const name of ["V Kohli", "JJ Bumrah", "Rashid Khan", "H Klaasen"]) {
    const s = getSnapshot()!;
    const p = s.players.find((x) => x.name === name)!;
    const profile = (await get(`/api/intelligence/players/${encodeURIComponent(p.id)}`)).body;
    const scout = (await get(`/api/intelligence/players?q=${encodeURIComponent(name)}&limit=5`)).body.rows.find((r: any) => r.id === p.id);
    const squad = (await get(`/api/intelligence/teams/${p.team}`)).body.retentionBoard.find((r: any) => r.id === p.id);
    const war = auctionBoard({ view: "live", q: name }).rows.find((r) => r.playerId === p.warehouseId)!;
    const intel = auctionIntel(p.warehouseId!)!;
    const price = profile.market.value;
    assert.equal(price, p.market.lakh);
    assert.equal(scout.priceLakh, price);
    assert.equal(squad.priceLakh, price);
    assert.equal(war.market, price);
    assert.equal(intel.market, price);
    assert.deepEqual(war.marketRange, { low: profile.market.uncertainty.low, high: profile.market.uncertainty.high });
    assert.equal(scout.priceLow, profile.market.uncertainty.low);
    assert.equal(squad.priceHigh, profile.market.uncertainty.high);
    assert.equal(scout.rar, profile.raw.rar);
    assert.equal(squad.rar, profile.raw.rar);
    assert.equal(war.iar, Math.round(profile.raw.rar * 10) / 10);
    assert.equal(scout.retentionBand, profile.retention.band);
    assert.equal(squad.retentionBand, profile.retention.band);
    assert.equal(war.contract, profile.retention.band);
    assert.equal(war.verdict, profile.value.verdict);
    assert.equal(scout.verdict, profile.value.verdict);
    assert.equal(profile.modelVersion, s.version);
    assert.equal(profile.market.modelVersion, s.version);
    assert.equal(profile.retention.modelVersion, s.version);
  }
});

test("cross-page: a franchise's fit in the player record matches the War Room fit for that team", () => {
  const s = getSnapshot()!;
  const p = s.players.find((x) => x.name === "JJ Bumrah")!;
  const fit = (playerIntelligence(p.id) as any).franchise.teams.find((t: any) => t.team === "GT");
  const row = auctionBoard({ view: "live", team: "GT", q: "JJ Bumrah" }).rows.find((r) => r.playerId === p.warehouseId)!;
  assert.equal(row.fit!.score, fit.increment);
  assert.equal(listPlayers({ fitTeam: "GT", q: "JJ Bumrah" })!.rows[0].fit!.increment, fit.increment);
});

test("AI Analyst: valuation tools return the computed values and an unknown player gets none", async () => {
  const s = getSnapshot()!;
  const p = s.players.find((x) => x.name === "JJ Bumrah")!;
  const r = await executeAnalystTool(analystToolSchema.parse({ name: "player_valuation", args: { player: "Jasprit Bumrah" } })) as any;
  assert.equal(r.data.market.value, p.market.lakh);
  assert.equal(r.data.modelVersion, s.version);
  assert.equal(r.data.targetSeason, TARGET_SEASON);
  const miss = await executeAnalystTool(analystToolSchema.parse({ name: "player_valuation", args: { player: "Nobody Real" } })) as any;
  assert.equal(miss.data.unavailable, true);
  const amb = await executeAnalystTool(analystToolSchema.parse({ name: "player_valuation", args: { player: "Harmeet Singh" } })) as any;
  assert.equal(amb.data.clarificationRequired, true);
  const need = await executeAnalystTool(analystToolSchema.parse({ name: "franchise_need", args: { need: "death_bowler" } })) as any;
  assert.ok(need.data.teams.length > 0);
  const value = await executeAnalystTool(analystToolSchema.parse({ name: "best_value", args: {} })) as any;
  assert.ok(value.data.rows.every((x: any) => x.verdict === "Undervalued"));
});

/* ─── Cache, versions, API ───────────────────────────────────────────────── */

test("cache: a new publication replaces the old values and the old version stays readable", () => {
  const live = getSnapshot()!;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cf-intel-"));
  const oldVersion = live.version, newVersion = "cf-intel-test.1";
  try {
    fs.mkdirSync(path.join(tmp, oldVersion));
    fs.mkdirSync(path.join(tmp, newVersion));
    fs.writeFileSync(path.join(tmp, oldVersion, "snapshot.json"), JSON.stringify(live));
    const next = { ...live, version: newVersion, players: live.players.map((p) => ({ ...p, market: { ...p.market, lakh: p.market.lakh + 1 } })) };
    fs.writeFileSync(path.join(tmp, newVersion, "snapshot.json"), JSON.stringify(next));
    fs.writeFileSync(path.join(tmp, "current.json"), JSON.stringify({ version: newVersion }));
    process.env.INTELLIGENCE_DIR = tmp;
    invalidateSnapshot();
    const id = live.players[0].id;
    assert.equal((playerIntelligence(id) as any).modelVersion, newVersion);
    assert.equal((playerIntelligence(id) as any).market.value, live.players[0].market.lakh + 1);
    assert.equal(getSnapshotVersion(oldVersion)!.players[0].market.lakh, live.players[0].market.lakh, "a published figure stays reproducible");
  } finally {
    delete process.env.INTELLIGENCE_DIR;
    invalidateSnapshot();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  assert.equal(getSnapshot()!.version, oldVersion);
});

test("API: every model response carries the required fields", async () => {
  const { body } = await get("/api/intelligence/players/JJ%20Bumrah");
  for (const e of [body.performance, body.market, body.retention, body.soldLikelihood]) {
    for (const k of ["canonicalId", "targetSeason", "modelVersion", "predictionTimestamp", "dataCutoff", "value", "units", "uncertainty", "sampleSize", "inputs", "status", "factors"]) assert.ok(k in e, `${k} missing`);
  }
  for (const route of ["valuation", "retention", "franchise-fit", "comparables", "citation"]) assert.equal((await get(`/api/intelligence/players/JJ%20Bumrah/${route}`)).status, 200, route);
  assert.equal((await get("/api/intelligence/models/status")).status, 200);
  assert.equal((await get("/api/intelligence/diagnostics")).status, 200);
  assert.equal((await get("/api/intelligence/insights")).status, 200);
});

test("API: bad input is refused with a clear status, never a guess or a 500", async () => {
  assert.equal((await get("/api/intelligence/players/Harmeet%20Singh")).status, 409);
  assert.equal((await get("/api/intelligence/players/Nobody%20Real")).status, 404);
  assert.equal((await get("/api/intelligence/players/SK%20Raina/valuation")).status, 404);
  assert.equal((await get("/api/intelligence/players?role=captain")).status, 400);
  assert.equal((await get("/api/intelligence/players?limit=99999")).status, 400);
  assert.equal((await get("/api/intelligence/teams/XYZ")).status, 404);
  assert.equal((await get("/api/intelligence/models/status?version=..%2F..%2Fsecret")).status, 400);
  assert.equal((await post("/api/intelligence/squad/simulate", { team: "XYZ", moves: [] })).status, 400);
  assert.equal((await post("/api/intelligence/squad/simulate", { team: "RCB", moves: [{ action: "steal", player: "x" }] })).status, 400);
  assert.equal((await post("/api/intelligence/squad/simulate", { team: "RCB", moves: [{ action: "buy", player: "Nobody Real" }] })).status, 400);
  assert.equal((await post("/api/intelligence/auction/simulate", { team: "RCB", players: [] })).status, 400);
});

test("auction simulator: a purse is enforced when given and never invented when not", async (t) => {
  // Other suites post verified purses to the desk log; this test is about the case with none on file.
  setDeskReader(() => ({ retentions: [], teams: [] }));
  t.after(() => setDeskReader(getAuctionDeskSnapshot));
  const none = (await post("/api/intelligence/auction/simulate", { team: "RCB", players: [{ player: "JJ Bumrah", bidLakh: 1500 }] })).body;
  assert.equal(none.remainingPurseLakh, null);
  assert.match(none.purseNote, /verified/);
  const some = (await post("/api/intelligence/auction/simulate", { team: "RCB", purseLakh: 500, players: [{ player: "JJ Bumrah", bidLakh: 1500 }] })).body;
  assert.equal(some.lots[0].blocked, "Not enough purse left.");
  assert.equal(some.remainingPurseLakh, 500);
});

test("governance: diagnostics count what exists and flag what does not", () => {
  const d = diagnostics()!;
  assert.equal(d.coverage.players, getSnapshot()!.players.length);
  assert.ok(d.identity.verifiedIdentities > 900);
  assert.ok(d.missingMetrics.includes("Fielding runs saved"));
  assert.equal(teamReport("RCB")!.simulation.available, modelStatus()!.models.seasonSimulation.available);
});

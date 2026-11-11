import rrPredictions from "../data/rr-2027-predictions.json";
// CRICFIELD Retention Room: rules, index, forecast gate, fan ballots, simulator, freezing, and agreement across pages.
// Runs the real app. A local stub stands in for Supabase, so the real token check runs; ballots use an in-memory store.
//
//   pnpm --filter @workspace/api-server test

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { PlatformStore } from "../src/services/platform/store";
import { listFreezes, useRetentionStore, retentionDb } from "../src/services/retention/store";
import { allRules, checkRetained, remainingPurse, retainedCost, rulesFor, votingOpen, type RulePlayer } from "../src/services/retention/rules";
import { CRR_BANDS, CRR_WEIGHTS, granularRole, SENSITIVITY_SETS } from "../src/services/retention/crr";
import { project } from "../src/services/retention/performance";
import type { PlayerSeason } from "../src/services/intelligence/impact-engine";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  allPicks, fanResults, franchiseRoom, freezeAtLock, freezeSeason, getFreeze, history, playerRetention, simulate, teamDilemmas, teamForecast, teamPicks, tradeIntelligence,
} from "../src/services/retention/service";
import { getSnapshot, listPlayers, setDeskReader } from "../src/services/intelligence/service";
import { TEAMS } from "../src/services/intelligence/schema";
import { auctionBoard } from "../src/services/decision/auction-war-room";
import { executeAnalystTool } from "../src/routes/ai-analyst";
import { getAuctionDeskSnapshot } from "../src/routes/auction-2027";
import { analystToolSchema } from "../src/services/cricfield-analyst";

const OPEN = Date.parse("2026-11-03T12:00:00Z");
const realNow = Date.now;
let base = "";
let app: http.Server, supabase: http.Server;
const envBackup = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY, admin: process.env.ADMIN_API_TOKEN };
const ADMIN = "retention-test-admin-token-0001";
let stubUrl = "";
const store = new PlatformStore(":memory:");
// Set per request: other suites change these when the tests share one process.
const useTestEnv = () => { process.env.SUPABASE_URL = stubUrl; process.env.SUPABASE_PUBLISHABLE_KEY = "test-key"; process.env.ADMIN_API_TOKEN = ADMIN; };

before(async () => {
  Date.now = () => OPEN;
  useRetentionStore(store);
  supabase = http.createServer((req, res) => {
    const users: Record<string, object> = {
      "Bearer fan-a": { id: "user-a", email: "a@example.com", email_confirmed_at: "2026-01-01" },
      "Bearer fan-b": { id: "user-b", email: "b@example.com", email_confirmed_at: "2026-01-01" },
      "Bearer unconfirmed": { id: "user-c", email: "c@example.com" },
    };
    const u = users[req.headers.authorization ?? ""];
    res.writeHead(u ? 200 : 401, { "content-type": "application/json" });
    res.end(JSON.stringify(u ?? {}));
  });
  await new Promise<void>((r) => supabase.listen(0, "127.0.0.1", () => r()));
  stubUrl = `http://127.0.0.1:${(supabase.address() as AddressInfo).port}`;
  const { default: api } = await import("../src/app");
  app = api.listen(0);
  await new Promise<void>((r) => app.once("listening", () => r()));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
});
after(() => {
  Date.now = realNow;
  app?.close(); supabase?.close();
  useRetentionStore(null);
  setDeskReader(getAuctionDeskSnapshot);
  const put = (k: string, v?: string) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
  put("SUPABASE_URL", envBackup.url); put("SUPABASE_PUBLISHABLE_KEY", envBackup.key); put("ADMIN_API_TOKEN", envBackup.admin);
});

const get = async (p: string, headers: Record<string, string> = {}) => { useTestEnv(); const r = await fetch(base + p, { headers }); return { status: r.status, body: (await r.json()) as any }; };
const post = async (p: string, b: unknown, headers: Record<string, string> = {}) => { useTestEnv(); const r = await fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(b) }); return { status: r.status, body: (await r.json()) as any }; };
const allRetain = (team: string) => Object.fromEntries(teamPicks(2027, team as any)!.rows.map((p) => [p.id, "retain"]));
/** A complete ballot within the roster limits: keeps the top of the list, releases the rest. */
const legal = (team: string, keep = 15) => Object.fromEntries(teamPicks(2027, team as any)!.rows.map((p, i) => [p.id, i < keep && !p.overseas ? "retain" : "release"]));

/* ─── Rosters and rules ──────────────────────────────────────────────────── */

test("all ten franchises have a squad, and the roster basis is stated, not silently assumed", () => {
  for (const t of TEAMS) {
    const room = franchiseRoom(2027, t)!, picks = teamPicks(2027, t)!;
    assert.ok(picks.rows.length >= 20, `${t} has ${picks.rows.length}`);
    assert.equal(room.rosterBasis.season, 2026);
    assert.match(room.rosterBasis.label, /IPL 2026/);
    assert.ok(picks.rows.every((p) => p.team === t));
    assert.ok(teamForecast(2027, t)!.rows.length === picks.rows.length);
  }
  assert.equal(teamPicks(2026, "RCB"), null, "no other season's roster is substituted");
});

test("squad rows carry display names, so picks saved under them can be matched", () => {
  assert.ok(teamPicks(2027, "CSK")!.rows.find((p) => p.name === "RD Gaikwad")!.aliases.includes("Ruturaj Gaikwad"));
});

test("rules: every season validates and a mini-auction has no retention cap", () => {
  assert.ok(allRules().length >= 3);
  assert.equal(rulesFor(2027)!.cycle, "mini");
  assert.equal(rulesFor(2027)!.maxRetained, null);
  assert.equal(rulesFor(2025)!.cycle, "mega");
  assert.equal(rulesFor(2027)!.auctionPurseLakh, null, "an unverified purse stays null");
  assert.ok(rulesFor(2027)!.assumptions.some((a) => /purse/i.test(a)));
});

const players = (n: number, o: Partial<RulePlayer> = {}): RulePlayer[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, overseas: false, contractLakh: 100, ...o }));

test("rules: seven retained is fine in a mini-auction and a breach in a mega auction", () => {
  assert.deepEqual(checkRetained(rulesFor(2027)!, players(7)).violations, []);
  assert.ok(checkRetained(rulesFor(2025)!, players(7)).violations.some((v) => v.code === "retention_limit"));
  assert.deepEqual(checkRetained(rulesFor(2027)!, players(24)).violations, []);
  assert.ok(checkRetained(rulesFor(2027)!, players(26)).violations.some((v) => v.code === "squad_limit"));
  assert.ok(checkRetained(rulesFor(2027)!, players(9, { overseas: true })).violations.some((v) => v.code === "overseas_limit"));
});

test("purse: mega slabs and mini contracts cost differently, and a missing fact gives unavailable", () => {
  const mega = rulesFor(2025)!, mini = rulesFor(2026)!;
  const five = players(5), one = players(1, { capped: false, id: "u", name: "U" });
  assert.equal(retainedCost(mega, [...five, ...one]).lakh, 7900, "the published 2025 example: five capped and one uncapped cost ₹79 Cr");
  assert.equal(remainingPurse(mini, retainedCost(mini, players(10))).remainingLakh, 11500);
  const gap = retainedCost(mini, [...players(3), { id: "x", name: "No Salary", overseas: false, contractLakh: null }]);
  assert.equal(gap.lakh, null);
  assert.deepEqual(gap.missing, ["No Salary"]);
  assert.equal(remainingPurse(mini, gap).remainingLakh, null);
  assert.equal(remainingPurse(rulesFor(2027)!, retainedCost(rulesFor(2027)!, players(3))).remainingLakh, null, "no verified purse, no number");
});

test("voting lock is enforced from the configured time", () => {
  const r = rulesFor(2027)!;
  assert.equal(votingOpen(r, Date.parse(r.votingLocksAt!) - 1), true);
  assert.equal(votingOpen(r, Date.parse(r.votingLocksAt!)), false);
  assert.equal(votingOpen(rulesFor(2026)!, OPEN), false);
});

/* ─── Index ──────────────────────────────────────────────────────────────── */

test("CRR: eight components total 100; policy adjustment is explicit and reproducible", () => {
  assert.equal(Object.values(CRR_WEIGHTS).reduce((a, b) => a + b, 0), 100);
  for (const p of allPicks()!.picks) {
    assert.equal(p.metrics.length, 8);
    const m = p.metrics.filter((x) => x.fraction !== null);
    const w = m.reduce((a, x) => a + x.max, 0);
    if (w) {
      const base = (100 * m.reduce((a, x) => a + x.max * x.fraction!, 0)) / w;
      assert.ok(Math.abs(base - (p.strategy?.baseIndex ?? p.index)) < 0.6, p.name);
      if (p.strategy) {
        const [low,high] = p.strategy.scoreRange;
        assert.ok(Math.abs(p.index - (low + (high-low)*p.strategy.baseIndex/100)) < .11, p.name);
        assert.equal(p.category, p.strategy.policyCategory);
      }
    }
    assert.equal(p.coverage, w);
    assert.ok(p.index >= 0 && p.index <= 100);
  }
});

test("CRR: missing evidence is left out and declared, never scored as zero", () => {
  const noSalary = allPicks()!.picks.find((p) => !p.contractLakh && p.projection)!;
  const econ = noSalary.metrics.find((m) => m.key === "economics")!;
  assert.equal(econ.fraction, null);
  assert.equal(econ.measured, 0);
  assert.ok(noSalary.limitations.some((l) => /Auction economics/.test(l)));
  for (const p of allPicks()!.picks.filter((x) => !x.projection)) {
    if (p.strategy) { assert.equal(p.confidence, "low"); assert.match(p.strategy.basis, /editorial/i); }
    else assert.equal(p.category, "Insufficient Evidence", p.name);
  }
});

const line = (season: number, matches: number, perMatch: number) => ({ season, matches, batBalls: matches * 18, batValue: matches * perMatch, bowlBalls: 0, bowlValue: 0 }) as unknown as PlayerSeason;

test("CRR: a missing season adds nothing, and a small sample is pulled toward the league prior", () => {
  const w = [1, 0.7, 0.3];
  const gap = project([line(2024, 14, 6), line(2026, 14, 6)], 2026, w, "batter")!;
  const zero = project([line(2024, 14, 6), { ...line(2025, 0, 0) }, line(2026, 14, 6)], 2026, w, "batter")!;
  assert.equal(gap.rar, zero.rar, "a season with no matches is not a season of zeros");
  assert.deepEqual(gap.seasonsUsed, [2024, 2026]);
  const small = project([line(2026, 2, 6)], 2026, w, "batter")!, large = project([line(2026, 40, 6)], 2026, w, "batter")!;
  assert.ok(small.rar < large.rar, "two matches earn less credit than forty at the same rate");
  assert.ok(small.sd > large.sd);
});

test("CRR: tiers follow the published bands; thin evidence cannot reach the top two", () => {
  const top = new Set(["Franchise Cornerstone", "Priority Retain"]);
  for (const p of allPicks()!.picks) {
    if (p.category === "Insufficient Evidence") continue;
    if (p.strategy) { assert.equal(p.category, CRR_BANDS.find(b => p.index >= b.min)!.category); continue; }
    const band = CRR_BANDS.find((b) => p.index >= b.min)!.category;
    if (p.cappedFrom) { assert.equal(p.confidence, "low"); assert.ok(top.has(p.cappedFrom)); assert.equal(p.category, "Strong Retain"); }
    else assert.equal(p.category, band, p.name);
    if (p.confidence === "low") assert.ok(!top.has(p.category), p.name);
  }
});

test("CRR: is never a probability; the only chance shown is a price chance, and it says so", () => {
  for (const p of allPicks()!.picks) {
    assert.ok(!("probability" in p));
    for (const sc of p.scenarios) if (sc.probability) { assert.ok(sc.probability.value >= 0 && sc.probability.value <= 1); assert.match(sc.probability.meaning, /Not a chance of winning/); }
  }
  const bumrah = allPicks()!.picks.find((p) => p.name === "JJ Bumrah")!;
  assert.equal(bumrah.scenarios.find((x) => x.kind === "release_buyback")!.probability, null, "an out-of-range price gives no chance at all");
});

test("CRR: sensitivity tests each tier under other weightings, and V1 stays beside it for comparison", () => {
  for (const p of allPicks()!.picks) {
    assert.equal(p.sensitivity.byWeights.length, Object.keys(SENSITIVITY_SETS).length);
    assert.ok(p.sensitivity.tierStability >= 0 && p.sensitivity.tierStability <= 1);
    assert.ok(p.sensitivity.range[0] <= p.index && p.index <= p.sensitivity.range[1]);
    assert.equal(p.previous?.version, "rri-1.0");
  }
});

test("squads: every player appears once, under his current franchise, and nationality is never guessed", () => {
  const ids = allPicks()!.picks.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  const kuldeep = allPicks()!.picks.find((p) => p.name === "Kuldeep Yadav")!;
  assert.equal(kuldeep.team, "LSG", "a completed trade moves the player");
  assert.ok(!teamPicks(2027, "DC")!.rows.some((p) => p.name === "Kuldeep Yadav"));
  const unknown = getSnapshot()!.players.find((p) => p.overseas === null && p.retentionV2);
  if (unknown) assert.match(granularRole(unknown), /Nationality unverified/);
});

test("trades: completed entries change squads, a reported negotiation stays a hypothetical scenario", () => {
  const t = tradeIntelligence("MI");
  const hardik = t.entries.find((e) => e.id === "2027-hardik-arshdeep")!;
  assert.equal(hardik.changesSquads, false);
  assert.match(hardik.label, /scenario only/);
  assert.ok(hardik.sources.every((x) => /^https:\/\//.test(x.url)));
  const p = allPicks()!.picks.find((x) => x.name === "HH Pandya")!;
  assert.equal(p.team, "MI");
  const sc = p.scenarios.find((x) => x.kind === "trade")!;
  assert.equal(sc.status, "Negotiations Reported");
  assert.match(sc.detail, /^Hypothetical/);
  const pant = tradeIntelligence().entries.find((e) => e.id === "2027-pant-kuldeep")!;
  assert.equal(pant.inSnapshot, true);
  assert.equal(tradeIntelligence().audit.unresolvedPlayers.length, 0);
});

test("trades: the ledger write needs the admin token and a valid status, and keeps the source", async () => {
  const tmp = path.join(os.tmpdir(), `cf-ledger-${process.pid}.json`);
  fs.copyFileSync(path.join(process.cwd(), "data", "retention", "transactions.json"), tmp);
  const prev = process.env.TRANSACTIONS_FILE;
  process.env.TRANSACTIONS_FILE = tmp;
  try {
    const entry = { id: "test-entry", kind: "trade", status: "Rumour", announcedOn: null, moves: [{ player: "JJ Bumrah", from: "MI", to: "CSK", feeLakh: null }], history: [{ status: "Rumour", on: "2026-11-04", sourceUrl: "https://example.com/r" }], sources: [{ publisher: "Example", official: false, url: "https://example.com/r", publishedOn: "2026-11-04" }], lastChecked: "2026-11-04" };
    assert.equal((await post("/api/retention/trades", entry)).status, 401);
    assert.equal((await post("/api/retention/trades", { ...entry, status: "Done" }, { "x-admin-token": ADMIN })).status, 400);
    assert.equal((await post("/api/retention/trades", entry, { "x-admin-token": ADMIN })).status, 201);
    const listed = (await get("/api/retention/trades?team=CSK")).body.entries.find((e: { id: string }) => e.id === "test-entry");
    assert.equal(listed.changesSquads, false);
    assert.equal(allPicks()!.picks.find((x) => x.name === "JJ Bumrah")!.team, "MI", "a rumour moves nobody");
  } finally {
    if (prev === undefined) delete process.env.TRANSACTIONS_FILE; else process.env.TRANSACTIONS_FILE = prev;
  }
});

test("editorial override sits beside the computed score and never replaces it", async () => {
  const row = teamPicks(2027, "RCB")!.rows.find((p) => p.category !== "Insufficient Evidence")!;
  const body = { kind: "override", team: "RCB", player: row.id, category: "Release Candidate", rationale: "A written editorial reason that is long enough for the rule to accept it." };
  assert.equal((await post("/api/retention/2027/editorial", body)).status, 401);
  assert.equal((await post("/api/retention/2027/editorial", { ...body, rationale: "short" }, { "x-admin-token": ADMIN })).status, 400, "a rationale is required");
  assert.equal((await post("/api/retention/2027/editorial", body, { "x-admin-token": ADMIN })).status, 201);
  const after = teamPicks(2027, "RCB")!.rows.find((p) => p.id === row.id)!;
  assert.equal(after.index, row.index);
  assert.equal(after.category, row.category);
  assert.equal(after.editorial!.category, "Release Candidate");
});

test("dilemmas come from real players on the squad, with both sides of the trade-off", () => {
  let total = 0;
  for (const t of TEAMS) {
    const ids = new Set(teamPicks(2027, t)!.rows.map((p) => p.id));
    for (const d of teamDilemmas(2027, t)!) {
      total++;
      assert.ok(ids.has(d.a.id) && ids.has(d.b.id) && d.a.id !== d.b.id);
      assert.ok(d.evidence.length > 0);
      assert.equal(d.opinion, null, "no opinion exists until the desk writes one");
    }
  }
  assert.ok(total >= 10);
});

/* ─── Forecast ───────────────────────────────────────────────────────────── */

test("forecast: the failed gate shows the required message and no percentage anywhere", () => {
  const s = getSnapshot()!;
  assert.equal(s.governance.validation.retention.probabilityGate.passed, false);
  for (const t of TEAMS) {
    const f = teamForecast(2027, t)!;
    assert.equal(f.forecastStatus.available, false);
    assert.equal(f.forecastStatus.message, "Forecast unavailable — insufficient validated evidence.");
    assert.ok(f.rows.every((r) => r.probability === null && r.category === null));
  }
});

test("forecast: validation reports the required measures by season and franchise, all out of time", () => {
  const v = teamForecast(2027, "MI")!.validation;
  for (const k of ["precision", "recall", "brier", "accuracy"]) assert.ok(k in v.classification.holdout);
  assert.deepEqual(v.bySeason.map((x) => x.season), [2021, 2023, 2024, 2026]);
  assert.equal(v.byFranchise.length, 10);
  assert.ok("ece" in v.holdout && "logLoss" in v.holdout);
});

test("forecast: an official decision is labelled confirmed, not predicted", (t) => {
  const p = teamPicks(2027, "CSK")!.rows[0];
  setDeskReader(() => ({ retentions: [{ team: "CSK", player: p.name, decision: "retained", sourceUrl: "https://example.com/official", recordedAt: "2026-11-15T10:00:00Z" }], teams: [] }));
  t.after(() => setDeskReader(getAuctionDeskSnapshot));
  const row = teamForecast(2027, "CSK")!.rows.find((r) => r.id === p.id)!;
  assert.equal(row.confirmed!.decision, "Retained");
  assert.equal(row.provisional, null);
});

/* ─── Ballots ────────────────────────────────────────────────────────────── */

test("ballots: no account or an unconfirmed email cannot vote", async () => {
  const b = { season: 2027, team: "RCB", choices: legal("RCB") };
  assert.equal((await post("/api/retention/ballots", b)).status, 401);
  assert.equal((await post("/api/retention/ballots", b, { authorization: "Bearer nobody" })).status, 401);
  assert.equal((await post("/api/retention/ballots", b, { authorization: "Bearer unconfirmed" })).status, 401);
  assert.equal(fanResults(2027, "RCB")!.totalBallots, 0);
});

test("ballots: one active ballot per user, editable, and counted once", async () => {
  const a = { authorization: "Bearer fan-a" };
  const first = legal("GT");
  assert.equal((await post("/api/retention/ballots", { season: 2027, team: "GT", choices: first }, a)).status, 201);
  assert.equal(fanResults(2027, "GT")!.totalBallots, 1);
  const id = Object.keys(first).find((k) => first[k] === "retain")!;
  const edited = { ...first, [id]: "release" };
  assert.equal((await post("/api/retention/ballots", { season: 2027, team: "GT", choices: edited }, a)).status, 201);
  const res = fanResults(2027, "GT")!;
  assert.equal(res.totalBallots, 1, "a second submission replaces the first");
  assert.equal(res.rows.find((r) => r.id === id)!.retainPct, 0);
  assert.equal(Number((retentionDb().prepare("SELECT count(*) n FROM retention_ballots WHERE team='GT'").get() as { n: number }).n), 1);
  assert.equal((await get("/api/retention/ballots/mine?season=2027&team=GT", a)).body.ballot.choices[id], "release");
  assert.equal((await get("/api/retention/ballots/mine", a)).body.ballots.length, 1);
  assert.equal((await post("/api/retention/ballots", { season: 2027, team: "GT", choices: first }, { authorization: "Bearer fan-b" })).status, 201);
  assert.equal(fanResults(2027, "GT")!.totalBallots, 2);
});

test("ballots: incomplete, unknown-player and rule-breaking lists are refused with reasons", async () => {
  const a = { authorization: "Bearer fan-a" };
  const part = Object.fromEntries(Object.entries(legal("MI")).slice(0, 3));
  const r1 = await post("/api/retention/ballots", { season: 2027, team: "MI", choices: part }, a);
  assert.equal(r1.status, 422);
  assert.equal(r1.body.violations[0].code, "incomplete");
  assert.ok((await post("/api/retention/ballots", { season: 2027, team: "MI", choices: { ...legal("MI"), "cs:notreal": "retain" } }, a)).body.violations.some((v: any) => v.code === "unknown_player"));
  const tooMany = await post("/api/retention/ballots", { season: 2027, team: "CSK", choices: allRetain("CSK") }, a);
  assert.equal(tooMany.status, 422, "all 30 on the list is over the 25-player limit");
  assert.ok(tooMany.body.violations.some((v: any) => v.code === "squad_limit"));
  assert.equal(fanResults(2027, "MI")!.totalBallots, 0);
});

test("ballots: a closed cycle refuses votes", async () => {
  Date.now = () => Date.parse(rulesFor(2027)!.votingLocksAt!) + 1000;
  try {
    assert.equal((await post("/api/retention/ballots", { season: 2027, team: "RR", choices: legal("RR") }, { authorization: "Bearer fan-a" })).status, 409);
  } finally { Date.now = () => OPEN; }
});

test("fan results carry a voting label and no voter identity reaches any public response", async () => {
  const { body, status } = await get("/api/retention/2027/franchises/GT/fan-results");
  assert.equal(status, 200);
  assert.match(body.label, /not statistical retention probabilities/);
  const text = JSON.stringify(body);
  for (const leak of ["example.com", "user-a", "user-b", "email"]) assert.ok(!text.includes(leak), leak);
  assert.equal(JSON.stringify(history()).includes("user-a"), false);
});

/* ─── Simulator ──────────────────────────────────────────────────────────── */

test("simulator: compares the scenarios and recalculates from choices", () => {
  const s = simulate(2027, "RCB")!;
  assert.deepEqual(s.scenarios.map((x) => x.label), ["Current squad", "CRICFIELD Picks"]);
  assert.match(s.fanScenario, /No fan ballots/);
  const cur = s.scenarios[0];
  assert.equal(cur.remainingPurseLakh, null);
  assert.match(cur.purseNote!, /not verified/);
  const star = teamPicks(2027, "RCB")!.rows[0];
  const mine = simulate(2027, "RCB", { [star.id]: "release" })!.scenarios.at(-1)!;
  assert.equal(mine.label, "Your choices");
  assert.equal(mine.retained, cur.retained - 1);
  assert.ok(mine.strength! <= cur.strength!);
  assert.equal(mine.releasedPlayers[0].id, star.id);
  assert.ok(Math.abs(cur.battingValue! + cur.bowlingValue! - cur.strength!) < 0.02);
});

test("simulator: too few retained is reported, never a fake strength; a missing salary blanks the total", () => {
  const keep = teamPicks(2027, "SRH")!.rows.slice(0, 5).map((p) => p.id);
  const all = teamPicks(2027, "SRH")!.rows;
  const thin = simulate(2027, "SRH", Object.fromEntries(all.map((p) => [p.id, keep.includes(p.id) ? "retain" : "release"])))!.scenarios.at(-1)!;
  assert.equal(thin.strength, null);
  assert.match(thin.strengthNote!, /auction has to fill/);
  const cur = simulate(2027, "SRH")!.scenarios[0];
  assert.ok(cur.salaryMissing.length > 0);
  assert.equal(cur.committedLakh, null);
});

/* ─── Accountability ─────────────────────────────────────────────────────── */

test("freeze: a snapshot is immutable, hashed, and later scored against sourced decisions", async (t) => {
  assert.equal((await post("/api/retention/2027/freeze", { reason: "Pre-deadline test freeze" })).status, 401);
  const res = await post("/api/retention/2027/freeze", { reason: "Pre-deadline test freeze" }, { "x-admin-token": ADMIN });
  assert.equal(res.status, 201);
  const id = res.body.id;
  const frozen = getFreeze(id)!;
  assert.equal(frozen.intact, true);
  assert.throws(() => retentionDb().prepare("UPDATE retention_freezes SET payload='{}' WHERE id=?").run(id), /cannot change/);
  assert.throws(() => retentionDb().prepare("DELETE FROM retention_freezes WHERE id=?").run(id), /cannot be deleted/);
  const payload = frozen.payload as any;
  assert.equal(payload.teams.length, 10);
  assert.equal(payload.forecastStatus.available, false);
  assert.ok(payload.rules.cycle && payload.modelVersion && payload.dataCutoff);

  const rcb = payload.teams.find((x: any) => x.team === "RCB");
  const yes = rcb.picks.find((p: any) => p.recommendation === "retain"), no = rcb.picks.find((p: any) => p.recommendation === "release");
  setDeskReader(() => ({ retentions: [
    { team: "RCB", player: yes.name, decision: "retained", sourceUrl: "https://example.com/a", recordedAt: "2026-11-15T10:00:00Z" },
    { team: "RCB", player: no.name, decision: "retained", sourceUrl: "https://example.com/b", recordedAt: "2026-11-15T10:00:00Z" },
  ], teams: [] }));
  t.after(() => setDeskReader(getAuctionDeskSnapshot));
  const h = history();
  const row = h.frozen.find((f) => f.id === id)!;
  assert.equal(row.intact, true);
  assert.equal(row.beforeDecisions, true);
  const team = row.evaluation!.teams.find((x) => x.team === "RCB")!;
  assert.deepEqual([team.picks.right, team.picks.n], [1, 2]);
  assert.equal(team.forecast.n, 0, "no percentages were frozen, so none are scored");
  assert.ok(h.leaderboard.length >= 1);
});

test("freeze: a snapshot taken after decisions began is never scored", (t) => {
  setDeskReader(() => ({ retentions: [{ team: "RCB", player: "V Kohli", decision: "retained", sourceUrl: "https://example.com/a", recordedAt: "2026-11-03T00:00:00Z" }], teams: [] }));
  t.after(() => setDeskReader(getAuctionDeskSnapshot));
  const late = freezeSeason(2027, "Freeze after an announcement", OPEN + 1000)!;
  const row = history().frozen.find((f) => f.id === late.id)!;
  assert.equal(row.beforeDecisions, false);
  assert.equal(row.evaluation, null);
});

test("freeze: the lock freezes once, without the platform worker, and later ticks add nothing", (t) => {
  useRetentionStore(new PlatformStore(":memory:"));
  t.after(() => useRetentionStore(store));
  const lock = Date.parse(rulesFor(2027)!.votingLocksAt!);
  assert.equal(freezeAtLock(lock - 1), null);
  const row = freezeAtLock(lock + 1000)!;
  assert.match(row.reason, /Automatic/);
  assert.equal(freezeAtLock(lock + 61_000), null, "one tick a minute must not stack up snapshots");
  assert.equal(listFreezes(2027).length, 1);
});

test("freeze: nothing happens automatically before the lock, and history keeps retrospective tests apart", () => {
  assert.equal(freezeAtLock(OPEN), null);
  const h = history();
  assert.match(h.retrospective!.label, /Retrospective evaluation/);
  assert.equal(h.retrospective!.bySeason.length, 4);
});

/* ─── Across the site ────────────────────────────────────────────────────── */

test("cross-page: the room, profile, Scout row, War Room and API agree", async () => {
  for (const name of ["V Kohli", "JJ Bumrah", "Rashid Khan"]) {
    const pick = allPicks()!.picks.find((p) => p.name === name)!;
    const api = (await get(`/api/retention/2027/franchises/${pick.team}/picks`)).body.rows.find((r: any) => r.id === pick.id);
    const profile = (await get(`/api/retention/2027/players/${encodeURIComponent(pick.id)}`)).body;
    const scout = listPlayers({ q: name })!.rows[0];
    const war = auctionBoard({ view: "live", q: name }).rows.find((r) => r.playerId === pick.warehouseId)!;
    for (const [i, c] of [[api.index, api.category], [profile.pick.index, profile.pick.category], [scout.retentionIndex, scout.retentionCategory], [war.retentionPick!.index, war.retentionPick!.category]] as const) {
      assert.equal(i, pick.index);
      assert.equal(c, pick.category);
    }
    assert.equal(api.predictedLakh, scout.priceLakh, "the market figure stays the shared one");
  }
  assert.equal(playerRetention("Nobody Real"), null);
});

test("AI Analyst: retention tools return computed values, keep the three outputs apart and invent no percentage", async () => {
  const run = (name: string, args: object) => executeAnalystTool(analystToolSchema.parse({ name, args })) as Promise<any>;
  const picks = await run("retention_picks", { team: "RCB" });
  assert.equal(picks.data.players[0].crr, teamPicks(2027, "RCB")!.rows[0].index);
  assert.ok(!("probability" in picks.data.players[0]));
  assert.match(picks.data.note, /not a chance/);
  const f = await run("retention_forecast", { team: "MI" });
  assert.equal(f.data.forecastStatus.available, false);
  assert.deepEqual(f.data.forecasts, []);
  assert.ok((await run("retention_dilemmas", {})).data.toughest.length > 0);
  assert.match((await run("retention_fans", { team: "GT" })).data.label, /not statistical/);
  assert.throws(() => analystToolSchema.parse({ name: "retention_picks", args: { team: "XXX" } }));
});

test("API: bad input gets a clear status", async () => {
  assert.equal((await get("/api/retention/2027/franchises/XXX/picks")).status, 404);
  assert.equal((await get("/api/retention/2019/franchises/RCB/picks")).status, 404);
  assert.equal((await post("/api/retention/simulate", { season: 2027, team: "XXX" })).status, 400);
  assert.equal((await get("/api/retention/freezes/not-a-real-id")).status, 404);
  assert.equal((await get("/api/retention/seasons")).status, 200);
  assert.equal((await get("/api/retention/summary")).body.teams.length, 10);
});


test("RR strategy CRR: supplied decision policy, computed index and published tier stay consistent", () => {
  const picks = teamPicks(2027, "RR")!;
  const raw = allPicks()!;
  const norm = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "").replace("suryavanshi", "sooryavanshi").replace("amanrao", "amanraoperala").replace("peralaperala", "perala");
  for (const call of rrPredictions.players.filter(p=>p.rosterStatus !== "external-review")) {
    const row = picks.rows.find(p => [p.name, ...p.aliases].some(n => [call.name,...(call.aliases ?? [])].some(alias=>norm(n) === norm(alias))));
    assert.ok(row, `Prediction must resolve to the roster: ${call.name}`);
    assert.equal(row.category, call.category, call.name);
    assert.equal(row.reason, call.reason);
    assert.equal(row.index, raw.byId.get(row.id)!.index, "Published scores come from the shared strategy-aware scorer");
  }
  assert.equal(new Set(rrPredictions.players.map(p => p.name)).size, rrPredictions.players.length);
  assert.equal(rrPredictions.xi.length, 11);
  assert.equal(rrPredictions.xi.filter(n => rrPredictions.players.find(p => p.name === n)!.overseas).length, 4);
  assert.equal(franchiseRoom(2027, "RR")!.counts["Retention Dilemma"], 1);
});

test("RR identity repair: Vaibhav has one salaried canonical record with genuine 2025-26 history", () => {
 const picks = teamPicks(2027,"RR")!;
 const vaibhav = picks.rows.find(p=>p.id === "cs:470f446b")!;
 assert.ok(vaibhav);
 assert.equal(vaibhav.contractLakh,110);
 assert.ok(vaibhav.seasons.some(s=>s.season===2025));
 assert.ok(vaibhav.seasons.some(s=>s.season===2026));
 assert.ok(vaibhav.projection);
 assert.ok(!picks.rows.some(p=>p.id === "sq:vaibhav-sooryavanshi|india"));
 assert.ok(!picks.rows.some(p=>p.name === "Aman Hakim Khan"));
 assert.equal(picks.planning!.coreLocks.length,6);
 assert.equal(picks.planning!.coreCommittedLakh,7360);
 assert.equal(picks.planning!.recommendedCommittedLakh,10795);
 assert.equal(picks.planning!.remainingPurseLakh,null);
 assert.ok(!picks.planning!.unclassifiedPlayers.includes("Aman Rao"));
 const scenarios = simulate(2027,"RR")!.scenarios;
 assert.equal(scenarios.find(s=>s.label === "CRICFIELD Picks")!.retained,20);
 assert.equal(scenarios.find(s=>s.label === "CRICFIELD Picks")!.committedLakh,10795);
 assert.equal(scenarios.find(s=>s.label === "Core locks")!.committedLakh,7360);
 assert.equal(scenarios.find(s=>s.label === "Keep Tushar")!.committedLakh,11445);
 assert.equal(picks.rows.find(p=>p.aliases.includes("Shimron Hetmyer"))!.category,"Priority Retain");
});

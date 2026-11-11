// CRICFIELD Arcade — rules, puzzle integrity and API integration.
//
//   pnpm --filter @workspace/api-server test
//
// Rules tests exercise @workspace/arcade-rules (shared with the browser). Puzzle tests check every factual game
// against the warehouse. API tests run the real Express app with an in-memory platform store and a fake identity.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Router } from "express";
import { routerRequest } from "./helpers/router-request";
import { auction as AU, captain, cup, drs, hand, levelFor, seeded, superOver, xpForLevel, dailyKey } from "@workspace/arcade-rules";

process.env.PLATFORM_DB_PATH = ":memory:";

/* ─── Shared rules ────────────────────────────────────────────────────────── */

test("rng: same seed, same sequence; daily key rolls over at IST midnight", () => {
  const a = seeded("x"), b = seeded("x");
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(seeded("x")(), seeded("y")());
  assert.equal(dailyKey(Date.parse("2026-11-07T18:29:00Z")), "2026-11-07");
  assert.equal(dailyKey(Date.parse("2026-11-07T18:31:00Z")), "2026-11-08");
});

test("hand cricket: wicket on match, runs otherwise, innings switch and chase", () => {
  let m = hand.newHandMatch("s", "rookie", 1, true);
  m = hand.playHandBall(m, 4, 2);
  assert.equal(m.runs, 4);
  m = hand.playHandBall(m, 6, 6);
  assert.equal(m.wickets, 1);
  m = hand.playHandBall(m, 3, 3);
  assert.equal(m.innings, 2, "two wickets end a one-over innings");
  assert.equal(m.target, 5);
  m = hand.playHandBall(m, 1, 5); // computer bats: scores its own number
  assert.equal(m.runs, 5);
  assert.equal(m.result?.winner, "computer");
});

test("hand cricket: computer commits before seeing the player's number", () => {
  for (const personality of ["rookie", "pattern", "aggressive", "expert"] as const) {
    let m = hand.newHandMatch("fair", personality, 5, true);
    for (let i = 0; i < 12 && !m.result; i++) {
      const committed = hand.computerPick(m);
      // The commitment is the same whatever the player is about to choose.
      for (let p = 1; p <= 6; p++) assert.equal(hand.playHandBall(m, p).log.at(-1)!.computer, committed);
      m = hand.playHandBall(m, 1 + (i % 6));
    }
  }
});

test("hand cricket: the expert exploits a predictable player more than the rookie does", () => {
  const wickets = (personality: hand.Personality) => {
    let total = 0;
    for (let s = 0; s < 40; s++) {
      let m = hand.newHandMatch(`p${s}`, personality, 5, true);
      while (m.innings === 1) m = hand.playHandBall(m, 6); // always shows 6
      total += m.firstInnings!.balls;
    }
    return total;
  };
  assert.ok(wickets("expert") < wickets("rookie"), "a one-number player survives fewer balls against the expert");
});

test("hand cricket: replay reproduces a match from the player's numbers", () => {
  let m = hand.newHandMatch("r", "pattern", 2, false);
  const picks: number[] = [];
  for (let i = 0; !m.result && i < 40; i++) { const p = 1 + ((i * 5) % 6); picks.push(p); m = hand.playHandBall(m, p); }
  assert.deepEqual(hand.replayHandMatch("r", "pattern", 2, false, picks).result, m.result);
});

test("super over: legal balls counted, wides re-bowled, two wickets end it", () => {
  let s = superOver.newSuperOver("so-1", "balanced");
  for (let i = 0; i < 30 && !s.result; i++) s = superOver.playSuperBall(s, "loft");
  assert.ok(s.result);
  assert.ok(s.legal <= 6 && s.wickets <= 2);
  const extras = s.balls.filter((b) => b.extra === "wide").length;
  assert.equal(s.balls.length, s.legal + extras + s.balls.filter((b) => b.extra === "noball").length);
  const total = s.balls.reduce((t, b) => t + b.runs, 0);
  assert.equal(total, s.runs);
  assert.deepEqual(superOver.replaySuperOver("so-1", "balanced", undefined, s.balls.map((b) => b.shot ?? "loft")).runs, s.runs);
});

test("super over: odds are a probability distribution and risk/reward differs by shot", () => {
  const block = superOver.shotOdds("yorker", "balanced", "block"), slog = superOver.shotOdds("length", "balanced", "slog");
  assert.ok(Math.abs(block.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(block[5] < slog[5], "a slog is riskier than a block");
  assert.ok(block[4] < slog[4], "and more likely to clear the rope");
});

test("cup chase: outcome is a pure function of delivery and timing", () => {
  const d = cup.cupDelivery("cc", "medium", 0, 0);
  const aim = cup.idealAims(d)[0];
  const perfect = cup.judgeCupBall(d, { swingMs: d.travelMs, aim, loft: true }, "medium");
  assert.equal(perfect.runs, 6);
  assert.equal(perfect.contact, "perfect");
  assert.deepEqual(cup.judgeCupBall(d, { swingMs: d.travelMs, aim, loft: true }, "medium"), perfect, "same input, same result");
  const wayEarly = cup.judgeCupBall(d, { swingMs: d.travelMs - 400, aim, loft: true }, "medium");
  assert.equal(wayEarly.wicket, true);
  // Easy windows are wider than hard ones.
  const off = 60;
  assert.notEqual(cup.judgeCupBall(d, { swingMs: d.travelMs + off, aim, loft: false }, "easy").contact, "late");
  const hard = cup.judgeCupBall(d, { swingMs: d.travelMs + 130, aim, loft: false }, "hard");
  assert.equal(hard.contact, "late");
});

test("cup chase: replay re-judges a whole cup", () => {
  const rounds: cup.CupInput[][] = [0, 1, 2].map((r) => Array.from({ length: 12 }, (_, n) => { const d = cup.cupDelivery("cup2", "easy", r, n); return { swingMs: d.travelMs, aim: cup.idealAims(d)[0], loft: true }; }));
  const r = cup.replayCup("cup2", "easy", rounds);
  assert.equal(r.roundsWon, 3, "perfect timing on every ball wins every round");
});

test("DRS: law conditions and umpire's call", () => {
  const base: drs.DrsScenario = { id: "t", level: 0, hand: "R", onField: "NOT OUT", fullToss: false, shotOffered: true, pitch: { x: 0, distM: 3 }, impact: { x: 0, y: 30, distM: 1 }, stumps: { x: 0, y: 40 } };
  assert.equal(drs.rule(base).decision, "OUT");
  assert.equal(drs.rule({ ...base, pitch: { x: -20, distM: 3 } }).decision, "NOT OUT", "pitched outside leg");
  assert.equal(drs.rule({ ...base, impact: { x: 25, y: 30, distM: 1 } }).decision, "NOT OUT", "outside off with a shot");
  assert.equal(drs.rule({ ...base, shotOffered: false, impact: { x: 25, y: 30, distM: 1 } }).decision, "OUT", "outside off, no shot, hitting");
  assert.equal(drs.rule({ ...base, impact: { x: -25, y: 30, distM: 1 } }).decision, "NOT OUT", "impact outside leg");
  assert.equal(drs.rule({ ...base, stumps: { x: 40, y: 40 } }).wickets, "missing");
  const clipping = { ...base, stumps: { x: 13, y: 40 } };
  assert.equal(drs.rule(clipping).wickets, "umpire's call");
  assert.equal(drs.rule(clipping).decision, "NOT OUT", "umpire's call keeps not out");
  assert.equal(drs.rule({ ...clipping, onField: "OUT" }).decision, "OUT", "umpire's call keeps out");
  // Left-hander: the off side mirrors.
  assert.equal(drs.rule({ ...base, hand: "L", pitch: { x: 20, distM: 3 } }).pitching, "outside leg");
  const sc = drs.drsScenario("d", 3, 2);
  assert.deepEqual(sc, drs.drsScenario("d", 3, 2));
});

const RATES: captain.BaseRates = {
  powerplay: { rates: [0.41, 0.27, 0.04, 0.004, 0.155, 0.04, 0.039, 0.042], balls: 1 },
  middle: { rates: [0.27, 0.45, 0.065, 0.002, 0.09, 0.048, 0.042, 0.032], balls: 1 },
  death: { rates: [0.195, 0.39, 0.086, 0.002, 0.114, 0.081, 0.08, 0.052], balls: 1 },
};
test("captain's call: estimates are distributions with an interval, best option is scored highest", () => {
  const s = captain.SCENARIOS[0];
  const e = captain.estimate(RATES, s, { bowler: "a", plan: "yorkers", field: "balanced" }, "cc");
  assert.ok(e.pSuccess > 0 && e.pSuccess < 1 && e.low <= e.pSuccess && e.high >= e.pSuccess);
  const r = captain.playCall(RATES, s, { bowler: "c", plan: "bouncers", field: "attacking" }, "cc");
  const best = captain.playCall(RATES, s, r.best.choice, "cc");
  assert.ok(best.points - (best.outcome.success ? 40 : 0) >= r.points - (r.outcome.success ? 40 : 0));
});

const lots: AU.Lot[] = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, role: (["BAT", "WK", "AR", "BOWL"] as const)[i % 4], overseas: i % 3 === 0, baseCr: 0.5, valueCr: 1 + (i % 7), rating: 50 + i, team: null }));
test("auction: purse is deducted exactly, caps respected, replay is deterministic", () => {
  let s = AU.newAuction("au", "quick", "CSK", lots);
  const maxes: (number | null)[] = [];
  while (!s.done) { const m = s.index % 4 === 0 ? 4 : null; maxes.push(m); s = AU.resolveLot(s, m).next; }
  for (const b of s.bidders) {
    const spent = s.results.filter((r) => r.winner === b.code).reduce((t, r) => t + r.priceCr, 0);
    assert.ok(Math.abs(AU.MODES.quick.purse - spent - b.purseCr) < 1e-6, `${b.code} purse`);
    assert.ok(b.purseCr >= -1e-9);
    assert.ok(b.squad.length <= s.config.slots);
    assert.ok(b.overseas <= s.config.maxOverseas);
  }
  assert.deepEqual(AU.replayAuction(AU.newAuction("au", "quick", "CSK", lots), maxes).bidders, s.bidders);
});
test("auction: rivals value by need, not at random", () => {
  const s = AU.newAuction("need", "quick", "CSK", lots);
  const rival = s.bidders.find((b) => !b.human)!;
  const lot = s.lots[0];
  const fresh = AU.rivalLimit(s, rival, lot);
  const full = AU.rivalLimit({ ...s, bidders: s.bidders.map((b) => (b === rival ? { ...b, roles: { ...b.roles, [lot.role]: 5 } } : b)) }, { ...rival, roles: { ...rival.roles, [lot.role]: 5 } }, lot);
  assert.ok(full < fresh, "a rival whose role is filled bids less");
});

test("progress: XP levels", () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(xpForLevel(5)), 5);
  assert.equal(levelFor(xpForLevel(5) - 1), 4);
});

/* ─── Factual puzzles against the warehouse ───────────────────────────────── */

test("puzzles: daily puzzles are identical for everyone on a day", async () => {
  const P = await import("../src/services/arcade/puzzles");
  assert.deepEqual(P.hlRound("hl:daily:2026-11-07", 3), P.hlRound("hl:daily:2026-11-07", 3));
  assert.equal(P.guessPuzzle("guess:daily:2026-11-07", "daily").player.id, P.guessPuzzle("guess:daily:2026-11-07", "daily").player.id);
  assert.deepEqual(P.makeGrid("grid:daily:2026-11-07"), P.makeGrid("grid:daily:2026-11-07"));
  assert.notDeepEqual(P.makeGrid("grid:daily:2026-11-07").rows.concat(P.makeGrid("grid:daily:2026-11-07").cols), P.makeGrid("grid:daily:2026-11-08").rows.concat(P.makeGrid("grid:daily:2026-11-08").cols));
});

test("higher or lower: only qualified, comparable records; graded on the server", async () => {
  const P = await import("../src/services/arcade/puzzles");
  const { arcadePlayer } = await import("../src/services/arcade/arcade-data");
  for (let r = 0; r < 30; r++) {
    const q = P.hlRound(`hl-test-${r}`, r);
    assert.notEqual(q.a.id, q.b.id);
    assert.notEqual(q.a.value, q.bValue, "never a tie");
    assert.ok(!("bValue" in P.publicHl(q)), "the answer is not sent");
    const a = arcadePlayer(q.a.id)!;
    if (q.metric.key === "econ") assert.ok(a.bowl && a.bowl.balls >= 600, "economy only for qualified bowlers");
    if (q.metric.key === "runs") assert.equal(q.a.value, a.bat!.runs);
    const g = P.gradeHl(`hl-test-${r}`, r, "higher");
    assert.equal(g.correct, q.bValue > q.a.value);
  }
});

test("guess the cricketer: clues come from verified fields and identify exactly one player", async () => {
  const P = await import("../src/services/arcade/puzzles");
  for (const mode of ["daily", "legends", "current", "prospects"] as const) {
    const z = P.guessPuzzle(`g-${mode}`, mode);
    assert.equal(z.clues.length, 5);
    assert.equal(z.clues[1].text, z.player.country);
    assert.ok(z.clues[2].text.includes(z.player.franchises[0]));
    assert.ok(!z.clues.slice(0, 4).some((c) => c.text.includes(z.player.name)), "the name is not in the clues");
  }
  assert.equal(P.guessScore(1, 0), 100);
  assert.equal(P.guessScore(5, 5), 10);
});

test("cricket grid: every cell has verified answers and a distinct-player fill exists", async () => {
  const P = await import("../src/services/arcade/puzzles");
  for (let i = 0; i < 5; i++) {
    const g = P.makeGrid(`grid-t-${i}`);
    assert.equal(g.rows.length * g.cols.length, 9);
    g.rows.forEach((r, ri) => g.cols.forEach((c, ci) => {
      const ans = P.cellAnswers(r.key, c.key);
      assert.ok(ans.length >= 3);
      assert.ok(P.gradeGridCell(g, ri * 3 + ci, ans[0].id));
    }));
  }
  const g = P.makeGrid("grid-t-0");
  const wrong = P.cellAnswers("team:CSK", "team:CSK").find((p) => !P.gradeGridCell(g, 0, p.id));
  if (wrong) assert.equal(P.gradeGridCell(g, 0, wrong.id), false);
});

test("time machine: champions and cap winners match the warehouse", async () => {
  const P = await import("../src/services/arcade/puzzles");
  const q2016 = P.timeMachineChapter(2016);
  assert.equal(q2016.find((q) => q.kind === "Champion")?.answer, "Sunrisers Hyderabad");
  assert.equal(q2016.find((q) => q.kind === "Orange Cap")?.answer, "Virat Kohli");
  assert.equal(P.timeMachineChapter(2008).find((q) => q.kind === "Champion")?.answer, "Rajasthan Royals");
  for (const s of P.tmSeasons()) for (const q of P.timeMachineChapter(s)) {
    assert.ok(q.options.includes(q.answer));
    assert.equal(new Set(q.options).size, q.options.length, "no duplicate options");
  }
});

test("next ball: question carries no outcome; grading uses the recorded delivery", async () => {
  const P = await import("../src/services/arcade/puzzles");
  const q = P.nbQuestion("nb-t", "death", 0);
  assert.ok(Number(q.over.split(".")[0]) >= 15);
  assert.ok(!JSON.stringify(q).match(/dot|single|four|six|wicket/i), "no outcome words in the question");
  const hits = P.NB_OUTCOMES.map((o) => P.gradeNb("nb-t", "death", 0, o.key).correct);
  assert.equal(hits.filter(Boolean).length, 1, "exactly one outcome is right");
});

test("scout gem: candidates are real, priced and graded transparently", async () => {
  const P = await import("../src/services/arcade/puzzles");
  const g = P.gemProblem("gem-t")!;
  assert.equal(g.candidates.length, 5);
  for (const c of g.candidates) assert.ok(c.balls >= 60 && c.priceCr > 0);
  const top = P.gradeGem(g, P.gradeGem(g, g.candidates[0].id, [])!.modelPick, ["budget"])!;
  assert.ok(top.points >= 60);
});

/* ─── API integration ─────────────────────────────────────────────────────── */

let router: Router;
let currentUser: { id: string; email: string } | null = null;
before(async () => {
  const routes = await import("../src/routes/arcade");
  routes.setArcadeUserResolver(async () => currentUser);
  router = routes.default;
});
async function call(method: string, p: string, payload?: unknown) {
  const result=await routerRequest(router,method,p.replace(/^\/api\/arcade/,""),payload);
  assert.doesNotMatch(JSON.stringify(result.body), /[A-Za-z]:\\|node_modules|at [A-Za-z]+ \(/, `${p} leaks a path or stack`);
  return result;
}

test("api: catalogue lists the six active games; invalid input is a 400", async () => {
  const g = await call("GET", "/api/arcade/games");
  assert.equal(g.body.games.length, 6);
  assert.equal((await call("POST", "/api/arcade/higher-or-lower/start", { mode: "bogus" })).status, 400);
  assert.equal((await call("POST", "/api/arcade/higher-or-lower/not-a-run/guess", { guess: "higher" })).status, 404);
});

test("api: higher or lower never sends the answer and ends on a miss", async () => {
  currentUser = null;
  const s = await call("POST", "/api/arcade/higher-or-lower/start", { mode: "endless" });
  assert.equal(s.status, 200);
  assert.ok(!JSON.stringify(s.body).includes("bValue"));
  let done = false, guesses = 0;
  while (!done && guesses < 40) {
    const r = await call("POST", `/api/arcade/higher-or-lower/${s.body.runId}/guess`, { guess: "higher" });
    assert.equal(r.status, 200);
    done = r.body.done; guesses++;
    if (!r.body.correct) assert.equal(done, true);
  }
  assert.equal((await call("POST", `/api/arcade/higher-or-lower/${s.body.runId}/guess`, { guess: "higher" })).status, 400, "a finished run takes no more guesses");
});

test("api: signed-in daily challenge is one scored attempt, then XP, passport and leaderboard", async () => {
  currentUser = { id: "user-a", email: "a@example.test" };
  const s = await call("POST", "/api/arcade/guess-cricketer/start", { mode: "daily" });
  const again = await call("POST", "/api/arcade/guess-cricketer/start", { mode: "daily" });
  assert.equal(again.body.runId, s.body.runId, "an unfinished daily resumes instead of restarting");
  const end = await call("POST", `/api/arcade/guess-cricketer/${s.body.runId}/give-up`, {});
  assert.equal(end.body.done, true);
  assert.ok(end.body.player.name);
  const third = await call("POST", "/api/arcade/guess-cricketer/start", { mode: "daily" });
  assert.equal(third.body.alreadyCompleted, true, "no second scored attempt");
  const pass = await call("GET", "/api/arcade/passport");
  assert.equal(pass.status, 200);
  assert.ok(pass.body.gamesPlayed >= 1);
  currentUser = { id: "user-b", email: "b@example.test" };
  assert.equal((await call("POST", `/api/arcade/guess-cricketer/${s.body.runId}/clue`, {})).status, 404, "another user cannot touch your run");
  currentUser = null;
  assert.equal((await call("GET", "/api/arcade/passport")).status, 401);
});

test("api: simulation scores are replayed — a forged super over win is rejected", async () => {
  currentUser = { id: "user-c", email: "c@example.test" };
  const s = await call("POST", "/api/arcade/session/start", { game: "super-over", mode: "impossible" });
  const forged = await call("POST", `/api/arcade/session/${s.body.runId}/submit`, { shots: ["block"] }); // one ball cannot finish an over
  assert.equal(forged.status, 400);
  let so = superOver.newSuperOver(s.body.seed, "impossible");
  const shots: superOver.Shot[] = [];
  while (!so.result) { shots.push("drive"); so = superOver.playSuperBall(so, "drive"); }
  const ok = await call("POST", `/api/arcade/session/${s.body.runId}/submit`, { shots });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.detail.runs, so.runs, "server agrees with the browser simulation");
  assert.deepEqual((await call("POST", `/api/arcade/session/${s.body.runId}/submit`, { shots })).body, ok.body, "an identical retry returns the same result without recording twice");
  const board = await call("GET", "/api/arcade/leaderboard/super-over?period=all");
  assert.ok(board.body.top.some((r: { you: boolean }) => r.you));
  assert.ok(!JSON.stringify(board.body).includes("user-c") && !JSON.stringify(board.body).includes("@example"), "no ids or emails on boards");
});

test("api: saves round-trip for signed-in users only", async () => {
  currentUser = { id: "user-d", email: "d@example.test" };
  assert.equal((await call("PUT", "/api/arcade/saves/franchise-gm/slot-1", { stage: "auction", team: "MI" })).status, 200);
  const saves = await call("GET", "/api/arcade/saves/franchise-gm");
  assert.equal(saves.body[0].state.team, "MI");
  currentUser = null;
  assert.equal((await call("PUT", "/api/arcade/saves/franchise-gm/slot-1", {})).status, 401);
});

test("player search: multi-word and partial names find the canonical player", async () => {
  const { searchPlayers } = await import("../src/services/arcade/arcade-data");
  assert.ok(searchPlayers("vinay kumar").some((p) => p.name.includes("Vinay Kumar")));
  assert.equal(searchPlayers("virat kohli")[0].name, "Virat Kohli");
  assert.equal(searchPlayers("V Kohli")[0].name, "Virat Kohli", "scorecard names resolve too");
  assert.deepEqual(searchPlayers("a"), [], "too-short queries return nothing");
});

import { test, before } from "node:test";
import assert from "node:assert/strict";
import type { Router } from "express";
import { cup, hand, superOver as SO } from "@workspace/arcade-rules";
import { routerRequest } from "./helpers/router-request";
import * as R from "../src/services/arcade/rooms";
import * as M from "../src/services/arcade/live-match";
import * as D from "../src/services/arcade/live-auction";
import * as P from "../src/services/arcade/puzzles";
import * as S from "../src/services/arcade/arcade-store";
import { loadLiveState } from "../src/services/arcade/live-state-store";
import {
  acceptsLiveSnapshot,
  serverClockOffset,
} from "../../ipl-analytics/src/lib/arcade/live-snapshot";

process.env.PLATFORM_DB_PATH = ":memory:";
let router: Router;
before(async () => {
  const routes = await import("../src/routes/arcade");
  routes.setArcadeUserResolver(async () => null);
  router = routes.default;
});
const api = (method: string, path: string, body?: unknown) =>
  routerRequest(router, method, path, body);
function duel(game: string) {
  const a = R.create(game, "Host"),
    b = R.join(a.code, game, "Guest");
  R.start(a.code, a.token);
  return { code: a.code, a, b };
}

test("all six games are discoverable, invalid modes are rejected before a session starts", async () => {
  const c = await api("GET", "/games");
  assert.equal(c.body.games.length, 6);
  for (const game of ["cup-chase", "super-over", "hand-cricket"])
    assert.equal(
      (await api("POST", "/session/start", { game, mode: "invalid" })).status,
      400,
    );
  assert.equal(
    (
      await api("POST", "/session/start", {
        game: "super-over",
        mode: "custom",
        params: { target: 100 },
      })
    ).status,
    400,
  );
});

test("Cup Chase rejects unfinished cups and validates both early misses and a complete three-round win", async () => {
  const start = await api("POST", "/session/start", {
    game: "cup-chase",
    mode: "easy",
  });
  assert.equal(start.status, 200);
  const url = `/session/${start.body.runId}/submit`;
  assert.equal((await api("POST", url, { rounds: [[]] })).status, 400);
  const rounds: cup.CupInput[][] = [0, 1, 2].map((round) =>
    Array.from({ length: 12 }, (_, ball) => {
      const d = cup.cupDelivery(start.body.seed, "easy", round, ball);
      return { swingMs: d.travelMs, aim: cup.idealAims(d)[0], loft: true };
    }),
  );
  const win = await api("POST", url, { rounds });
  assert.equal(win.status, 200);
  assert.equal(win.body.detail.roundsWon, 3);
  assert.deepEqual(
    (await api("POST", url, { rounds })).body,
    win.body,
    "network retry is idempotent",
  );
  const early = await api("POST", "/session/start", {
    game: "cup-chase",
    mode: "easy",
  });
  const miss = await api("POST", `/session/${early.body.runId}/submit`, {
    rounds: [
      Array.from({ length: 3 }, () => ({
        swingMs: 0,
        aim: "straight",
        loft: true,
      })),
    ],
  });
  assert.equal(
    miss.status,
    200,
    "an immediate early swing is a valid losing input, not a validation error",
  );
  assert.equal(miss.body.won, false);
});

test("Super Over's whole solo game replays consistently and identical submissions do not score twice", async () => {
  const s = await api("POST", "/session/start", {
    game: "super-over",
    mode: "balanced",
  });
  let state = SO.newSuperOver(s.body.seed, "balanced");
  const shots: SO.Shot[] = [];
  while (!state.result) {
    shots.push("drive");
    state = SO.playSuperBall(state, "drive");
  }
  const first = await api("POST", `/session/${s.body.runId}/submit`, { shots });
  assert.equal(first.status, 200);
  assert.equal(first.body.detail.runs, state.runs);
  assert.deepEqual(
    (await api("POST", `/session/${s.body.runId}/submit`, { shots })).body,
    first.body,
  );
});

test("Hand Cricket: all bot personalities, both innings orders, and three overs settings finish and validate", async () => {
  for (const personality of [
    "rookie",
    "pattern",
    "aggressive",
    "expert",
  ] as const)
    for (const overs of [1, 2, 5] as const)
      for (const batFirst of [true, false]) {
        const s = await api("POST", "/session/start", {
          game: "hand-cricket",
          mode: "quick",
        });
        let state = hand.newHandMatch(
          `${s.body.seed}|m0`,
          personality,
          overs,
          batFirst,
        );
        const picks: number[] = [];
        for (let i = 0; !state.result && i < 80; i++) {
          const n = 1 + (i % 6);
          picks.push(n);
          state = hand.playHandBall(state, n);
        }
        assert(state.result);
        const r = await api("POST", `/session/${s.body.runId}/submit`, {
          personality,
          overs,
          batFirst,
          picks,
          matchNo: 0,
        });
        assert.equal(r.status, 200);
        assert.equal(r.body.seriesOver, true);
      }
});

test("Hand Cricket best-of-three advances exactly once when a match submission is retried", async () => {
  const s = await api("POST", "/session/start", {
    game: "hand-cricket",
    mode: "best-of-three",
  });
  let state = hand.newHandMatch(`${s.body.seed}|m0`, "rookie", 1, true);
  const picks: number[] = [];
  while (!state.result) {
    picks.push(3);
    state = hand.playHandBall(state, 3);
  }
  const payload = {
    personality: "rookie",
    overs: 1,
    batFirst: true,
    picks,
    matchNo: 0,
  };
  const a = await api("POST", `/session/${s.body.runId}/submit`, payload);
  assert.equal(a.status, 200);
  assert.equal(a.body.seriesOver, false);
  assert.deepEqual(
    (await api("POST", `/session/${s.body.runId}/submit`, payload)).body,
    a.body,
  );
  assert.equal(
    S.getRun<{ matches: unknown[] }>(s.body.runId)!.state.matches.length,
    1,
  );
});

test("photo mysteries start in every mode, reveal the right canonical player, and reject repeat guesses", async () => {
  for (const mode of ["daily", "practice", "legends", "current", "prospects"]) {
    const s = await api("POST", "/guess-cricketer/start", { mode });
    assert.equal(s.status, 200);
    assert.match(s.body.photoUrl, /^\/players\//);
    const run = S.getRun(s.body.runId)!;
    const puzzle = P.guessPuzzle(run.seed, mode as P.GuessMode);
    const wrong=P.mysteryCandidates([]).find(id=>id!==puzzle.player.id)!;
    const firstWrong=await api("POST",`/guess-cricketer/${run.id}/answer`,{playerId:wrong});assert.equal(firstWrong.status,200);
    const repeat=await api("POST",`/guess-cricketer/${run.id}/answer`,{playerId:wrong});assert.equal(repeat.status,400);assert.equal(repeat.body.error,"player_already_guessed");
    assert.equal(S.getRun<{wrong:number}>(run.id)!.state.wrong,1,"a repeated guess must not cost another attempt");
    const r = await api("POST", `/guess-cricketer/${run.id}/answer`, {
      playerId: puzzle.player.id,
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.player.name, puzzle.player.name);
  }
});

test("room lobby slots reopen on guest leave; host closure is permanent", () => {
  const host = R.create("hand-cricket", "Host"),
    guest = R.join(host.code, "hand-cricket", "Guest");
  R.leave(host.code, guest.token);
  assert.equal(R.member(host.code, host.token).members.length, 1);
  const replacement = R.join(host.code, "hand-cricket", "Replacement");
  assert.notEqual(replacement.token, guest.token);
  assert.throws(() => R.member(host.code, guest.token));
  R.leave(host.code, host.token);
  assert.throws(() => R.member(host.code, replacement.token), /room_expired/);
});

test("live Hand Cricket hides committed numbers, rejects stale moves, switches innings and declares the winner", () => {
  const d = duel("hand-cricket");
  let v = M.read(d.code, d.a.token);
  for (let i = 0; i < 6; i++) {
    const before = v.round;
    const a = M.action(d.code, d.a.token, {
      type: "hand",
      value: 6,
      round: before,
    });
    assert(a.committed);
    assert(!JSON.stringify(a).includes(d.b.token));
    v = M.action(d.code, d.b.token, { type: "hand", value: 1, round: before });
  }
  assert.equal(v.innings, 1);
  assert.equal(v.seats[0].score, 36);
  assert.throws(
    () => M.action(d.code, d.a.token, { type: "hand", value: 1, round: 0 }),
    /round_changed/,
  );
  for (let i = 0; i < 6; i++) {
    const round = v.round;
    M.action(d.code, d.a.token, { type: "hand", value: 6, round });
    v = M.action(d.code, d.b.token, { type: "hand", value: 1, round });
  }
  assert(v.done);
  assert.equal(v.winner, 0);
  assert.equal(v.seats[1].score, 6);
});

test("live Super Over rejects the wrong role and resolves a full two-innings contest", () => {
  const d = duel("super-over");
  let v = M.read(d.code, d.a.token);
  assert.throws(
    () =>
      M.action(d.code, d.a.token, {
        type: "delivery",
        value: "yorker",
        round: v.round,
      }),
    /choose_shot/,
  );
  for (let i = 0; i < 20 && !v.done; i++) {
    const round = v.round,
      bat = v.innings === 0 ? d.a : d.b,
      bowl = v.innings === 0 ? d.b : d.a;
    M.action(d.code, bat.token, { type: "shot", value: "drive", round });
    v = M.action(d.code, bowl.token, {
      type: "delivery",
      value: "length",
      round,
    });
  }
  assert(v.done);
  assert(v.seats.every((s) => s.balls <= 6 && s.wickets <= 2));
  assert(v.seats.every((s) => s.done));
});

test("Cup Chase checks the release, compensates bounded latency and records a missed ball only once", (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const d = duel("cup-chase");
  let v = M.read(d.code, d.a.token);
  v = M.action(d.code, d.b.token, { type: "bowl", round: v.round });
  assert.throws(
    () => M.action(d.code, d.a.token, { type: "swing", round: v.round }),
    /ball_not_released/,
  );
  const delivery = v.delivery!;
  now = v.releaseAt + delivery.travelMs + 120;
  v = M.action(d.code, d.a.token, {
    type: "swing",
    round: v.round,
    aim: cup.idealAims(delivery)[0],
    swingMs: delivery.travelMs,
  });
  assert.equal(v.seats[0].score, 6);
  v = M.action(d.code, d.b.token, { type: "bowl", round: v.round });
  now = v.releaseAt + v.delivery!.travelMs + 300;
  assert.throws(
    () =>
      M.action(d.code, d.a.token, {
        type: "swing",
        round: v.round,
        swingMs: v.delivery!.travelMs,
      }),
    /timing_out_of_range/,
  );
  now += 1500;
  v = M.read(d.code, d.a.token);
  const balls = v.seats[0].balls;
  assert.equal(balls, 2);
  assert.equal(M.read(d.code, d.a.token).seats[0].balls, balls);
});

test("Grid bot plays legal alternating turns and the complete board uses unique players", (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const b = M.bot("cricket-grid", "You");
  let v = M.read(b.code, b.token);
  for (let i = 0; i < 30 && !v.done; i++) {
    if (v.turn === v.you) {
      const cell = v.filled.findIndex((f) => !f),
        g = v.grid!;
      const p = P.cellAnswers(
        g.rows[Math.floor(cell / 3)].key,
        g.cols[cell % 3].key,
      ).find((p) => !v.used.includes(p.id));
      assert(p);
      v = M.action(b.code, b.token, {
        type: "guess",
        cell,
        playerId: p.id,
        round: v.round,
        move: v.move,
      });
    }
    now += 5000;
    v = M.read(b.code, b.token);
  }
  assert(v.done);
  assert.equal(new Set(v.used).size, v.used.length);
  assert.equal(
    v.seats.reduce((s, p) => s + p.score, 0),
    v.filled.filter(Boolean).length,
  );
});

test("mystery bot reasons from clues once; a finished bot cannot flood the feed or turn a timeout into a draw", (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const b = M.bot("guess-cricketer", "Human");
  let v = M.read(b.code, b.token);
  assert(v.photoUrl);
  for (let i = 0; i < 6 && !v.seats[1].done; i++) {
    now += 10000;
    v = M.read(b.code, b.token);
  }
  assert(v.seats[1].done);
  assert(v.seats[1].score > 0);
  const logCount = v.log.filter((s) => s.includes("Bot solved")).length;
  for (let i = 0; i < 5; i++) {
    now += 5000;
    v = M.read(b.code, b.token);
  }
  assert.equal(v.log.filter((s) => s.includes("Bot solved")).length, logCount);
  now += 125000;
  v = M.read(b.code, b.token);
  assert(v.done);
  assert.equal(v.winner, 1);
});

test("auction setup is atomic, same-franchise selection preserves retentions and solo tables reject human joins", () => {
  const pool = D.pool(),
    host = D.create("Host", false);
  const own = pool.find(
    (p) => p.team === host.you && p.contractCr != null && p.contractCr < 50,
  );
  assert(own);
  D.action(host.code, host.token, { type: "setup", retained: [own.id] });
  assert.deepEqual(
    D.action(host.code, host.token, { type: "setup", team: host.you }).owners[0]
      .retained,
    [own.id],
  );
  assert.throws(
    () =>
      D.action(host.code, host.token, {
        type: "setup",
        team: "MI",
        retained: [own.id],
      }),
    /invalid_retention/,
  );
  assert.equal(D.read(host.code, host.token).you, host.you);
  const solo = D.create("Solo", true);
  assert.throws(() => D.join(solo.code, "Intruder"), /solo_room_is_private/);
});

test("live auction enforces human franchise uniqueness, stale-bid rejection, pause, anti-sniping and one synchronized sale", (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const h = D.create("Host", false),
    g = D.join(h.code, "Guest");
  assert.notEqual(h.you, g.you);
  assert.throws(
    () => D.action(h.code, g.token, { type: "setup", team: h.you }),
    /franchise_taken/,
  );
  let v = D.action(h.code, h.token, { type: "start" });
  const lot = v.state!.lots[0];
  v = D.action(h.code, h.token, {
    type: "bid",
    expectedLot: lot.id,
    expectedPrice: v.price,
  });
  assert.throws(
    () =>
      D.action(h.code, g.token, {
        type: "bid",
        expectedLot: lot.id,
        expectedPrice: 0,
      }),
    /bid_changed/,
  );
  v = D.action(h.code, h.token, { type: "pause" });
  const remaining = v.pauseLeft;
  now += 60000;
  assert.equal(D.read(h.code, g.token).state!.index, 0);
  v = D.action(h.code, h.token, { type: "resume" });
  assert.equal(v.deadline - now, remaining);
  now = v.deadline - 1000;
  v = D.read(h.code, h.token);
  v = D.action(h.code, g.token, {
    type: "bid",
    expectedLot: lot.id,
    expectedPrice: v.price,
  });
  assert(v.deadline - now >= 5000);
  const price = v.price;
  now = v.deadline + 1;
  v = D.read(h.code, h.token);
  assert.equal(v.log[0].winner, g.you);
  assert.equal(v.log[0].priceCr, price);
  assert(
    v.state!.bidders.find((b) => b.code === g.you)!.squad.includes(lot.id),
  );
  assert(v.state!.bidders.every((b) => b.purseCr >= 0));
});

test("auction snapshots are persisted without exposing member credentials; room timing survives pause/nomination", () => {
  const h = D.create("Host", true);
  let v = D.action(h.code, h.token, { type: "start" });
  const persisted = loadLiveState<{ host: string; revision: number }>(
    "auction",
    h.code,
  )!;
  assert.equal(persisted.host, h.token);
  assert.equal(persisted.revision, v.revision);
  assert(!JSON.stringify(v).includes(h.token));
  v = D.action(h.code, h.token, { type: "pause" });
  const target = v.state!.lots[1];
  v = D.action(h.code, h.token, { type: "nominate", lotId: target.id });
  assert.equal(v.pauseLeft, v.rules.seconds * 1000);
  assert.throws(
    () =>
      D.action(h.code, h.token, {
        type: "nominate",
        lotId: v.state!.lots[1].id,
      }),
    /already_nominated/,
  );
});

test("client snapshot ordering rejects delayed polls and clock synchronization uses the request midpoint", () => {
  assert(
    !acceptsLiveSnapshot(
      { revision: 5, serverNow: 100 },
      { revision: 4, serverNow: 200 },
    ),
  );
  assert(
    !acceptsLiveSnapshot(
      { revision: 5, serverNow: 200 },
      { revision: 5, serverNow: 100 },
    ),
  );
  assert(
    acceptsLiveSnapshot(
      { revision: 5, serverNow: 100 },
      { revision: 6, serverNow: 50 },
    ),
  );
  assert.equal(serverClockOffset(1150, 1000, 1200), 50);
});
test("garden mode replays timing, ends at one wicket and rejects unfinished or extra deliveries", async () => {
  const s = await api("POST", "/session/start", {game:"cup-chase",mode:"classic"});
  assert.equal(s.status,200);
  const seed=s.body.seed, url=`/session/${s.body.runId}/submit`;
  const first=cup.classicDelivery(seed,0).travelMs;
  assert.equal(cup.judgeClassicBall(seed,0,first).runs,6);
  assert.equal(cup.judgeClassicBall(seed,0,first+80).runs,4);
  assert.equal((await api("POST",url,{swings:[first]})).status,400);
  assert.equal((await api("POST",url,{swings:[first,null,first]})).status,400);
  const result=await api("POST",url,{swings:[first,null]});
  assert.equal(result.status,200);assert.equal(result.body.score,6);
  assert.equal(result.body.detail.balls,2);
  assert.deepEqual((await api("POST",url,{swings:[first,null]})).body,result.body);
});

// Day 7 — API integration: critical endpoints answer with the expected shape, invalid input is rejected with 4xx
// (never 500), and no response leaks a filesystem path. Runs the real Express app in-process against the warehouse
// (read-only, via the test preload).
//
//   pnpm --filter @workspace/api-server test

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

let server: Server;
let base = "";
before(async () => {
  const { default: app } = await import("../src/app");
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server?.close());

const PATH_LEAK = /[A-Za-z]:\\\\|[A-Za-z]:\\|\/Users\/|\/home\/|node_modules|\.ts:\d+|at [A-Za-z]+ \(/;
async function get(p: string) {
  const res = await fetch(base + p);
  const text = await res.text();
  assert.doesNotMatch(text, PATH_LEAK, `${p} leaks a path or stack`);
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body, text };
}
async function post(p: string, payload: unknown) {
  const res = await fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const text = await res.text();
  assert.doesNotMatch(text, PATH_LEAK, `${p} leaks a path or stack`);
  return { status: res.status, text };
}

test("critical read endpoints: 200 and the fields the web app reads", async () => {
  const cases: [string, (b: any) => void][] = [
    ["/api/healthz", (b) => assert.equal(b.status, "ok")],
    ["/api/ipl/overview", (b) => { assert.equal(b.totalMatches, 1243); assert.ok(b.totalVenues > 0 && b.battingFirstWinPct > 0); }],
    ["/api/ipl/toss-analysis", (b) => assert.ok(b.tossBatDecisionPct > 0 && Array.isArray(b.venueBreakdown))],
    ["/api/ipl/phase-analysis", (b) => assert.ok(b.powerplay.dotBallPct > 0)],
    ["/api/ipl/match/1473469/scorecard", (b) => assert.ok(b && typeof b === "object")],
    ["/api/ipl/stats/query?season=2025", (b) => assert.ok(b.batters.length > 0 && b.bowlers.length > 0)],
    ["/api/scout/rankings?discipline=batting", (b) => { assert.ok(b.data.length > 0); assert.ok(b.pagination.total >= b.data.length); }],
    ["/api/players/135/summary", (b) => assert.equal(b.player.name, "V Kohli")],
    ["/api/intel/player/PW%20Hasaranga", (b) => assert.equal(b.playerId, 331)],
    ["/api/weakness/39", (b) => assert.ok(b.name)],
    ["/api/decision/catalog", (b) => assert.ok(b && typeof b === "object")],
    ["/api/history/overview", (b) => assert.ok(Array.isArray(b.health))],
  ];
  for (const [p, check] of cases) {
    const r = await get(p);
    assert.equal(r.status, 200, `${p} → ${r.status} ${r.text.slice(0, 120)}`);
    check(r.body);
  }
});

test("invalid or unknown input is a 4xx, not a 500", async () => {
  for (const p of [
    "/api/intel/player/nobody-by-this-name",
    "/api/players/99999999/summary",
    "/api/opposition?team=MI",
    "/api/strategy/setup?battingTeam=MI",
    "/api/squad-dna/profile",
    "/api/scout/rankings?discipline=bowling&sortBy=not-a-field",
  ]) {
    const r = await get(p);
    assert.ok(r.status >= 400 && r.status < 500, `${p} → ${r.status} ${r.text.slice(0, 120)}`);
  }
});

test("auction: malformed bodies are rejected with 400 (no crash, no negative raise, no arbitrary speed)", async () => {
  for (const [p, body] of [
    ["/api/auction/join-room", {}],
    ["/api/auction/join-room", { code: "../etc" }],
    ["/api/auction/set-speed", { speed: "abc" }],
    ["/api/auction/set-speed", { speed: 9 }],
    ["/api/auction/bid", { teamId: 1, increment: -50 }],
    ["/api/auction/bid", {}],
    ["/api/auction/chat", { user: 1, msg: null }],
    ["/api/auction/chat", { user: "a", msg: "x".repeat(281) }],
    ["/api/auction/select-team", { teamId: "x" }],
  ] as [string, unknown][]) {
    const r = await post(p, body);
    assert.equal(r.status, 400, `${p} ${JSON.stringify(body)} → ${r.status} ${r.text.slice(0, 120)}`);
  }
  const ok = await post("/api/auction/set-speed", { speed: 2 });
  assert.equal(ok.status, 200);
  const state = await get("/api/auction/state");
  assert.equal(state.body.aiSpeed, 2);
  await post("/api/auction/reset", {});
});

test("an unknown API route is a 404 without a stack trace", async () => {
  const r = await get("/api/this-route-does-not-exist");
  assert.equal(r.status, 404);
});

test("no route answers a 500 with the raw error message (handbook S5/S8)", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "src", "routes");
  const offenders = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))
    .filter((f) => /status\(500\)\.json\(\{\s*error:\s*(err|e|error)\.message/.test(fs.readFileSync(path.join(dir, f), "utf8")));
  assert.deepEqual(offenders, []);
});

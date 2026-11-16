import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const KEY = "k".repeat(40);
let server: Server;
let base = "";

before(async () => {
  process.env.ANALYTICS_GATE_KEY = KEY;
  process.env.CRICFIELD_DB_READONLY = "1";
  process.env.ANALYTICS_MAX_IN_FLIGHT = "1";
  const { default: app } = await import("../src/app");
  server = app.listen(0);
  await new Promise(r => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const get = (path: string, key?: string, init: RequestInit = {}) =>
  fetch(base + path, { ...init, headers: { ...(key ? { "x-cricfield-analytics-key": key } : {}), ...(init.headers ?? {}) } });

test("liveness is public and reveals nothing", async () => {
  const res = await get("/api/healthz");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("no key or a wrong key is refused", async () => {
  assert.equal((await get("/api/stats/query?season=2024")).status, 401);
  assert.equal((await get("/api/stats/query?season=2024", "x".repeat(40))).status, 401);
});

test("only the read-only allowlist is answered", async () => {
  for (const path of ["/api/ask", "/api/platform/me", "/api/retention/simulate", "/", "/data/player-bio.json", "/sqlite.db"]) {
    const res = await get(path, KEY);
    assert.equal(res.status, 404, path);
    assert.match(res.headers.get("content-type") ?? "", /json/);
  }
  assert.equal((await get("/api/stats/query", KEY, { method: "POST" })).status, 404);
});

test("allowed analytics query is served with the key", async () => {
  const res = await get("/api/stats/query?season=2024&phase=Death", KEY);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.batters) && body.batters.length > 0);
});

test("keyed health reports databases and read-only mode", async () => {
  const body = await (await get("/api/analytics/health", KEY)).json();
  assert.equal(body.readOnly, true);
  assert.ok(body.databases.length === 2);
});

// Exercised on the middleware directly: over HTTP, a CPU-bound query blocks the event loop, so the second request
// is not even read until the first finishes. The cap bounds requests parked on async work, not CPU parallelism.
test("in-flight cap returns an explicit busy 503", async () => {
  const { analyticsGate } = await import("../src/lib/analytics-gate");
  const gate = analyticsGate(KEY, { maxInFlight: 1, dbPaths: [] });
  const req = (path: string) => ({ path, method: "GET", originalUrl: path, get: (h: string) => (h === "x-cricfield-analytics-key" ? KEY : undefined) }) as any;
  const res = () => {
    const r: any = { statusCode: 200, headers: {}, listeners: {} as Record<string, () => void> };
    r.on = (e: string, f: () => void) => { r.listeners[e] = f; return r; };
    r.setHeader = (k: string, v: string) => { r.headers[k] = v; };
    r.status = (s: number) => { r.statusCode = s; return r; };
    r.json = (b: unknown) => { r.body = b; return r; };
    return r;
  };
  let nexts = 0;
  const first = res();
  gate(req("/api/stats/query"), first, () => { nexts++; });
  const second = res();
  gate(req("/api/stats/query"), second, () => { nexts++; });
  assert.equal(nexts, 1);
  assert.equal(second.statusCode, 503);
  assert.equal(second.body.error, "analytics_backend_busy");
  first.listeners.finish();
  const third = res();
  gate(req("/api/stats/query"), third, () => { nexts++; });
  assert.equal(nexts, 2, "slot is released when the response finishes");
});

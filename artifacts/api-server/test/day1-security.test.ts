// Day 1 regression tests: filesystem access, admin gating, CORS, rate limiting,
// LLM output validation, and the removal of fabricated AI responses.
//
//   pnpm --filter @workspace/api-server run test
//
// Uses only read access to repository files; never writes to sqlite.db or global.db.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const WEB_SRC = path.join(REPO, "artifacts", "ipl-analytics", "src");
const TOKEN = "test-admin-token-0123456789abcdef";

delete process.env["ADMIN_API_TOKEN"];

let server: Server;
let base = "";

before(async () => {
  const { default: app } = await import("../src/app");
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  delete process.env["ADMIN_API_TOKEN"];
  server?.close();
});

const postJson = (p: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

// ── 1. /api/ipl/sync-csv ────────────────────────────────────────────────────

test("sync-csv: disabled (404) when no admin token is configured, even for a traversal path", async () => {
  delete process.env["ADMIN_API_TOKEN"];
  const res = await postJson("/api/ipl/sync-csv", { filePath: "../../package.json" });
  assert.equal(res.status, 404);
  const text = await res.text();
  assert.ok(!text.includes("package.json"), "response must not echo the requested path");
});

test("sync-csv: 401 without or with a wrong admin token", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  assert.equal((await postJson("/api/ipl/sync-csv", { matchId: "1082591" })).status, 401);
  assert.equal((await postJson("/api/ipl/sync-csv", { matchId: "1082591" }, { "x-admin-token": "wrong" })).status, 401);
});

test("sync-csv: a filePath body is rejected outright, even for an admin", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  for (const filePath of ["../../package.json", "C:/Windows/win.ini", "/etc/passwd", "sqlite.db"]) {
    const res = await postJson("/api/ipl/sync-csv", { filePath }, { "x-admin-token": TOKEN });
    assert.equal(res.status, 400, `filePath ${filePath} must be rejected`);
    const text = await res.text();
    assert.ok(!text.includes("Cricsheet CSV file not found at path"), "no filesystem existence oracle");
  }
});

test("sync-csv: matchId must be numeric; traversal ids are rejected", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  for (const matchId of ["../package", "..\\..\\package", "1082591/../../x", "abc", ""]) {
    const res = await postJson("/api/ipl/sync-csv", { matchId }, { "x-admin-token": TOKEN });
    assert.equal(res.status, 400, `matchId ${JSON.stringify(matchId)} must be rejected`);
  }
  const missing = await postJson("/api/ipl/sync-csv", { matchId: "999999999999" }, { "x-admin-token": TOKEN });
  assert.equal(missing.status, 404);
});

test("sync-csv: an admin can still process a real match by id", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  const res = await postJson("/api/ipl/sync-csv", { matchId: "1082591" }, { "x-admin-token": TOKEN });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { matchId: string; aggregated_metrics: unknown };
  assert.equal(body.matchId, "1082591");
  assert.ok(body.aggregated_metrics !== undefined);
});

test("resolveCricsheetCsv only returns files directly inside ipl_csv/", async () => {
  const { resolveCricsheetCsv, iplCsvDir } = await import("../src/services/csv-dataset");
  for (const bad of ["../package", "..", "/etc/passwd", "C:\\Windows\\win.ini", "1082591.csv", 1082591, null, undefined]) {
    assert.equal(resolveCricsheetCsv(bad as unknown), null, `rejects ${String(bad)}`);
  }
  const ok = resolveCricsheetCsv("1082591");
  assert.ok(ok && path.dirname(ok) === iplCsvDir());
});

// ── 2. Admin auth ───────────────────────────────────────────────────────────

test("admin auth: short tokens are treated as not configured", async () => {
  const { adminEnabled } = await import("../src/lib/admin-auth");
  process.env["ADMIN_API_TOKEN"] = "short";
  assert.equal(adminEnabled(), false);
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  assert.equal(adminEnabled(), true);
  delete process.env["ADMIN_API_TOKEN"];
});

// ── 3. CORS ─────────────────────────────────────────────────────────────────

test("CORS: unknown origins get no Access-Control-Allow-Origin; localhost does (non-production)", async () => {
  const evil = await fetch(base + "/api/healthz", { headers: { origin: "https://evil.example" } });
  assert.equal(evil.status, 200, "server-side response unchanged");
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
  const local = await fetch(base + "/api/healthz", { headers: { origin: "http://localhost:3000" } });
  assert.equal(local.headers.get("access-control-allow-origin"), "http://localhost:3000");
  const { isAllowedOrigin } = await import("../src/app");
  assert.equal(isAllowedOrigin(undefined), true);
  assert.equal(isAllowedOrigin("https://evil.example"), false);
});

// ── 4. Rate limiting ────────────────────────────────────────────────────────

test("rate limit: the (max+1)th request in a window gets 429 with Retry-After", async () => {
  const { rateLimit } = await import("../src/lib/rate-limit");
  const mini = express();
  mini.use(rateLimit({ name: "t", max: 3, windowMs: 60_000 }));
  mini.get("/x", (_q, r) => { r.json({ ok: true }); });
  const s = mini.listen(0);
  await new Promise<void>((r) => s.once("listening", () => r()));
  const url = `http://127.0.0.1:${(s.address() as AddressInfo).port}/x`;
  try {
    for (let i = 0; i < 3; i++) assert.equal((await fetch(url)).status, 200);
    const blocked = await fetch(url);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) >= 1);
  } finally {
    s.close();
  }
});

test("rate limit headers are present on the real API", async () => {
  const res = await fetch(base + "/api/healthz");
  assert.ok(res.headers.get("ratelimit-limit"));
});

// ── 5. LLM output validation (clip router) ──────────────────────────────────

test("clip router: model output can only select catalogue clips; URLs come from the catalogue", async () => {
  const { resolveModelClipChoice, CLIP_CATALOG } = await import("../src/routes/clip-router");
  const evil = resolveModelClipChoice({ matched: true, clip_id: "not-a-real-clip", url: "https://phishing.example" });
  assert.deepEqual(evil, { matched: false, clip_id: null, title: null, url: null });
  if (CLIP_CATALOG.length) {
    const real = CLIP_CATALOG[0];
    const r = resolveModelClipChoice({ matched: true, clip_id: real.id, url: "https://phishing.example", title: "fake" });
    assert.equal(r.url, real.url);
    assert.equal(r.title, real.title);
  }
});

test("clip router: overly long queries are rejected", async () => {
  const res = await postJson("/api/get-clip-route", { query: "x".repeat(201) });
  assert.equal(res.status, 400);
});

// ── 6. No fabricated AI responses ───────────────────────────────────────────

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
}

test("Gemini client: no key → explicit unavailable result with no text and no numbers", async () => {
  installLocalStorage();
  const realFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => { called = true; return new Response(JSON.stringify({error: "AI commentary is not configured"}), {status:503}); }) as typeof fetch;
  try {
    const { askGeminiAnalyst } = await import("../../ipl-analytics/src/lib/gemini-client");
    for (const prompt of ["How to defend 20 in the death overs?", "Kohli vs Bumrah", "anything else"]) {
      const r = await askGeminiAnalyst(prompt);
      assert.equal(r.source, "unavailable");
      assert.equal(r.text, "");
      assert.match(r.error ?? "", /not configured/i);
      assert.ok(!/\d/.test(r.text));
    }
    assert.equal(called, true, "server gateway determines availability without browser credentials");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("Gemini client: API failure → unavailable, never substitute analysis", async () => {
  installLocalStorage({ ipl_gemini_api_key: "AIzaSy-test-key-123456" });
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: "quota exceeded" }), { status: 429 })) as typeof fetch;
  try {
    const { askGeminiAnalyst } = await import("../../ipl-analytics/src/lib/gemini-client");
    const r = await askGeminiAnalyst("Plan the death overs");
    assert.equal(r.source, "unavailable");
    assert.equal(r.text, "");
    assert.match(r.error ?? "", /quota exceeded/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("Gemini client: success uses same-origin gateway without provider credentials", async () => {
  installLocalStorage({ ipl_gemini_api_key: "AIzaSy-test-key-123456" });
  const realFetch = globalThis.fetch;
  let seenUrl = "", seenBody = "", seenKey: string | null = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = String(input);
    seenBody = String(init?.body);
    seenKey = new Headers(init?.headers).get("x-goog-api-key");
    return new Response(JSON.stringify({ source: "live_api", model: "test-model", text: "model says hi" }), { status: 200 });
  }) as typeof fetch;
  try {
    const { askGeminiAnalyst } = await import("../../ipl-analytics/src/lib/gemini-client");
    const r = await askGeminiAnalyst("hello");
    assert.equal(r.source, "live_api");
    assert.equal(r.text, "model says hi");
    assert.ok(!seenUrl.includes("key="), "key must not be in the URL");
    assert.equal(seenKey, null);
    // No context: the evidence-backed analyst, whose strict schema accepts only the prompt.
    assert.equal(seenUrl, "/api/ai/analyst");
    assert.deepEqual(JSON.parse(seenBody), { prompt: "hello" });
    // Selected context: unverified commentary on that context.
    await askGeminiAnalyst("hello", { over: 5 });
    assert.equal(seenUrl, "/api/ai/commentary");
    assert.deepEqual(JSON.parse(seenBody), { prompt: "hello", context: "{\"over\":5}" });
    assert.equal(seenKey, null);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("source scan: fabricated AI statistics and misleading AI labels are gone", () => {
  const read = (p: string) => fs.readFileSync(path.join(WEB_SRC, p), "utf8");
  const gemini = read("lib/gemini-client.ts");
  for (const s of ["generateCalibratedFallback", "Calibrated Quant Engine", "calibrated_model", "+18.4%", "188.4", "VITE_GEMINI_API_KEY"]) {
    assert.ok(!gemini.includes(s), `gemini-client.ts still contains ${s}`);
  }
  const panel = read("components/ai-analyst-panel.tsx");
  for (const s of ["196.3", "6.84", "MI leads 8-4", "62%"]) assert.ok(!panel.includes(s), `ai-analyst-panel.tsx still contains ${s}`);
  assert.ok(!read("pages/ai-analyst-ask.tsx").includes("Official Analytics Partner"));
  assert.ok(!read("pages/pulse.tsx").includes("Math.random"), "Pulse meters must not add random noise");
  const app = read("App.tsx");
  assert.ok(app.includes("ADMIN_PAGES_ENABLED &&"), "photo-pipeline routes must be gated");
});

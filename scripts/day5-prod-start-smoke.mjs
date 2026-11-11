// Day 5 — production startup smoke test of the BUILT API (artifacts/api-server/dist/index.mjs).
//
//   node scripts/day5-prod-start-smoke.mjs <copy-of-sqlite.db>
//
// Starts `node --enable-source-maps dist/index.mjs` (exactly the package "start" script) as a child process on a
// free port, pointed at a database COPY via CRICFIELD_DB_PATH (the API writes insight clicks to its warehouse),
// checks API routes, the SPA fallback and that the served /data files equal the source data, then stops it. Also
// checks that bad configuration fails with an understandable message. Never touches the production sqlite.db.

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = path.join(REPO, "artifacts", "api-server");
const dbCopy = path.resolve(process.argv[2] ?? "");
if (!process.argv[2] || !fs.existsSync(dbCopy) || dbCopy === path.join(REPO, "sqlite.db")) {
  console.error("usage: node scripts/day5-prod-start-smoke.mjs <copy-of-sqlite.db>  (never the production file)");
  process.exit(2);
}
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

function start(env) {
  const child = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], { cwd: API, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d)); child.stderr.on("data", (d) => (out += d));
  const exited = new Promise((res) => child.on("exit", (code) => res(code)));
  return { child, exited, log: () => out };
}

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

// 1. Normal start.
const port = await freePort();
const srv = start({ PORT: String(port), CRICFIELD_DB_PATH: dbCopy, CRICFIELD_DB_READONLY: process.env.CRICFIELD_DB_READONLY ?? "", NODE_ENV: "production", ADMIN_API_TOKEN: "", GEMINI_API_KEY: "", GOOGLE_API_KEY: "" });
const base = `http://127.0.0.1:${port}`;
let up = false;
for (let i = 0; i < 120 && !up; i++) { try { up = (await fetch(base + "/api/healthz")).ok; } catch { await new Promise((r) => setTimeout(r, 500)); } }
check("built server starts and /api/healthz answers", up, up ? `port ${port}` : srv.log().slice(-500));
if (up) {
  const j = async (p, init) => { const r = await fetch(base + p, init); let b = null; const t = await r.text(); try { b = JSON.parse(t); } catch { b = t; } return { s: r.status, b, t, h: r.headers }; };
  const stats = await j("/api/ipl/stats/query?season=2025");
  check("SQL-backed stats route (ESM bundle, lib/db via CRICFIELD_DB_PATH)", stats.s === 200 && Array.isArray(stats.b?.bowlers) && stats.b.bowlers.length > 0, `status ${stats.s}, bowlers ${stats.b?.bowlers?.length}`);
  const hist = await j("/api/history/overview");
  const bowl = hist.b?.health?.find?.((h) => h.id === "bowling-reconcile");
  check("decision DB route reads the corrected warehouse", hist.s === 200 && bowl?.value === "Exact match", `bowling-reconcile: ${bowl?.value}`);
  const sum = await j("/api/players/39/summary");
  check("player summary route", sum.s === 200 && sum.b?.player?.name === "JJ Bumrah", `status ${sum.s}`);
  const card = await j("/api/ipl/match/1082591/scorecard");
  check("match card route (raw Cricsheet JSON on disk)", card.s === 200, `status ${card.s}`);
  const spa = await j("/players/v-kohli");
  check("SPA fallback serves index.html for a client route", spa.s === 200 && /<div id="root"|<!doctype html/i.test(spa.t), `status ${spa.s}`);
  const servedBio = await fetch(base + "/data/player-bio.json").then((r) => r.text());
  const srcBio = fs.readFileSync(path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "player-bio.json"), "utf8");
  check("served /data/player-bio.json equals the corrected source", servedBio === srcBio, `${servedBio.length} vs ${srcBio.length} bytes`);
  const admin = await j("/api/ipl/sync-csv", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchId: "1082591" }) });
  check("admin route hidden when ADMIN_API_TOKEN is unset", admin.s === 404, `status ${admin.s}`);
  const ai = await j("/api/healthz");
  check("server stays up without AI keys", ai.s === 200);
  check("no stale-frontend warning at startup", !/Frontend build is older/.test(srv.log()));
  check("no unhandled errors in the server log", !/Unhandled|TypeError|ReferenceError|ERR_MODULE_NOT_FOUND/.test(srv.log()), srv.log().match(/(Unhandled|TypeError|ReferenceError|ERR_MODULE_NOT_FOUND)[^\n]*/)?.[0] ?? "");
}
srv.child.kill(); await srv.exited;

// 2. Bad configuration produces an understandable failure.
const bad = start({ PORT: "abc", CRICFIELD_DB_PATH: dbCopy });
const code = await Promise.race([bad.exited, new Promise((r) => setTimeout(() => r("timeout"), 20000))]);
if (code === "timeout") bad.child.kill();
check("invalid PORT exits with a clear message", code !== 0 && code !== "timeout" && /Invalid PORT value: "abc"/.test(bad.log()), bad.log().match(/Invalid PORT[^\n]*/)?.[0] ?? `exit ${code}`);

const port2 = await freePort();
const missing = start({ PORT: String(port2), CRICFIELD_DB_PATH: path.join(path.dirname(dbCopy), "does-not-exist.db") });
let r2 = null;
for (let i = 0; i < 60 && !r2; i++) { try { r2 = await fetch(`http://127.0.0.1:${port2}/api/history/overview`); } catch { await new Promise((r) => setTimeout(r, 500)); } }
const body2 = r2 ? await r2.text() : "";
check("missing warehouse file: 503 with a clear message, no server path in the response", !!r2 && r2.status === 503 && /warehouse_unavailable/.test(body2) && !body2.includes(path.dirname(dbCopy).slice(3)) && !/[A-Za-z]:\\\\|\/Users\//.test(body2), r2 ? `status ${r2.status}: ${body2.slice(0, 160)}` : missing.log().slice(-300));
  await new Promise((r) => setTimeout(r, 1500)); // pino writes asynchronously
  check("missing warehouse file: full error is in the server log", /IPL warehouse unavailable/.test(missing.log()));
missing.child.kill(); await missing.exited;
if (fs.existsSync(path.join(path.dirname(dbCopy), "does-not-exist.db"))) console.log("NOTE: a missing CRICFIELD_DB_PATH file was CREATED by the server (lib/db opens read-write)");

fs.writeFileSync(path.join(REPO, "docs", "day05", "prod-start-smoke.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

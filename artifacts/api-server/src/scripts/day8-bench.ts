// Day 8 — endpoint latency benchmark: cold (first request in a fresh process) and warm (median of the next 3),
// plus payload size. Runs the real Express app in-process against a database COPY.
//
//   CRICFIELD_DB_READONLY=1 CRICFIELD_DB_PATH=<copy.db> tsx src/scripts/day8-bench.ts <out.json>

import fs from "node:fs";
import type { AddressInfo } from "node:net";

const ENDPOINTS = [
  "/api/healthz",
  "/api/ipl/overview",
  "/api/ipl/matches",
  "/api/ipl/match/1473469/scorecard",
  "/api/ipl/player-career-stats",
  "/api/ipl/player-season-stats",
  "/api/ipl/top-batters",
  "/api/ipl/squads-by-season",
  "/api/ipl/player-images",
  "/api/ipl/stats/query",
  "/api/ipl/stats/query?season=2025",
  "/api/ipl/team-analytics?team=Mumbai%20Indians",
  "/api/ipl/venue-analytics?venue=Wankhede%20Stadium",
  "/api/ipl/toss-analysis",
  "/api/ipl/phase-analysis",
  "/api/scout/rankings?discipline=batting",
  "/api/scout/player/456",
  "/api/players/135/summary",
  "/api/intel/player/V%20Kohli",
  "/api/weakness/39",
  "/api/pressure/leaders",
  "/api/history/overview",
  "/api/insights/daily",
  "/api/opposition?team=MI&opponent=CSK",
  "/api/squad-dna/profile?team=CSK",
  "/api/pool/135",
  "/api/war-room/board",
];

async function main() {
  if (!process.env.CRICFIELD_DB_PATH) throw new Error("set CRICFIELD_DB_PATH to a database COPY");
  const out = process.argv[2] ?? "bench.json";
  const { default: app } = await import("../app");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const time = async (p: string) => {
    const t = performance.now();
    const res = await fetch(base + p);
    const buf = await res.arrayBuffer();
    return { ms: performance.now() - t, status: res.status, bytes: buf.byteLength };
  };
  const rows = [];
  for (const p of ENDPOINTS) {
    const cold = await time(p);
    const warm = [await time(p), await time(p), await time(p)].map((x) => x.ms).sort((a, b) => a - b)[1];
    rows.push({ endpoint: p, status: cold.status, coldMs: Math.round(cold.ms), warmMs: Math.round(warm), kb: Math.round(cold.bytes / 102.4) / 10 });
    console.log(`${String(cold.status).padEnd(4)} cold ${String(Math.round(cold.ms)).padStart(6)} ms  warm ${String(Math.round(warm)).padStart(5)} ms  ${String(Math.round(cold.bytes / 1024)).padStart(6)} kB  ${p}`);
  }
  fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  server.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

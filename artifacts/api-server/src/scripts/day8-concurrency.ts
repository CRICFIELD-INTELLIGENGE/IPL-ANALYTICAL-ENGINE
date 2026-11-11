// Day 8 — concurrency probe: N identical requests fired at once against a fresh in-process app (database COPY).
//
//   CRICFIELD_DB_READONLY=1 CRICFIELD_DB_PATH=<copy.db> tsx src/scripts/day8-concurrency.ts "<path>" [N]

import type { AddressInfo } from "node:net";

async function main() {
  if (!process.env.CRICFIELD_DB_PATH) throw new Error("set CRICFIELD_DB_PATH to a database COPY");
  const p = process.argv[2] ?? "/api/ipl/stats/query?season=2024";
  const n = Number(process.argv[3] ?? 10);
  const { default: app } = await import("../app");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  await fetch(base + "/api/healthz");
  const t0 = performance.now();
  const done = await Promise.all(Array.from({ length: n }, async () => {
    const res = await fetch(base + p);
    await res.arrayBuffer();
    return { status: res.status, ms: performance.now() - t0 };
  }));
  const ms = done.map((d) => d.ms).sort((a, b) => a - b);
  console.log(JSON.stringify({ path: p, n, statuses: [...new Set(done.map((d) => d.status))], firstDoneMs: Math.round(ms[0]), lastDoneMs: Math.round(ms[ms.length - 1]) }));
  server.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

// Bounded load test for the laptop analytics API. Runs a fixed number of requests per concurrency level
// (default 1, 5, 10, 25) against a realistic CricField mix and prints avg / p95 / errors / server memory.
//   node deploy/windows/load-test.mjs --base http://127.0.0.1:5100 --key <ANALYTICS_GATE_KEY> [--per-level 40]
// Refuses non-local targets unless --allow-remote is passed, so it can't be pointed at production by accident.
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "1" : all[i + 1]]] : a), []));
const base = args.base ?? "http://127.0.0.1:5100";
const key = args.key ?? process.env.ANALYTICS_GATE_KEY;
const perLevel = Math.min(200, Number(args["per-level"] ?? 40));
const levels = (args.levels ?? "1,5,10,25").split(",").map(Number).filter(n => n > 0 && n <= 25);
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base) && !args["allow-remote"]) throw new Error("non-local base refused (pass --allow-remote deliberately)");
if (!key) throw new Error("--key or ANALYTICS_GATE_KEY required");

const WORKLOAD = [
  ["batting leaderboard 2024", "/api/stats/query?season=2024"],
  ["bowling, death overs", "/api/stats/query?season=2025&phase=Death"],
  ["season range 2022-2026", "/api/stats/query?seasonFrom=2022&seasonTo=2026&team=RR"],
  ["batter vs bowler", "/api/stats/matchup?batter=V%20Kohli&bowler=Rashid%20Khan"],
  ["venue filter", "/api/stats/query?venue=Wankhede%20Stadium&phase=Powerplay"],
  ["pressure reliability", "/api/stats/pressure-reliability?role=batting&seasonFrom=2022"],
  ["scout rankings PSL", "/api/scout/rankings?competitions=psl&discipline=batting"],
  ["scout rankings SMAT bowling", "/api/scout/rankings?competitions=smat&discipline=bowling&phase=death"],
  ["ask-style chase query", "/api/stats/query?innings=2nd%20Innings%20(Chasing)&minRequiredRate=12&seasonFrom=2022&seasonTo=2026"],
];

const headers = { "x-cricfield-analytics-key": key };
const health = async () => (await fetch(`${base}/api/analytics/health`, { headers })).json();

// --distinct-clients: each worker presents its own forwarded client IP, as browsers do through the Vercel proxy.
// Without it every request shares one rate-limit bucket (one IP), which measures the limiter, not the server.
async function one([label, path], worker) {
  const t = performance.now();
  try {
    const h = args["distinct-clients"] ? { ...headers, "x-cricfield-client-ip": `10.${run}.${Math.floor(worker / 250)}.${(worker % 250) + 1}` } : headers;
    const r = await fetch(base + path, { headers: h, signal: AbortSignal.timeout(60_000) });
    await r.arrayBuffer();
    return { label, ms: performance.now() - t, status: r.status };
  } catch (e) {
    return { label, ms: performance.now() - t, status: e.name };
  }
}

const p95 = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] ?? 0; };
const results = [];
const run = Math.floor(Math.random() * 250); // fresh client addresses per run, so earlier runs do not share rate-limit buckets
for (const c of levels) {
  const before = await health();
  let next = 0;
  const done = [];
  const t0 = performance.now();
  // --uncached: every request is a different delivery-level slice, so the server's result cache never helps.
  const pick = i => args.uncached
    ? ["uncached slice", `/api/stats/query?season=${2008 + ((i + c * 7) % 19)}&battingPosition=${encodeURIComponent(["openers", "3", "4", "5", "6", "7+"][(i + c) % 6])}&run=${c}`]
    : WORKLOAD[i % WORKLOAD.length];
  await Promise.all(Array.from({ length: c }, async (_, worker) => {
    while (next < perLevel) { const i = next++; done.push(await one(pick(i), worker)); }
  }));
  const wall = performance.now() - t0;
  const after = await health();
  const ok = done.filter(d => d.status === 200);
  const cpuMs = ((after.cpuMicros.user + after.cpuMicros.system) - (before.cpuMicros.user + before.cpuMicros.system)) / 1000;
  const row = {
    concurrency: c, requests: done.length,
    avgMs: Math.round(ok.reduce((s, d) => s + d.ms, 0) / Math.max(1, ok.length)), p95Ms: Math.round(p95(ok.map(d => d.ms))),
    errors: done.length - ok.length, errorKinds: [...new Set(done.filter(d => d.status !== 200).map(d => String(d.status)))].join(" ") || "-",
    throughputPerSec: +(done.length / (wall / 1000)).toFixed(2), serverCpuPct: Math.round((cpuMs / wall) * 100), serverRssMb: after.memoryMb.rss,
  };
  results.push(row);
  console.log(JSON.stringify(row));
}
console.table(results);

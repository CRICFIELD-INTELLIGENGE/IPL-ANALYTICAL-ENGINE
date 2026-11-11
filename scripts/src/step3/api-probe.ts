// Step 3 validation — call the API endpoints the economy patch can affect, record status, latency and body.
//
//   tsx src/step3/api-probe.ts --base http://localhost:5055 --out probe.json
//
// Each endpoint is called twice (first call warms caches); both timings are recorded. Read-only requests.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { REPO, parseArgs } from "../global/paths";

const { values } = parseArgs(process.argv.slice(2));
const base = values.get("base") ?? "http://localhost:5055";
const out = values.get("out") ?? "probe.json";
const ipl = new DatabaseSync(path.join(REPO, "sqlite.db"), { readOnly: true });
const id = (name: string) => (ipl.prepare("SELECT player_id FROM players WHERE name = ?").get(name) as { player_id: number }).player_id;
const ask = (perspective: string, metric: string, filters: Record<string, unknown> = {}, order = "desc") =>
  ({ method: "POST", body: { query: { perspective, metric, groupBy: "player", order, sortBy: "metric", limit: 25, filters } } });

const ENDPOINTS: { name: string; path: string; method?: string; body?: unknown; economy: boolean }[] = [
  { name: "ask: bowling economy by player", path: "/api/ask/run", ...ask("bowling", "economy", {}, "asc"), economy: true },
  { name: "ask: bowling economy, death overs 2025", path: "/api/ask/run", ...ask("bowling", "economy", { phase: "death", seasonFrom: 2025, seasonTo: 2025 }, "asc"), economy: true },
  { name: "ask: batting runs by player", path: "/api/ask/run", ...ask("batting", "runs"), economy: false },
  { name: "ask: batting strike rate, powerplay", path: "/api/ask/run", ...ask("batting", "strike_rate", { phase: "powerplay" }), economy: false },
  { name: "advanced stats (legacy): season 2025", path: "/api/stats/query?season=2025", economy: true },
  { name: "advanced stats (legacy): 2025 death overs", path: "/api/stats/query?season=2025&phase=Death", economy: true },
  { name: "player summary: V Kohli", path: `/api/players/${id("V Kohli")}/summary`, economy: false },
  { name: "player summary: JJ Bumrah", path: `/api/players/${id("JJ Bumrah")}/summary`, economy: true },
  { name: "player intel: JJ Bumrah", path: `/api/intel/player/${encodeURIComponent("JJ Bumrah")}`, economy: true },
  { name: "weakness: JJ Bumrah", path: `/api/weakness/${id("JJ Bumrah")}`, economy: true },
  { name: "weakness: V Kohli", path: `/api/weakness/${id("V Kohli")}`, economy: false },
  { name: "squad DNA: CSK 2025", path: "/api/squad-dna/profile?team=Chennai%20Super%20Kings&season=2025", economy: true },
  { name: "dugout franchise: CSK", path: "/api/dugout/franchise?team=Chennai%20Super%20Kings", economy: false },
  { name: "dugout squad: CSK 2025", path: "/api/dugout/squad?team=Chennai%20Super%20Kings&season=2025", economy: true },
  { name: "auction war room board", path: "/api/war-room/board", economy: true },
  { name: "history overview", path: "/api/history/overview", economy: false },
];

const results: { name: string; path: string; economy: boolean; status: number; firstMs: number; warmMs: number; bytes: number; body: unknown }[] = [];
for (const e of ENDPOINTS) {
  const call = async () => {
    const t = performance.now();
    const res = await fetch(base + e.path, e.method === "POST" ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(e.body) } : {});
    const text = await res.text();
    return { status: res.status, ms: performance.now() - t, text };
  };
  const a = await call();
  const b = await call();
  let body: unknown = b.text;
  try { body = JSON.parse(b.text); } catch { /* keep text */ }
  // Strip per-request timing fields so bodies compare on content only.
  body = JSON.parse(JSON.stringify(body, (k, v) => (k === "ms" || k === "generatedAt" || k === "elapsedMs" ? undefined : v)));
  results.push({ name: e.name, path: e.path, economy: e.economy, status: b.status, firstMs: Math.round(a.ms), warmMs: Math.round(b.ms), bytes: b.text.length, body });
  console.log(`${b.status} ${String(Math.round(a.ms)).padStart(6)} ms / ${String(Math.round(b.ms)).padStart(5)} ms  ${e.name}`);
}
fs.writeFileSync(out, JSON.stringify({ base, capturedAt: new Date().toISOString(), results }));

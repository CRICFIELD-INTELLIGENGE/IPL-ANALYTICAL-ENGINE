// Day 6: share of legal deliveries bowled by players whose bowling type is unknown (decision layer metadata).
import { getPlayerMeta } from "../services/decision/player-profiles";
import { queryAll } from "../services/decision/db";
const meta = getPlayerMeta();
const rows = queryAll<{ bowler_id: number; n: number; s: string }>(
  "SELECT d.bowler_id, m.season_id s, SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) n FROM deliveries d JOIN matches m ON m.match_id = d.match_id GROUP BY 1, 2");
const tot: Record<string, number> = {}; let all = 0; const unk = new Map<number, number>(); const bySeason = new Map<string, [number, number]>();
for (const r of rows) {
  const t = meta.get(r.bowler_id)?.bowlingType ?? "unknown";
  tot[t] = (tot[t] ?? 0) + r.n; all += r.n;
  const s = bySeason.get(r.s) ?? [0, 0]; s[1] += r.n; if (t === "unknown") { s[0] += r.n; unk.set(r.bowler_id, (unk.get(r.bowler_id) ?? 0) + r.n); } bySeason.set(r.s, s);
}
console.log(JSON.stringify({ all, byType: tot, unknownPct: Math.round((tot.unknown ?? 0) / all * 10000) / 100, unknownBowlers: unk.size }));
console.log([...unk].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, n]) => `${meta.get(id)?.name} ${n}`).join("; "));
console.log([...bySeason].filter(([, [u]]) => u > 0).map(([s, [u, t]]) => `${s}:${(u / t * 100).toFixed(2)}%`).join(" "));

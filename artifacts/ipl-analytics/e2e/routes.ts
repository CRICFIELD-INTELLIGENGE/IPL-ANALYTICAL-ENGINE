/**
 * The smoke route list, derived from the Day 7 route → API matrix (docs/day07/route-api-matrix.json) so the two
 * cannot drift apart. Grouped entries ("/arena, /beyond-xi") are split, redirect entries ("/on-field → /feed")
 * contribute their source paths, and parameterised routes get the real ids used on Day 7.
 */
import fs from "node:fs";
import path from "node:path";

const MATRIX = path.resolve(import.meta.dirname, "..", "..", "..", "docs", "day07", "route-api-matrix.json");

const PARAMS: Record<string, string[]> = {
  "/match/:id": ["/match/1473469"],
  "/players/:slug": ["/players/v-kohli", "/players/wanindu-hasaranga"],
  "/venues/:slug": ["/venues/wankhede-stadium"],
  "/teams/:slug": ["/teams/mumbai-indians"],
  "/scout/player/:id": ["/scout/player/456"],
  "/dugout/:team": ["/dugout/royal-challengers-bengaluru"],
};

export interface SmokeRoute {
  path: string;
  /** The unknown-route entry: it must render the 404 page. */
  notFound?: boolean;
}

export function loadRoutes(): SmokeRoute[] {
  const matrix = JSON.parse(fs.readFileSync(MATRIX, "utf8")) as { routes: { r: string; note?: string }[] };
  const out: SmokeRoute[] = [];
  for (const entry of matrix.routes) {
    for (const part of entry.r.split(",").map((s) => s.trim())) {
      const source = part.split("→")[0].trim();
      for (const p of source.split("|").map((s) => s.trim())) {
        if (!p.startsWith("/")) continue;
        const concrete = PARAMS[p] ?? (p.includes(":") ? null : [p]);
        if (!concrete) throw new Error(`No smoke id for parameterised route ${p}; add it to PARAMS`);
        for (const c of concrete) out.push({ path: c, notFound: entry.note === "404 page" || undefined });
      }
    }
  }
  return [...new Map(out.map((r) => [r.path, r])).values()];
}

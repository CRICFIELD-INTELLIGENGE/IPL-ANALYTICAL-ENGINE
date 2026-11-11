// Scouting layer — build the derived tables in global.db.
//
//   pnpm --filter @workspace/scripts run scout:build
//
// Recomputes per-innings usage, season roles, per-ball variance and season
// coverage for every competition, then reloads attributes from the named
// sources. Reads the normalized/analytics layers; writes only scout_* tables,
// player_attributes and attribute_link_issues.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import { all, openGlobalDb, setMeta } from "../global/db";
import { buildCompetitionRoles, ROLE_RULES_VERSION } from "./roles";
import { loadEnrichment, type EnrichmentSummary } from "./enrichment";
import { ratePlayers } from "./service";

const SCHEMA = path.join(path.dirname(fileURLToPath(import.meta.url)), "scout-schema.sql");

export function applyScoutSchema(db: DatabaseSync): void {
  db.exec(fs.readFileSync(SCHEMA, "utf8"));
}

export function buildScout(db: DatabaseSync, log: (s: string) => void = () => {}): { enrichment: EnrichmentSummary } {
  applyScoutSchema(db);
  for (const c of all<{ competition_id: number; code: string }>(db, "SELECT competition_id, code FROM competitions ORDER BY competition_id")) {
    const t = performance.now();
    const r = buildCompetitionRoles(db, c.competition_id);
    log(`  ${c.code.padEnd(6)} ${r.battingInnings} batting innings, ${r.bowlingInnings} bowling innings, ${r.roles} season roles (${Math.round(performance.now() - t)} ms)`);
  }
  const enrichment = loadEnrichment(db);
  // Self-check: league adjustment is unbiased, so summed over every player expected = actual.
  for (const d of ["batting", "bowling"] as const) {
    for (const c of all<{ code: string }>(db, "SELECT code FROM competitions")) {
      const rs = ratePlayers(db, { discipline: d, competitions: [c.code], minBalls: 0 });
      const actual = rs.reduce((s, r) => s + (d === "batting" ? r.counts.runs : r.counts.runs_conceded), 0);
      const expected = rs.reduce((s, r) => s + ((r.metrics[d === "batting" ? "strike_rate" : "economy"].league ?? 0) * r.balls) / (d === "batting" ? 100 : 6), 0);
      if (Math.abs(actual - expected) > 1e-6 * Math.max(1, actual)) throw new Error(`league adjustment self-check failed for ${c.code} ${d}: ${expected} vs ${actual}`);
    }
  }
  log("  league-adjustment self-check: expected = actual for every competition (batting and bowling)");
  setMeta(db, "scout_rules_version", ROLE_RULES_VERSION);
  setMeta(db, "scout_built_at", new Date().toISOString());
  return { enrichment };
}

if (process.argv[1] && /build\.ts$/.test(process.argv[1])) {
  const db = openGlobalDb();
  console.log("Building scouting layer");
  const { enrichment: e } = buildScout(db, console.log);
  console.log(`  attributes: player-bio ${e.bio.linked}/${e.bio.rows} linked exactly (${e.bio.noCandidate} no candidate, ${e.bio.ambiguous} ambiguous); ` +
    `auction list ${e.auction.linked}/${e.auction.rows} linked with corroboration (${e.auction.noCandidate} no candidate, ${e.auction.notCorroborated} not corroborated, ${e.auction.ambiguous} ambiguous); ${e.conflicts} conflicts`);
  db.close();
}

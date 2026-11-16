// Data coverage dashboard: every competition in the Scout Lab registry, with counts read from global.db.
//   pnpm --filter @workspace/scripts run global:coverage   → reports/coverage-<date>.md and .json
// Nothing is estimated: "expected" totals appear only where the source publishes one (Cricsheet catalogue count).
import fs from "node:fs";
import path from "node:path";
import { openGlobalDb, all } from "./db";
import { MANIFEST_DIR, REPORT_DIR, ensureDir, today } from "./paths";

type Reg = { id: string; name: string; group: string; warehouseCode: string | null; source: string | null; blocker?: string };

export function coverage() {
  const registry = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, "competition-registry.json"), "utf8")) as { competitions: Reg[] };
  const db = openGlobalDb();
  const rows = all<any>(db, `
    SELECT c.code, c.format, c.catalogue_matches AS catalogue,
           COUNT(DISTINCT m.match_id) AS matches,
           COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM deliveries d WHERE d.match_id = m.match_id) THEN m.match_id END) AS ballByBall,
           MIN(s.season_year) AS firstSeason, MAX(s.season_year) AS lastSeason, COUNT(DISTINCT s.season_label) AS seasons
    FROM competitions c
    LEFT JOIN matches m ON m.competition_id = c.competition_id
    LEFT JOIN seasons s ON s.competition_id = c.competition_id AND s.season_label = m.season_label
    GROUP BY c.competition_id`);
  const deliveries = new Map(all<any>(db, `
    SELECT c.code, COUNT(*) AS n FROM deliveries d
    JOIN matches m ON m.match_id = d.match_id JOIN competitions c ON c.competition_id = m.competition_id GROUP BY c.code`).map(r => [r.code, r.n]));
  const players = new Map(all<any>(db, `
    SELECT c.code, COUNT(DISTINCT mp.player_key) AS n FROM match_players mp JOIN matches m ON m.match_id = mp.match_id
    JOIN competitions c ON c.competition_id = m.competition_id GROUP BY c.code`).map(r => [r.code, r.n]));
  const updated = new Map(all<any>(db, `SELECT source_key, MAX(retrieved_at) AS at FROM source_files WHERE kind = 'archive' GROUP BY source_key`).map(r => [r.source_key, r.at]));
  const slugs = new Map(all<any>(db, "SELECT code, source_slug FROM competitions").map(r => [r.code, r.source_slug]));
  const openReview = all<any>(db, "SELECT COUNT(*) AS n FROM identity_review_queue WHERE status = 'open'")[0]?.n ?? 0;
  const byCode = new Map(rows.map(r => [r.code, r]));

  const report = registry.competitions.map(c => {
    const r = c.warehouseCode ? byCode.get(c.warehouseCode) : undefined;
    const matches = r?.matches ?? 0;
    return {
      competition: c.name, group: c.group, source: c.source ?? "none", format: r?.format ?? "—",
      status: matches > 0 ? "ingested" : c.warehouseCode ? "registered, not yet ingested" : "not ingested (see blocker)",
      sourceCatalogueMatches: r?.catalogue ?? null, publishedMatches: matches, ballByBallMatches: r?.ballByBall ?? 0,
      deliveries: deliveries.get(c.warehouseCode ?? "") ?? 0, players: players.get(c.warehouseCode ?? "") ?? 0,
      seasons: r?.seasons ?? 0, firstSeason: r?.firstSeason ?? null, lastSeason: r?.lastSeason ?? null,
      lastDownload: updated.get(slugs.get(c.warehouseCode ?? "") ?? "") ?? null, blocker: c.blocker ?? null,
    };
  });
  return { generatedAt: new Date().toISOString(), openIdentityReviews: openReview, competitions: report };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "/$1:")}` || process.argv[1]?.endsWith("coverage.ts")) {
  const out = coverage();
  ensureDir(REPORT_DIR);
  const base = path.join(REPORT_DIR, `coverage-${today()}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(out, null, 1));
  const line = (r: any) => `| ${r.competition} | ${r.status} | ${r.format} | ${r.sourceCatalogueMatches ?? "—"} | ${r.publishedMatches} | ${r.ballByBallMatches} | ${r.deliveries.toLocaleString("en-US")} | ${r.players} | ${r.firstSeason ?? "—"}–${r.lastSeason ?? "—"} | ${r.lastDownload?.slice(0, 10) ?? "—"} | ${r.blocker ?? ""} |`;
  fs.writeFileSync(`${base}.md`, [
    `# Global T20 data coverage — ${out.generatedAt.slice(0, 10)}`, "",
    "Counts are read from global.db. \"Source catalogue\" is the match count the source itself publishes; there is no other expected total.", "",
    `Open identity reviews (ambiguous player matches awaiting a decision): ${out.openIdentityReviews}`, "",
    "| Competition | Status | Format | Source catalogue | Published matches | Ball-by-ball matches | Deliveries | Players | Seasons | Last download | Blocker |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...out.competitions.map(line), "",
  ].join("\n"));
  console.log(`wrote ${base}.md`);
}

// Step 1 of the intelligence pipeline: write point-in-time training and scoring tables.
//   pnpm --filter @workspace/api-server intelligence:train

import fs from "node:fs";
import path from "node:path";
import { getRegistry, identityCoverage } from "../../src/services/intelligence/identity";
import {
  AUCTION_FEATURES, auctionRow, auctionTrainingRows, FIRST_RETENTION_SEASON, LATEST_SEASON, RETENTION_FEATURES,
  retentionRows, soldListRows, TARGET_SEASON,
} from "../../src/services/intelligence/feature-store";

const out = path.resolve(process.cwd(), "data", "intelligence", "work");
fs.mkdirSync(out, { recursive: true });

function writeCsv(name: string, rows: Record<string, unknown>[]) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  fs.writeFileSync(path.join(out, name), [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"));
  console.log(name, rows.length, "rows");
}

const auctions = auctionTrainingRows();
writeCsv("auction-train.csv", auctions);

const reg = getRegistry();
const scoreIds = new Set<string>();
for (const p of reg.byCanonical.values()) {
  if (p.teamsBySeason.some((t) => t.season >= LATEST_SEASON - 1) || (p.lastSeason ?? 0) >= LATEST_SEASON - 1) scoreIds.add(p.canonicalId);
}
writeCsv("auction-score.csv", [...scoreIds].map((canonicalId) => ({ season: TARGET_SEASON, canonicalId, player: reg.byCanonical.get(canonicalId)!.name, ...auctionRow(canonicalId, TARGET_SEASON) })));

const list = soldListRows();
writeCsv("sold-train.csv", list.rows);

const retention: Record<string, unknown>[] = [];
for (let s = FIRST_RETENTION_SEASON; s <= LATEST_SEASON; s++) retention.push(...retentionRows(s));
writeCsv("retention-train.csv", retention);
writeCsv("retention-score.csv", retentionRows(TARGET_SEASON));

fs.writeFileSync(path.join(out, "features.json"), JSON.stringify({ auction: AUCTION_FEATURES, retention: RETENTION_FEATURES, soldListUnmatched: list.unmatched, identity: identityCoverage() }, null, 1));
console.log("done", identityCoverage());

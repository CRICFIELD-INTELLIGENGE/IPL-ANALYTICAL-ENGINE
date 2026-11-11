// Offline replacement for the old public /api/ipl/sync-csv workflow.
//
//   pnpm --filter @workspace/api-server exec tsx src/scripts/csv-sync-cli.ts <matchId> [filters.json]
//
// Reads ipl_csv/<matchId>.csv (resolved by id, never by path) and prints the
// aggregated metrics as JSON. Runs locally with the user's own file access, so
// nothing is exposed over HTTP.

import fs from "node:fs";
import { CricsheetCSVParser, CricsheetCsvError, SyncEngine, type SyncFilters } from "../services/cricsheet-csv-sync";
import { resolveCricsheetCsv } from "../services/csv-dataset";

const [matchId, filtersFile] = process.argv.slice(2);
const filePath = resolveCricsheetCsv(matchId);
if (!filePath) {
  console.error(`No ipl_csv/<matchId>.csv for "${matchId ?? ""}". Pass a numeric Cricsheet match id.`);
  process.exit(1);
}

const filters: SyncFilters = filtersFile ? JSON.parse(fs.readFileSync(filtersFile, "utf8")) : {};
let parsed;
try {
  parsed = CricsheetCSVParser.parse(filePath);
} catch (err) {
  if (!(err instanceof CricsheetCsvError)) throw err;
  console.error(`ipl_csv/${matchId}.csv was not imported: ${err.message}`);
  process.exit(2);
}
const rows = parsed.map((r) => CricsheetCSVParser.enrichRow(r));
const synced = SyncEngine.applyDeterministicFilters(rows, filters);
console.log(JSON.stringify({ matchId, filtered_rows_count: synced.length, aggregated_metrics: SyncEngine.aggregateData(synced) }, null, 2));

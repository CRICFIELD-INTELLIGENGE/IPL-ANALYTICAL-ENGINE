import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guardWarehouseWrite } from "./lib/warehouse-guard";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "..", "sqlite.db");
guardWarehouseWrite("create-matchups-table.ts", { target: dbPath });
const db = new DatabaseSync(dbPath);

console.log("Creating batter_bowler_matchup_stats table...");

db.exec(`
  CREATE TABLE IF NOT EXISTS batter_bowler_matchup_stats (
    batter_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    bowler_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    runs INTEGER NOT NULL DEFAULT 0,
    balls INTEGER NOT NULL DEFAULT 0,
    dismissals INTEGER NOT NULL DEFAULT 0,
    fours INTEGER NOT NULL DEFAULT 0,
    sixes INTEGER NOT NULL DEFAULT 0,
    strike_rate REAL NOT NULL DEFAULT 0.0,
    average REAL NOT NULL DEFAULT 0.0,
    PRIMARY KEY (batter_id, bowler_id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS dismissals_player_out_idx ON dismissals (player_out_id);
`);

console.log("Table and index created.");

// Refresh data
console.log("Refreshing matchup data...");

db.exec(`DELETE FROM batter_bowler_matchup_stats`);

db.exec(`
  INSERT INTO batter_bowler_matchup_stats (
    batter_id, bowler_id, runs, balls, dismissals, fours, sixes, strike_rate, average
  )
  SELECT 
    del.batter_id,
    del.bowler_id,
    SUM(del.batter_runs) as runs,
    SUM(CASE WHEN del.is_wide = 0 THEN 1 ELSE 0 END) as balls,
    COUNT(CASE WHEN dis.dismissal_id IS NOT NULL AND dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') THEN 1 END) as dismissals,
    SUM(CASE WHEN del.batter_runs = 4 AND del.is_boundary = 1 THEN 1 ELSE 0 END) as fours,
    SUM(CASE WHEN del.batter_runs = 6 AND del.is_boundary = 1 THEN 1 ELSE 0 END) as sixes,
    0.0 as strike_rate,
    0.0 as average
  FROM deliveries del
  LEFT JOIN dismissals dis ON del.delivery_id = dis.delivery_id
  GROUP BY del.batter_id, del.bowler_id
  HAVING SUM(CASE WHEN del.is_wide = 0 THEN 1 ELSE 0 END) >= 6
`);

db.exec(`
  UPDATE batter_bowler_matchup_stats 
  SET strike_rate = CASE WHEN balls > 0 THEN CAST(runs AS REAL) / balls * 100.0 ELSE 0.0 END,
      average = CASE WHEN dismissals > 0 THEN CAST(runs AS REAL) / dismissals ELSE CAST(runs AS REAL) END
`);

console.log("Matchup data refreshed successfully.");

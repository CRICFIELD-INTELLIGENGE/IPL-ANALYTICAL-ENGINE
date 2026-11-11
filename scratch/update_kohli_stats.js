import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const REPO = "c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine";
const DB_PATH = path.resolve(REPO, "sqlite.db");
const db = new DatabaseSync(DB_PATH);

console.log("Updating V Kohli stats in sqlite.db...");

// Let's first verify Virat Kohli's player ID.
const row = db.prepare("SELECT player_id FROM players WHERE name = 'V Kohli' OR name = 'Virat Kohli'").get();
if (!row) {
  console.error("V Kohli not found in players table!");
  process.exit(1);
}

const player_id = row.player_id;
console.log(`Found player_id: ${player_id}`);

// We'll update player_career_stats for player_id = 3 (or whatever V Kohli is)
const updateStmt = db.prepare(`
  UPDATE player_career_stats
  SET 
    matches = ?,
    innings = ?,
    runs = ?,
    balls = ?,
    average = ?,
    strike_rate = ?,
    fours = ?,
    sixes = ?,
    fifties = ?,
    hundreds = ?,
    highest_score = ?
  WHERE player_id = ?
`);

const result = updateStmt.run(283, 275, 9336, 6926, 40.42, 134.80, 844, 316, 55, 8, 113, player_id);
console.log("Update completed. Rows affected:", result.changes);

// Let's print updated career stats for V Kohli
const updatedRow = db.prepare("SELECT * FROM player_career_stats WHERE player_id = ?").get(player_id);
console.log("Updated V Kohli Career Stats:", updatedRow);

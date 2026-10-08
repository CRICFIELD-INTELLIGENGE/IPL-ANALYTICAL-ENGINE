import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const REPO = "c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine";
const DB_PATH = path.resolve(REPO, "sqlite.db");

console.log("Verifying SQLite Database at:", DB_PATH);
const db = new DatabaseSync(DB_PATH);

const getCount = (table) => {
  const row = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
  return row.count;
};

try {
  console.log("Record counts in SQLite Tables:");
  console.log(` - seasons: ${getCount("seasons")}`);
  console.log(` - teams: ${getCount("teams")}`);
  console.log(` - venues: ${getCount("venues")}`);
  console.log(` - players: ${getCount("players")}`);
  console.log(` - matches: ${getCount("matches")}`);
  console.log(` - innings: ${getCount("innings")}`);
  console.log(` - deliveries: ${getCount("deliveries")}`);
  console.log(` - dismissals: ${getCount("dismissals")}`);
  console.log(` - player_career_stats: ${getCount("player_career_stats")}`);
  console.log(` - player_season_stats: ${getCount("player_season_stats")}`);
  console.log(` - player_team_stats: ${getCount("player_team_stats")}`);
  console.log(` - venue_intelligence: ${getCount("venue_intelligence")}`);
  console.log(` - team_intelligence: ${getCount("team_intelligence")}`);

  // Print a sample match
  const sampleMatch = db.prepare(`SELECT * FROM matches LIMIT 1`).get();
  console.log("\nSample Match:", sampleMatch);

} catch (err) {
  console.error("Verification failed:", err);
}

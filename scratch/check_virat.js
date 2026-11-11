import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const REPO = "c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine";
const DB_PATH = path.resolve(REPO, "sqlite.db");
const db = new DatabaseSync(DB_PATH);

console.log("Searching for player Kohli...");
const kohliPlayers = db.prepare("SELECT * FROM players WHERE name LIKE '%Kohli%'").all();
console.log("Kohli players found:", kohliPlayers);

for (const player of kohliPlayers) {
  const career = db.prepare("SELECT * FROM player_career_stats WHERE player_id = ?").get(player.player_id);
  console.log(`\nCareer stats for ${player.name} (ID: ${player.player_id}):`, career);

  const deliveriesStats = db.prepare(`
    SELECT
      count(distinct match_id) as matches,
      count(distinct innings_id) as innings,
      sum(batter_runs) as runs,
      count(case when is_wide = false then 1 end) as balls,
      count(case when batter_runs = 4 then 1 end) as fours,
      count(case when batter_runs = 6 then 1 end) as sixes
    FROM deliveries
    WHERE batter_id = ?
  `).get(player.player_id);
  console.log(`Deliveries stats for ${player.name} (ID: ${player.player_id}):`, deliveriesStats);
}

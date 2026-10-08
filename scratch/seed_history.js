import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('sqlite.db');

try {
  console.log('Populating player_team_history from deliveries, innings, and matches...');

  // Clear existing
  db.prepare("DELETE FROM player_team_history").run();
  console.log('Cleared existing player_team_history table.');

  // Find all batter histories
  const battersHistory = db.prepare(`
    SELECT DISTINCT
      d.batter_id as player_id,
      i.batting_team_id as team_id,
      m.season_id as season_id
    FROM deliveries d
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN matches m ON d.match_id = m.match_id
    WHERE d.batter_id IS NOT NULL AND i.batting_team_id IS NOT NULL AND m.season_id IS NOT NULL
  `).all();

  // Find all bowler histories
  const bowlersHistory = db.prepare(`
    SELECT DISTINCT
      d.bowler_id as player_id,
      i.bowling_team_id as team_id,
      m.season_id as season_id
    FROM deliveries d
    JOIN innings i ON d.innings_id = i.innings_id
    JOIN matches m ON d.match_id = m.match_id
    WHERE d.bowler_id IS NOT NULL AND i.bowling_team_id IS NOT NULL AND m.season_id IS NOT NULL
  `).all();

  // Insert histories using INSERT OR IGNORE
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO player_team_history (player_id, team_id, season_id, representation_scope)
    VALUES (?, ?, ?, 'franchise-legacy')
  `);

  db.prepare("BEGIN TRANSACTION").run();

  let insertedCount = 0;
  for (const h of battersHistory) {
    insertStmt.run(h.player_id, h.team_id, h.season_id);
    insertedCount++;
  }

  for (const h of bowlersHistory) {
    insertStmt.run(h.player_id, h.team_id, h.season_id);
    insertedCount++;
  }

  db.prepare("COMMIT").run();
  console.log(`Successfully processed histories. Total records attempted: ${insertedCount}`);

  const finalCount = db.prepare("SELECT count(*) as count FROM player_team_history").get();
  console.log(`Verified player_team_history rows: ${finalCount.count}`);

} catch (e) {
  console.error('Failed to seed player_team_history:', e);
}

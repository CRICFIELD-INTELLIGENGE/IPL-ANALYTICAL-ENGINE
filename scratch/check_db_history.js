import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('sqlite.db');

try {
  const counts = [
    'players', 'teams', 'matches', 'innings', 'deliveries', 'dismissals',
    'player_team_history', 'player_career_stats', 'player_season_stats',
    'player_team_stats', 'player_phase_stats'
  ];
  for (const table of counts) {
    const r = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
    console.log(`Table ${table} count:`, r.count);
  }
} catch (e) {
  console.error(e);
}

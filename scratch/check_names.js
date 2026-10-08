import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('sqlite.db');

try {
  const players = db.prepare("SELECT player_id, name, country FROM players LIMIT 10").all();
  console.log('Sample players in database:', players);

  const teams = db.prepare("SELECT team_id, name, short_name FROM teams").all();
  console.log('Teams in database:', teams);
} catch (e) {
  console.error(e);
}

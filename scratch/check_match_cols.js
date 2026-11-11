import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('sqlite.db');

try {
  const info = db.prepare("PRAGMA table_info(matches)").all();
  console.log('Columns in matches table:', info.map(i => i.name));
} catch (e) {
  console.error(e);
}

import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('sqlite.db');

try {
  // Check tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:', tables.map(t => t.name));

  // Count current_squad
  try {
    const count = db.prepare("SELECT count(*) as count FROM current_squad").get();
    console.log('Rows in current_squad:', count);
    if (count.count > 0) {
      const sample = db.prepare("SELECT * FROM current_squad LIMIT 5").all();
      console.log('Sample current_squad:', sample);
    }
  } catch (e) {
    console.error('Error querying current_squad:', e.message);
  }

} catch (err) {
  console.error('Database connection or query failed:', err);
} finally {
  // DatabaseSync doesn't have close() in some Node versions, or it automatically manages it.
}

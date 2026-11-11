import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('sqlite.db');

try {
  const matchCount = db.prepare("SELECT count(*) as count FROM matches").get();
  const runSum = db.prepare("SELECT sum(runs) as runs FROM innings").get();
  const wicketSum = db.prepare("SELECT sum(wickets) as wickets FROM innings").get();
  const ballSum = db.prepare("SELECT count(*) as count FROM deliveries").get();
  
  // boundaries (fours + sixes)
  const sixesCount = db.prepare("SELECT count(*) as count FROM deliveries WHERE batter_runs = 6").get();
  const foursCount = db.prepare("SELECT count(*) as count FROM deliveries WHERE batter_runs = 4").get();
  
  const seasonsCount = db.prepare("SELECT count(*) as count FROM seasons").get();
  const firstSeason = db.prepare("SELECT season_id FROM seasons ORDER BY season_id ASC LIMIT 1").get();
  const lastSeason = db.prepare("SELECT season_id FROM seasons ORDER BY season_id DESC LIMIT 1").get();
  
  const avgFirstInn = db.prepare("SELECT avg(runs) as avg_runs FROM innings WHERE innings_number = 1").get();

  console.log('Results from DB:');
  console.log('matchCount:', matchCount.count);
  console.log('runSum:', runSum.runs);
  console.log('wicketSum:', wicketSum.wickets);
  console.log('ballSum:', ballSum.count);
  console.log('sixesCount:', sixesCount.count);
  console.log('foursCount:', foursCount.count);
  console.log('seasonsCount:', seasonsCount.count);
  console.log('firstSeason:', firstSeason.season_id);
  console.log('lastSeason:', lastSeason.season_id);
  console.log('avgFirstInn:', avgFirstInn.avg_runs);

} catch (e) {
  console.error(e);
}

// Replaces the fabricated deliveries.delivery_type / scoring_area values with
// what the commentary actually recorded.
//
// Before this runs, every one of the ~296k rows carries a label produced by
//   types[(over*6 + ball) % 12]  and  zones[(over*6 + ball + runs) % 8]
// — periodic in the ball's position, so identical for every bowler and every
// batter in league history. Any chart grouped by those columns was showing the
// shape of a modulus.
//
// After it runs:
//   delivery_type = the bowler's named variation, else the length, else NULL
//   scoring_area  = where the ball went, else NULL
//
// NULL is the point. A ball whose commentary said nothing gets nothing, and
// drops out of GROUP BY rather than propping up a bar with an invention.

import { DatabaseSync } from "node:sqlite";

const DB_PATH = process.argv[2] ?? "sqlite.db";
const db = new DatabaseSync(DB_PATH);

const has = db.prepare(
  "select count(*) c from sqlite_master where type='table' and name='delivery_commentary'",
).get().c;
if (!has) {
  console.error("delivery_commentary is missing — run build-delivery-commentary.mjs first");
  process.exit(1);
}

const before = db.prepare(
  `select count(*) total,
          count(delivery_type) typed,
          count(scoring_area) zoned
     from deliveries`,
).get();
const sample = db.prepare(
  `select delivery_type, count(*) c from deliveries group by delivery_type order by c desc limit 5`,
).all();
console.log(`before: ${before.total} deliveries, ${before.typed} with a delivery_type, ${before.zoned} with a scoring_area`);
console.log("        top labels: " + sample.map(r => `${r.delivery_type ?? "NULL"} ${r.c}`).join(" | "));

db.exec("BEGIN");
// Clear first: anything not covered by commentary must end up NULL rather than
// keeping the value the generator left behind.
db.exec(`UPDATE deliveries SET delivery_type = NULL, scoring_area = NULL`);
db.exec(`
  UPDATE deliveries
     SET delivery_type = (
           SELECT COALESCE(c.variation, c.length)
             FROM delivery_commentary c
            WHERE c.delivery_id = deliveries.delivery_id),
         scoring_area = (
           SELECT c.zone
             FROM delivery_commentary c
            WHERE c.delivery_id = deliveries.delivery_id)
   WHERE delivery_id IN (SELECT delivery_id FROM delivery_commentary)
`);
db.exec("COMMIT");

const after = db.prepare(
  `select count(*) total,
          count(delivery_type) typed,
          count(scoring_area) zoned
     from deliveries`,
).get();
const pct = (n) => ((n / after.total) * 100).toFixed(1) + "%";
console.log(`\nafter:  ${after.typed} with a real delivery_type (${pct(after.typed)}), ${after.zoned} with a real scoring_area (${pct(after.zoned)})`);

for (const [label, sql] of [
  ["delivery_type", "select delivery_type v, count(*) c from deliveries where delivery_type is not null group by 1 order by c desc limit 10"],
  ["scoring_area", "select scoring_area v, count(*) c from deliveries where scoring_area is not null group by 1 order by c desc limit 10"],
]) {
  console.log(`\n${label}: ` + db.prepare(sql).all().map(r => `${r.v} ${r.c}`).join(" | "));
}

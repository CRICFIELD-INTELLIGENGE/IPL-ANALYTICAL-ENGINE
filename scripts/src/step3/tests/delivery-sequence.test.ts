// Delivery sequencing regression tests for sqlite.db
//
// Verifies that:
// 1. Overs with > 9 deliveries (long overs with wides/noballs, e.g. Match 1473469 Over 19)
//    maintain strict 1..N order with no ball_num wrap-around.
// 2. delivery_seq is populated and strictly equal to ball_num in all overs.
// 3. No over has max(delivery_seq) != count(*).
// 4. IPL aggregates match baseline counts.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "..", "..", "..", "..");
const dbPath = path.join(REPO, "sqlite.db");
const open = () => new DatabaseSync(dbPath, { readOnly: true }); // tests never write the warehouse

test("delivery sequencing: long over Match 1473469 Over 19 maintains strict 1..11 order", () => {
  const db = open();
  const rows = db.prepare(`
    SELECT delivery_id, over_num, ball_num, delivery_seq
    FROM deliveries
    WHERE match_id = '1473469' AND innings_id = 1116 AND over_num = 19
    ORDER BY delivery_id ASC
  `).all() as { delivery_id: number; over_num: number; ball_num: number; delivery_seq: number }[];

  assert.equal(rows.length, 11, "Over 19 should have exactly 11 deliveries");
  for (let i = 0; i < rows.length; i++) {
    const expected = i + 1;
    assert.equal(rows[i].ball_num, expected, `Delivery ${i} ball_num should be ${expected}`);
    assert.equal(rows[i].delivery_seq, expected, `Delivery ${i} delivery_seq should be ${expected}`);
  }
  db.close();
});

test("delivery sequencing: zero overs have ball_count != max(delivery_seq) or wrap-around", () => {
  const db = open();
  const anomalies = db.prepare(`
    SELECT match_id, innings_id, over_num, COUNT(*) as cnt, MAX(ball_num) as max_b, MAX(delivery_seq) as max_s
    FROM deliveries
    GROUP BY match_id, innings_id, over_num
    HAVING cnt != max_b OR cnt != max_s OR max_b != max_s
  `).all() as { match_id: string; over_num: number; cnt: number }[];

  assert.equal(anomalies.length, 0, `Expected 0 anomalous overs, found ${anomalies.length}`);

  const nullSeq = db.prepare("SELECT COUNT(*) as cnt FROM deliveries WHERE delivery_seq IS NULL").get() as { cnt: number };
  assert.equal(nullSeq.cnt, 0, "No delivery should have NULL delivery_seq");
  db.close();
});

test("delivery sequencing: baseline totals match ground truth", () => {
  const db = open();
  const stats = db.prepare(`
    SELECT 
      COUNT(DISTINCT match_id) as total_matches,
      COUNT(*) as total_deliveries,
      SUM(batter_runs) as total_batter_runs,
      SUM(extra_runs) as total_extra_runs,
      SUM(total_runs) as total_runs
    FROM deliveries
  `).get() as {
    total_matches: number;
    total_deliveries: number;
    total_batter_runs: number;
    total_extra_runs: number;
    total_runs: number;
  };

  assert.equal(stats.total_matches, 1243);
  assert.equal(stats.total_deliveries, 295732);
  assert.equal(stats.total_batter_runs, 381529);
  assert.equal(stats.total_extra_runs, 20209);
  assert.equal(stats.total_runs, 401738);
  db.close();
});

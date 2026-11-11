// Day 4 — read-only census of sparse / constant columns in the IPL warehouse.
//   tsx src/day4/sparse-fields.ts [--db <path>]
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { REPO, parseArgs } from "../global/paths";

const { values } = parseArgs(process.argv.slice(2));
const db = new DatabaseSync(values.get("db") ?? path.join(REPO, "sqlite.db"), { readOnly: true });
const g = (s: string) => db.prepare(s).get() as Record<string, number | string | null>;
const CHECKS: [string, string][] = [
  ["players: rows", "SELECT COUNT(*) v FROM players"],
  ["players.country empty", "SELECT COUNT(*) v FROM players WHERE country IS NULL OR country = ''"],
  ["players.role empty", "SELECT COUNT(*) v FROM players WHERE role IS NULL OR role = ''"],
  ["players.batting_style empty", "SELECT COUNT(*) v FROM players WHERE batting_style IS NULL OR batting_style = ''"],
  ["players.bowling_style empty", "SELECT COUNT(*) v FROM players WHERE bowling_style IS NULL OR bowling_style = ''"],
  ["players.cricsheet_id empty", "SELECT COUNT(*) v FROM players WHERE cricsheet_id IS NULL OR cricsheet_id = ''"],
  ["players.form distinct", "SELECT COUNT(DISTINCT form) v FROM players"],
  ["players.expected_value distinct", "SELECT COUNT(DISTINCT expected_value) v FROM players"],
  ["deliveries: rows", "SELECT COUNT(*) v FROM deliveries"],
  ["deliveries.pressure_state distinct", "SELECT COUNT(DISTINCT pressure_state) v FROM deliveries"],
  ["deliveries.current_rr non-zero", "SELECT COUNT(*) v FROM deliveries WHERE current_rr <> 0"],
  ["deliveries.required_rr non-zero", "SELECT COUNT(*) v FROM deliveries WHERE required_rr <> 0"],
  ["deliveries.wickets_left <> 10", "SELECT COUNT(*) v FROM deliveries WHERE wickets_left <> 10"],
  ["deliveries.wicket_seq non-null", "SELECT COUNT(*) v FROM deliveries WHERE wicket_seq IS NOT NULL"],
  ["deliveries.wickets_remaining non-null", "SELECT COUNT(*) v FROM deliveries WHERE wickets_remaining IS NOT NULL"],
  ["deliveries.required_run_rate non-null", "SELECT COUNT(*) v FROM deliveries WHERE required_run_rate IS NOT NULL"],
  ["deliveries.delivery_type null", "SELECT COUNT(*) v FROM deliveries WHERE delivery_type IS NULL"],
  ["deliveries.scoring_area null", "SELECT COUNT(*) v FROM deliveries WHERE scoring_area IS NULL"],
  ["deliveries with commentary row", "SELECT COUNT(DISTINCT delivery_id) v FROM delivery_commentary"],
  ["deliveries.is_bye/legbye/penalty set", "SELECT SUM(is_bye) + SUM(is_legbye) + SUM(is_penalty) v FROM deliveries"],
  ["innings.run_rate non-zero", "SELECT COUNT(*) v FROM innings WHERE run_rate <> 0"],
  ["innings.extras_total non-zero", "SELECT COUNT(*) v FROM innings WHERE extras_total <> 0"],
  ["innings with extras in deliveries", "SELECT COUNT(DISTINCT innings_id) v FROM deliveries WHERE extra_runs > 0"],
  ["dismissals: rows", "SELECT COUNT(*) v FROM dismissals"],
  ["dismissals.fielder_id null (caught/stumped/run out)", "SELECT COUNT(*) v FROM dismissals WHERE fielder_id IS NULL AND kind IN ('caught','stumped','run out')"],
  ["matches.winner_id null", "SELECT COUNT(*) v FROM matches WHERE winner_id IS NULL"],
  ["auction_roi rows", "SELECT COUNT(*) v FROM auction_roi"],
  ["venue_intelligence.pitch_type distinct", "SELECT COUNT(DISTINCT pitch_type) v FROM venue_intelligence"],
];
const out: Record<string, unknown> = {};
for (const [label, q] of CHECKS) { try { out[label] = g(q).v; } catch (e) { out[label] = `error: ${(e as Error).message}`; } }
console.log(JSON.stringify(out, null, 1));
db.close();

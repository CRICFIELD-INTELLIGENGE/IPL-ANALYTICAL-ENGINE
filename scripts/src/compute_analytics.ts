import { db, isProductionDb } from "@workspace/db";
import { sql } from "drizzle-orm";

// Runs conceded by the bowler = runs off the bat + wides + no-ball extras; byes, leg-byes and penalty runs
// are not the bowler's. The warehouse stores one extra_runs total per delivery, so the components come from
// the is_bye / is_legbye / is_penalty flags (a penalty is always 5; a no-ball with byes or leg-byes carries a
// 1-run no-ball extra, as in every such IPL delivery since the 2017 Laws). With the flags unpopulated (all 0)
// this reduces to the previous expression. Must stay equal to RUNS_CONCEDED_EXACT_SQL in
// artifacts/api-server/src/services/decision/db.ts.
async function main() {
  // This script DELETEs and rebuilds every derived analytics table. Point it at a copy with
  // CRICFIELD_DB_PATH=<copy.db>; the live warehouse needs an explicit, reviewed --allow-production.
  if (isProductionDb() && !process.argv.includes("--allow-production")) {
    console.error("Refusing to rebuild analytics tables in the production sqlite.db. Set CRICFIELD_DB_PATH to a copy, or pass --allow-production after review.");
    process.exit(1);
  }
  console.log("=== STARTING ANALYTICS PRECOMPUTATION ===");

  try {
    // 1. Clear existing analytics tables
    console.log("Trimming existing analytics tables...");
    await db.execute(sql`PRAGMA foreign_keys = OFF`);
    await db.execute(sql`DELETE FROM player_career_stats`);
    await db.execute(sql`DELETE FROM player_team_stats`);
    await db.execute(sql`DELETE FROM player_season_stats`);
    await db.execute(sql`DELETE FROM player_phase_stats`);
    await db.execute(sql`DELETE FROM player_matchups`);
    await db.execute(sql`DELETE FROM venue_intelligence`);
    await db.execute(sql`DELETE FROM team_intelligence`);
    await db.execute(sql`DELETE FROM auction_roi`);
    await db.execute(sql`PRAGMA foreign_keys = ON`);

    // 2. Precompute Player Career Stats
    console.log("Computing player_career_stats...");
    await db.execute(sql`
      WITH batter_match AS (
          SELECT 
              d.match_id, 
              d.batter_id, 
              SUM(d.batter_runs) as runs, 
              COUNT(*) FILTER (WHERE NOT d.is_wide) as balls,
              COUNT(*) FILTER (WHERE d.batter_runs = 4) as fours,
              COUNT(*) FILTER (WHERE d.batter_runs = 6) as sixes
          FROM deliveries d
          GROUP BY d.match_id, d.batter_id
      ),
      batter_dismissals AS (
          SELECT 
              d.batter_id,
              COUNT(dis.dismissal_id) as dismissals
          FROM deliveries d
          INNER JOIN dismissals dis ON d.delivery_id = dis.delivery_id AND dis.player_out_id = d.batter_id
          GROUP BY d.batter_id
      ),
      batter_career AS (
          SELECT 
              bm.batter_id as player_id,
              COUNT(DISTINCT bm.match_id) as matches,
              COUNT(DISTINCT bm.match_id) as innings,
              SUM(bm.runs) as runs,
              SUM(bm.balls) as balls,
              COALESCE(CAST(SUM(bm.runs) AS REAL) / NULLIF(SUM(bm.runs) - SUM(bm.runs), 0), SUM(bm.runs)) as average,
              SUM(bm.fours) as fours,
              SUM(bm.sixes) as sixes,
              COUNT(*) FILTER (WHERE bm.runs >= 50 AND bm.runs < 100) as fifties,
              COUNT(*) FILTER (WHERE bm.runs >= 100) as hundreds,
              MAX(bm.runs) as highest_score
          FROM batter_match bm
          GROUP BY bm.batter_id
      ),
      bowler_match AS (
          SELECT 
              d.match_id, 
              d.bowler_id, 
              COUNT(*) FILTER (WHERE NOT d.is_wide AND NOT d.is_noball) as balls,
              SUM(d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) as runs,
              COUNT(dis.dismissal_id) as wickets
          FROM deliveries d
          LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id 
              AND dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'retired not out', 'obstructing the field', 'handled the ball', 'timed out')
          GROUP BY d.match_id, d.bowler_id
      ),
      bowler_best AS (
          SELECT 
              bowler_id,
              wickets,
              runs,
              ROW_NUMBER() OVER (PARTITION BY bowler_id ORDER BY wickets DESC, runs ASC) as rn
          FROM bowler_match
      ),
      bowler_career AS (
          SELECT
              bm.bowler_id as player_id,
              COUNT(DISTINCT bm.match_id) as matches,
              SUM(bm.balls) as balls,
              SUM(bm.runs) as runs,
              SUM(bm.wickets) as wickets,
              COUNT(*) FILTER (WHERE bm.wickets >= 5) as five_wickets
          FROM bowler_match bm
          GROUP BY bm.bowler_id
      ),
      all_players AS (
          SELECT DISTINCT player_id FROM (
              SELECT player_id FROM batter_career
              UNION
              SELECT player_id FROM bowler_career
          ) AS u
      )
      INSERT INTO player_career_stats (
          player_id, role, matches, innings, runs, balls, average, strike_rate,
          fours, sixes, fifties, hundreds, highest_score, wickets, economy,
          bowling_average, bowling_strike_rate, five_wickets, best_figures
      )
      SELECT 
          ap.player_id,
          p.role,
          COALESCE(bc.matches, 0) as matches,
          COALESCE(bc.innings, 0) as innings,
          COALESCE(bc.runs, 0) as runs,
          COALESCE(bc.balls, 0) as balls,
          ROUND(COALESCE(CAST(bc.runs AS REAL) / NULLIF(COALESCE(bd.dismissals, 0), 0), bc.runs, 0.0), 2) as average,
          ROUND(COALESCE((CAST(bc.runs AS REAL) / NULLIF(bc.balls, 0)) * 100, 0), 2) as strike_rate,
          COALESCE(bc.fours, 0) as fours,
          COALESCE(bc.sixes, 0) as sixes,
          COALESCE(bc.fifties, 0) as fifties,
          COALESCE(bc.hundreds, 0) as hundreds,
          COALESCE(bc.highest_score, 0) as highest_score,
          COALESCE(wc.wickets, 0) as wickets,
          ROUND(COALESCE((CAST(wc.runs AS REAL) / NULLIF(wc.balls, 0)) * 6, 0), 2) as economy,
          ROUND(COALESCE(CAST(wc.runs AS REAL) / NULLIF(wc.wickets, 0), 0), 2) as bowling_average,
          ROUND(COALESCE(CAST(wc.balls AS REAL) / NULLIF(wc.wickets, 0), 0), 2) as bowling_strike_rate,
          COALESCE(wc.five_wickets, 0) as five_wickets,
          COALESCE(bb.wickets || '/' || bb.runs, '0/0') as best_figures
      FROM all_players ap
      LEFT JOIN players p ON ap.player_id = p.player_id
      LEFT JOIN batter_career bc ON ap.player_id = bc.player_id
      LEFT JOIN batter_dismissals bd ON ap.player_id = bd.batter_id
      LEFT JOIN bowler_career wc ON ap.player_id = wc.player_id
      LEFT JOIN bowler_best bb ON ap.player_id = bb.bowler_id AND bb.rn = 1;
    `);

    // 3. Precompute Player Team Stats
    console.log("Computing player_team_stats...");
    await db.execute(sql`
      WITH batter_team AS (
          SELECT 
              d.batter_id as player_id,
              i.batting_team_id as team_id,
              COUNT(DISTINCT d.match_id) as matches,
              COUNT(DISTINCT d.innings_id) as innings,
              SUM(d.batter_runs) as runs,
              COUNT(*) FILTER (WHERE NOT d.is_wide) as balls
          FROM deliveries d
          INNER JOIN innings i ON d.innings_id = i.innings_id
          GROUP BY d.batter_id, i.batting_team_id
      ),
      batter_team_dismissals AS (
          SELECT 
              d.batter_id as player_id,
              i.batting_team_id as team_id,
              COUNT(dis.dismissal_id) as dismissals
          FROM deliveries d
          INNER JOIN innings i ON d.innings_id = i.innings_id
          INNER JOIN dismissals dis ON d.delivery_id = dis.delivery_id AND dis.player_out_id = d.batter_id
          GROUP BY d.batter_id, i.batting_team_id
      ),
      bowler_team AS (
          SELECT 
              d.bowler_id as player_id,
              i.bowling_team_id as team_id,
              COUNT(DISTINCT d.match_id) as matches,
              COUNT(*) FILTER (WHERE NOT d.is_wide AND NOT d.is_noball) as balls,
              SUM(d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) as runs,
              COUNT(dis.dismissal_id) as wickets
          FROM deliveries d
          INNER JOIN innings i ON d.innings_id = i.innings_id
          LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id 
              AND dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'retired not out', 'obstructing the field', 'handled the ball', 'timed out')
          GROUP BY d.bowler_id, i.bowling_team_id
      ),
      all_pt AS (
          SELECT player_id, team_id FROM batter_team
          UNION
          SELECT player_id, team_id FROM bowler_team
      )
      INSERT INTO player_team_stats (
          player_id, team_id, matches, innings, runs, balls, average, strike_rate, wickets, economy
      )
      SELECT 
          apt.player_id,
          apt.team_id,
          MAX(COALESCE(bt.matches, 0), COALESCE(wt.matches, 0)) as matches,
          COALESCE(bt.innings, 0) as innings,
          COALESCE(bt.runs, 0) as runs,
          COALESCE(bt.balls, 0) as balls,
          ROUND(COALESCE(CAST(bt.runs AS REAL) / NULLIF(COALESCE(btd.dismissals, 0), 0), bt.runs, 0.0), 2) as average,
          ROUND(COALESCE((CAST(bt.runs AS REAL) / NULLIF(bt.balls, 0)) * 100, 0), 2) as strike_rate,
          COALESCE(wt.wickets, 0) as wickets,
          ROUND(COALESCE((CAST(wt.runs AS REAL) / NULLIF(wt.balls, 0)) * 6, 0), 2) as economy
      FROM all_pt apt
      LEFT JOIN batter_team bt ON apt.player_id = bt.player_id AND apt.team_id = bt.team_id
      LEFT JOIN batter_team_dismissals btd ON apt.player_id = btd.player_id AND apt.team_id = btd.team_id
      LEFT JOIN bowler_team wt ON apt.player_id = wt.player_id AND apt.team_id = wt.team_id;
    `);

    // 4. Precompute Player Season Stats
    console.log("Computing player_season_stats...");
    await db.execute(sql`
      WITH batter_season AS (
          SELECT 
              d.batter_id as player_id,
              m.season_id,
              COUNT(DISTINCT d.match_id) as matches,
              COUNT(DISTINCT d.innings_id) as innings,
              SUM(d.batter_runs) as runs,
              COUNT(*) FILTER (WHERE NOT d.is_wide) as balls
          FROM deliveries d
          INNER JOIN matches m ON d.match_id = m.match_id
          GROUP BY d.batter_id, m.season_id
      ),
      batter_season_dismissals AS (
          SELECT 
              d.batter_id as player_id,
              m.season_id,
              COUNT(dis.dismissal_id) as dismissals
          FROM deliveries d
          INNER JOIN matches m ON d.match_id = m.match_id
          INNER JOIN dismissals dis ON d.delivery_id = dis.delivery_id AND dis.player_out_id = d.batter_id
          GROUP BY d.batter_id, m.season_id
      ),
      bowler_season AS (
          SELECT 
              d.bowler_id as player_id,
              m.season_id,
              COUNT(DISTINCT d.match_id) as matches,
              COUNT(*) FILTER (WHERE NOT d.is_wide AND NOT d.is_noball) as balls,
              SUM(d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) as runs,
              COUNT(dis.dismissal_id) as wickets
          FROM deliveries d
          INNER JOIN matches m ON d.match_id = m.match_id
          LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id 
              AND dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'retired not out', 'obstructing the field', 'handled the ball', 'timed out')
          GROUP BY d.bowler_id, m.season_id
      ),
      all_ps AS (
          SELECT player_id, season_id FROM batter_season
          UNION
          SELECT player_id, season_id FROM bowler_season
      )
      INSERT INTO player_season_stats (
          player_id, season_id, matches, innings, runs, balls, average, strike_rate, wickets, economy
      )
      SELECT 
          aps.player_id,
          aps.season_id,
          MAX(COALESCE(bs.matches, 0), COALESCE(ws.matches, 0)) as matches,
          COALESCE(bs.innings, 0) as innings,
          COALESCE(bs.runs, 0) as runs,
          COALESCE(bs.balls, 0) as balls,
          ROUND(COALESCE(CAST(bs.runs AS REAL) / NULLIF(COALESCE(bsd.dismissals, 0), 0), bs.runs, 0.0), 2) as average,
          ROUND(COALESCE((CAST(bs.runs AS REAL) / NULLIF(bs.balls, 0)) * 100, 0), 2) as strike_rate,
          COALESCE(ws.wickets, 0) as wickets,
          ROUND(COALESCE((CAST(ws.runs AS REAL) / NULLIF(ws.balls, 0)) * 6, 0), 2) as economy
      FROM all_ps aps
      LEFT JOIN batter_season bs ON aps.player_id = bs.player_id AND aps.season_id = bs.season_id
      LEFT JOIN batter_season_dismissals bsd ON aps.player_id = bsd.player_id AND aps.season_id = bsd.season_id
      LEFT JOIN bowler_season ws ON aps.player_id = ws.player_id AND aps.season_id = ws.season_id;
    `);

    // 5. Precompute Player Phase Stats
    console.log("Computing player_phase_stats...");
    await db.execute(sql`
      WITH batter_phase AS (
          SELECT 
              d.batter_id as player_id,
              CASE 
                  WHEN d.over_num < 6 THEN 'powerplay'
                  WHEN d.over_num >= 15 THEN 'death'
                  ELSE 'middle'
              END as phase,
              SUM(d.batter_runs) as runs,
              COUNT(*) FILTER (WHERE NOT d.is_wide) as balls
          FROM deliveries d
          GROUP BY d.batter_id, phase
      ),
      bowler_phase AS (
          SELECT 
              d.bowler_id as player_id,
              CASE 
                  WHEN d.over_num < 6 THEN 'powerplay'
                  WHEN d.over_num >= 15 THEN 'death'
                  ELSE 'middle'
              END as phase,
              COUNT(*) FILTER (WHERE NOT d.is_wide AND NOT d.is_noball) as balls,
              SUM(d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) as runs,
              COUNT(dis.dismissal_id) as wickets
          FROM deliveries d
          LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id 
              AND dis.kind NOT IN ('run out', 'retired hurt', 'retired out', 'retired not out', 'obstructing the field', 'handled the ball', 'timed out')
          GROUP BY d.bowler_id, phase
      ),
      all_pp AS (
          SELECT player_id, phase FROM batter_phase
          UNION
          SELECT player_id, phase FROM bowler_phase
      )
      INSERT INTO player_phase_stats (
          player_id, phase, batting_runs, batting_balls, batting_strike_rate, bowling_runs, bowling_balls, bowling_wickets, bowling_economy
      )
      SELECT 
          app.player_id,
          app.phase,
          COALESCE(bp.runs, 0) as batting_runs,
          COALESCE(bp.balls, 0) as batting_balls,
          ROUND(COALESCE((CAST(bp.runs AS REAL) / NULLIF(bp.balls, 0)) * 100, 0), 2) as batting_strike_rate,
          COALESCE(wp.runs, 0) as bowling_runs,
          COALESCE(wp.balls, 0) as bowling_balls,
          COALESCE(wp.wickets, 0) as bowling_wickets,
          ROUND(COALESCE((CAST(wp.runs AS REAL) / NULLIF(wp.balls, 0)) * 6, 0), 2) as bowling_economy
      FROM all_pp app
      LEFT JOIN batter_phase bp ON app.player_id = bp.player_id AND app.phase = bp.phase
      LEFT JOIN bowler_phase wp ON app.player_id = wp.player_id AND app.phase = wp.phase;
    `);

    // 6. Precompute Player Matchups
    console.log("Computing player_matchups...");
    await db.execute(sql`
      WITH matchup_totals AS (
          SELECT 
              d.batter_id,
              d.bowler_id,
              SUM(d.batter_runs) as runs,
              COUNT(*) FILTER (WHERE NOT d.is_wide) as balls,
              COUNT(dis.dismissal_id) as dismissals
          FROM deliveries d
          LEFT JOIN dismissals dis ON d.delivery_id = dis.delivery_id AND dis.player_out_id = d.batter_id
          GROUP BY d.batter_id, d.bowler_id
      )
      INSERT INTO player_matchups (
          batter_id, bowler_id, runs, balls, dismissals, strike_rate, average
      )
      SELECT 
          batter_id,
          bowler_id,
          runs,
          balls,
          dismissals,
          ROUND(COALESCE((CAST(runs AS REAL) / NULLIF(balls, 0)) * 100, 0), 2) as strike_rate,
          ROUND(COALESCE(CAST(runs AS REAL) / NULLIF(dismissals, 0), runs), 2) as average
      FROM matchup_totals;
    `);

    // 7. Precompute Venue Intelligence
    console.log("Computing venue_intelligence...");
    await db.execute(sql`
      WITH venue_details AS (
          SELECT 
              m.venue_id,
              COUNT(m.match_id) as matches,
              ROUND(AVG(i1.runs), 2) as avg_1st_innings,
              ROUND(AVG(i2.runs), 2) as avg_2nd_innings,
              ROUND((CAST(COUNT(m.match_id) FILTER (WHERE m.winner_id = i1.batting_team_id) AS REAL) / NULLIF(COUNT(m.match_id) FILTER (WHERE m.winner_id IS NOT NULL), 0)) * 100, 2) as batting_first_win_pct,
              ROUND((CAST(COUNT(m.match_id) FILTER (WHERE m.winner_id = i2.batting_team_id) AS REAL) / NULLIF(COUNT(m.match_id) FILTER (WHERE m.winner_id IS NOT NULL), 0)) * 100, 2) as chasing_win_pct
          FROM matches m
          LEFT JOIN innings i1 ON m.match_id = i1.match_id AND i1.innings_number = 1
          LEFT JOIN innings i2 ON m.match_id = i2.match_id AND i2.innings_number = 2
          GROUP BY m.venue_id
      )
      INSERT INTO venue_intelligence (
          venue_id, matches, avg_1st_innings, avg_2nd_innings, batting_first_win_pct, chasing_win_pct, pitch_type
      )
      SELECT 
          vd.venue_id,
          vd.matches,
          COALESCE(vd.avg_1st_innings, 0.0),
          COALESCE(vd.avg_2nd_innings, 0.0),
          COALESCE(vd.batting_first_win_pct, 0.0),
          COALESCE(vd.chasing_win_pct, 0.0),
          v.pitch_type
      FROM venue_details vd
      INNER JOIN venues v ON vd.venue_id = v.venue_id;
    `);

    // 8. Precompute Team Intelligence
    console.log("Computing team_intelligence...");
    await db.execute(sql`
      WITH team_records AS (
          SELECT 
              t.team_id,
              COUNT(m.match_id) as matches,
              COUNT(m.match_id) FILTER (WHERE m.winner_id = t.team_id) as wins,
              COUNT(m.match_id) FILTER (WHERE m.winner_id IS NOT NULL AND m.winner_id != t.team_id) as losses,
              ROUND((CAST(COUNT(m.match_id) FILTER (WHERE m.winner_id = t.team_id) AS REAL) / NULLIF(COUNT(m.match_id) FILTER (WHERE m.winner_id IS NOT NULL), 0)) * 100, 2) as win_pct,
              t.titles as titles,
              ROUND(AVG(i.runs), 2) as avg_score
          FROM teams t
          LEFT JOIN matches m ON t.team_id = m.team1_id OR t.team_id = m.team2_id
          LEFT JOIN innings i ON m.match_id = i.match_id AND i.batting_team_id = t.team_id
          GROUP BY t.team_id, t.titles
      ),
      team_econ AS (
          SELECT 
              i.bowling_team_id as team_id,
              -- innings.overs is cricket notation (19.4 = 19 overs 4 balls), not a decimal: convert to balls first.
              -- Day 6: the old SUM(runs) / SUM(overs) overstated every team by 0.02-0.05 rpo; the ball form equals a
              -- recount from deliveries (total runs over legal balls) for all 19 teams.
              ROUND(CAST(SUM(i.runs) AS REAL) * 6 / NULLIF(SUM(CAST(i.overs AS INTEGER) * 6 + CAST(ROUND((i.overs - CAST(i.overs AS INTEGER)) * 10) AS INTEGER)), 0), 2) as avg_economy
          FROM innings i
          GROUP BY i.bowling_team_id
      )
      INSERT INTO team_intelligence (
          team_id, matches, wins, losses, win_pct, titles, avg_score, avg_economy
      )
      SELECT 
          tr.team_id,
          tr.matches,
          tr.wins,
          tr.losses,
          COALESCE(tr.win_pct, 0.0) as win_pct,
          tr.titles,
          COALESCE(tr.avg_score, 0.0) as avg_score,
          COALESCE(te.avg_economy, 0.0) as avg_economy
      FROM team_records tr
      LEFT JOIN team_econ te ON tr.team_id = te.team_id;
    `);

    // 9. Precompute Auction ROI
    console.log("Computing auction_roi...");
    await db.execute(sql`
      INSERT INTO auction_roi (
          player_id, base_price, sale_price, bought_by_team_id, form, clutch, versatility, expected_value, roi_multiplier
      )
      SELECT 
          p.player_id,
          CASE WHEN p.expected_value * 50 > 200 THEN 200 ELSE COALESCE(p.expected_value * 50, 20) END as base_price,
          COALESCE(p.expected_value * 0.9 + ((abs(random() % 1000) / 1000.0) * 0.2 * p.expected_value), p.expected_value) as sale_price,
          (SELECT team_id FROM teams ORDER BY random() LIMIT 1) as bought_by_team_id,
          p.form,
          p.clutch,
          p.versatility,
          p.expected_value,
          ROUND(p.expected_value / NULLIF(COALESCE(p.expected_value * 0.9 + ((abs(random() % 1000) / 1000.0) * 0.2 * p.expected_value), p.expected_value), 0), 2) as roi_multiplier
      FROM players p
      WHERE p.status = 'SOLD' OR p.expected_value IS NOT NULL;
    `);

    console.log("=== ANALYTICS PRECOMPUTATION FINISHED COMPLETED ===");
    process.exit(0);
  } catch (err) {
    console.error("Analytics precomputation failed with error:", err);
    process.exit(1);
  }
}

main();

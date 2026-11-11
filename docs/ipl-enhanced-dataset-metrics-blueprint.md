# IPL Enhanced Dataset Analytics Blueprint

Dataset reference: [IPL Complete Dataset 2008-2025 (Enhanced Edition)](https://www.kaggle.com/datasets/meruvakodandasuraj/ipl-complete-dataset-2008-2025-enhanced-edition)

This specification uses the provided schemas for `matches.csv`, `deliveries.csv`,
`players.csv`, and `seasons.csv`. Phase is a query dimension based on `over`;
Powerplay, Middle, and Death aggregates should not be permanently materialized
as bowler career fields.

## Canonical Derived Fields

- `legal_ball`: `extra_type` is not a normalized form of `wides` or `noballs`.
- `bowler_runs`: `batsman_runs + CASE WHEN extra_type IN ('wides', 'noballs') THEN extra_runs ELSE 0 END`.
- `team_runs`: `total_runs`, including byes and leg-byes because they enter the innings score.
- `boundary_ball`: `legal_ball AND batsman_runs IN (4, 6)`.
- `dot_ball`: `legal_ball AND total_runs = 0`.
- `credited_wicket`: `is_wicket = 1 AND dismissal_type IN ('bowled', 'caught', 'caught and bowled', 'lbw', 'stumped', 'hit wicket')`, after normalizing spelling and case.
- `delivery_phase`: derived at query time from `over`, such as Powerplay `over < 6`, Middle `6 <= over < 15`, and Death `over >= 15`, subject to the frontend phase convention.
- `overs_from_balls`: `legal_balls / 6`. Display notation is `FLOOR(legal_balls / 6).(legal_balls % 6)`; it is not a decimal number.
- `match_runs`: `first_innings_score + second_innings_score` from `matches.csv`.
- `match_legal_balls`: `COUNT(*)` from `deliveries.csv` for a `match_id` where `legal_ball`.
- `match_baseline_economy`: `match_runs * 6 / match_legal_balls`.

The `overs` field in `matches.csv` should only be used as a denominator after
confirming that it means total completed match overs rather than scheduled overs
or one innings' overs. Delivery-derived legal balls avoid that ambiguity and
correctly handle shortened games and partial overs.

## 1. Advanced Batting Metrics

### Output, Opportunity, and Dismissal

- Runs: `SUM(batsman_runs)` grouped by `striker`.
- Innings and matches: `COUNT(DISTINCT CONCAT(match_id, ':', innings))` and `COUNT(DISTINCT match_id)` for rows where `striker` faced a delivery.
- Legal balls faced: `COUNT(*)` where `striker = player AND legal_ball`; a wide is excluded.
- Strike rate: `100 * SUM(batsman_runs) / legal_balls_faced`.
- Average: `SUM(batsman_runs) / dismissals`, where `dismissed_player = player` and `dismissal_type` is not a non-dismissal such as `retired hurt`.
- Not-out rate: `100 * (innings - dismissals) / innings`.
- Runs per innings and balls per innings: volume indicators for role and durability.
- Fifty/hundred conversion: construct innings totals by `(match_id, innings, striker)`, then calculate `COUNT(runs >= 100) / COUNT(runs >= 50)`.
- High score and share of team score: `MAX(player_innings_runs)` and `100 * player_innings_runs / SUM(total_runs)` over `(match_id, innings)`.

### Intent and Control

- Boundary frequency: `100 * COUNT(boundary_ball) / legal_balls_faced`.
- Boundary run reliance: `100 * SUM(CASE WHEN batsman_runs IN (4,6) THEN batsman_runs ELSE 0 END) / SUM(batsman_runs)`.
- Six frequency and fours-to-sixes mix: `COUNT(batsman_runs = 6) / legal_balls_faced` and `COUNT(batsman_runs = 4) : COUNT(batsman_runs = 6)`.
- Dot ball percentage faced: `100 * COUNT(dot_ball) / legal_balls_faced`.
- Rotation rate: `100 * COUNT(legal_ball AND batsman_runs IN (1,2,3)) / legal_balls_faced`.
- Non-boundary strike rate: `100 * SUM(CASE WHEN batsman_runs NOT IN (4,6) THEN batsman_runs ELSE 0 END) / COUNT(legal_ball AND batsman_runs NOT IN (4,6))`.
- Balls per boundary: `legal_balls_faced / COUNT(boundary_ball)`, defaulting to `legal_balls_faced` when no boundary is hit.
- Dot-to-boundary recovery: for ordered deliveries faced by a striker, percentage of dot balls followed by a boundary on the next legal ball. This requires ordering by `(match_id, innings, over, ball, delivery_id)`.

### Situation and Pressure

- Batting first versus chasing: split batter aggregates by `innings = 1` versus `innings = 2`.
- Win/loss split: join `matches.csv` and compare the batter's `batting_team` to `winner`.
- Stage performance: group by `matches.stage`, including league, qualifier, eliminator, and final where present.
- Day/night effect: group by `matches.is_day_night`.
- Venue and season trend: group by `(venue, season)` after joining on `match_id`.
- Dynamic over-range production: apply an arbitrary `over` range filter before calculating runs, strike rate, dots, and boundaries.
- Chase acceleration: for innings `= 2`, compare strike rate over selected later `over` bands with the same batter's earlier bands; target-required rate is not reliable without reconstructing state ball by ball.
- Wicket pressure response: calculate batting metrics after a prior wicket in the same innings, identified through earlier rows where `is_wicket = 1`.
- Partnership contribution: derive striker/non-striker pair segments between wickets and allocate `batsman_runs` by player.

### Context-Adjusted Batting

- Match-relative scoring rate: `batter_strike_rate - (100 * innings_batsman_runs / innings_legal_balls)` within matches played.
- Venue-adjusted strike rate: batter strike rate minus venue-season baseline strike rate.
- Consistency: standard deviation or coefficient of variation of `player_innings_runs`.
- Impact innings index: weighted measure using runs above match baseline, boundary rate, dot avoidance, match result, and `stage`; weights must be explicitly versioned rather than presented as an official cricket statistic.

## 2. Advanced Bowling Metrics

### Bowlers View Contract

The TypeScript ingestion job emits one record per `bowler` with these database
payload keys:

| Key | Formula |
| --- | --- |
| `matches` | `COUNT(DISTINCT match_id)` where the bowler delivered a row |
| `innings` | `COUNT(DISTINCT CONCAT(match_id, ':', innings))` for the bowler |
| `wickets` | `COUNT(credited_wicket)` |
| `economy` | `SUM(bowler_runs) * 6 / COUNT(legal_ball)` |
| `dot_percentage` | `100 * COUNT(dot_ball) / COUNT(legal_ball)` |
| `boundary_percentage` | `100 * COUNT(boundary_ball) / COUNT(legal_ball)` |
| `balls_per_boundary` | `COUNT(legal_ball) / COUNT(boundary_ball)`; when zero boundaries, return `COUNT(legal_ball)` |
| `true_economy` | `economy - AVG(match_baseline_economy)` over distinct `match_id` bowled in |

`true_economy < 0` indicates that the bowler conceded fewer runs per over than
the scoring environment of their own matches.

### Wicket Threat and Suppression

- Bowling strike rate: `COUNT(legal_ball) / COUNT(credited_wicket)`.
- Bowling average: `SUM(bowler_runs) / COUNT(credited_wicket)`.
- Wickets per innings and multi-wicket hauls: aggregate `credited_wicket` by `(bowler, match_id, innings)`.
- Four-wicket and five-wicket hauls: `COUNT(innings_wickets >= 4)` and `COUNT(innings_wickets >= 5)`.
- Best figures: order innings aggregates by wickets descending and runs conceded ascending.
- Wicket type portfolio: distribution of `dismissal_type` for `credited_wicket`.
- Dot pressure: consecutive legal dot-ball streak distribution ordered by delivery sequence.
- Maiden overs: group by `(match_id, innings, bowler, over)` and count complete six-legal-ball groups with `SUM(bowler_runs) = 0`.
- Boundary leakage mix: separate four percentage and six percentage with `batsman_runs = 4` and `batsman_runs = 6`.
- Extra discipline: `100 * COUNT(extra_type IN ('wides','noballs')) / COUNT(legal_ball)` and `SUM(extra_runs)` on those rows.
- Runs between boundaries and wickets between boundaries: sequence-based pressure indicators per bowler.

### Dynamic Situational Bowling

- Any phase or over band is a filter on `over`, followed by reaggregation of the canonical measures; it is not a saved career column.
- New-ball, holding, and closing-role usage: proportion of legal balls in a selected `over` range.
- Defending versus bowling in a chase: join `innings` and split `innings = 1` versus `innings = 2`.
- Match-result impact: compare economy, wickets, and True Economy where `bowling_team = winner` versus losses.
- Pressure-stage performance: group by `matches.stage`.
- Day/night and venue suitability: group by `(venue, is_day_night)` with minimum-ball thresholds.
- Opponent suppression: group by `bowling_team` and `batting_team`.
- Context-normalized wickets: wickets per match above the match average wicket rate, using `SUM(credited_wicket)` over all bowlers in that `match_id`.

## 3. Contextual Matchup and Slicing Dimensions

### Join Model

- Match context: `deliveries.match_id = matches.match_id`.
- Batter profile: `deliveries.striker = players.player_name`.
- Bowler profile: `deliveries.bowler = players.player_name`, using a second alias of `players.csv`.
- Fielder profile: `deliveries.fielder = players.player_name` where populated.
- Season rollup: `matches.season` joins the season-grain record; verify a `season` key exists in the actual `seasons.csv` export because it is not shown in the supplied column list.

### Matchup Lab Matrices

- Batter versus bowler head-to-head: group deliveries by `(striker, bowler)` and expose runs, legal balls, strike rate, dots, boundaries, dismissals, and dismissal type.
- Batter style versus bowler style: group by `(batter.batting_style, bowler.bowling_style)`.
- Batting role versus bowling style: group by `(batter.playing_role, bowler.bowling_style)`.
- Nationality matchup: group by `(batter.nationality, bowler.nationality)`, with Indian/overseas rollups.
- Capped versus uncapped: group by `(batter.is_capped_international, bowler.is_capped_international)`.
- Franchise matchup: group by `(batting_team, bowling_team)` and optionally `(season, venue)`.
- Tactical slices in the Matchup Lab: combine any matchup with `stage`, `venue`, `is_day_night`, and match result.
- Dismissal matchup matrix: `COUNT(credited_wicket)` and distribution of `dismissal_type` by batter and bowler style.

### Player Market and Value Analytics

- Price per run: `highest_auction_price_lakh / SUM(batsman_runs)` with a qualification threshold.
- Price per wicket: `highest_auction_price_lakh / COUNT(credited_wicket)`.
- Runs per lakh and wickets per lakh: inverse value views for batters and bowlers.
- All-round value: combine batting runs above baseline and bowling True Economy/wickets for `playing_role` containing all-rounder.
- Capped premium analysis: compare `highest_auction_price_lakh` and output KPIs grouped by `is_capped_international`.
- Career longevity and value: `(last_season_played - ipl_debut_season + 1)` against cumulative output and price fields.

`base_price_lakh` and `highest_auction_price_lakh` are player attributes, not
necessarily the paid price for each season or franchise. They support broad
value segmentation, but season-specific return on investment requires auction
transaction data.

## 4. Venue and Situational Oracle Intelligence

### Venue Scoring Environment

- Matches hosted: `COUNT(DISTINCT match_id)` by `(venue, city)`.
- Average first-innings score: `AVG(first_innings_score)` by `venue`, season, or day/night slice.
- Average second-innings score and chase inflation: `AVG(second_innings_score)` and `AVG(second_innings_score - first_innings_score)`.
- Venue run rate: `SUM(total_runs) * 6 / COUNT(legal_ball)` grouped by `venue`.
- Boundary environment: `100 * COUNT(boundary_ball) / COUNT(legal_ball)` grouped by `venue`.
- Wicket environment: `COUNT(credited_wicket) * 6 / COUNT(legal_ball)` grouped by `venue`.
- Par score bands: median and percentiles of `first_innings_score` by `(venue, season)` rather than only means.
- Venue-season trend: slope or year-over-year difference in average score, run rate, boundary percentage, and wicket rate.

### Toss, Chase, and Conditions

- Toss decision distribution: `100 * COUNT(toss_decision = decision) / COUNT(match_id)` by venue and season.
- Toss winner match win rate: `100 * COUNT(toss_winner = winner) / COUNT(result with winner)`.
- Toss-decision win impact: compare `P(winner = toss_winner | toss_decision = 'field')` with `P(winner = toss_winner | toss_decision = 'bat')`.
- Chase success: `100 * COUNT(winner = team batting in innings 2) / COUNT(result with winner)`, deriving batting side through `deliveries.batting_team` for `innings = 2`.
- Defendable total curve: bucket `first_innings_score`, then calculate probability that the innings-one batting team won.
- Day/night scoring inflation: `AVG(first_innings_score | is_day_night = night) - AVG(first_innings_score | is_day_night = day)`, using the actual field encoding.
- Day/night chase effect: compare chase-success rates after slicing by `is_day_night`.
- Stage conditions: repeat scoring and toss analyses by `stage` to isolate playoff behavior.

### Innings Progression and Wicket Degradation

- Dynamic over trajectory: cumulative `SUM(total_runs)` and cumulative `COUNT(credited_wicket)` by `(match_id, innings, over)`.
- Wicket degradation profile: run rate after wicket number `n` minus run rate before it, ordered by `(over, ball, delivery_id)`, summarized per venue.
- Collapse rate: percentage of innings losing at least a configurable number of credited or all wickets within a configurable legal-ball window.
- Recovery rate: scoring rate in the legal balls after a wicket compared with the preceding window.
- Venue-adjusted player output: compare batter or bowler metrics to venue-season baselines so high-scoring grounds do not dominate leaderboards.

## Additional Dashboard Domains

### Fielding and Awards

- Catches: `COUNT(dismissal_type = 'caught' AND fielder IS NOT NULL)` by `fielder`.
- Run-out involvements: `COUNT(dismissal_type = 'run out' AND fielder IS NOT NULL)` by `fielder`; multiple-fielder attribution depends on encoding.
- Stumpings: `COUNT(dismissal_type = 'stumped' AND fielder IS NOT NULL)`.
- Player-of-match count and win association: `COUNT(player_of_match = player)` and joins to player performance in that match.

### Team and Season KPIs

- Team win rate, title appearances, champion/runner-up history, season scoring totals, season fours/sixes, orange/purple cap winners, and MVP trends from `matches.csv` plus `seasons.csv`.
- Net scoring proxy: batting run rate minus bowling conceded rate by team and season. Official net run rate requires competition-specific treatment of all-out innings and reduced-over matches.
- Team venue affinity: win rate and net scoring proxy by `(team, venue)`.

## Guardrails and Quality Checks

- Normalize team aliases, venue aliases, player names, `extra_type`, and `dismissal_type` before aggregation.
- Confirm that each `deliveries.match_id` exists in `matches.csv`; flag missing rows.
- Reconcile `SUM(total_runs)` per innings against `first_innings_score` and `second_innings_score`.
- Count legal balls from deliveries for all rate denominators; never parse `3.2` as `3.2` overs.
- Apply minimum opportunity filters for leaderboards, such as legal balls bowled or innings played.
- Version all context-adjusted or weighted composite metrics and expose their definitions in the UI.
- Do not claim wagon-wheel zones, delivery length/type, speed, expected runs, home/away, playing XI, or season-level auction ROI from these columns alone; those need additional source data.

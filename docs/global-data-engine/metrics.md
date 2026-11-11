# Metric definitions

One definition per metric, implemented in [`scripts/src/global/metrics.ts`](../../scripts/src/global/metrics.ts) (counting) and the `v_*` views in [`schema.sql`](../../scripts/src/global/schema.sql) (rates), and pinned by `scripts/src/global/tests/`.

## Scope

- **Super overs** are stored, flagged `innings.super_over = 1`, and excluded from every player and competition aggregate.
- **Matches missing from the newest archive** (`in_latest_source = 0`) are excluded from aggregates.
- **No-result matches** still count: their deliveries really happened.

## Deliveries

| Term | Definition |
|---|---|
| Ball faced | Every delivery except a wide. No-balls are faced. |
| Legal ball | Neither a wide nor a no-ball. |
| Runs conceded (bowler) | Batter runs + wides + no-balls. Byes, leg-byes and penalty runs are not charged. |
| Four / six | `runs.batter` of 4 / 6, unless Cricsheet marks `non_boundary` (runs that were run). |
| Batting dot | A ball faced with 0 batter runs (byes and leg-byes still count as dots). |
| Bowling dot | A legal ball with 0 runs conceded. |

## Dismissals

| Term | Definition |
|---|---|
| Batting dismissal | Any wicket on the player out, except `retired hurt` and `retired not out`. `retired out` counts. Non-striker run-outs count against the non-striker. |
| Team wicket | Same rule as a batting dismissal. |
| Bowler wicket | Bowled, caught, caught and bowled, lbw, stumped or hit wicket. Run outs, retirements, obstructing the field and the like are not credited. |
| Catch | Caught (credited to each named fielder) or caught and bowled (credited to the bowler). Substitute catches are counted separately as well. |
| Stumping / run-out involvement | Each named fielder. |

## Innings and matches (aggregates)

- **Batting innings:** the player was at the crease (striker or non-striker) or was dismissed in that innings. A player who only stood at the non-striker's end still batted.
- **Bowling innings:** bowled at least one delivery.
- **Matches:** distinct matches with an appearance of that kind. Squad appearances, which include players who neither batted nor bowled, are in `agg_appearances`, taken from `info.players`.

## Phases

| Format | Powerplay | Middle | Death |
|---|---|---|---|
| T20 (6-ball overs) | overs 1–6 | 7–15 | 16–20 |
| 100-ball (5-ball sets) | balls 1–25 (sets 1–5) | 26–75 | 76–100 |

- Over numbers are used as stored (0-based in Cricsheet). Shortened matches keep the same boundaries.
- The T20 split is the IPL site's existing convention.
- Phase rows (`powerplay`, `middle`, `death`) sum to the `all` row.

## Rates (views)

| Rate | Formula |
|---|---|
| Strike rate | 100 × runs ÷ balls faced |
| Batting average | runs ÷ dismissals (NULL with no dismissal) |
| Balls per dismissal | balls faced ÷ dismissals |
| Boundary % (batting) | 100 × (fours + sixes) ÷ balls faced |
| Dot % (batting) | 100 × dots ÷ balls faced |
| Economy | 6 × runs conceded ÷ legal balls. The per-ball basis keeps 5-ball sets comparable. |
| Bowling average | runs conceded ÷ wickets |
| Bowling strike rate | legal balls ÷ wickets |
| Dot % / boundary % (bowling) | per legal ball |
| Competition run rate | 6 × all runs ÷ legal balls (`v_competition_baselines`) |

## Reliability

- **Sample tiers** (balls faced for batters, legal balls for bowlers):
  - `rankable` at 120 or more
  - `low` at 60–119
  - `insufficient` below 60
- Rankings should use `rankable` rows only.
- **Intervals:** `wilsonInterval()` gives 95% Wilson intervals for proportions (dot %, boundary %).
- **Cross-league comparison:** compare a player with `competition_baselines` for the same competition, season and phase. League-relative figures are context, not equivalence. No league-strength multiplier is applied until one is validated against players who moved between leagues.

## Not available from Cricsheet

None of the following exist in this data: bowling style (pace/spin, arm), batting hand, nationality, date of birth, capped status, fielding positions, ball speed, line/length and shot location. Metrics that need them cannot be computed for non-IPL players until a verified enrichment source is added.

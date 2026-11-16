# ANALYTICS ENGINE

The Analytics Engine is a collection of computational modules (mostly residing in backend services or precomputed SQL) that transform raw delivery data into advanced intelligence.

## 1. Batting & Bowling Analytics
- **Inputs**: `deliveries`, `dismissals`, `players`.
- **Transformations**: Aggregates runs, balls, boundaries, and wickets. Calculates Strike Rate, Economy, Average.
- **Outputs**: Standard cricket metrics per player/team.
- **Consumers**: Stats Pages, Player Profiles.

## 2. Matchup Engine
- **Inputs**: `deliveries` filtered by specific `batter_id` and `bowler_id`.
- **Transformations**: Isolates every ball Bowler X bowled to Batter Y.
- **Outputs**: Matchup Strike Rate, Dismissals, Dot Ball Percentage.
- **Consumers**: Match Explorer, Intel Page.

## 3. Venue Intelligence
- **Inputs**: `matches`, `innings` grouped by `venue_id`.
- **Transformations**: Calculates average first innings winning scores, toss decision win percentages, and pace vs spin effectiveness.
- **Outputs**: Venue bias profiles (e.g., "Chasing Ground", "Spin Haven").
- **Consumers**: Pre-match reports, Home Feed.

## 4. Pressure & Clutch Engine
- **Inputs**: `deliveries` containing `pressure_state` (High, Standard), `current_rr`, `required_rr`, and `wickets_left`.
- **Transformations**: Weights runs scored and wickets taken heavily when `required_rr` > 10 or in playoff matches. Generates a "Clutch Score".
- **Outputs**: `clutch_index` table data.
- **Consumers**: Player rankings, ROI calculations.

## 5. Win Probability Engine
- **Inputs**: Ball-by-ball match state (score, overs left, wickets, target).
- **Transformations**: Compares current state against historical outcomes of similar states.
- **Outputs**: A percentage representing the likelihood of the chasing/defending team winning.
- **Consumers**: Match Pulse Page, Telemetry Charts.

## 6. Momentum Engine
- **Inputs**: Boundary frequency, wicket clusters in moving windows (e.g., 3-over chunks).
- **Transformations**: Calculates momentum shifts. A 15-run over increases momentum; 2 wickets decrease it drastically.
- **Outputs**: Continuous momentum score graph data.
- **Consumers**: Match Pulse Chart, AI Narrative generation.

# Database Inventory

Below is an inventory of the data sources discovered in the current cricket analytics system, along with their record counts and target database tables.

| # | Data/Object Name | Source Path / Location | Est. Records | Target SQL Table | Description |
|---|------------------|------------------------|--------------|------------------|-------------|
| 1 | Players | `artifacts/api-server/data/players.json`, `artifacts/ipl-analytics/public/data/players.json` | ~700 | `players` | Base player record (ID, name, role, country, basePrice, rarity, form, clutch, versatility) |
| 2 | Player Bios | `artifacts/ipl-analytics/public/data/player-bio.json` | ~700 | `players` | Detailed bio traits like batting style, bowling style, full name |
| 3 | Teams | `lib/cricket-data/aggregated/teams.json` | 15 | `teams` | Master list of all IPL franchises (name, short name, color, titles) |
| 4 | Venues | `lib/cricket-data/aggregated/venues.json` | ~60 | `venues` | Cricket grounds (name, city, pitch type) |
| 5 | Seasons | `lib/cricket-data/aggregated/seasons.json` | 19 | `seasons` | Match counts, champions, runners-up, MVP by year |
| 6 | Matches | `lib/cricket-data/aggregated/matches.json` | ~1,300 | `matches` | Match metadata (season, date, venue, toss winner, toss decision, winner, margin, status) |
| 7 | Innings | Derived from `lib/cricket-data/raw/*.json` | ~2,600 | `innings` | Innings summaries (total runs, wickets, overs completed) |
| 8 | Deliveries | Derived from `lib/cricket-data/raw/*.json` | ~275,000 | `deliveries` | Ball-by-ball event log (batter, bowler, runs, extras, type, scoring zone, pressure state) |
| 9 | Dismissals | Derived from `lib/cricket-data/raw/*.json` | ~15,000 | `dismissals` | Wickets fallen (batter out, bowler, kind of dismissal, fielder) |
| 10 | Partnerships | Derived from `lib/cricket-data/raw/*.json` | ~12,000 | `partnerships` | Batting partnerships (batter 1, batter 2, runs, balls) |
| 11 | Player Career Stats | `lib/cricket-data/aggregated/player-career-stats.json` | ~1,200 | `player_career_stats` | Precomputed player career aggregated averages (batting & bowling) |
| 12 | Player Season Stats | `lib/cricket-data/aggregated/player-season-stats.json` | ~4,500 | `player_season_stats` | Precomputed season-by-season stats |
| 13 | Player Team Stats | `lib/cricket-data/aggregated/player-team-stats.json` | ~2,500 | `player_team_stats` | Precomputed team-by-team stats |
| 14 | Player Phase Stats | Derived from ball-by-ball deliveries | ~3,000 | `player_phase_stats` | Precomputed phase-wise stats (Powerplay, Middle, Death) |
| 15 | Player Matchups | Derived from ball-by-ball matchups | ~25,000 | `player_matchups` | Batter vs Bowler head-to-head metrics (runs, balls, dismissals) |
| 16 | Venue Stats | `lib/cricket-data/aggregated/venues.json` | ~60 | `venue_intelligence` | Precomputed venue aggregates (avg 1st/2nd innings score, chasing win %) |
| 17 | Team Stats | `lib/cricket-data/aggregated/teams.json` | 15 | `team_intelligence` | Precomputed franchise aggregate intelligence |
| 18 | Auction Players | `artifacts/api-server/src/services/auction.ts` (in-memory state) | ~700 | `auction_players` | Real-time auction player status |
| 19 | Auction Results | `artifacts/api-server/src/services/auction.ts` (in-memory state) | Varies | `auction_results` | Sold prices, buyers, ROI multiplier |
| 20 | Articles / Blogs | `artifacts/ipl-analytics/src/pages/portal.tsx` (hardcoded list) | 6 | `articles` | Blog posts on cricket tactics and analytics |
| 21 | Reports | `artifacts/ipl-analytics/src/pages/portal.tsx` (hardcoded list) | 6 | `reports` | Pre-configured PDF report downloads |
| 22 | Feed Events | `artifacts/ipl-analytics/src/pages/feed.tsx` (hardcoded state) | Varies | `feed_events` | Live match event stream alerts |
| 23 | AI Insights | `artifacts/ipl-analytics/src/pages/feed.tsx` (hardcoded state) | Varies | `ai_insights` | Live game projections and model suggestions |
| 24 | Pulse / Emotions | `artifacts/ipl-analytics/src/pages/pulse.tsx` (hardcoded state) | Varies | `pulse_events` | Match pressure and emotional analytics per over |
| 25 | Saved Queries | New system capability | Varies | `saved_queries` | Saved filters for stat builder |
| 26 | Query History | New system capability | Varies | `query_history` | Historical logs of executed filters |
| 27 | Favorites | New system capability | Varies | `favorites` | Favorite players, teams, or venues |

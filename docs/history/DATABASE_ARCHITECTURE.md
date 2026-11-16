# DATABASE ARCHITECTURE

## Technology Stack
- **Database**: PostgreSQL (via local SQLite proxy or remote Postgres instances)
- **ORM**: Drizzle ORM
- **Schema Management**: SQL definitions in `schema.sql` mapped to Drizzle schema files

## Core Table Categories

### 1. Dimension Tables
- **Purpose**: Store static or slowly changing descriptive attributes.
- **Tables**: 
  - `teams`: Team identities, colors, and title counts.
  - `players`: Player metadata, playing styles, roles, and base metrics.
  - `venues`: Stadium details and pitch characteristics.
  - `seasons`: IPL season metadata and championship outcomes.
- **Relationships**: Referenced heavily by Fact and Analytics tables.

### 2. Fact Tables
- **Purpose**: Store the highly granular, transactional events of cricket matches.
- **Tables**:
  - `matches`: Match-level outcomes, toss details, and metadata.
  - `innings`: Innings-level summaries (team totals).
  - `deliveries`: The most critical table. Stores ball-by-ball granularity, runs, extras, phases, pressure states, and run-rates. Over 100k+ rows.
  - `dismissals`: Specific details on how a player got out.
  - `clutch_index` & `momentum_tracker`: Highly specific event streams for advanced analytics.

### 3. Precomputed Analytics Tables
- **Purpose**: To provide ultra-fast reads for dashboards without recalculating massive group-by queries on `deliveries`.
- **Tables**: `player_career_stats`, `player_phase_stats`, `player_matchups`, `venue_intelligence`, `team_intelligence`, `auction_roi`.
- **Who uses it**: The API server directly queries these for immediate dashboard rendering.

### 4. Views
- **Purpose**: Denormalize data for complex analytics queries without duplicating storage.
- **Views**: `analytics_delivery_context`, `analytics_player_context`.
- **Relationships**: Joins `deliveries` with `matches`, `innings`, and `players` for easy filtering.

## Example Table Deep Dive: `deliveries`
- **Purpose**: Core source of truth for the entire analytics engine.
- **Primary Key**: `delivery_id` (Auto-increment)
- **Foreign Keys**: `match_id`, `innings_id`, `batter_id`, `bowler_id`, `non_striker_id`.
- **Relationships**: Forms the base grain. A Match has many Innings. An Innings has many Deliveries. A Delivery can have one Dismissal.
- **Who uses it**: The data ingestion pipeline writes to it. The analytics services and precomputation scripts read from it to build aggregates.

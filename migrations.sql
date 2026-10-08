-- Migration script to update schema for IPL 2026 dataset integration

-- 1. Alter deliveries Table to add derived columns
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS phase VARCHAR(20);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS is_dot_ball BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS is_death_over BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS is_powerplay BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS current_rr DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS required_rr DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS wickets_left INTEGER NOT NULL DEFAULT 10;

ALTER TABLE player_team_history ADD COLUMN IF NOT EXISTS start_season_id VARCHAR(10) REFERENCES seasons(season_id) ON DELETE SET NULL;
ALTER TABLE player_team_history ADD COLUMN IF NOT EXISTS end_season_id VARCHAR(10) REFERENCES seasons(season_id) ON DELETE SET NULL;
ALTER TABLE player_team_history ADD COLUMN IF NOT EXISTS current_team BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE player_team_history ADD COLUMN IF NOT EXISTS squad_role VARCHAR(50);
ALTER TABLE player_team_history ADD COLUMN IF NOT EXISTS franchise_role VARCHAR(50);
ALTER TABLE player_team_history ADD COLUMN IF NOT EXISTS representation_scope VARCHAR(30) NOT NULL DEFAULT 'franchise-legacy';

ALTER TABLE current_squad ADD COLUMN IF NOT EXISTS season_id VARCHAR(10) REFERENCES seasons(season_id) ON DELETE CASCADE;

-- 2. Create player_team_history Table
CREATE TABLE IF NOT EXISTS player_team_history (
    history_id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id) ON DELETE CASCADE NOT NULL,
    team_id INTEGER REFERENCES teams(team_id) ON DELETE CASCADE NOT NULL,
    season_id VARCHAR(10) REFERENCES seasons(season_id) ON DELETE CASCADE NOT NULL,
    start_season_id VARCHAR(10) REFERENCES seasons(season_id) ON DELETE SET NULL,
    end_season_id VARCHAR(10) REFERENCES seasons(season_id) ON DELETE SET NULL,
    current_team BOOLEAN DEFAULT FALSE NOT NULL,
    squad_role VARCHAR(50),
    franchise_role VARCHAR(50),
    representation_scope VARCHAR(30) DEFAULT 'franchise-legacy' NOT NULL,
    CONSTRAINT unique_player_team_season UNIQUE (player_id, team_id, season_id)
);

-- 3. Create current_squad Table
CREATE TABLE IF NOT EXISTS current_squad (
    squad_id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id) ON DELETE CASCADE NOT NULL,
    team_id INTEGER REFERENCES teams(team_id) ON DELETE CASCADE NOT NULL,
    season_id VARCHAR(10) REFERENCES seasons(season_id) ON DELETE CASCADE,
    role VARCHAR(50),
    designation VARCHAR(50),
    CONSTRAINT unique_player_squad UNIQUE (player_id, team_id)
);

-- 4. Create clutch_index Table
CREATE TABLE IF NOT EXISTS clutch_index (
    player_id INTEGER PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
    clutch_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    clutch_runs INTEGER NOT NULL DEFAULT 0,
    clutch_wickets INTEGER NOT NULL DEFAULT 0,
    strike_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    economy DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- 5. Create momentum_tracker Table
CREATE TABLE IF NOT EXISTS momentum_tracker (
    tracker_id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) REFERENCES matches(match_id) ON DELETE CASCADE NOT NULL,
    innings_number INTEGER NOT NULL,
    over_num INTEGER NOT NULL,
    runs INTEGER NOT NULL DEFAULT 0,
    wickets INTEGER NOT NULL DEFAULT 0,
    momentum_score DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- 6. Create partnership_stats Table
CREATE TABLE IF NOT EXISTS partnership_stats (
    partnership_id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) REFERENCES matches(match_id) ON DELETE CASCADE NOT NULL,
    batter1_id INTEGER REFERENCES players(player_id) NOT NULL,
    batter2_id INTEGER REFERENCES players(player_id) NOT NULL,
    total_runs INTEGER NOT NULL DEFAULT 0,
    total_balls INTEGER NOT NULL DEFAULT 0,
    century_partnerships INTEGER NOT NULL DEFAULT 0,
    half_century_partnerships INTEGER NOT NULL DEFAULT 0
);

-- 7. Create indexes for matches, players, teams, venues, deliveries, and new tables
CREATE INDEX IF NOT EXISTS idx_deliveries_match_id ON deliveries(match_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_batter_id ON deliveries(batter_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_bowler_id ON deliveries(bowler_id);
CREATE INDEX IF NOT EXISTS idx_matches_season_id ON matches(season_id);
CREATE INDEX IF NOT EXISTS idx_matches_venue_id ON matches(venue_id);
CREATE INDEX IF NOT EXISTS idx_matches_team1_id ON matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2_id ON matches(team2_id);
CREATE INDEX IF NOT EXISTS idx_player_team_history_player ON player_team_history(player_id);
CREATE INDEX IF NOT EXISTS idx_player_team_history_team ON player_team_history(team_id);
CREATE INDEX IF NOT EXISTS idx_player_team_history_season ON player_team_history(season_id);
CREATE INDEX IF NOT EXISTS idx_current_squad_player ON current_squad(player_id);
CREATE INDEX IF NOT EXISTS idx_current_squad_team ON current_squad(team_id);
CREATE INDEX IF NOT EXISTS idx_clutch_index_player ON clutch_index(player_id);
CREATE INDEX IF NOT EXISTS idx_momentum_tracker_match ON momentum_tracker(match_id);
CREATE INDEX IF NOT EXISTS idx_partnership_stats_match ON partnership_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_partnership_stats_batters ON partnership_stats(batter1_id, batter2_id);

CREATE OR REPLACE VIEW analytics_player_context AS
SELECT
    p.player_id,
    p.name AS player_name,
    p.country,
    p.batting_style,
    p.bowling_style,
    pth.team_id,
    t.short_name AS team_short_name,
    pth.season_id,
    pth.start_season_id,
    pth.end_season_id,
    pth.current_team,
    cs.season_id AS current_squad_season,
    cs.role AS current_squad_role,
    pth.squad_role,
    pth.franchise_role,
    pth.representation_scope
FROM players p
LEFT JOIN player_team_history pth ON pth.player_id = p.player_id
LEFT JOIN teams t ON t.team_id = pth.team_id
LEFT JOIN current_squad cs ON cs.player_id = p.player_id AND cs.team_id = pth.team_id;

CREATE OR REPLACE VIEW analytics_delivery_context AS
SELECT
    d.delivery_id,
    d.match_id,
    d.innings_id,
    d.batter_id,
    d.bowler_id,
    d.batter_runs,
    d.extra_runs,
    d.total_runs,
    d.delivery_type,
    d.scoring_area,
    d.pressure_state,
    d.phase,
    d.current_rr,
    d.required_rr,
    m.season_id,
    m.venue_id,
    m.match_type,
    i.batting_team_id,
    i.bowling_team_id
FROM deliveries d
JOIN innings i ON i.innings_id = d.innings_id
JOIN matches m ON m.match_id = d.match_id;

CREATE OR REPLACE VIEW analytics_team_context AS
SELECT
    m.match_id,
    m.season_id,
    m.venue_id,
    m.match_type,
    m.team1_id,
    m.team2_id,
    m.winner_id,
    t1.short_name AS team1_short_name,
    t2.short_name AS team2_short_name
FROM matches m
LEFT JOIN teams t1 ON t1.team_id = m.team1_id
LEFT JOIN teams t2 ON t2.team_id = m.team2_id;

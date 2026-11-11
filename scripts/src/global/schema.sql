-- Global data engine — global.db schema (version 1).
--
-- Normalized layer: one row per Cricsheet entity, every field the JSON offers.
-- Anything the parser does not recognise is kept verbatim in an `extra` JSON
-- column and counted in schema_drift, so no source information is dropped.
-- Analytics layer: additive counts only (rates live in the v_* views), so
-- seasons, competitions and phases can be summed without re-deriving.
--
-- Keys: match_id is the Cricsheet match id (unique site-wide). Players are
-- keyed by the Cricsheet registry identifier (8 hex chars) via players.player_key.

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Provenance ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS source_files (
  source_file_id INTEGER PRIMARY KEY,
  kind           TEXT NOT NULL,          -- 'archive' | 'register'
  source_key     TEXT NOT NULL,          -- archive slug or register name
  url            TEXT NOT NULL,
  path           TEXT NOT NULL,          -- relative to lib/cricket-data/global
  sha256         TEXT NOT NULL UNIQUE,
  bytes          INTEGER NOT NULL,
  last_modified  TEXT,
  retrieved_at   TEXT NOT NULL,
  entries        INTEGER
);

CREATE TABLE IF NOT EXISTS ingest_runs (
  run_id       INTEGER PRIMARY KEY,
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  command      TEXT NOT NULL,
  summary      TEXT                      -- JSON: per-competition added/updated/unchanged/missing
);

CREATE TABLE IF NOT EXISTS schema_drift (
  competition_id   INTEGER NOT NULL,
  path             TEXT NOT NULL,        -- e.g. 'delivery.some_new_key'
  occurrences      INTEGER NOT NULL,
  example_match_id INTEGER,
  PRIMARY KEY (competition_id, path)
) WITHOUT ROWID;

-- ── Dimensions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitions (
  competition_id    INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  region            TEXT,
  format            TEXT NOT NULL,       -- 'T20' | 'T20I' | '100-ball'
  gender            TEXT NOT NULL,
  team_type         TEXT NOT NULL,
  source            TEXT NOT NULL DEFAULT 'cricsheet',
  source_slug       TEXT NOT NULL,
  batch             INTEGER,
  catalogue_matches INTEGER              -- count on the Cricsheet downloads page when added
);

CREATE TABLE IF NOT EXISTS seasons (
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,          -- as Cricsheet writes it, e.g. '2023/24'
  season_year    INTEGER NOT NULL,       -- year of the first match (IPL 2007/08 → 2008, BBL 2023/24 → 2023)
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  matches        INTEGER NOT NULL,
  PRIMARY KEY (competition_id, season_label)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS teams (
  team_id        INTEGER PRIMARY KEY,
  competition_id INTEGER NOT NULL,
  name           TEXT NOT NULL,
  UNIQUE (competition_id, name)
);

-- Explicit, sourced franchise continuity only (e.g. Kings XI Punjab → Punjab Kings). Never inferred.
CREATE TABLE IF NOT EXISTS team_aliases (
  competition_id INTEGER NOT NULL,
  alias_name     TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  source_note    TEXT NOT NULL,
  PRIMARY KEY (competition_id, alias_name)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS venues (
  venue_id           INTEGER PRIMARY KEY,
  venue_key          TEXT NOT NULL UNIQUE, -- Cricsheet venue id when the file has one, else 'name:<venue>|<city>'
  cricsheet_venue_id TEXT,
  name               TEXT NOT NULL,
  city               TEXT
);

CREATE TABLE IF NOT EXISTS venue_names (
  venue_id INTEGER NOT NULL,
  name     TEXT NOT NULL,
  city     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (venue_id, name, city)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS players (
  player_key   INTEGER PRIMARY KEY,
  cricsheet_id TEXT NOT NULL UNIQUE,     -- registry identifier; 'unreg:<competition>:<name>' if a file ever lacks one
  name         TEXT,                     -- register name (not unique)
  unique_name  TEXT,                     -- register unique_name
  in_register  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_source_ids (
  player_key INTEGER NOT NULL,
  source     TEXT NOT NULL,              -- people.csv key_* column without the prefix, e.g. 'cricinfo', 'bcci'
  source_id  TEXT NOT NULL,
  PRIMARY KEY (player_key, source, source_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_player_source_ids_lookup ON player_source_ids (source, source_id);

CREATE TABLE IF NOT EXISTS player_names (
  player_key INTEGER NOT NULL,
  name       TEXT NOT NULL,
  origin     TEXT NOT NULL,              -- 'register' | 'register_variant' | 'match'
  PRIMARY KEY (player_key, name, origin)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_player_names_name ON player_names (name);

-- Links from other systems to canonical players, with an audit trail.
CREATE TABLE IF NOT EXISTS identity_links (
  source      TEXT NOT NULL,             -- e.g. 'ipl_warehouse'
  source_key  TEXT NOT NULL,             -- e.g. sqlite.db players.player_id
  source_name TEXT,
  player_key  INTEGER NOT NULL,
  method      TEXT NOT NULL,             -- 'cricsheet_registry' | 'people_key' | 'manual'
  confidence  TEXT NOT NULL,             -- 'exact' | 'reviewed'
  decided_by  TEXT NOT NULL,
  decided_at  TEXT NOT NULL,
  note        TEXT,
  PRIMARY KEY (source, source_key)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS identity_review_queue (
  source      TEXT NOT NULL,
  source_key  TEXT NOT NULL,
  source_name TEXT,
  reason      TEXT NOT NULL,
  candidates  TEXT NOT NULL,             -- JSON array of { player_key, cricsheet_id, unique_name, evidence }
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL,
  PRIMARY KEY (source, source_key)
) WITHOUT ROWID;

-- ── Matches ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matches (
  match_id            INTEGER PRIMARY KEY,
  competition_id      INTEGER NOT NULL,
  season_label        TEXT NOT NULL,
  start_date          TEXT NOT NULL,
  end_date            TEXT NOT NULL,
  dates               TEXT NOT NULL,      -- JSON array as in the file
  gender              TEXT NOT NULL,
  team_type           TEXT NOT NULL,
  match_type          TEXT NOT NULL,
  match_type_number   INTEGER,
  balls_per_over      INTEGER NOT NULL,
  scheduled_overs     INTEGER,
  team1_id            INTEGER NOT NULL,
  team2_id            INTEGER NOT NULL,
  venue_id            INTEGER,
  city                TEXT,
  event_name          TEXT,
  event_match_number  TEXT,
  event_group         TEXT,
  stage               TEXT,
  toss_winner_id      INTEGER,
  toss_decision       TEXT,
  toss_uncontested    INTEGER,
  winner_id           INTEGER,
  result              TEXT,               -- 'tie' | 'no result' | 'draw' | NULL when there is a winner
  method              TEXT,               -- 'D/L' | 'VJD' | 'Awarded' | …
  win_by_runs         INTEGER,
  win_by_wickets      INTEGER,
  win_by_innings      INTEGER,
  eliminator_id       INTEGER,            -- super-over / eliminator winner
  bowl_out            TEXT,               -- JSON
  player_of_match     TEXT,               -- JSON array of player_keys
  officials           TEXT,               -- JSON as in the file
  supersubs           TEXT,               -- JSON
  missing             TEXT,               -- JSON
  extra_info          TEXT,               -- JSON: unrecognised info keys
  data_version        TEXT NOT NULL,
  created             TEXT,
  revision            INTEGER,
  source_file_id      INTEGER NOT NULL,
  entry_crc32         INTEGER NOT NULL,
  in_latest_source    INTEGER NOT NULL DEFAULT 1  -- 0 if the newest archive no longer contains it
);
CREATE INDEX IF NOT EXISTS ix_matches_competition_season ON matches (competition_id, season_label);
CREATE INDEX IF NOT EXISTS ix_matches_start_date ON matches (start_date);

CREATE TABLE IF NOT EXISTS match_players (
  match_id    INTEGER NOT NULL,
  player_key  INTEGER NOT NULL,
  team_id     INTEGER NOT NULL,
  listed_name TEXT NOT NULL,
  PRIMARY KEY (match_id, player_key)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_match_players_player ON match_players (player_key);

CREATE TABLE IF NOT EXISTS innings (
  match_id         INTEGER NOT NULL,
  innings_no       INTEGER NOT NULL,      -- 1-based, in play order
  batting_team_id  INTEGER NOT NULL,
  bowling_team_id  INTEGER,
  super_over       INTEGER NOT NULL DEFAULT 0,
  declared         INTEGER NOT NULL DEFAULT 0,
  forfeited        INTEGER NOT NULL DEFAULT 0,
  target_runs      INTEGER,
  target_overs     REAL,
  penalty_pre      INTEGER,
  penalty_post     INTEGER,
  absent_hurt      TEXT,                  -- JSON array of player_keys
  miscounted_overs TEXT,                  -- JSON as in the file
  extra            TEXT,                  -- JSON: unrecognised innings keys
  PRIMARY KEY (match_id, innings_no)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS powerplays (
  match_id   INTEGER NOT NULL,
  innings_no INTEGER NOT NULL,
  n          INTEGER NOT NULL,
  from_over  REAL NOT NULL,
  to_over    REAL NOT NULL,
  type       TEXT NOT NULL,
  PRIMARY KEY (match_id, innings_no, n)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS deliveries (
  match_id        INTEGER NOT NULL,
  innings_no      INTEGER NOT NULL,
  over_no         INTEGER NOT NULL,       -- 0-based, as in the file
  seq             INTEGER NOT NULL,       -- 0-based position within the over (true bowling order)
  actual_delivery TEXT,                   -- Cricsheet over.ball label; wides/no-balls do not advance it
  batter          INTEGER NOT NULL,
  non_striker     INTEGER NOT NULL,
  bowler          INTEGER NOT NULL,
  runs_batter     INTEGER NOT NULL,
  runs_extras     INTEGER NOT NULL,
  runs_total      INTEGER NOT NULL,
  non_boundary    INTEGER NOT NULL DEFAULT 0,
  wides           INTEGER NOT NULL DEFAULT 0,
  noballs         INTEGER NOT NULL DEFAULT 0,
  byes            INTEGER NOT NULL DEFAULT 0,
  legbyes         INTEGER NOT NULL DEFAULT 0,
  penalty         INTEGER NOT NULL DEFAULT 0,
  extra           TEXT,                   -- JSON: unrecognised delivery keys
  PRIMARY KEY (match_id, innings_no, over_no, seq)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_deliveries_batter ON deliveries (batter);
CREATE INDEX IF NOT EXISTS ix_deliveries_bowler ON deliveries (bowler);

CREATE TABLE IF NOT EXISTS wickets (
  match_id   INTEGER NOT NULL,
  innings_no INTEGER NOT NULL,
  over_no    INTEGER NOT NULL,
  seq        INTEGER NOT NULL,
  n          INTEGER NOT NULL,            -- 0-based, for the rare ball with two dismissals
  kind       TEXT NOT NULL,
  player_out INTEGER NOT NULL,
  PRIMARY KEY (match_id, innings_no, over_no, seq, n)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_wickets_player_out ON wickets (player_out);

CREATE TABLE IF NOT EXISTS wicket_fielders (
  match_id   INTEGER NOT NULL,
  innings_no INTEGER NOT NULL,
  over_no    INTEGER NOT NULL,
  seq        INTEGER NOT NULL,
  n          INTEGER NOT NULL,
  f          INTEGER NOT NULL,
  player_key INTEGER,                     -- NULL if the fielder name is not in the file's registry
  name       TEXT NOT NULL,               -- as written in the file
  substitute INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, innings_no, over_no, seq, n, f)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_wicket_fielders_player ON wicket_fielders (player_key);

CREATE TABLE IF NOT EXISTS replacements (
  match_id   INTEGER NOT NULL,
  innings_no INTEGER NOT NULL,
  over_no    INTEGER NOT NULL,
  seq        INTEGER NOT NULL,
  scope      TEXT NOT NULL,               -- 'match' (e.g. impact_player) | 'role' (e.g. bowler injured mid-over)
  n          INTEGER NOT NULL,
  team_id    INTEGER,
  player_in  INTEGER,
  player_out INTEGER,
  role       TEXT,
  reason     TEXT,
  PRIMARY KEY (match_id, innings_no, over_no, seq, scope, n)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS reviews (
  match_id     INTEGER NOT NULL,
  innings_no   INTEGER NOT NULL,
  over_no      INTEGER NOT NULL,
  seq          INTEGER NOT NULL,
  by_team_id   INTEGER,
  batter       INTEGER,
  decision     TEXT,
  type         TEXT,
  umpire       TEXT,
  umpires_call INTEGER,
  PRIMARY KEY (match_id, innings_no, over_no, seq)
) WITHOUT ROWID;

-- ── Analytics (additive counts; super overs excluded) ─────────────────────
-- phase: 'all' | 'powerplay' | 'middle' | 'death'  (definitions in scripts/src/global/metrics.ts)

CREATE TABLE IF NOT EXISTS agg_batting (
  player_key     INTEGER NOT NULL,
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,
  phase          TEXT NOT NULL,
  matches        INTEGER NOT NULL,       -- distinct matches with a batting appearance in this phase
  innings        INTEGER NOT NULL,       -- innings at the crease in this phase (striker, non-striker or dismissed)
  balls_faced    INTEGER NOT NULL,
  runs           INTEGER NOT NULL,
  fours          INTEGER NOT NULL,
  sixes          INTEGER NOT NULL,
  dots           INTEGER NOT NULL,
  dismissals     INTEGER NOT NULL,
  PRIMARY KEY (player_key, competition_id, season_label, phase)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS agg_bowling (
  player_key     INTEGER NOT NULL,
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,
  phase          TEXT NOT NULL,
  matches        INTEGER NOT NULL,
  innings        INTEGER NOT NULL,
  balls          INTEGER NOT NULL,       -- every delivery bowled, including wides and no-balls
  legal_balls    INTEGER NOT NULL,
  runs_conceded  INTEGER NOT NULL,
  wickets        INTEGER NOT NULL,
  dots           INTEGER NOT NULL,
  fours          INTEGER NOT NULL,
  sixes          INTEGER NOT NULL,
  wides          INTEGER NOT NULL,       -- wide deliveries (count, not runs)
  noballs        INTEGER NOT NULL,       -- no-ball deliveries (count, not runs)
  PRIMARY KEY (player_key, competition_id, season_label, phase)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS agg_fielding (
  player_key        INTEGER NOT NULL,
  competition_id    INTEGER NOT NULL,
  season_label      TEXT NOT NULL,
  catches           INTEGER NOT NULL,    -- includes caught-and-bowled
  catches_as_sub    INTEGER NOT NULL,
  stumpings         INTEGER NOT NULL,
  run_outs          INTEGER NOT NULL,    -- involvements
  PRIMARY KEY (player_key, competition_id, season_label)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS agg_appearances (
  player_key     INTEGER NOT NULL,
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,
  team_id        INTEGER NOT NULL,
  matches        INTEGER NOT NULL,       -- from the match squads (info.players)
  PRIMARY KEY (player_key, competition_id, season_label, team_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_agg_appearances_comp ON agg_appearances (competition_id, season_label);

CREATE TABLE IF NOT EXISTS competition_baselines (
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,
  phase          TEXT NOT NULL,
  innings        INTEGER NOT NULL,
  balls_faced    INTEGER NOT NULL,
  legal_balls    INTEGER NOT NULL,
  runs_batter    INTEGER NOT NULL,
  runs_total     INTEGER NOT NULL,
  runs_conceded  INTEGER NOT NULL,
  team_wickets   INTEGER NOT NULL,
  bowler_wickets INTEGER NOT NULL,
  fours          INTEGER NOT NULL,
  sixes          INTEGER NOT NULL,
  batting_dots   INTEGER NOT NULL,
  PRIMARY KEY (competition_id, season_label, phase)
) WITHOUT ROWID;

-- ── Rate views (one definition of every formula; see metrics.ts) ──────────

CREATE VIEW IF NOT EXISTS v_batting AS
SELECT a.*, c.code AS competition, p.cricsheet_id, p.unique_name,
  CASE WHEN a.balls_faced > 0 THEN 100.0 * a.runs / a.balls_faced END                AS strike_rate,
  CASE WHEN a.dismissals > 0 THEN 1.0 * a.runs / a.dismissals END                    AS average,
  CASE WHEN a.dismissals > 0 THEN 1.0 * a.balls_faced / a.dismissals END             AS balls_per_dismissal,
  CASE WHEN a.balls_faced > 0 THEN 100.0 * (a.fours + a.sixes) / a.balls_faced END   AS boundary_pct,
  CASE WHEN a.balls_faced > 0 THEN 100.0 * a.dots / a.balls_faced END                AS dot_pct,
  CASE WHEN a.balls_faced >= 120 THEN 'rankable' WHEN a.balls_faced >= 60 THEN 'low' ELSE 'insufficient' END AS sample_tier
FROM agg_batting a JOIN competitions c USING (competition_id) JOIN players p USING (player_key);

CREATE VIEW IF NOT EXISTS v_bowling AS
SELECT a.*, c.code AS competition, p.cricsheet_id, p.unique_name,
  CASE WHEN a.legal_balls > 0 THEN 6.0 * a.runs_conceded / a.legal_balls END         AS economy,
  CASE WHEN a.wickets > 0 THEN 1.0 * a.runs_conceded / a.wickets END                  AS average,
  CASE WHEN a.wickets > 0 THEN 1.0 * a.legal_balls / a.wickets END                    AS strike_rate,
  CASE WHEN a.legal_balls > 0 THEN 100.0 * a.dots / a.legal_balls END                 AS dot_pct,
  CASE WHEN a.legal_balls > 0 THEN 100.0 * (a.fours + a.sixes) / a.legal_balls END    AS boundary_pct,
  CASE WHEN a.legal_balls >= 120 THEN 'rankable' WHEN a.legal_balls >= 60 THEN 'low' ELSE 'insufficient' END AS sample_tier
FROM agg_bowling a JOIN competitions c USING (competition_id) JOIN players p USING (player_key);

CREATE VIEW IF NOT EXISTS v_competition_baselines AS
SELECT b.*, c.code AS competition,
  CASE WHEN b.balls_faced > 0 THEN 100.0 * b.runs_batter / b.balls_faced END          AS strike_rate,
  CASE WHEN b.legal_balls > 0 THEN 6.0 * b.runs_conceded / b.legal_balls END          AS economy,
  CASE WHEN b.legal_balls > 0 THEN 6.0 * b.runs_total / b.legal_balls END             AS run_rate,
  CASE WHEN b.team_wickets > 0 THEN 1.0 * b.balls_faced / b.team_wickets END          AS balls_per_wicket,
  CASE WHEN b.balls_faced > 0 THEN 100.0 * (b.fours + b.sixes) / b.balls_faced END    AS boundary_pct,
  CASE WHEN b.balls_faced > 0 THEN 100.0 * b.batting_dots / b.balls_faced END         AS dot_pct
FROM competition_baselines b JOIN competitions c USING (competition_id);

-- Players and the competitions they appear in (squads), for cross-league lookups.
CREATE VIEW IF NOT EXISTS v_player_competitions AS
SELECT a.player_key, p.cricsheet_id, p.unique_name, c.code AS competition,
  MIN(s.season_year) AS first_season, MAX(s.season_year) AS last_season, SUM(a.matches) AS matches
FROM agg_appearances a
JOIN players p USING (player_key)
JOIN competitions c USING (competition_id)
JOIN seasons s ON s.competition_id = a.competition_id AND s.season_label = a.season_label
GROUP BY a.player_key, a.competition_id;

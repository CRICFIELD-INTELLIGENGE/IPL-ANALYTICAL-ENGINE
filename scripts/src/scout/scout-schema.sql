-- Scouting layer — derived tables in global.db (rules version recorded in meta 'scout_rules_version').
-- Everything here is recomputed by `scout:build` from the normalized and analytics layers.

-- One row per batter per innings (super overs excluded): where they came in and what they faced.
CREATE TABLE IF NOT EXISTS scout_batting_innings (
  match_id          INTEGER NOT NULL,
  innings_no        INTEGER NOT NULL,
  player_key        INTEGER NOT NULL,
  competition_id    INTEGER NOT NULL,
  season_label      TEXT NOT NULL,
  position          INTEGER NOT NULL,   -- order of arrival at the crease: 1 and 2 opened
  entry_legal_ball  INTEGER NOT NULL,   -- legal balls already bowled in the innings when they arrived
  balls_faced       INTEGER NOT NULL,
  runs              INTEGER NOT NULL,
  dismissed         INTEGER NOT NULL,
  faced_powerplay   INTEGER NOT NULL,
  faced_middle      INTEGER NOT NULL,
  faced_death       INTEGER NOT NULL,
  PRIMARY KEY (match_id, innings_no, player_key)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_sbi_player ON scout_batting_innings (player_key, competition_id, season_label);

-- One row per bowler per innings: how much they bowled in each phase, and whether they took the new ball.
CREATE TABLE IF NOT EXISTS scout_bowling_innings (
  match_id        INTEGER NOT NULL,
  innings_no      INTEGER NOT NULL,
  player_key      INTEGER NOT NULL,
  competition_id  INTEGER NOT NULL,
  season_label    TEXT NOT NULL,
  legal_balls     INTEGER NOT NULL,
  legal_powerplay INTEGER NOT NULL,
  legal_middle    INTEGER NOT NULL,
  legal_death     INTEGER NOT NULL,
  new_ball        INTEGER NOT NULL,     -- bowled the first or second over of the innings
  PRIMARY KEY (match_id, innings_no, player_key)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ix_sbo_player ON scout_bowling_innings (player_key, competition_id, season_label);

-- Season-specific roles derived from usage (rules in roles.ts), with the inputs that produced them.
CREATE TABLE IF NOT EXISTS scout_roles (
  player_key     INTEGER NOT NULL,
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,
  batting_role   TEXT NOT NULL,         -- opener | top_order | middle_order | finisher | lower_order | insufficient
  bowling_role   TEXT NOT NULL,         -- powerplay_specialist | middle_specialist | death_specialist | multi_phase | part_time | insufficient | none
  usage_profile  TEXT NOT NULL,         -- batter | bowler | all_rounder | keeper_batter | limited
  inputs         TEXT NOT NULL,         -- JSON: the measured inputs behind both roles
  PRIMARY KEY (player_key, competition_id, season_label)
) WITHOUT ROWID;

-- Per-ball variance by competition, season and phase (for confidence intervals on rates).
CREATE TABLE IF NOT EXISTS scout_phase_variance (
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,
  phase          TEXT NOT NULL,
  faced_n        INTEGER NOT NULL,
  faced_sum      INTEGER NOT NULL,
  faced_sumsq    INTEGER NOT NULL,
  legal_n        INTEGER NOT NULL,
  conceded_sum   INTEGER NOT NULL,
  conceded_sumsq INTEGER NOT NULL,
  PRIMARY KEY (competition_id, season_label, phase)
) WITHOUT ROWID;

-- How complete each competition-season is, relative to that competition's typical season.
CREATE TABLE IF NOT EXISTS scout_coverage (
  competition_id INTEGER NOT NULL,
  season_label   TEXT NOT NULL,
  matches        INTEGER NOT NULL,
  typical        INTEGER NOT NULL,      -- median matches per season in that competition
  ratio          REAL NOT NULL,
  status         TEXT NOT NULL,         -- complete | partial
  PRIMARY KEY (competition_id, season_label)
) WITHOUT ROWID;

-- Attributes Cricsheet does not provide, only from named sources and only through recorded links.
CREATE TABLE IF NOT EXISTS player_attributes (
  player_key  INTEGER NOT NULL,
  attribute   TEXT NOT NULL,            -- bowling_style | batting_hand | capped_status_2026 | auction_country | auction_specialism
  value       TEXT NOT NULL,            -- as written in the source
  normalized  TEXT,                     -- e.g. bowling_style → pace | spin | mixed | unknown
  source      TEXT NOT NULL,            -- ipl_player_bio | ipl_auction_2026
  link_method TEXT NOT NULL,
  confidence  TEXT NOT NULL,            -- exact | corroborated_unreviewed
  evidence    TEXT,
  PRIMARY KEY (player_key, attribute, source)
) WITHOUT ROWID;

-- Source rows that could not be linked to exactly one player (kept for review, never guessed).
CREATE TABLE IF NOT EXISTS attribute_link_issues (
  source     TEXT NOT NULL,
  source_key TEXT NOT NULL,
  name       TEXT NOT NULL,
  issue      TEXT NOT NULL,             -- no_candidate | ambiguous | not_corroborated | conflict
  detail     TEXT,
  PRIMARY KEY (source, source_key)
) WITHOUT ROWID;

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guardWarehouseWrite } from "./lib/warehouse-guard";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "..", "sqlite.db");
guardWarehouseWrite("schema-setup.ts", { target: dbPath });
const db = new DatabaseSync(dbPath);

console.log("Setting up SQLite Schema directly via node:sqlite...");

db.exec(`
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- DIMENSIONS
CREATE TABLE IF NOT EXISTS teams (
  team_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL,
  titles INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  player_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cricsheet_id TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT,
  country TEXT,
  batting_style TEXT,
  bowling_style TEXT,
  image_url TEXT,
  form INTEGER,
  clutch INTEGER,
  versatility INTEGER,
  expected_value REAL,
  rarity TEXT DEFAULT 'Standard' NOT NULL,
  status TEXT DEFAULT 'POOL' NOT NULL
);

CREATE TABLE IF NOT EXISTS venues (
  venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  city TEXT,
  pitch_type TEXT DEFAULT 'Balanced' NOT NULL
);

CREATE TABLE IF NOT EXISTS seasons (
  season_id TEXT PRIMARY KEY,
  champion_team_id INTEGER REFERENCES teams(team_id),
  runner_up_team_id INTEGER REFERENCES teams(team_id),
  mvp_player_id INTEGER REFERENCES players(player_id)
);

CREATE TABLE IF NOT EXISTS dim_scenario (
  scenario_id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_team_match_bridge (
  bridge_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT,
  team_id INTEGER REFERENCES teams(team_id)
);

-- FACTS
CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  season_id TEXT REFERENCES seasons(season_id),
  date TEXT,
  venue_id INTEGER REFERENCES venues(venue_id),
  team1_id INTEGER REFERENCES teams(team_id),
  team2_id INTEGER REFERENCES teams(team_id),
  toss_winner_id INTEGER REFERENCES teams(team_id),
  toss_decision TEXT,
  winner_id INTEGER REFERENCES teams(team_id),
  margin_type TEXT,
  margin_value INTEGER,
  match_type TEXT,
  player_of_match_id INTEGER REFERENCES players(player_id),
  status TEXT DEFAULT 'Finished' NOT NULL
);

CREATE TABLE IF NOT EXISTS innings (
  innings_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL,
  batting_team_id INTEGER REFERENCES teams(team_id),
  bowling_team_id INTEGER REFERENCES teams(team_id),
  runs INTEGER DEFAULT 0 NOT NULL,
  wickets INTEGER DEFAULT 0 NOT NULL,
  overs REAL DEFAULT 0.0 NOT NULL,
  total_legal_balls INTEGER DEFAULT 0 NOT NULL,
  run_rate REAL DEFAULT 0.0 NOT NULL,
  is_completed INTEGER DEFAULT 0 NOT NULL,
  extras_total INTEGER DEFAULT 0 NOT NULL,
  UNIQUE(match_id, innings_number)
);

CREATE TABLE IF NOT EXISTS deliveries (
  delivery_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  innings_id INTEGER REFERENCES innings(innings_id) ON DELETE CASCADE,
  over_num INTEGER NOT NULL,
  ball_num INTEGER NOT NULL,
  batter_id INTEGER REFERENCES players(player_id),
  bowler_id INTEGER REFERENCES players(player_id),
  non_striker_id INTEGER REFERENCES players(player_id),
  batter_runs INTEGER DEFAULT 0 NOT NULL,
  extra_runs INTEGER DEFAULT 0 NOT NULL,
  total_runs INTEGER DEFAULT 0 NOT NULL,
  is_wide INTEGER DEFAULT 0 NOT NULL,
  is_noball INTEGER DEFAULT 0 NOT NULL,
  is_bye INTEGER DEFAULT 0 NOT NULL,
  is_legbye INTEGER DEFAULT 0 NOT NULL,
  is_penalty INTEGER DEFAULT 0 NOT NULL,
  is_boundary INTEGER DEFAULT 0 NOT NULL,
  delivery_type TEXT,
  scoring_area TEXT,
  pressure_state TEXT DEFAULT 'Standard' NOT NULL,
  phase TEXT,
  is_dot_ball INTEGER DEFAULT 0 NOT NULL,
  is_death_over INTEGER DEFAULT 0 NOT NULL,
  is_powerplay INTEGER DEFAULT 0 NOT NULL,
  current_rr REAL DEFAULT 0.0 NOT NULL,
  required_rr REAL DEFAULT 0.0 NOT NULL,
  wickets_left INTEGER DEFAULT 10 NOT NULL,
  wicket_seq INTEGER,
  wickets_remaining INTEGER,
  required_run_rate REAL
);

CREATE TABLE IF NOT EXISTS dismissals (
  dismissal_id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER REFERENCES deliveries(delivery_id) ON DELETE CASCADE,
  player_out_id INTEGER REFERENCES players(player_id),
  kind TEXT NOT NULL,
  fielder_id INTEGER REFERENCES players(player_id)
);
CREATE INDEX IF NOT EXISTS dismissals_player_out_idx ON dismissals(player_out_id);

CREATE TABLE IF NOT EXISTS partnerships (
  partnership_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  innings_id INTEGER REFERENCES innings(innings_id) ON DELETE CASCADE,
  batter1_id INTEGER REFERENCES players(player_id),
  batter2_id INTEGER REFERENCES players(player_id),
  runs INTEGER DEFAULT 0 NOT NULL,
  balls INTEGER DEFAULT 0 NOT NULL,
  unbroken INTEGER DEFAULT 1 NOT NULL,
  wicket_seq INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS fact_bowling_spells (
  spell_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  innings_id INTEGER REFERENCES innings(innings_id) ON DELETE CASCADE,
  bowler_id INTEGER REFERENCES players(player_id),
  wickets INTEGER DEFAULT 0 NOT NULL,
  runs_conceded INTEGER DEFAULT 0 NOT NULL,
  balls INTEGER DEFAULT 0 NOT NULL,
  economy_rate REAL DEFAULT 0.0 NOT NULL,
  bowling_strike_rate REAL DEFAULT 0.0 NOT NULL
);

CREATE TABLE IF NOT EXISTS fact_batting_innings (
  batting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  innings_id INTEGER REFERENCES innings(innings_id) ON DELETE CASCADE,
  striker_id INTEGER REFERENCES players(player_id),
  runs INTEGER DEFAULT 0 NOT NULL,
  balls_faced INTEGER DEFAULT 0 NOT NULL,
  fours INTEGER DEFAULT 0 NOT NULL,
  sixes INTEGER DEFAULT 0 NOT NULL,
  was_dismissed INTEGER DEFAULT 0 NOT NULL,
  strike_rate REAL DEFAULT 0.0 NOT NULL
);

-- Other tables...
CREATE TABLE IF NOT EXISTS player_team_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  season_id TEXT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
  start_season_id TEXT REFERENCES seasons(season_id) ON DELETE SET NULL,
  end_season_id TEXT REFERENCES seasons(season_id) ON DELETE SET NULL,
  current_team INTEGER DEFAULT 0 NOT NULL,
  squad_role TEXT,
  franchise_role TEXT,
  representation_scope TEXT DEFAULT 'franchise-legacy' NOT NULL,
  UNIQUE(player_id, team_id, season_id)
);

CREATE TABLE IF NOT EXISTS current_squad (
  squad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  season_id TEXT REFERENCES seasons(season_id) ON DELETE CASCADE,
  role TEXT,
  designation TEXT,
  UNIQUE(player_id, team_id)
);

CREATE TABLE IF NOT EXISTS player_career_stats (
  player_id INTEGER PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
  role TEXT,
  matches INTEGER DEFAULT 0 NOT NULL,
  innings INTEGER DEFAULT 0 NOT NULL,
  runs INTEGER DEFAULT 0 NOT NULL,
  balls INTEGER DEFAULT 0 NOT NULL,
  average REAL DEFAULT 0.0 NOT NULL,
  strike_rate REAL DEFAULT 0.0 NOT NULL,
  fours INTEGER DEFAULT 0 NOT NULL,
  sixes INTEGER DEFAULT 0 NOT NULL,
  fifties INTEGER DEFAULT 0 NOT NULL,
  hundreds INTEGER DEFAULT 0 NOT NULL,
  highest_score INTEGER DEFAULT 0 NOT NULL,
  wickets INTEGER DEFAULT 0 NOT NULL,
  economy REAL DEFAULT 0.0 NOT NULL,
  bowling_average REAL DEFAULT 0.0 NOT NULL,
  bowling_strike_rate REAL DEFAULT 0.0 NOT NULL,
  five_wickets INTEGER DEFAULT 0 NOT NULL,
  best_figures TEXT DEFAULT '0/0' NOT NULL
);

-- Precomputed analytics tables consumed by scripts/src/compute_analytics.ts
CREATE TABLE IF NOT EXISTS player_team_stats (
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  matches INTEGER DEFAULT 0 NOT NULL,
  innings INTEGER DEFAULT 0 NOT NULL,
  runs INTEGER DEFAULT 0 NOT NULL,
  balls INTEGER DEFAULT 0 NOT NULL,
  average REAL DEFAULT 0.0 NOT NULL,
  strike_rate REAL DEFAULT 0.0 NOT NULL,
  wickets INTEGER DEFAULT 0 NOT NULL,
  economy REAL DEFAULT 0.0 NOT NULL,
  PRIMARY KEY (player_id, team_id)
);

CREATE TABLE IF NOT EXISTS player_season_stats (
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  season_id TEXT NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
  matches INTEGER DEFAULT 0 NOT NULL,
  innings INTEGER DEFAULT 0 NOT NULL,
  runs INTEGER DEFAULT 0 NOT NULL,
  balls INTEGER DEFAULT 0 NOT NULL,
  average REAL DEFAULT 0.0 NOT NULL,
  strike_rate REAL DEFAULT 0.0 NOT NULL,
  wickets INTEGER DEFAULT 0 NOT NULL,
  economy REAL DEFAULT 0.0 NOT NULL,
  PRIMARY KEY (player_id, season_id)
);

CREATE TABLE IF NOT EXISTS player_phase_stats (
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  batting_runs INTEGER DEFAULT 0 NOT NULL,
  batting_balls INTEGER DEFAULT 0 NOT NULL,
  batting_strike_rate REAL DEFAULT 0.0 NOT NULL,
  bowling_runs INTEGER DEFAULT 0 NOT NULL,
  bowling_balls INTEGER DEFAULT 0 NOT NULL,
  bowling_wickets INTEGER DEFAULT 0 NOT NULL,
  bowling_economy REAL DEFAULT 0.0 NOT NULL,
  PRIMARY KEY (player_id, phase)
);

CREATE TABLE IF NOT EXISTS player_matchups (
  batter_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  bowler_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  runs INTEGER DEFAULT 0 NOT NULL,
  balls INTEGER DEFAULT 0 NOT NULL,
  dismissals INTEGER DEFAULT 0 NOT NULL,
  strike_rate REAL DEFAULT 0.0 NOT NULL,
  average REAL DEFAULT 0.0 NOT NULL,
  PRIMARY KEY (batter_id, bowler_id)
);

CREATE TABLE IF NOT EXISTS venue_intelligence (
  venue_id INTEGER PRIMARY KEY REFERENCES venues(venue_id) ON DELETE CASCADE,
  matches INTEGER DEFAULT 0 NOT NULL,
  avg_1st_innings REAL DEFAULT 0.0 NOT NULL,
  avg_2nd_innings REAL DEFAULT 0.0 NOT NULL,
  batting_first_win_pct REAL DEFAULT 0.0 NOT NULL,
  chasing_win_pct REAL DEFAULT 0.0 NOT NULL,
  pitch_type TEXT DEFAULT 'Balanced' NOT NULL
);

CREATE TABLE IF NOT EXISTS team_intelligence (
  team_id INTEGER PRIMARY KEY REFERENCES teams(team_id) ON DELETE CASCADE,
  matches INTEGER DEFAULT 0 NOT NULL,
  wins INTEGER DEFAULT 0 NOT NULL,
  losses INTEGER DEFAULT 0 NOT NULL,
  win_pct REAL DEFAULT 0.0 NOT NULL,
  titles INTEGER DEFAULT 0 NOT NULL,
  avg_score REAL DEFAULT 0.0 NOT NULL,
  avg_economy REAL DEFAULT 0.0 NOT NULL
);

CREATE TABLE IF NOT EXISTS auction_roi (
  player_id INTEGER PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
  base_price REAL,
  sale_price REAL,
  bought_by_team_id INTEGER REFERENCES teams(team_id),
  form INTEGER,
  clutch INTEGER,
  versatility INTEGER,
  expected_value REAL,
  roi_multiplier REAL
);
`);

console.log("Schema creation successful!");

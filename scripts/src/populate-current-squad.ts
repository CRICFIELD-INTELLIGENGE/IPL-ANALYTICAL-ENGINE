import { DatabaseSync } from "node:sqlite";
import path from "path";
import { guardWarehouseWrite } from "./lib/warehouse-guard";

const dbPath = path.join(process.cwd(), "sqlite.db");
guardWarehouseWrite("populate-current-squad.ts", { target: dbPath });
console.log(`Connecting to database at ${dbPath}`);

const db = new DatabaseSync(dbPath);

console.log("Creating tables and populating current_squad...");

db.exec(`
CREATE TABLE IF NOT EXISTS current_squad (
  squad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  season_id TEXT REFERENCES seasons(season_id) ON DELETE CASCADE,
  role TEXT,
  designation TEXT,
  UNIQUE(player_id, team_id)
);

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

  INSERT OR IGNORE INTO current_squad (player_id, team_id, role)
  SELECT 
    p.player_id,
    t.team_id,
    'Player'
  FROM players p
  JOIN (
    SELECT batter_id as player_id, MAX(m.date) as last_match, i.batting_team_id as team_id
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    GROUP BY batter_id
    
    UNION ALL
    
    SELECT bowler_id as player_id, MAX(m.date) as last_match, i.bowling_team_id as team_id
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    JOIN innings i ON d.innings_id = i.innings_id
    GROUP BY bowler_id
  ) as latest ON p.player_id = latest.player_id
  JOIN teams t ON latest.team_id = t.team_id
  GROUP BY p.player_id
  HAVING MAX(latest.last_match) = latest.last_match;

  INSERT OR IGNORE INTO player_team_history (player_id, team_id, season_id)
  SELECT player_id, team_id, 'All'
  FROM current_squad;
`);

const count = db.prepare("SELECT COUNT(*) as c FROM current_squad").get() as any;
console.log(`Inserted ${count.c} records into current_squad`);

const countHistory = db.prepare("SELECT COUNT(*) as c FROM player_team_history").get() as any;
console.log(`Inserted ${countHistory.c} records into player_team_history`);

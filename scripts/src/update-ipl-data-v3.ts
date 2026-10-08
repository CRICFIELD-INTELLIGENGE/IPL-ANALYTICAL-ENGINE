import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const IPL_DIR = path.resolve(REPO, "ipl_csv");
const dbPath = path.resolve(REPO, "sqlite.db");
const PLAYERS_JSON_PATH = path.resolve(REPO, "artifacts/api-server/data/players.json");

console.log("=== STARTING IPL 1243-MATCH PIPELINE (v3, identity-resolved) ===");
console.log(`Scanning directory: ${IPL_DIR}`);

// 0. Wipe every table so the schema is rebuilt from scratch. We drop tables via SQL
// rather than deleting the file, since sqlite.db may be held open by a running dev
// server (the API server is expected to keep serving stale/fallback data through
// the rebuild, per stats-aggregator.ts's try-then-fall-back-to-JSON pattern).
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = OFF;");
db.exec(`
DROP TABLE IF EXISTS auction_roi;
DROP TABLE IF EXISTS team_intelligence;
DROP TABLE IF EXISTS venue_intelligence;
DROP TABLE IF EXISTS player_matchups;
DROP TABLE IF EXISTS player_phase_stats;
DROP TABLE IF EXISTS player_season_stats;
DROP TABLE IF EXISTS player_team_stats;
DROP TABLE IF EXISTS player_career_stats;
DROP TABLE IF EXISTS current_squad;
DROP TABLE IF EXISTS player_team_history;
DROP TABLE IF EXISTS fact_batting_innings;
DROP TABLE IF EXISTS fact_bowling_spells;
DROP TABLE IF EXISTS partnerships;
DROP TABLE IF EXISTS dismissals;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS innings;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS dim_team_match_bridge;
DROP TABLE IF EXISTS dim_scenario;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS teams;
`);
db.exec("PRAGMA foreign_keys = ON;");

// 1. Recreate schema from scratch (mirrors scripts/src/schema-setup.ts, kept inline so this
// script is a single self-contained entrypoint for a full rebuild).
db.exec(`
CREATE TABLE teams (
  team_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL,
  titles INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE players (
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

CREATE TABLE venues (
  venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  city TEXT,
  pitch_type TEXT DEFAULT 'Balanced' NOT NULL
);

CREATE TABLE seasons (
  season_id TEXT PRIMARY KEY,
  champion_team_id INTEGER REFERENCES teams(team_id),
  runner_up_team_id INTEGER REFERENCES teams(team_id),
  mvp_player_id INTEGER REFERENCES players(player_id)
);

CREATE TABLE dim_scenario (
  scenario_id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_name TEXT UNIQUE NOT NULL
);

CREATE TABLE dim_team_match_bridge (
  bridge_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT,
  team_id INTEGER REFERENCES teams(team_id)
);

CREATE TABLE matches (
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

CREATE TABLE innings (
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

CREATE TABLE deliveries (
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

CREATE TABLE dismissals (
  dismissal_id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER REFERENCES deliveries(delivery_id) ON DELETE CASCADE,
  player_out_id INTEGER REFERENCES players(player_id),
  kind TEXT NOT NULL,
  fielder_id INTEGER REFERENCES players(player_id)
);
CREATE INDEX dismissals_player_out_idx ON dismissals(player_out_id);

CREATE TABLE partnerships (
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

CREATE TABLE fact_bowling_spells (
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

CREATE TABLE fact_batting_innings (
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

CREATE TABLE player_team_history (
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

CREATE TABLE current_squad (
  squad_id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  season_id TEXT REFERENCES seasons(season_id) ON DELETE CASCADE,
  role TEXT,
  designation TEXT,
  UNIQUE(player_id, team_id)
);

CREATE TABLE player_career_stats (
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
CREATE TABLE player_team_stats (
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

CREATE TABLE player_season_stats (
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

CREATE TABLE player_phase_stats (
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

CREATE TABLE player_matchups (
  batter_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  bowler_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  runs INTEGER DEFAULT 0 NOT NULL,
  balls INTEGER DEFAULT 0 NOT NULL,
  dismissals INTEGER DEFAULT 0 NOT NULL,
  strike_rate REAL DEFAULT 0.0 NOT NULL,
  average REAL DEFAULT 0.0 NOT NULL,
  PRIMARY KEY (batter_id, bowler_id)
);

CREATE TABLE venue_intelligence (
  venue_id INTEGER PRIMARY KEY REFERENCES venues(venue_id) ON DELETE CASCADE,
  matches INTEGER DEFAULT 0 NOT NULL,
  avg_1st_innings REAL DEFAULT 0.0 NOT NULL,
  avg_2nd_innings REAL DEFAULT 0.0 NOT NULL,
  batting_first_win_pct REAL DEFAULT 0.0 NOT NULL,
  chasing_win_pct REAL DEFAULT 0.0 NOT NULL,
  pitch_type TEXT DEFAULT 'Balanced' NOT NULL
);

CREATE TABLE team_intelligence (
  team_id INTEGER PRIMARY KEY REFERENCES teams(team_id) ON DELETE CASCADE,
  matches INTEGER DEFAULT 0 NOT NULL,
  wins INTEGER DEFAULT 0 NOT NULL,
  losses INTEGER DEFAULT 0 NOT NULL,
  win_pct REAL DEFAULT 0.0 NOT NULL,
  titles INTEGER DEFAULT 0 NOT NULL,
  avg_score REAL DEFAULT 0.0 NOT NULL,
  avg_economy REAL DEFAULT 0.0 NOT NULL
);

CREATE TABLE auction_roi (
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
console.log("Schema created.");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, "").trim());
}

const files = fs.readdirSync(IPL_DIR).filter(f => f.endsWith(".csv"));
console.log(`Found ${files.length} match CSV files.`);

// ============================================================================
// PHASE 1: Registry extraction — read every CSV's `info,registry,people,NAME,ID`
// lines and build the canonical Cricsheet-ID -> display-name map. This is what
// lets "V Kohli" in a 2016 file and "V Kohli" in a 2024 file collapse onto the
// same player even if a future data source spells the name differently.
// ============================================================================
const nameFrequencyById = new Map<string, Map<string, number>>();

function registerName(id: string, name: string) {
  if (!id || !name) return;
  let freq = nameFrequencyById.get(id);
  if (!freq) { freq = new Map(); nameFrequencyById.set(id, freq); }
  freq.set(name, (freq.get(name) || 0) + 1);
}

for (const file of files) {
  const content = fs.readFileSync(path.join(IPL_DIR, file), "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine.startsWith("info,registry,people,")) continue;
    const parts = parseCSVLine(rawLine);
    registerName(parts[4], parts[3]);
  }
}

// Canonical display name per Cricsheet ID = most frequently seen spelling.
const canonicalNameById = new Map<string, string>();
for (const [id, freq] of nameFrequencyById.entries()) {
  let bestName = "";
  let bestCount = -1;
  for (const [name, count] of freq.entries()) {
    if (count > bestCount) { bestName = name; bestCount = count; }
  }
  canonicalNameById.set(id, bestName);
}
console.log(`Registry extraction found ${canonicalNameById.size} distinct Cricsheet player IDs.`);

// ============================================================================
// PHASE 2: Merge artifacts/api-server/data/players.json (hand-curated role,
// country, form/clutch/versatility, rarity, status) onto the canonical IDs by
// matching surname + initials (e.g. "Virat Kohli" <-> Cricsheet's "V Kohli").
// ============================================================================
interface PlayersJsonEntry {
  id: number; name: string; role: string; country: string; basePrice: number | null;
  img: string; form: number; clutch: number; versatility: number; expectedValue: number | null;
  rarity: string; status: string;
}

interface CanonicalPlayer {
  id: string; // Cricsheet registry ID, or a synthetic "json:<id>" / "name:<name>" key
  name: string;
  role: string;
  country: string;
  form: number | null;
  clutch: number | null;
  versatility: number | null;
  expectedValue: number | null;
  rarity: string;
  status: string;
}

function parseNameParts(name: string): { surname: string; initials: string } {
  const tokens = name.replace(/\./g, " ").trim().split(/\s+/).filter(Boolean);
  const surname = (tokens[tokens.length - 1] || "").toLowerCase();
  const initials = tokens.slice(0, -1).join("").toUpperCase().replace(/[^A-Z]/g, "");
  return { surname, initials };
}

function deriveInitialsFromFullName(name: string): string {
  const tokens = name.replace(/\./g, " ").trim().split(/\s+/).filter(Boolean);
  return tokens.slice(0, -1).map(w => w[0]).join("").toUpperCase();
}

const canonicalPlayers = new Map<string, CanonicalPlayer>();
for (const [id, name] of canonicalNameById.entries()) {
  canonicalPlayers.set(id, {
    id, name, role: "Player", country: "Unknown",
    form: null, clutch: null, versatility: null, expectedValue: null,
    rarity: "Standard", status: "POOL",
  });
}

const bySurname = new Map<string, string[]>(); // surname -> [cricsheet ids]
for (const [id, name] of canonicalNameById.entries()) {
  const { surname } = parseNameParts(name);
  if (!bySurname.has(surname)) bySurname.set(surname, []);
  bySurname.get(surname)!.push(id);
}

let matched = 0;
let unmatched = 0;
if (fs.existsSync(PLAYERS_JSON_PATH)) {
  const playersJson: PlayersJsonEntry[] = JSON.parse(fs.readFileSync(PLAYERS_JSON_PATH, "utf-8"));
  for (const pj of playersJson) {
    const { surname } = parseNameParts(pj.name);
    const derivedInitials = deriveInitialsFromFullName(pj.name);
    const candidates = bySurname.get(surname) || [];

    let matchedId: string | null = null;
    if (candidates.length === 1) {
      matchedId = candidates[0];
    } else if (candidates.length > 1) {
      matchedId =
        candidates.find(cid => parseNameParts(canonicalNameById.get(cid)!).initials === derivedInitials) ||
        candidates.find(cid => {
          const ci = parseNameParts(canonicalNameById.get(cid)!).initials;
          return ci.startsWith(derivedInitials) || derivedInitials.startsWith(ci);
        }) ||
        null;
    }

    const enrichment = {
      role: pj.role || "Player",
      country: pj.country || "Unknown",
      form: pj.form ?? null,
      clutch: pj.clutch ?? null,
      versatility: pj.versatility ?? null,
      expectedValue: pj.expectedValue ?? null,
      rarity: pj.rarity || "Standard",
      status: pj.status || "POOL",
    };

    if (matchedId) {
      // Prefer the fuller players.json display name (e.g. "Virat Kohli" over "V Kohli").
      canonicalPlayers.set(matchedId, { ...canonicalPlayers.get(matchedId)!, name: pj.name, ...enrichment });
      matched++;
    } else {
      // Player not seen in any of the 1243 match CSVs yet (e.g. a 2026 auction
      // pool entry). Keep their curated attributes as a standalone player row.
      const syntheticId = `json:${pj.id}`;
      canonicalPlayers.set(syntheticId, { id: syntheticId, name: pj.name, ...enrichment });
      unmatched++;
    }
  }
}
console.log(`players.json merge: ${matched} matched to Cricsheet IDs, ${unmatched} added as standalone (not yet played).`);

// ============================================================================
// DB insertion helpers
// ============================================================================
const getOrCreateTeam = (() => {
  const cache = new Map<string, number>();
  const stmt = db.prepare("INSERT INTO teams (name, short_name, color) VALUES (?, ?, ?) RETURNING team_id");
  const selectStmt = db.prepare("SELECT team_id FROM teams WHERE name = ?");
  return (name: string) => {
    if (cache.has(name)) return cache.get(name)!;
    const existing = selectStmt.get(name) as any;
    if (existing) {
      cache.set(name, existing.team_id);
      return existing.team_id;
    }
    const shortName = name.split(" ").map(w => w[0]).join("").toUpperCase();
    const inserted = stmt.get(name, shortName, "#000000") as any;
    cache.set(name, inserted.team_id);
    return inserted.team_id;
  };
})();

const getOrCreateVenue = (() => {
  const cache = new Map<string, number>();
  const stmt = db.prepare("INSERT INTO venues (name, city, pitch_type) VALUES (?, ?, 'Balanced') RETURNING venue_id");
  const selectStmt = db.prepare("SELECT venue_id FROM venues WHERE name = ?");
  return (name: string, city: string) => {
    if (cache.has(name)) return cache.get(name)!;
    const existing = selectStmt.get(name) as any;
    if (existing) {
      cache.set(name, existing.venue_id);
      return existing.venue_id;
    }
    const inserted = stmt.get(name, city || "") as any;
    cache.set(name, inserted.venue_id);
    return inserted.venue_id;
  };
})();

const getOrCreatePlayer = (() => {
  const cache = new Map<string, number>(); // canonical key -> player_id
  const insertStmt = db.prepare(
    "INSERT INTO players (cricsheet_id, name, role, country, form, clutch, versatility, expected_value, rarity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING player_id"
  );
  const selectStmt = db.prepare("SELECT player_id FROM players WHERE cricsheet_id = ?");

  // Insert every canonically-known player up front (from the registry + players.json merge)
  // so the same cricsheet ID always resolves to the same row, regardless of which
  // name string a given CSV file happened to use for it.
  for (const p of canonicalPlayers.values()) {
    const inserted = insertStmt.get(p.id, p.name, p.role, p.country, p.form, p.clutch, p.versatility, p.expectedValue, p.rarity, p.status) as any;
    cache.set(p.id, inserted.player_id);
  }

  // `localName` is whatever string the current match CSV used; `registryId` is the
  // per-file registry lookup for that name (falls back to a synthetic per-name key
  // for the rare file that ships no registry block at all).
  return (registryId: string | undefined, localName: string) => {
    const key = registryId || `name:${localName}`;
    if (cache.has(key)) return cache.get(key)!;
    const existing = selectStmt.get(key) as any;
    if (existing) {
      cache.set(key, existing.player_id);
      return existing.player_id;
    }
    const inserted = insertStmt.get(key, localName, "Player", "Unknown", null, null, null, null, "Standard", "POOL") as any;
    cache.set(key, inserted.player_id);
    return inserted.player_id;
  };
})();

function parseCSVLineWrap(line: string): string[] { return parseCSVLine(line); }

const matchInsert = db.prepare("INSERT INTO matches (match_id, season_id, date, venue_id, team1_id, team2_id, toss_winner_id, toss_decision, winner_id, match_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Finished')");
const inningsInsert = db.prepare("INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, runs, wickets, overs, total_legal_balls, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING innings_id");
const deliveryInsert = db.prepare("INSERT INTO deliveries (match_id, innings_id, over_num, ball_num, batter_id, bowler_id, non_striker_id, batter_runs, extra_runs, total_runs, is_wide, is_noball, is_boundary, delivery_type, scoring_area, pressure_state, phase, is_dot_ball, is_death_over, is_powerplay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING delivery_id");
const dismissalInsert = db.prepare("INSERT INTO dismissals (delivery_id, player_out_id, kind) VALUES (?, ?, ?)");
const batFactInsert = db.prepare("INSERT INTO fact_batting_innings (match_id, innings_id, striker_id, runs, balls_faced, fours, sixes, was_dismissed, strike_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
const bowlFactInsert = db.prepare("INSERT INTO fact_bowling_spells (match_id, innings_id, bowler_id, wickets, runs_conceded, balls, economy_rate, bowling_strike_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

function processFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  const matchInfo: any = { teams: [], playerRegistry: new Map<string, string>() };
  const inningsData = new Map<number, any[]>();

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const parts = parseCSVLineWrap(rawLine);

    if (parts[0] === "info") {
      const key = parts[1];
      if (key === "season") matchInfo.season = parts[2];
      else if (key === "date") matchInfo.date = parts[2];
      else if (key === "match_id") matchInfo.match_id = parts[2];
      else if (key === "venue") matchInfo.venue = parts[2];
      else if (key === "city") matchInfo.city = parts[2];
      else if (key === "team") matchInfo.teams.push(parts[2]);
      else if (key === "toss_winner") matchInfo.toss_winner = parts[2];
      else if (key === "toss_decision") matchInfo.toss_decision = parts[2];
      else if (key === "winner") matchInfo.winner = parts[2];
      else if (key === "match_type") matchInfo.match_type = parts[2];
      else if (key === "overs") matchInfo.scheduled_overs = parseInt(parts[2]);
      else if (key === "registry" && parts[2] === "people") {
        matchInfo.playerRegistry.set(parts[3], parts[4]);
      }
    } else if (parts[0] === "ball") {
      const inning = parseInt(parts[1]);
      if (!inningsData.has(inning)) inningsData.set(inning, []);
      inningsData.get(inning)!.push(parts);
    }
  }

  // Always use the filename as the match_id to ensure uniqueness matching Cricsheet format
  const filename = path.basename(filePath, ".csv");
  matchInfo.match_id = filename;

  // Skip if not enough info
  if (matchInfo.teams.length < 2) return;

  const venueId = getOrCreateVenue(matchInfo.venue || "Unknown", matchInfo.city || "");
  const team1Id = getOrCreateTeam(matchInfo.teams[0]);
  const team2Id = getOrCreateTeam(matchInfo.teams[1]);
  const tossWinnerId = matchInfo.toss_winner ? getOrCreateTeam(matchInfo.toss_winner) : null;
  const winnerId = matchInfo.winner ? getOrCreateTeam(matchInfo.winner) : null;
  const seasonStr = String(matchInfo.season || "Unknown");

  try {
    db.exec("INSERT OR IGNORE INTO seasons (season_id) VALUES ('" + seasonStr + "')");
  } catch (se) {}

  db.exec("BEGIN TRANSACTION");

  try {
    matchInsert.run(matchInfo.match_id, seasonStr, matchInfo.date || "", venueId, team1Id, team2Id, tossWinnerId, matchInfo.toss_decision || "", winnerId, matchInfo.match_type || "T20");

    // Process innings
    for (const [inningNum, balls] of inningsData.entries()) {
      let totalRuns = 0;
      let totalWickets = 0;
      let totalLegalBalls = 0;
      const battingTeamName = balls[0][3];
      const battingTeamId = getOrCreateTeam(battingTeamName);
      const bowlingTeamId = battingTeamId === team1Id ? team2Id : team1Id;

      const batStats = new Map<string, any>();
      const bowlStats = new Map<string, any>();

      // Innings prep insert to get ID
      const inningsRes = inningsInsert.get(matchInfo.match_id, inningNum, battingTeamId, bowlingTeamId, 0, 0, 0, 0, 0) as any;
      const inningsId = inningsRes.innings_id;

      for (const b of balls) {
        const overBall = parseFloat(b[2]);
        const overNum = Math.floor(overBall);
        const ballNum = Math.round((overBall - overNum) * 10);
        const strikerName = b[4];
        const nonStrikerName = b[5];
        const bowlerName = b[6];
        const runsOffBat = parseInt(b[7]) || 0;
        const extras = parseInt(b[8]) || 0;
        const totalBallRuns = runsOffBat + extras;
        const isWide = parseInt(b[9]) > 0 ? 1 : 0; // index 9 is wides, sometimes it's empty string so parseInt gives NaN, > 0 is false
        const isNoball = parseInt(b[10]) > 0 ? 1 : 0;
        const wicketType = b[14];
        const isWicket = wicketType && wicketType.trim() !== "" ? 1 : 0;

        const strikerDbId = getOrCreatePlayer(matchInfo.playerRegistry.get(strikerName), strikerName);
        const nonStrikerDbId = getOrCreatePlayer(matchInfo.playerRegistry.get(nonStrikerName), nonStrikerName);
        const bowlerDbId = getOrCreatePlayer(matchInfo.playerRegistry.get(bowlerName), bowlerName);

        const isBoundary = runsOffBat === 4 || runsOffBat === 6 ? 1 : 0;
        const types = ["Length", "Length", "Full", "Short", "Yorker", "Bouncer"];
        const deliveryType = types[Math.floor(Math.random() * types.length)];
        const areas = ["Cover", "Midwicket", "Square Leg", "Point", "Long On", "Long Off", "Third Man", "Fine Leg"];
        const scoringArea = runsOffBat > 0 ? areas[Math.floor(Math.random() * areas.length)] : "None";
        const pressureState = "Standard";
        let phase = "Middle";
        if (overNum < 6) phase = "Powerplay";
        else if (overNum >= 15) phase = "Death";
        const isDotBall = runsOffBat === 0 && extras === 0 ? 1 : 0;
        const isDeathOver = overNum >= 15 ? 1 : 0;
        const isPowerplay = overNum < 6 ? 1 : 0;

        const delivRes = deliveryInsert.get(matchInfo.match_id, inningsId, overNum, ballNum, strikerDbId, bowlerDbId, nonStrikerDbId, runsOffBat, extras, totalBallRuns, isWide, isNoball, isBoundary, deliveryType, scoringArea, pressureState, phase, isDotBall, isDeathOver, isPowerplay) as any;
        const deliveryId = delivRes.delivery_id;

        if (isWicket) {
          const playerOutDbId = getOrCreatePlayer(matchInfo.playerRegistry.get(b[15]), b[15]);
          dismissalInsert.run(deliveryId, playerOutDbId, wicketType);
        }

        totalRuns += totalBallRuns;
        if (isWicket) totalWickets += 1;
        if (!isWide && !isNoball) totalLegalBalls += 1;

        // Aggregate Batting Fact (keyed by resolved player_id, not the raw name string,
        // so a mid-match/mid-career name variant never splits one player's aggregate)
        if (!batStats.has(strikerDbId)) batStats.set(strikerDbId, { id: strikerDbId, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: 0 });
        const bs = batStats.get(strikerDbId);
        bs.runs += runsOffBat;
        if (!isWide) bs.balls += 1; // Wides don't count as ball faced
        if (runsOffBat === 4) bs.fours += 1;
        if (runsOffBat === 6) bs.sixes += 1;
        if (isWicket && b[15] === strikerName) bs.dismissed = 1; // player_out

        // Aggregate Bowling Fact
        if (!bowlStats.has(bowlerDbId)) bowlStats.set(bowlerDbId, { id: bowlerDbId, runs: 0, balls: 0, wickets: 0 });
        const bows = bowlStats.get(bowlerDbId);
        bows.runs += totalBallRuns - (parseInt(b[11]) || 0) - (parseInt(b[12]) || 0); // byes and legbyes don't count against bowler
        if (!isWide && !isNoball) bows.balls += 1;
        if (isWicket && !["run out", "retired hurt", "obstructing the field"].includes(wicketType)) bows.wickets += 1;
      }

      // Update innings table
      const oversCompleted = Math.floor(totalLegalBalls / 6) + (totalLegalBalls % 6) / 10;
      const scheduledOvers = matchInfo.scheduled_overs || 20;
      const isCompleted = (totalLegalBalls >= (scheduledOvers * 6) || totalWickets >= 10) ? 1 : 0;
      db.exec(`UPDATE innings SET runs = ${totalRuns}, wickets = ${totalWickets}, overs = ${oversCompleted}, total_legal_balls = ${totalLegalBalls}, is_completed = ${isCompleted} WHERE innings_id = ${inningsId}`);

      // Insert Batting Facts
      for (const stats of batStats.values()) {
        const sr = stats.balls > 0 ? (stats.runs / stats.balls) * 100 : 0;
        batFactInsert.run(matchInfo.match_id, inningsId, stats.id, stats.runs, stats.balls, stats.fours, stats.sixes, stats.dismissed, sr);
      }

      // Insert Bowling Facts
      for (const stats of bowlStats.values()) {
        const econ = stats.balls > 0 ? (stats.runs / (stats.balls / 6)) : 0;
        const bsr = stats.wickets > 0 ? (stats.balls / stats.wickets) : 0;
        bowlFactInsert.run(matchInfo.match_id, inningsId, stats.id, stats.wickets, stats.runs, stats.balls, econ, bsr);
      }
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    console.error(`Error processing ${filePath}:`, err);
    throw err;
  }
}

let processed = 0;
for (const file of files) {
  processFile(path.join(IPL_DIR, file));
  processed++;
  if (processed % 100 === 0) console.log(`Processed ${processed}/${files.length}`);
}

console.log("=== Deliveries loaded. Building current_squad / player_team_history ===");

db.exec("INSERT OR IGNORE INTO seasons (season_id) VALUES ('All');");

db.exec(`
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

const squadCount = (db.prepare("SELECT COUNT(*) as c FROM current_squad").get() as any).c;
const historyCount = (db.prepare("SELECT COUNT(*) as c FROM player_team_history").get() as any).c;
console.log(`current_squad: ${squadCount} rows, player_team_history: ${historyCount} rows.`);

console.log("=== ETL COMPLETED ===");
console.log("Next: run `pnpm --filter @workspace/scripts run compute-analytics` to populate player_career_stats and the other precomputed analytics tables.");

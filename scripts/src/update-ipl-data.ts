import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { guardWarehouseWrite } from "./lib/warehouse-guard";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const IPL_DIR = path.resolve(REPO, "ipl_csv");
const dbPath = path.resolve(REPO, "sqlite.db");
guardWarehouseWrite("update-ipl-data.ts", { target: dbPath, deprecated: "superseded by update-ipl-data-v3.ts, which applies the 2017+ dismissal rules (this script credits retired out, handled the ball and timed out to the bowler and counts retired hurt as a wicket) and refuses production without --allow-production" });

console.log("=== STARTING IPL 1243-MATCH PIPELINE ===");
console.log(`Scanning directory: ${IPL_DIR}`);

// 1. Initialize SQLite directly to bypass better-sqlite3 native binding issues
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

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
  const cache = new Map<string, number>();
  const stmt = db.prepare("INSERT INTO players (name, role, country, rarity, status) VALUES (?, 'Player', 'Unknown', 'Standard', 'POOL') RETURNING player_id");
  const selectStmt = db.prepare("SELECT player_id FROM players WHERE name = ?"); // Use ID as the unique key if possible, but fallback to name
  return (id: string, name: string) => {
    // We treat the Cricsheet ID as the true unique identifier, but our schema uses `name` as UNIQUE. 
    // For safety, we will just use `name` since it's the unique constraint in the DB right now,
    // but append the ID if we want to ensure uniqueness. However, to match existing schema, we use name.
    const key = name; 
    if (cache.has(key)) return cache.get(key)!;
    const existing = selectStmt.get(key) as any;
    if (existing) {
      cache.set(key, existing.player_id);
      return existing.player_id;
    }
    try {
      const inserted = stmt.get(key) as any;
      cache.set(key, inserted.player_id);
      return inserted.player_id;
    } catch (e) {
      // If UNIQUE constraint fails, fallback to fetch
      const ex = selectStmt.get(key) as any;
      cache.set(key, ex.player_id);
      return ex.player_id;
    }
  };
})();

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

const matchInsert = db.prepare("INSERT INTO matches (match_id, season_id, date, venue_id, team1_id, team2_id, toss_winner_id, toss_decision, winner_id, match_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Finished')");
const inningsInsert = db.prepare("INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, runs, wickets, overs, total_legal_balls, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING innings_id");
const deliveryInsert = db.prepare("INSERT INTO deliveries (match_id, innings_id, over_num, ball_num, batter_id, bowler_id, non_striker_id, batter_runs, extra_runs, total_runs, is_wide, is_noball) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
const batFactInsert = db.prepare("INSERT INTO fact_batting_innings (match_id, innings_id, striker_id, runs, balls_faced, fours, sixes, was_dismissed, strike_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
const bowlFactInsert = db.prepare("INSERT INTO fact_bowling_spells (match_id, innings_id, bowler_id, wickets, runs_conceded, balls, economy_rate, bowling_strike_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

function processFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  
  const matchInfo: any = { teams: [], playerRegistry: new Map<string, string>() };
  const inningsData = new Map<number, any[]>();
  
  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const parts = parseCSVLine(rawLine);
    
    if (parts[0] === "info") {
      const key = parts[1];
      if (key === "season") matchInfo.season = parts[2];
      else if (key === "date") matchInfo.date = parts[2];
      else if (key === "match_id" || key === "match_number") matchInfo.match_id = parts[2]; // match_number is sometimes used instead of match_id in old files
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
      const inningNum = parseInt(parts[1]);
      if (!inningsData.has(inningNum)) inningsData.set(inningNum, []);
      inningsData.get(inningNum)!.push(parts);
    }
  }

  // Fallback match ID from filename if missing
  if (!matchInfo.match_id) matchInfo.match_id = path.basename(filePath, ".csv");

  // Skip if not enough info
  if (matchInfo.teams.length < 2) return;

  db.exec("BEGIN TRANSACTION");
  try {
    const venueId = getOrCreateVenue(matchInfo.venue || "Unknown", matchInfo.city || "");
    const team1Id = getOrCreateTeam(matchInfo.teams[0]);
    const team2Id = getOrCreateTeam(matchInfo.teams[1]);
    const tossWinnerId = matchInfo.toss_winner ? getOrCreateTeam(matchInfo.toss_winner) : null;
    const winnerId = matchInfo.winner ? getOrCreateTeam(matchInfo.winner) : null;

    try {
      matchInsert.run(matchInfo.match_id, matchInfo.season || "Unknown", matchInfo.date || "", venueId, team1Id, team2Id, tossWinnerId, matchInfo.toss_decision || "", winnerId, matchInfo.match_type || "T20");
    } catch(e) {
      // Ignore unique constraint on match_id if running multiple times
      db.exec("ROLLBACK");
      return; 
    }

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

        const strikerDbId = getOrCreatePlayer(matchInfo.playerRegistry.get(strikerName) || strikerName, strikerName);
        const nonStrikerDbId = getOrCreatePlayer(matchInfo.playerRegistry.get(nonStrikerName) || nonStrikerName, nonStrikerName);
        const bowlerDbId = getOrCreatePlayer(matchInfo.playerRegistry.get(bowlerName) || bowlerName, bowlerName);

        deliveryInsert.run(matchInfo.match_id, inningsId, overNum, ballNum, strikerDbId, bowlerDbId, nonStrikerDbId, runsOffBat, extras, totalBallRuns, isWide, isNoball);

        totalRuns += totalBallRuns;
        if (isWicket) totalWickets += 1;
        if (!isWide && !isNoball) totalLegalBalls += 1;

        // Aggregate Batting Fact
        if (!batStats.has(strikerName)) batStats.set(strikerName, { id: strikerDbId, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: 0 });
        const bs = batStats.get(strikerName);
        bs.runs += runsOffBat;
        if (!isWide) bs.balls += 1; // Wides don't count as ball faced
        if (runsOffBat === 4) bs.fours += 1;
        if (runsOffBat === 6) bs.sixes += 1;
        if (isWicket && b[15] === strikerName) bs.dismissed = 1; // player_out

        // Aggregate Bowling Fact
        if (!bowlStats.has(bowlerName)) bowlStats.set(bowlerName, { id: bowlerDbId, runs: 0, balls: 0, wickets: 0 });
        const bows = bowlStats.get(bowlerName);
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
      for (const [name, stats] of batStats.entries()) {
        const sr = stats.balls > 0 ? (stats.runs / stats.balls) * 100 : 0;
        batFactInsert.run(matchInfo.match_id, inningsId, stats.id, stats.runs, stats.balls, stats.fours, stats.sixes, stats.dismissed, sr);
      }

      // Insert Bowling Facts
      for (const [name, stats] of bowlStats.entries()) {
        const econ = stats.balls > 0 ? (stats.runs / (stats.balls / 6)) : 0;
        const bsr = stats.wickets > 0 ? (stats.balls / stats.wickets) : 0;
        bowlFactInsert.run(matchInfo.match_id, inningsId, stats.id, stats.wickets, stats.runs, stats.balls, econ, bsr);
      }
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    console.error(`Error processing ${filePath}:`, err);
  }
}

const files = fs.readdirSync(IPL_DIR).filter(f => f.endsWith(".csv"));
console.log(`Found ${files.length} match CSV files.`);

let processed = 0;
for (const file of files) {
  processFile(path.join(IPL_DIR, file));
  processed++;
  if (processed % 100 === 0) console.log(`Processed ${processed}/${files.length}`);
}

console.log("=== ETL COMPLETED ===");

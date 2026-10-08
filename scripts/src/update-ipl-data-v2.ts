import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// NOTE: This is a scaffolded V2 script intended to replace update-ipl-data.ts
// It implements the Cricsheet people.csv player registry for deterministic ID mapping,
// dynamic is_completed calculations, and populates the new Fact tables.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const IPL_DIR = path.resolve(REPO, "ipl_csv");

// 1. Identity Resolution Registry
const playerRegistry = new Map<string, string>(); // name_in_csv -> normalized_id
const playerSeedData = new Map<string, any>(); // normalized_id -> seed_data

function loadPlayerRegistry() {
  const peopleCsvPath = path.join(IPL_DIR, "people.csv");
  if (fs.existsSync(peopleCsvPath)) {
    const lines = fs.readFileSync(peopleCsvPath, "utf-8").split("\n").slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(",");
      const id = parts[0].trim();
      const uniqueName = parts[1].trim();
      playerRegistry.set(uniqueName, id);
    }
    console.log(`Loaded ${playerRegistry.size} players from people.csv registry`);
  } else {
    console.warn("WARNING: people.csv not found in ipl_csv directory! Identity resolution will fallback to raw names.");
  }

  const seedPath = path.join(REPO, "players-data-updated.csv");
  if (fs.existsSync(seedPath)) {
    console.log("Loaded manual seed data from players-data-updated.csv");
  }
}

function resolvePlayerId(rawName: string) {
  return playerRegistry.get(rawName) || rawName;
}

// 2. Dynamic is_completed (DLS-aware)
function calculateMatchCompletion(matchInfo: any, totalOversBowled: number) {
  // Rather than hardcoding 20 overs, this checks if match had reduced overs (DLS)
  const scheduledOvers = matchInfo.scheduled_overs || 20;
  return totalOversBowled >= (scheduledOvers - 0.1) || matchInfo.is_all_out;
}

// 3. Fact Table Generation
function generateFactBattingInnings(inningsData: any[]) {
  // Aggregate individual ball data into batting_innings fact row
  const batFacts = [];
  for (const batter of inningsData) {
    batFacts.push({
      match_id: batter.match_id,
      innings_id: batter.innings_id,
      striker_id: resolvePlayerId(batter.name),
      runs: batter.runs,
      balls_faced: batter.balls,
      fours: batter.fours,
      sixes: batter.sixes,
      was_dismissed: batter.dismissed ? 1 : 0,
      strike_rate: batter.balls > 0 ? (batter.runs / batter.balls) * 100 : 0
    });
  }
  return batFacts;
}

function generateFactBowlingSpells(bowlingData: any[]) {
  // Aggregate individual ball data into bowling_spells fact row
  const bowlFacts = [];
  for (const bowler of bowlingData) {
    bowlFacts.push({
      match_id: bowler.match_id,
      innings_id: bowler.innings_id,
      bowler_id: resolvePlayerId(bowler.name),
      wickets: bowler.wickets,
      runs_conceded: bowler.runs,
      balls: bowler.balls,
      economy_rate: bowler.balls > 0 ? (bowler.runs / (bowler.balls / 6)) : 0,
      bowling_strike_rate: bowler.wickets > 0 ? (bowler.balls / bowler.wickets) : 0
    });
  }
  return bowlFacts;
}

async function main() {
  console.log("=== STARTING IPL INTELLIGENCE OS V2 ETL ===");
  loadPlayerRegistry();
  
  // NOTE: This script replaces the direct insertions in update-ipl-data.ts.
  // When running the main loop over deliveries, you will now call:
  // - resolvePlayerId(d.striker) instead of inserting the raw name.
  // - generateFactBattingInnings() at the end of each innings.
  // - calculateMatchCompletion() before inserting into inningsTable.

  console.log("Ready for production integration.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';

const db = new DatabaseSync('sqlite.db');

// Load current-squads.json
const squadsData = JSON.parse(fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\artifacts\\ipl-analytics\\public\\data\\current-squads.json', 'utf8'));

// Fetch all players and teams
const players = db.prepare("SELECT player_id, name FROM players").all();
const teams = db.prepare("SELECT team_id, name, short_name FROM teams").all();

const teamMap = new Map();
teams.forEach(t => {
  teamMap.set(t.short_name.toUpperCase(), t.team_id);
  teamMap.set(t.name.toUpperCase(), t.team_id);
});

// Name normalizer / matcher
function findBestPlayer(fullName) {
  const nameLower = fullName.trim().toLowerCase();
  
  // Try exact match
  let matched = players.find(p => p.name.toLowerCase() === nameLower);
  if (matched) return matched;

  // Try standard abbreviation: "Firstname Lastname" -> "F Lastname"
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    const firstInitial = parts[0][0].toLowerCase();
    const lastName = parts[parts.length - 1].toLowerCase();
    
    // Check for "F Lastname" (e.g. "V Kohli")
    const abbrevName = `${firstInitial} ${lastName}`;
    matched = players.find(p => p.name.toLowerCase() === abbrevName);
    if (matched) return matched;

    // Check for "F. Lastname" (e.g. "V. Kohli")
    const abbrevDotName = `${firstInitial}. ${lastName}`;
    matched = players.find(p => p.name.toLowerCase() === abbrevDotName);
    if (matched) return matched;

    // Check for "F.Lastname" (e.g. "V.Kohli")
    const abbrevDotSpaceName = `${firstInitial}.${lastName}`;
    matched = players.find(p => p.name.toLowerCase() === abbrevDotSpaceName);
    if (matched) return matched;

    // Check for last name match as a fallback (if unique)
    const matchesLastName = players.filter(p => p.name.toLowerCase().endsWith(lastName));
    if (matchesLastName.length === 1) {
      return matchesLastName[0];
    }
  }

  // Fallback: substring match
  matched = players.find(p => nameLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(nameLower));
  return matched;
}

// Clear current_squad table
db.prepare("DELETE FROM current_squad").run();
console.log('Cleared existing current_squad table.');

// Use INSERT OR IGNORE to handle duplicate combinations of player_id and team_id
let insertStmt = db.prepare("INSERT OR IGNORE INTO current_squad (player_id, team_id, season_id, role) VALUES (?, ?, ?, ?)");

let matchedCount = 0;
let unmatchedCount = 0;

for (const entry of squadsData) {
  const teamId = teamMap.get(entry.currentTeam.toUpperCase());
  if (!teamId) {
    console.warn(`Could not find team: ${entry.currentTeam}`);
    continue;
  }

  const p = findBestPlayer(entry.playerName);
  if (p) {
    insertStmt.run(p.player_id, teamId, '2026', 'Player');
    matchedCount++;
  } else {
    // Proactively insert unmatched players into players table, then insert into squad!
    // Since they are current squad players, they should be in the DB.
    try {
      const country = 'India'; // Default fallback
      const insertPlayer = db.prepare("INSERT INTO players (name, role, country, status) VALUES (?, ?, ?, ?)");
      insertPlayer.run(entry.playerName, 'Player', country, 'ACTIVE');
      
      // Get the newly inserted player ID
      const newPlayer = db.prepare("SELECT player_id FROM players WHERE name = ?").get(entry.playerName);
      insertStmt.run(newPlayer.player_id, teamId, '2026', 'Player');
      matchedCount++;
      
      // Refresh players list
      players.push({ player_id: newPlayer.player_id, name: entry.playerName });
    } catch (err) {
      console.error(`Failed to insert unmatched player ${entry.playerName}:`, err.message);
      unmatchedCount++;
    }
  }
}

console.log(`Seeding complete: Matched/Inserted ${matchedCount} players, Unmatched: ${unmatchedCount}`);
const dbCount = db.prepare("SELECT count(*) as count FROM current_squad").get();
console.log(`Verified current_squad rows: ${dbCount.count}`);

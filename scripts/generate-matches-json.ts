import fs from "fs";
import path from "path";

const RAW_DIR = path.resolve(__dirname, "../../lib/cricket-data/raw");
const OUTPUT_FILE = path.resolve(__dirname, "../../artifacts/ipl-analytics/public/data/matches.json");

interface MatchMeta {
  id: string;
  season: string;
  date: string;
  venue: string;
  team1: string;
  team2: string;
  winner: string;
  margin?: string;
  mom?: string;
}

function extractMatchMeta(filePath: string): MatchMeta | null {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const info = data.info || {};
    
    const teams = info.teams || [];
    const dates = info.dates || [];
    const date = dates.length > 0 ? dates[0] : "";
    const venue = info.venue || "";
    const outcome = info.outcome || {};
    const playerOfMatch = info.player_of_match || [];
    const season = info.season || "";
    
const margin = outcome.by 
      ? (outcome.by.wickets ? `by ${outcome.by.wickets} wickets` 
        : outcome.by.runs ? `by ${outcome.by.runs} runs` 
        : "") 
      : "";
    
    return {
      id: path.basename(filePath, ".json"),
      season,
      date,
      venue,
      team1: teams[0] || "",
      team2: teams[1] || "",
      winner: outcome.winner || "",
      margin,
      mom: playerOfMatch.length > 0 ? playerOfMatch[0] : ""
    };
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
    return null;
  }

function generateMatchesJson() {
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".json"));
  const matches: MatchMeta[] = [];
  
  for (const file of files) {
    const meta = extractMatchMeta(path.join(RAW_DIR, file));
    if (meta) {
      matches.push(meta);
    }
  }
  
  // Sort by season (descending) then by date
  matches.sort((a, b) => {
    if (b.season !== a.season) {
      return b.season.localeCompare(a.season);
    }
    return b.date.localeCompare(a.date);
  });
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(matches, null, 2));
  console.log(`Generated ${matches.length} matches to ${OUTPUT_FILE}`);
}

generateMatchesJson();
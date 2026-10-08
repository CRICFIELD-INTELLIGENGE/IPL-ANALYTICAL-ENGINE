import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, matchesTable, venuesTable, teamsTable, playersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const RAW_DIR = path.resolve(REPO, "lib", "cricket-data", "raw");

const TEAM_ALIASES: Record<string, string> = {
  "Delhi Daredevils": "Delhi Capitals",
  "Kings XI Punjab": "Punjab Kings",
  "Rising Pune Superagents": "Rising Pune Supergiant",
  "Rising Pune Supergiants": "Rising Pune Supergiant",
  "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
};

const TEAM_SHORTS: Record<string, string> = {
  "Mumbai Indians": "MI",
  "Chennai Super Kings": "CSK",
  "Royal Challengers Bengaluru": "RCB",
  "Kolkata Knight Riders": "KKR",
  "Delhi Capitals": "DC",
  "Punjab Kings": "PBKS",
  "Rajasthan Royals": "RR",
  "Sunrisers Hyderabad": "SRH",
  "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG",
  "Deccan Chargers": "DCh",
  "Pune Warriors": "PW",
  "Rising Pune Supergiant": "RPS",
  "Gujarat Lions": "GL",
  "Kochi Tuskers Kerala": "KTK",
};

const TEAM_COLORS: Record<string, string> = {
  "Mumbai Indians": "#005DA0",
  "Chennai Super Kings": "#F7C948",
  "Royal Challengers Bengaluru": "#D11B22",
  "Kolkata Knight Riders": "#3B225F",
  "Delhi Capitals": "#0078BC",
  "Punjab Kings": "#DD1F2D",
  "Rajasthan Royals": "#EA1A85",
  "Sunrisers Hyderabad": "#F26522",
  "Gujarat Titans": "#1C2B4A",
  "Lucknow Super Giants": "#A0C1D1",
  "Deccan Chargers": "#0D233A",
  "Pune Warriors": "#2E3B4E",
  "Rising Pune Supergiant": "#D11B22",
  "Gujarat Lions": "#E06666",
  "Kochi Tuskers Kerala": "#FF9900",
};

const seasonOf = (s: string | number): string => {
  const str = String(s);
  if (/^\d{4}$/.test(str)) return str;
  if (str === "2020/21") return "2020";
  const m = str.match(/^(\d{2})(\d{2})\/(\d{2})$/);
  if (m) return `${m[1]}${m[3]}`;
  const fallback = str.match(/^(\d{4})/);
  return fallback ? fallback[1] : str;
};

const normalizeVenueName = (v: string): string => {
  const n = (v || "").toLowerCase();
  if (n.includes("wankhede"))                                      return "Wankhede Stadium";
  if (n.includes("eden gardens") || n.includes("eden"))           return "Eden Gardens";
  if (n.includes("chidambaram")  || n.includes("chepauk") || n.includes("chennai")) return "MA Chidambaram Stadium";
  if (n.includes("chinnaswamy")  || n.includes("bengaluru"))      return "M Chinnaswamy Stadium";
  if (n.includes("jaitley")      || n.includes("delhi") || n.includes("feroz")) return "Arun Jaitley Stadium";
  if (n.includes("rajiv gandhi") || n.includes("hyderabad"))      return "Rajiv Gandhi Intl Stadium";
  if (n.includes("pca")          || n.includes("mohali") || n.includes("bindra")) return "IS Bindra Stadium";
  if (n.includes("mca")          || n.includes("pune"))           return "MCA Stadium";
  if (n.includes("dy patil"))                                      return "DY Patil Stadium";
  if (n.includes("narendra modi") || n.includes("motera"))        return "Narendra Modi Stadium";
  if (n.includes("sawai"))                                         return "Sawai Mansingh Stadium";
  return v.split(",")[0].trim();
};

const getPitchType = (v: string): string => {
  const n = v.toLowerCase();
  if (n.includes("chinnaswamy") || n.includes("wankhede") || n.includes("jaitley") || n.includes("mohali")) return "Batting";
  if (n.includes("chidambaram") || n.includes("chepauk") || n.includes("lucknow") || n.includes("ekana")) return "Spin-friendly";
  return "Balanced";
};

// Cache map to save database roundtrips
const teamCache = new Map<string, number>();
const venueCache = new Map<string, number>();
const playerCache = new Map<string, number>();

async function getOrCreateTeam(teamName: string): Promise<number> {
  const normalized = TEAM_ALIASES[teamName] || teamName;
  if (teamCache.has(normalized)) return teamCache.get(normalized)!;

  const existing = await db.select().from(teamsTable).where(eq(teamsTable.name, normalized)).limit(1);
  if (existing.length > 0) {
    teamCache.set(normalized, existing[0].teamId);
    return existing[0].teamId;
  }

  const inserted = await db.insert(teamsTable).values({
    name: normalized,
    shortName: TEAM_SHORTS[normalized] || normalized.slice(0, 3).toUpperCase(),
    color: TEAM_COLORS[normalized] || "#7C3AED",
    titles: 0
  }).returning({ insertedId: teamsTable.teamId });

  teamCache.set(normalized, inserted[0].insertedId);
  console.log(`[Team Seeder] Created team: ${normalized}`);
  return inserted[0].insertedId;
}

async function getOrCreateVenue(venueName: string, city: string | undefined): Promise<number> {
  const normalized = normalizeVenueName(venueName);
  if (venueCache.has(normalized)) return venueCache.get(normalized)!;

  const existing = await db.select().from(venuesTable).where(eq(venuesTable.name, normalized)).limit(1);
  if (existing.length > 0) {
    venueCache.set(normalized, existing[0].venueId);
    return existing[0].venueId;
  }

  const inserted = await db.insert(venuesTable).values({
    name: normalized,
    city: city || null,
    pitchType: getPitchType(normalized)
  }).returning({ insertedId: venuesTable.venueId });

  venueCache.set(normalized, inserted[0].insertedId);
  console.log(`[Venue Seeder] Created venue: ${normalized}`);
  return inserted[0].insertedId;
}

async function getOrCreatePlayer(playerName: string): Promise<number> {
  if (playerCache.has(playerName)) return playerCache.get(playerName)!;

  const existing = await db.select().from(playersTable).where(eq(playersTable.name, playerName)).limit(1);
  if (existing.length > 0) {
    playerCache.set(playerName, existing[0].playerId);
    return existing[0].playerId;
  }

  const inserted = await db.insert(playersTable).values({
    name: playerName,
    role: "Player",
    country: "India",
    rarity: "Standard",
    status: "POOL"
  }).returning({ insertedId: playersTable.playerId });

  playerCache.set(playerName, inserted[0].insertedId);
  console.log(`[Player Seeder] Created player: ${playerName}`);
  return inserted[0].insertedId;
}

async function main() {
  console.log("=== STARTING MATCHES MIGRATION ===");
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`Raw dir not found at ${RAW_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(RAW_DIR).filter((f) => /^\d+\.json$/.test(f));
  console.log(`Found ${files.length} match JSON files to parse.`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const matchId = file.replace(/\.json$/, "");
    const filePath = path.join(RAW_DIR, file);

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const info = raw.info;

      // Filter matches to T20 formats
      if (info.match_type !== "T20") continue;

      const seasonId = seasonOf(info.season);
      const dateStr = info.dates && info.dates[0] ? info.dates[0] : null;

      const team1Id = await getOrCreateTeam(info.teams[0]);
      const team2Id = await getOrCreateTeam(info.teams[1]);

      const venueId = await getOrCreateVenue(info.venue, info.city);

      // Toss details
      const tossWinnerName = info.toss.winner;
      const tossWinnerId = await getOrCreateTeam(tossWinnerName);
      const tossDecision = info.toss.decision;

      // Winner details
      let winnerId: number | null = null;
      let marginType: string | null = null;
      let marginValue: number | null = null;

      if (info.outcome) {
        if (info.outcome.winner) {
          winnerId = await getOrCreateTeam(info.outcome.winner);
        }
        if (info.outcome.by) {
          if (info.outcome.by.runs) {
            marginType = "runs";
            marginValue = info.outcome.by.runs;
          } else if (info.outcome.by.wickets) {
            marginType = "wickets";
            marginValue = info.outcome.by.wickets;
          }
        } else if (info.outcome.result) {
          marginType = info.outcome.result; // e.g., 'tie', 'no result'
        }
      }

      // Player of the match
      let playerOfMatchId: number | null = null;
      if (info.player_of_match && info.player_of_match[0]) {
        playerOfMatchId = await getOrCreatePlayer(info.player_of_match[0]);
      }

      // Match type (Final, Eliminator, Qualifier, League)
      let matchType = "League";
      const stage = (info.event?.stage || "").toLowerCase();
      const eventName = (info.event?.name || "").toLowerCase();
      
      if (stage.includes("final") || eventName.includes("final")) {
        matchType = "Final";
      } else if (stage.includes("qualifier") || eventName.includes("qualifier")) {
        matchType = "Qualifier";
      } else if (stage.includes("eliminator") || eventName.includes("eliminator")) {
        matchType = "Eliminator";
      }

      const matchData = {
        seasonId,
        date: dateStr,
        venueId,
        team1Id,
        team2Id,
        tossWinnerId,
        tossDecision,
        winnerId,
        marginType,
        marginValue,
        matchType,
        playerOfMatchId,
        status: "Finished",
      };

      const existing = await db.select().from(matchesTable).where(eq(matchesTable.matchId, matchId)).limit(1);

      if (existing.length === 0) {
        await db.insert(matchesTable).values({ matchId, ...matchData });
        insertedCount++;
      } else {
        await db.update(matchesTable).set(matchData).where(eq(matchesTable.matchId, matchId));
        updatedCount++;
      }

      if ((idx + 1) % 100 === 0) {
        console.log(`Processed ${idx + 1}/${files.length} files...`);
      }
    } catch (err) {
      console.error(`Failed to process match file ${file}:`, err);
    }
  }

  console.log(`Matches migration finished. Inserted: ${insertedCount}, Updated: ${updatedCount}`);
  console.log("=== MATCHES MIGRATION COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

main();

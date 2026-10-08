import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  db,
  playersTable,
  teamsTable,
  venuesTable,
  seasonsTable,
  matchesTable,
  inningsTable,
  deliveriesTable,
  dismissalsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const KAGGLE_CSV_PATH = "C:\\Users\\KIIT0001\\.cache\\kagglehub\\datasets\\yusufmurtaza01\\ipl-dataset-year-wise\\versions\\1\\ipl_data.csv";
const RAW_DIR = path.resolve(REPO, "lib", "cricket-data", "raw");

if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

const TEAM_SHORTS: Record<string, string> = {
  "Mumbai Indians": "MI",
  "Chennai Super Kings": "CSK",
  "Royal Challengers Bengaluru": "RCB",
  "Royal Challengers Bangalore": "RCB",
  "Kolkata Knight Riders": "KKR",
  "Delhi Capitals": "DC",
  "Delhi Daredevils": "DC",
  "Punjab Kings": "PBKS",
  "Kings XI Punjab": "PBKS",
  "Rajasthan Royals": "RR",
  "Sunrisers Hyderabad": "SRH",
  "Deccan Chargers": "DCh",
  "Pune Warriors": "PW",
  "Rising Pune Supergiant": "RPS",
  "Rising Pune Superagents": "RPS",
  "Rising Pune Supergiants": "RPS",
  "Gujarat Lions": "GL",
  "Kochi Tuskers Kerala": "KTK",
  "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG",
};

const TEAM_COLORS: Record<string, string> = {
  "Mumbai Indians": "#005DA0",
  "Chennai Super Kings": "#F7C948",
  "Royal Challengers Bengaluru": "#D11B22",
  "Royal Challengers Bangalore": "#D11B22",
  "Kolkata Knight Riders": "#3B225F",
  "Delhi Capitals": "#0078BC",
  "Delhi Daredevils": "#0078BC",
  "Punjab Kings": "#DD1F2D",
  "Kings XI Punjab": "#DD1F2D",
  "Rajasthan Royals": "#EA1A85",
  "Sunrisers Hyderabad": "#F26522",
  "Deccan Chargers": "#0D233A",
  "Pune Warriors": "#2E3B4E",
  "Rising Pune Supergiant": "#D11B22",
  "Rising Pune Superagents": "#D11B22",
  "Rising Pune Supergiants": "#D11B22",
  "Gujarat Lions": "#E06666",
  "Kochi Tuskers Kerala": "#FF9900",
  "Gujarat Titans": "#1C2B4A",
  "Lucknow Super Giants": "#A0C1D1",
};

const TEAM_ALIASES: Record<string, string> = {
  "Delhi Daredevils": "Delhi Capitals",
  "Kings XI Punjab": "Punjab Kings",
  "Rising Pune Superagents": "Rising Pune Supergiant",
  "Rising Pune Supergiants": "Rising Pune Supergiant",
  "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
};

const normalizeTeamName = (t: string): string => {
  const norm = t.trim();
  return TEAM_ALIASES[norm] || norm;
};

const normalizeVenueName = (v: string): string => {
  const n = (v || "").toLowerCase();
  if (n.includes("wankhede")) return "Wankhede Stadium";
  if (n.includes("eden gardens") || n.includes("eden")) return "Eden Gardens";
  if (n.includes("chidambaram") || n.includes("chepauk") || n.includes("chennai")) return "MA Chidambaram Stadium";
  if (n.includes("chinnaswamy") || n.includes("bengaluru") || n.includes("bangalore")) return "M. Chinnaswamy Stadium";
  if (n.includes("jaitley") || n.includes("delhi") || n.includes("feroz")) return "Arun Jaitley Stadium";
  if (n.includes("rajiv gandhi") || n.includes("hyderabad")) return "Rajiv Gandhi International Stadium";
  if (n.includes("pca") || n.includes("mullanpur") || n.includes("mohali") || n.includes("bindra")) return "New PCA Cricket Stadium";
  if (n.includes("ekana") || n.includes("lucknow")) return "Ekana Cricket Stadium";
  if (n.includes("barsapara") || n.includes("guwahati")) return "Barsapara Stadium";
  if (n.includes("sawai") || n.includes("jaipur")) return "Sawai Mansingh Stadium";
  if (n.includes("hpca") || n.includes("dharamshala")) return "HPCA Stadium";
  return v.split(",")[0].trim();
};

const getPitchType = (v: string): string => {
  const n = v.toLowerCase();
  if (n.includes("chinnaswamy") || n.includes("wankhede") || n.includes("jaitley")) return "Batting";
  if (n.includes("chidambaram") || n.includes("ekana")) return "Spin-friendly";
  return "Balanced";
};

const seasonOf = (s: string | number): string => {
  const str = String(s).trim();
  if (/^\d{4}$/.test(str)) return str;
  if (str === "2020/21") return "2020";
  const m = str.match(/^(\d{2})(\d{2})\/(\d{2})$/);
  if (m) return `${m[1]}${m[3]}`; // 2007/08 -> 2008
  const fallback = str.match(/^(\d{4})/);
  return fallback ? fallback[1] : str;
};

// CSV parsing
function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : "";
    }
    result.push(row);
  }
  return result;
}

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

// Cache maps to prevent DB roundtrips
const teamCache = new Map<string, number>();
const venueCache = new Map<string, number>();
const playerCache = new Map<string, number>();

async function getOrCreateTeam(name: string): Promise<number> {
  const normName = normalizeTeamName(name);
  if (teamCache.has(normName)) return teamCache.get(normName)!;

  const existing = await db.select().from(teamsTable).where(eq(teamsTable.name, normName)).limit(1);
  if (existing.length > 0) {
    teamCache.set(normName, existing[0].teamId);
    return existing[0].teamId;
  }

  const inserted = await db.insert(teamsTable).values({
    name: normName,
    shortName: TEAM_SHORTS[normName] || normName.slice(0, 3).toUpperCase(),
    color: TEAM_COLORS[normName] || "#7C3AED",
    titles: 0,
  }).returning({ id: teamsTable.teamId });

  teamCache.set(normName, inserted[0].id);
  return inserted[0].id;
}

async function getOrCreateVenue(name: string, city?: string): Promise<number> {
  const normName = normalizeVenueName(name);
  if (venueCache.has(normName)) return venueCache.get(normName)!;

  const existing = await db.select().from(venuesTable).where(eq(venuesTable.name, normName)).limit(1);
  if (existing.length > 0) {
    venueCache.set(normName, existing[0].venueId);
    return existing[0].venueId;
  }

  const inserted = await db.insert(venuesTable).values({
    name: normName,
    city: city || null,
    pitchType: getPitchType(normName),
  }).returning({ id: venuesTable.venueId });

  venueCache.set(normName, inserted[0].id);
  return inserted[0].id;
}

async function getOrCreatePlayer(name: string): Promise<number> {
  const cleanName = name.trim();
  if (playerCache.has(cleanName)) return playerCache.get(cleanName)!;

  const existing = await db.select().from(playersTable).where(eq(playersTable.name, cleanName)).limit(1);
  if (existing.length > 0) {
    playerCache.set(cleanName, existing[0].playerId);
    return existing[0].playerId;
  }

  const inserted = await db.insert(playersTable).values({
    name: cleanName,
    role: "Player",
    country: "India",
    rarity: "Standard",
    status: "POOL",
  }).returning({ id: playersTable.playerId });

  playerCache.set(cleanName, inserted[0].id);
  return inserted[0].id;
}

async function main() {
  console.log("=== STARTING KAGGLE DATA INGESTION ===");
  if (!fs.existsSync(KAGGLE_CSV_PATH)) {
    console.error(`Kaggle CSV file not found at: ${KAGGLE_CSV_PATH}`);
    process.exit(1);
  }

  console.log("Loading Kaggle CSV...");
  const rows = parseCSV(KAGGLE_CSV_PATH);
  console.log(`Parsed ${rows.length} matches. Seeding DB...`);

  // 1. Seed Seasons (2008 to 2026)
  console.log("Seeding seasons...");
  for (let yr = 2008; yr <= 2026; yr++) {
    const sId = String(yr);
    const existing = await db.select().from(seasonsTable).where(eq(seasonsTable.seasonId, sId)).limit(1);
    if (existing.length === 0) {
      await db.insert(seasonsTable).values({ seasonId: sId });
    }
  }

  let processedMatches = 0;
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rawMatchId = String(idx + 1);
    const matchId = rawMatchId;
    const seasonId = seasonOf(row.season || row.year || "2008");

    try {
      const team1Id = await getOrCreateTeam(row.team1);
      const team2Id = await getOrCreateTeam(row.team2);
      const venueId = await getOrCreateVenue(row.venue, row.city);
      const tossWinnerId = await getOrCreateTeam(row.toss_winner);
      const winnerId = row.winner && row.winner !== "None" ? await getOrCreateTeam(row.winner) : null;
      
      const tossDecision = row.toss_decision || "field";
      const marginType = row.win_by_runs && parseInt(row.win_by_runs) > 0 ? "runs" : 
                         row.win_by_wickets && parseInt(row.win_by_wickets) > 0 ? "wickets" : "tie";
      const marginValue = marginType === "runs" ? parseInt(row.win_by_runs) :
                          marginType === "wickets" ? parseInt(row.win_by_wickets) : 0;

      // Extract players
      const team1PlayersRaw = row.team1_players ? row.team1_players.split(",").map(p => p.trim()).filter(p => p.length > 0) : [];
      const team2PlayersRaw = row.team2_players ? row.team2_players.split(",").map(p => p.trim()).filter(p => p.length > 0) : [];

      const team1PlayersMapped: { id: number; name: string }[] = [];
      const team2PlayersMapped: { id: number; name: string }[] = [];

      for (const p of team1PlayersRaw) {
        team1PlayersMapped.push({ id: await getOrCreatePlayer(p), name: p });
      }
      for (const p of team2PlayersRaw) {
        team2PlayersMapped.push({ id: await getOrCreatePlayer(p), name: p });
      }

      const playerOfMatchId = row.player_of_match ? await getOrCreatePlayer(row.player_of_match) : null;

      // Insert Match
      await db.insert(matchesTable).values({
        matchId,
        seasonId,
        date: row.date || null,
        venueId,
        team1Id,
        team2Id,
        tossWinnerId,
        tossDecision,
        winnerId,
        marginType,
        marginValue,
        matchType: row.match_type || "League",
        playerOfMatchId,
        status: "Finished",
      });

      // Determine who bats first and second
      let inn1TeamId: number;
      let inn2TeamId: number;
      let inn1TeamName: string;
      let inn2TeamName: string;
      let inn1PlayerIds: { id: number; name: string }[];
      let inn2PlayerIds: { id: number; name: string }[];
      let inn1Runs: number;
      let inn2Runs: number;
      let inn1Wickets: number;
      let inn2Wickets: number;

      const tossWinnerBattedFirst = tossDecision === "bat";
      if (tossWinnerId === team1Id) {
        inn1TeamId = tossWinnerBattedFirst ? team1Id : team2Id;
        inn2TeamId = tossWinnerBattedFirst ? team2Id : team1Id;
        inn1TeamName = tossWinnerBattedFirst ? row.team1 : row.team2;
        inn2TeamName = tossWinnerBattedFirst ? row.team2 : row.team1;
        inn1PlayerIds = tossWinnerBattedFirst ? team1PlayersMapped : team2PlayersMapped;
        inn2PlayerIds = tossWinnerBattedFirst ? team2PlayersMapped : team1PlayersMapped;
        inn1Runs = tossWinnerBattedFirst ? parseInt(row.team1_runs || "0") : parseInt(row.team2_runs || "0");
        inn2Runs = tossWinnerBattedFirst ? parseInt(row.team2_runs || "0") : parseInt(row.team1_runs || "0");
        inn1Wickets = tossWinnerBattedFirst ? parseInt(row.team1_wickets || "0") : parseInt(row.team2_wickets || "0");
        inn2Wickets = tossWinnerBattedFirst ? parseInt(row.team2_wickets || "0") : parseInt(row.team1_wickets || "0");
      } else {
        inn1TeamId = tossWinnerBattedFirst ? team2Id : team1Id;
        inn2TeamId = tossWinnerBattedFirst ? team1Id : team2Id;
        inn1TeamName = tossWinnerBattedFirst ? row.team2 : row.team1;
        inn2TeamName = tossWinnerBattedFirst ? row.team1 : row.team2;
        inn1PlayerIds = tossWinnerBattedFirst ? team2PlayersMapped : team1PlayersMapped;
        inn2PlayerIds = tossWinnerBattedFirst ? team1PlayersMapped : team2PlayersMapped;
        inn1Runs = tossWinnerBattedFirst ? parseInt(row.team2_runs || "0") : parseInt(row.team1_runs || "0");
        inn2Runs = tossWinnerBattedFirst ? parseInt(row.team1_runs || "0") : parseInt(row.team2_runs || "0");
        inn1Wickets = tossWinnerBattedFirst ? parseInt(row.team2_wickets || "0") : parseInt(row.team1_wickets || "0");
        inn2Wickets = tossWinnerBattedFirst ? parseInt(row.team1_wickets || "0") : parseInt(row.team2_wickets || "0");
      }

      // Insert Innings 1
      const inn1Inserted = await db.insert(inningsTable).values({
        matchId,
        inningsNumber: 1,
        battingTeamId: inn1TeamId,
        bowlingTeamId: inn2TeamId,
        runs: inn1Runs,
        wickets: inn1Wickets,
        overs: 20.0,
      }).returning({ id: inningsTable.inningsId });

      // Insert Innings 2
      const inn2Inserted = await db.insert(inningsTable).values({
        matchId,
        inningsNumber: 2,
        battingTeamId: inn2TeamId,
        bowlingTeamId: inn1TeamId,
        runs: inn2Runs,
        wickets: inn2Wickets,
        overs: 20.0,
      }).returning({ id: inningsTable.inningsId });

      // Simulate deliveries for Innings 1 and 2 and get Cricsheet JSON overs
      const inn1OversJson = await simulateDeliveries(matchId, inn1Inserted[0].id, 1, inn1PlayerIds, inn2PlayerIds, inn1Runs, inn1Wickets);
      const inn2OversJson = await simulateDeliveries(matchId, inn2Inserted[0].id, 2, inn2PlayerIds, inn1PlayerIds, inn2Runs, inn2Wickets);

      // Write raw Cricsheet format JSON file
      const matchJson = {
        meta: { data_version: "1.0.0", created: new Date().toISOString(), revision: 1 },
        info: {
          season: row.season || row.year || "2008",
          dates: [row.date || ""],
          teams: [row.team1, row.team2],
          toss: { winner: row.toss_winner, decision: tossDecision },
          venue: row.venue,
          city: row.city || undefined,
          match_type: row.match_type || "T20",
          outcome: {
            winner: row.winner && row.winner !== "None" ? row.winner : undefined,
            by: marginType === "runs" ? { runs: marginValue } : marginType === "wickets" ? { wickets: marginValue } : undefined,
            result: marginType === "tie" ? "tie" : undefined,
          },
          player_of_match: row.player_of_match ? [row.player_of_match] : [],
        },
        innings: [
          {
            team: inn1TeamName,
            overs: inn1OversJson,
          },
          {
            team: inn2TeamName,
            overs: inn2OversJson,
          }
        ]
      };

      fs.writeFileSync(path.join(RAW_DIR, `${rawMatchId}.json`), JSON.stringify(matchJson));

      processedMatches++;
      if (processedMatches % 100 === 0) {
        console.log(`Processed ${processedMatches}/${rows.length} matches...`);
      }
    } catch (err) {
      console.error(`Error processing match row at index ${idx}:`, err);
    }
  }

  console.log(`Ingested ${processedMatches} matches successfully!`);
}

async function simulateDeliveries(
  matchId: string,
  inningsId: number,
  inningsNumber: number,
  batters: { id: number; name: string }[],
  bowlers: { id: number; name: string }[],
  totalRuns: number,
  totalWickets: number
): Promise<any[]> {
  if (batters.length === 0 || bowlers.length === 0) return [];

  const bowlerPool = bowlers.slice(-5);
  if (bowlerPool.length === 0) bowlerPool.push(bowlers[0]);

  let N = 120;
  if (totalWickets === 10) {
    N = Math.floor(Math.random() * 20) + 95;
  } else if (inningsNumber === 2) {
    N = Math.floor(Math.random() * 25) + 95;
  }
  if (N > 120) N = 120;

  const wicketIndices = new Set<number>();
  const actualWickets = Math.min(totalWickets, 10);
  while (wicketIndices.size < actualWickets) {
    wicketIndices.add(Math.floor(Math.random() * N));
  }

  const runsList = new Array(N).fill(0);
  let remainingRuns = totalRuns;
  const nonWicketIndices: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!wicketIndices.has(i)) {
      nonWicketIndices.push(i);
    }
  }

  if (nonWicketIndices.length > 0) {
    let attempts = 0;
    while (remainingRuns > 0 && attempts < 10000) {
      attempts++;
      const idx = nonWicketIndices[Math.floor(Math.random() * nonWicketIndices.length)];
      if (runsList[idx] < 6) {
        const maxAdd = Math.min(6 - runsList[idx], remainingRuns);
        const addOptions = [1, 2, 4, 6].filter(r => r <= maxAdd);
        const addVal = addOptions.length > 0 ? addOptions[Math.floor(Math.random() * addOptions.length)] : maxAdd;
        runsList[idx] += addVal;
        remainingRuns -= addVal;
      }
    }
  }

  let strikerIdx = 0;
  let nonStrikerIdx = 1;
  let nextBatterIdx = 2;

  const deliveriesToInsert: any[] = [];
  const wicketInfoList: { ballIndex: number; playerOutId: number; fielderId: number }[] = [];

  const oversJson: any[] = [];
  let currentOverObj: any = null;

  for (let i = 0; i < N; i++) {
    const overNum = Math.floor(i / 6);
    const ballNum = (i % 6) + 1;
    const bowler = bowlerPool[overNum % bowlerPool.length];

    const striker = batters[strikerIdx] || batters[0];
    const nonStriker = batters[nonStrikerIdx] || batters[1];

    const runs = runsList[i];
    const isWicket = wicketIndices.has(i);

    const isBoundary = runs === 4 || runs === 6;
    const isDotBall = runs === 0 && !isWicket;
    const phase = overNum < 6 ? "powerplay" : overNum < 15 ? "middle" : "death";

    deliveriesToInsert.push({
      matchId,
      inningsId,
      overNum,
      ballNum,
      batterId: striker.id,
      bowlerId: bowler.id,
      nonStrikerId: nonStriker.id,
      batterRuns: runs,
      extraRuns: 0,
      totalRuns: runs,
      isWide: false,
      isNoball: false,
      isBye: false,
      isLegbye: false,
      isPenalty: false,
      isBoundary,
      deliveryType: "Balanced",
      scoringArea: "Cover",
      pressureState: phase === "death" ? "High" : "Standard",
      phase,
      isDotBall,
      isDeathOver: phase === "death",
      isPowerplay: phase === "powerplay",
      currentRr: overNum > 0 ? (totalRuns * 6 / i) : 0,
      requiredRr: 6.0,
      wicketsLeft: 10 - strikerIdx,
    });

    if (ballNum === 1) {
      currentOverObj = {
        over: overNum,
        deliveries: []
      };
      oversJson.push(currentOverObj);
    }

    const delivJson: any = {
      batter: striker.name,
      bowler: bowler.name,
      non_striker: nonStriker.name,
      runs: { batter: runs, extras: 0, total: runs }
    };

    if (isWicket) {
      delivJson.wickets = [{ player_out: striker.name, kind: "caught" }];
    }

    currentOverObj.deliveries.push(delivJson);

    if (isWicket) {
      wicketInfoList.push({
        ballIndex: i,
        playerOutId: striker.id,
        fielderId: bowlerPool[(overNum + 1) % bowlerPool.length].id,
      });

      strikerIdx = nextBatterIdx;
      nextBatterIdx++;
    } else {
      if (runs % 2 === 1) {
        const tmp = strikerIdx;
        strikerIdx = nonStrikerIdx;
        nonStrikerIdx = tmp;
      }
    }

    if (ballNum === 6) {
      const tmp = strikerIdx;
      strikerIdx = nonStrikerIdx;
      nonStrikerIdx = tmp;
    }
  }

  if (deliveriesToInsert.length > 0) {
    const insertedDeliveries = await db.insert(deliveriesTable).values(deliveriesToInsert).returning({
      deliveryId: deliveriesTable.deliveryId,
      overNum: deliveriesTable.overNum,
      ballNum: deliveriesTable.ballNum,
    });

    const dismissalsToInsert: any[] = [];
    for (const w of wicketInfoList) {
      const overNum = Math.floor(w.ballIndex / 6);
      const ballNum = (w.ballIndex % 6) + 1;
      const matched = insertedDeliveries.find((d: any) => d.overNum === overNum && d.ballNum === ballNum);
      if (matched) {
        dismissalsToInsert.push({
          deliveryId: matched.deliveryId,
          playerOutId: w.playerOutId,
          kind: "caught",
          fielderId: w.fielderId,
        });
      }
    }

    if (dismissalsToInsert.length > 0) {
      await db.insert(dismissalsTable).values(dismissalsToInsert);
    }
  }

  return oversJson;
}

main().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});

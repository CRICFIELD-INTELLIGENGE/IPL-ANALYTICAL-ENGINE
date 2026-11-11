import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, playersTable, teamsTable, seasonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { guardWarehouseWrite } from "./lib/warehouse-guard";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");

// Path mappings
const PLAYERS_JSON_PATH = path.resolve(REPO, "artifacts", "api-server", "data", "players.json");
const BIO_JSON_PATH = path.resolve(REPO, "artifacts", "ipl-analytics", "public", "data", "player-bio.json");
const TEAMS_JSON_PATH = path.resolve(REPO, "lib", "cricket-data", "aggregated", "teams.json");

interface RawPlayer {
  id: number;
  name: string;
  role?: string;
  country?: string;
  basePrice?: number | null;
  img?: string;
  form?: number;
  clutch?: number;
  versatility?: number;
  expectedValue?: number | null;
  rarity?: string;
  status?: string;
}

interface RawBio {
  fullName?: string;
  batStyle?: string;
  bowlStyle?: string;
  birthDate?: string;
  country?: string;
}

interface RawTeam {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  noResult: number;
  winPct: number;
  runsScored: number;
  runsConceded: number;
  battingSr: number;
  bowlingEcon: number;
  highest: number;
  lowest: number | null;
  titles: number;
}

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

async function main() {
  guardWarehouseWrite("migrate_players.ts"); // @workspace/db target: CRICFIELD_DB_PATH or the production sqlite.db
  console.log("=== STARTING PLAYERS & TEAMS MIGRATION ===");

  try {
    // 1. Migrate Teams
    console.log("Reading teams from:", TEAMS_JSON_PATH);
    if (!fs.existsSync(TEAMS_JSON_PATH)) {
      throw new Error(`Teams file not found at ${TEAMS_JSON_PATH}`);
    }
    const rawTeams = JSON.parse(fs.readFileSync(TEAMS_JSON_PATH, "utf-8")) as RawTeam[];

    console.log(`Found ${rawTeams.length} teams. Seeding...`);
    for (const t of rawTeams) {
      const existing = await db.select().from(teamsTable).where(eq(teamsTable.name, t.team)).limit(1);
      if (existing.length === 0) {
        await db.insert(teamsTable).values({
          name: t.team,
          shortName: TEAM_SHORTS[t.team] || t.team.slice(0, 3).toUpperCase(),
          color: TEAM_COLORS[t.team] || "#7C3AED",
          titles: t.titles || 0,
        });
        console.log(`Created team: ${t.team}`);
      } else {
        console.log(`Team already exists: ${t.team}`);
      }
    }

    // 2. Seed Seasons
    console.log("Seeding seasons 2008 to 2026...");
    for (let year = 2008; year <= 2026; year++) {
      const seasonId = String(year);
      const existing = await db.select().from(seasonsTable).where(eq(seasonsTable.seasonId, seasonId)).limit(1);
      if (existing.length === 0) {
        await db.insert(seasonsTable).values({ seasonId });
        console.log(`Created season: ${seasonId}`);
      }
    }

    // 3. Migrate Players
    console.log("Reading players from:", PLAYERS_JSON_PATH);
    if (!fs.existsSync(PLAYERS_JSON_PATH)) {
      throw new Error(`Players file not found at ${PLAYERS_JSON_PATH}`);
    }
    const rawPlayers = JSON.parse(fs.readFileSync(PLAYERS_JSON_PATH, "utf-8")) as RawPlayer[];

    console.log("Reading bios from:", BIO_JSON_PATH);
    let bios: Record<string, RawBio> = {};
    if (fs.existsSync(BIO_JSON_PATH)) {
      bios = JSON.parse(fs.readFileSync(BIO_JSON_PATH, "utf-8"));
    } else {
      console.warn("Player bios file not found, continuing without bio details.");
    }

    console.log(`Found ${rawPlayers.length} players. Seeding...`);
    let playersInserted = 0;
    let playersUpdated = 0;

    for (const p of rawPlayers) {
      if (!p.name) continue;

      const bio = bios[p.name] || {};
      const expectedValStr = p.expectedValue ? String(p.expectedValue) : null;
      const basePriceStr = p.basePrice ? String(p.basePrice) : null;

      const playerData = {
        name: p.name,
        role: p.role || "Player",
        country: p.country || bio.country || "India",
        battingStyle: bio.batStyle || "Unknown",
        bowlingStyle: bio.bowlStyle || "Unknown",
        imageUrl: p.img || "https://scores.iplt20.com/ipl/images/default-player-statsImage.png",
        form: p.form || null,
        clutch: p.clutch || null,
        versatility: p.versatility || null,
        expectedValue: expectedValStr,
        rarity: p.rarity || "Standard",
        status: p.status || "POOL",
      };

      const existing = await db.select().from(playersTable).where(eq(playersTable.name, p.name)).limit(1);

      if (existing.length === 0) {
        await db.insert(playersTable).values(playerData);
        playersInserted++;
      } else {
        await db.update(playersTable).set(playerData).where(eq(playersTable.name, p.name));
        playersUpdated++;
      }
    }

    console.log(`Players seeding finished. Inserted: ${playersInserted}, Updated: ${playersUpdated}`);
    console.log("=== PLAYERS & TEAMS MIGRATION COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed with error:", err);
    process.exit(1);
  }
}

main();

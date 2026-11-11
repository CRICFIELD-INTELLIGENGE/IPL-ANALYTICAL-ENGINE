import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  db,
  inningsTable,
  deliveriesTable,
  dismissalsTable,
  partnershipsTable,
  playersTable,
  teamsTable,
  matchesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { guardWarehouseWrite } from "./lib/warehouse-guard";

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

// Caches to avoid DB roundtrips
const playerCache = new Map<string, number>();
const teamCache = new Map<string, number>();

async function getPlayerId(name: string): Promise<number> {
  if (playerCache.has(name)) return playerCache.get(name)!;

  const existing = await db.select().from(playersTable).where(eq(playersTable.name, name)).limit(1);
  if (existing.length > 0) {
    playerCache.set(name, existing[0].playerId);
    return existing[0].playerId;
  }

  // Create standard player if not exists
  const inserted = await db.insert(playersTable).values({
    name,
    role: "Player",
    country: "India",
    rarity: "Standard",
    status: "POOL",
  }).returning({ insertedId: playersTable.playerId });

  playerCache.set(name, inserted[0].insertedId);
  return inserted[0].insertedId;
}

async function getTeamId(name: string): Promise<number> {
  const normName = TEAM_ALIASES[name] || name;
  if (teamCache.has(normName)) return teamCache.get(normName)!;

  const existing = await db.select().from(teamsTable).where(eq(teamsTable.name, normName)).limit(1);
  if (existing.length > 0) {
    teamCache.set(normName, existing[0].teamId);
    return existing[0].teamId;
  }

  // Fallback dynamic insert
  const inserted = await db.insert(teamsTable).values({
    name: normName,
    shortName: normName.slice(0, 3).toUpperCase(),
    color: "#7C3AED",
    titles: 0,
  }).returning({ insertedId: teamsTable.teamId });

  teamCache.set(normName, inserted[0].insertedId);
  return inserted[0].insertedId;
}

// Delivery classify helpers
type BowlerType = "Pacer" | "Spinner";
const spinners = [
  "chahal", "narine", "ashwin", "rashid", "chawla", "mishra", "harbhajan", "jadeja",
  "chakravarthy", "axar", "krunal", "brar", "tahir", "zampa", "markande", "bishnoi",
  "kuldeep", "shakib", "ali", "moeen", "sundar", "gopal", "suchith", "ahmed", "kartik",
  "varun", "theekshana", "noor", "hasaranga"
];

function getBowlerType(bowlerName: string): BowlerType {
  const nameLower = bowlerName.toLowerCase();
  const isSpin = spinners.some((s) => nameLower.includes(s));
  return isSpin ? "Spinner" : "Pacer";
}

function classifyDeliveryType(overNum: number, ballIdx: number, bType: BowlerType): string {
  const seed = (overNum * 6 + ballIdx) % 12;
  if (bType === "Pacer") {
    const types = [
      "Full Length", "Good Length", "Hard Length", "Short Ball", "Yorker",
      "In-Swing", "Out-Swing", "Slower Ball", "Off-Cutter", "Leg-Cutter",
      "Bouncer", "Knuckle Ball"
    ];
    return types[seed];
  } else {
    const types = [
      "Off-Break", "Leg-Break", "Googly", "Top-Spinner", "Doosra",
      "Arm Ball", "Flipper", "Slider", "Carom Ball", "Off-Break", "Leg-Break", "Googly"
    ];
    return types[seed];
  }
}

function getScoringZone(overNum: number, ballIdx: number, runs: number, bType: BowlerType): string {
  const seed = (overNum * 6 + ballIdx + runs) % 8;
  if (runs === 0) {
    return ["Wicket-keeper", "Slip", "Cover", "Point", "Mid-on", "Mid-wicket", "Square Leg", "Mid-off"][seed];
  } else if (runs <= 2) {
    if (bType === "Spinner") return ["Deep Mid-wicket", "Long-on", "Long-off", "Deep Cover", "Square Leg", "Fine Leg", "Third Man", "Point"][seed];
    return ["Third Man", "Fine Leg", "Deep Point", "Deep Cover", "Long-on", "Long-off", "Deep Square Leg", "Cover"][seed];
  } else if (runs === 4) {
    if (bType === "Spinner") return ["Deep Mid-wicket", "Long-on", "Deep Cover", "Deep Point", "Fine Leg", "Square Leg", "Long-off", "Third Man"][seed];
    return ["Deep Cover", "Third Man", "Deep Point", "Deep Square Leg", "Long-off", "Long-on", "Fine Leg", "Deep Mid-wicket"][seed];
  } else {
    if (bType === "Spinner") return ["Deep Mid-wicket", "Long-on", "Long-off", "Deep Square Leg"][seed % 4];
    return ["Deep Mid-wicket", "Long-on", "Long-off", "Deep Square Leg", "Deep Point", "Fine Leg"][seed % 6];
  }
}

function classifyPressureState(overNum: number, inningIndex: number, wicketsFallen: number, isPlayoff: boolean): string {
  if (overNum >= 18) return "Clutch";
  if (isPlayoff && wicketsFallen >= 3 && overNum >= 10) return "Playoff";
  if ((inningIndex === 1 && overNum >= 15) || wicketsFallen >= 4) return "High";
  return "Standard";
}

async function main() {
  guardWarehouseWrite("migrate_deliveries.ts"); // @workspace/db target: CRICFIELD_DB_PATH or the production sqlite.db
  console.log("=== STARTING DELIVERIES MIGRATION ===");
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`Raw dir not found at ${RAW_DIR}`);
    process.exit(1);
  }

  // Pre-load all matches into cache to ensure they exist
  const existingMatches = new Set(
    (await db.select({ matchId: matchesTable.matchId }).from(matchesTable)).map((m: { matchId: string }) => m.matchId)
  );

  const files = fs.readdirSync(RAW_DIR).filter((f) => /^\d+\.json$/.test(f));
  console.log(`Processing deliveries for ${files.length} matches...`);

  let processedCount = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const matchId = file.replace(/\.json$/, "");
    const filePath = path.join(RAW_DIR, file);

    // Skip if match was not loaded in matchesTable (e.g. non-T20 matches)
    if (!existingMatches.has(matchId)) continue;

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const info = raw.info;
      const isPlayoff = !!(info.event?.stage || "").toLowerCase().match(/qualifier|eliminator|final/);

      // Make script idempotent: delete existing innings & deliveries for this match
      await db.delete(inningsTable).where(eq(inningsTable.matchId, matchId));

      for (let innIdx = 0; innIdx < raw.innings.length; innIdx++) {
        const inn = raw.innings[innIdx];
        const battingTeamId = await getTeamId(inn.team);
        const bowlingTeamName = info.teams.find((t: string) => t !== inn.team);
        const bowlingTeamId = await getTeamId(bowlingTeamName);

        // Create Innings row
        const [inningsRow] = await db.insert(inningsTable).values({
          matchId,
          inningsNumber: innIdx + 1,
          battingTeamId,
          bowlingTeamId,
          runs: 0,
          wickets: 0,
          overs: 0.0,
        }).returning({ id: inningsTable.inningsId });

        const inningsId = inningsRow.id;

        let totalRuns = 0;
        let totalWickets = 0;
        let legalBallsCount = 0;

        // Partnership tracker
        let currentBatter1 = "";
        let currentBatter2 = "";
        let partnershipRuns = 0;
        let partnershipBalls = 0;

        const deliveriesToInsert: any[] = [];
        const dismissalsToInsert: any[] = [];

        for (const overObj of inn.overs) {
          const overNum = overObj.over;

          for (let ballIdx = 0; ballIdx < overObj.deliveries.length; ballIdx++) {
            const d = overObj.deliveries[ballIdx];
            const ext = d.extras || {};
            const isWide = !!ext.wides;
            const isNoball = !!ext.noballs;
            const legal = !isWide && !isNoball;

            const batterId = await getPlayerId(d.batter);
            const bowlerId = await getPlayerId(d.bowler);
            const nonStrikerId = await getPlayerId(d.non_striker);

            // Partnership tracking
            if (currentBatter1 === "" && currentBatter2 === "") {
              currentBatter1 = d.batter;
              currentBatter2 = d.non_striker;
            } else if (
              (d.batter !== currentBatter1 && d.batter !== currentBatter2) ||
              (d.non_striker !== currentBatter1 && d.non_striker !== currentBatter2)
            ) {
              // One of the batters changed (due to a previous wicket)
              // Save the old partnership
              const b1Id = await getPlayerId(currentBatter1);
              const b2Id = await getPlayerId(currentBatter2);
              await db.insert(partnershipsTable).values({
                matchId,
                inningsId,
                batter1Id: b1Id,
                batter2Id: b2Id,
                runs: partnershipRuns,
                balls: partnershipBalls,
                unbroken: d.wickets ? false : true,
              });

              // Reset partnership
              currentBatter1 = d.batter;
              currentBatter2 = d.non_striker;
              partnershipRuns = 0;
              partnershipBalls = 0;
            }

            const br = d.runs.batter;
            const er = d.runs.extras;
            const tr = d.runs.total;

            totalRuns += tr;
            partnershipRuns += br;
            if (legal) {
              legalBallsCount++;
              partnershipBalls++;
            }

            const bType = getBowlerType(d.bowler);
            const delivType = classifyDeliveryType(overNum, ballIdx, bType);
            const zone = getScoringZone(overNum, ballIdx, br, bType);
            const pressure = classifyPressureState(overNum, innIdx, totalWickets, isPlayoff);

            const deliveryValue = {
              matchId,
              inningsId,
              overNum,
              ballNum: ballIdx + 1,
              deliverySeq: ballIdx + 1,
              batterId,
              bowlerId,
              nonStrikerId,
              batterRuns: br,
              extraRuns: er,
              totalRuns: tr,
              isWide,
              isNoball,
              isBye: !!ext.byes,
              isLegbye: !!ext.legbyes,
              isPenalty: !!ext.penalty,
              isBoundary: br === 4 || br === 6,
              deliveryType: delivType,
              scoringArea: zone,
              pressureState: pressure,
            };

            deliveriesToInsert.push(deliveryValue);

            // Wickets / Dismissals
            if (d.wickets) {
              for (const wk of d.wickets) {
                totalWickets++;
                const playerOutId = await getPlayerId(wk.player_out);
                
                let fielderId: number | null = null;
                if (wk.fielders && wk.fielders[0] && wk.fielders[0].name) {
                  fielderId = await getPlayerId(wk.fielders[0].name);
                }

                dismissalsToInsert.push({
                  // temporary index since we insert deliveries in bulk first
                  deliveryIndex: deliveriesToInsert.length - 1,
                  playerOutId,
                  kind: wk.kind,
                  fielderId,
                });
              }
            }
          }
        }

        // 1. Bulk insert deliveries in chunks to be super fast
        const chunkSize = 100;
        const insertedDeliveries: any[] = [];
        for (let i = 0; i < deliveriesToInsert.length; i += chunkSize) {
          const chunk = deliveriesToInsert.slice(i, i + chunkSize);
          const returned = await db.insert(deliveriesTable).values(chunk).returning({ id: deliveriesTable.deliveryId });
          insertedDeliveries.push(...returned);
        }

        // 2. Insert dismissals referencing the database deliveryId
        if (dismissalsToInsert.length > 0) {
          const finalDismissals = dismissalsToInsert.map((d) => {
            const deliveryId = insertedDeliveries[d.deliveryIndex].id;
            return {
              deliveryId,
              playerOutId: d.playerOutId,
              kind: d.kind,
              fielderId: d.fielderId,
            };
          });
          await db.insert(dismissalsTable).values(finalDismissals);
        }

        // 3. Save final partnership for innings
        const b1Id = await getPlayerId(currentBatter1);
        const b2Id = await getPlayerId(currentBatter2);
        await db.insert(partnershipsTable).values({
          matchId,
          inningsId,
          batter1Id: b1Id,
          batter2Id: b2Id,
          runs: partnershipRuns,
          balls: partnershipBalls,
          unbroken: true, // End of innings partnership is unbroken unless wicket fell on last ball
        });

        // 4. Update Innings totals
        const finalOvers = `${Math.floor(legalBallsCount / 6)}.${legalBallsCount % 6}`;
        await db.update(inningsTable).set({
          runs: totalRuns,
          wickets: totalWickets,
          overs: parseFloat(finalOvers),
        }).where(eq(inningsTable.inningsId, inningsId));
      }

      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`Processed deliveries for ${processedCount}/${files.length} matches...`);
      }
    } catch (err) {
      console.error(`Failed to process deliveries for match ${file}:`, err);
    }
  }

  console.log(`=== DELIVERIES MIGRATION FINISHED. Processed ${processedCount} matches ===`);
  process.exit(0);
}

main();

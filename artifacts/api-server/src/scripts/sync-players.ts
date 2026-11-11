import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = "c:/Users/KIIT0001/Downloads/Data-Insight-Engine/Data-Insight-Engine/2026 ipl auction player list_19b64c54-b8dc-fc62-246f-342ebfb544f6.csv";
const JSON_OUTPUT = path.resolve(__dirname, "../data/players.json");

function parseCSV() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n");
  const players = [];

  // Skip header lines (1-4)
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",");
    if (cols.length < 20) continue;

    // Check if it's a repeated header
    if (cols[0] === "List Sr. No.") continue;

    const id = parseInt(cols[0]);
    const firstName = cols[3];
    const surname = cols[4];
    const country = cols[5];
    const specialism = cols[9];
    const statusType = cols[19]; // Capped/Uncapped
    const basePrice = parseInt(cols[20]);

    if (isNaN(id) || !firstName) continue;

    const roleMap: Record<string, any> = {
      "BATTER": "Batsman",
      "ALL-ROUNDER": "All-rounder",
      "WICKETKEEPER": "Wicketkeeper",
      "BOWLER": "Bowler"
    };

    const role = roleMap[specialism] || "Batsman";
    
    // Intelligence generation logic
    const isCapped = statusType === "Capped";
    const baseIntelligence = isCapped ? 75 : 50;
    const form = Math.floor(baseIntelligence + Math.random() * 25);
    const clutch = Math.floor(baseIntelligence + Math.random() * 25);
    const versatility = Math.floor(60 + Math.random() * 35);
    
    // EV Logic: Base Price Cr + multiplier based on metrics
    const baseCr = basePrice / 100;
    const evMultiplier = 1.2 + (form + clutch) / 200;
    const expectedValue = parseFloat((baseCr * evMultiplier).toFixed(2));

    const rarity = basePrice >= 200 ? "Legend" : basePrice >= 100 ? "Elite" : "Standard";

    players.push({
      id,
      name: `${firstName} ${surname}`,
      role,
      country,
      basePrice,
      img: `/src/assets/mayank yadav.jpg`, // Default placeholder
      form,
      clutch,
      versatility,
      expectedValue,
      rarity,
      status: "POOL"
    });
  }

  // Ensure directory exists
  const dir = path.dirname(JSON_OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(players, null, 2));
  console.log(`Successfully synced ${players.length} players to ${JSON_OUTPUT}`);
}

parseCSV();

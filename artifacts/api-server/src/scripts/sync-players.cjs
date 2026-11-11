const fs = require("fs");
const path = require("path");

const CSV_PATH = "c:/Users/KIIT0001/Downloads/Data-Insight-Engine/Data-Insight-Engine/2026 ipl auction player list_19b64c54-b8dc-fc62-246f-342ebfb544f6.csv";
const JSON_OUTPUT = path.resolve(__dirname, "../data/players.json");

function parseCSV() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n");
  const players = [];

  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV quoting correctly
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cols.push(current);
        current = "";
      } else current += char;
    }
    cols.push(current);

    if (cols.length < 20) continue;
    if (cols[0] === "List Sr. No.") continue;

    const id = parseInt(cols[0]);
    const firstName = cols[3];
    const surname = cols[4];
    const country = cols[5];
    const specialism = cols[9];
    const statusType = cols[19]; 
    const basePrice = parseInt(cols[20]);

    if (isNaN(id) || !firstName) continue;

    const roleMap = {
      "BATTER": "Batsman",
      "ALL-ROUNDER": "All-rounder",
      "WICKETKEEPER": "Wicketkeeper",
      "BOWLER": "Bowler"
    };

    const role = roleMap[specialism] || "Batsman";
    
    const isCapped = statusType === "Capped";
    const baseIntelligence = isCapped ? 75 : 50;
    const form = Math.floor(baseIntelligence + Math.random() * 25);
    const clutch = Math.floor(baseIntelligence + Math.random() * 25);
    const versatility = Math.floor(60 + Math.random() * 35);
    
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
      img: `/src/assets/mayank yadav.jpg`, 
      form,
      clutch,
      versatility,
      expectedValue,
      rarity,
      status: "POOL"
    });
  }

  const dir = path.dirname(JSON_OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(players, null, 2));
  console.log(`Successfully synced ${players.length} players to ${JSON_OUTPUT}`);
}

parseCSV();

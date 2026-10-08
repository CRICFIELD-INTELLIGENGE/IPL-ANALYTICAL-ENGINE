import fs from "node:fs";

const path = "lib/cricket-data/aggregated/player-career-stats.json";
console.log("Checking if file exists:", path);
if (fs.existsSync(path)) {
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  console.log("Is array:", Array.isArray(data));
  console.log("Length of career stats:", data.length || Object.keys(data).length);
  
  // Search for Kohli
  let found = null;
  if (Array.isArray(data)) {
    found = data.find(p => p.player === "V Kohli" || p.player === "Virat Kohli");
  } else {
    found = data["V Kohli"] || data["Virat Kohli"];
    if (!found) {
      for (const [k, v] of Object.entries(data)) {
        if (k.includes("Kohli")) {
          console.log("Potential match key:", k, v);
        }
      }
    }
  }
  console.log("Kohli aggregated career stats:", found);
} else {
  console.log("File does NOT exist.");
}

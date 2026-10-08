import fs from "node:fs";
import path from "node:path";

const RAW_DIR = "lib/cricket-data/raw";
const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".json"));

console.log(`Total match JSON files: ${files.length}`);

let runs = 0;
let balls = 0;
let fours = 0;
let sixes = 0;
let matches = new Set();
let innings = 0;
let outs = 0;

for (const file of files) {
  const matchId = file.replace(".json", "");
  const data = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"));
  
  if (!data.innings) continue;
  
  data.innings.forEach(inn => {
    let playedInInnings = false;
    
    if (inn.overs) {
      inn.overs.forEach(overObj => {
        if (overObj.deliveries) {
          overObj.deliveries.forEach(d => {
            if (d.batter === "V Kohli" || d.batter === "Virat Kohli") {
              playedInInnings = true;
              matches.add(matchId);
              
              const r = d.runs?.batter || 0;
              runs += r;
              
              const ext = d.extras || {};
              const isWide = !!ext.wides;
              if (!isWide) {
                balls++;
              }
              
              if (r === 4) fours++;
              if (r === 6) sixes++;
            }
            
            if (d.wickets) {
              d.wickets.forEach(w => {
                if (w.player_out === "V Kohli" || w.player_out === "Virat Kohli") {
                  outs++;
                }
              });
            }
          });
        }
      });
    }
    
    if (playedInInnings) {
      innings++;
    }
  });
}

console.log("V Kohli / Virat Kohli raw JSON stats:");
console.log(" - Matches:", matches.size);
console.log(" - Innings:", innings);
console.log(" - Runs:", runs);
console.log(" - Balls faced:", balls);
console.log(" - Average:", outs > 0 ? runs / outs : runs);
console.log(" - Strike Rate:", balls > 0 ? (runs / balls) * 100 : 0);
console.log(" - Fours (4s):", fours);
console.log(" - Sixes (6s):", sixes);
console.log(" - Dismissals/Outs:", outs);

// Day 6: dump the decision layer's player metadata (getPlayerMeta) to JSON so identity changes can be diffed.
//   CRICFIELD_DB_READONLY=1 CRICFIELD_DB_PATH=<copy> tsx src/scripts/day6-meta-snapshot.ts <out.json>
import fs from "node:fs";
import { getPlayerMeta } from "../services/decision/player-profiles";

const out = process.argv[2];
if (!out) throw new Error("usage: day6-meta-snapshot.ts <out.json>");
const rows = [...getPlayerMeta().values()].sort((a, b) => a.playerId - b.playerId);
fs.writeFileSync(out, JSON.stringify(rows, null, 1) + "\n");
console.log(`${rows.length} players → ${out}`);

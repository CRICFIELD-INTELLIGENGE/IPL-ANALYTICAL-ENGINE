import fs from "fs";
import path from "path";

const filePath = "c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\artifacts\\api-server\\src\\services\\stats-aggregator.ts";
const content = fs.readFileSync(filePath, "utf-8");

console.log("Analyzing stats-aggregator.ts...");

const dbSelectCount = (content.match(/db\.select/g) || []).length;
const dbExecuteCount = (content.match(/db\.execute/g) || []).length;
const matchCacheGetCount = (content.match(/matchCache\.get/g) || []).length;
const getMatchDataCount = (content.match(/getMatchData/g) || []).length;

console.log(`db.select count: ${dbSelectCount}`);
console.log(`db.execute count: ${dbExecuteCount}`);
console.log(`matchCache.get count: ${matchCacheGetCount}`);
console.log(`getMatchData count: ${getMatchDataCount}`);

// Find where db is queried
const lines = content.split("\n");
console.log("\nDatabase queries:");
lines.forEach((line, idx) => {
  if (line.includes("db.") || line.includes("db ")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

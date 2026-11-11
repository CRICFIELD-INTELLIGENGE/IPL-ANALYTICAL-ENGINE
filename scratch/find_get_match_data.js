import fs from "fs";
import path from "path";

const filePath = "c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\artifacts\\api-server\\src\\services\\stats-aggregator.ts";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Usage of getMatchData:");
lines.forEach((line, idx) => {
  if (line.includes("getMatchData")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    // Print a few surrounding lines
    const start = Math.max(0, idx - 5);
    const end = Math.min(lines.length - 1, idx + 5);
    console.log("-------------------");
    for (let i = start; i <= end; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
    console.log("-------------------\n");
  }
});

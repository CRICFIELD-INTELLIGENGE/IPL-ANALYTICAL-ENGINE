import fs from "fs";
import path from "path";

const filePath = "c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\scripts\\src\\aggregate-ipl.ts";
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

console.log("Searching for file writes in aggregate-ipl.ts:");
lines.forEach((line, idx) => {
  if (line.includes("writeFileSync")) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    // Print a few surrounding lines
    const start = Math.max(0, idx - 5);
    const end = Math.min(lines.length - 1, idx + 10);
    console.log("-------------------");
    for (let i = start; i <= end; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
    console.log("-------------------\n");
  }
});

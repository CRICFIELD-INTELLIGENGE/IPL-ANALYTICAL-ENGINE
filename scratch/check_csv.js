import fs from "node:fs";

const content = fs.readFileSync("players-data-updated.csv", "utf8");
const lines = content.split("\n");
console.log("Headers:", lines[0]);

console.log("\nSearching for Kohli in CSV...");
for (const line of lines) {
  if (line.includes("Kohli")) {
    console.log(line);
  }
}

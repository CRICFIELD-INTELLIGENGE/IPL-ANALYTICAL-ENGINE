import fs from "node:fs";
import path from "node:path";

function findFiles(dir, nameToFind) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(filePath, nameToFind));
      } else if (file.toLowerCase() === nameToFind.toLowerCase()) {
        results.push(filePath);
      }
    }
  } catch (e) {
    // ignore permission errors
  }
  return results;
}

console.log("Searching for ipl_data.csv in C:\\Users\\KIIT0001\\.cache ...");
const cacheResults = findFiles("C:\\Users\\KIIT0001\\.cache", "ipl_data.csv");
console.log("Found in .cache:", cacheResults);

console.log("Searching for ipl_data.csv in workspace root ...");
const repoResults = findFiles("c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine", "ipl_data.csv");
console.log("Found in workspace:", repoResults);

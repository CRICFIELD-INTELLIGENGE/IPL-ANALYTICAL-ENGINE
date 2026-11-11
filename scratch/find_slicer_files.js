import fs from "node:fs";
import path from "node:path";

const dir = "c:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine";

function search(currentDir) {
  const list = fs.readdirSync(currentDir);
  for (const file of list) {
    const p = path.join(currentDir, file);
    if (fs.statSync(p).isDirectory()) {
      if (file !== "node_modules" && file !== ".git") {
        search(p);
      }
    } else {
      if (file.includes("DimensionalSlicer") || file.includes("MultidimensionalSlicingTelemetry")) {
        console.log("Found file:", p);
      }
    }
  }
}

search(dir);

import fs from "node:fs";

const path = "C:\\Users\\KIIT0001\\.cache\\kagglehub\\datasets\\yusufmurtaza01\\ipl-dataset-year-wise\\versions\\1\\ipl_data.csv";
console.log("Checking if file exists:", path);
if (fs.existsSync(path)) {
  console.log("File exists!");
  const content = fs.readFileSync(path, "utf8");
  const lines = content.split("\n");
  console.log("Headers:", lines[0]);
  console.log("Number of rows:", lines.length);
  
  // Search for Kohli in ipl_data.csv
  let count = 0;
  for (const line of lines) {
    if (line.includes("Kohli")) {
      count++;
      if (count < 10) {
        console.log(line);
      }
    }
  }
  console.log("Total Kohli occurrences:", count);
} else {
  console.log("File does NOT exist.");
}

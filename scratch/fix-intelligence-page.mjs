// Removes the last traces of the My Content tab from /intelligence and
// rewrites the file's header doc, which still described the old four tabs.
import fs from "node:fs";

const p = "artifacts/ipl-analytics/src/pages/intelligence.tsx";
let s = fs.readFileSync(p, "utf8");

const drops = [
  '            {tab === "My Content" && <MyContentTab byPlatform={byPlatform} />}\n',
  '    "My Content": PenSquare,\n',
  '  const byPlatform = hub.data?.socialByPlatform ?? { LinkedIn: [], X: [], Medium: [], Substack: [] };\n',
];
for (const d of drops) {
  if (s.includes(d)) s = s.replace(d, "");
  else console.warn("already gone:", d.trim().slice(0, 50));
}

const newDoc = [
  "/**",
  " * Intelligence - the public IPL data desk.",
  " *",
  " * Four sections:",
  " *   Newsroom    - live wire from ESPNcricinfo and themed Google News desks,",
  " *                 beside figures computed from this project's ball record",
  " *   Insights    - long-form articles with their references",
  " *   Business    - curated external reads, filterable by category",
  " *   Dimensions  - the ten analytical angles behind the project",
  " *",
  " * The author's own posts deliberately are NOT here; they live on /insights,",
  " * so a first-time reader arrives at the news rather than a personal archive.",
  " */",
].join("\n");

const end = s.indexOf(" */");
if (end > 0 && s.trimStart().startsWith("/**")) s = newDoc + s.slice(end + 3);

fs.writeFileSync(p, s);
const left = (s.match(/MyContentTab|"My Content"/g) || []).length;
console.log("remaining My Content refs:", left);

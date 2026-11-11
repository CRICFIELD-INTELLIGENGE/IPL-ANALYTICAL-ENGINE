// Step 3 validation — which player pages resolve their recent matches through the fuzzy fallbacks
// (behaviour unchanged by the patch; listed so the owner can decide whether to make resolution exact-only).
//   tsx src/step3/fallback-audit.ts --out report.md
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, parseArgs } from "../global/paths";

const { values } = parseArgs(process.argv.slice(2));
const web = path.join(REPO, "artifacts", "ipl-analytics");
const { resolveRecentMatchesKey } = await import(pathToFileURL(path.join(web, "src", "lib", "player-recent-matches.ts")).href);
const idx: Record<string, [string, number]> = JSON.parse(fs.readFileSync(path.join(web, "public", "data", "player-recent-matches", "index.json"), "utf8")).keys;
const lengths = Object.fromEntries(Object.entries(idx).map(([k, v]) => [k, v[1]]));
const bios: Record<string, { playerName?: string; fullName?: string }> = JSON.parse(fs.readFileSync(path.join(web, "public", "data", "player-bio.json"), "utf8"));
const slugify = (s?: string) => s?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? "";
const rows: string[] = [];
let direct = 0, fallback = 0, none = 0;
for (const [slug, bio] of Object.entries(bios)) {
  const key = resolveRecentMatchesKey(lengths, slug, bio);
  if (!key) { none++; continue; }
  if ([slug, slugify(bio.playerName), slugify(bio.fullName)].includes(key)) { direct++; continue; }
  fallback++;
  const aliases = Object.keys(idx).filter((k) => idx[k][0] === idx[key][0]).join(", ");
  rows.push(`| ${slug} | ${bio.fullName ?? bio.playerName ?? ""} | ${key} | ${lengths[key]} | ${aliases} |`);
}
const md = [
  "# Player pages resolved through fallback lookups", "",
  `Of ${Object.keys(bios).length} player bios: ${direct} resolve to their own slug or name key, ${fallback} through a fallback (initial+surname, surname-only or substring), ${none} have no recent matches.`,
  "The patch keeps this resolution identical to before. Fallback rows need a human check: some are the same player under another key, some are a different player sharing a surname.", "",
  "| Page slug | Bio name | Key used | Matches | Keys sharing that log |", "|---|---|---|---:|---|", ...rows, "",
].join("\n");
fs.writeFileSync(values.get("out") ?? "fallback-audit.md", md);
console.log(`${direct} direct, ${fallback} via fallback, ${none} none`);

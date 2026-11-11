// Step 3.5 — resolve /players/<slug> links and page headings with the player page's own code, for tests.
//
//   TSX_TSCONFIG_PATH=artifacts/ipl-analytics/tsconfig.json tsx src/step3/resolve-links.ts [--data <public/data>] --slugs a,b,…
//
// Prints { slug: { bio: bioKey | null, heading: string | null } } as JSON. The web modules import through
// "@/", hence the web tsconfig.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, parseArgs } from "../global/paths";

const WEB = path.join(REPO, "artifacts", "ipl-analytics");
const { values } = parseArgs(process.argv.slice(2));
const dataDir = values.get("data") ?? path.join(WEB, "public", "data");
const { resolvePlayerKey, resolveProfileName } = await import(pathToFileURL(path.join(WEB, "src", "lib", "player-key.ts")).href);
const { buildPlayerDisplayNames } = await import(pathToFileURL(path.join(WEB, "src", "lib", "aggregates.ts")).href);
const bios = JSON.parse(fs.readFileSync(path.join(dataDir, "player-bio.json"), "utf8"));
const identity = JSON.parse(fs.readFileSync(path.join(dataDir, "player-recent-matches", "index.json"), "utf8"));
const displayNames = buildPlayerDisplayNames(JSON.parse(fs.readFileSync(path.join(dataDir, "squads-by-season.json"), "utf8")));
const out: Record<string, { bio: string | null; heading: string | null }> = {};
for (const slug of (values.get("slugs") ?? "").split(",").filter(Boolean)) {
  const bio: string | null = resolvePlayerKey(bios, slug, identity);
  out[slug] = { bio, heading: bio ? resolveProfileName(bios[bio], bio, displayNames, identity) : null };
}
console.log(JSON.stringify(out));

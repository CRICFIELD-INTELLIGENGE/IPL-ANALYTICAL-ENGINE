// Day 4.6 — correct the Navdeep Saini squad-name mapping without affecting Nitin Saini.
//
//   tsx src/day4/fix-saini-squads.ts [--apply]
//
// Evidence (raw IPL files' registry blocks): Navdeep Saini (21d4e29b) is written "Navdeep Saini" in every season he
// played (2019, 2020/21, 2021, 2022, 2023, 2026; once "NA Saini" in 2023). "N Saini" is Nitin Saini (addbde6c, Kings XI
// Punjab 2012, 10 matches). The squad file mapped Navdeep's rows to "N Saini", i.e. to Nitin's written name.
//
//   1. squad rows {name "Navdeep Saini", cricsheetName "N Saini"} → cricsheetName "Navdeep Saini", only where that
//      season's files show 21d4e29b written "Navdeep Saini" for the same franchise;
//   2. Nitin's 2012 row {name "N Saini"} → name "Nitin Saini" (the fullName of his verified bio n-saini), so his page
//      heading stays "Nitin Saini" once "N Saini" no longer maps to Navdeep's display name;
//   3. bio navdeep-saini playerName "N Saini" → "Navdeep Saini" (his written name; it must still verify to 21d4e29b).

import fs from "node:fs";
import path from "node:path";
import { REPO, IPL_RAW_DIR, parseArgs } from "../global/paths";
import { createRegistryHistory, recordAppearance, identifyBio, loadVerifiedAliases, canonFranchise } from "../../lib/player-identity.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const SQUADS = [path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "squads-by-season.json"), path.join(REPO, "artifacts", "api-server", "data", "squads-by-season.json")];
const BIOS = [path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "player-bio.json"), path.join(REPO, "artifacts", "api-server", "data", "player-bio.json")];
for (const pair of [SQUADS, BIOS]) if (fs.readFileSync(pair[0], "utf8") !== fs.readFileSync(pair[1], "utf8")) throw new Error(`${pair[1]} differs from ${pair[0]}`);
const squads = JSON.parse(fs.readFileSync(SQUADS[0], "utf8"));
const bios = JSON.parse(fs.readFileSync(BIOS[0], "utf8"));

const history = createRegistryHistory();
const written = new Map<string, Set<string>>(); // `${id}|${seasonYear}|${franchise}` → written names
for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
  for (const [team, names] of Object.entries<string[]>(m.info.players)) for (const n of names) {
    const id = m.info.registry.people[n]; if (!id) continue;
    recordAppearance(history, id, n, team, m.info.season);
    const k = `${id}|${String(m.info.season).slice(0, 4)}|${canonFranchise(team)}`;
    (written.get(k) ?? written.set(k, new Set()).get(k)!).add(n);
  }
}
const aliases = loadVerifiedAliases(path.join(REPO, "scripts", "data", "player-identity-aliases.json"));
const changes: string[] = [];
const fail = (msg: string): never => { throw new Error(msg + " — nothing written"); };

for (const [season, teams] of Object.entries<Record<string, { name: string; cricsheetName: string | null }[]>>(squads)) {
  for (const [team, rows] of Object.entries(teams)) for (const r of rows ?? []) {
    if (r.name === "Navdeep Saini" && r.cricsheetName === "N Saini") {
      const names = written.get(`21d4e29b|${season}|${canonFranchise(team)}`);
      if (!names?.has("Navdeep Saini")) fail(`${season} ${team}: 21d4e29b not written "Navdeep Saini" (${[...(names ?? [])].join(", ") || "no appearance"})`);
      r.cricsheetName = "Navdeep Saini";
      changes.push(`squad ${season} ${team} "Navdeep Saini": cricsheetName "N Saini" → "Navdeep Saini" (files: ${[...names!].join(", ")})`);
    }
    if (r.name === "N Saini" && r.cricsheetName === "N Saini") {
      if (!written.get(`addbde6c|${season}|${canonFranchise(team)}`)?.has("N Saini")) fail(`${season} ${team}: "N Saini" row is not addbde6c`);
      if (identifyBio("n-saini", bios["n-saini"], history, aliases).id !== "addbde6c" || bios["n-saini"].fullName !== "Nitin Saini") fail("n-saini is not the verified bio of addbde6c named Nitin Saini");
      r.name = "Nitin Saini";
      changes.push(`squad ${season} ${team} "N Saini" (addbde6c): display name → "Nitin Saini" (fullName of verified bio n-saini)`);
    }
  }
}
if (bios["navdeep-saini"].playerName !== "N Saini") fail(`navdeep-saini playerName is ${bios["navdeep-saini"].playerName}`);
bios["navdeep-saini"].playerName = "Navdeep Saini";
if (identifyBio("navdeep-saini", bios["navdeep-saini"], history, aliases).id !== "21d4e29b") fail("navdeep-saini would not verify to 21d4e29b");
if (identifyBio("n-saini", bios["n-saini"], history, aliases).id !== "addbde6c") fail("n-saini would not verify to addbde6c");
changes.push(`bio navdeep-saini playerName "N Saini" → "Navdeep Saini" (verifies to 21d4e29b by exact written name)`);

console.log(changes.join("\n"));
const out = path.join(REPO, "docs", "data-repairs", "2026-10-14-day46", `saini-${flags.has("apply") ? "applied" : "dry-run"}.md`);
fs.writeFileSync(out, ["# Navdeep / Nitin Saini mapping fix", "", ...changes.map((c) => `- ${c}`), ""].join("\n"));
if (flags.has("apply")) {
  for (const f of SQUADS) fs.writeFileSync(f, JSON.stringify(squads, null, 2) + "\n");
  for (const f of BIOS) fs.writeFileSync(f, JSON.stringify(bios, null, 2) + "\n");
  console.log("written");
}

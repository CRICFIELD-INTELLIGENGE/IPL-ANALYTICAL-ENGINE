// Extracts "Retained players" (and equivalent retention sections) per season.
//
// Two layouts exist and both must be supported:
//   - older seasons: ONE table, franchises appear as colspan header rows that
//     apply to every following row until the next such row
//   - newer seasons: ONE TABLE PER FRANCHISE, named in the table's |+ caption

import fs from "node:fs";
import path from "node:path";
import {
  cleanCell, splitTables, parseTableRows, tableCaption, normHeader,
  parseInrConvert, parseAmount, normCountry, normTeam, detectTeam,
} from "./lib-wikitext.mjs";

const WIKI_DIR = process.argv[2];
const OUT_FILE = process.argv[3];
if (!WIKI_DIR || !OUT_FILE) {
  console.error("usage: node parse-wiki-retained.mjs <wikiJsonDir> <outFile>");
  process.exit(1);
}
const YEARS = Array.from({ length: 19 }, (_, i) => String(2008 + i));

const RETENTION_HEADINGS = /^==+\s*(Retained players|Player retention|Retentions)\s*==+/gim;

function retentionScopes(wikitext) {
  const scopes = [];
  const re = new RegExp(RETENTION_HEADINGS);
  let m;
  while ((m = re.exec(wikitext)) !== null) {
    const start = m.index;
    const level = (m[0].match(/^=+/) || ["=="])[0].length;
    const after = wikitext.slice(start + m[0].length);
    // End at the next heading of the same or shallower level.
    const endRe = new RegExp(`^={2,${level}}\\s*[^=]`, "m");
    const rel = after.search(endRe);
    scopes.push(rel === -1 ? wikitext.slice(start) : wikitext.slice(start, start + m[0].length + rel));
  }
  return scopes;
}

function mapCols(headers) {
  const H = headers.map(normHeader);
  const find = p => { const i = H.findIndex(p); return i === -1 ? null : i; };
  return {
    player: find(h => /^(player|name)$/.test(h)) ?? find(h => /^(player|name)\b/.test(h)),
    country: find(h => /^(nat|country|nationality)\b/.test(h)),
    salary: find(h => /(salary|price|amount|value)/.test(h)),
    role: find(h => /(role|type|speciality)/.test(h)),
  };
}

function salaryOf(rawCell) {
  const inr = parseInrConvert(rawCell);
  if (inr) return { price: inr.value, unit: inr.unit, lakh: inr.lakh, usd: null };
  const txt = String(rawCell ?? "");
  const amt = parseAmount(txt);
  if (amt == null) return { price: null, unit: null, lakh: null, usd: null };
  if (/\$|USD/i.test(txt)) return { price: amt, unit: "usd", lakh: null, usd: amt };
  if (/crore/i.test(txt)) return { price: amt, unit: "inr_crore", lakh: amt * 100, usd: null };
  if (/lakh|lac/i.test(txt)) return { price: amt, unit: "inr_lakh", lakh: amt, usd: null };
  return { price: amt, unit: null, lakh: null, usd: null };
}

const out = [];
const report = [];

for (const year of YEARS) {
  const file = path.join(WIKI_DIR, `${year}.json`);
  if (!fs.existsSync(file)) { report.push({ year, rows: 0, note: "no file" }); continue; }
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!j.parse) { report.push({ year, rows: 0, note: "no payload" }); continue; }

  const scopes = retentionScopes(j.parse.wikitext);
  let rows = 0;
  const teamsSeen = new Set();
  // "Retained players" is often a subsection of "Player retention", so the two
  // scopes overlap and would yield each player twice.
  const emitted = new Set();

  for (const scope of scopes) {
    for (const tbl of splitTables(scope)) {
      const captionTeam = detectTeam(tableCaption(tbl) ?? "");
      const parsed = parseTableRows(tbl);
      if (parsed.length < 2) continue;

      // Locate the header row (a row naming a player column).
      let hIdx = -1;
      for (let i = 0; i < Math.min(parsed.length, 4); i++) {
        const H = parsed[i].cells.map(normHeader);
        if (H.some(h => /^(player|name)\b/.test(h))) { hIdx = i; break; }
      }
      if (hIdx === -1) continue;
      const cols = mapCols(parsed[hIdx].cells);
      if (cols.player == null) continue;

      let currentTeam = captionTeam;
      for (let r = hIdx + 1; r < parsed.length; r++) {
        const { raw, cells } = parsed[r];

        // A colspan header row names the franchise for the rows that follow.
        // Count NON-EMPTY cells: colspan expansion pads the row out to full
        // width, so a raw length check would never fire.
        const filled = cells.filter(c => cleanCell(c) !== "").length;
        const isHeaderRow = /colspan/i.test(raw) && filled <= 1;
        if (isHeaderRow) {
          const t = detectTeam(raw);
          if (t) currentTeam = t;
          continue;
        }
        const team = currentTeam;
        if (!team) continue;

        const player = cleanCell(cells[cols.player] ?? "");
        if (!player || /^(player|name)$/i.test(player)) continue;
        if (/^\d+$/.test(player)) continue;

        const dedupeKey = `${player}|${team}`;
        if (emitted.has(dedupeKey)) continue;
        emitted.add(dedupeKey);

        const sal = cols.salary != null ? salaryOf(cells[cols.salary]) : { price: null, unit: null, lakh: null, usd: null };

        out.push({
          season: Number(year),
          player,
          team,
          teamCanonical: normTeam(team),
          country: cols.country != null ? normCountry(cleanCell(cells[cols.country] ?? "")) : null,
          role: cols.role != null ? cleanCell(cells[cols.role] ?? "") || null : null,
          acquisition: "retained",
          soldPrice: sal.price,
          soldUnit: sal.unit,
          soldLakh: sal.lakh,
          soldUsd: sal.usd,
        });
        teamsSeen.add(team);
        rows++;
      }
    }
  }
  report.push({ year, rows, teams: teamsSeen.size, scopes: scopes.length });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));

console.log("season  scopes  teams  retained");
for (const r of report) {
  console.log(
    String(r.year).padEnd(7),
    String(r.scopes ?? 0).padEnd(7),
    String(r.teams ?? 0).padEnd(6),
    String(r.rows).padEnd(8),
    r.note ?? "",
  );
}
console.log("\ntotal retained rows:", out.length);

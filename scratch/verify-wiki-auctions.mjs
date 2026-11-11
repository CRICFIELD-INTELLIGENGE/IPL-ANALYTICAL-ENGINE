// Audits the auction parser for silent row loss.
// For every table the parser consumed, compares the number of raw wikitext data
// rows against the number of records emitted, and prints the skipped rows so a
// drop is always visible rather than assumed harmless.

import fs from "node:fs";
import path from "node:path";

const WIKI_DIR = process.argv[2];
const PARSED = process.argv[3];
const parsed = JSON.parse(fs.readFileSync(PARSED, "utf8"));
const YEARS = Array.from({ length: 19 }, (_, i) => String(2008 + i));

function splitTables(wikitext) {
  const tables = [];
  let i = 0;
  while (i < wikitext.length) {
    const start = wikitext.indexOf("{|", i);
    if (start === -1) break;
    let depth = 0, j = start;
    while (j < wikitext.length) {
      if (wikitext.startsWith("{|", j)) { depth++; j += 2; continue; }
      if (wikitext.startsWith("|}", j)) { depth--; j += 2; if (depth === 0) break; continue; }
      j++;
    }
    tables.push(wikitext.slice(start, j));
    i = j;
  }
  return tables;
}

console.log("season  rawRows  parsed  delta");
let totalRaw = 0, totalParsed = 0;

for (const year of YEARS) {
  const j = JSON.parse(fs.readFileSync(path.join(WIKI_DIR, `${year}.json`), "utf8"));
  const wikitext = j.parse.wikitext;

  const soldIdx = wikitext.search(/^==+\s*Sold players\s*==+/mi);
  let scope;
  if (soldIdx !== -1) {
    const after = wikitext.slice(soldIdx);
    const endRel = after.slice(10).search(/^==\s*[^=]/m);
    scope = endRel === -1 ? after : after.slice(0, endRel + 10);
  } else {
    scope = wikitext;
  }

  // Count raw data rows only in tables that look like player tables.
  let raw = 0;
  for (const t of splitTables(scope)) {
    const head = t.slice(0, t.indexOf("|-") === -1 ? t.length : t.indexOf("|-")).toLowerCase();
    const looksPlayer = /(name|player)/.test(head) && /(price|salary|bid|amount)/.test(head);
    if (!looksPlayer) continue;
    const seps = (t.match(/^\s*\|-/gm) || []).length;
    raw += seps; // each |- precedes one data row (header sits before the first |-)
  }

  const got = parsed.filter(r => r.season === Number(year)).length;
  totalRaw += raw; totalParsed += got;
  const delta = got - raw;
  console.log(
    year.padEnd(7),
    String(raw).padEnd(8),
    String(got).padEnd(7),
    delta === 0 ? "0" : String(delta),
  );
}
console.log("-----");
console.log("TOTAL  ", String(totalRaw).padEnd(8), String(totalParsed).padEnd(7), totalParsed - totalRaw);
console.log("\n(negative delta = rows in wikitext not emitted; expected for unsold/section-header rows)");

// Extracts each fixture's start time from the Wikipedia season pages and maps
// it onto our match ids, so day and night games can be told apart.
//
// Two fixture templates are in use across the seasons ({{Single-innings cricket
// match}} in later years, {{limited overs matches}} earlier), and both carry
// "| time = HH:MM" plus a "daynight" or "night" flag. Only 2010 has neither.

import fs from "node:fs";
import path from "node:path";

const [, , SEASON_DIR, MATCHES_FILE, OUT_FILE] = process.argv;
if (!OUT_FILE) {
  console.error("usage: node parse-match-times.mjs <seasonDir> <matches.json> <out>");
  process.exit(1);
}

const matches = JSON.parse(fs.readFileSync(MATCHES_FILE, "utf8"));

/** Franchise identity, tolerant of renames and short codes. */
function teamKey(name) {
  const t = String(name || "").toLowerCase();
  if (t.includes("deccan") || t.includes("chargers")) return "DECCAN";
  if (t.includes("sunrisers") || t.includes("hyderabad") || t === "srh") return "SRH";
  if (t.includes("lions")) return "GL";
  if (t.includes("titans") || t === "gt") return "GT";
  if (t.includes("rising pune") || t.includes("supergiant")) return "RPS";
  if (t.includes("pune warriors") || t === "pwi") return "PW";
  if (t.includes("kochi") || t.includes("tuskers")) return "KTK";
  if (t.includes("delhi") || t.includes("daredevils") || t === "dc" || t === "dd") return "DC";
  if (t.includes("punjab") || t.includes("kings xi") || t === "pbks" || t === "kxip") return "PBKS";
  if (t.includes("bangalore") || t.includes("bengaluru") || t.includes("challengers") || t === "rcb") return "RCB";
  if (t.includes("chennai") || t === "csk") return "CSK";
  if (t.includes("mumbai") || t === "mi") return "MI";
  if (t.includes("kolkata") || t === "kkr") return "KKR";
  if (t.includes("rajasthan") || t === "rr") return "RR";
  if (t.includes("lucknow") || t === "lsg") return "LSG";
  return t.toUpperCase().trim();
}

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** "22 March 2024" / "12 March" -> ISO date, using the season for a missing year. */
function parseDate(raw, season) {
  const text = String(raw || "");

  // Later seasons wrap the date in {{Start date|YYYY|MM|DD|df=y}} rather than
  // writing it out, so stripping templates first lost every 2025-26 fixture.
  const tmpl = /\{\{\s*Start date\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(text);
  if (tmpl) {
    return `${tmpl[1]}-${String(Number(tmpl[2])).padStart(2, "0")}-${String(Number(tmpl[3])).padStart(2, "0")}`;
  }

  const s = text.replace(/\{\{[^}]*\}\}/g, " ").replace(/\[\[|\]\]/g, " ").trim();
  const m = /(\d{1,2})\s+([A-Za-z]+)\s*(\d{4})?/.exec(s);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  // Seasons run March-May, so a missing year is the season year itself.
  const year = m[3] ? Number(m[3]) : Number(season);
  if (!Number.isFinite(year)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cleanTeam(raw) {
  return String(raw || "")
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\(H\)|\(A\)|\(N\)/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits a template invocation into its "| key = value" parameters. */
function params(block) {
  const out = {};
  let depth = 0, sq = 0, buf = "", parts = [];
  for (let i = 0; i < block.length; i++) {
    if (block.startsWith("{{", i)) { depth++; buf += "{{"; i++; continue; }
    if (block.startsWith("}}", i)) { depth--; buf += "}}"; i++; continue; }
    if (block.startsWith("[[", i)) { sq++; buf += "[["; i++; continue; }
    if (block.startsWith("]]", i)) { sq--; buf += "]]"; i++; continue; }
    if (block[i] === "|" && depth <= 1 && sq === 0) { parts.push(buf); buf = ""; continue; }
    buf += block[i];
  }
  parts.push(buf);
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    out[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return out;
}

/** Every fixture-template invocation on the page, brace-balanced. */
function fixtureBlocks(wikitext) {
  const blocks = [];
  const re = /\{\{\s*(Single-innings cricket match|limited overs matches)/gi;
  let m;
  while ((m = re.exec(wikitext)) !== null) {
    let depth = 0, i = m.index;
    while (i < wikitext.length) {
      if (wikitext.startsWith("{{", i)) { depth++; i += 2; continue; }
      if (wikitext.startsWith("}}", i)) { depth--; i += 2; if (depth === 0) break; continue; }
      i++;
    }
    blocks.push(wikitext.slice(m.index, i));
  }
  return blocks;
}

// Index our matches by date + the pair of franchises, so wiki rows can be
// matched regardless of which side the template lists first.
const byKey = new Map();
for (const m of matches) {
  const pair = [teamKey(m.team1), teamKey(m.team2)].sort().join("|");
  byKey.set(`${m.date}|${pair}`, m);
}

const out = {};
const report = [];
let totalParsed = 0, totalMatched = 0;

for (let year = 2008; year <= 2026; year++) {
  // Some seasons keep their fixture list on a separate "<year> Indian Premier
  // League group stage" page. 2011's main page carries no start times at all
  // while its group-stage page has all seventy, so both are scanned.
  const sources = [
    path.join(SEASON_DIR, `${year}.json`),
    path.join(SEASON_DIR, `gs-${year}.json`),
  ].filter(f => fs.existsSync(f));
  if (sources.length === 0) continue;

  const wikitexts = [];
  for (const file of sources) {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    if (j.parse?.wikitext) wikitexts.push(j.parse.wikitext);
  }
  if (wikitexts.length === 0) continue;

  let parsed = 0, matched = 0;
  for (const block of wikitexts.flatMap(fixtureBlocks)) {
    const p = params(block);
    const time = /^(\d{1,2}):(\d{2})/.exec(String(p.time || "").trim());
    if (!time) continue;
    const date = parseDate(p.date, year);
    const t1 = cleanTeam(p.team1);
    const t2 = cleanTeam(p.team2);
    if (!date || !t1 || !t2) continue;
    parsed++;

    const hour = Number(time[1]);
    // Split on start time, not the daynight flag. A 16:00 start also finishes
    // under lights so Wikipedia marks it daynight=y, and trusting that flag
    // classified all 254 afternoon fixtures as night games. Evening matches
    // start 19:00-20:30; the afternoon slot is 15:30-17:00.
    const isNight = hour >= 18;

    const pair = [teamKey(t1), teamKey(t2)].sort().join("|");
    let match = byKey.get(`${date}|${pair}`);

    // Wikipedia and Cricsheet occasionally disagree by a day on late-evening
    // fixtures (the 2014 Qualifier is recorded as 27 May here and 28 May
    // there). A neighbouring date is accepted only when the same two sides are
    // involved, which cannot collide: no pair meets twice within a day.
    if (!match) {
      for (const shift of [-1, 1]) {
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + shift);
        const alt = byKey.get(`${d.toISOString().slice(0, 10)}|${pair}`);
        if (alt) { match = alt; break; }
      }
    }
    if (!match) continue;
    matched++;
    out[match.id] = { time: `${time[1].padStart(2, "0")}:${time[2]}`, isNight };
  }
  totalParsed += parsed;
  totalMatched += matched;
  report.push({ year, parsed, matched });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));

console.log("season  parsed  matched");
for (const r of report) {
  console.log(String(r.year).padEnd(7), String(r.parsed).padEnd(7), String(r.matched));
}
const night = Object.values(out).filter(v => v.isNight).length;
console.log(`\nparsed ${totalParsed}, matched to our fixtures ${totalMatched} of ${matches.length}`);
console.log(`night ${night} | day ${totalMatched - night}`);

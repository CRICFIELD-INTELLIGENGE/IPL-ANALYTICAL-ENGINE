// Parses "List of Indian Premier League captains" into per-franchise records.
//
// The source is a career-level table: one row per captain with total matches,
// wins, losses and the team(s) they led. It does NOT say who captained an
// individual match, so this cannot drive a per-match filter — see the coverage
// note printed at the end and the `singleTeam` flag on each row.

import fs from "node:fs";
import {
  cleanCell, splitTables, parseTableRows, normHeader, normCountry,
} from "./lib-wikitext.mjs";

const [, , CAPTAINS_FILE, OUT_FILE] = process.argv;
if (!OUT_FILE) {
  console.error("usage: node parse-captains.mjs <captains.json> <out>");
  process.exit(1);
}

const wikitext = JSON.parse(fs.readFileSync(CAPTAINS_FILE, "utf8")).parse.wikitext;

/** Franchise identity, keeping distinct clubs apart (Deccan != SRH). */
function franchiseKey(name) {
  const t = String(name || "").toLowerCase().trim();
  if (t.includes("deccan") || t === "dc h" || t === "dch") return "DEC";
  if (t.includes("sunrisers") || t.includes("hyderabad") || t === "srh") return "SRH";
  if (t.includes("lions") || t === "gl") return "GL";
  if (t.includes("titans") || t === "gt") return "GT";
  if (t.includes("rising pune") || t.includes("supergiant") || t === "rps") return "RPS";
  if (t.includes("pune warriors") || t === "pwi" || t === "pw") return "PW";
  if (t.includes("kochi") || t.includes("tuskers") || t === "ktk") return "KTK";
  if (t.includes("delhi") || t.includes("daredevils") || t === "dc" || t === "dd") return "DC";
  if (t.includes("punjab") || t.includes("kings xi") || t === "pbks" || t === "kxip") return "PBKS";
  if (t.includes("bangalore") || t.includes("bengaluru") || t.includes("challengers") || t === "rcb") return "RCB";
  if (t.includes("chennai") || t === "csk") return "CSK";
  if (t.includes("mumbai") || t === "mi") return "MI";
  if (t.includes("kolkata") || t === "kkr") return "KKR";
  if (t.includes("rajasthan") || t === "rr") return "RR";
  if (t.includes("lucknow") || t === "lsg") return "LSG";
  return null;
}

const FRANCHISE_NAMES = {
  CSK: "Chennai Super Kings", MI: "Mumbai Indians", KKR: "Kolkata Knight Riders",
  RCB: "Royal Challengers Bengaluru", RR: "Rajasthan Royals", DC: "Delhi Capitals",
  PBKS: "Punjab Kings", SRH: "Sunrisers Hyderabad", DEC: "Deccan Chargers",
  GT: "Gujarat Titans", GL: "Gujarat Lions", LSG: "Lucknow Super Giants",
  RPS: "Rising Pune Supergiant", PW: "Pune Warriors", KTK: "Kochi Tuskers Kerala",
};

// The team cell lists one or more clubs separated by <br>, so the raw cell is
// split before each part is resolved.
function teamsFrom(rawCell) {
  return String(rawCell ?? "")
    .split(/<br\s*\/?>/i)
    .map(part => franchiseKey(cleanCell(part)))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
}

const num = (v) => {
  const n = Number(String(cleanCell(v)).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const rows = [];
for (const table of splitTables(wikitext)) {
  const parsed = parseTableRows(table);
  if (parsed.length < 2) continue;
  const H = parsed[0].cells.map(normHeader);
  const col = (re) => H.findIndex(h => re.test(h));
  const cPlayer = col(/^player/), cNat = col(/^nationality/), cFirst = col(/^first/),
        cLast = col(/^last/), cMatches = col(/^matches/), cTeams = col(/^team/),
        cWon = col(/^won/), cLost = col(/^lost/), cTied = col(/^tied/),
        cNr = col(/^nr/), cTitles = col(/^titles/);
  if (cPlayer === -1 || cTeams === -1 || cMatches === -1) continue;

  for (let i = 1; i < parsed.length; i++) {
    const c = parsed[i].cells;
    const player = cleanCell(c[cPlayer] ?? "");
    if (!player || /^player$/i.test(player)) continue;
    const teams = teamsFrom(c[cTeams]);
    if (teams.length === 0) continue;

    rows.push({
      player,
      country: cNat === -1 ? null : normCountry(cleanCell(c[cNat] ?? "")),
      firstSeason: num(c[cFirst]) || null,
      lastSeason: num(c[cLast]) || null,
      matches: num(c[cMatches]),
      won: cWon === -1 ? 0 : num(c[cWon]),
      lost: cLost === -1 ? 0 : num(c[cLost]),
      tied: cTied === -1 ? 0 : num(c[cTied]),
      noResult: cNr === -1 ? 0 : num(c[cNr]),
      titles: cTitles === -1 ? 0 : num(c[cTitles]),
      teams,
      // Totals can only be attributed to a franchise when the captain led
      // exactly one; the table gives no per-club split for the rest.
      singleTeam: teams.length === 1,
    });
  }
}

// franchise -> captains who led it, most matches first
const byFranchise = {};
for (const r of rows) {
  for (const key of r.teams) {
    const name = FRANCHISE_NAMES[key];
    if (!name) continue;
    (byFranchise[name] ??= []).push({
      player: r.player,
      country: r.country,
      firstSeason: r.firstSeason,
      lastSeason: r.lastSeason,
      titles: r.titles,
      /** Career totals across every club led — only exact when singleTeam. */
      matches: r.matches,
      won: r.won,
      lost: r.lost,
      winPct: r.matches > 0 ? Math.round((r.won / r.matches) * 1000) / 10 : 0,
      exact: r.singleTeam,
      alsoLed: r.teams.filter(k => k !== key).map(k => FRANCHISE_NAMES[k] ?? k),
    });
  }
}
for (const list of Object.values(byFranchise)) list.sort((a, b) => b.matches - a.matches);

fs.writeFileSync(OUT_FILE, JSON.stringify({ captains: rows, byFranchise }, null, 2));

const multi = rows.filter(r => !r.singleTeam);
console.log(`captains parsed: ${rows.length}`);
console.log(`led a single franchise (totals exact): ${rows.length - multi.length}`);
console.log(`led more than one (totals are career-wide): ${multi.length}`);
for (const r of multi) console.log(`   ${r.player} — ${r.teams.join(", ")} (${r.matches} matches combined)`);
console.log(`\nfranchises covered: ${Object.keys(byFranchise).length}`);

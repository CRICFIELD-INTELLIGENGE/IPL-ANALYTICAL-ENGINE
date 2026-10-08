// Extracts per-season league standings from the {{#invoke:Sports table}} block
// on each season's Wikipedia page.
//
// The template carries one flat namespace of "field_TEAMCODE=value" parameters
// plus an ordering list, e.g.
//   |team_order=PBKS, RCB, GT, ...        (newer seasons)
//   |team1=RR |team2=KXIP |...            (older seasons)
//   |win_CSK=8 |loss_CSK=6 |nr_CSK=0 |nrr_CSK=-0.647
// Older seasons omit nrr and instead give the raw run/over totals it is
// derived from, so NRR is recomputed for those.

import fs from "node:fs";
import path from "node:path";

const SEASON_DIR = process.argv[2];
const OUT_FILE = process.argv[3];
if (!SEASON_DIR || !OUT_FILE) {
  console.error("usage: node parse-wiki-points.mjs <seasonJsonDir> <outFile>");
  process.exit(1);
}
const YEARS = Array.from({ length: 19 }, (_, i) => String(2008 + i));

/**
 * Team codes are reused across eras: "DC" is Deccan Chargers up to 2012 and
 * Delhi Capitals from 2019, so the season decides. Getting this wrong would
 * silently credit one franchise with another's record.
 */
function teamFromCode(code, season) {
  const c = String(code || "").trim().toUpperCase();
  const y = Number(season);
  const map = {
    CSK: "Chennai Super Kings",
    MI: "Mumbai Indians",
    KKR: "Kolkata Knight Riders",
    RR: "Rajasthan Royals",
    SRH: "Sunrisers Hyderabad",
    GT: "Gujarat Titans",
    LSG: "Lucknow Super Giants",
    LSG2: "Lucknow Super Giants",
    GL: "Gujarat Lions",
    KTK: "Kochi Tuskers Kerala",
    PWI: "Pune Warriors India",
    PW: "Pune Warriors India",
    RPS: "Rising Pune Supergiant",
    RPSG: "Rising Pune Supergiant",
    DD: "Delhi Capitals",
    DEC: "Deccan Chargers",
    KXIP: "Punjab Kings",
    PBKS: "Punjab Kings",
    RCB: "Royal Challengers Bengaluru",
  };
  if (c === "DC") return y <= 2012 ? "Deccan Chargers" : "Delhi Capitals";
  return map[c] ?? null;
}

/** "264.2" in cricket notation is 264 overs and 2 balls. */
function oversToBalls(text) {
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  const whole = Math.floor(n);
  const balls = Math.round((n - whole) * 10);
  return whole * 6 + balls;
}

/** Pulls the Sports table invocation, respecting nested {{ }}. */
function extractInvoke(wikitext) {
  const start = wikitext.search(/\{\{\s*#invoke:\s*Sports table/i);
  if (start === -1) return null;
  let depth = 0, i = start;
  while (i < wikitext.length) {
    if (wikitext.startsWith("{{", i)) { depth++; i += 2; continue; }
    if (wikitext.startsWith("}}", i)) { depth--; i += 2; if (depth === 0) break; continue; }
    i++;
  }
  return wikitext.slice(start, i);
}

/** Flattens "|key=value" pairs, ignoring pipes nested in templates/links. */
function parseParams(block) {
  const params = new Map();
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
    const key = p.slice(0, eq).trim();
    const val = p.slice(eq + 1).trim();
    if (key) params.set(key, val);
  }
  return params;
}

const out = {};
const report = [];

for (const year of YEARS) {
  // Most seasons keep the standings inline; the rest transclude
  // "Template:<year> Indian Premier League Points table", fetched alongside.
  const sources = [
    path.join(SEASON_DIR, `${year}.json`),
    path.join(SEASON_DIR, `pt-${year}.json`),
  ];
  let block = null;
  for (const file of sources) {
    if (!fs.existsSync(file)) continue;
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!j.parse) continue;
    const found = extractInvoke(j.parse.wikitext);
    if (found) { block = found; break; }
  }
  if (!block) { report.push({ year, note: "no sports table" }); continue; }
  const P = parseParams(block);

  // Standings order: explicit list, else team1..teamN.
  let codes = [];
  if (P.has("team_order")) {
    codes = P.get("team_order").split(",").map(s => s.trim()).filter(Boolean);
  } else {
    for (let i = 1; i <= 12; i++) {
      const v = P.get(`team${i}`);
      if (v) codes.push(v.trim());
    }
  }
  if (codes.length === 0) { report.push({ year, note: "no team list" }); continue; }

  const rows = [];
  codes.forEach((code, idx) => {
    const team = teamFromCode(code, year);
    if (!team) { report.push({ year, note: `unmapped code ${code}` }); return; }
    const num = (k) => {
      const v = P.get(`${k}_${code}`);
      if (v === undefined || v === "") return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const wins = num("win"), losses = num("loss"), nr = num("nr");

    let nrr = null;
    const nrrRaw = P.get(`nrr_${code}`);
    if (nrrRaw !== undefined && nrrRaw !== "" && Number.isFinite(Number(nrrRaw))) {
      nrr = Number(nrrRaw);
    } else {
      // Recompute from run/over totals for the seasons that omit it.
      const rs = Number(P.get(`rs_${code}`));
      const rc = Number(P.get(`rc_${code}`));
      const ob = oversToBalls(P.get(`or_${code}`));
      const cb = oversToBalls(P.get(`ob_${code}`));
      if ([rs, rc].every(Number.isFinite) && ob && cb) {
        nrr = Math.round(((rs / (ob / 6)) - (rc / (cb / 6))) * 1000) / 1000;
      }
    }

    // result1..N align with the team ordering and mark qualification.
    const result = P.get(`result${idx + 1}`) ?? null;

    rows.push({
      position: idx + 1,
      team,
      teamCode: code,
      played: wins + losses + nr,
      wins,
      losses,
      noResult: nr,
      points: wins * 2 + nr,
      nrr,
      qualified: result === "Q" || result === "A" || result === "C",
      result,
    });
  });

  if (rows.length) {
    out[year] = rows;
    report.push({ year, teams: rows.length });
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));

console.log("season  teams  top team (P/W/L/Pts/NRR)");
for (const r of report) {
  if (r.note) { console.log(String(r.year).padEnd(7), "--", r.note); continue; }
  const top = out[r.year][0];
  console.log(
    String(r.year).padEnd(7),
    String(r.teams).padEnd(6),
    `${top.team} (${top.played}/${top.wins}/${top.losses}/${top.points}/${top.nrr})`,
  );
}

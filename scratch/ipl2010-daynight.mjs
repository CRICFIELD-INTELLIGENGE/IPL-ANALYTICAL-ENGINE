// Fills the day/night gaps Wikipedia cannot answer.
//
// 2010: the season page lists all sixty fixtures but publishes no start time
// for any of them. ESPNcricinfo's fixtures list marks every match (N) or (D/N);
// those markers are transcribed below and joined on date + teams.
//
// 2017: the first fourteen fixtures carry no time field, and the page's
// daynight flag is useless there because it is set on all fifty-six matches.
// Times come from a published schedule and were cross-checked against a second
// source for the four Sunrisers fixtures in that window, which agreed on all
// four.
//
// (N) is an evening match; (D/N) starts in the afternoon and finishes under
// lights, so it lands in the afternoon bucket — the same rule the Wikipedia
// times use, where a 16:00 start is afternoon and 19:30/20:00 is evening.

import fs from "node:fs";

const [, , MATCHES_FILE, CONDITIONS_FILE] = process.argv;
if (!CONDITIONS_FILE) {
  console.error("usage: node ipl2010-daynight.mjs <matches.json> <match-conditions.json>");
  process.exit(1);
}

// [match number, date (2010), side A, side B, marker]
const FIXTURES = [
  [1, "03-12", "KKR", "DEC", "N"],
  [2, "03-13", "MI", "RR", "D/N"],
  [3, "03-13", "PBKS", "DC", "N"],
  [4, "03-14", "RCB", "KKR", "D/N"],
  [5, "03-14", "DEC", "CSK", "N"],
  [6, "03-15", "RR", "DC", "N"],
  [7, "03-16", "PBKS", "RCB", "D/N"],
  [8, "03-16", "CSK", "KKR", "N"],
  [9, "03-17", "MI", "DC", "N"],
  [10, "03-18", "RR", "RCB", "N"],
  [11, "03-19", "DC", "CSK", "D/N"],
  [12, "03-19", "DEC", "PBKS", "N"],
  [13, "03-20", "RR", "KKR", "D/N"],
  [14, "03-20", "MI", "RCB", "N"],
  [15, "03-21", "DEC", "DC", "D/N"],
  [16, "03-21", "PBKS", "CSK", "N"],
  [17, "03-22", "KKR", "MI", "N"],
  [18, "03-23", "RCB", "CSK", "N"],
  [19, "03-24", "RR", "PBKS", "N"],
  [20, "03-25", "DC", "RCB", "D/N"],
  [21, "03-25", "CSK", "MI", "N"],
  [22, "03-26", "DEC", "RR", "N"],
  [23, "03-27", "KKR", "PBKS", "N"],
  [24, "03-28", "RR", "CSK", "D/N"],
  [25, "03-28", "MI", "DEC", "N"],
  [26, "03-29", "DC", "KKR", "N"],
  [27, "03-30", "PBKS", "MI", "N"],
  [28, "03-31", "RCB", "CSK", "D/N"],
  [29, "03-31", "DC", "RR", "N"],
  [30, "04-01", "KKR", "DEC", "N"],
  [31, "04-02", "PBKS", "RCB", "N"],
  [32, "04-03", "CSK", "RR", "D/N"],
  [33, "04-03", "MI", "DEC", "N"],
  [34, "04-04", "KKR", "PBKS", "D/N"],
  [35, "04-04", "DC", "RCB", "N"],
  [36, "04-05", "RR", "DEC", "N"],
  [37, "04-06", "CSK", "MI", "N"],
  [38, "04-07", "PBKS", "RR", "D/N"],
  [39, "04-07", "KKR", "DC", "N"],
  [40, "04-08", "RCB", "DEC", "N"],
  [41, "04-09", "MI", "PBKS", "N"],
  [42, "04-10", "CSK", "DEC", "D/N"],
  [43, "04-10", "KKR", "RCB", "N"],
  [44, "04-11", "DC", "PBKS", "D/N"],
  [45, "04-11", "MI", "RR", "N"],
  [46, "04-12", "DEC", "RCB", "N"],
  [47, "04-13", "MI", "DC", "D/N"],
  [48, "04-13", "KKR", "CSK", "N"],
  [49, "04-14", "RR", "RCB", "N"],
  [50, "04-15", "CSK", "DC", "N"],
  [51, "04-16", "PBKS", "DEC", "N"],
  [52, "04-17", "MI", "RCB", "D/N"],
  [53, "04-17", "RR", "KKR", "N"],
  [54, "04-18", "PBKS", "CSK", "D/N"],
  [55, "04-18", "DEC", "DC", "N"],
  [56, "04-19", "MI", "KKR", "N"],
  [57, "04-21", "MI", "RCB", "N"],   // 1st Semi-Final
  [58, "04-22", "CSK", "DEC", "N"],  // 2nd Semi-Final
  [59, "04-24", "DEC", "RCB", "N"],  // 3rd Place Play-off
  [60, "04-25", "CSK", "MI", "N"],   // Final
];

// [date (2017), side A, side B, start time]
const FIXTURES_2017 = [
  ["04-05", "SRH", "RCB", "20:00"],
  ["04-06", "RPS", "MI", "20:00"],
  ["04-07", "GL", "KKR", "20:00"],
  ["04-08", "PBKS", "RPS", "16:00"],
  ["04-08", "RCB", "DC", "20:00"],
  ["04-09", "SRH", "GL", "16:00"],
  ["04-09", "MI", "KKR", "20:00"],
  ["04-10", "PBKS", "RCB", "20:00"],
  ["04-11", "RPS", "DC", "20:00"],
  ["04-12", "MI", "SRH", "20:00"],
  ["04-13", "KKR", "PBKS", "20:00"],
  ["04-14", "RCB", "MI", "16:00"],
  ["04-14", "GL", "RPS", "20:00"],
  ["04-15", "KKR", "SRH", "16:00"],
];

function teamKey(name) {
  const t = String(name || "").toLowerCase();
  if (t.includes("deccan") || t.includes("chargers")) return "DEC";
  if (t.includes("sunrisers") || t.includes("hyderabad")) return "SRH";
  if (t.includes("delhi") || t.includes("daredevils")) return "DC";
  if (t.includes("punjab") || t.includes("kings xi")) return "PBKS";
  if (t.includes("bangalore") || t.includes("bengaluru") || t.includes("challengers")) return "RCB";
  if (t.includes("chennai")) return "CSK";
  if (t.includes("mumbai")) return "MI";
  if (t.includes("kolkata")) return "KKR";
  if (t.includes("rajasthan")) return "RR";
  if (t.includes("lions")) return "GL";
  if (t.includes("titans")) return "GT";
  if (t.includes("rising pune") || t.includes("supergiant")) return "RPS";
  if (t.includes("pune warriors")) return "PW";
  if (t.includes("kochi") || t.includes("tuskers")) return "KTK";
  if (t.includes("lucknow")) return "LSG";
  return t.toUpperCase();
}

const matches = JSON.parse(fs.readFileSync(MATCHES_FILE, "utf8"));
const conditions = JSON.parse(fs.readFileSync(CONDITIONS_FILE, "utf8"));

function indexSeason(season) {
  const idx = new Map();
  for (const m of matches) {
    if (String(m.season) !== season) continue;
    idx.set(`${m.date}|${[teamKey(m.team1), teamKey(m.team2)].sort().join("|")}`, m);
  }
  return idx;
}
const byKey = indexSeason("2010");
const byKey2017 = indexSeason("2017");

let added = 0;
const unmatched = [];
for (const [no, md, a, b, marker] of FIXTURES) {
  const date = `2010-${md}`;
  const key = `${date}|${[a, b].sort().join("|")}`;
  const match = byKey.get(key);
  if (!match) { unmatched.push(`#${no} ${date} ${a} v ${b}`); continue; }
  conditions[match.id] = {
    // Recorded as the slot rather than a clock time: ESPNcricinfo publishes the
    // marker, not the start time, for this season.
    time: marker === "N" ? "20:00" : "16:00",
    isNight: marker === "N",
    source: "espncricinfo-2010",
  };
  added++;
}

let added2017 = 0;
for (const [md, a, b, time] of FIXTURES_2017) {
  const date = `2017-${md}`;
  const match = byKey2017.get(`${date}|${[a, b].sort().join("|")}`);
  if (!match) { unmatched.push(`2017 ${date} ${a} v ${b}`); continue; }
  conditions[match.id] = {
    time,
    isNight: Number(time.slice(0, 2)) >= 18,
    source: "published-schedule-2017",
  };
  added2017++;
}

fs.writeFileSync(CONDITIONS_FILE, JSON.stringify(conditions, null, 2));
console.log(`2017 fixtures matched: ${added2017} of ${FIXTURES_2017.length}`);

const total = Object.keys(conditions).length;
const night = Object.values(conditions).filter(v => v.isNight).length;
console.log(`2010 fixtures matched: ${added} of ${FIXTURES.length}`);
if (unmatched.length) console.log("unmatched:\n  " + unmatched.join("\n  "));
console.log(`conditions now cover ${total} matches (night ${night} / afternoon ${total - night})`);

// Loads the SupeRR Selector S2 official data pack (CSV) into a SQLite file with the same
// tables the pressure build reads from global.db, so the identical pipeline runs on it.
//
//   node --import tsx scripts/pressure/ingest-official.ts <data-pack-dir>
//   → lib/cricket-data/official/official.db (git-ignored: challenge data is not published)
//
// Encoding facts, verified against Cricsheet on 1,479 innings aligned ball-for-ball:
//   * runs = batter's runs only. extras1_runs is an extras-TYPE code, not runs.
//   * extras_type: wide; Overstep and other = no-ball; byes; legbyes; Penalty.
//   * extras_2_runs = byes/leg-byes run off a no-ball.
//   * The pack does not record how many runs a wide/bye/leg-bye produced. They are imputed
//     as 1 (penalty 5). Against Cricsheet, imputed innings totals: median error 0,
//     mean absolute error 3.4 runs. Only team totals and chase targets use these.
//   * Revised overs are stored in balls (114 = 19 overs).

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "ball_by_ball.csv"))) throw new Error("usage: ingest-official.ts <dir with ball_by_ball.csv>");

function readCsv(file: string): Record<string, string>[] {
  const text = fs.readFileSync(path.join(dir, file), "utf8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (line: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]);
  return lines.slice(1).map(l => { const v = split(l); return Object.fromEntries(head.map((h, i) => [h, v[i] ?? ""])); });
}

const root = path.resolve(process.cwd(), "..", "..");
const outDir = path.join(root, "lib", "cricket-data", "official");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "official.db");
if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
const db = new DatabaseSync(outFile);
db.exec(`
CREATE TABLE competitions (competition_id INTEGER PRIMARY KEY, code TEXT, name TEXT);
CREATE TABLE teams (team_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE players (player_key INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE matches (match_id INTEGER PRIMARY KEY, competition_id INTEGER, source_comp_id INTEGER, start_date TEXT, winner_id INTEGER,
  result TEXT, method TEXT, team1_id INTEGER, team2_id INTEGER, scheduled_overs INTEGER, balls_per_over INTEGER, stage TEXT, knock_out INTEGER);
CREATE TABLE innings (match_id INTEGER, innings_no INTEGER, batting_team_id INTEGER, bowling_team_id INTEGER, super_over INTEGER,
  target_runs INTEGER, target_overs REAL);
CREATE TABLE deliveries (match_id INTEGER, innings_no INTEGER, over_no INTEGER, seq INTEGER, batter INTEGER, bowler INTEGER,
  runs_batter INTEGER, runs_total INTEGER, wides INTEGER, noballs INTEGER, byes INTEGER, legbyes INTEGER, penalty INTEGER,
  bowling_type TEXT, pace_or_spin TEXT);
CREATE TABLE wickets (match_id INTEGER, innings_no INTEGER, over_no INTEGER, seq INTEGER, kind TEXT, player_out INTEGER);
`);

// Three analysis competitions; the pack's per-series ids are kept on matches.source_comp_id.
const comps = readCsv("competitions.csv");
const codeOf = (c: Record<string, string>) => (c.match_format === "T20I" ? "t20i" : /^IPL /.test(c.comp_name) ? "ipl" : "emerging");
db.exec(`INSERT INTO competitions VALUES (1,'ipl','Indian Premier League'),(2,'t20i','Men''s T20 Internationals'),(3,'emerging','Emerging / Rising Stars T20')`);
const compId: Record<string, number> = { ipl: 1, t20i: 2, emerging: 3 };
const compCode = new Map(comps.map(c => [c.comp_id, codeOf(c)]));

const teamIns = db.prepare("INSERT OR IGNORE INTO teams VALUES (?, ?)");
for (const t of readCsv("teams.csv")) teamIns.run(Number(t.team_id), t.team_name);
const playerIns = db.prepare("INSERT OR IGNORE INTO players VALUES (?, ?)");
for (const p of readCsv("competition_team_player_mapping.csv")) playerIns.run(Number(p.player_id), p.player_name);

const matches = readCsv("matches.csv");
const matchIns = db.prepare("INSERT INTO matches VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
const meta = new Map<string, Record<string, string>>();
for (const m of matches) {
  meta.set(m.match_id, m);
  const noResult = /no result|abandon/i.test(m.result);
  const tie = /\btied?\b/i.test(m.result);
  const revised = !!(m.first_inn_revised_overs || m.second_inn_revised_overs || m.revised_target);
  matchIns.run(Number(m.match_id), compId[compCode.get(m.comp_id)!], Number(m.comp_id), m.match_date,
    noResult || tie || !m.win_team_id ? null : Number(m.win_team_id), noResult ? "no result" : tie ? "tie" : null,
    revised ? "D/L" : null, Number(m.home_team_id), Number(m.away_team_id), 20, 6, m.stage, Number(m.knock_out || 0));
}

// Deliveries in bowling order within each innings.
const balls = readCsv("ball_by_ball.csv");
balls.sort((a, b) => Number(a.match_id) - Number(b.match_id) || Number(a.innings) - Number(b.innings) || Number(a.innings_ball_num) - Number(b.innings_ball_num));
const KIND: Record<string, string> = {
  Caught: "caught", Bowled: "bowled", LBW: "lbw", RunOut: "run out", Stump: "stumped", "Hit Wicket": "hit wicket",
  "Retire Out": "retired out", "Obstracting the field": "obstructing the field", "Obstructing the field": "obstructing the field",
};
const delIns = db.prepare("INSERT INTO deliveries VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
const wktIns = db.prepare("INSERT INTO wickets VALUES (?,?,?,?,?,?)");
const innTeams = new Map<string, [number, number]>();
const unknownKinds = new Map<string, number>();
let lastKey = "", seq = 0, lastOver = -1;
db.exec("BEGIN");
for (const r of balls) {
  const inn = Number(r.innings), over = Number(r.overid) - 1;
  const key = `${r.match_id}:${inn}`;
  if (key !== lastKey || over !== lastOver) { seq = 0; lastKey = key; lastOver = over; } else seq++;
  innTeams.set(key, [Number(r.batting_team_id), Number(r.bowling_team_id)]);
  const t = r.extras_type, rb = Number(r.runs) || 0, e2 = Number(r.extras_2_runs) || 0;
  const wide = t === "wide" ? 1 : 0;
  const nb = t === "Overstep" || t === "other" ? 1 : 0;
  const bye = t === "byes" ? 1 : 0, lb = t === "legbyes" ? 1 : 0, pen = t === "Penalty" ? 5 : 0;
  delIns.run(Number(r.match_id), inn, over, seq, Number(r.striker_id), Number(r.bowler_id), rb,
    rb + wide + nb + bye + lb + pen + e2, wide, nb, bye, lb, pen, r.bowling_type, r.pace_or_spin);
  if (r.is_wicket === "true") {
    const kind = KIND[r.dismissal_type];
    if (!kind) unknownKinds.set(r.dismissal_type, (unknownKinds.get(r.dismissal_type) ?? 0) + 1);
    wktIns.run(Number(r.match_id), inn, over, seq, kind ?? r.dismissal_type.toLowerCase(), r.dismissed_player_id ? Number(r.dismissed_player_id) : null);
  }
  playerIns.run(Number(r.striker_id), r.striker_name);
  playerIns.run(Number(r.bowler_id), r.bowler_name);
}
db.exec("COMMIT");

// Innings rows. Chase target: the official revised target for rain-affected chases; otherwise
// left null so the build uses the (imputed) first-innings total + 1.
const innIns = db.prepare("INSERT INTO innings VALUES (?,?,?,?,?,?,?)");
for (const [key, [bat, bowl]] of innTeams) {
  const [mid, inn] = key.split(":").map(Number);
  const m = meta.get(String(mid))!;
  let target: number | null = null, overs: number | null = null;
  if (inn === 2 && m.revised_target) {
    target = Number(m.revised_target);
    const b = Number(m.second_inn_revised_overs || 120);
    overs = Math.floor(b / 6) + (b % 6) / 10; // build parses 5.3 as 5 overs 3 balls
  }
  innIns.run(mid, inn, bat, bowl, inn > 2 ? 1 : 0, target, overs);
}

const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
console.log(`wrote ${outFile}`);
console.log(`matches ${count("SELECT count(*) n FROM matches")}, deliveries ${count("SELECT count(*) n FROM deliveries")}, wickets ${count("SELECT count(*) n FROM wickets")}, players ${count("SELECT count(*) n FROM players")}`);
console.log("by competition", JSON.stringify(db.prepare("SELECT c.code, count(*) n FROM matches m JOIN competitions c USING(competition_id) GROUP BY 1").all()));
if (unknownKinds.size) console.log("unmapped dismissal kinds", Object.fromEntries(unknownKinds));

// Reconcile with the pack's own results (rain-affected matches skipped). Wickets are fully
// recorded, so wicket margins must match exactly; run margins carry the extras imputation.
{
  const tot = new Map((db.prepare("SELECT match_id || ':' || innings_no k, sum(runs_total) r FROM deliveries WHERE innings_no <= 2 GROUP BY 1").all() as any[]).map(r => [r.k, r.r]));
  const wk = new Map((db.prepare("SELECT match_id || ':' || innings_no k, count(*) n FROM wickets GROUP BY 1").all() as any[]).map(r => [r.k, r.n]));
  let wOk = 0, wN = 0; const runDiff: number[] = []; const wBad: unknown[] = [];
  for (const m of matches) {
    if (m.first_inn_revised_overs || m.second_inn_revised_overs || m.revised_target) continue;
    const mw = /won\s+(?:by\s+)?(\d+)\s*(wicket|wkt)/i.exec(m.result), mr = /won\s+(?:by\s+)?(\d+)\s*run/i.exec(m.result);
    if (mw) { wN++; const left = 10 - (wk.get(m.match_id + ":2") ?? 0); if (left === Number(mw[1])) wOk++; else wBad.push({ match: m.match_id, result: m.result, wicketsLeftInData: left }); }
    if (mr) { const a = tot.get(m.match_id + ":1"), b = tot.get(m.match_id + ":2"); if (a != null && b != null) runDiff.push(a - b - Number(mr[1])); }
  }
  const report = {
    matches: matches.length, deliveries: balls.length,
    wicketMargins: { checked: wN, exact: wOk, mismatches: wBad },
    runMargins: { checked: runDiff.length, exact: runDiff.filter(x => x === 0).length, within3: runDiff.filter(x => Math.abs(x) <= 3).length,
      meanAbs: +(runDiff.reduce((s, x) => s + Math.abs(x), 0) / runDiff.length).toFixed(2) },
  };
  fs.writeFileSync(path.join(outDir, "ingest-report.json"), JSON.stringify(report, null, 2));
  console.log("reconciliation", JSON.stringify({ wicketMargins: `${wOk}/${wN}`, runMargins: report.runMargins }));
}
db.close();

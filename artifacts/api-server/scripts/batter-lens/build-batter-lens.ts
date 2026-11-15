// Batter Lens — static per-batter ball files + rankings for the player and stats pages.
//
//   node --import tsx scripts/batter-lens/build-batter-lens.ts
//   → artifacts/ipl-analytics/public/data/batter-lens/{index.json, rankings.json, <key>.json}
//
// Every IPL ball faced (warehouse sqlite.db, match state from ball-context.ts), joined to the
// commentary-derived labels (length, line, shot, scoring zone) where commentary described the ball.
// RAA (runs above average) per ball = (runs off bat − expected runs) − wicket cost × (out − P(out)),
// expectations by innings × over × wickets down, scaled to the season's scoring rate; wicket cost =
// fall in expected runs still to come (completed first innings, monotone table). No tracking data:
// there is no ball height, so no beehive, and speed is too sparse (2%) for speed bands.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getBallColumns, F_FACED, F_LEGAL, F_STRIKER_OUT } from "../../src/services/decision/ball-context";
import { getDecisionDb, getProjectRoot, queryAll } from "../../src/services/decision/db";
import { bowlerType } from "../../src/services/decision/match-model";
import { makeMonotone, remainingRuns } from "../../src/services/pressure/model";

const c = getBallColumns();
const db = getDecisionDb();
if (!db || !c.n) throw new Error("warehouse not available");

// Delivery ids in the same order as the column store (one row per delivery).
const ids = queryAll<{ id: number }>(`SELECT d.delivery_id id FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
  WHERE i.innings_number IN (1, 2) ORDER BY d.innings_id, d.delivery_id`).map(r => r.id);
if (ids.length !== c.n) throw new Error(`delivery order mismatch: ${ids.length} ids vs ${c.n} balls`);

// Vocabularies (display order) — commentary labels, merged where the source uses synonyms.
const LENGTHS = ["Bouncer", "Short", "Short of a length", "Good length", "Full", "Half-volley", "Yorker", "Full toss"];
const LENGTH_ALIAS: Record<string, string> = { "Length ball": "Good length" };
const LINES = ["Wide outside off", "Outside off", "On off stump", "On the stumps", "On leg stump", "Into the body", "Down leg"];
const SHOTS = ["Defend", "Leave", "Push", "Drive", "Loft", "Cut", "Slap / smash", "Pull", "Flick", "Work", "Tuck", "Glance", "Sweep", "Reverse sweep", "Scoop / ramp", "Dab / steer", "Guide", "Poke / prod", "Slog"];
// 45° sectors clockwise from straight down the ground, off side first.
const SECTORS = ["Straight (off)", "Cover", "Point", "Third man", "Fine leg", "Square leg", "Midwicket", "Straight (leg)"];
const ZONE_SECTOR: Record<string, number> = {
  "Straight": 0, "Long-off": 0, "Mid-off": 0, "Extra cover": 1, "Cover": 1, "Deep cover": 1, "Off side": 1,
  "Point": 2, "Deep point": 2, "Gully": 2, "Slip": 3, "Third man": 3, "Keeper": 3, "Fine leg": 4,
  "Behind square": 5, "Square leg": 5, "Deep square leg": 5, "Midwicket": 6, "Deep midwicket": 6, "Cow corner": 6,
  "Leg side": 6, "Mid-on": 7, "Long-on": 7,
};
const idxOf = (list: string[], v: string | null | undefined) => (v ? list.indexOf(v) : -1);

const commentary = new Map<number, { l: number; n: number; h: number; z: number }>();
for (const r of db.prepare("SELECT delivery_id id, length, line, shot, zone FROM delivery_commentary").iterate() as Iterable<any>) {
  commentary.set(r.id, {
    l: idxOf(LENGTHS, LENGTH_ALIAS[r.length] ?? r.length), n: idxOf(LINES, r.line), h: idxOf(SHOTS, r.shot),
    z: r.zone && r.zone in ZONE_SECTOR ? ZONE_SECTOR[r.zone] : -1,
  });
}

// ── Expected outcome per faced ball ─────────────────────────────────────────
const seasonRate = new Map<number, { r: number; b: number }>();
let poolR = 0, poolB = 0;
for (let i = 0; i < c.n; i++) {
  if (!(c.flags[i] & F_FACED)) continue;
  const e = seasonRate.get(c.season[i]) ?? seasonRate.set(c.season[i], { r: 0, b: 0 }).get(c.season[i])!;
  e.r += c.batterRuns[i]; e.b++; poolR += c.batterRuns[i]; poolB++;
}
const scaleOf = (s: number) => { const e = seasonRate.get(s)!; return e.r / e.b / (poolR / poolB); };
const cell = (i: number) => ((c.inningsNumber[i] - 1) * 20 + Math.min(19, c.over[i])) * 7 + Math.min(6, c.wicketsBefore[i]);
const cr = new Float64Array(280), co = new Float64Array(280), cn = new Float64Array(280);
for (let i = 0; i < c.n; i++) {
  if (!(c.flags[i] & F_FACED)) continue;
  const k = cell(i);
  cr[k] += c.batterRuns[i] / scaleOf(c.season[i]); co[k] += c.flags[i] & F_STRIKER_OUT ? 1 : 0; cn[k]++;
}
// Runs still to come from the start of an over (completed first innings), by overs left × wickets.
const finals = new Map<number, number>();
for (let i = 0; i < c.n; i++) if (c.inningsNumber[i] === 1) finals.set(c.innings[i], c.runsBefore[i] + c.totalRuns[i]);
const sum = Array.from({ length: 21 }, () => new Array(11).fill(0)), cnt = Array.from({ length: 21 }, () => new Array(11).fill(0));
const seen = new Set<string>();
for (let i = 0; i < c.n; i++) {
  if (c.inningsNumber[i] !== 1 || !(c.flags[i] & F_LEGAL) || c.legalBefore[i] % 6 !== 0) continue;
  const key = `${c.innings[i]}:${c.legalBefore[i]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const k = 20 - c.legalBefore[i] / 6, w = Math.min(10, c.wicketsBefore[i]);
  if (k < 1) continue;
  sum[k][w] += (finals.get(c.innings[i])! - c.runsBefore[i]) / scaleOf(c.season[i]); cnt[k][w]++;
}
const raw = sum.map((row, k) => row.map((s, w) => (k === 0 || w === 10 ? 0 : cnt[k][w] >= 20 ? s / cnt[k][w] : Infinity)));
for (let k = 1; k <= 20; k++) {
  if (!isFinite(raw[k][0])) raw[k][0] = raw[k].find(v => isFinite(v) && v > 0) ?? raw[k - 1][0] + 8;
  for (let w = 1; w <= 9; w++) {
    if (isFinite(raw[k][w])) continue;
    const prev = raw[k - 1];
    raw[k][w] = k > 1 && isFinite(prev[w]) && isFinite(prev[w - 1]) ? raw[k][w - 1] + (prev[w] - prev[w - 1]) : raw[k][w - 1];
  }
}
const table = makeMonotone(raw);
const raaOf = (i: number) => {
  const k = cell(i), s = scaleOf(c.season[i]);
  const bl = Math.max(1, 120 - c.legalBefore[i]), w = c.wicketsBefore[i];
  const cost = Math.max(0, remainingRuns(table, bl, w) - remainingRuns(table, bl, w + 1)) * s;
  return (c.batterRuns[i] - (cr[k] / cn[k]) * s) - cost * ((c.flags[i] & F_STRIKER_OUT ? 1 : 0) - co[k] / cn[k]);
};

// ── Per-batter ball records ────────────────────────────────────────────────
const names = new Map(queryAll<{ id: number; name: string }>("SELECT player_id id, name FROM players").map(r => [r.id, r.name]));
type Rec = { s: number[]; m: number[]; o: number[]; p: number[]; r: number[]; w: number[]; x: number[]; l: number[]; n: number[]; h: number[]; z: number[]; f: number[] };
const per = new Map<number, Rec>();
const entry = new Map<number, { s: number[]; e: number[]; m: number[] }>(); // per batter: innings entry ball
const faceCount = new Map<string, number>(); // innings:batter → balls faced so far
const arrived = new Set<string>();
const typeCache = new Map<number, number>();
const typeOf = (pid: number) => { let t = typeCache.get(pid); if (t === undefined) { const v = bowlerType(pid); t = v === null ? -1 : v; typeCache.set(pid, t); } return t; };
for (let i = 0; i < c.n; i++) {
  for (const pid of [c.batter[i], c.nonStriker[i]]) {
    const key = `${c.innings[i]}:${pid}`;
    if (arrived.has(key)) continue;
    arrived.add(key);
    const e = entry.get(pid) ?? entry.set(pid, { s: [], e: [], m: [] }).get(pid)!;
    e.s.push(c.season[i]); e.e.push(c.legalBefore[i]); e.m.push(c.match[i]);
  }
  if (!(c.flags[i] & F_FACED)) continue;
  const key = `${c.innings[i]}:${c.batter[i]}`;
  const nth = (faceCount.get(key) ?? 0) + 1;
  faceCount.set(key, nth);
  const rec = per.get(c.batter[i]) ?? per.set(c.batter[i], { s: [], m: [], o: [], p: [], r: [], w: [], x: [], l: [], n: [], h: [], z: [], f: [] }).get(c.batter[i])!;
  const lab = commentary.get(ids[i]);
  rec.s.push(c.season[i]); rec.m.push(c.match[i]); rec.o.push(c.over[i]); rec.p.push(typeOf(c.bowler[i]));
  rec.r.push(c.batterRuns[i]); rec.w.push(c.flags[i] & F_STRIKER_OUT ? 1 : 0); rec.x.push(Math.round(raaOf(i) * 100));
  rec.l.push(lab?.l ?? -1); rec.n.push(lab?.n ?? -1); rec.h.push(lab?.h ?? -1); rec.z.push(lab?.z ?? -1); rec.f.push(nth);
}

const outDir = path.join(getProjectRoot(), "artifacts", "ipl-analytics", "public", "data", "batter-lens");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const keyOf = (name: string) => crypto.createHash("sha256").update(name).digest("hex").slice(0, 16);
const index: Record<string, { file: string; balls: number; labelled: number }> = {};
// Rankings: per batter × season × pace/spin/unknown × phase → [balls, runs, outs, raa×100, dots, boundaries]
const rankRows: number[][] = [];
const rankNames: string[] = [];
for (const [pid, rec] of per) {
  const name = names.get(pid);
  if (!name || rec.s.length < 1) continue;
  const file = keyOf(name) + ".json";
  const e = entry.get(pid)!;
  fs.writeFileSync(path.join(outDir, file), JSON.stringify({ name, balls: rec, entries: e }));
  index[name] = { file, balls: rec.s.length, labelled: rec.l.filter(v => v >= 0).length };
  const agg = new Map<string, number[]>();
  for (let j = 0; j < rec.s.length; j++) {
    const ph = rec.o[j] < 6 ? 0 : rec.o[j] < 15 ? 1 : 2;
    const k = `${rec.s[j]}:${rec.p[j] + 1}:${ph}`;
    const a = agg.get(k) ?? agg.set(k, [0, 0, 0, 0, 0, 0]).get(k)!;
    a[0]++; a[1] += rec.r[j]; a[2] += rec.w[j]; a[3] += rec.x[j]; a[4] += rec.r[j] === 0 ? 1 : 0; a[5] += rec.r[j] === 4 || rec.r[j] === 6 ? 1 : 0;
  }
  const ni = rankNames.push(name) - 1;
  for (const [k, a] of agg) { const [s, p, ph] = k.split(":").map(Number); rankRows.push([ni, s, p, ph, ...a]); }
}
const meta = {
  source: "CricField IPL warehouse (Cricsheet ball-by-ball) + commentary-derived labels",
  builtAt: new Date().toISOString(),
  lengths: LENGTHS, lines: LINES, shots: SHOTS, sectors: SECTORS,
  fields: { s: "season", m: "match index", o: "over (0-based)", p: "bowler type: 0 pace, 1 spin, -1 unknown", r: "runs off bat", w: "dismissed", x: "RAA ×100", l: "length index", n: "line index", h: "shot index", z: "sector index", f: "nth ball faced in the innings" },
  raa: "Runs above average per ball: (runs − expected) − wicket cost × (out − expected dismissal chance), by innings × over × wickets down, season-scaled.",
};
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({ ...meta, players: index }));
fs.writeFileSync(path.join(outDir, "rankings.json"), JSON.stringify({ ...meta, columns: ["player", "season", "type(0 unknown,1 pace,2 spin)", "phase", "balls", "runs", "outs", "raa100", "dots", "boundaries"], names: rankNames, rows: rankRows }));
const totalBalls = Object.values(index).reduce((s, v) => s + v.balls, 0);
const labelled = Object.values(index).reduce((s, v) => s + v.labelled, 0);
console.log(`batters ${Object.keys(index).length}, balls ${totalBalls}, length-labelled ${labelled} (${Math.round((labelled / totalBalls) * 100)}%), rank rows ${rankRows.length}`);
// Sanity: league RAA per ball should be ~0 by construction.
let sx = 0, sb = 0; for (const rec of per.values()) { sb += rec.x.length; sx += rec.x.reduce((a, b) => a + b, 0); }
console.log(`league mean RAA per ball ${(sx / sb / 100).toFixed(4)}`);

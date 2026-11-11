// Article engine core. A slot template receives an `A` (article builder) bound to one franchise.
// `a.m(...)` computes-and-records a metric and returns its {{ev:id}} token, so prose can only contain
// numbers that were recorded in the evidence file with their query, filters, sample and check.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOWLER_RUNS, Evidence, LEGAL, REGULATION, ROOT, YEAR, binomialP, dp, fmt, pearson, wilson, type SquadPlayer } from "../evidence/lib";
import type { Ctx } from "./context";

export { BOWLER_RUNS, LEGAL, REGULATION, YEAR, binomialP, dp, fmt, wilson, pearson as pearsonOf };
export const WAREHOUSE = "CricField warehouse: Cricsheet IPL ball-by-ball data, 2008–2026";

export type Check = { method: string; passed: boolean; detail?: string };
export const floor = (n: number, min: number, unit = "rows"): Check => ({ method: `sample-size floor ≥ ${min} ${unit}`, passed: n >= min, detail: `n = ${n}` });
export const range = (x: number, lo: number, hi: number, what: string): Check => ({ method: `plausibility range ${lo}–${hi} for ${what}`, passed: Number.isFinite(x) && x >= lo && x <= hi, detail: `value ${x}` });
export const derived = (what = "arithmetic on validated metrics"): Check => ({ method: what, passed: true });
export const external = (detail: string): Check => ({ method: "transcribed from a primary published source and re-read against it", passed: true, detail });

export interface MOpts {
  unit?: string;
  filters: string;
  n: number;
  nUnit: string;
  sql: string;
  check: Check;
  dataset?: string;
}

export interface ChartSpec {
  id: string;
  type: "bar" | "column" | "line" | "stacked-bar" | "scatter";
  title: string;
  subtitle?: string;
  table: string;
  xKey: string;
  series: { key: string; label: string }[];
  xLabel?: string;
  unit: string;
  takeaway: string;
  ariaLabel: string;
  referenceLine?: { metric: string; label: string };
}

export interface Section {
  heading: string;
  body: string[];
  chartIds?: string[];
}
export interface Hypothesis {
  id: string;
  statement: string;
  whyUnverified: string;
  howToTest: string;
}
export interface SourceRef {
  id: string;
  kind: "cricfield-dataset" | "external-report" | "official" | "academic" | "news";
  title: string;
  publisher: string;
  url?: string;
  published?: string;
  accessed?: string;
  note?: string;
}

/** What a slot template returns; the runner adds ids, plan fields, dates and status. */
export interface Draft {
  dek: string;
  excerpt: string;
  keyTakeaways: string[];
  sections: [Section, Section, Section, Section, Section];
  charts: ChartSpec[];
  hypotheses: Hypothesis[];
  sources?: SourceRef[];
  players: string[];
  seasons: string[];
  teams?: string[];
  hero: { narrative: string; wanted: string; query: string };
  related: number[];
  seo: { metaTitle: string; metaDescription: string };
  methodology: string;
  literalNumbers?: { text: string; reason: string }[];
  storyType?: "investigation" | "player-story" | "tactical" | "archive" | "explainer";
}

export type Row = Record<string, number | string | null>;

export class A {
  constructor(
    readonly ev: Evidence,
    readonly c: Ctx,
  ) {}
  get T() {
    return this.c.idsSql;
  }
  get name() {
    return this.c.name;
  }
  get code() {
    return this.c.code;
  }
  /** Possessive franchise name ("Chennai Super Kings'"), for prose. */
  get poss() {
    return /s$/.test(this.c.name) ? `${this.c.name}'` : `${this.c.name}'s`;
  }
  rows<T = Row>(sql: string, ...p: (string | number)[]) {
    return this.ev.rows<T>(sql, ...p);
  }
  one<T = Row>(sql: string, ...p: (string | number)[]) {
    return this.ev.one<T>(sql, ...p);
  }

  /** Record a metric and return its token. */
  m(id: string, value: number | string, display: string, label: string, o: MOpts): string {
    if (!this.ev.metrics[id])
      this.ev.metric(id, { value: typeof value === "number" ? dp(value, 3) : value, display, label, unit: o.unit, dataset: o.dataset ?? WAREHOUSE, filters: o.filters, n: Math.max(0, Math.round(o.n)), nUnit: o.nUnit, query: o.sql, validate: o.check });
    return `{{ev:${id}}}`;
  }
  pct(id: string, x: number, label: string, o: Omit<MOpts, "unit">, digits = 1) {
    return this.m(id, dp(x, digits), `${fmt(x, digits)}%`, label, { ...o, unit: "%" });
  }
  num(id: string, x: number, label: string, o: MOpts, digits = 1) {
    return this.m(id, dp(x, digits), digits === 0 ? Math.round(x).toLocaleString("en-IN") : fmt(x, digits), label, o);
  }
  int(id: string, x: number, label: string, o: MOpts) {
    return this.m(id, Math.round(x), Math.round(x).toLocaleString("en-IN"), label, o);
  }
  text(id: string, s: string, label: string, o: MOpts) {
    return this.m(id, s, s, label, o);
  }
  table(id: string, label: string, filters: string, n: number, nUnit: string, sql: string, rows: Row[], dataset = WAREHOUSE) {
    this.ev.table(id, { label, dataset, filters, n: Math.max(0, Math.round(n)), nUnit, query: sql, rows });
    return id;
  }

  // ── Shared SQL fragments ─────────────────────────────────────────────────
  get playsIn() {
    return `(m.team1_id IN ${this.T} OR m.team2_id IN ${this.T})`;
  }
  get won() {
    return `m.winner_id IN ${this.T}`;
  }
  /** Matches with a result involving the franchise, optional year range. */
  results(from = 2008, to = 2026) {
    const sql = `SELECT COUNT(*) n, SUM(CASE WHEN ${this.won} THEN 1 ELSE 0 END) won FROM matches m WHERE ${this.playsIn} AND m.winner_id IS NOT NULL AND ${YEAR()} BETWEEN ${from} AND ${to}`;
    const r = this.one<{ n: number; won: number }>(sql);
    return { ...r, pct: r.n ? (r.won / r.n) * 100 : NaN, sql };
  }

  /** Run rate (all runs, batting) or economy (bowler runs, bowling) for an over range. team: this franchise, league (all), or rest (all but this). */
  rate(side: "bat" | "bowl", o1: number, o2: number, from: number, to: number, who: "team" | "league" | "rest") {
    const col = side === "bat" ? "i.batting_team_id" : "i.bowling_team_id";
    const runs = side === "bat" ? "d.total_runs" : BOWLER_RUNS;
    const f = who === "team" ? `AND ${col} IN ${this.T}` : who === "rest" ? `AND ${col} NOT IN ${this.T}` : "";
    const sql = `SELECT SUM(${runs}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id WHERE ${REGULATION} AND d.over_num BETWEEN ${o1} AND ${o2} AND ${YEAR()} BETWEEN ${from} AND ${to} ${f}`;
    const r = this.one<{ runs: number | null; balls: number | null }>(sql);
    return { v: r.balls ? ((r.runs ?? 0) * 6) / r.balls : NaN, balls: r.balls ?? 0, sql };
  }

  /** Per-season rate series for the franchise and the league. */
  rateSeries(side: "bat" | "bowl", o1: number, o2: number) {
    const col = side === "bat" ? "i.batting_team_id" : "i.bowling_team_id";
    const runs = side === "bat" ? "d.total_runs" : BOWLER_RUNS;
    const sql = `SELECT ${YEAR()} year,
      SUM(CASE WHEN ${col} IN ${this.T} THEN ${runs} END) * 6.0 / SUM(CASE WHEN ${col} IN ${this.T} AND ${LEGAL} THEN 1 END) team,
      SUM(${runs}) * 6.0 / SUM(CASE WHEN ${LEGAL} THEN 1 END) league,
      SUM(CASE WHEN ${col} IN ${this.T} AND ${LEGAL} THEN 1 ELSE 0 END) balls
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
      WHERE ${REGULATION} AND d.over_num BETWEEN ${o1} AND ${o2} GROUP BY year HAVING balls > 0 ORDER BY year`;
    const rows = this.rows<{ year: number; team: number; league: number; balls: number }>(sql);
    return { rows, sql };
  }

  /** Squad list for a season (CricField squads-by-season.json). */
  squad(year: number): SquadPlayer[] {
    const squads = SQUADS();
    const season = squads[String(year)] ?? {};
    const key = Object.keys(season).find((k) => TEAM_NAME_MATCH[this.code]?.test(k));
    return key ? season[key] : [];
  }
}

// Squad team-name matching (squads use franchise names of the time).
const TEAM_NAME_MATCH: Record<string, RegExp> = {
  CSK: /Chennai Super Kings/,
  MI: /Mumbai Indians/,
  RCB: /Royal Challengers/,
  KKR: /Kolkata Knight Riders/,
  SRH: /Sunrisers Hyderabad/,
  RR: /Rajasthan Royals/,
  DC: /Delhi (Capitals|Daredevils)/,
  PBKS: /(Punjab Kings|Kings XI Punjab)/,
  GT: /Gujarat Titans/,
  LSG: /Lucknow Super Giants/,
};

let squadsCache: Record<string, Record<string, SquadPlayer[]>> | null = null;
export function SQUADS() {
  squadsCache ??= JSON.parse(readFileSync(resolve(ROOT, "artifacts/api-server/data/squads-by-season.json"), "utf8"));
  return squadsCache!;
}

// ── Player attributes (player-bio.json via squads crosswalk: Cricsheet name → bio) ──────────────────
type Bio = { batStyle?: string; bowlStyle?: string; birthDate?: string; country?: string };
let bioCache: Map<string, Bio> | null = null;
export function bioByCricsheet(): Map<string, Bio> {
  if (bioCache) return bioCache;
  const bio = JSON.parse(readFileSync(resolve(ROOT, "artifacts/api-server/data/player-bio.json"), "utf8")) as Record<string, Bio>;
  const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  bioCache = new Map();
  for (const y of Object.values(SQUADS())) for (const t of Object.values(y)) for (const p of t) if (p.cricsheetName && bio[slug(p.name)]) bioCache.set(p.cricsheetName, bio[slug(p.name)]);
  return bioCache;
}
export function bowlType(style?: string): "pace" | "spin" | null {
  if (!style || style === "undefined") return null;
  const spin = /offbreak|legbreak|orthodox|wrist|googly/i.test(style);
  const pace = /fast|medium/i.test(style);
  return spin && !pace ? "spin" : pace && !spin ? "pace" : null;
}
export function batHand(style?: string): "left" | "right" | null {
  return !style ? null : /left/i.test(style) ? "left" : /right/i.test(style) ? "right" : null;
}

/** Display a franchise code as its current name. */
export const FR_NAME: Record<string, string> = {
  CSK: "Chennai Super Kings",
  MI: "Mumbai Indians",
  RCB: "Royal Challengers Bengaluru",
  KKR: "Kolkata Knight Riders",
  SRH: "Sunrisers Hyderabad",
  RR: "Rajasthan Royals",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  GT: "Gujarat Titans",
  LSG: "Lucknow Super Giants",
};

/** Comparison words for prose (no numbers involved). */
export const cmp = (a: number, b: number, more = "above", less = "below", same = "level with") => (Math.abs(a - b) < 1e-9 ? same : a > b ? more : less);
export const ord = (n: number) => ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"][n - 1] ?? `${n}th`;
export const yearsLabel = (from: number, to: number) => (from === to ? String(from) : `${from}–${to}`);

/** Squad list for any franchise and season. */
export function squadOf(code: string, year: number): SquadPlayer[] {
  const season = SQUADS()[String(year)] ?? {};
  const key = Object.keys(season).find((k) => TEAM_NAME_MATCH[code]?.test(k));
  return key ? season[key] : [];
}
/** Nationality: player-bio first (more reliable), squad list as fallback. */
export function isOverseas(p: SquadPlayer): boolean | null {
  const c = bioByCricsheet().get(p.cricsheetName)?.country || p.country;
  return c ? c !== "India" : null;
}
export type { SquadPlayer };

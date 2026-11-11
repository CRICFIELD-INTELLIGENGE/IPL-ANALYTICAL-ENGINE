// Decision Intelligence OS — shared data access.
//
// Every decision module reads the same SQLite warehouse (`sqlite.db` at the
// monorepo root, ~295k ball-by-ball deliveries). This file owns the
// read-only connection, project-root discovery and season normalisation so
// the modules themselves only contain SQL + maths.

import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

let projectRoot: string | null = null;

/** Walk up from cwd until we find the warehouse (the folder holding sqlite.db + ipl_csv). */
export function getProjectRoot(): string {
  if (projectRoot) return projectRoot;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "sqlite.db")) && fs.existsSync(path.join(dir, "ipl_csv"))) {
      projectRoot = dir;
      return dir;
    }
    dir = path.dirname(dir);
  }
  projectRoot = process.cwd();
  return projectRoot;
}

/**
 * The IPL warehouse file. CRICFIELD_DB_PATH (also honoured by @workspace/db) points the whole API at a copy,
 * e.g. to verify a corrected database in isolation; unset, it is <project root>/sqlite.db as before.
 */
export function warehousePath(): string {
  return process.env.CRICFIELD_DB_PATH ? path.resolve(process.env.CRICFIELD_DB_PATH) : path.join(getProjectRoot(), "sqlite.db");
}

let db: DatabaseSync | null = null;
let dbError: string | null = null;

/** Lazily opened read-only connection. Returns null when the warehouse is missing. */
export function getDecisionDb(): DatabaseSync | null {
  if (db || dbError) return db;
  const fp = warehousePath();
  if (!fs.existsSync(fp)) {
    dbError = `sqlite.db not found at ${fp}`;
    return null;
  }
  try {
    db = new DatabaseSync(fp, { readOnly: true });
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
    db = null;
  }
  return db;
}

export function getDecisionDbError(): string | null {
  return dbError;
}

/** Typed `stmt.all()` helper. */
export function queryAll<T>(sql: string, ...params: (string | number | null)[]): T[] {
  const conn = getDecisionDb();
  if (!conn) return [];
  return conn.prepare(sql).all(...params) as unknown as T[];
}

// Cricsheet labels split seasons by calendar span; the IPL calls them by year.
const SEASON_ALIASES: Record<string, string> = {
  "2007/08": "2008",
  "2009/10": "2010",
  "2020/21": "2020",
};

export function normalizeSeason(raw: string): string {
  return SEASON_ALIASES[raw] ?? raw;
}

/** Inverse of normalizeSeason — the label stored in matches.season_id. */
export function seasonToDbLabel(year: string): string {
  const hit = Object.entries(SEASON_ALIASES).find(([, y]) => y === year);
  return hit ? hit[0] : year;
}

/**
 * Runs charged to the bowler for delivery `d`: off the bat, plus wides, plus no-ball extras. Byes, leg-byes and
 * penalty runs are not charged.
 *
 * The warehouse stores one extra_runs total per delivery; the components come from is_bye / is_legbye /
 * is_penalty, populated from the Cricsheet source by the Day 4.5 correction (745 / 4,406 / 2 deliveries). A
 * penalty is always 5 runs; a no-ball with byes or leg-byes carries a 1-run no-ball extra (every such IPL
 * delivery, all after the 2017 Laws); before 2017, runs off a no-ball were scored as no-ball extras and are
 * charged. Equals the Cricsheet recount (batter + wides + no-balls) on all 295,732 IPL deliveries
 * (scripts/src/step3/tests/warehouse-reconcile.test.ts). The same expression is used by
 * scripts/src/compute_analytics.ts and inline in services/stats-aggregator.ts.
 *
 * Requires the populated flags: on a warehouse without them (all 0) it would charge byes run off a no-ball.
 */
export const RUNS_CONCEDED_SQL =
  "(d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END)";

/** Alias kept for references written before the switch. */
export const RUNS_CONCEDED_EXACT_SQL = RUNS_CONCEDED_SQL;

/** Minimal RFC-4180 CSV parser (quoted fields, embedded commas/newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

/** Read a text file that may be UTF-8 or Windows-1252. */
export function readTextLoose(fp: string): string | null {
  if (!fs.existsSync(fp)) return null;
  const buf = fs.readFileSync(fp);
  const utf8 = buf.toString("utf8");
  return utf8.includes("�") ? buf.toString("latin1") : utf8;
}

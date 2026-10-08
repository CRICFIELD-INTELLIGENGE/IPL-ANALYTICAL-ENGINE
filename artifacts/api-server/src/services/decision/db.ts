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

let db: DatabaseSync | null = null;
let dbError: string | null = null;

/** Lazily opened read-only connection. Returns null when the warehouse is missing. */
export function getDecisionDb(): DatabaseSync | null {
  if (db || dbError) return db;
  const fp = path.join(getProjectRoot(), "sqlite.db");
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

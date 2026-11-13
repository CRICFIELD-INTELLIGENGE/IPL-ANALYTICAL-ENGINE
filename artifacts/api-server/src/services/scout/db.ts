// Scout Lab — Global database connection & discovery.
//
// Accesses global.db (the multi-league warehouse: IPL, SMAT, BBL, SA20, CPL, ILT20)
// strictly in read-only mode.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let projectRoot: string | null = null;

export function getProjectRoot(): string {
  if (projectRoot) return projectRoot;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "lib", "cricket-data", "global", "warehouse", "global.db"))) {
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

export function getGlobalDb(): DatabaseSync | null {
  if (db || dbError) return db;
  const configuredPath = process.env.CRICFIELD_SCOUT_DB_PATH?.trim();
  const fp = configuredPath
    ? path.resolve(configuredPath)
    : path.join(getProjectRoot(), "lib", "cricket-data", "global", "warehouse", "global.db");
  if (!fs.existsSync(fp)) {
    dbError = `global.db not found at ${fp}`;
    return null;
  }
  try {
    db = new DatabaseSync(fp, { readOnly: true });
    db.exec("PRAGMA query_only = ON; PRAGMA temp_store = MEMORY;");
    db.prepare("SELECT player_key FROM players LIMIT 1").get();
    db.prepare("SELECT competition_id FROM competitions LIMIT 1").get();
  } catch (err) {
    db?.close();
    dbError = err instanceof Error ? err.message : String(err);
    db = null;
  }
  return db;
}

export function isGlobalDbReady(): boolean {
  return getGlobalDb() !== null;
}

export function getGlobalDbError(): string | null {
  return dbError;
}

export function queryAll<T>(sql: string, ...params: (string | number | null)[]): T[] {
  const conn = getGlobalDb();
  if (!conn) return [];
  return conn.prepare(sql).all(...params) as unknown as T[];
}

export function queryOne<T>(sql: string, ...params: (string | number | null)[]): T | undefined {
  const conn = getGlobalDb();
  if (!conn) return undefined;
  return conn.prepare(sql).get(...params) as unknown as T | undefined;
}

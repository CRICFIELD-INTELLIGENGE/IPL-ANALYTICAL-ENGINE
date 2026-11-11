// Global data engine — global.db connection and schema.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { WAREHOUSE_PATH, ensureDir } from "./paths";

export const SCHEMA_VERSION = "1";
const SCHEMA_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");

/** Opens (creating if needed) a global warehouse and applies the schema. ':memory:' works for tests. */
export function openGlobalDb(file = WAREHOUSE_PATH): DatabaseSync {
  if (file !== ":memory:") ensureDir(path.dirname(file));
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = OFF; PRAGMA temp_store = MEMORY;");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | undefined;
  if (!row) db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?)").run(SCHEMA_VERSION);
  else if (row.value !== SCHEMA_VERSION) {
    throw new Error(`global.db schema is version ${row.value}, code expects ${SCHEMA_VERSION}. global.db is rebuildable: delete it and run global:build.`);
  }
  return db;
}

export function setMeta(db: DatabaseSync, key: string, value: string): void {
  db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function all<T>(db: DatabaseSync, sql: string, ...params: (string | number | null)[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}

export function one<T>(db: DatabaseSync, sql: string, ...params: (string | number | null)[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined;
}

/** Runs fn inside a transaction, rolling back on error. */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

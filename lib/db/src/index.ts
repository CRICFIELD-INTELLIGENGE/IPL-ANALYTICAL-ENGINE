import { drizzle } from "drizzle-orm/sqlite-proxy";
import { DatabaseSync } from "node:sqlite";
import * as schema from "./schema";
import path from "path";

import { fileURLToPath } from "node:url";

// Path to SQLite database file resolved relative to this module in the monorepo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRODUCTION_DB = path.resolve(__dirname, "..", "..", "..", "sqlite.db");
// CRICFIELD_DB_PATH points offline scripts (e.g. compute_analytics) at a database copy. Unset, every
// caller uses the production warehouse exactly as before.
const dbPath = process.env.CRICFIELD_DB_PATH ? path.resolve(process.env.CRICFIELD_DB_PATH) : PRODUCTION_DB;
export const isProductionDb = () => dbPath === PRODUCTION_DB;

let sqliteClient: DatabaseSync | null = null;
let dbInstance: any = null;

export const hasDb = () => true;

// Mock Pool proxy to prevent compile breakage in case some other module references it
export const pool = new Proxy({} as any, {
  get(target, prop) {
    throw new Error("PostgreSQL Pool is disabled. Using SQLite database client instead.");
  }
});

export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!sqliteClient) {
      // CRICFIELD_DB_READONLY=1 (the deployed API, which only reads): open read-only and do not switch the
      // journal mode, so serving never writes the warehouse or creates -wal/-shm files (works on a read-only or
      // shared filesystem). Unset, behaviour is unchanged (offline scripts such as compute_analytics write).
      const readOnly = process.env.CRICFIELD_DB_READONLY === "1";
      sqliteClient = new DatabaseSync(dbPath, { readOnly });
      // Enable foreign key constraints in SQLite
      sqliteClient.exec("PRAGMA foreign_keys = ON");
      if (!readOnly) sqliteClient.exec("PRAGMA journal_mode = WAL");
      sqliteClient.exec("PRAGMA busy_timeout = 5000");
    }
    if (!dbInstance) {
      dbInstance = drizzle(async (sql, params, method) => {
        try {
          const stmt = sqliteClient!.prepare(sql);
          if (method === "run") {
            stmt.run(...params);
            return { rows: [] };
          } else if (method === "get") {
            const row = stmt.get(...params) as any;
            return { rows: row ? Object.values(row) : [] };
          } else if (method === "values") {
            const rows = stmt.all(...params) as any[];
            const values = rows.map((r) => Object.values(r));
            return { rows: values };
          } else {
            const rows = stmt.all(...params) as any[];
            const values = rows.map((r) => Object.values(r));
            return { rows: values };
          }
        } catch (err) {
          console.error("Database Error:", err, "SQL:", sql, "params:", params);
          throw err;
        }
      }, { schema });
    }
    if (prop === "execute") {
      return async (sqlObj: any) => {
        const query = dbInstance.dialect.sqlToQuery(sqlObj);
        const { sql: querySql, params } = query;
        try {
          const stmt = sqliteClient!.prepare(querySql);
          const isSelect = /^\s*select|with/i.test(querySql);
          if (isSelect) {
            const rows = stmt.all(...params) as any[];
            return { rows };
          } else {
            stmt.run(...params);
            return { rows: [] };
          }
        } catch (err) {
          console.error("Database Proxy Error in execute:", err, "SQL:", querySql, "params:", params);
          throw err;
        }
      };
    }
    return dbInstance[prop];
  }
});

export * from "./schema";

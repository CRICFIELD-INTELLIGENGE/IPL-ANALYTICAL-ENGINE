import { drizzle } from "drizzle-orm/sqlite-proxy";
import { DatabaseSync } from "node:sqlite";
import * as schema from "./schema";
import path from "path";

import { fileURLToPath } from "node:url";

// Path to SQLite database file resolved relative to this module in the monorepo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "..", "..", "..", "sqlite.db");

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
      sqliteClient = new DatabaseSync(dbPath);
      // Enable foreign key constraints in SQLite
      sqliteClient.exec("PRAGMA foreign_keys = ON");
      sqliteClient.exec("PRAGMA journal_mode = WAL");
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

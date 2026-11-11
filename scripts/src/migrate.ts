import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const DB_PATH = path.resolve(REPO, "sqlite.db");
const SQL_PATH = path.resolve(REPO, "lib", "db", "drizzle", "0000_open_bloodstorm.sql");

async function main() {
  console.log("=== STARTING DATABASE SCHEMA MIGRATION ===");

  if (fs.existsSync(DB_PATH)) {
    console.log(`Deleting existing SQLite database file at: ${DB_PATH}`);
    try {
      fs.unlinkSync(DB_PATH);
    } catch (err) {
      console.warn("Could not delete existing sqlite.db:", err);
    }
  }

  console.log(`Creating fresh SQLite database at: ${DB_PATH}`);
  const db = new DatabaseSync(DB_PATH);

  if (!fs.existsSync(SQL_PATH)) {
    console.error(`Migration SQL file not found at: ${SQL_PATH}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(SQL_PATH, "utf-8");
  // Split by statement breakpoints used by Drizzle
  const statements = sqlContent
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      db.exec(stmt);
    } catch (err) {
      console.error(`Error executing statement #${i + 1}:`, err);
      console.error("Statement was:", stmt);
      process.exit(1);
    }
  }

  console.log("=== DATABASE SCHEMA MIGRATION COMPLETE ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

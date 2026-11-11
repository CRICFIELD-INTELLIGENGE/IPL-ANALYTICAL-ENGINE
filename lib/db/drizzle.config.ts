import path from "node:path";
import { defineConfig } from "drizzle-kit";

// drizzle-kit push makes the database match ./src/schema. That schema does not declare delivery_commentary,
// player_matchups or insight_clicks, so pushing to the production warehouse would DROP them (DAY-05-REPORT.md).
// Point it at a copy with CRICFIELD_DB_PATH; the production file needs an explicit, reviewed opt-in.
const production = path.resolve(import.meta.dirname, "../../sqlite.db");
const target = process.env.CRICFIELD_DB_PATH ? path.resolve(process.env.CRICFIELD_DB_PATH) : production;
if (target === production && process.env.DRIZZLE_ALLOW_PRODUCTION !== "1") {
  throw new Error(
    "drizzle-kit refuses the production sqlite.db: set CRICFIELD_DB_PATH to a copy " +
      "(or DRIZZLE_ALLOW_PRODUCTION=1 after reviewing the schema diff; a push would drop tables the schema omits).",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: target,
  },
});

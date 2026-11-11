import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const q = sql`SELECT ${123} as val, ${"world"} as txt`;
    const res = await db.execute(q);
    console.log("db.execute result:", res);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

main();

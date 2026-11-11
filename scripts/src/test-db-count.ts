import { db, matchesTable } from "@workspace/db";

async function main() {
  try {
    const matches = await db.select().from(matchesTable).limit(5);
    console.log("Matches first row:", matches[0]);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

main();

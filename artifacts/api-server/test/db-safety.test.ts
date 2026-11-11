// Day 5 — tests and the deployed API cannot modify the production warehouse.
//
//   pnpm --filter @workspace/api-server test   (preloads test/test-readonly-env.mjs)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");

test("the test run opens the warehouse read-only", () => {
  assert.equal(process.env.CRICFIELD_DB_READONLY, "1", "run tests through the package script, which preloads test-readonly-env.mjs");
});

test("a write through @workspace/db is refused in read-only mode", async () => {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  await assert.rejects(() => db.run(sql`CREATE TABLE day5_write_probe (x INTEGER)`)); // SQLite: attempt to write a readonly database
  const { DatabaseSync } = await import("node:sqlite");
  const check = new DatabaseSync(path.join(REPO, "sqlite.db"), { readOnly: true });
  const probe = check.prepare("SELECT name FROM sqlite_master WHERE name = 'day5_write_probe'").get();
  check.close();
  assert.equal(probe, undefined, "the probe table must not exist in the warehouse");
});

test("no automatic schema push against the warehouse", () => {
  const hook = fs.readFileSync(path.join(REPO, "scripts", "post-merge.sh"), "utf8");
  const active = hook.split("\n").filter((l) => !l.trim().startsWith("#"));
  assert.ok(!active.some((l) => /\bdb\s+push\b|drizzle-kit\s+push/.test(l)), "post-merge.sh must not run drizzle-kit push");
  const cfg = fs.readFileSync(path.join(REPO, "lib", "db", "drizzle.config.ts"), "utf8");
  assert.match(cfg, /DRIZZLE_ALLOW_PRODUCTION/, "drizzle.config.ts must refuse the production file by default");
});

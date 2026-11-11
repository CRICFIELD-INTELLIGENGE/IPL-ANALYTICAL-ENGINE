// Day 6D — no script can silently overwrite the corrected warehouse.
//
//   pnpm --filter @workspace/api-server test
//
// Static check: every scripts/src/*.ts that writes SQL to a sqlite database refuses the production sqlite.db
// (warehouse-guard.ts, or the equivalent --allow-production guard in compute_analytics / update-ipl-data-v3).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "scripts", "src");
const WRITES = /\b(INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|CREATE\s+TABLE|UPDATE\s+\w+\s+SET)\b|\.insert\(|\.delete\(|\.update\(/i;
const OPENS_DB = /@workspace\/db|new DatabaseSync\(|better-sqlite3/;

test("every warehouse-writing script refuses the production sqlite.db", () => {
  const unguarded: string[] = [];
  for (const f of fs.readdirSync(SCRIPTS).filter((x) => x.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join(SCRIPTS, f), "utf8");
    if (!WRITES.test(src) || !OPENS_DB.test(src)) continue;
    if (!/guardWarehouseWrite\(|--allow-production/.test(src)) unguarded.push(f);
  }
  assert.deepEqual(unguarded, []);
});

test("the legacy update-ipl-data.ts (pre-2017 dismissal rules) is disabled before it opens the database", () => {
  const src = fs.readFileSync(path.join(SCRIPTS, "update-ipl-data.ts"), "utf8");
  const guard = src.indexOf("deprecated:");
  const open = src.indexOf("new DatabaseSync(");
  assert.ok(guard > 0 && open > guard, "deprecation guard must run before new DatabaseSync()");
});

test("update-ipl-data-v3.ts never writes random values (handbook D4: random delivery_type / scoring_area)", () => {
  const src = fs.readFileSync(path.join(SCRIPTS, "update-ipl-data-v3.ts"), "utf8").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(src, /Math\.random\s*\(/);
});

test("the web app allows pinch-zoom (handbook S12 / UI P0: no maximum-scale in the viewport meta)", () => {
  const html = fs.readFileSync(path.join(SCRIPTS, "..", "..", "artifacts", "ipl-analytics", "index.html"), "utf8");
  const vp = html.match(/<meta[^>]+name="viewport"[^>]*>/)?.[0] ?? "";
  assert.ok(vp, "viewport meta present");
  assert.doesNotMatch(vp, /maximum-scale|user-scalable\s*=\s*no/);
});

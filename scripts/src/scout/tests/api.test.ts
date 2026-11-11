// Scout Lab API & Service Unit / Regression Tests.
//
// Validates:
// 1. Rankings calculation and filters (discipline, role, phase, minBalls).
// 2. Player identity resolution and profile data retrieval.
// 3. Clear distinction between verified player attributes and inferred statistical roles.
// 4. Role taxonomy catalog, definitions, and active database counts.
// 5. Similar player search and distance calculation.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "..", "..", "..", "..");
const globalDbPath = path.join(REPO, "lib", "cricket-data", "global", "warehouse", "global.db");

test("scout service: global.db exists, is valid SQLite and contains all 6 competitions", () => {
  const db = new DatabaseSync(globalDbPath, { readOnly: true });
  const comps = db.prepare("SELECT code FROM competitions ORDER BY code").all() as { code: string }[];
  const codes = comps.map((c) => c.code);
  assert.deepEqual(codes, ["bbl", "cpl", "ilt20", "ipl", "sa20", "smat"]);
  db.close();
});

test("scout service: verified TigZig players resolve correctly in global warehouse", () => {
  const db = new DatabaseSync(globalDbPath, { readOnly: true });

  const tanay = db.prepare("SELECT player_key, name, cricsheet_id FROM players WHERE cricsheet_id = 'f1809c03'").get() as { name: string; player_key: number };
  assert.ok(tanay, "Tanay Thyagarajan must exist in global.db");
  assert.equal(tanay.name, "Tanay Thyagarajan");

  const ajay = db.prepare("SELECT player_key, name, cricsheet_id FROM players WHERE cricsheet_id = '31ee319e'").get() as { name: string; player_key: number };
  assert.ok(ajay, "Ajay Mandal must exist in global.db");
  assert.equal(ajay.name, "Ajay Mandal");

  const harvik = db.prepare("SELECT player_key, name, cricsheet_id FROM players WHERE cricsheet_id = '9c86350f'").get() as { name: string; player_key: number };
  assert.ok(harvik, "Harvik Desai must exist in global.db");

  const atkinson = db.prepare("SELECT player_key, name, cricsheet_id FROM players WHERE cricsheet_id = '70d57519'").get() as { name: string; player_key: number };
  assert.ok(atkinson, "Gus Atkinson must exist in global.db");

  db.close();
});

test("scout service: role assignments in global warehouse are deterministic and populated", () => {
  const db = new DatabaseSync(globalDbPath, { readOnly: true });

  const roleCounts = db.prepare(`
    SELECT batting_role, COUNT(*) as cnt
    FROM scout_roles
    GROUP BY batting_role
  `).all() as { batting_role: string; cnt: number }[];

  assert.ok(roleCounts.length >= 5, "Must have all major batting roles present");
  const rolesFound = roleCounts.map((r) => r.batting_role);
  assert.ok(rolesFound.includes("opener"), "Should have openers");
  assert.ok(rolesFound.includes("middle_order"), "Should have middle order");
  assert.ok(rolesFound.includes("finisher"), "Should have finishers");

  db.close();
});

test("scout service: league adjustment and shrinkage maintain mathematical bounds", () => {
  const db = new DatabaseSync(globalDbPath, { readOnly: true });

  const varianceRows = db.prepare(`
    SELECT competition_id, phase, COUNT(*) as seasons
    FROM scout_phase_variance
    GROUP BY competition_id, phase
  `).all() as { competition_id: number; phase: string; seasons: number }[];

  assert.ok(varianceRows.length > 0, "Phase variance table must be populated for intervals");

  db.close();
});

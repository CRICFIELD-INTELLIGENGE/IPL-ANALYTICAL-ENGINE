// Step 3 regression tests: run after applying the Step 3 patches.
//
//   pnpm --filter @workspace/scripts run test:step3        (from the repository root)
//
// On the unpatched tree these fail by design: the first shows byes and leg-byes charged to bowlers, the
// third shows the identity index missing. API_SRC / WEB_DATA / WEB_SRC point the tests at another copy.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { IPL_RAW_DIR, REPO } from "../../global/paths";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const API_SRC = process.env.API_SRC ?? path.join(REPO, "artifacts", "api-server", "src");
const WEB_DATA = process.env.WEB_DATA ?? path.join(REPO, "artifacts", "ipl-analytics", "public", "data");
const WEB_SRC = process.env.WEB_SRC ?? path.join(REPO, "artifacts", "ipl-analytics", "src");
const TSX = path.join(REPO, "scripts", "node_modules", ".bin", process.platform === "win32" ? "tsx.CMD" : "tsx");
const HERE = path.join(REPO, "scripts", "src", "step3");

test("runs conceded per bowler match a recount from the raw Cricsheet files", async () => {
  process.chdir(REPO);
  const { getBallColumns } = await import(pathToFileURL(path.join(API_SRC, "services", "decision", "ball-context.ts")).href);
  const c = getBallColumns();
  const got: Record<number, number> = {};
  for (let i = 0; i < c.n; i++) got[c.bowler[i]] = (got[c.bowler[i]] ?? 0) + c.conceded[i];

  const ipl = new DatabaseSync(path.join(REPO, "sqlite.db"), { readOnly: true });
  const pid = new Map((ipl.prepare("SELECT cricsheet_id, player_id FROM players").all() as Any[]).map((r) => [r.cricsheet_id, r.player_id]));
  const truth: Record<number, number> = {};
  const unsplittable = new Set<number>(); // bowlers of multi-run no-balls / wides with penalties
  for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
    const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
    for (const inn of (m.innings as Any[]).slice(0, 2)) {
      if (inn.super_over) continue;
      for (const ov of inn.overs ?? []) for (const d of ov.deliveries) {
        const p = pid.get(m.info.registry.people[d.bowler]);
        if (p == null) continue;
        const e = d.extras ?? {};
        truth[p] = (truth[p] ?? 0) + d.runs.batter + (e.wides ?? 0) + (e.noballs ?? 0);
        if ((e.noballs ?? 0) > 1 || ((e.wides ?? 0) > 0 && (e.penalty ?? 0) > 0)) unsplittable.add(p);
      }
    }
  }
  // Since Day 4.5 the warehouse stores the extras-type flags and the expression is exact: no exemption for the
  // multi-run no-ball / penalty-wide bowlers any more (their count is still asserted, as a check on the recount).
  assert.equal(unsplittable.size, 13);
  const wrong = Object.keys(truth).map(Number).filter((p) => (got[p] ?? 0) !== truth[p]);
  assert.equal(wrong.length, 0, `${wrong.length} bowlers' conceded runs differ from Cricsheet (byes/leg-byes charged?), e.g. player ${wrong[0]}: ${got[wrong[0]]} vs ${truth[wrong[0]]}`);
});

// Baseline refreshed 2026-10-14 after the Day 4.5 warehouse correction (docs/data-repairs/2026-10-14-day45/baseline-refresh.md),
// and again 2026-10-19 after the approved Day 6 identity / Unknown-bowler-type changes (docs/data-repairs/2026-10-19-day6b/baseline-refresh.md).
test("outputs that do not depend on runs conceded are unchanged from the recorded baseline", () => {
  const out = path.join(os.tmpdir(), `step3-snapshot-${process.pid}.json`);
  const report = path.join(os.tmpdir(), `step3-compare-${process.pid}.md`);
  execFileSync(TSX, [path.join(HERE, "economy-snapshot.ts"), "--src", API_SRC, "--out", out], { cwd: REPO, stdio: "pipe", shell: process.platform === "win32" });
  const log = execFileSync(TSX, [path.join(HERE, "economy-compare.ts"), "--baseline", path.join(REPO, "docs", "global-data-engine", "step3", "baseline-post-day6b-snapshot.json"),
    "--patched", out, "--out", report], { cwd: REPO, stdio: "pipe", shell: process.platform === "win32" }).toString();
  assert.match(log, /^PASS/m, fs.readFileSync(report, "utf8").split("\n").filter((l) => l.includes("| FAIL |")).join("\n"));
});

// Step 3.5 replaced "the split returns exactly what the full file returned": the full file merged and
// mislabelled players, so matching it is no longer the goal. The identity audit checks every page against
// the registry instead (scripts/src/step3/tests/identity.test.ts has the unit cases).
test("player page: every page's recent matches are its own registry id's matches, and no link opens another player", () => {
  assert.ok(fs.existsSync(path.join(WEB_DATA, "player-recent-matches", "index.json")), "index missing: run node scripts/generate-player-recent-matches.mjs");
  execFileSync(TSX, [path.join(HERE, "identity-audit.ts"), "--data", WEB_DATA, "--resolver", path.join(WEB_SRC, "lib", "player-recent-matches.ts"),
    "--out", path.join(os.tmpdir(), `step3-identity-${process.pid}.md`)], { cwd: REPO, stdio: "pipe", shell: process.platform === "win32" });
});

# Day 5.5 commit preview

Commit rule (Day 5.5 instruction): a commit is created only when every staged change is verified safe **and clearly
matches the approved Day 1–5 corrections**.

## Why groups 2–8 are previewed but not committed

Days 1–5 were applied on top of a large body of earlier work that was never committed (2026-10-09 → 10-13). Each
of the groups below would therefore also commit that earlier work, so its contents cannot "clearly match" Days 1–5.

| Group | Files | Earlier, never-committed work it would also commit |
|---|---|---|
| 2 security (Day 1) | 13 tracked (+309/−188), 5 new | `app.ts`, `routes/index.ts`, `routes/live.ts`, `App.tsx` already differed from HEAD before Day 1 (pre-edit snapshots ≠ HEAD): earlier route and page wiring (Scout, Step 3 endpoints) |
| 3 scout (Day 2) | 13 new | The **entire Scout Lab** (services, routes, 4 pages, components, created 2026-10-10/11); Day 2 only corrected it. It also needs `scripts/src/scout` and `scripts/src/global` (untracked) to build its data |
| 4 ingestion (Day 3–4) | 3 tracked (+219/−90), 6 new | `cricsheet-csv-sync.ts` and `update-ipl-data-v3.ts` are clean (pre-edit = HEAD). `compute_analytics.ts` has no pre-Day snapshot. `data-integrity.test.ts` depends on the global data engine and the Step-3 baseline (untracked) |
| 5 stats (Day 4–4.6) | 2 tracked (+117/−37), 2 new | `decision/db.ts` and `stats-aggregator.ts` contain the Step 3 economy fix (2026-10-10, uncommitted), which Days 4–4.6 rewrote in place: the hunks are not separable |
| 6 warehouse tooling (Day 4.5) | 13 new | Day 4 tools import the Step 3 harness (`scripts/src/step3/*`, `scripts/src/global/paths.ts`, `scripts/lib/player-identity.mjs`): 30+ untracked files from 2026-10-10 |
| 7 identity data (Day 3–4.6) | 4 tracked (+11,626/−10,188), 804 new | Bios and squads include the 2026-10-12 photo import (yours); the 797-shard index and its generator are Step 3.5 (2026-10-10) |
| 8 build/deploy (Day 5) | 6 tracked (+59/−9), 16 new | The **entire 3D replay module** (16 files, created 2026-10-09) would be added, not just the Day 5 type fixes. `scripts/package.json` also adds the global-engine scripts and the `fflate` dependency (earlier work) |

## Committable now

| Group | Contents | Validation |
|---|---|---|
| **1 repository hygiene** | `.gitignore`, `.gitattributes` (new), root `package.json` (Node/pnpm pins), `pnpm-workspace.yaml` (`allowBuilds`), `scripts/post-merge.sh` (auto schema push removed), `lib/db/drizzle.config.ts` (production guard), `scripts/data-release.mjs` (new); untrack `sqlite.db`, `sqlite.db-wal`, `sqlite.db-shm`, `artifacts/ipl-analytics/.env` (files kept on disk) | 0 secret patterns; 0 binary additions; only the 4 approved deletions; 0 UI/media paths; largest added file 13 KB. The `.gitignore` hunk also carries 4 earlier ignore lines for `lib/cricket-data/global/{raw,warehouse}/` (global data engine), which are safe |
| **9 documentation** | `DAY-0*.md`, `docs/architecture-handbook/` (incl. `CricField-Handbook.pdf`, 4.6 MB, the requested deliverable), `docs/data-repairs/**` (reports and evidence; `backup/` folders ignored), `docs/day05/`, `docs/day055/` | 85 files, 5.7 MB; 0 secret patterns; no media other than the handbook PDF; authored in this engagement |

## Options for groups 2–8 (your decision)

1. **Baseline checkpoint first (recommended).** Commit the earlier work as your own, in a few labelled commits (e.g.
   "Step 3/3.5 economy and identity engine", "global data engine + Scout Lab", "3D replay viewer", "photo/dugout UI";
   2026-10-09 → 10-13). Then commit the Day 1–5 changes on top. Some files still mix both (`app.ts`,
   `stats-aggregator.ts`, `decision/db.ts`); those are committed in the later group with the earlier hunks disclosed.
2. **Single checkpoint commit** of everything that passes the safety checks, described honestly as "work in progress
   since 9194613, including Day 1–5 corrections".
3. **Keep uncommitted** and rely on the verified backups (`../day05-backup/`, `../day055-backup/`).

No option requires rewriting history. Pushing anywhere is a separate decision (see the history finding in DAY-05.5-REPORT.md).

# Baseline: `refactor/repository-architecture`

- **Recorded:** 2026-11-16
- **Branch base:** `main` at `5e71e6d`
- **Where:** a separate git worktree (`../cricfield-refactor-wt`). The main checkout was not modified and no branch was switched there.
- **Main checkout status:** `git status --porcelain` showed 0 changed files when the worktree was created.
- **Environment:** Node 26.12.1, pnpm 11.1.2, Windows 11.
- **Local data:** the git-ignored `sqlite.db`, `global.db` (with `-wal`/`-shm`) and `artifacts/api-server/data/pressure-official/` were *copied* into the worktree from the main checkout. `lib/cricket-data/raw/` and `lib/cricket-data/official/` were **not** copied.

## Key data checksums (SHA-256, main checkout)

| File | SHA-256 (first 16) |
|---|---|
| `sqlite.db` | `77f96b01ca535715` |
| `lib/cricket-data/global/warehouse/global.db` | `f256e8d83c01b90b` |
| `data/ipl.db` | `e3b0c44298fc1c14` (empty file) |
| `data/platform.sqlite` | `2e96884c16791c7d` |
| `artifacts/api-server/data/players.json` | `50318d17f06aa175` |
| `artifacts/api-server/data/player-bio.json` | `9b09743c120b9338` |
| `artifacts/ipl-analytics/public/data/player-bio.json` | `20e3dd8c2c48fbc4` |
| `artifacts/ipl-analytics/public/data/squads-by-season.json` | `45b12aaeffdb31f5` |
| `artifacts/ipl-analytics/public/data/pressure-reliability.json` | `8b3bec3426422ead` |
| `artifacts/api-server/data/pressure/pressure-reliability.json` | `54939b9d29ee2775` |
| `lib/cricket-data/aggregated/player-season-stats.json` | `23ac2da7117fc164` |

Full hashes: `../refactor-baseline-checksums.txt`, next to the worktree, outside git.

## Results

| Check | Result |
|---|---|
| `typecheck:libs` | ✅ pass |
| web typecheck | ✅ pass (0 errors on clean `main`; the `layout.tsx` / header-search errors seen earlier come only from uncommitted local edits) |
| API typecheck | ✅ pass |
| scripts typecheck | ✅ pass |
| mockup-sandbox typecheck | ✅ pass |
| web build | ✅ pass (186 s) |
| API build | ✅ pass |
| API tests | 246 tests: 237 pass, **9 fail** |
| web unit (`pulse-auction`) | 2/2 pass, with the corrected command in TESTING.md |
| `test:global` | 23 tests: 22 pass, **1 fail** |
| `test:step3` | 25 tests: 17 pass, **8 fail** |

## Pre-existing failures (on `main`, before any change on this branch)

**API (9):**

- CRR: eight components total 100; policy adjustment is explicit and reproducible
- CRR: missing evidence is left out and declared, never scored as zero
- CRR: tiers follow the published bands; thin evidence cannot reach the top two
- CRR: sensitivity tests each tier under other weightings, and V1 stays beside it for comparison
- RR strategy CRR: supplied decision policy, computed index and published tier stay consistent
- RR identity repair: Vaibhav has one salaried canonical record with genuine 2025-26 history
- simulator: compares the scenarios and recalculates from choices
- simulator: too few retained is reported, never a fake strength; a missing salary blanks the total
- lookup on the shipped data: no IPL written name resolves to another player's bio

**Global (1):** "scout service: global.db exists, is valid SQLite and contains all 6 competitions". The local `global.db` has 7 competitions (T20Is were added), so the test's expectation is stale.

**Step 3 (8):** "real bios" ×3, including "the API and web copies of player-bio.json are identical" (their checksums above differ); "real data: pages that were wrong before Step 3.5…"; "player page: every page's recent matches…"; "outputs … unchanged from the recorded baseline"; and two caused by the environment: "runs conceded … recount from the raw Cricsheet files" and `warehouse-reconcile.test.ts` both fail with `ENOENT lib/cricket-data/raw`, which was not copied.

These are data or model states on `main`. This branch does not touch them. The comparison rule is: **the same failures, no new ones.**

Logs: `../refactor-baseline/before/*.log`, outside git.

## Validation after the docs change (Phase 6)

The same script was re-run after every docs file was in place.

| Check | Before | After |
|---|---|---|
| 5 typechecks | pass | pass |
| web build / API build | pass / pass | pass / pass |
| API tests | 237 pass / 9 fail | 237 pass / 9 fail, same 9 |
| web unit | failed (wrong runner command in the first run) | 2/2 pass with the corrected command |
| `test:global` | 22 pass / 1 fail | same |
| `test:step3` | 17 pass / 8 fail | same 8 |
| Data checksums | — | all 11 unchanged (`sha256sum -c`) |

The branch changes only Markdown, `.env.example` and `.github/` templates. No code, data, route or config path changed.

## Rollback

- The branch has not been merged or pushed. To drop it: `git worktree remove ../cricfield-refactor-wt` and then `git branch -D refactor/repository-architecture`.
- If it is merged later: `git revert -m 1 <merge-sha>` on a branch, then open a PR. Never rewrite `main`'s history.

## Re-validation after the cleanup commits

| Run | Change set | Typechecks / builds | API | web unit | global | step3 | checksums |
|---|---|---|---|---|---|---|---|
| after-cleanup | M1, M3, D1–D5 | all pass | 237 / 9 (same) | 2 / 0 | 22 / 1 (same) | 17 / 8 (same) | unchanged |
| after-launchers | + M4 | all pass | 237 / 9 (same) | 2 / 0 | 22 / 1 (same) | 17 / 8 (same) | unchanged |

The built site still contains the venue and logo images (`dist/public/venue-images/wankhede stadium.webp`, `dist/public/rr logo.png`). The repo-wide Markdown link check finds 0 broken relative links. Commit-level rollback: `git revert <sha>` for any single commit on this branch.

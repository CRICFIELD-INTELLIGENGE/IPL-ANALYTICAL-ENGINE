# 10 — Testing, Debugging and Quality

> No application code was modified to make anything pass. One test that opens `sqlite.db` without `readOnly` was run against a **copy** of the database to rule out any change to the production file.

---

## 1. What exists

| Type | Exists? | Where | Count |
|---|---|---|---|
| Unit tests (metrics, roles, shrinkage, percentiles, style classification) | ✅ | `scripts/src/global/tests/metrics.test.ts`, `scripts/src/scout/tests/scout.test.ts` | 14 |
| Pipeline / integration tests (normalise → aggregate → validate on in-memory DB) | ✅ | `scripts/src/global/tests/pipeline.test.ts` | 5 |
| Warehouse sanity tests (real `global.db`) | ✅ | `scripts/src/scout/tests/api.test.ts` (service level, not HTTP) | 4 |
| Regression tests for site fixes (identity, economy recount, API snapshot, delivery sequencing) | ✅ | `scripts/src/step3/tests/*.test.ts` | 15 + 3 |
| Data validation as a gate | ✅ | `scripts/src/global/validate.ts` (118 checks) | — |
| HTTP/API contract tests (supertest etc.) | ❌ | — | 0 |
| React component tests | ❌ | — | 0 |
| End-to-end browser tests (Playwright/Cypress) | ❌ | — | 0 |
| Performance benchmarks | 🟡 | `scripts/src/global/bench.ts` (DB compaction/benchmark report); ad-hoc measurements in this audit | — |
| CI running any of the above | ❌ | no `.github/workflows` | — |
| Python tests | 🟡 | `scratch/test_*.py`, `scripts/test_*.py` are exploratory scripts (image segmentation, query probes), not a test suite | — |

Test runner: Node’s built-in `node:test` with `node:assert/strict`, executed through `tsx`.

---

## 2. Results of checks run on 2026-10-12

| # | Command (cwd) | Result |
|---|---|---|
| 1 | `npx tsx --test src/global/tests/*.test.ts src/scout/tests/*.test.ts` (`scripts/`) | ✅ **23 pass, 0 fail** (2.2 s) |
| 2 | delivery-sequence test, path pointed at a copy of `sqlite.db` + WAL | ✅ **3 / 3** |
| 3 | `npx tsx --test src/step3/tests/identity.test.ts src/step3/tests/step3-regression.test.ts` | 🔴 **11 pass, 4 fail** (64 s) |
| 4 | `npx tsc -p tsconfig.json --noEmit` (`artifacts/api-server`) | 🔴 2 errors — `routes/scout.ts(123,12)` and `(123,29)`: `unique_name` not on `Rating` |
| 5 | same (`artifacts/ipl-analytics`) | 🔴 11 errors, all in `components/cricket3d/*` (`BatterHandedness` not exported, tuple `.x/.y/.z`, missing `pause`, `toggleMute`, impossible enum comparison, unknown `WAGON_WHEEL` key) |
| 6 | same (`scripts`) | ✅ 0 errors |
| 7 | `pnpm exec tsx src/index.ts` (the `decision-api` launch config) | 🔴 crashes: `ReferenceError: __dirname is not defined in ES module scope` (`app.ts:46`) |
| 8 | `PORT=5055 node dist/index.mjs` + 37 endpoint probes | ✅ all expected statuses (200 / 400 / 404); latency table in Chapter 8 |
| 9 | Live UI checks (Scout, Ask, War Room, Dugout, Stats; desktop + 375 px) | 🟡 works; defects listed in Chapters 6–7 |
| 10 | `scout-service` and `auction-war-room` functions called directly (read-only) | ✅ produced the worked examples in Chapter 6 |

### 2.1 The four failing Step-3 tests

| Test | Failure | Likely cause (to confirm) |
|---|---|---|
| *real data: pages that were wrong before Step 3.5 show exactly their own matches* | assertion failure | identity index/shards regenerated after the 2026-10-11 data change |
| *real data: links resolve by registry identity, not initial + surname* | assertion failure | same |
| *outputs that do not depend on runs conceded are unchanged from the recorded baseline* | `FAIL: 25/31 checks` — e.g. “legacy /api/stats/query (2025): batters: 166 batters differ”; bowlers changed in `isIndian`, `team` (unexpected fields) | baseline `docs/global-data-engine/step3/baseline-economy-snapshot.json` predates the 2026-10-11 sequencing fix (`sqlite.db` changed) and later edits to `stats-aggregator.ts`; **not yet shown to be benign** |
| *player page: every page’s recent matches are its own registry id’s matches* | identity audit reports **20 “MISSING (empty page)”** (e.g. `gurjapneet-singh` 8 matches not shown, `salil-arora` 14, `brijesh-sharma` 13) | bios lacking a verified key after the latest squad/bio regeneration |

> **Release-blocker rule:** until each of these is either fixed or explained with a new, reviewed baseline, the site’s stats cannot be called “regression-tested”. Updating the baseline without explaining the diff would hide real changes.

---

## 3. Coverage gaps (what is not tested at all)

1. Any HTTP behaviour (status codes, validation messages, pagination, sort direction) — the Scout bowling-sort and `minBalls` bugs would have been caught by one API test each.
2. The legacy Advanced Stats engine (both SQL and JSON paths) — no fixtures, no expected outputs.
3. Decision modules: weakness detector, pressure genome, match model, War Room, Playing XI — no unit tests, only manual/browser checks recorded in docs.
4. Front end: no component, accessibility or visual tests; the `role` type drift is the kind of bug a contract test catches.
5. Security: no tests for path traversal, input limits or rate limits.
6. Statistical validity: no coverage test for intervals, no out-of-sample test for the weakness detector or calibration.

---

## 4. How previous bugs were diagnosed and fixed (repository evidence)

| # | Symptom | Diagnosis | Fix | Evidence |
|---|---|---|---|---|
| B1 | Player page crashed on every load | It loaded a **33.3 MB** JSON of all players’ recent matches | Split into a 67 KB index + per-player shards (median 4.2 KB) | `docs/global-data-engine/step3/README.md` (before/after table) |
| B2 | Bowling economy too high for many bowlers | `is_bye/is_legbye` never populated → old expression charged **7,142** bye/leg-bye runs to bowlers | `RUNS_CONCEDED_SQL` using only populated columns; regression vs raw recount | `services/decision/db.ts:77-89`; `economy-regression-results.md` (31/31 at the time) |
| B3 | Residual economy mismatch | 17 deliveries: multi-run no-balls and a 5-penalty wide can’t be split | Documented, not fixed; migration script prepared | `economy-residuals.md`, `step3_5/migrate-delivery-extras.ts` |
| B4 | Overs with ≥ 10 deliveries out of order | `parseFloat("19.10") = 19.1` → ball 1 | `delivery_seq` / renumbered `ball_num` in data (2026-10-11) | backup vs current DB comparison; `delivery-sequence.test.ts` |
| B5 | Wrong player’s matches on a page (“Prince Choudhary” showed Mukul Choudhary) | initial + surname fallback | exact registry-identity resolution; audit script | `step3/tests/identity.test.ts`, `step3_5/identity-audit.md` |
| B6 | Fake win-probability curve | `/live/win-probability` was a sine wave | replaced with calibrated chase model | `routes/live.ts:71-82`; project notes |
| B7 | Every match showed the same 22 “squad” players and 2026-final commentary | `onlineDb.ts` returned invented payload | real team sheets + commentary from `match-card.ts` | `services/onlineDb.ts:1-10` |
| B8 | Periodic fake delivery types | `types[(over*6+ball) % 12]` | ESPN commentary parser; nulls kept as nulls | `services/ball-commentary.ts:1-21` |
| B9 | Simulations ~15 runs low; finals looked unwinnable | raw DP under-confident; no season boundary factor; DLS overs mishandled | Platt calibration, season factor, `effectiveOver` | `match-model.ts:414-476`; project notes |
| B10 | A regex silently never matched | Python heredoc wrote a literal backspace (0x08) instead of `\b` | rewrite with an editor; scan for control characters | project memory “Avoid Python heredocs for regex edits” |
| B11 | 17 s query | `LEFT JOIN dismissals … AND x.player_out_id = d.batter_id` made SQLite probe the wrong index | join on `delivery_id` only, filter in `CASE` (1 s) | project notes |
| B12 | Fabricated `lib/simulation-models.ts` | invented model outputs | file deleted; modules rebuilt on the warehouse | project notes |

These are good **interview stories**: each has a symptom, a measurement, a root cause and a verification. Learn two or three of them so well you can explain them without notes (Challenge 12 asks you to reproduce B4).

---

## 5. Debugging toolkit used in this project (and how to use it yourself)

| Problem | Tool / technique |
|---|---|
| Wrong number on a page | Reproduce the API call with `curl`; then call the service function directly in a `tsx` script; then run the SQL by hand with `node -e` + `node:sqlite` (`readOnly: true`) |
| Slow query | `EXPLAIN QUERY PLAN`; check which index is used; time with `performance.now()` |
| Data mismatch between two sources | Recount from raw files (the Step 3 economy recount); write the diff as a report |
| Identity errors | Audit every page against ground truth (registry ids from raw files) instead of spot-checking |
| Front-end data shape bugs | Inspect the JSON in the network panel; compare with the TypeScript interface the component uses |
| “Works in my tab but not in the screenshot” | `document.hidden` and animation state (project note on framer-motion) |
| Fixes that must not touch production | copy the DB / source into a scratch folder, patch there, diff (`git diff --no-index`), `git apply --check` |

---

## 6. Release blockers (as of this audit)

| # | Blocker | Chapter |
|---|---|---|
| R1 | `/api/ipl/sync-csv` arbitrary file read | 8 §9 |
| R2 | 4 failing Step-3 regression tests (20 empty player pages, unexplained stats diffs) | §2.1 |
| R3 | Scout bowling default sort inverted; `minBalls` not applied; role “Unclassified” | 6 |
| R4 | Gemini fallback presents invented statistics | 9 |
| R5 | Typecheck failures (API 2, web 11) block `pnpm run build` | §2 |
| R6 | `global.db` and raw JSON not part of any deploy artefact | 2 §6 |
| R7 | Source-run crash (`__dirname`) breaks the documented dev/test server | §2 |

---

## 7. A minimal test plan to add (proposal)

1. **API tests** with `supertest` against `app`: one per Scout endpoint (status, schema, sort direction, `minBalls` respected), Ask (“Most runs in IPL 2025” → Sai Sudharsan 759), War Room (shape + backtest fields).
2. **Golden-number tests** for the legacy engine: 10 fixed queries with numbers recounted from raw Cricsheet.
3. **Contract types**: generate the client from Zod/OpenAPI; delete hand-written duplicates.
4. **One Playwright smoke test** per primary journey (Home → Scout → profile; Stats filter; Ask).
5. **CI** (GitHub Actions): `pnpm install`, `typecheck`, `test:global`, `test:step3` (on a fixture DB), build.

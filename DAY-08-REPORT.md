# Day 8: Performance and scalability

**Date:** 2026-10-19
**Rule followed:** measure first, change, measure again, run regression tests. No feature or chart was removed, no statistic changed, and no index was added.
**Not touched:** warehouse hashes were unchanged (`ab897a8c…` / `79c75f78…`). Nothing was committed or deployed.

Evidence: `docs/day08/`.
- `web-build-before.log` / `web-build-final.log`
- `bundle-after-lazy.json` / `bundle-final.json`
- `route-js-after.json` / `route-files-after.json`
- `bench-before.json` / `bench-after.json`

**Environment:** Windows laptop, local servers, Node 24.10. Absolute timings are machine-specific; the before/after ratios are what carry over.

---

## A. Frontend

### Bottleneck

One 4.09 MB JavaScript chunk (860 kB gzipped) contained all 46 pages, so every first visit downloaded and parsed every page's code: the 3D replay, every chart, Scout, the AI Analyst pages and the 316 kB content engine.

### Change

Route-level code splitting in `src/App.tsx`. Every page is a `React.lazy` import behind one `Suspense` boundary. The fallback is a quiet "Loading…" status line on the app background (no redesign). Shared code is split out automatically: the layout, the Recharts core, the icons.

### Before / after (production builds; `vite build`)

| Measure | Before | After |
|---|---|---|
| JS chunks | 1 | 122 |
| Entry chunk | 4,090.5 kB (860.6 kB gzip) | **326.7 kB (105.6 kB gzip)** |
| Total JS (all routes) | 4,090.5 kB | 4,086.1 kB (unchanged: nothing removed) |
| CSS | 436 kB (48.5 kB gzip) | same |
| Build | ✔ 17.9 s | ✔ 19.7 s |

**JS needed for a first visit to each route.** These are the exact files the browser fetched for that route on the production build (`vite preview`), gzip -9:

| Route | Before (every route) | After | Change |
|---|---:|---:|---:|
| `/home` | 835.9 kB gz / 3,995 KiB parsed | **252.0 kB gz** / 1,403 KiB (16 files) | −70% |
| `/scout` | same | **240.5 kB gz** / 1,364 KiB (9 files) | −71% |
| `/match/:id` | same | **277.4 kB gz** / 1,487 KiB (34 files) | −67% |
| `/stats` | same | **385.5 kB gz** / 1,903 KiB (27 files) | −54% |
| `/ai-analyst` | same | **392.1 kB gz** / 1,882 KiB (41 files) | −53% |
| `/players/:slug` | same | **532.7 kB gz** / 2,459 KiB (42 files) | −36% |

- **Page load, warm local cache:** DOMContentLoaded on `/home` dropped from 212 ms to 61 ms (load event 217 → 66 ms).
- **Why warm only:** both preview servers were primed by their first open, so transfer timings are not a cold-network measurement. The table above therefore states cold cost as the gzip size of the exact files fetched.
- **Browser console on the after build:** 0 errors on every route measured. Day 7 also re-crawled 51 routes on the dev server with 0 JS errors.

**What remains large:**
- The `layout` chunk (1,006 kB raw / 125 kB gzip) is shared vendor code (framer-motion, Radix, React Query) imported through the layout that every page uses. Splitting it further would change caching granularity, not first-visit bytes.
- The `player` chunk is 647 kB / 159 kB gzip.
- Both are candidates for the redesign, e.g. lazy-loading the player page's below-the-fold panels.

### Auction polling (and duplicate requests)

| Measure | Before | After |
|---|---|---|
| `/api/auction/state` requests in 15 s, idle `/auction` tab (measured in the browser on each build) | **14** | **3** |
| Poll interval | 1 s always (≈3,600 requests an hour per open tab) | 1 s while a lot is live (the 12 s clock), 5 s otherwise |
| UI reaction to an action | Next 1 s poll | **Immediate:** every action refreshes the state. Measured: `select-team` at 29 ms, refresh at 92 ms, UI updated within 900 ms |

Behaviour preserved: the live clock and AI bids still update every second while active. Day 7's journey (select → start → bid → pause → reset) passes.

## B. Backend

### Measured baseline

In-process real Express app on a warehouse copy. Cold = first request in a fresh process; warm = median of the next three.

| Endpoint | Cold before | Warm before | Warm after | Payload |
|---|---:|---:|---:|---:|
| `/api/ipl/stats/query` (all time) | 6,746 ms | **5,094 ms** | **27 ms** | 2.4 MB |
| `/api/ipl/stats/query?season=2025` | 2,576 | 2,372 | **5** | 481 kB |
| `/api/scout/player/:id` | 659 | 690 | **25** | 10 kB |
| `/api/scout/rankings` | 324 | 248 | **5** | 39 kB |
| `/api/ipl/overview` | 412 | 239 | **1** | 1 kB |
| `/api/ipl/phase-analysis` | 316 | 253 | **1** | 1 kB |
| `/api/ipl/team-analytics` | 169 | 132 | 129 | 6 kB |
| `/api/opposition` (simulation) | 403 | 262 | 247 | 6 kB |
| Every other benchmarked endpoint (19) | — | ≤ 47 ms | unchanged | — |

### Bottlenecks and changes

1. **Legacy stats aggregation** recomputed the full query on every request: about 5 s and 2.4 MB for the unfiltered all-time view.
   - The result is a pure function of the filters and the read-only warehouse.
   - **Change:** a bounded LRU (12 entries) of results keyed by the normalised filters (order-insensitive), in `aggregateQueryStats`.
   - The cache holds the **in-flight promise**, so concurrent identical requests share one computation. Failures are not cached.
   - Each caller receives a top-level copy, because `aggregateScenarioStats` reassigns `result.batters`.
2. **Scout percentiles** re-rated each competition's whole population for every lookup.
   - **Change:** a cache (64 entries) of each competition's full rating population per (competition, discipline, phase, resolved seasons, `minBalls`, roles).
   - Requests narrow it to the players asked for, and callers receive copies. The subset path (percentiles off) is unchanged.
3. **League summaries** (overview, toss, phase) are memoised once per process when computed from the warehouse.

**Why caching and no index:**
- The hot tables already have indexes on match, innings, batter, bowler and the composite filter columns.
- The slow cases aggregate *every* delivery (295,732 rows), so an index cannot reduce the rows read.
- Cold first computations are unchanged by design.

### Concurrency (handbook finding #6)

10 identical concurrent `/api/ipl/stats/query?season=2024` requests against a fresh process:

| | All 10 done after |
|---|---:|
| Before (pre-sprint code, `day055-clean`) | **23.2 s** |
| After | **2.5 s** |

**Limits:**
- Different concurrent queries still run one after another: SQLite calls are synchronous on the event loop.
- The first all-time query (≈ 5.7 s) blocks the process once after a cold start.

Recommended (not implemented; it needs a deployment decision):
- an opt-in warm-up of the default query after startup, timed against the platform's health-check window;
- or moving the legacy aggregation to a worker thread.

### Correctness of the caches

New `test/day8-cache.test.ts` (3 tests):
- repeated queries are deep-equal;
- filter order doesn't change the key, while different filters give different results;
- reassigning a returned field doesn't leak into later results;
- a one-player Scout lookup equals that player's row in the full population (same percentiles) on every call.

The full API suite passes (§E).

## C. Database

| Check | Result |
|---|---|
| Read-only deployment | `CRICFIELD_DB_READONLY=1` opens `@workspace/db` read-only (Day 5, tested by `db-safety.test.ts`). The decision layer (`decision/db.ts`) always opens read-only. The local dev launch now sets it too (Day 6) |
| Connection handling | One process-wide `DatabaseSync` per warehouse (decision layer) and one drizzle connection; synchronous reads; no pool needed |
| Concurrent reads | Safe: SQLite readers on a read-only file; the Node event loop serialises calls (see the concurrency limits above) |
| Index plans | Hot paths are index-backed (list above); full aggregations are scan-bound by nature |
| Tests and benchmarks | Benchmarks, smoke runs and analysis used **copies** (`CRICFIELD_DB_PATH`). The test suites read the production file **read-only**, enforced by the preload and asserted by `db-safety.test.ts`; hashes are unchanged after every run |
| No unintended writes | `sqlite.db` `ab897a8c…` and `global.db` `79c75f78…` unchanged after all Day 8 work. Write-capable scripts are guarded (Day 6D) |
| Release artifacts | `data-release/cricfield-data-2026.10.14` still verifies (Phase 0). Day 8 changed no data |

## D. Files changed (Day 8)

| File | Change |
|---|---|
| `artifacts/ipl-analytics/src/App.tsx` | 46 pages → `React.lazy` + `Suspense` (`RouteLoading`) |
| `artifacts/ipl-analytics/src/lib/live.ts` | Adaptive auction polling; actions refresh the state |
| `artifacts/api-server/src/services/stats-aggregator.ts` | `aggregateQueryStats` LRU with in-flight sharing; overview / toss / phase memoised |
| `artifacts/api-server/src/services/scout/scout-service.ts` | Population cache for percentile ratings |
| New | `src/scripts/day8-bench.ts`, `day8-concurrency.ts`; `test/day8-cache.test.ts` |
| `.claude/launch.json` | `web-prod-before` / `web-prod-after` preview configs (measurement only) |

## E. Tests after Day 8

Run in Phase 4; see `ENGINEERING-SPRINT-SUMMARY.md`.

## F. Targets

These were set from the measured baselines, not invented:
- warm `stats/query` under 100 ms: **met** (27 ms);
- Scout player lookup under 100 ms warm: **met** (25 ms);
- first-visit JS under 400 kB gzip on the main entry routes: **met** for home, scout, match, stats and ai-analyst; **not met** for player pages (533 kB);
- no more than 1 request/s idle polling per tab: **met** (0.2/s).

The cold all-time `stats/query` under 1 s is **not met** (5.7 s): it needs a worker or a precomputed table, which are deployment and data decisions.

# CricField engineering sprint: Day 5.5 verification and Days 6–8 (summary)

**Date:** 2026-10-19
**Phase reports:** `DAY-05.5-VERIFICATION.md`, `DAY-06-REPORT.md`, `DAY-07-REPORT.md`, `DAY-08-REPORT.md`
**Machine-readable register:** `docs/final/defect-register.json` (35 handbook defects, each traced to its section; 16 sprint findings)
**Final logs:** `docs/final/`

**Ground rules kept:**
- `sqlite.db` (`ab897a8c…`) and `global.db` (`79c75f78…`) are byte-identical before and after the sprint (`docs/final/hashes-*.txt`).
- No commit, push, history rewrite, deployment, publication or redesign.
- No invented data; no identity guessing.
- The one baseline re-record (Step-3) was approved by the owner.

---

## 1. Tests actually executed (final run, `docs/final/`)

| Suite / check | Command | Result |
|---|---|---|
| API | `pnpm --filter @workspace/api-server test` | **74 / 74** (48 before the sprint + 26 new) |
| Global / scout | `pnpm --filter @workspace/scripts run test:global` | **23 / 23** |
| Step-3 (identity, sequencing, economy regression, warehouse reconcile) | `pnpm --filter @workspace/scripts run test:step3` | **27 pass, 0 fail, 1 skip** (optional `CORRECTED_DB` check) |
| Root typecheck | `pnpm run typecheck` | **0 errors** |
| API build / web build | `pnpm --filter … run build` | ✔ / ✔ |
| Production startup smoke (built `dist/index.mjs`, DB copy) | `node scripts/day5-prod-start-smoke.mjs <copy>` | **14 / 14** |
| Clean checkout (release restore → install → typecheck → builds → all suites) | Phase 0 | ✔, all green, hashes unchanged |
| Warehouse reconciliation vs source | Step-3 "production warehouse matches the source exactly"; runs-conceded recount (0 bowlers differ) | ✔ |
| Identity consistency | Step-3 identity / link / heading tests, `day6-identity` | ✔ |
| Browser (built-in Chromium) | Scripted crawl of 51 routes (desktop) and 12 routes (375 px); 6 interactive journeys; production-build load measurements | 0 JS errors, 0 failed API calls after fixes (DAY-07, DAY-08) |

**New test files:**
- `day6-identity` (6), `day6-bowler-type` (3), `day6-metrics` (5), `day6-warehouse-guard` (4), `day7-api` (5), `day8-cache` (3);
- plus the Step-3 comparator's alias rule.

**Not run or not available:**
- No committed browser E2E framework exists (Playwright/Cypress): the browser checks were scripted, not a re-runnable suite.
- The Gemini-backed AI paths (no key; their truthful "unavailable" states were checked).
- Cold-network page timings: the browser cache was warm, so cold cost is reported as gzip bytes.
- A real mobile device.
- The optional `CORRECTED_DB` Step-3 check.

## 2. Fixed: verified by a test or measurement run today

| Area | Fix |
|---|---|
| Identity | Registry-id metadata in `player-profiles.ts`; initial+surname fallback removed. Fixed cases: Nitin vs Navdeep Saini, the two Harmeet Singhs, Rajesh vs Ravi Bishnoi, Finn Allen's guessed spin style. Hasaranga is now overseas. Slug and display-name resolution (`PW Hasaranga`) go through the verified identity index |
| Bowling type | Pacer / Spinner / **Unknown** across the stats engine, filters, team and venue splits and 5 decision modules. Name-substring guessing removed. 0 statistics changed |
| Metrics | `/api/ipl/overview`, `/toss-analysis` and `/phase-analysis` are computed instead of literals; e.g. the real powerplay dot rate is 46.3%, the literal said 31.8%. Team economy overs notation fixed in `compute_analytics`. `boundaryPct` meanings made explicit (`boundaryRunPct`, UI labels). 6-ball guard test |
| Data safety | Eight warehouse-writing scripts refuse production; the legacy `update-ipl-data.ts` (pre-2017 dismissal rules) is disabled; v3 has no random values |
| Website | 9 broken banner/hero images. Profile intel 404. Auction 500 / negative-raise / unvalidated input. "Uncapped" asserted without evidence. Raw `err.message` in 64 API 500s. Pinch-zoom re-enabled. Shadcn colour tokens mapped (`@theme inline`) |
| Performance | Route code splitting (entry 4,090 → 327 kB). Adaptive auction polling (14 → 3 requests per 15 s). Bounded result caches: warm stats query 5,094 → 27 ms; Scout player 690 → 25 ms; 10 concurrent identical queries 23.2 → 2.5 s |
| Earlier days, re-verified today | sync-csv file read, Gemini fabricated numbers, Scout sort / minBalls / roles / CIs, typecheck, auto schema push, CORS + rate limits, Step-3 failures, economy residual |

Status counts:
- **Handbook defects:** 12 FIXED_VERIFIED, 12 PARTIALLY_FIXED, 4 BLOCKED, 7 DEFERRED.
- **Sprint findings:** 9 FIXED_VERIFIED, 2 PARTIALLY_FIXED, 1 BLOCKED, 3 DEFERRED, 1 NOT_REPRODUCIBLE.

## 3. Performance before / after

| Measure | Before | After |
|---|---:|---:|
| Main JS chunk | 4,090.5 kB (860.6 kB gz) | entry 326.7 kB (105.6 kB gz), 122 chunks |
| First-visit JS, gzip (`/home`, `/scout`, `/match`, `/stats`, `/ai-analyst`, `/players`) | 836 kB on every route | 252 / 241 / 277 / 386 / 392 / 533 kB |
| DOMContentLoaded `/home` (warm, local) | 212 ms | 61 ms |
| Warm `stats/query` all-time / 2025 | 5,094 / 2,372 ms | 27 / 5 ms |
| Warm Scout player / rankings | 690 / 248 ms | 25 / 5 ms |
| Warm overview / phase analysis | 239 / 253 ms | 1 / 1 ms |
| 10 concurrent identical stats queries | 23.2 s | 2.5 s |
| Idle auction polling | 14 requests / 15 s | 3 requests / 15 s |
| Cold all-time stats query | 6.7 s | 5.7 s (**not** solved, see §6) |

## 4. Files changed in this sprint

**API**
- **Routes:** `routes/auction.ts`, `routes/ipl.ts`.
- **Services:**
  - `stats-aggregator.ts`, `team-analytics.ts`, `auction.ts`, `scout/scout-service.ts`;
  - `decision/player-profiles.ts`, `player-summary.ts`, `player-pool.ts`, `opposition-map.ts`, `squad-dna.ts`, `match-model.ts`, `strategy-sim.ts`.
- **Tools:** `scripts/smoke-db.ts`, `scripts/day6-*.ts`, `scripts/day8-*.ts`.
- **Tests:** 6 new `test/day6–8-*.test.ts`.

**Web**
- `index.html`, `src/App.tsx`, `src/index.css`;
- `src/lib/aggregates.ts`, `live.ts`, `team-context.tsx`;
- `src/pages/feed.tsx`, `player.tsx`, `scout-player.tsx`, `stats.tsx`.

**Scripts**
- `compute_analytics.ts`, `lib/warehouse-guard.ts` (new);
- guard calls in `update-ipl-data.ts`, `migrate_players.ts`, `migrate_matches.ts`, `migrate_deliveries.ts`, `schema-setup.ts`, `populate-current-squad.ts`, `create-matchups-table.ts`, `ingest-kaggle-data.ts`;
- `step3/economy-compare.ts`, `step3/tests/step3-regression.test.ts`.

**Data and docs**
- `docs/global-data-engine/step3/baseline-post-day6b-snapshot.json` (approved);
- `docs/data-repairs/2026-10-19-day6b/`, `docs/day055v/`, `docs/day06/`, `docs/day07/`, `docs/day08/`, `docs/final/`;
- the 5 reports.

**Local config:** `.claude/launch.json` (read-only dev API; two measurement preview configs).

**Not changed:** `sqlite.db`, `global.db`, raw match files, bios and squads, photos, Git history.

## 5. Still open

### Deployment blockers (need the owner)

1. **Commits.** Group 1 (repository hygiene, including untracking `sqlite.db`/WAL/SHM/`.env`) is staged; groups 2–8 and today's work are uncommitted. A clean `git clone` cannot build today's application.
2. **`sqlite.db` in Git history** (118 MB blob; GitHub limit 100 MB): history rewrite, Git LFS, or a release artifact.
3. **Data release publication:** destination plus licence review (Cricsheet ODC-BY attribution; locally modified raw files).
4. **Deploy with `CRICFIELD_DB_READONLY=1`.** Required: insight click counts would otherwise write the warehouse on ephemeral instances.
5. **Shared global auction state:** must not be public as-is (any visitor can reset everyone's game).
6. **Licensing:** scraped commentary and live scores (spoofed User-Agent), player photos, IPL/franchise marks and affiliation wording. Legal decisions.

### Statistical limitations

- **13 bowlers have Unknown type** (no sourced style or speed). That's 0.22% of all deliveries but 3.6% of 2026; they are excluded from pace/spin splits, and the simulator averages pace and spin for them.
- **Country is unknown** for 26% of players who batted (7.6% of balls faced); unknown is treated as Indian (documented heuristic).
- **Delivery length / line / zone** exist for ~58–66% of deliveries (40% in 2008–12); undescribed balls are skipped, never guessed.
- **Production `team_intelligence.avg_economy`** keeps old values (overstated by 0.02–0.05 rpo) until a reviewed rebuild; the column is not served.
- **Legacy zero-denominator rates** return 0, not null.
- **No out-of-sample validation** of weakness findings, win model or War Room signals (handbook §C validation gaps).

### Identity limitations

- 50 bios have no verified identity (empty states).
- 4 squad stubs duplicate registered players (Hasaranga, Kartikeya, Mendis, Naveen-ul-Haq). Slug resolution prefers the registered player, but the Playing-XI could see both rows.
- Current-team fields on merged bios (`ka-maharaj` RR vs 2026 MI; `rj-gleeson`) were not updated without sourcing.
- Tejasvi Singh Dahiya vs T Dahiya is still unestablished.

### Security

- No user authentication model (none needed by current features).
- The Gemini key is browser-held, sent in a header.
- `?refresh=true` is admin-only in code, but untested.
- Cache-Control `no-store` on all responses.

### Unverified

- Mobile layout issues seen only with a hidden pane (right rail, `/stats` heading, player page width).
- The Day 6 radar change (no radar rendered on the player opened).

## 6. Prioritised remaining findings (handbook and sprint)

1. **Commit the work** (group 1, then the logical groups 2–8, then Days 6–8) and decide `sqlite.db` storage. Unblocks everything else (AS-B14, CH01-D11, AS-B7).
2. **Licensing decisions:** scraped sources, photos, marks and affiliation copy (AS-B9, CH25). Required before any public or commercial launch.
3. **Per-session auction state**, or remove public reset/control (AS-B12).
4. **Publish the data release** after licence review (AS-B7, AS-B8).
5. **Cold heavy query:** worker thread or precomputed legacy aggregates; cacheable historical responses (AS-B6, S8-1).
6. **Playwright smoke suite** over `docs/day07/route-api-matrix.json`, desktop and mobile, plus a visible-pane mobile check (CH10-G4, S7-5).
7. **Accessibility:** low-contrast and tiny-text classes, font loading (AS-B10, CH20) during the redesign.
8. **Data:** sourced styles for the 13 Unknown bowlers; the stub → registered mapping; reviewed rebuild for `avg_economy` (S6-B2, S6-D2, S6-C1).
9. **Tests:** decision-module unit tests (playing-XI, War Room, pressure); legacy SQL vs JSON fixture parity (CH10-G2, G3).
10. **Clean-up:** the dead `ingest-cricsheet-json.ts` and `pressure_state` SQL branch; stale root docs; the Scout "balls per wicket" label decision; Gemini via a server proxy (CH01-D5, D13, CH06-label, CH08-S7).

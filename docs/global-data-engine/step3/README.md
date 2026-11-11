# Step 3 — existing-site fixes

**Status (2026-10-10): applied to the working tree as two separate change sets, after approval. Validated. Not committed and not deployed.** See [§ Application record](#application-record-2026-10-10) at the end.

There are two separate change sets, each a patch file in this folder. Both were first written and tested in an isolated copy of the source outside the repository. No database schema is changed, no dataset is deleted, and no page is redesigned.

| Patch | Files | Fixes |
|---|---|---|
| [`economy-fix.patch`](economy-fix.patch) | 6 API-server files (192 lines) | Byes, leg-byes and penalty runs are charged to bowlers in every warehouse-backed economy figure |
| [`player-page-fix.patch`](player-page-fix.patch) | 2 web files and 2 scripts (279 lines) | The player page downloads a 33 MB file, and currently crashes on every load |

---

## A. Economy rate

### Root cause

The warehouse build (`scripts/src/update-ipl-data-v3.ts`) creates `is_bye`, `is_legbye` and `is_penalty` columns in `sqlite.db` but never sets them. They are 0 on all 295,732 rows.

Every warehouse module computes runs conceded as:

```sql
d.total_runs - CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 OR d.is_penalty = 1 THEN d.extra_runs ELSE 0 END
```

With the flags always 0, this subtracts nothing. Every bye, leg-bye and penalty run is charged to a bowler: **7,142 runs** across IPL 2008–2026, affecting 1,485 player-seasons.

The site's static JSON (built by `aggregate-ipl.ts` from the raw files) already uses the correct definition. So today the same bowler shows a different economy on the player page and in Advanced Stats.

### Affected code paths

| File | Feeds |
|---|---|
| `services/decision/ball-context.ts` | The `conceded` column of the column store, which feeds the match model, opposition map, player pool and pressure genome |
| `services/decision/player-profiles.ts` | Season lines, which feed the dugout, impact model, Auction War Room, insight feed and player summary |
| `services/decision/stats-engine.ts` | `/api/ask` bowling metrics (2 places) |
| `services/decision/weakness-detector.ts` | Bowling weakness reports |
| `services/stats-aggregator.ts` | Legacy `/api/stats/query` SQL path (7 sums, same flags) |

### Corrected formula

Defined once, as `RUNS_CONCEDED_SQL` in `services/decision/db.ts`:

```sql
d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs ELSE 0 END + CASE WHEN d.is_noball = 1 THEN 1 ELSE 0 END
```

That is runs off the bat, plus wides, plus one run per no-ball. Byes, leg-byes and penalties are not charged. It uses only columns that are actually populated.

**Residual:** 17 IPL deliveries that Cricsheet records as multi-run no-balls (2–5), or as a wide with penalty runs. The warehouse cannot separate their components, so the result is 30 runs short across 13 bowlers' careers. Fixing that would mean adding data to `sqlite.db`, which is outside this patch's scope.

### Baseline and results

- **Baseline:** [`baseline-economy-snapshot.json`](baseline-economy-snapshot.json), captured from the current source. It covers:
  - the column store
  - 13 `/api/ask` queries
  - season lines for 805 players
  - weakness reports and match-model phase lines for 10 named players
  - 3 legacy `/api/stats/query` runs
- **Patched snapshot:** [`patched-economy-snapshot.json`](patched-economy-snapshot.json).
- **Comparison:** [`economy-regression-results.md`](economy-regression-results.md). **PASS, 31/31.**
- **Control:** two baseline runs of the unchanged code agree on every check except the Cricsheet truth check, which the current code fails (430 bowlers over-charged). So every difference in the patched run is caused by the patch.

**Unchanged (byte-identical or same values)**

- **Column store:** balls, total runs, batter runs, legal balls, wickets, and every batter's runs.
- **Ask queries:** batting runs, powerplay strike rate, 2024 batting average and team win %.
- **Wickets, balls bowled, five-wicket hauls:** same rows, same order, same ranked values. Only the runs, economy, average and dot % columns shown alongside them change.
- **Season lines:** batting, balls bowled and wickets.
- **Batters:** weakness reports and match-model phase lines.
- **Legacy `/api/stats/query`:** every batter row.

**Changed, as intended**

- Runs conceded only decrease: 430 bowlers lower, none higher.
- Bowling dot % rises where a ball conceded only byes.
- Economy, bowling average and best figures move with runs conceded (e.g. "3/34" → "3/33").
- **Against an independent recount from the raw Cricsheet files,** 430 bowlers differ before the patch and 13 after (the residual above).

**What users would see**

| Measure | Before | After |
|---|---:|---:|
| IPL league economy, 2026 | 9.88 | 9.77 |
| IPL league economy, 2008 | 8.31 | 8.10 |
| Death-overs economy | 10.06 | 9.88 |
| Powerplay economy | 8.09 | 7.92 |
| Middle-overs economy | 7.95 | 7.83 |
| Rashid Khan, IPL career economy | 7.43 | 7.28 |
| Muralitharan, IPL career economy | 6.91 | 6.68 |

Rashid Khan's corrected 7.28 matches `global.db`, which is computed independently.

The most-economical list reorders slightly: Malinga moves from 7th to 5th, and Bumrah enters the top 10.

---

## B. Player page

### Root causes

1. **Crash.** In the working tree, `pages/player.tsx` declares `playerRecentMatches` at line 431, but `primaryTeam` reads it at line 400.
   - Every render throws `ReferenceError: Cannot access 'playerRecentMatches' before initialization`. I confirmed this in the browser on :3055.
   - `tsc` reports the same thing (TS2448, TS2454).
   - The code arrived in an uncommitted edit dated 9 Oct; the committed version doesn't have it.
2. **33 MB download.** The page fetches the whole of `player-recent-matches.json` (33,313 KB) to show one player.
   - The file holds 1,861 keys but only 817 distinct match logs: name aliases repeat the same data.
   - It is pretty-printed.

### Change

- **New `scripts/split-player-recent-matches.mjs`.**
  - Reads the full file without changing it.
  - Writes `public/data/player-recent-matches/index.json` (67 KB) and one compact shard per distinct log (817 files, 8.4 MB in total). Alias keys share a shard.
  - Keys keep the full file's order.
  - `generate-player-recent-matches.mjs` now runs it after writing the full file.
- **New `src/lib/player-recent-matches.ts`.**
  - `resolveRecentMatchesKey` is the page's existing lookup logic moved out unchanged: same steps, same order, now working on the index.
  - `usePlayerRecentMatches` fetches the index, then one shard. If the index is missing, it falls back to the full file.
- **`pages/player.tsx`.**
  - The inline fetch and lookup are replaced by one hook call.
  - That call is placed above `primaryTeam`, which fixes the crash.
  - No layout or UI change.

### Results

- **Parity:** [`player-page-regression-results.md`](player-page-regression-results.md). **PASS, 3/3.**
  - All 1,861 keys are present in the same order.
  - Every shard equals its array in the full file.
  - **3,439 slugs checked, 0 differences** between the old full-map lookup and index + shard. The slugs are every bio slug, every bio-name slug and every alias key.
- **Download per player page:**
  - 33.3 MB → a 67 KB index (fetched once and cached) plus one shard.
  - Shard sizes: median 4.2 KB, 90th percentile 29.7 KB, largest 103 KB. Kohli's is 86 KB.
- **Browser check on the patched copy** (an isolated preview, since removed):
  - `/players/virat-kohli` renders with no errors.
  - The page fetched `player-recent-matches/index.json` (67 KB) and one 86 KB shard. The full file was not requested.
  - Recent Performances shows 282 matches, with 675 runs in 2026 and 741 in 2024.
- **Typecheck:**
  - The web app had 13 errors before and 11 after.
  - The two removed errors are the `player.tsx` use-before-declaration errors.
  - The 11 remaining errors are pre-existing ones in unrelated 3D components.
  - No new errors.

### Not changed, and worth a separate decision

The lookup keeps its existing fuzzy fallbacks: surname-only and substring matching. These can pick another player's log when a slug has no exact key. The fallbacks were left identical so this patch changes no page's content; making them exact-only would be a separate change.

---

## Regression tests that ship with the patches

`scripts/src/step3/tests/step3-regression.test.ts`, run with `pnpm --filter @workspace/scripts run test:step3`:

1. Runs conceded per bowler equal a recount from the raw Cricsheet files, apart from the 17 deliveries above.
2. Everything independent of runs conceded matches the recorded baseline: the full snapshot plus the comparison above.
3. For every player, the per-player split returns exactly what the full file returned.

**On the current, unpatched tree all three fail, by design.** This was checked:

- Test 1: 417 bowlers' conceded runs are wrong.
- Test 2: the truth check fails.
- Test 3: the split is missing.

The supporting harness scripts are `economy-snapshot.ts`, `economy-compare.ts` and `recent-matches-check.ts` in `scripts/src/step3/`.

## To apply, after approval

From the repository root:

```bash
git apply docs/global-data-engine/step3/economy-fix.patch
```

```bash
git apply docs/global-data-engine/step3/player-page-fix.patch
```

```bash
node scripts/split-player-recent-matches.mjs
```

```bash
pnpm --filter @workspace/scripts run test:step3
```

Then:

- **API server:** rebuild it (`pnpm --filter @workspace/api-server run build`), because `start` serves `dist/`. Restart any running API.
- **Web:** the Vite dev server picks up the change; a production build copies `public/data/player-recent-matches/` automatically.
- **Deploy:** the 817 shard files and the index must be deployed with `public/data`. The full 33 MB file stays, as the fallback.

## To roll back

```bash
git apply -R docs/global-data-engine/step3/player-page-fix.patch
```

```bash
git apply -R docs/global-data-engine/step3/economy-fix.patch
```

Then delete the generated folder `artifacts/ipl-analytics/public/data/player-recent-matches/`, and rebuild the API server.

---

## Application record (2026-10-10)

The change sets were applied in the approved order, each with its own checks, and are not committed or deployed.

### Change set 1 — player page

Applied with `git apply player-page-fix.patch`, then `node scripts/split-player-recent-matches.mjs`.

| File | Change |
|---|---|
| `artifacts/ipl-analytics/src/pages/player.tsx` | +4 / −57: inline fetch and lookup replaced by one hook call, declared before `primaryTeam`. Line endings (CRLF) preserved. |
| `artifacts/ipl-analytics/src/lib/player-recent-matches.ts` | New file, 111 lines |
| `scripts/split-player-recent-matches.mjs` | New file, 41 lines |
| `scripts/generate-player-recent-matches.mjs` | +8: runs the split after writing the full file. This file was already untracked in git before Step 3. |

**Generated:** `artifacts/ipl-analytics/public/data/player-recent-matches/`, holding `index.json` (67 KB) and 817 shards (8.9 MB on disk). The full `player-recent-matches.json` (33.3 MB) is unchanged and kept as the fallback.

**Checks**

- **Before the patch:** the player page crashed with `ReferenceError: Cannot access 'playerRecentMatches' before initialization`, confirmed on `/players/jasprit-bumrah`.
- **After the patch,** in a clean browser tab on the test server:

| Page | Lookup path | Matches shown | Data downloaded (never the 33 MB file) | Errors |
|---|---|---:|---|---|
| `/players/virat-kohli` | direct key | 282 | index 67 KB + shard 86 KB | none |
| `/players/rg-sharma` | direct key | 281 | index + 82 KB | none |
| `/players/ar-patel` | direct key, 4 alias keys share the log | 177 | index + 58 KB | none |
| `/players/wanindu-hasaranga` | fallback → `pinnaduwage-wanindu-hasaranga-de-silva` (same player) | 37 | index + 12 KB | none |
| `/players/tejas-baroka` | one match | 1 | index + <1 KB | none |
| `/players/swastik-chikara` | no recent matches | 0 (empty state) | index only | none |
| `/players/prince-choudhary` | fallback (surname only) → `md-choudhary` | 10 | index + 3 KB | none, but see risk 3 |

- **Parity:** across all 3,439 slugs the results equal the old full-file lookup (`player-page-regression-results.md`).
- **Fallback audit** (`player-page-fallback-audit.md`):
  - 777 of 788 player bios resolve to their own key.
  - 2 resolve through a fallback: Hasaranga, correctly, and Prince Choudhary, incorrectly.
  - 9 have no recent matches.
- **Typecheck:** web app errors went from 13 to 11. Only the two `player.tsx` errors were removed, nothing new was added, and the remaining 11 are pre-existing ones in `cricket3d/`.
- **`/players/rohit-sharma`** shows "Player not found". That's the page's existing name-to-bio lookup, unchanged; Rohit's page is `rg-sharma`.

### Change set 2 — economy rate

Applied with `git apply economy-fix.patch`.

| File | Lines added / removed |
|---|---|
| `services/decision/db.ts` | +14 / −0 |
| `services/decision/ball-context.ts` | +4 / −4 |
| `services/decision/player-profiles.ts` | +2 / −1 |
| `services/decision/stats-engine.ts` | +3 / −3 |
| `services/decision/weakness-detector.ts` | +2 / −2 |
| `services/stats-aggregator.ts` | +7 / −7 |

All files are under `artifacts/api-server/src/`. No flag-based conceded expression remains, and the API typechecks with 0 errors.

**Checks**

- **Regression comparison:** **PASS, 31/31** (`economy-regression-results.md`). The applied code's snapshot is byte-identical to the one tested in the isolated copy.
- **Against the original Cricsheet deliveries:** every bowler's career runs conceded equals a recount from the raw files, **except 13 bowlers on 17 deliveries (net −30 runs)**. The economy problem is therefore **reduced, not completely resolved**. Each delivery and bowler is listed in [`economy-residuals.md`](economy-residuals.md).
  - 16 of the deliveries are multi-run no-balls the warehouse can't split.
  - 1 is a wide with 5 penalty runs.
  - Largest effect: 1.34% of one bowler's career runs conceded.
  - An exact fix needs the per-type extras stored in the warehouse: a schema/data change that would need separate approval.
- **API on the test server** (`api-before-after.md`): all 16 endpoints return 200 before and after.
  - **Identical:** the batting and results endpoints, Kohli's weakness report, the dugout franchise endpoint and the history overview.
  - **Changed, all corrected or derived from runs conceded:** economy, runs conceded, bowling average, bowling dot %, best figures, the bowling dimensions of Squad DNA, and War Room valuations (risk 2).
- **Pages checked in the browser,** all loading without errors and with every API call returning 200:
  - Advanced Stats bowling table. It now shows Narine 6.79, Bumrah 7.34 and Chahal 8.05.
  - The Ask page. "Best economy in the death overs since 2022" returns Narine 6.06 (218 runs, 36 overs). `global.db`, computed independently, gives exactly 218 runs, 216 balls and 6.06.
  - Squad DNA, Weakness Detector, Auction War Room, Opposition Map, Player Pool, Dugout (CSK) and the player pages above.

### Final validation

| Check | Result |
|---|---|
| `test:step3` (3 tests) | Pass. They failed before the patches, by design. |
| `test:global` (19 tests: global engine and scouting) | Pass |
| API server `tsc` | 0 errors |
| scripts `tsc` | 0 errors |
| Web `tsc` | 11 errors, all pre-existing and unrelated (2 removed, 0 new) |
| `global.db` | Unchanged: SHA-256 `79c75f78…` and timestamp the same before and after. The scouting engine was not modified or rebuilt. |
| IPL / global isolation | No API or web code references `global.db` or `lib/cricket-data/global` (checked by search). IPL queries read only `sqlite.db` and the site's own JSON. |
| `sqlite.db` | Not modified. Read-only access only; the file timestamp is still 28 Jul 2026. |

### Before / after performance

| Measure | Before | After |
|---|---|---|
| Player page | Crashed on every load | Renders |
| Recent-matches data per player page | 33.3 MB (34,112,447 bytes; 0.58 s even on localhost; ≈ 27 s at 10 Mbit/s) | 67 KB index (cached after first use) + one shard: median 4.2 KB, Kohli 86 KB, largest 103 KB |
| API warm latency | See `api-before-after.md` | Unchanged within run-to-run noise (e.g. the legacy `/api/stats/query` takes 3–5 s both before and after) |

### Remaining risks

1. **Economy residual.** 13 bowlers on 17 deliveries, net −30 runs (above). The fix is documented as reducing, not completely resolving, the discrepancy.
2. **Auction War Room market prices shift.** Some players' prices move noticeably although their own figures are unchanged. For example Rinku Singh goes from 917 to 702 lakh and Prince Simran Singh from 779 to 867.
   - The cause: the comparable-sales model re-selects its neighbours when other players' bowling numbers change.
   - Size of the shifts: batters' market prices change by a median of 3.4% and up to 39%.
   - This model sensitivity already existed; the fix exposes it.
3. **Player page fuzzy fallback.** `/players/prince-choudhary` shows Mukul Choudhary's 10 LSG matches through the existing surname-only fallback. The behaviour is identical to before the patch; making it exact-only is a separate decision.
4. **Builds not refreshed.**
   - `artifacts/api-server/dist` was not rebuilt, so any API started with `pnpm start` serves the old code until `pnpm --filter @workspace/api-server run build`.
   - `artifacts/ipl-analytics/dist` is also stale until the next `vite build`. That build will copy the shards automatically.
   - The test API (:5055) runs from source and has the fix.
5. **Deployment must include the shards.** The 817 files plus the index must ship with `public/data`. If they are missing, the page falls back to the full file and still works, just slowly.

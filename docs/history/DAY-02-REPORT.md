# Day 2 Report — Scout Lab correctness

**Date:** 2026-10-14 · **Scope:** Scout Lab correctness only. No redesign and no new features.
- **Statistical definitions unchanged:** league-relative index, k = 120 shrinkage, Wilson/normal intervals, mid-rank percentiles, roles-v1 and identity rules (a test pins k = 120 and the shrink formula).
- **Preservation:**
  - I read `DAY-01-REPORT.md` and re-verified every issue against current code before editing.
  - Edited files were backed up to the scratchpad first.
  - Nothing was committed or deleted.
  - `sqlite.db` and `global.db` were unchanged (timestamps `Oct 11 00:15` / `Oct 10 17:07`).

---

## 1. Defects found and fixed

| # | Defect (verified) | Root cause | Fix |
|---|---|---|---|
| 1 | **Bowling leaderboard inverted.** Rank 1 was the *most expensive* bowler (SN Thakur, economy 12.27, percentile 0). | `routes/scout.ts` sorted every metric's shrunk index descending. The comment “shrunk index is already direction-oriented” was false: a higher economy index means more runs conceded. The same bug affected batting dot % and bowling boundary % sorts. | New `sortRatings()` in `scout-service.ts` uses each metric's `better` direction. For metric sorts “desc” means *best first*; for volume sorts it means most first. Nulls sort last, and ties break on balls, then name. |
| 2 | **`minBalls` ignored in rankings.** The “Rankable (120+)” view listed 115-ball players, and *0-ball* rows appeared. The total counted every row (3,435). | The route never filtered by `minBalls`; the threshold was used only for percentiles. | Rows are filtered by `balls >= max(1, minBalls)` **before** search, sort and pagination, so the listed rows are exactly the percentile population. |
| 3 | **Role always “Unclassified”.** | The API sends `role: {label, inputs}`. The hand-written client type said `role: string`, and `RolePill` rejects non-strings. | Client types now mirror the API. `RolePill` accepts the object, and call sites were fixed. The corrected types surfaced 6 call-site errors at compile time, all now fixed. |
| 4 | **Profile percentiles meaningless.** Every metric showed 50th percentile with population 1, so strengths/weaknesses were always empty. | `competitionRatings()` dropped non-requested players **before** computing percentiles, so a one-player profile ranked against itself. | Percentiles are now ranked against the full eligible population, then narrowed to the requested players. Added `percentiles: false` for per-player lookups that never show a percentile (season lines, trends), keeping them fast. |
| 5 | **Compare percentiles meaningless** (population 2, so always 100/0). The radar mixed percentiles with shrunk indices on a 0–100 axis. | Same cause as #4, plus `minBalls: 0`. The radar fell back to `shrunk` when the percentile was null. | Compare ranks against the rankable population (≥ 120 balls). The radar carries percentiles only (null when unranked). Unranked players are listed under the chart, not plotted at 0. |
| 6 | **Compare picked an arbitrary league** (the first one found) for multi-league players. | `ratings.find()` | Uses each player's largest-sample league, shown in a new “League (largest sample)” row. |
| 7 | **Compare discipline mismatch.** The compare page defaulted to *bowling* while the API defaults to *batting*, and the leaderboard's “Compare Now” link didn't pass the discipline. Two batters were compared as bowlers. | Inconsistent defaults. | The page defaults to batting, and the link passes `discipline` and `phase`. |
| 8 | **CI labels and units wrong:** every interval was labelled “Wilson score”, and compare appended “%” to index-scale intervals. The page, banner and methodology copy said “95% Wilson … intervals” and “Empirical Bayes”. | Presentation drift from the service. | `ConfidenceIntervalBadge` now takes `metricId` and names the real method (Wilson for proportions, normal approximation for SR/economy). It states the interval is for the **raw index before shrinkage**, uses no % unit, and shows `∞` for an infinite upper bound. The column is now “95% CI (raw index)”. Copy says “shrinkage toward the league average (k = 120 balls, fixed)”. |
| 9 | **Wrong colour direction on the profile:** only economy was treated as lower-is-better; batting dot % and bowling boundary % showed reversed colours. | Hard-coded `key === "economy"`. | `isLowerBetter(discipline, metric)` comes from a client map that a test pins to the backend definitions. |
| 10 | **Invalid filters silently accepted:** an unknown `sortBy` left the list unsorted, and a role from the other discipline returned an empty list. | No validation. | Zod `superRefine` returns 400 with allowed values. `search` is capped at 60 chars. |
| 11 | **API typecheck failure** (`scout.ts:123`, `unique_name`). | Search referenced a field `Rating` doesn't have. `name` is already `COALESCE(unique_name, name)`. | Search uses `name`. **The API now typechecks with 0 errors.** |
| 12 | **Zero-ball rating cards on profiles.** | Rows existed for non-striker-only appearances. | Profile ratings filter `balls > 0`. |

---

## 2. Before / after (same capture script, in-process API, real `global.db`)

| Check | Before | After |
|---|---|---|
| IPL latest-season **bowling** rank 1–3 | SN Thakur (econ 12.27, **pct 0**), R Shepherd (11.92, 1.7), TU Deshpande (11.96, 3.3) | **SP Narine (6.65, pct 100)**, JO Holder (7.57, 98.3), B Kumar (7.95, 96.7); league economy 9.77 |
| Bowling list size (IPL latest season) | 125 rows (64 below 120 balls) | **61** (= percentile population) |
| All-league **batting** rank 3 | Sanvir Singh, **115 balls, “low”, no percentile** | MJ Owen (373 balls, rankable, pct 100) |
| Batting list size, all leagues, default 120+ | 3,435 | **1,171** |
| Smallest rows with `minBalls=120` | **0, 0, 0 balls** | 120, 120, 120 balls |
| Role on rows | `{label,…}` object → UI “Unclassified” | “opener”, “finisher”, “multi_phase”… rendered (UI: 0 “Unclassified”) |
| Profile Abhishek Sharma: percentile / population | 50 / **1** for every rating | IPL bat 97.6 / 289 · SMAT bat 93.8 / 370 · SMAT bowl 75.3 / 386 · IPL bowl 52.9 / 349 |
| Profile strengths / weaknesses | none / none | “Strike rate 171.3 vs league 144.8 (98th pct of 289)”, “Boundary % 26.5% vs league 19.9% (96th pct of 289)” |
| Compare Abhishek vs RK Singh (IPL latest season) | pct 100 vs 0, population 2 | **98.2 vs 35.7, population 57** |
| Compare radar dot % | 0 vs 100 | 60.7 vs 82.1 (true league percentiles) |
| Leaderboard interval tooltip | “95% Wilson Score…” for SR/economy | “95% normal approximation (league per-ball variance) for the raw index (before shrinkage; 100 = league average)” |

**Latency note (honest):**
- The profile endpoint now computes the full population for percentiles: about 2.0 s cold in-process, versus 1.2 s before.
- All-league rankings took 483 ms in the same run.
- This is the cost of correct percentiles; caching per (competition, window, phase) is the obvious next optimisation.

---

## 3. Test evidence

New file: `artifacts/api-server/test/scout-rankings.test.ts` (19 tests). Run with `pnpm --filter @workspace/api-server run test`.

| Group | Tests | What is asserted |
|---|---|---|
| A. Unit (synthetic fixtures, deterministic) | 7 | Bowling: lowest economy index first, `asc` gives worst first. Batting: highest SR first. **Every** lower-is-better metric of both disciplines sorts best-first. Nulls last in both orders; tie-break on balls then name. Volume sorts. Exact sort-key list per discipline. Frontend direction and CI-method maps equal the backend `metricDefs`. `SHRINK_K = 120` and the shrink formula are unchanged. |
| B. HTTP on real `global.db` | 9 | Bowling order and non-increasing percentiles; rank 1 at percentile 100, below league economy; list size equals population. Batting order; all rows rankable. `minBalls` 0/60/120/250/500 enforced, with totals shrinking monotonically and no zero-ball rows. Pagination continuity. Role filter (4 roles, object shape). Invalid role/sort/minBalls rejected (400). Profile percentile equals the leaderboard's for the same window, with population > 50. Compare population > 2 and radar equals percentiles. Compare picks the largest-sample league (AD Russell, 5 leagues). |
| C. Independent recounts (plain SQL on raw tables, no scout-service) | 3 | See below. |

The three recount tests:
- **Five players, last two IPL seasons:** Abhishek Sharma, RK Singh and AD Russell (batting); JJ Bumrah and SP Narine (bowling). Balls and runs (or conceded and legal balls) are recounted from `deliveries`, with super overs and dropped matches excluded and conceded = bat + wides + no-balls. League rates come from `competition_baselines`. Index and shrinkage are recomputed and must match to 1e-6.
- **IPL 2026 strike-rate percentile rebuilt from scratch:** the population (all batters with 120+ balls) and Abhishek's percentile must equal the API's.
- **Edge cases:** insufficient samples have no percentile; zero-ball rows have null value and percentile; a subset request ranks against the same population as the full list.

| Command | Result |
|---|---|
| `artifacts/api-server`: `tsx --test test/*.test.ts` (Day 1 + Day 2) | ✅ **35 / 35 pass** |
| `scripts`: `tsx --test src/global/tests/*.test.ts src/scout/tests/*.test.ts` | ✅ 23 / 23 pass (statistical unit tests unchanged) |
| `artifacts/api-server`: `tsc --noEmit` | ✅ **0 errors** (was 2) |
| `scripts`: `tsc --noEmit` | ✅ 0 errors |
| `artifacts/ipl-analytics`: `tsc --noEmit` | 11 errors, all pre-existing in `components/cricket3d/*`; **none in Scout files** |

---

## 4. Files changed

| File | Lines (vs pre-Day-2 backup) | Change |
|---|---|---|
| `artifacts/api-server/src/services/scout/scout-service.ts` | +57 −8 | `percentiles` option; full-population percentiles narrowed afterwards; `primaryMetricId`, `rankingSortKeys`, `sortRatings` |
| `artifacts/api-server/src/routes/scout.ts` | +43 −41 | Eligibility before sort/paginate; direction-aware sort; Zod validation of `sortBy` / `role` / `search`; `RANKABLE_BALLS = 120` for profile/compare percentiles; largest-sample league in compare; percentile-only radar; no zero-ball profile cards; type error fixed |
| `artifacts/ipl-analytics/src/lib/scout-api.ts` | +41 −5 | Types mirror the API (`RatingMetric`, `ScoutRole`, `ScoutRating`); `LOWER_IS_BETTER`, `isLowerBetter`, `CI_METHOD` |
| `artifacts/ipl-analytics/src/components/scout/scout-metric-badge.tsx` | +28 −16 | CI badge method/scale labels; `RolePill` accepts the role object; accurate tier tooltips |
| `artifacts/ipl-analytics/src/components/scout/scout-radar-chart.tsx` | +15 −4 | Unranked players listed, not plotted at 0; correct tooltip and caption |
| `artifacts/ipl-analytics/src/pages/scout-home.tsx` | +12 −12 | `name` field, CI column label, sort-order tooltip, accurate count text, compare link passes discipline/phase, methodology copy |
| `artifacts/ipl-analytics/src/pages/scout-player.tsx` | +5 −4 | Direction-aware colours for all metrics; CI labels; discipline shown beside roles |
| `artifacts/ipl-analytics/src/pages/scout-compare.tsx` | +15 −3 | Batting default; “League (largest sample)” row; CI metric ids |
| `artifacts/ipl-analytics/src/components/scout/scout-feature-banner.tsx` | 2 lines | Accurate shrinkage/interval wording |
| `artifacts/api-server/test/scout-rankings.test.ts` (new) | 326 | 19 tests |

---

## 5. Unresolved statistical limitations (unchanged by design)

1. **Cross-league comparability:** indices and percentiles are within each league. The all-league leaderboard still interleaves leagues by shrunk index; a 120 in SMAT is not a 120 in the IPL. No league-strength factor has been validated.
2. **The interval belongs to the raw index while the headline is the shrunk index.** It is now labelled honestly, not reconciled. A posterior interval for the shrunk value would need a method change, which is out of scope.
3. **SR/economy intervals use the league's per-ball variance**, which understates uncertainty for volatile players.
4. **`k = 120` is a fixed choice**, not estimated from the data (credibility weighting, not fitted empirical Bayes).
5. **Bowling type is unknown** for most non-IPL bowlers; there is no opposition-strength adjustment, and the SMAT Plate Group share is only reported.
6. **Trends** pool all earlier seasons and test several metrics without multiplicity correction.
7. **The CLI copy** `scripts/src/scout/service.ts` still has the old subset-percentile behaviour. It feeds the offline demos, not Scout Lab, but the two copies now diverge. Merge them into one shared module later.
8. **Wicket-rate label:** the displayed value is balls per wicket (lower is better), while the metric, index and percentile are wickets per ball (higher is better). The sort and percentile are correct; the label pairing remains awkward.
9. **Percentiles for the role-filtered view** are within that role (existing documented behaviour), so the same player can show different percentiles with and without a role filter.

---

## 6. Manual UI checks performed (test servers :5055 / :3055, 1440 px)

| Page | Observed |
|---|---|
| `/scout?discipline=bowling` | Rank 1 SP Narine (CPL, 3,129 balls, shrunk economy index 69.9, 100th %ile). Order ascending by economy index. Roles: “Multi Phase”, “Middle Specialist”… (0 “Unclassified”). Header “95% CI (raw index)”. Tooltip names the normal approximation. Count text “Showing 25 of 1283 entries with 120+ balls (one row per player per league; percentiles are within each league)”. |
| `/scout/player/f29185a1` (ratings tab) | “IPL · batting” cards with real percentiles. Dot % index 98.3 shown **green** (fewer dots = better); balls/dismissal 91.1 red. Strengths list populated. No “50th %ile” anywhere. |
| `/scout/compare?ids=f29185a1,0a509d6b` | Batting by default. Roles Opener / Middle Order; both rankable; League IPL / IPL; shrunk SR 116.9 (98th) vs 100.1 (58th). The bowling view (opened earlier) listed RK Singh under “Not plotted (fewer than 120 balls…)” instead of drawing a zero polygon. |
| Console | No errors on any Scout page. |

**Your manual steps:**
1. `/scout`: switch to Bowling. The top row should have the lowest economy and the 100th percentile.
2. Toggle the sort-order button; its tooltip reads “Best first” / “Worst first”.
3. Set Min Volume to 250. The smallest row on any page should have at least 250 balls.
4. Pick Role “Death Specialist”; every row's role pill reads Death Specialist.
5. Hover any 95% CI cell; the tooltip names Wilson or the normal approximation and “raw index”.
6. Tick two batters, then Compare Now. The page opens on batting, with a “League (largest sample)” row.
7. Open a player profile: percentiles vary (not all 50), and strengths/weaknesses appear for players with large samples.
8. At 375 px width, the leaderboard table scrolls horizontally inside its card (layout was not redesigned).

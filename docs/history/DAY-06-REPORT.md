# Day 6: Player identity and statistical correctness

**Date:** 2026-10-19
**Status:** **Complete, with documented limitations.**
- §A (identity), §B (Pacer/Spinner/Unknown), §C (metric definitions) and §D (data quality) are implemented and tested.
- The Step-3 baseline was re-recorded after the owner approved the §B reclassification.
- A first checkpoint was written at 09:30; this version completes §C and §D.

**Not touched:** `sqlite.db` (`ab897a8c…`) and `global.db` (`79c75f78…`) were unchanged before and after every test run. No data file was edited. Nothing was committed or deployed.

Evidence: `docs/day06/`. Scratch copies and tools live outside the repository in `../day06-work/` and `../scratch/day06/`.

---

## A. Player identity (`player-profiles.ts`)

### Defect

`NameIndex.find()` fell back to a unique **initial + surname** match across three sources: the bios, `players-data-updated.csv` and the 2026 auction list. Bios were matched by name rather than by registry id. Measured over all 1,141 warehouse players (`meta-before.json` vs `meta-after-A.json`):

| Case | Old value | Cause |
|---|---|---|
| N Saini (Nitin, `addbde6c`) | "RIGHT ARM Fast", pace | Auction row "Navdeep Saini" via "N + Saini" |
| Harmeet Singh (2) (`0bf15e52`, RR 2013) | Bansal's name, style and hand | CSV row "Harmeet Singh" = Harmeet Singh **Bansal** (`2a72fd4f`) |
| R Bishnoi (`4d5a1617`, **Rajesh** Bishnoi, RCB 2009) | Ravi Bishnoi's full name and leg-spin | Bio `ravi-bishnoi` has the same `playerName` "R Bishnoi" |
| FH Allen (Finn Allen) | "Slow Left arm Orthodox" | Initial match |
| Aleem Dar (umpire row), Ashutosh Sharma and others | Pace styles | Auction initial matches |
| PWH de Silva | country null → **treated as Indian** (`overseas: false`) | His verified bio was not used |

### Fix

- Bios resolve by **registry id**: `players.cricsheet_id` → the identity index (`player-recent-matches/index.json`). Failing that, the single unverified bio that a squad row of its **own franchise** maps to the written name. These are the Day 4.6 rules, reusing `buildBioLookup`.
- Name-keyed sources (the style CSV, squad rows, stumpings) are used **only by exact written name, and only when that name denotes one registry id**. The auction list is matched by **exact full name** only.
- The 176 squad stubs (`cricsheet_id` `json:N`, 2026 squad members without an IPL appearance) are matched by their exact full display name, as before.
- **The initial+surname fallback is removed.** An unresolved field stays null / `unknown`.

### Result (`meta-diff-A.json`, attribution in `meta-diff-A-attribution.json`)

| Measure | Before | After |
|---|---:|---:|
| Players with any metadata change | — | 199 of 1,141 |
| `bowlingType` pace / spin / unknown | 482 / 420 / 239 | 472 / 407 / 262 |
| Removed values that came from initial+surname matches | — | 24 bowling styles, 12 batting hands |
| Removed values from **unverified** bios matched by exact name (VK Sharma, Tanay Thyagarajan, Harmeet (2)…) | — | 4 styles, 3 hands (Day 4.6 policy: unverified bios are not used) |
| Keeper flag added (squad stubs now exact-matched to the auction's `WICKETKEEPER`: Jamie Smith, Kusal Mendis, Kusal Perera, Tom Moores, Kyle Verreynne…) | — | 17 |
| `fullName` now set (stubs show their own name; Connolly, Finn Allen, Rajesh Bishnoi via verified or squad-mapped bios) | — | 176 |
| Hasaranga (331): country / overseas | null / false | **Sri Lanka / true** |

**Note for the owner:** the 17 new keeper flags and Hasaranga's overseas flag feed the **Playing-XI optimizer's** keeper and four-overseas rules.

### Harmeet Singh: separated by evidence

Source: Cricsheet registry blocks and `people.csv`.
- `2a72fd4f` (Cricinfo 391128) is **Harmeet Singh Bansal**: Deccan 2009–11, Kings XI 2012–13. He is the only verified bio (Right arm Medium).
- `0bf15e52` (Cricinfo 422847) is a **different** Harmeet Singh: Rajasthan Royals 2013.

The warehouse already stored them separately (player 761 / 930). Only the name-based lookups merged them. 930 now has no inherited data, and his style is **Unknown**, because the repository has no record of his own.

### Also fixed: slug resolution

`resolvePlayerId("wanindu-hasaranga")` became ambiguous: it matched the registered PWH de Silva (331) and his 2026 squad stub (966). One registered hit plus stubs now resolves to the registered player. Before Day 6 this slug opened the **empty stub**; it now opens his 37-match record. The 2026 LSG sale now attaches to player 331.

---

## B. Bowling classification (Pacer / Spinner / Unknown)

### Defects

1. `stats-aggregator.ts` `getBowlerType()`:
   - A bio with an empty style was classed **Pacer**.
   - A player with no bio was classed from a **name-substring list** ("ahmed", "ali", "bishnoi", …), defaulting to **Pacer**.
   - The filter id sets put every non-spinner (including non-bowlers) into `pacerIds`.
2. `team-analytics.ts` team `bowlerSplit` and venue `surface`: `CASE WHEN spinner THEN 'Spin' ELSE 'Pace'`. Unknown bowlers were counted as pace.
3. Decision layer: unknown type was treated as pace in five places:
   - `player-pool` (batter vs-pace split, bowler pace/spin feature, archetype label);
   - `opposition-map` (death vs-pace);
   - `squad-dna` (`spin_sr`, `pace_sr`, `spin_econ`, `pace_econ`, `spin_share`);
   - `match-model` (simulator batter multipliers);
   - `strategy-sim` (attack label).

### Fix

- `classifyBowlStyle()`: an empty or unrecognised style → **Unknown**.
- Each player resolves by **registry id**: their verified bio's style, else the decision layer's evidence (identity-resolved styles, then recorded ball speed ≥ 6 deliveries), else Unknown.
- JSON paths resolve each delivery's bowler through **that match's registry block**, so the two Harmeets are told apart per ball.
- The name-substring list is **removed**. Labels and filter id sets share one per-player rule (`bowlerTypeForPlayer`).
- The SQL splits get an `'Unknown'` bucket that the response omits. The response shape is unchanged (still Pace and Spin rows).
- Decision modules:
  - unknown is a third bucket in `player-pool`;
  - it is excluded from the vs-pace / vs-spin splits in `opposition-map` and `squad-dna`;
  - the simulator averages the batter's pace and spin multipliers for an unknown bowler;
  - labels say "Unknown" / "bowling type unknown".
- Frontend: the types allow `"Unknown"`. `player.tsx` drops the radar's "Spin Profile" axis for an unknown type (it used to show 0, which reads as pace). The matchup caption says "bowler of unknown type".

### Measured impact (pre-Day-6 baseline from the untouched `day055-clean` copy vs after; `analysis-6b.json`)

| Output | Before → after |
|---|---|
| Statistics in `/api/ipl/stats/query` (balls, runs, wickets, economy, matches) | **0 changed** |
| `bowlerType` labels changed | 17. Pacer → **Spinner**: Shivang Kumar, Yash Raj Punja, PR Veer (left-arm spinners, from verified or squad-mapped records). Pacer → **Unknown**: Gurjapneet Singh, Raghu Sharma, Auqib Nabi, SR Dubey, Abhinandan Singh, B Muzarabani, GF Linde, DA Payne, RS Ghosh, T Vijay, BJ Rohrer, Harmeet Singh (2), Ishan Kishan (1 ball) |
| "Pacer" filter, all time | 367 → 351 bowlers; 182,902 → 181,852 balls |
| "Spinner" filter, all time | 209 → 212 bowlers; 101,728 → 102,154 balls |
| "Pacer" filter, 2026 | 87 → 74 bowlers (2026 has no speed data, so unknowns cluster there) |
| MI / CSK / KKR pace balls (spin unchanged except CSK +12) | 23,055 → 22,965 / 18,416 → 18,235 / 17,653 → 17,534 |
| Wankhede / Chepauk surface split | Pace −96 / −133 balls; spin +24 / +30 |
| CSK squad DNA | `spin_share` 32.4% → 36.3%, `pace_sr` 149.6 → 152.6 |
| KKR squad DNA | `pace_sr` 146.4 → 141.8, `spin_share` 51.4% → 50.2% |
| Deliveries by unknown-type bowlers | 624 of 284,630 legal balls (0.22%); **3.56% of 2026** |

**Known limitation:** 13 bowlers are Unknown only because the repository has no recorded style or speed data for them. Many are obviously pacers or spinners in reality. Adding **sourced** styles to their bios would reclassify them. I did not guess. Example: "Auqib Nabi" is not "Auqib Dar" in the auction file by any rule I could verify, and SR Dubey's old Leg-spin came from a different Dubey.

---

## C. Statistical definitions

| # | Metric | Old definition | Correct definition | Affected | Validation | Action |
|---|---|---|---|---|---|---|
| C1 | `team_intelligence.avg_economy` (`compute_analytics.ts`) | `SUM(innings.runs) / SUM(innings.overs)`, with overs in **cricket notation** (19.4 = 19 overs 4 balls) read as a decimal | Runs × 6 ÷ legal balls, with overs converted to balls | Warehouse column only. **No API endpoint or UI reads it** (only the drizzle schema declares it) | On a copy, the corrected expression equals an independent recount from `deliveries` for **all 19 teams** (balls and runs identical). The old value overstated every team by 0.02–0.05 rpo (CSK 8.28 → 8.25, RCB 9.59 → 9.55) | **Fixed in the script.** The production column keeps the old values until a reviewed rebuild of a copy (`compute_analytics --allow-production`), which is your decision. Test: `day6-metrics` #1 |
| C2 | `/api/ipl/overview` (handbook finding #11) | Live counts mixed with **literals**: second innings 150, batting first 43.2% / chasing 56.8%, dot 34.43%, boundary 16.62%, venues 59, batters 703, bowlers 550 | All computed from the warehouse. Rates are over legal balls; win shares are over matches with a winner (super-over results counted, 9 no-results excluded); `boundaryPct` = boundaries per 100 legal balls | `/api/ipl/overview` (not read by the web app today; only the generated client declares it) | Live: second innings **155**, batting first **45.5%** / chasing **54.5%** (1,234 decided), dot **35.57%**, boundary **17.65**, venues **60**, batters **736**, bowlers **576**. Each equals an independent SQL recount | **Fixed.** The JSON last-resort fallback had swapped fours and sixes (34,063 / 22,507 vs real 34,447 / 15,779) and invented rates. It now holds only the verified counts (it never runs here, because `overview.json` exists). Test: `day6-metrics` #2 |
| C3 | `boundaryPct` | Two meanings in one response. Batters' and matchups' value = **share of runs** in boundaries. Bowlers', scoring zones' and decision/team endpoints' value = **boundaries per 100 legal balls**. Both labelled "Bdry%" | Both are legitimate. Keep the values (the sprint forbids changing formulas for preference; `dominanceIndex` takes the run share as an input) and make the meaning explicit | `/api/ipl/stats/query` batters, `/api/ipl/matchup`, Stats page table and matchup card | Every 2025 batter row: `boundaryRunPct` = round((4×fours + 6×sixes) / runs × 100) = `boundaryPct` | Run share now comes from one helper (`boundaryRunPct()`, previously 4 copies). New explicit field `boundaryRunPct`. UI: header tooltips ("Share of the batter's runs scored in fours and sixes" / "Boundaries conceded per 100 legal balls"); the matchup card says "Runs in boundaries". Test: `day6-metrics` #3 |
| C4 | Balls per over | `/ 6` throughout (Scout, economy, strike rate) | Correct when every over has 6 balls | All six leagues | `global.db`: all 3,309 matches have `balls_per_over = 6`. The Scout phase SQL already handles 5-ball overs | **Guard test** (`day6-metrics` #4): fails if a 5-ball competition (e.g. The Hundred) is ever added |
| C5 | Runs conceded | Duplicated expressions (handbook) | One expression | API constant, `stats-aggregator`, `compute_analytics` | Step-3 "runs conceded: one expression in the API constant, stats-aggregator and compute_analytics.ts" passes; conceded = Cricsheet recount for every bowler | Verified, no change needed (fixed on Day 4.5) |
| C6 | Hardcoded league benchmarks: `/api/ipl/toss-analysis`, `/api/ipl/phase-analysis` | **Pure literals.** Their JSON files (`toss-analysis.json`, `phase-analysis.json`) do not exist, so both endpoints always served invented figures. Examples: powerplay dot rate 31.8%, middle 38.6%, death 25.3%; batting first 43.2%; toss winner wins 51.8% | Computed from the warehouse (main innings only; legal-ball rates; wickets exclude retired hurt / not out; venue variants merged by canonical name) | Both endpoints (not read by the web app today) | Real values: powerplay dot **46.3%**, middle **31.8%**, death **28.4%**; run rates 8.09 / 7.95 / 10.06; wickets per match 2.88 / 4.59 / 4.33; batting first **45.5%**; chose to field **66.4%**; toss winner won **51.4%**; Wankhede 132 decided matches | **Fixed.** Without a warehouse they return nulls, never invented numbers. Test: `day6-metrics` #5 |
| C7 | CI, shrinkage, percentile labels | Scout labels and units wrong (handbook #3) | — | Scout Lab | Day 2 fixed these, with `scout-rankings.test.ts` (19 tests, passing) | Verified, no change |
| C8 | Zero-ball and missing-vs-zero values | Several legacy rate fields return 0 when the denominator is 0 (`econ`, `sr`, `boundaryPct`) instead of null | Null when undefined | Legacy stats rows | The legacy bowler list already filters to ≥ 1 ball. Batter rows with 0 runs report `boundaryRunPct` 0 | **Open, deferred.** Changing 0 → null across the legacy response is a contract change for the Stats page (sorting, `toFixed`). Recommended for the redesign's API v2 |

## D. Data quality

**Completeness audit** (`docs/day06/data-quality-audit.json`, read-only, after §A):

| Field | Players | Weighted by balls |
|---|---|---|
| Country (players who batted) | 544 / 736 (73.9%) | 92.4% of balls faced |
| Batting hand | 728 / 736 (98.9%) | 99.96% |
| Bowling style / type (players who bowled) | 563 / 576 (97.7%) | 99.78% of legal balls |
| `players` table: country/role placeholders; `batting_style` / `bowling_style` | 793 / 1,141 placeholders; styles empty on **all** rows | The app fills these from bios, the CSV and the auction list (§A). Unknown values are **kept unknown**; the decision layer treats an unknown country as Indian, a documented heuristic (`history` health panel) |
| Delivery commentary row | 293,652 / 295,732 deliveries (99.3%) | — |
| Delivery length / line / zone / shot | 59.4% / 57.6% / 66.0% / 64.3% | Length coverage rises from ~40% (2008–12) to 70–78% (2020–26). The rest is genuinely undescribed, and callers skip nulls (Day 4) |
| Ball speed | 2.4% of deliveries (max 7% in 2022–23) | Why the speed-based bowling type covers few bowlers |
| `deliveries.delivery_type` / `scoring_area` empty | 95,511 / 100,451 of 295,732 | Same source (commentary) |

**Duplicate squad stubs:** 2026 squad stubs that duplicate a registered player (same verified full name). They were **reported, not merged**: the stubs carry no deliveries, and merging rows is a warehouse change.

| Stub | Registered player |
|---|---|
| Wanindu Hasaranga (966) | PWH de Silva (331) |
| Kumar Kartikeya Singh (978) | K Kartikeya (384) |
| Kusal Mendis (985) | BKG Mendis (546) |
| Naveen Ul Haq (1013) | Naveen-ul-Haq (431) |

Slug resolution prefers the registered player (§A). The Playing-XI optimizer could see both rows of the same person. Recommended: a reviewed `current_squad` mapping from stub to registered id, on a copy.

**Unsafe legacy scripts.** Eight scripts could write to the production `sqlite.db` with no guard:
- `update-ipl-data.ts` (the root `pnpm run update-ipl-data`);
- `migrate_players.ts`, `migrate_matches.ts`, `migrate_deliveries.ts`;
- `schema-setup.ts`, `populate-current-squad.ts`, `create-matchups-table.ts`;
- `ingest-kaggle-data.ts`.

The fix:
- **New `scripts/src/lib/warehouse-guard.ts`.** Every one of these scripts now refuses the production database unless `--allow-production` is passed. Scripts with a fixed path are checked against that path, not `CRICFIELD_DB_PATH`, which they ignore.
- **`update-ipl-data.ts` is disabled outright** and points to `update-ipl-data-v3.ts`. Verified in its code: it credits retired out, handled the ball and timed out to the bowler, and counts retired hurt as a wicket.
- **Verified by running:** four scripts exit 1 with the refusal message, and the `sqlite.db` hash is unchanged.
- **Tests:** `day6-warehouse-guard` (static: every warehouse-writing script is guarded; the legacy script's guard runs before it opens the database).
- **Dead code:** `parse-cricsheet-csv.ts` and `update-ipl-data-v2.ts` do not write. `artifacts/api-server/src/data/ingest-cricsheet-json.ts` is dead (imported nowhere). Both are left in place and documented, not deleted.

**Reconciliation stays green:** Step-3 "production warehouse: matches the source exactly", runs-conceded recount and delivery sequencing all pass (§5).

---

## 4. Files changed (Day 6)

| Area | File |
|---|---|
| Identity | `artifacts/api-server/src/services/decision/player-profiles.ts` (registry-first metadata; initial+surname removed; one raw pass, `loadRawIndex`); `decision/player-summary.ts` (slug: registered player over a duplicate stub) |
| Bowler type | `services/stats-aggregator.ts` (`classifyBowlStyle`, `bowlerTypeById`, `bowlerTypeForPlayer`, per-match registry, id sets); `services/team-analytics.ts` (2 SQL splits) |
| Decision layer | `decision/player-pool.ts`, `opposition-map.ts`, `squad-dna.ts`, `match-model.ts`, `strategy-sim.ts` |
| Metrics | `services/stats-aggregator.ts` (overview, toss and phase computed live; `boundaryRunPct` helper and field; literal fallbacks removed); `scripts/src/compute_analytics.ts` (team economy) |
| Script safety | New `scripts/src/lib/warehouse-guard.ts`. Guard calls added to `update-ipl-data.ts` (disabled), `migrate_players.ts`, `migrate_matches.ts`, `migrate_deliveries.ts`, `schema-setup.ts`, `populate-current-squad.ts`, `create-matchups-table.ts`, `ingest-kaggle-data.ts` |
| Frontend | `ipl-analytics/src/lib/aggregates.ts`, `pages/player.tsx` (Unknown type), `pages/stats.tsx` (boundary labels); `src/index.css` (`@theme inline`, the separate theme task) |
| Tests (new) | `test/day6-identity.test.ts` (6), `day6-bowler-type.test.ts` (3), `day6-metrics.test.ts` (5), `day6-warehouse-guard.test.ts` (2) |
| Test harness | `scripts/src/step3/tests/step3-regression.test.ts` (new baseline path); `scripts/src/step3/economy-compare.ts` (the `boundaryRunPct` alias is accepted only when it equals `boundaryPct`) |
| Baseline | New `docs/global-data-engine/step3/baseline-post-day6b-snapshot.json`; refresh note `docs/data-repairs/2026-10-19-day6b/` |
| Tools (new) | `src/scripts/day6-meta-snapshot.ts`, `day6-unknown-share.ts`, `day6-toss-phase.ts`; `smoke-db.ts` (`SMOKE_SET=day6`) |
| Config | `.claude/launch.json`: the dev API opens the warehouse read-only |

## 5. Tests (final)

| Suite | Result |
|---|---|
| API (`pnpm --filter @workspace/api-server test`) | **64 / 64** (48 existing + 16 new) |
| Global / scout (`test:global`) | **23 / 23** |
| Step-3 (`test:step3`) | **27 pass, 0 fail, 1 skip** (optional `CORRECTED_DB`). Includes "production warehouse matches the source exactly", the runs-conceded recount and delivery sequencing |
| Root typecheck (`pnpm run typecheck`) | **0 errors** |
| Warehouse hashes before / after all runs | `sqlite.db` `ab897a8c…`, `global.db` `79c75f78…`, unchanged |

Logs: `docs/day06/api-tests-final.log`, `step3-final.log`, `global-final.log`, `typecheck-final.log`.

**Not verified in a browser on Day 6:** the player radar without the Spin Profile axis, and the new Stats tooltips. Day 7's browser pass covers both pages.

## 6. Open after Day 6

- **Production `team_intelligence.avg_economy`** still holds the old values. The script is fixed; a reviewed rebuild of a copy is needed. The column is not served.
- **13 bowlers** are Unknown for lack of a sourced style or speed data. Adding styles to their bios would reclassify them.
- **Four duplicate squad stubs** (§D) need a reviewed stub → registered mapping.
- Legacy zero-denominator rates return 0, not null (C8, deferred to the API redesign).
- **Country coverage** is 73.9% of players (92.4% of balls). An unknown country is treated as Indian, a documented heuristic.

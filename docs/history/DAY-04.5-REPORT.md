# Day 4.5: Approved data repair and verification

**Date:** 2026-10-14

**Scope (conditionally approved):** C1–C7 warehouse corrections, P1–P2 bio merges, the P3 duplicate collapse, P4 squad corrections and P5 aliases.

**Outcome:**
- **Warehouse:** C1–C7 are applied to production after every safety check passed. Production now equals the Cricsheet source on every checked table.
- **Identity:** P2, P3, P4, P1a and P1b are applied. Three of the six P5 aliases are applied. **P1c and three P5 aliases were applied, failed verification, and were reverted** under the stop-on-failure rule. One identity guard test fails on a duplicate that P4 exposed. These cases need your decision (§11).

No UI was redesigned, no features were added, nothing was deployed, and no commit was made.

---

## 1. Safety checks performed, in order

| Step | Check | Result |
|---|---|---|
| 1 | Current state | `sqlite.db` `944b2c92…`, `sqlite.db-wal` `e918c707…` (27 MB of committed pages), `global.db` `79c75f78…`: identical to the end of Day 4. No API, tsx or vite process was running; the listening ports belong to MySQL, Ollama and desktop apps. |
| 1 | Artifacts still match the repository and source | Day 4 production pins re-run: **pass** (8 spells, 19 innings, 531 + 55 batting rows, −30 / +68). Source hashes recorded: raw JSON (1,243 files) `05386ef4…`, `ipl_csv` `0eeefab7…`. |
| 2 | Backups | See §9. |
| 3 | Fresh corrected build | Built from current production with `build-corrected-db.ts`; the Day 4 copy was not reused. Result: 0 spell / innings / batting / missing differences, exact expression matches the source on 295,732 / 295,732 deliveries. |
| 4 | Derived analytics | `compute_analytics.ts` run on a second copy via `CRICFIELD_DB_PATH`. Every table's differences from production are **identical** to Day 4's expected differences (§4), and the fresh result is **logically identical** to the Day 4 copy, so the build is deterministic. |
| 4 | No unplanned change | Fingerprint of production vs the final copy: exactly the 12 expected tables differ. `players`, `delivery_commentary`, `player_matchups`, `insight_clicks` and the other 9 tables are byte-identical. |
| 5 | Real API, isolated | The actual Express app was run in-process on an ephemeral port, with `CRICFIELD_DB_PATH` on copies, over 39 endpoints. Run (a): production copy with current code. Run (b): final copy with the exact SQL. **0 server errors.** Every difference matches an approved correction (§5). |
| 11 | Rollback tested **before** replacement | Row-level `rollback.sql` on the corrected copy, and whole-file restore of the backup, **both** gave a database logically identical to production (§9). |
| 6 | Replacement | Done with the API stopped (§2). |
| 6 | Post-install verification | `integrity_check` ok. Fingerprint equals the final copy. Reconciliation: **0** differences. WAL empty. |
| 7 | Exact SQL activated, tests and baselines refreshed | Only after independent confirmation (§3, §6). |
| 8 | Identity corrections | Applied with backups and per-player evidence; unrelated profiles checked (§7). |
| 10 | Full suites, typechecks, builds, smoke test on the installed database | §8. |

---

## 2. Exact corrections applied to production

The corrections are logged in `../day45-work/corrections/corrections.json`, every old → new value with its source delivery; the Day 4 report has the full tables. The installed file is the fresh corrected build (C1–C7) with derived tables rebuilt by the fixed `compute_analytics.ts`.

| Id | Table.column | Rows | Change |
|---|---|---:|---|
| C1 | `fact_bowling_spells.wickets` | 6 | −1 each (retired out: Ashwin, Taide, Sai Sudharsan, Tilak Varma, Conway, Mhatre) |
| C2 | `fact_bowling_spells.runs_conceded` | 2 | −5 each (penalty runs: Ojha 2008, Malinga 2014) |
| C3 | `innings.wickets` | 19 | −1 each (retired hurt) |
| C4 | `deliveries.is_bye / is_legbye / is_penalty` | 5,153 | 0 → 745 / 4,406 / 2 |
| C5 | `fact_batting_innings.was_dismissed` (+ new rows) | 531 + 55 | 514 non-striker dismissals, 17 retired hurt; 55 batters out without facing |
| C6 | `dismissals.fielder_id` | 10,721 | NULL → fielder (182 remain NULL: no fielder named in the source) |
| C7 | `matches.winner_id` | 16 | NULL → super-over winner (9 genuine no-results remain NULL) |
| — | Derived tables | §4 | Rebuilt |

**Replacement procedure (executed):**
1. Re-checked that no API was running and that production still matched the backup.
2. Moved `sqlite.db`, `sqlite.db-wal` and `sqlite.db-shm` aside to `../day45-backups/replaced-live-files/`. A rename fails on Windows if any process holds a file, so this also served as a lock check.
3. Copied in the checkpointed final file. It has no pending WAL, so nothing needs replaying.
4. Verified the result in place (§1).

---

## 3. Before / after checksums and reconciliation totals

| File | Before | After |
|---|---|---|
| `sqlite.db` | `944b2c92046611a10a1642554e44df372e630f1962386c0ea854600e87346149` | `ab897a8ccdc590ca64b0512fd3c787a48dbd763779a6aeda76ef677b424309ac` |
| `sqlite.db-wal` | `e918c707553f11b2…` (27,175,552 bytes) | empty (0 bytes) |
| `global.db` | `79c75f780ebe4d9e…` | unchanged |

`ab897a8c…` is the same as the verified `../day45-work/sqlite.final.db`. Full hashes are in `docs/data-repairs/2026-10-14-day45/db-hashes-end.txt`.

| Reconciliation vs raw Cricsheet (1,243 matches) | Before | After |
|---|---:|---:|
| Deliveries matched | 295,732 | 295,732 |
| Spells differing | 8 | **0** |
| Innings differing | 19 | **0** |
| Batting rows wrong / missing | 531 / 55 | **0 / 0** |
| Bowler-phase rows (`player_phase_stats`) differing | 24 | **0** |
| Runs conceded by the API expression vs truth (394,585) | −30 (17 deliveries) | **0** (`RUNS_CONCEDED_SQL` = exact, 0 mismatching deliveries) |
| Bowlers whose API conceded total ≠ source (Step-3 truth check) | 13 | **0** |
| Matches without a winner | 25 | 9 (all "no result") |
| Fielded dismissals with a fielder | 0 | 10,721 / 10,903 |
| Total rows (25 tables) | 683,685 | 683,740 (+55 batting rows) |

---

## 4. Derived-table differences (production → installed)

These are identical to the Day 4 expectation, row for row (`../day45-work/derived-diff.json` vs `docs/data-repairs/2026-10-14-day4/derived-diff.json`).

| Table | Rows | Changed | Columns |
|---|---:|---:|---|
| player_career_stats | 804 | 23 | economy 19, bowling_average 22, best_figures 4 |
| player_team_stats | 1,631 | 23 | economy |
| player_season_stats | 3,337 | 28 | economy |
| player_phase_stats | 2,193 | 24 | bowling_runs 24, bowling_economy 23 |
| player_matchups | 31,370 | 0 | — |
| venue_intelligence | 60 | 13 | batting-first / chasing win % (C7) |
| team_intelligence | 19 | 11 | wins 7, losses 10, win_pct 10 (C7) |
| auction_roi | 0 | 0 | (empty in production too) |

---

## 5. API differences (real app; production copy and old code → installed database and new code)

Of 39 endpoints, 29 are byte-identical. That includes all scorecards, batting (Kohli), top batters and bowlers, matchups, scout, weakness, pressure, and the 2025 stats (no residual delivery falls in 2025). The differences:

| Endpoint | Difference | Confirmed against |
|---|---|---|
| `/api/history/overview` | "Bowling scorecards reconcile": *6 wickets apart* → **Exact match**. "Fielders": *0% recorded* → **98.3%**. | C1; C6 (10,721 / 10,903) |
| `/api/ipl/overview` | totalWickets 14,705 → 14,686 | C3 (−19) |
| `/api/ipl/team-analytics` (MI, DC) | MI: no-result 4 → 0, W/L +2 / +2. DC: no-result 9 → 4, W/L +4 / +1. | C7. Source super-over results for each franchise. |
| `/api/ipl/venues`, venue analytics | Batting-first / chasing / toss win %; average wickets per innings | C7, C3 |
| `/api/ipl/stats/query` (all time) | Bowler econ / avg / trueEconomy / best for the residual bowlers | Exact expression (C4) |
| `/api/players/39`, `/123`, `/220/summary` | Bumrah +1 run conceded (2017 two-run no-ball). Malinga: 3 seasons. Archer: phase runs only. | §3 residual deliveries; `player_phase_stats` |

**Code change needed for isolation (default unchanged).** `decision/db.ts` gained `warehousePath()`, which honours `CRICFIELD_DB_PATH` like `@workspace/db`. `insights.ts` and `match-card.ts` use it too. That way one variable points the whole API at a copy, which matters because `insights.ts` *writes* click counts to the warehouse.

---

## 6. Activation, tests and baselines (step 7)

### `RUNS_CONCEDED_SQL` switched to the exact expression

The switch was made in `decision/db.ts`, and in the **7 inline copies** in `stats-aggregator.ts`, which repeated the old formula rather than importing it. `RUNS_CONCEDED_EXACT_SQL` remains as an alias. One test now enforces a single expression in the API constant, `stats-aggregator` (7 sites) and `compute_analytics` (4 sites).

### Reconciliation test

`warehouse-reconcile.test.ts` now pins production at **zero** discrepancies, with the exact expression equal to the source on every delivery. The superseded formulas are still checked at −30 / +68, as a check on the recount itself.

### Step-3 regression

The first test no longer exempts the 13 "unsplittable" bowlers: every bowler must equal the source.

### Baseline refresh

The 2026-10-10 baseline is kept as history. The new baseline is `baseline-post-day45-snapshot.json`. It was captured **after** the database swap, the activation and the final identity state, and installed only after comparison with the old baseline (33/34). The one difference, `results_win_pct`, was confirmed for **all 14 franchises**:
- Δwins and Δlosses equal that franchise's super-over wins and losses in the source;
- Δno-result = −(Δw + Δl);
- matches played are unchanged.

Metadata changes are the same 89 fields / 25 players verified on Day 3. Details: `docs/data-repairs/2026-10-14-day45/baseline-refresh.md`.

---

## 7. Player identity changes (step 8)

All changes were made by `scripts/src/day4/apply-identity-proposals.ts`:
- every precondition is re-verified against the register (`global.db`, read-only) and the raw IPL files, and any failure aborts the run;
- merges fill only empty fields and never overwrite existing values;
- the per-player evidence and changes are in `docs/data-repairs/2026-10-14-day45/identity-applied.md` / `.json`;
- backups are in `docs/data-repairs/2026-10-14-day45/backup/` (both bio files, both squad files, the alias file, the 795-file shard index and the legacy JSON).

### Applied

| Id | Change | Verified evidence |
|---|---|---|
| P1a | `arshad-khan-(2)` folded into `arshad-khan` | Both resolve to 12314277 (27 IPL apps). No field was empty on the kept bio, so nothing was filled; differing values listed. |
| P1b | `na-saini` folded into `navdeep-saini` | Both resolve to 21d4e29b (34 apps). The optional `playerName → "NA Saini"` change was **reverted**: it changed the page heading to "NA Saini". |
| P2 | `abhishek-porel` folded into `abishek-porel` | Squads 2025 and 2026 DC map "Abhishek Porel" → "Abishek Porel" (ad3b6e95, unique, 36 apps). `country` filled. `image` was a Cricinfo **web page URL**, replaced by the 2026 photo. |
| P3 | `tejaswi-dahiya` and `tejasvi-dahiya` removed; `tejasvi-singh` kept | All three byte-identical, none with identity. **No link to T Dahiya asserted**; the empty state is kept. |
| P4a–c | Squad rows 2023 KKR Shreyas Iyer, 2016 MI Jitesh Sharma, 2024 GT Jayant Yadav: `cricsheetName` → null, `played` → false | The mapped player (VR Iyer / RG Sharma / UT Yadav) is a different person. The real player (SS Iyer / JM Sharma / J Yadav, found from the register and the squad file's other seasons) has no appearance that season. |
| P5 (3 of 6) | Aliases `pathum-nissanka` → 8ee36b18, `ben-dwarshuis` → e1b9f3a9, `lhuan-dre-pretorius` → 60aa2db3 | The display name belongs to exactly one registered player, who has IPL appearances and no other bio. |

### Applied, failed verification, reverted

| Id | Why it failed | State now |
|---|---|---|
| P5: `jayant-yadav`, `keshav-maharaj`, `richard-gleeson` | Each alias resolves to a registry id that an existing scraped, verified bio already has (`j-yadav`, `ka-maharaj`, `rj-gleeson`). One person would get two profile pages, which is the Day 3 defect. The right action is a **fold**, which was not approved. | Aliases removed again; these 3 bios are in their previous empty state. |
| P1c: `pwh-de-silva` into `wanindu-hasaranga` | The comparator showed Hasaranga (scorecard name "PWH de Silva") changing **Spinner → Pacer** in `/api/stats/query`. `stats-aggregator.getPlayerBio()` finds bios by written name. Setting the kept bio's `playerName` to "PWH de Silva" would change his heading to "PWH de Silva". | `pwh-de-silva` restored byte-for-byte at its original position. The pair is pinned in `bio-merge-guard` again. |

### Unrelated-profile check (final state vs backup)

| Area | Change |
|---|---|
| Bio entries changed / removed | Only `abishek-porel`, `arshad-khan-(2)`, `na-saini`, `abhishek-porel`, `tejaswi-dahiya`, `tejasvi-dahiya` (857 bios, was 862) |
| Index keys | 797 → 798: −2 merged, +3 aliased |
| Link slugs | 511 → 515 |
| Existing match shards | **0** changed; 3 added (Nissanka, Dwarshuis, Pretorius) |
| Registry ids with two bio keys | **0** |
| Empty-state bios | 59 → 53 |
| API output (installed database: candidate run vs final state, 39 endpoints) | 38 identical; the 39th differs only in its response-time field |

---

## 8. Test results (end of Day 4.5)

| Suite | Result |
|---|---|
| API tests: Day 1 security 16, Day 2 Scout 19, Day 3 data integrity 8 | **43/43** |
| Global and scout (`test:global`) | **23/23** |
| Step-3 (`test:step3`) | **27/28.** ✖ `real bios: no photo-import duplicate of a verified bio remains` reports `jayant-yadav → j-yadav` (§11, item 1). |
| API / scripts typecheck | **0 / 0 errors** |
| Web typecheck | 11, the same pre-existing `components/cricket3d/*` errors |
| API build (`pnpm --filter @workspace/api-server build`) | ✔. The previous `dist/` was backed up to `../day45-backups/api-dist-before-day45`. |
| Web build (vite, into the scratch outDir `../day45-work/web-build-check`; the real `dist/` was left untouched) | ✔ built in 39 s, 2,964 modules. Only sourcemap warnings. |
| Smoke: real API on a copy of the installed database, 39 endpoints | 0 server errors. Identical to the verified candidate (except response time). |
| Installed database | `integrity_check` ok; reconciliation 0; hash unchanged by all post-install reads and tests |

Output is saved in `docs/data-repairs/2026-10-14-day45/phase10-tests.txt`.

---

## 9. Backup and rollback verification

All backups are outside the repository, in `../day45-backups/`, and `SHA256SUMS.txt` re-verified OK at the end.

| Backup | Content | Verification |
|---|---|---|
| `originals/` | `sqlite.db`, `-wal`, `-shm` byte-for-byte as they were live (`944b2c92…`, `e918c707…`, `910a8256…`) | Restored into an empty directory: `integrity_check` ok, logically identical to production (25 / 25 tables) |
| `sqlite.pre-day45.db` | Single-file consistent backup (`VACUUM INTO`, WAL folded in), `eb6a4ced…` | `integrity_check` ok; identical fingerprint; reconciliation shows exactly the Day 4 discrepancies |
| `replaced-live-files/` | The live files moved aside during the swap | Same hashes as `originals/` |

**Rollback tests (isolated, before the swap):**
- **Row-level:** `rollback.sql` applied to the corrected copy → logically identical to production.
- **Whole-file:** `sqlite.pre-day45.db` → identical.

**Recovery path, if needed:**
1. Stop the API.
2. Move the current `sqlite.db`, `-wal` and `-shm` aside.
3. Copy `../day45-backups/sqlite.pre-day45.db` to `sqlite.db`, or copy the three files from `originals/`.
4. Revert the code changes in §10: the exact-SQL switch, its tests and the new baseline.
5. For identity data, restore the files in `docs/data-repairs/2026-10-14-day45/backup/` and re-run `node scripts/generate-player-recent-matches.mjs --public-only`.

---

## 10. Files changed

| Area | Files |
|---|---|
| Database | `sqlite.db` replaced (`-wal` emptied) |
| API code | `services/decision/db.ts` (exact `RUNS_CONCEDED_SQL`, alias, `warehousePath()`), `services/stats-aggregator.ts` (7 inline expressions), `services/insights.ts`, `services/match-card.ts` (`warehousePath`), new `src/scripts/smoke-db.ts` |
| Scripts | `src/day4/reconcile-evidence.ts` (exact measure), new `src/day4/db-fingerprint.ts`, new `src/day4/apply-identity-proposals.ts` |
| Tests | `step3/tests/warehouse-reconcile.test.ts` (zero pins), `step3/tests/step3-regression.test.ts` (no exemption, new baseline), `step3/tests/bio-merge-guard.test.ts` (pins: Hasaranga only), `step3/tests/identity.test.ts` (merged bios) |
| Baseline | New `docs/global-data-engine/step3/baseline-post-day45-snapshot.json` (the old one is kept) |
| Identity data | `public/data/player-bio.json`, `api-server/data/player-bio.json`, both `squads-by-season.json`, `scripts/data/player-identity-aliases.json`, `public/data/player-recent-matches/` and `.json` |
| Docs | `docs/data-repairs/2026-10-14-day45/`: backups, `identity-applied.*`, `baseline-refresh*.md`, `db-hashes-end.txt`, `phase10-tests.txt` |
| Outside the repository | `../day45-backups/`, `../day45-work/` (fresh corrected copies, derived diff, smoke outputs, snapshot) |

---

## 11. Remaining defects

| # | Item | Status / needs |
|---|---|---|
| 1 | **`jayant-yadav` duplicates `j-yadav`** (81049310). The P4c squad fix removed the error that had hidden it; the Day 3 dedupe rule now proposes the fold, with registry and name corroboration. One Step-3 test fails until it is resolved. | **Your approval to fold** |
| 2 | `keshav-maharaj` duplicates `ka-maharaj`; `richard-gleeson` duplicates `rj-gleeson` (registry-verified). Not detected by the dedupe rule, because their squad rows have no `cricsheetName`. | **Your approval to fold**. Both are empty-state today. |
| 3 | Hasaranga pair (P1c) | Needs `getPlayerBio()` to resolve by registry identity (a code change), then the merge |
| 4 | Squad rows use "N Saini" (Nitin Saini's written name) for Navdeep Saini (2019–2022, 2026). The page heading currently relies on this mapping. | Squad correction plus heading check (approval) |
| 5 | `getPlayerBio()` falls back to initial + surname matching (an identity risk) | Code fix (later day) |
| 6 | Tejasvi Singh Dahiya = T Dahiya? Plus 50 other bios with no verified identity. | Blocked on evidence; empty states kept |
| 7 | Player styles empty; country/role placeholders on 793 player rows; unstated delivery length / direction | Unknown. **Not inferred.** |
| 8 | Photo registry entries still marked "approved" without licence evidence | Needs licence records |
| 9 | Static "league" constants in `stats-aggregator.ts`; `team_intelligence.avg_economy` sums overs written in cricket notation; `boundaryPct` has two meanings | Open (Day 4 list) |
| 10 | Web `dist/` data copies stale (not rebuilt by design); 11 `cricket3d` type errors | Open |

---

## 12. Is the application safe to proceed to Day 5?

**Warehouse data: yes.**
- The production database is corrected, matches the source on every reconciled table, and was verified before and after the swap.
- It is served correctly by the real API.
- It is fully backed up, with tested recovery paths.

**Identity: one decision first.**
- One Step-3 guard test fails on a genuine duplicate profile (`jayant-yadav` / `j-yadav`).
- Two more duplicates (Keshav Maharaj, Richard Gleeson) are of the same kind.
- Approving the fold of these three bios into their verified scraped bios would make every suite green, and would be applied with the same verification and backups as today.

Proceeding to Day 5 without that decision is possible, but the failing test would remain red.

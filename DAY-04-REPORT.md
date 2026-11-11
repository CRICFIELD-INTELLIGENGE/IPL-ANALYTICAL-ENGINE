# Day 4: Data reconciliation and identity stabilization

**Date:** 2026-10-14

**Approval boundary.** No production database was modified, swapped or checkpointed:
- `sqlite.db` (with its WAL) and `global.db` were only ever opened read-only (hashes in §6);
- every correction was built and verified on **copies**, outside the repository, in `../day4-db-copies/`;
- the site's data files (`player-bio.json`, `squads-by-season.json`, `player-identity-aliases.json`) were **not** changed today. Identity fixes are staged as proposals.

**Evidence base.** Every number comes from a delivery-level recount of the 1,243 raw Cricsheet JSON files (`lib/cricket-data/raw`) and from the Cricsheet register in `global.db`.

---

## 1. Issues fixed in code

These are code-only changes. None of them alters production data.

| # | Defect | Fix | Proof |
|---|---|---|---|
| F1 | `compute_analytics.ts` writes through `@workspace/db`, which hard-codes `sqlite.db`. Any run DELETEs and rebuilds the production derived tables, and it could not be pointed at a copy. | `lib/db` gained an opt-in `CRICFIELD_DB_PATH` (unset = unchanged behaviour) and an `isProductionDb()` helper. `compute_analytics` now refuses to run on production without `--allow-production`. | Without the env variable: "Refusing to rebuild…". With it set to a copy: the copy is rebuilt and production's hash is unchanged. |
| F2 | `compute_analytics.ts` charged bowlers with byes, leg-byes and penalties taken off wides/no-balls, giving **+68 runs** in `player_*_stats`. | Uses the exact expression (see C4). It reduces to the old expression while the extras flags are still unpopulated, so nothing regresses before approval. Wicket-kind list completed. | Rebuild on the corrected copy: `player_phase_stats` bowling runs equal the source recount on every row. |
| F3 | Ingestion (`update-ipl-data-v3.ts`) marked batters out only when they were on strike, and counted retired hurt as out. | Dismissal goes to `player_out` (either end). Retired hurt / not out is not a dismissal. A row is created for a batter out without facing a ball. | Scratch re-ingest → **0** batting differences from the source (production has 586). |
| F4 | Ingestion ignored the fielder (legacy CSV field 18). | `fielder_id` written. | Scratch re-ingest: 182 fielded dismissals without a fielder, the same as the source (10,903 − 10,721). Production has 10,903 without. |
| F5 | Ingestion ignored `info,eliminator`, the super-over winner of a tie (16 files). | `winner` = winner, or else eliminator. | Scratch re-ingest: 9 matches without a winner. All 9 are "no result" in the source. Production has 25. |
| F6 | `stats-aggregator.ts` (SQL path): `trueEconomy = econ − 8.2`, a hard-coded "league" constant. The JSON path and `aggregate-ipl.ts` define it as econ minus the average match economy of the bowler's matches. | The SQL path now computes that match baseline with the same filters. A bowler with no baseline gets `null`, which the UI already shows as "—". | 2025 mean `trueEconomy` +2.51 → +0.81. Bumrah (all time) −0.67 → −1.33. The constant inflated every value in high-scoring seasons. |
| F7 | Scoring zones (`stats-aggregator.ts` ×2): `boundaryPct = boundaries ÷ runs × 100`, a count divided by runs. | Boundaries per 100 balls, as at the third zone site and the per-ball `boundaryPct` elsewhere. | Only `scoringZones[].boundaryPct` changed in the Step-3 snapshot (7,102 zone rows). The comparator now independently verifies each value against the zone's own counts (3 new checks, PASS). |
| F8 | Delivery breakdown `dotPct = (balls − runs) ÷ balls`, which is not a dot rate. | Dots are counted (legal ball, 0 runs), as in the matchup breakdown. | Typecheck clean. Definition now matches the neighbouring breakdown. |
| F9 | SQL-path bowler `vsLhb` / `vsRhb`: `players.batting_style` is empty on every row, so every batter was filed as right-handed. That gave `vsLhb = 0 balls` and `vsRhb = all balls`, presented as fact. | Only stated styles are classified. Unknown handedness omits the split. The fields are optional and no UI reads them. | Bumrah `vsLhb` `{balls: 0}` → omitted. |
| F10 | `RUNS_CONCEDED_SQL` comment. | Restated with the recount's breakdown: 17 deliveries, −35 / +5, net −30. Added `RUNS_CONCEDED_EXACT_SQL`, **unused until the data correction is approved**, with a test that keeps it identical to `compute_analytics`. | `warehouse-reconcile.test.ts`. |
| F11 | `scratch/run_photo_mapping.py` created a second bio per player (`setdefault(<display slug>)`), created bios from unresolved file names, wrote invented `cricsheetName`s and `played: true` for replacements, and stamped every photo `licenseStatus: "approved"`. | Attaches photos to the bio that carries the player's written name. The written name must exist in the Cricsheet register (`global.db`, read-only), or be a unique register variant of the display name. Otherwise no bio is created and the case is reported. Replacements are not marked played. New photos get licence `"pending"`. Unresolved photos are marked `unresolved`. | Sandbox run (full copy of the data, 274 photos): **0 bios added (was 132 + 20 on earlier logic)**, 0 existing names changed, 10 photos listed for review, and 2 shared written names left alone ("R Bishnoi" is Ravi *and* Rajesh; "N Saini" is Navdeep *and* Nitin). |
| F12 | `SyncEngine` labels (`boundaryPct`, `trueEconomy`) mean something different from same-named metrics elsewhere. | Documented on `aggregateData`. Names kept so the response shape is unchanged. | — |

---

## 2. Verified, awaiting your approval

### 2a. Production warehouse corrections (C1–C7)

The corrections are built by `scripts/src/day4/build-corrected-db.ts` into `../day4-db-copies/sqlite.corrected.db`:
- it copies the warehouse with `VACUUM INTO` from a read-only connection, so the copy includes the 27 MB of committed WAL pages;
- it applies every correction in one transaction;
- it logs every old → new value with its source delivery to `docs/data-repairs/2026-10-14-day4/corrections/corrections.json`;
- it writes the exact inverse to `corrections/rollback.sql` (634 lines);
- it re-runs the recount, which must come back clean.

**Result on the copy:** 0 spell, 0 innings and 0 batting differences, and the exact runs-conceded expression matches the source on **all 295,732 deliveries**. Delivery count, every run total and the 49 long-over balls are unchanged.

#### C1. Retired-out wickets credited to the bowler (`fact_bowling_spells.wickets`)

| Spell | Match (date) | Ball | Retired out | Bowler | Original → corrected |
|---|---|---|---|---|---|
| 3748 | 1304066 (2022-04-10) | inn 1, 18.2 | R Ashwin | Avesh Khan | 2 → 1 |
| 5154 | 1359538 (2023-05-17) | inn 2, 14.6 | Atharva Taide | Mukesh Kumar | 1 → 0 |
| 5253 | 1370352 (2023-05-26) | inn 1, 18.6 | B Sai Sudharsan | Akash Madhwal | 2 → 1 |
| 6317 | 1473453 (2025-04-04) | inn 2, 18.5 | Tilak Varma | SN Thakur | 2 → 1 |
| 6391 | 1473459 (2025-04-08) | inn 2, 17.5 | DP Conway | LH Ferguson | 3 → 2 |
| 7196 | 1527691 (2026-04-11) | inn 1, 17.3 | A Mhatre | T Natarajan | 1 → 0 |

`bowling_strike_rate` is recomputed with the ingest's own formula.

#### C2. Penalty runs charged to the bowler (`fact_bowling_spells.runs_conceded`)

| Spell | Match | Ball | Source extras | Bowler | Original → corrected |
|---|---|---|---|---|---|
| 7938 | 335988 (2008-04-22) | inn 2, 11.6 | penalty 5 | PP Ojha | 12 → 7 |
| 12805 | 729309 (2014-04-27) | inn 2, 4.2 | wides 2, penalty 5 | SL Malinga | 22 → 17 |

`economy_rate` is recomputed with the ingest's own formula.

#### C3. Retired hurt counted as a fall of wicket (`innings.wickets`)

19 innings, each **−1**; innings runs are already correct. Each line is innings_id, match, and the retired-hurt batter (ball):
- 76 1082628 KH Pandya (13.3)
- 152 1136576 S Dhawan (0.6)
- 178 1136589 N Rana (16.3)
- 589 1254104 AT Rayudu (1.6)
- 658 1304067 RA Tripathi (13.1)
- 779 1359482 PBB Rajapaksa (10.1)
- 888 1359537 KH Pandya (15.6)
- 1117 1473469 SV Samson (5.4)
- 1175 1473499 PHKD Mendis (17.5)
- 1240 1527693 RG Sharma (5.2)
- 1252 1529269 AR Patel (15.5)
- 1357 335985 DJ Thornely (3.4)
- 1585 419107 Harbhajan Singh (19.5)
- 1605 419117 VVS Laxman (3.3)
- 1851 548306 SR Tendulkar (8.6)
- 2127 598060 SR Tendulkar (11.4)
- 2184 729309 Harbhajan Singh (19.5)
- 2292 829721 AJ Finch (3.3)
- 2426 980931 KP Pietersen (1.5)

No innings reaches 10 wickets, so `is_completed` is unaffected.

#### C4. Extras-type flags never populated (`deliveries.is_bye` / `is_legbye` / `is_penalty`)

Currently 0 on every row. Corrected from the source extras: **745 / 4,406 / 2**. This makes the exact runs-conceded expression possible. The current live expression cannot be exact on this warehouse, which is the source of the **~30-run residual**.

| Residual source (17 deliveries for the live API) | Source evidence | Live expression | Truth |
|---|---|---|---|
| 16 multi-run no-balls, 2008–2017 (e.g. 392196 2:16.2 JA Morkel; 419112 2:3.2 S Sreesanth) | `noballs: 5` / `2` / `3`. Before the 2017 Laws, runs off a no-ball were recorded as no-ball extras. | 1 each | 2–5 (−35 total) |
| 1 wide with 5 penalty runs (729309 2:4.2 SL Malinga) | `wides: 2, penalty: 5` | 7 | 2 (+5) |
| (27 byes/leg-byes run off a no-ball, 2018+, e.g. 1216500 1:18.5 AJ Tye `noballs 1, byes 4`) | | 1 ✔ | 1. Wrong only in `compute_analytics` (+68 total) |

After C4, `RUNS_CONCEDED_EXACT_SQL` (and F2) equals the source on every delivery. The residual goes from **−30 to 0**, and the precomputed tables from **+68 to 0**.

#### C5. Batting dismissal flags (`fact_batting_innings.was_dismissed`)

- **514 rows 0 → 1:** dismissed at the non-striker end, mostly run-outs.
- **17 rows 1 → 0:** retired hurt (for example batting_id 557, KH Pandya, 1082628).
- **55 rows inserted:** batters out without facing a ball. Each gets 0 (0) and out, with its player resolved through the registry.

Runs and balls faced were already correct on every row.

#### C6. Fielders never populated (`dismissals.fielder_id`)

**10,721** set from `wickets[].fielders[0]`, resolved through the registry. **182** stay NULL because the source names no fielder.

#### C7. Super-over winners never recorded (`matches.winner_id`)

16 matches are set from `outcome.eliminator`:

| Match | Winner |
|---|---|
| 1082625 | Mumbai Indians |
| 1175365 | Delhi Capitals |
| 1178426 | Mumbai Indians |
| 1216493 | Delhi Capitals |
| 1216512 | Kolkata Knight Riders |
| 1216517 | Kings XI Punjab |
| 1216547 | Royal Challengers Bangalore |
| 1254077 | Delhi Capitals |
| 1473469 | Delhi Capitals |
| 1529281 | Kolkata Knight Riders |
| 392190 | Rajasthan Royals |
| 419121 | Kings XI Punjab |
| 598004 | Sunrisers Hyderabad |
| 598017 | Royal Challengers Bangalore |
| 729315 | Rajasthan Royals |
| 829741 | Kings XI Punjab |

The 9 remaining NULLs are "no result" in the source and are genuinely unknown.

#### Affected tables, queries and derived analytics

**Who reads the corrected columns today:**

| Correction | Reader |
|---|---|
| C1, C2 | Only the data-health panel in `decision/history.ts`. Its "6 wickets apart (info)" becomes "Exact match". |
| C3 | The venue page's average wickets per innings (`team-analytics.ts:548`). |
| C4 | Enables the switch from `RUNS_CONCEDED_SQL` to the exact expression. That switch affects every bowling economy, average and runs-conceded figure in `stats-engine`, `ball-context`, `player-profiles` and `weakness-detector`; 13 bowlers' career totals move by the residual. |
| C5 | No live reader (`was_dismissed` is unused by the API). |
| C6 | Data-health "fielded" check. Enables fielding stats later; no new feature added. |
| C7 | Win/loss in `team-analytics` (head-to-head, batting-first / chasing wins), plus `team_intelligence` and `venue_intelligence`. |

**Derived tables rebuilt on a second copy (`sqlite.corrected-analytics.db`).** These come from running the fixed `compute_analytics.ts` with `CRICFIELD_DB_PATH`; the diff is in `docs/data-repairs/2026-10-14-day4/derived-diff.json`.

| Table | Rows | Changed | Columns |
|---|---:|---:|---|
| player_career_stats | 804 | 23 | economy 19, bowling_average 22, best_figures 4 |
| player_team_stats | 1,631 | 23 | economy |
| player_season_stats | 3,337 | 28 | economy |
| player_phase_stats (read by `player-summary`) | 2,193 | 24 | bowling_runs 24, bowling_economy 23 |
| player_matchups | 31,370 | **0** | — |
| venue_intelligence | 60 | 13 | batting_first / chasing win % (C7) |
| team_intelligence | 19 | 11 | wins 7, losses 10, win_pct 10 (C7) |
| auction_roi | 0 | 0 | the table is empty in production too |

Every batting column and every matchup is byte-identical, so the rebuild reproduces production apart from the intended corrections.

#### Regression tests

`scripts/src/step3/tests/warehouse-reconcile.test.ts`:
- **Unit test:** all three runs-conceded expressions on the real delivery shapes (no-ball + 4 byes, 5-run no-ball, penalty wide).
- **Guard:** the API's exact expression is identical to `compute_analytics.ts` in all 4 aggregates.
- **Production pins (read-only):** the exact 8 spell ids, −6 wickets, −10 runs, 19 innings, 531 + 55 batting rows, −30 / 17 live residual, +68 / 24 precomputed. Any new drift fails, and the pins are set to 0 in the same change as an approved swap.
- **`CORRECTED_DB=<copy>`:** zero differences and unchanged totals.

#### Swap and rollback procedure (for when you approve; not executed)

1. Stop the API server, so nothing holds `sqlite.db` or its WAL.
2. Back up the live database consistently:
   ```bash
   node -e "new (require('node:sqlite').DatabaseSync)('sqlite.db',{readOnly:true}).exec(\"VACUUM INTO 'sqlite.db.pre-day4.bak'\")"
   ```
   Record its SHA-256.
3. Rebuild the corrected copy from the *then-current* production. It is deterministic.
   ```bash
   cd scripts && npx tsx src/day4/build-corrected-db.ts --out ../../day4-db-copies/sqlite.corrected.db --force
   ```
   It must end with 0 differences.
4. Rebuild the analytics on the copy and review the diff (expected: §2a table).
   ```bash
   CRICFIELD_DB_PATH=../../day4-db-copies/sqlite.corrected.db pnpm run compute-analytics
   ```
5. Replace the database: move `sqlite.db`, `sqlite.db-wal` and `sqlite.db-shm` aside, then copy the corrected file in as `sqlite.db`.
6. In the same commit:
   - switch `RUNS_CONCEDED_SQL` to `RUNS_CONCEDED_EXACT_SQL`;
   - set the production pins in `warehouse-reconcile.test.ts` to 0;
   - re-record the Step-3 baseline snapshot.
7. Run all suites and start the API.

**Rollback:**
- **Whole database:** stop the API, put `sqlite.db.pre-day4.bak` back as `sqlite.db` (with no `-wal`/`-shm` files), and revert the step-6 commit.
- **Row level:** `corrections/rollback.sql` restores every original value and deletes the 55 inserted rows. The derived tables return by re-running `compute_analytics` on the restored database.

### 2b. Identity proposals

All of these are staged in `docs/data-repairs/2026-10-14-day4/identity-proposals.json`, each with its evidence.

| Id | Proposal | Evidence | Verdict |
|---|---|---|---|
| P1a | Fold `arshad-khan-(2)` → `arshad-khan` | One registry id **12314277**: register name "Arshad Khan", unique name "Arshad Khan (2)", one Cricinfo id 1244751. Same batting/bowling styles. | Same person |
| P1b | Fold `na-saini` → `navdeep-saini`; then set `navdeep-saini.playerName` = "NA Saini" | One registry id **21d4e29b**, Cricinfo 700167, variants "N Saini" and "Navdeep Saini". `navdeep-saini` currently shares the written name "N Saini" with `n-saini` (Nitin Saini). | Same person |
| P1c | Fold `pwh-de-silva` → `wanindu-hasaranga` | One registry id **a97c8ec2**, Cricinfo 784379, variants "Wanindu Hasaranga" and "W Hasaranga". A reviewed alias already exists (2026-10-10). | Same person |
| P2 | Fold `abhishek-porel` → `abishek-porel` (fill the 2026 photo) | `squads-by-season.json` 2025 and 2026 DC map "Abhishek Porel" → cricsheetName "Abishek Porel" (ad3b6e95, Cricinfo 1277545). That registry id played for DC from 2023 to 2026 (36 matches). Same role (wicketkeeper). | Same person. The Day-3 rule rejected it only on spelling. |
| P3 | Collapse `tejaswi-dahiya` and `tejasvi-dahiya` into `tejasvi-singh` | All three bios are byte-identical in name, team, role and photo. | Duplicates of one unverified profile. The empty state is kept. |
| P4a | Squad 2023 KKR "Shreyas Iyer": cricsheetName "VR Iyer" → null, `played` → false | SS Iyer has no 2023 match. VR Iyer is Venkatesh Iyer (register variant). | Error confirmed |
| P4b | Squad 2016 MI "Jitesh Sharma": "RG Sharma" → null, `played` → false | JM Sharma's first IPL match was in 2022. RG Sharma is Rohit (14 MI matches in 2016). | Error confirmed |
| P4c | Squad 2024 GT "Jayant Yadav": "UT Yadav" → null, `played` → false | J Yadav has no 2024 match. UT Yadav is Umesh Yadav. | Error confirmed |
| P5 | 6 aliases: `pathum-nissanka`→8ee36b18, `jayant-yadav`→81049310, `keshav-maharaj`→0b60eb09, `ben-dwarshuis`→e1b9f3a9, `richard-gleeson`→402f8494, `lhuan-dre-pretorius`→60aa2db3 | In each case the display name is a register variant of **exactly one** of the ~18k registered players, and that player has IPL appearances. Alias entries are drafted with evidence and `"reviewed": "PENDING"`. | Verified |

The bios' scraped `playerId` values are **not Cricinfo ids** (Kohli's is "332"; his Cricinfo id is 253802), so they cannot be used as identity evidence. The Cricsheet register is the authority used throughout.

**After applying any of P1–P5:**
- back up the bio, squad and alias files;
- regenerate the recent-matches index (`--public-only`);
- run the identity audit;
- run `test:step3`. `bio-merge-guard`'s pinned list must drop the resolved pairs, and `identity.test.ts` stays green.

---

## 3. Blocked by insufficient evidence (kept as truthful empty states)

| Item | What is known | What would unblock it |
|---|---|---|
| Is "Tejasvi Singh Dahiya" the registered **T Dahiya** (f12fe2a1, KKR 2026 ×2)? | No register variant links them. The 2026 KKR squad lists "Tejasvi Singh" (did not play) and "T Dahiya" (played) as **separate rows**. | A register variant or squad mapping, or a Cricinfo profile check (outside the repository). |
| 53 other bios with no verified identity (59 − the 6 in P5) | No register variant and no squad mapping. 8 more photo-import names have no register entry at all (e.g. Kuldip Yadav, Prashant Solanki, Vignesh Puthur). | A reviewed alias with evidence, per player. |
| `players.batting_style` / `bowling_style` (empty on all 1,141 rows) | Cricsheet does not record styles. Scraped bios have them, but the bio ids are not authoritative and 59 bios lack identity. | Accept the bio styles as a source for players with verified identity (a policy decision). |
| `players.country` = 'Unknown' and `role` = 'Player' on 793 / 1,141 rows | These are **placeholders** written by the ingest for players missing from `players.json`; they are not real values. `isIndian` uses other evidence (Day 3). | A sourced nationality list, or reuse of the SMAT-appearance rule (Day 3) with review. |
| `delivery_type` NULL on 95,511 deliveries, `scoring_area` NULL on 100,451 | Commentary exists for 293,652 deliveries, but the text does not state length or direction for these. | Genuinely unknown. Must stay NULL, never imputed. |

---

## 4. Before / after numbers

| Measure | Production (now) | Corrected copy |
|---|---:|---:|
| Deliveries matched to source | 295,732 / 295,732 | 295,732 / 295,732 |
| Runs conceded, live expression vs truth (394,585) | −30 (17 deliveries) | **0** with the exact expression |
| Runs conceded, precomputed tables vs truth | +68 (24 bowler-phase rows) | **0** |
| Bowling spells differing from source | 8 (6 wickets, 2 runs) | **0** |
| Innings wickets differing | 19 | **0** |
| Batting rows wrong / missing | 531 / 55 | **0 / 0** |
| Extras flags set (bye / leg-bye / penalty) | 0 / 0 / 0 | 745 / 4,406 / 2 |
| Fielded dismissals with fielder | 0 / 10,903 | 10,721 / 10,903 (rest unnamed in source) |
| Matches without winner | 25 | 9 (all "no result") |
| Step-3 economy comparator | 28/31 after the Phase D fixes; 31/31 before them | **34/34** (3 new zone-definition checks) |
| Photo script, sandbox: bios created | 132 duplicates (2026-10-12 run); 20 more on first patch | **0** |

The re-run of the fixed ingestion into a scratch database gives 0 / 0 / 0 / 0 spell, innings, batting and missing differences from the source.

---

## 5. Exact files changed

**Code**

| File | Change |
|---|---|
| `lib/db/src/index.ts` | `CRICFIELD_DB_PATH` override (default unchanged), `isProductionDb()` |
| `scripts/src/compute_analytics.ts` | Production guard, exact runs-conceded expression (×4), complete wicket-kind list |
| `scripts/src/update-ipl-data-v3.ts` | Batting dismissals (F3), fielder (F4), eliminator (F5) |
| `artifacts/api-server/src/services/decision/db.ts` | Residual comment corrected; `RUNS_CONCEDED_EXACT_SQL` (gated, unused) |
| `artifacts/api-server/src/services/stats-aggregator.ts` | F6 trueEconomy baseline, F7 zone boundaryPct ×2, F8 dotPct, F9 hand split |
| `artifacts/api-server/src/services/cricsheet-csv-sync.ts` | F12 documentation only |
| `scratch/run_photo_mapping.py` | F11 |
| `scripts/src/step3/economy-compare.ts` | Verified handling of the zone `boundaryPct` redefinition |

**New tools and tests**

| File | Purpose |
|---|---|
| `scripts/src/day4/reconcile-evidence.ts` | Read-only delivery-level recount |
| `scripts/src/day4/build-corrected-db.ts` | Builds the corrected copy only; refuses production paths |
| `scripts/src/day4/diff-derived.ts` | Derived-table diff |
| `scripts/src/day4/sparse-fields.ts` | Sparse-column census |
| `scripts/src/step3/tests/warehouse-reconcile.test.ts` | 4 tests |

**New documentation:** `docs/data-repairs/2026-10-14-day4/`

| File | Contents |
|---|---|
| `git-status-start.txt` | 299 entries at start |
| `db-hashes-start.txt` | Database hashes at start |
| `phaseA-tests.txt`, `phaseE-tests.txt` | Test and typecheck output |
| `corrections/corrections.json` | Every old → new value with evidence |
| `corrections/rollback.sql` | Exact inverse of the corrections |
| `derived-diff.json` | Derived-table diff |
| `identity-proposals.json` | Staged identity proposals |

**Database copies (outside the repository, not tracked):**
- `../day4-db-copies/sqlite.corrected.db` (C1–C7);
- `../day4-db-copies/sqlite.corrected-analytics.db` (C1–C7 plus rebuilt derived tables).

**Not changed:** `sqlite.db`, `global.db`, every file under `public/data` and `api-server/data`, `scripts/data/player-identity-aliases.json`, and all Day 1–3 security and Scout Lab code. No commit was made.

---

## 6. Database hash comparison (SHA-256)

| File | Start of Day 4 | End of Day 4 | mtime |
|---|---|---|---|
| `sqlite.db` | `944b2c92046611a1…` | `944b2c92046611a1…` | 2026-10-11 00:15 |
| `sqlite.db-wal` (27 MB, committed pages) | `e918c707553f11b2…` | `e918c707553f11b2…` | 2026-10-11 00:15 |
| `global.db` | `79c75f780ebe4d9e…` | `79c75f780ebe4d9e…` | 2026-10-10 17:07 |
| `global.db-wal` | `e3b0c44298fc1c14…` (empty) | `e3b0c44298fc1c14…` | — |

Full hashes are in `db-hashes-start.txt` and `phaseE-tests.txt`. The `-shm` files' mtimes change whenever a read-only connection opens a WAL database; that is expected and does not alter data.

---

## 7. Tests and results (end of Day 4)

| Suite | Result |
|---|---|
| API (`pnpm --filter @workspace/api-server test`): Day 1 security 16, Day 2 Scout 19, Day 3 data integrity 8 | **43/43** |
| Global and scout (`test:global`) | **23/23** |
| Step-3 (`test:step3`, with `CORRECTED_DB` set): identity 12, bio-merge guard 6, delivery sequence 3, economy regression 2, player page 1, warehouse reconcile 4 | **28/28** |
| API typecheck | **0 errors** |
| Scripts typecheck | **0 errors** |
| Web typecheck | 11, the same pre-existing `components/cricket3d/*` errors reported on Days 1–3 |
| Sandbox run of `run_photo_mapping.py` | 0 bios added, 0 names changed |

**Commands** (from the repository root):

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/scripts run test:global
CORRECTED_DB=../day4-db-copies/sqlite.corrected.db pnpm --filter @workspace/scripts run test:step3
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/scripts run typecheck
cd scripts && npx tsx src/day4/reconcile-evidence.ts                 # production, read-only
cd scripts && npx tsx src/day4/build-corrected-db.ts --out ../../day4-db-copies/sqlite.corrected.db --force
cd scripts && npx tsx src/day4/sparse-fields.ts
sha256sum sqlite.db sqlite.db-wal lib/cricket-data/global/warehouse/global.db
```

---

## 8. Updated outstanding-defect inventory

| # | Defect | Status |
|---|---|---|
| 1 | 6 retired-out bowler wickets (C1) | **Awaiting approval** (copy verified) |
| 2 | 10 penalty runs charged to bowlers (C2) | **Awaiting approval** |
| 3 | 19 retired-hurt innings wickets (C3) | **Awaiting approval** |
| 4 | ~30-run live economy residual / +68 precomputed (C4 + exact expression) | **Awaiting approval.** Code ready and gated. |
| 5 | Batting dismissal flags, 586 rows (C5) | **Awaiting approval.** Ingest fixed. |
| 6 | Fielders never stored (C6) | **Awaiting approval.** Ingest fixed. |
| 7 | 16 super-over winners missing (C7) | **Awaiting approval.** Ingest fixed. |
| 8 | Derived tables carry #1–#7 | Rebuild on the copy verified; runs with the swap |
| 9 | 3 scraped duplicate pairs, Porel, Tejasvi triplicate | **Awaiting approval** (P1–P3) |
| 10 | 3 squad-file identity errors | **Awaiting approval** (P4) |
| 11 | 6 identity aliases | **Awaiting approval** (P5) |
| 12 | Tejasvi Singh Dahiya = T Dahiya? | **Blocked** (evidence) |
| 13 | 53 bios without identity, 8 unregistered photo names | **Blocked**; empty states kept |
| 14 | `players` styles empty; country/role placeholders on 793 rows | **Blocked** (source policy); documented as placeholders |
| 15 | Photo licences: the existing registry still says "approved" for earlier 2026 photos | Open: needs licence evidence. The script no longer writes "approved". |
| 16 | `trueEconomy` / `boundaryPct` / `dotPct` / hand-split definitions | **Fixed** (F6–F9); CSV-sync names documented (F12) |
| 17 | `boundaryPct` still has two legitimate meanings across endpoints (share of runs vs per 100 balls) | Open: naming only, values are correct per endpoint. Renaming changes API shape (later day). |
| 18 | Duplicated runs-conceded / wicket-kind logic (`stats-aggregator` inline SQL ×7, `stats-engine`, `compute_analytics`, `aggregate-ipl`, `create-matchups-table`, `parse-cricsheet-csv`, `update-ipl-data.ts` v1) | Open: inventory recorded. `compute_analytics` is now pinned to the API expression by a test. The older scripts (`update-ipl-data.ts`, `parse-cricsheet-csv.ts`) still use the incomplete wicket list and should not be run. |
| 19 | Static "league" numbers in `stats-aggregator.ts` (≈2724–2774: boundaryPct 16.62, phase averages) | Open: provenance unknown; to be sourced or labelled (later day) |
| 20 | `team_intelligence.avg_economy` sums cricket-notation overs (19.4 read as 19.4, not 19⅔) | Open. No API reader today. |
| 21 | `dist/` copies of data files not regenerated | Open (build step) |
| 22 | Web typecheck: 11 `cricket3d` errors | Open (pre-existing) |

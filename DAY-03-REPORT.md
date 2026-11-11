# Day 3: Data integrity and player-profile regressions

**Date:** 2026-10-14
**Scope:**
- Step-3 regression failures.
- Missing recent matches on player pages.
- Unexpected stat differences.
- CSV sync parser.
- IPL ingestion sequencing and random fields.
- Identity merges.

**Not touched:**
- Day 4+ work.
- `sqlite.db` and `global.db`. Both were opened read-only only, and their hashes and mtimes are unchanged (below).
- Day 1 security and Day 2 Scout Lab code. All their tests still pass.

## 1. Results at a glance

| # | Problem | Status | Evidence (before → after) |
|---|---|---|---|
| 1 | 4 failing Step-3 regression tests | ✅ **Fixed** | `test:step3`: 4 failing → **24/24 pass** (18 pre-existing + 6 new). |
| 2 | Player pages with missing recent matches | ✅ **Fixed** | Identity audit: **20 MISSING → 0**. "correct" pages 778 → **797**. |
| 3 | Unexpected batting/bowling differences vs the Step-3 baseline | ✅ **Explained and verified: none are statistical** | Comparator 25/31 → **31/31 PASS**. The 89 changed row-fields are 23 nationality corrections and 2 team back-fills. All are corroborated by warehouse appearances (§4). |
| 4 | CSV sync parser vs the `ipl_csv` format; all-zero imports | ✅ **Fixed** | Match 1082591: **0 runs / 324 "balls" → 379 runs / 248 balls** (207 + 172, target 208). All **1,243/1,243** `ipl_csv` files parse and validate. All-zero or inconsistent files are rejected (HTTP 422). |
| 5 | IPL ingestion: ball sequencing, random `delivery_type`/`scoring_area` | ✅ **Fixed in code** (script not run on production) | A scratch rebuild matches production totals exactly. It has **0** sequencing anomalies and **0** random values. Further defects found and fixed: retired-out wickets, retired-hurt innings wickets, penalty runs charged to bowlers. |
| 6 | Identity mappings / incorrect merges | ✅ **Guarded** · ⚠️ 3 pre-existing pairs need review | 132 photo-import duplicate bios folded (994 → 862). 2 known wrong-merge traps stay separate. A new guard pins 3 older ESPN-scrape duplicate pairs. |
| 7 | Preserve Day 1 and Day 2 fixes | ✅ | API tests **43/43** (Day 1: 16, Day 2: 19, new: 8). `test:global` **23/23**. |
| 8 | Tests with real source-data fixtures | ✅ | 4 unmodified Cricsheet files (2 matches × CSV + JSON). Every expected number is recounted from the JSON copy. |

## 2. Step-3 regressions and player profiles (Tasks 1, 2)

### Root cause

`scratch/run_photo_mapping.py` (run 2026-10-12) added photos with `bios.setdefault(<display-name slug>, {})`. That created 132 duplicate bios, such as `virat-kohli` beside the verified `v-kohli`, plus 74 bios for genuinely new 2026 squad players. The recent-matches index had not been regenerated for the new players. The result:
- 20 pages were empty although their player has IPL matches;
- the identity tests' link expectations no longer matched the data.

### Fix

**New script: `scripts/src/step3_6/dedupe-photo-bios.ts`.** It is a dry run by default and writes only with `--apply`. A duplicate bio is folded into another bio only when both of these hold:
1. Its squad display name resolves through `cricsheetName` to **exactly one** registry id, and exactly one scraped bio is verified to that id by the shared exact rules (`identifyBio`).
2. `namesCorroborate` passes: the surname matches, and the first name or first initial matches.

Merging fills only fields the canonical bio lacks and never overwrites one. Differing values (such as a newer photo) are listed in the report for review.

**Applied:** 132 folded, 74 kept. Bios went from 994 to 862 in both `public/data/player-bio.json` and `api-server/data/player-bio.json`. The two files were identical before and after.

**Index regenerated:** `scripts/generate-player-recent-matches.mjs --public-only` now produces 794 shards, 797 bio keys and 511 link slugs. `dist/` was not touched.

**Backups:** `docs/data-repairs/2026-10-14-day3/backup/` holds both bio files, the old 776-shard index and the legacy 34 MB JSON. Reports: `dedupe-dry-run.md`, `dedupe-applied.md`.

**Wrong merges the rule refused:**
- **Jayant Yadav → UT Yadav.** A squad-file error row would have attached Jayant Yadav's photo to Umesh Yadav's page.
- **Abhishek Porel / Abishek Porel.** Left for review.

**Squad-file errors found and reported, but not edited:**
- Shreyas Iyer 2023 KKR is listed as "VR Iyer".
- Jitesh Sharma 2016 MI is listed as "RG Sharma".
- Jayant Yadav 2024 GT is listed as "UT Yadav".

### Identity audit (`scripts/src/step3/identity-audit.ts`), reproduced from the backups and from current data

| Status | Before (backup data) | After |
|---|---:|---:|
| MISSING (empty page, has true matches) | **20** | **0** |
| correct | 778 | **797** |
| correct (no matches) | 6 | 6 |
| no verified identity (empty state) | 190 | 59 |
| WRONG / MERGED | 0 | 0 |
| **Bios** | 994 | 862 |
| Links: correct page / no page | 795 / 15 | **796 / 14** |

Of the 20 formerly MISSING pages, 19 are new 2026 players (such as `salil-arora` with 14 matches and `brijesh-sharma` with 13). The 20th is `d-madushanka`, whose shard was missing.

### Identity tests

`identity.test.ts` "links" previously expected `finn-allen` and `mukul-choudhary` to have no page, because no such bios existed. Both bios now exist (2026 squads). The expectation was updated to the new fact, and the test now **also** asserts that:
- each bio's `fullName` is the named person;
- `finn-allen` does not link to `fa-allen`;
- `mukul-choudhary` and `md-choudhary` do not link to `mukesh-choudhary`.

No other expectation was changed.

## 3. Unexpected stat differences (Task 3)

`scripts/src/step3/economy-compare.ts` compared every output row-for-row, so changes to player metadata counted as statistical failures. It now:
- compares statistics with the metadata fields (`isIndian`, `team`) stripped;
- lists metadata changes in a separate report section.

Result: **31/31 PASS**. The 89 metadata row-fields cover 25 players, and every one was independently checked against `global.db` (read-only). The checks are encoded in `artifacts/api-server/test/data-integrity.test.ts`.

| Change | Players | Corroboration |
|---|---|---|
| `isIndian` true → false | XC Bartlett, JG Bethell, MP Breetzke, D Brevis, N Burger, NT Ellis, D Ferreira, AM Ghazanfar, WG Jacks, PHKD Mendis, Azmatullah Omarzai, J Overton, GD Phillips, R Powell, RD Rickelton, R Shepherd, N Thushara (17) | **0** Syed Mushtaq Ali Trophy appearances each. |
| `isIndian` false → true | Umran Malik (7 SMAT), AR Patel (23), AS Roy (23), Rasikh Salam (9), Abdul Samad (18), Urvil Patel (31) | SMAT appearances > 0 for every player. |
| `team` "All" → franchise | Ashok Sharma → Gujarat Titans; Brijesh Sharma → Rajasthan Royals | Franchise of each player's latest IPL appearance. |

The baseline had these flags wrong, and the current data is right. No batting or bowling number changed.

## 4. CSV sync parser (Task 4)

### Defect

`services/cricsheet-csv-sync.ts` looked up CSV2 header names such as `match_id` and `runs_off_bat` and split each line on commas. `ipl_csv/` contains **legacy** Cricsheet CSV instead:
- a `version` line;
- `info,…` lines;
- positional `ball,innings,over.ball,…` rows.

Every column lookup missed, so every field became 0. The info rows were also counted as deliveries.

### Fix

The parser was rewritten. `enrichRow` and `SyncEngine` are unchanged.

**Format detection:**
- legacy → positional fields;
- CSV2 → header lookup, and any missing required column throws;
- anything else throws `CricsheetCsvError`.

**Parsing details:**
- Records are read with the RFC-4180 reader, because venue names contain commas.
- The bowling team is derived from the two `info,team` rows.
- `parseOverBall` splits `"19.10"` into the integers 19 and 10, never via `parseFloat`.

**`validateParsedMatch` rejects a file when any of these hold:**
- it has no deliveries;
- its total runs are 0;
- any delivery's `extras` differs from wides + no-balls + byes + leg-byes + penalty;
- (legacy files only) the first-innings total + 1 ≠ the recorded target. This check is skipped for rain-revised targets.

**Callers:**
- `POST /api/ipl/sync-csv` returns **422 `csv_invalid`**, with a message that contains no filesystem path. The route is still admin-only (Day 1).
- `csv-sync-cli.ts` exits with code 2 and a clear message.

| Match 1082591 via `csv-sync-cli` | Before | After |
|---|---:|---:|
| deliveries | 324 (info rows included) | **248** |
| total runs | **0** | **379** (207 + 172; target 208 ✔) |
| wickets | 0 | 14 |
| 4s / 6s | 0 / 0 | 32 / 17 |
| dot balls | 324 | 70 |

**Whole corpus:** 1,243 of 1,243 `ipl_csv` files are legacy format. All parse, and all pass validation, including the target cross-check.

## 5. IPL ingestion: `scripts/src/update-ipl-data-v3.ts` (Task 5)

The code is fixed. **The script was not run against production.** It was run once into a scratch copy, to verify the fixes.

| Defect | Fix |
|---|---|
| `parseFloat("19.10")` read the 10th delivery of a long over as ball 1. | Integer `over.ball` parsing. Unknown labels throw. |
| `delivery_type` / `scoring_area` came from `Math.random()`. | Stored as `NULL`. They are filled only from sourced commentary data. |
| `is_bye` / `is_legbye` / `is_penalty` were never written. | Now written. |
| A rebuild would drop `delivery_seq`, which production gained on 2026-10-11. | Column added to the schema and written as `ball_num`. |
| "retired out" was credited to the bowler. | `NOT_BOWLER_WICKET` set (also covers retired not out, handled the ball, timed out). |
| "retired hurt" counted as an innings wicket. | `NOT_A_WICKET` set. |
| Penalty runs were charged to the bowler. | Subtracted, like byes and leg-byes. |
| Running the script DROPs every table in `sqlite.db`. | Now refuses to run without `--db <path>`, and refuses `sqlite.db` itself unless `--allow-production` is also given. |

### Scratch rebuild vs production (`sqlite.db`, read-only)

| Measure | Production | Fixed script (scratch DB) |
|---|---:|---:|
| matches / deliveries | 1,243 / 295,732 | 1,243 / 295,732 |
| batter / extra / total runs | 381,529 / 20,209 / 401,738 | identical |
| overs where count ≠ max(ball_num) ≠ max(delivery_seq) | 0 | **0** |
| deliveries with ball_num ≥ 10 | 49 | 49 (= 49 `x.10+` labels in the source CSVs) |
| non-null `delivery_type` | 200,221 (commentary-derived) | 0 (no random values) |
| bye / leg-bye / penalty flags | 0 / 0 / 0 | 745 / 4,406 / 2 |
| bowling-spell wickets | 13,488 | **13,482** (−6 retired out) |
| innings wickets | 14,705 | **14,686** (−19 retired hurt) |
| bowling-spell runs conceded | 394,595 | **394,585** (−10: two 5-run penalties) |

### Production findings (reported, not changed)

- **No random values remain in production.** None of the random generator's spellings appear: `Length`, `Long On`, `Square Leg`. Instead the values match the `delivery_commentary` vocabulary, such as "Length ball" and "Long-on". Ball sequencing in production is already correct.
- **6 bowling spells over-credit one wicket each** (retired out). Affected matches: 1304066, 1359538, 1370352, 1473453, 1473459, 1527691.
- **Innings wickets include 19 retired-hurt dismissals.**
- **10 penalty runs are charged to bowlers.**
- **Production repair options:** a reviewed rebuild into a copy, followed by a swap, or a targeted SQL fix. Either way it needs your sign-off; it must not happen automatically.
- **Not measured:** whether `compute-analytics` outputs carry the +6 wickets.

## 6. Identity merge guard (Task 6)

New file: `scripts/src/step3/tests/bio-merge-guard.test.ts`.
- **Unit tests** (shapes taken from real cases):
  - Bumrah folds into the verified bio, and existing values are never overwritten.
  - Jayant Yadav / UT Yadav, Shreyas Iyer / VR Iyer and Abhishek / Abishek Porel are never merged.
  - A surname alone is never enough.
- **Real data:**
  - The dedupe plan has **0** folds left.
  - The API and web bio files are identical.
  - No new pair of scraped bios shares a registry id.
- **The guard found 3 older duplicate pairs.** Each pair comes from the original ESPN scrape, with two different ESPN ids, and is present in the backup:
  - `arshad-khan` / `arshad-khan-(2)`;
  - `navdeep-saini` / `na-saini`;
  - `pwh-de-silva` / `wanindu-hasaranga`.

  They are **pinned** as a review list rather than merged. The test fails if a new collision appears, or if a pinned one is resolved without being removed from the list. For the first pair, a human should confirm that "Arshad Khan" and "Mohd Arshad Khan" are one person; Cricsheet's registry treats them as one.

## 7. What remains (needs a human decision or a later day)

1. **59 bios with no verified identity** show the empty state. This is truthful but thin. 6 have a register suggestion: P Nissanka, J Yadav, KA Maharaj, BJ Dwarshuis, RJ Gleeson, LG Pretorius. Others are squad-only identities, such as `finn-allen`, `mukul-choudhary`, `cooper-connolly` and `vaibhav-sooryavanshi`. Each could get a **reviewed** entry in `scripts/data/player-identity-aliases.json` with evidence; none was added automatically.
2. **Tejasvi Singh Dahiya has 3 bios** (`tejaswi-dahiya`, `tejasvi-singh`, `tejasvi-dahiya`), all without identity. `t-dahiya` is the verified page.
3. **Abhishek Porel** duplicate, and the 3 pinned scraped pairs (§6).
4. **Squad-file errors** in `squads-by-season.json` (3 rows, §2).
5. **`scratch/run_photo_mapping.py` still uses `setdefault(<slug>)`.** Re-running it would recreate the duplicate bios. Run `dedupe-photo-bios.ts` (dry run first) after any photo import, or change the script to attach photos to the verified bio.
6. **Photo licensing:** the photo registry marks `licenseStatus: "approved"` without evidence of a licence.
7. **`dist/` copies** of the bio file and the index were not regenerated. A normal web build will regenerate them.
8. **Production `sqlite.db`:** the retired-out, retired-hurt and penalty discrepancies (§5). Also, the 2026-10-11 `delivery_seq` repair has no script in the repo; the fixed ingestion script now reproduces its result.
9. **Economy residual:** about 30 net runs (2008–2026) where the warehouse cannot separate wide/no-ball components. See the `RUNS_CONCEDED_SQL` comment in `services/decision/db.ts`; unchanged.
10. **`SyncEngine` labels** were kept unchanged by design: `trueEconomy` is runs per ball, and `boundaryPct` is the percentage of runs from boundaries. Worth renaming later.
11. **Web typecheck:** the same 11 pre-existing errors in `components/cricket3d/*` reported on Days 1 and 2. None are new.

## 8. Files changed

| File | Change |
|---|---|
| `artifacts/api-server/src/services/cricsheet-csv-sync.ts` | Parser rewritten (legacy + CSV2 detection, `parseOverBall`, `validateParsedMatch`, `CricsheetCsvError`). `enrichRow` and `SyncEngine` unchanged. |
| `artifacts/api-server/src/routes/csv-sync-route.ts` | Returns 422 `csv_invalid` for invalid files. Admin guard unchanged. |
| `artifacts/api-server/src/scripts/csv-sync-cli.ts` | Clean error message and exit code 2 for invalid files. |
| `artifacts/api-server/test/data-integrity.test.ts` | **New**, 8 tests. |
| `artifacts/api-server/test/fixtures/cricsheet/` | **New**: `1082591.csv/.json`, `1473469.csv/.json` (unmodified Cricsheet copies, ODC-BY) and a README. |
| `scripts/src/update-ipl-data-v3.ts` | Sequencing, random fields, extras flags, `delivery_seq`, wicket rules, penalty runs, production guard. |
| `scripts/src/step3/economy-compare.ts` | Metadata separated from statistics, with its own report section. |
| `scripts/src/step3/tests/identity.test.ts` | Links expectations for the 2026 bios, plus 5 stronger assertions. |
| `scripts/src/step3/tests/bio-merge-guard.test.ts` | **New**, 6 tests. |
| `scripts/src/step3/tests/delivery-sequence.test.ts` | Opens `sqlite.db` read-only. Expectations unchanged. |
| `scripts/src/step3_6/dedupe-photo-bios.ts` | **New** repair script (dry-run default). |
| `artifacts/ipl-analytics/public/data/player-bio.json`, `artifacts/api-server/data/player-bio.json` | 994 → 862 bios (dedupe applied). |
| `artifacts/ipl-analytics/public/data/player-recent-matches/`, `player-recent-matches.json` | Regenerated. |
| `docs/data-repairs/2026-10-14-day3/` | **New**: backups, dry-run and applied reports. |

## 9. Verification commands (run from the repository root)

```bash
pnpm --filter @workspace/api-server test                      # 43/43 (Day 1 16, Day 2 19, Day 3 8)
pnpm --filter @workspace/scripts run test:global              # 23/23
pnpm --filter @workspace/scripts run test:step3               # 24/24
pnpm --filter @workspace/api-server run typecheck             # 0 errors
pnpm --filter @workspace/scripts run typecheck                # 0 errors
pnpm --filter @workspace/ipl-analytics run typecheck          # 11 pre-existing cricket3d errors, none new
pnpm --filter @workspace/api-server exec tsx src/scripts/csv-sync-cli.ts 1082591     # 379 runs, 248 balls
cd scripts && npx tsx src/step3_6/dedupe-photo-bios.ts --report /tmp/dedupe.md      # expect "fold 0"
cd scripts && npx tsx src/step3/identity-audit.ts --out /tmp/audit.md               # 0 MISSING / WRONG / MERGED
cd scripts && npx tsx src/update-ipl-data-v3.ts --db /tmp/rebuild.db                # scratch rebuild only
sha256sum sqlite.db lib/cricket-data/global/warehouse/global.db                     # unchanged, below
```

**Warehouse integrity at the end of Day 3:**

| Database | SHA-256 prefix | mtime |
|---|---|---|
| `sqlite.db` | `944b2c92046611a1` | 2026-10-11 00:15 |
| `global.db` | `79c75f780ebe4d9e` | 2026-10-10 17:07 |

Both mtimes predate today. Both databases were opened read-only.

## 10. Five concepts from today

1. **Reconcile two encodings of the same truth.** The CSV parser is tested against the JSON copy of the same match, never against its own output. A test that reuses the code's own numbers cannot catch the code being wrong.
2. **Invariants beat spot checks.** These three rules hold for any real match and catch a whole class of parser bugs, not one file:
   - total runs > 0;
   - extras = sum of the extra types;
   - first-innings total + 1 = the target.
3. **Separate metadata from statistics.** A regression harness that treats a nationality correction like a changed strike rate produces false alarms, and false alarms teach people to ignore it.
4. **Merges need two independent proofs.** Registry identity plus name corroboration refused the Jayant/Umesh Yadav merge that a squad-file error would have caused.
5. **Ratchet tests for known debt.** Pinning the 3 existing duplicate pairs makes the guard useful today. It blocks new collisions without hiding the old ones, and it forces cleanup of the list when one is resolved.

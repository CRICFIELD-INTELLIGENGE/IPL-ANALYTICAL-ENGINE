# Day 4.6: Final verified identity cleanup

**Date:** 2026-10-14

**Scope:**
- Items 1–3: the approved duplicate merges.
- Item 4: Hasaranga's lookup and his conditional merge.
- Item 5: the stats lookup `getPlayerBio()`.
- Item 6: the Navdeep / Nitin Saini squad mapping.

**Not touched:**
- `sqlite.db` (`ab897a8c…`) and `global.db` (`79c75f78…`) are unchanged.
- No photo licence status was changed.
- No UI, no new features, no deployment, no commit.

**Backups:** `docs/data-repairs/2026-10-14-day46/backup/` holds both bio files, both squad files, the alias file, the recent-matches index and shards, and the original `stats-aggregator.ts`.

---

## 1. Profiles merged

All merges were made by `scripts/src/day4/apply-day46-merges.ts`. Each was re-validated immediately before writing, and the run aborts on any conflict:
- the kept bio must be verified to the registry id by the shared identity rules;
- the folded bio must have no identity of its own, or the same one;
- the folded bio's name must be a Cricsheet register name or variant of **only** that id (`global.db`, read-only);
- the bowling styles must not conflict.

Kept values are never overwritten; only empty fields are filled. The per-merge log is in `merges-applied-*.md` / `.json`.

| # | Folded → kept | Registry id (IPL matches) | Evidence | Filled | Kept despite differing |
|---|---|---|---|---|---|
| 1 | `jayant-yadav` → `j-yadav` | 81049310 (20) | `j-yadav` verified ("J Yadav", fullName "Jayant Yadav"). "Jayant Yadav" is a register variant of 81049310 only. Style: Right arm Offbreak. | `country` = India | role (bowler vs all-rounder), image (scraped vs 2026 photo) |
| 2 | `keshav-maharaj` → `ka-maharaj` | 0b60eb09 (2) | `ka-maharaj` verified ("KA Maharaj"). "Keshav Maharaj" is a register variant of 0b60eb09 only. Style: Slow Left arm Orthodox. | `country` = South Africa | role, team / currentTeam (RR vs the 2026 squad's MI), image |
| 3 | `richard-gleeson` → `rj-gleeson` | 402f8494 (3) | `rj-gleeson` verified ("RJ Gleeson"). "Richard Gleeson" is a register variant of 402f8494 only. Style: Right arm Fast Medium. | — | team / currentTeam (MI vs the 2026 squad's RCB), image |
| 4 | `pwh-de-silva` → `wanindu-hasaranga` (after the lookup fix, §2) | a97c8ec2 (37) | Both bios verified to a97c8ec2. Both say Legbreak. | — | playerId, playerName, fullName, role, team |

**Images.** No image was overwritten or deleted. The kept pages show the same image as before. The 2026 kit photos stay registered in `player-images.json` and `player-photo-registry.json` under their own keys, and no licence status was changed.

**No role change.** Every kept bio's `role` and `bowlStyle` are exactly as they were.

**Profile counts:**

| Measure | Before Day 4.6 | After |
|---|---:|---:|
| Bios | 857 | **853** |
| Verified bio keys | 798 | 797 (−`pwh-de-silva`) |
| Verified link slugs | 515 | 518 |
| Empty-state bios | 53 | **50** |
| Registry ids with two bios | 1 (Hasaranga) | **0** |
| Existing match shards changed | — | **0** |

**Page headings and links**, from the real resolver, before → after:

| Slug | Before | After |
|---|---|---|
| `j-yadav`, `ka-maharaj`, `rj-gleeson`, `wanindu-hasaranga`, `navdeep-saini`, `n-saini` | — | Unchanged ("Jayant Yadav", "KA Maharaj", "RJ Gleeson", "PW Hasaranga", "Navdeep Saini", "Nitin Saini") |
| `jayant-yadav` | its own empty page | → `j-yadav` "Jayant Yadav" |
| `keshav-maharaj` | its own empty page "Keshav Maharaj" | → `ka-maharaj` "KA Maharaj" |
| `richard-gleeson` | its own empty page | → `rj-gleeson` "RJ Gleeson" |
| `pwh-de-silva` | its own page "PWH de Silva" | → `wanindu-hasaranga` "PW Hasaranga" |

The merged pages carry the players' matches: `j-yadav` 20, `ka-maharaj` 2, `rj-gleeson` 3, `wanindu-hasaranga` 37.

---

## 2. Item 4 + 5: `getPlayerBio()` moved from name matching to registry identity

### Defect

`stats-aggregator.ts` `getPlayerBio()` returned the **first** bio whose `playerName` equalled the scorecard name **or** whose first initial and surname matched. This lookup feeds three things:
- batting hand (the LHB/RHB filters and splits);
- nationality (`isIndian`, the Indian/Overseas filters);
- bowler type (the Pacer/Spinner filters, and team and venue pace-vs-spin splits).

Measured over all 811 IPL written names (`scripts/src/day4/bio-lookup-impact.ts`), it returned **another player's bio for 57 names**. Examples:

| Written name | Old lookup returned |
|---|---|
| Kuldeep Yadav | K Yadav (classed **Pacer**) |
| RK Singh (Rinku) | RP Singh |
| Arshdeep Singh, Anmolpreet, Abhinandan, Akash, Anirudh | "A Singh" |
| Navdeep Saini | **Nitin Saini** |
| Mujeeb Ur Rahman | Mustafizur Rahman |
| Harbhajan Singh | Himmat Singh |
| CJ Green | Cameron Green |

Hasaranga's case was the same mechanism: "PWH de Silva" worked only while a bio carried that exact `playerName`.

### Fix

The resolution logic is in a new module, `services/player-bio-lookup.ts`, which `getPlayerBio()` now uses. Steps, in order:
1. Look up the written name's registry id(s) in the raw IPL files.
2. **One id:** use the bio verified for that id in the identity index.
3. **One id but no verified bio:** use the bio whose own display name a squad row of the bio's **own franchise** maps to this written name, if exactly one exists. Example: 2026 Punjab Kings "Cooper Connolly" → "C Connolly". This is used for stats attributes only; the page stays an unverified empty state.
4. **A written name shared by several players:** return **unknown**.
5. **A name that is not an IPL written name:** use an exact `playerName`/`fullName` match, if unique.

The initial+surname rule is gone. When the result is unknown, callers use their existing fallbacks.

### Measured effect (all 811 written names)

| Outcome | Names |
|---|---:|
| Same bio as before | 751 |
| **Corrected:** old returned another player's bio, new returns the player's own | **57** |
| Newly resolved ("Arshad Khan (2)", "PWH de Silva" → their merged bios) | 2 |
| Unknown: "Harmeet Singh", a written name of 2 different players | 1 |
| Resolves to another player's bio (asserted by test) | **0** |

### Hasaranga, before and after the merge

| Measure | Value |
|---|---|
| Bowler type | **Spinner** before Day 4.6, after the lookup fix, and after the merge |
| Page heading | "PW Hasaranga", unchanged |
| Profile and intel pages | Identical |
| Statistics | Unchanged |
| Only change | `isIndian` true → **false** (he is Sri Lankan, from his kept bio). The folded bio had a blank country, so the heuristic had guessed Indian. |

Every condition for the merge held, so it was kept.

---

## 3. Item 6: Navdeep Saini squad mapping (Nitin Saini unaffected)

**Evidence (raw IPL registry blocks):**
- **Navdeep Saini (21d4e29b, Cricinfo 700167)** is written "Navdeep Saini" in every season he played (2019, 2020/21, 2021, 2022, 2023, 2026), plus "NA Saini" once in 2023.
- **"N Saini" is Nitin Saini (addbde6c, Cricinfo 274785):** Kings XI Punjab 2012, 10 matches.

The changes, made by `scripts/src/day4/fix-saini-squads.ts` with each row checked against that season's files:

| Change | Rows |
|---|---|
| Squad rows "Navdeep Saini": `cricsheetName` "N Saini" → **"Navdeep Saini"** | 2019, 2020, 2021 RCB; 2022, 2023 RR; 2026 KKR (both squad files) |
| Bio `navdeep-saini.playerName` "N Saini" → **"Navdeep Saini"** | It now verifies to 21d4e29b by its exact written name. It previously needed franchise evidence and collided with Nitin's written name. |
| Squad 2012 Punjab Kings row (Nitin, addbde6c): display name "N Saini" → **"Nitin Saini"** | The `fullName` of his verified bio. Without this, his heading would drop from "Nitin Saini" to "N Saini". |

**Nitin Saini checks:**
- page heading "Nitin Saini", unchanged;
- bio unchanged;
- registry identity addbde6c and his 10 matches unchanged;
- new link slug `nitin-saini` → his page.

His summary's `bowlingStyle` string changed (§4); that is a separate, pre-existing defect.

---

## 4. Changed API outputs

The real Express app was run in-process against a copy of the production database (39 core endpoints, plus 34 profile and filter endpoints), comparing the end of Day 4.5 with the end of Day 4.6. **0 server errors.**

| Output | Change | Cause and evidence |
|---|---|---|
| `/api/ipl/stats/query` (all time) | `bowlerType` for 19 bowlers, `isIndian` for 3 batters and 2 bowlers. **No statistic changed.** | Lookup fix (57 corrections) plus the merges' countries |
| `/api/ipl/stats/query?season=2025` | `bowlerType` ×7, `isIndian` ×3 | Same |
| Pace/Spin, LHB/RHB and Indian/Overseas filters | Players move between groups, and the ball-level splits follow (e.g. "batters vs spin" now includes Kuldeep Yadav's deliveries) | Corrected classifications |
| `/api/ipl/team-analytics` (MI, DC) `bowlerSplit`; `/api/ipl/venue-analytics` `surface` | Pace vs spin totals (2 rows each) | Same classification source (`getBowlerTypeIdSets`) |
| `/api/ipl/squads-by-season` | 7 rows | §3 |
| `/api/players/912/summary` (Nitin Saini) | `bowlingStyle` "Right arm Fast" → "RIGHT ARM Fast"; `bowlingType` stays "pace" | Both values are **Navdeep's** (see §6-1) |
| All other summary / intel pages tested (J Yadav, KA Maharaj, RJ Gleeson, Hasaranga, Navdeep, Kuldeep, Rinku, Arshdeep, FH Allen, Connolly, Harmeet, both Jayant / Keshav / Richard / PWH slugs) | **Identical** | — |

**Bowler-type changes (19), with evidence:**
- **Pacer → Spinner** (each from the player's own bio):
  - Kuldeep Yadav: Left arm Wrist spin
  - Mujeeb Ur Rahman: Offbreak
  - M Shahrukh Khan: Offbreak
  - Musheer Khan: Slow Left arm Orthodox
  - CJ Green: Offbreak
- **Spinner → Pacer**, each from his own medium/fast bio style: Sandeep Sharma, Simarjeet Singh, Yudhvir Singh, VRV Singh, V Pratap Singh, Gagandeep Singh, Shoaib Ahmed, Y Gnaneswara Rao.
- **Spinner → Pacer with no style evidence:**
  - Ashok Sharma, Brijesh Sharma, Gurjapneet Singh, Raghu Sharma and SR Dubey: their own bios have no bowling style.
  - Harmeet Singh: unknown, a shared name; the only verified Harmeet bio says Right arm Medium.
  - For all six, the old value came from **another player's** bio. The new value is the classifier's existing default for an unknown style; the API has no "Unknown" bowler type (§6-2).

**Nationality changes** (verified bios' `country`): BKG Mendis → Sri Lanka, PWH de Silva → Sri Lanka, KA Maharaj → South Africa (filled by merge 2).

The Step-3 comparator now counts `bowlerType` as bio-derived **metadata**, alongside `isIndian` and `team`. It lists 40 row-fields for 22 players separately and passes on all statistics.

---

## 5. Test results

| Suite | Result |
|---|---|
| API (`pnpm --filter @workspace/api-server test`): Day 1 16, Day 2 19, Day 3 8, **new `bio-lookup.test.ts` 2** | **45/45** |
| Global and scout | **23/23** |
| Step-3 (identity, bio-merge guard, delivery sequence, economy regression, player page, warehouse reconcile) | **27 pass, 0 fail**, 1 skipped (the optional `CORRECTED_DB` check) |
| API / scripts typecheck | **0 / 0 errors** |
| Web typecheck | 11, the same pre-existing `cricket3d` errors |
| API build | ✔ |
| Identity audit | 0 MISSING / WRONG / MERGED. Registry ids with two bios: 0. |
| `sqlite.db` / `global.db` | `ab897a8c…` / `79c75f78…`: unchanged |

**Test changes, each tied to an approved change:**
- `bio-merge-guard`: the pinned collision list is now **empty**. The `jayant-yadav` assertion is restated as its real intent: never merged into `ut-yadav`, whose bio is checked unchanged.
- `identity.test.ts`: the merged slugs are asserted absent, and `j-yadav` / `ka-maharaj` / `rj-gleeson` are asserted correct with 20 / 2 / 3 matches.
- `economy-compare.ts`: `bowlerType` is treated as metadata.

---

## 6. Unresolved identity cases

1. **`player-profiles.ts` has its own initial+surname fallback** (`NameIndex.find`). It still gives Nitin Saini Navdeep's bowling style, through the 2026 auction list, and will affect other players. It needs the same registry-identity treatment as `getPlayerBio()`, measured across all players first. Not changed today.
2. **The API's bowler type has no "Unknown" value.** Six bowlers with no recorded style default to Pacer (Ashok Sharma, Brijesh Sharma, Gurjapneet Singh, Raghu Sharma, SR Dubey, Harmeet Singh). Their real styles are not in the repository and were not inferred.
3. **"Harmeet Singh"** is the written name of two players (2a72fd4f, 0bf15e52). The legacy aggregator groups by written name, so their figures are combined in one row; this is pre-existing.
4. **Team on merged bios:** `ka-maharaj` still says RR and `rj-gleeson` MI, while the 2026 squads say MI and RCB. The kept values were not overwritten, by policy. A sourced current-team update is a separate decision.
5. **The 2023 RR squad has a duplicate Navdeep row** (`{name: "NA Saini", cricsheetName: "Navdeep Saini"}`) next to the corrected "Navdeep Saini" row. It's harmless for identity and headings; left as is.
6. **50 bios have no verified identity**, including 7 squad-mapped 2026 players (Connolly, Duffy, Malewar, Hinge, Veer, Ghosh, Vijay) that the stats lookup now uses via squad evidence. Their pages keep the empty state. Tejasvi Singh Dahiya vs T Dahiya is still unestablished.
7. **Photo registry entries** for Cricinfo CDN images (e.g. `ka-maharaj`, `rj-gleeson`, `wanindu-hasaranga`) are marked "approved" without licence documentation. Unchanged, and still needs records.

---

## 7. Files changed

| Area | Files |
|---|---|
| API code | New `services/player-bio-lookup.ts`. `services/stats-aggregator.ts` (`getPlayerBio` → registry lookup). `src/scripts/smoke-db.ts` (profile endpoint set). |
| Tests | New `artifacts/api-server/test/bio-lookup.test.ts`. `scripts/src/step3/tests/bio-merge-guard.test.ts`, `identity.test.ts`. `scripts/src/step3/economy-compare.ts` (metadata). |
| Tools | New `scripts/src/day4/apply-day46-merges.ts`, `fix-saini-squads.ts`, `bio-lookup-impact.ts` |
| Data | `public/data/player-bio.json` + `api-server/data/player-bio.json` (857 → 853). Both `squads-by-season.json` (7 rows). `public/data/player-recent-matches/` index and `.json` (regenerated). |
| Docs | `docs/data-repairs/2026-10-14-day46/`: backup, merge logs, `saini-applied.md`, `bio-lookup-impact-before/after.json`, `profiles-compare.json`, `tests-final.txt` |

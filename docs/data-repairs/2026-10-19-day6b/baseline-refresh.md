# Step-3 statistical baseline refresh (2026-10-19, Day 6, approved)

**New baseline:** `docs/global-data-engine/step3/baseline-post-day6b-snapshot.json`. It was captured read-only from the production warehouse (`ab897a8c…`, unchanged) with the Day 6A identity and 6B Unknown-bowler-type code in place. `step3-regression.test.ts` now compares against it.

The Day 4.5 baseline (`baseline-post-day45-snapshot.json`) is kept unchanged as the historical record.

The owner approved the refresh on 2026-10-19 ("Accept the Day 6B reclassification: re-record the Step-3 baseline"). It was made only after comparing the new snapshot with the old baseline (`baseline-refresh-compare.md`, 28/34).

| Check | Result | Explanation |
|---|---|---|
| Conceded runs per bowler vs raw Cricsheet recount | PASS | No warehouse or runs-conceded change |
| Legacy `/api/stats/query` (2025, all, death 2024): batters | PASS, identical | — |
| Legacy `/api/stats/query`: bowlers | PASS, 0 of 576 changed | — |
| Weakness: V Kohli, SA Yadav, RG Sharma (batters) | Differ | Batters' cells split by bowler type. Balls from the 13 unknown-type bowlers are no longer "vs pace". Shivang Kumar, Yash Raj Punja and PR Veer are now spin (DAY-06-REPORT §B) |
| Weakness: Arshdeep Singh, SP Narine, B Kumar (bowlers) | Differ (not a compare FAIL item) | Batting-hand cells. Batters whose hand came from an initial+surname guess are now unknown (DAY-06-REPORT §A). Example: Arshdeep's "left-handers, overs 1–6" cell goes from 350 balls / 16 outs to 349 / 15. B Kumar gains one finding ("Left-handers") |
| Weakness: JJ Bumrah, Rashid Khan, YS Chahal, AB de Villiers | Identical | — |
| Match model: batter profiles (Kohli, SA Yadav, RG Sharma) | Differ | The vs-pace profile loses the unknown-type balls. Kohli 505 → 496 (phase 0) and 475 → 468 (phase 1); SA Yadav 136 → 134 and 450 → 445; RG Sharma 374 → 357 in phase 0. Strike rates and balls-per-out move with them (e.g. Kohli SR 160.1 → 160.6) |
| Match model: AB de Villiers | Identical | His career predates the unknown-type bowlers |

Every difference traces to a Day 6 change that was documented and approved. None is a statistic of the warehouse itself.

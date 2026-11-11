# Step-3 statistical baseline refresh (2026-10-14, Day 4.5)

New baseline: `docs/global-data-engine/step3/baseline-post-day45-snapshot.json`, captured from the corrected
warehouse (C1–C7) with `RUNS_CONCEDED_SQL` switched to the exact expression and the Day 4.5 identity changes in
place. The 2026-10-10 baseline (`baseline-economy-snapshot.json`) is kept unchanged as the historical record.

Refreshed only after comparing the new snapshot with the old baseline (`baseline-refresh-compare.md`, 33/34):

| Check | Result | Independent confirmation |
|---|---|---|
| Truth: conceded per bowler vs raw Cricsheet recount | PASS — **0** bowlers differ (430 in the 2026-10-10 baseline, 13 after the Step-3 fix) | `warehouse-reconcile.test.ts`: exact expression = source on all 295,732 deliveries |
| Batters (statistics), 3 queries | PASS — identical apart from the Day 4 zone `boundaryPct` redefinition, which is checked against each zone's own counts | — |
| Bowlers change only in runs-based fields | PASS | — |
| Player metadata | 89 row-fields, 25 players — the same set verified on Day 3 (SMAT / IPL appearances) | `data-integrity.test.ts` |
| engine: `results_win_pct` | Differs in w / l / nr / pct | For all 14 franchises, Δwins and Δlosses equal the franchise's super-over wins and losses in the source (`outcome.eliminator`, 16 ties), Δno-result = −(Δw + Δl), matches unchanged (C7) |

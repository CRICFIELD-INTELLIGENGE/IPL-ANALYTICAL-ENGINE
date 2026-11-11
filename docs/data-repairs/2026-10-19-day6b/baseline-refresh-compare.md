# Step 3 economy fix — regression results

Baseline: `C:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src` (2026-10-14T05:27:58.098Z). Patched: `C:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src` (2026-10-19T03:44:05.123Z).

**Verdict: FAIL** — 28/34 checks pass.

Total runs conceded across IPL (column store, innings 1–2): 394,281 → 394,281; raw Cricsheet recount 394,281.

| Check | Result | Detail |
|---|---|---|
| column store: n | PASS | 295557 → 295557 |
| column store: totalRuns | PASS | 401423 → 401423 |
| column store: batRuns | PASS | 381235 → 381235 |
| column store: legal | PASS | 284465 → 284465 |
| column store: wickets | PASS | 14655 → 14655 |
| column store: per-batter runs | PASS | identical for every batter |
| column store: conceded only decreases | PASS | total 394281 → 394281 (−0); 0 bowlers lower, 0 higher |
| engine: bowl_wickets_by_player | PASS | identical |
| engine: bowl_balls_by_player | PASS | identical |
| engine: bowl_five_fors | PASS | identical |
| engine: bat_runs_by_player | PASS | identical |
| engine: bat_sr_powerplay | PASS | identical |
| engine: bat_average_2024 | PASS | identical |
| engine: results_win_pct | PASS | identical |
| season lines: batting, balls bowled, wickets | PASS | 0 differences |
| season lines: runs conceded only decrease | PASS | 0 players lower (largest −0, player ); 0 higher |
| weakness: V Kohli (batter) | FAIL | differs |
| weakness: SA Yadav (batter) | FAIL | differs |
| weakness: RG Sharma (batter) | FAIL | differs |
| weakness: AB de Villiers (batter) | PASS | identical |
| match model: batter:V Kohli | FAIL | differs |
| match model: batter:SA Yadav | FAIL | differs |
| match model: batter:RG Sharma | FAIL | differs |
| match model: batter:AB de Villiers | PASS | identical |
| legacy /api/stats/query (2025): batters' scoringZones boundaryPct = boundaries per 100 balls | PASS | every zone matches its own counts |
| legacy /api/stats/query (2025): batters (statistics) | PASS | 166 batters identical (metadata fields and the redefined zone boundaryPct excluded) |
| legacy /api/stats/query (2025): bowlers change only in runs-based fields | PASS | 0 of 128 bowlers changed; fields: none |
| legacy /api/stats/query (all): batters' scoringZones boundaryPct = boundaries per 100 balls | PASS | every zone matches its own counts |
| legacy /api/stats/query (all): batters (statistics) | PASS | 736 batters identical (metadata fields and the redefined zone boundaryPct excluded) |
| legacy /api/stats/query (all): bowlers change only in runs-based fields | PASS | 0 of 576 bowlers changed; fields: none |
| legacy /api/stats/query (death_2024): batters' scoringZones boundaryPct = boundaries per 100 balls | PASS | every zone matches its own counts |
| legacy /api/stats/query (death_2024): batters (statistics) | PASS | 143 batters identical (metadata fields and the redefined zone boundaryPct excluded) |
| legacy /api/stats/query (death_2024): bowlers change only in runs-based fields | PASS | 0 of 97 bowlers changed; fields: none |
| truth: patched conceded per bowler vs raw Cricsheet recount | PASS | baseline: 0 bowlers differ; patched: 0 differ (net 0 runs), all attributable to the 17 multi-run no-ball / wide-with-penalty deliveries the warehouse cannot split |

## Advanced-stats engine (/api/ask)

| Query | Depends on conceded | Rows | Rows changed | Order changed | Result |
|---|---|---:|---:|---|---|
| bowl_economy_by_player | yes | 40 | 0 | no | unchanged |
| bowl_runs_conceded_2025 | yes | 40 | 0 | no | unchanged |
| bowl_dot_pct_death | yes | 40 | 0 | no | unchanged |
| bowl_average_by_team | yes | 14 | 0 | no | unchanged |
| bowl_economy_by_season | yes | 19 | 0 | no | unchanged |
| bowl_economy_by_phase | yes | 3 | 0 | no | unchanged |
| bowl_wickets_by_player | no | 40 | 0 | no | identical ✔ |
| bowl_balls_by_player | no | 40 | 0 | no | identical ✔ |
| bowl_five_fors | no | 20 | 0 | no | identical ✔ |
| bat_runs_by_player | no | 40 | 0 | no | identical ✔ |
| bat_sr_powerplay | no | 40 | 0 | no | identical ✔ |
| bat_average_2024 | no | 40 | 0 | no | identical ✔ |
| results_win_pct | no | 14 | 0 | no | identical ✔ |

**bowl_economy_by_season** (league level):

| Group | Before | After |
|---|---|---|
| 2008 | 8.1 | 8.1 |
| 2009 | 7.31 | 7.31 |
| 2010 | 7.95 | 7.95 |
| 2011 | 7.55 | 7.55 |
| 2012 | 7.67 | 7.67 |
| 2013 | 7.52 | 7.52 |
| 2014 | 8.01 | 8.01 |
| 2015 | 8.22 | 8.22 |
| 2016 | 8.17 | 8.17 |
| 2017 | 8.26 | 8.26 |
| 2018 | 8.53 | 8.53 |
| 2019 | 8.28 | 8.28 |
| 2020 | 8.17 | 8.17 |
| 2021 | 7.92 | 7.92 |
| 2022 | 8.4 | 8.4 |
| 2023 | 8.85 | 8.85 |
| 2024 | 9.42 | 9.42 |
| 2025 | 9.51 | 9.51 |
| 2026 | 9.77 | 9.77 |

**bowl_economy_by_phase** (league level):

| Group | Before | After |
|---|---|---|
| Death overs | 9.88 | 9.88 |
| Powerplay | 7.92 | 7.92 |
| Middle overs | 7.83 | 7.83 |

**Most economical bowlers (qualified), top 10 before and after:**

| # | Before | After |
|---:|---|---|
| 1 | M Muralitharan 6.68 | M Muralitharan 6.68 |
| 2 | SP Narine 6.79 | SP Narine 6.79 |
| 3 | DW Steyn 6.92 | DW Steyn 6.92 |
| 4 | Harbhajan Singh 7.08 | Harbhajan Singh 7.08 |
| 5 | SL Malinga 7.14 | SL Malinga 7.14 |
| 6 | R Ashwin 7.2 | R Ashwin 7.2 |
| 7 | M Kartik 7.25 | M Kartik 7.25 |
| 8 | SK Warne 7.27 | SK Warne 7.27 |
| 9 | Rashid Khan 7.28 | Rashid Khan 7.28 |
| 10 | JJ Bumrah 7.34 | JJ Bumrah 7.34 |
- weakness report for JJ Bumrah: unchanged
- weakness report for Rashid Khan: unchanged
- weakness report for YS Chahal: unchanged
- weakness report for Arshdeep Singh: changed (bowling runs basis corrected)
- weakness report for SP Narine: changed (bowling runs basis corrected)
- weakness report for B Kumar: changed (bowling runs basis corrected)
- match model bowler:JJ Bumrah: economy by phase 7.94 / 6.67 / 7.48 → 7.94 / 6.67 / 7.48; balls and balls-per-wicket identical
- match model bowler:Rashid Khan: economy by phase 7.07 / 8.27 / 10.74 → 7.07 / 8.27 / 10.74; balls and balls-per-wicket identical
- match model bowler:YS Chahal: economy by phase 6.43 / 8.79 / 10.46 → 6.43 / 8.79 / 10.46; balls and balls-per-wicket identical
- match model bowler:Arshdeep Singh: economy by phase 8.96 / 9.64 / 10.64 → 8.96 / 9.64 / 10.64; balls and balls-per-wicket identical
- match model bowler:SP Narine: economy by phase 8.27 / 6.90 / 6.02 → 8.27 / 6.90 / 6.02; balls and balls-per-wicket identical
- match model bowler:B Kumar: economy by phase 7.38 / 9.96 / 9.88 → 7.38 / 9.96 / 9.88; balls and balls-per-wicket identical

## Player metadata changes since the baseline (not statistics; 54 row-fields, 35 players)

Verified separately against warehouse evidence (SMAT appearances for nationality, IPL appearances for team).

- 2025 batters PWH de Silva.isIndian: true → false
- 2025 batters BKG Mendis.isIndian: true → false
- 2025 bowlers Kuldeep Yadav.bowlerType: "Pacer" → "Spinner"
- 2025 bowlers Sandeep Sharma.bowlerType: "Spinner" → "Pacer"
- 2025 bowlers Ishan Kishan.bowlerType: "Pacer" → "Unknown"
- 2025 bowlers Mujeeb Ur Rahman.bowlerType: "Pacer" → "Spinner"
- 2025 bowlers M Shahrukh Khan.bowlerType: "Pacer" → "Spinner"
- 2025 bowlers PWH de Silva.isIndian: true → false
- 2025 bowlers Simarjeet Singh.bowlerType: "Spinner" → "Pacer"
- 2025 bowlers Yudhvir Singh.bowlerType: "Spinner" → "Pacer"
- 2025 bowlers Musheer Khan.bowlerType: "Pacer" → "Spinner"
- all batters PWH de Silva.isIndian: true → false
- all batters KA Maharaj.isIndian: true → false
- all batters BKG Mendis.isIndian: true → false
- all bowlers Kuldeep Yadav.bowlerType: "Pacer" → "Spinner"
- all bowlers Sandeep Sharma.bowlerType: "Spinner" → "Pacer"
- all bowlers Ishan Kishan.bowlerType: "Pacer" → "Unknown"
- all bowlers Mujeeb Ur Rahman.bowlerType: "Pacer" → "Spinner"
- all bowlers CJ Green.bowlerType: "Pacer" → "Spinner"
- all bowlers M Shahrukh Khan.bowlerType: "Pacer" → "Spinner"
- all bowlers PWH de Silva.isIndian: true → false
- all bowlers Simarjeet Singh.bowlerType: "Spinner" → "Pacer"
- all bowlers Yudhvir Singh.bowlerType: "Spinner" → "Pacer"
- all bowlers KA Maharaj.isIndian: true → false
- all bowlers T Vijay.bowlerType: "Pacer" → "Unknown"
- all bowlers Ashok Sharma.bowlerType: "Spinner" → "Pacer"
- all bowlers Musheer Khan.bowlerType: "Pacer" → "Spinner"
- all bowlers Abhinandan Singh.bowlerType: "Pacer" → "Unknown"
- all bowlers DA Payne.bowlerType: "Pacer" → "Unknown"
- all bowlers B Muzarabani.bowlerType: "Pacer" → "Unknown"
- all bowlers Brijesh Sharma.bowlerType: "Spinner" → "Pacer"
- all bowlers Shivang Kumar.bowlerType: "Pacer" → "Spinner"
- all bowlers PR Veer.bowlerType: "Pacer" → "Spinner"
- all bowlers Auqib Nabi.bowlerType: "Pacer" → "Unknown"
- all bowlers Gurjapneet Singh.bowlerType: "Spinner" → "Unknown"
- all bowlers GF Linde.bowlerType: "Pacer" → "Unknown"
- all bowlers Yash Raj Punja.bowlerType: "Pacer" → "Spinner"
- all bowlers RS Ghosh.bowlerType: "Pacer" → "Unknown"
- all bowlers Raghu Sharma.bowlerType: "Spinner" → "Unknown"
- all bowlers SR Dubey.bowlerType: "Spinner" → "Unknown"
- all bowlers VRV Singh.bowlerType: "Spinner" → "Pacer"
- all bowlers Gagandeep Singh.bowlerType: "Spinner" → "Pacer"
- all bowlers Harmeet Singh.bowlerType: "Spinner" → "Pacer"
- all bowlers Shoaib Ahmed.bowlerType: "Spinner" → "Pacer"
- all bowlers Y Gnaneswara Rao.bowlerType: "Spinner" → "Pacer"
- all bowlers V Pratap Singh.bowlerType: "Spinner" → "Pacer"
- all bowlers Harmeet Singh (2).bowlerType: "Pacer" → "Unknown"
- all bowlers BJ Rohrer.bowlerType: "Pacer" → "Unknown"
- death_2024 batters KA Maharaj.isIndian: true → false
- death_2024 bowlers Kuldeep Yadav.bowlerType: "Pacer" → "Spinner"
- death_2024 bowlers Sandeep Sharma.bowlerType: "Spinner" → "Pacer"
- death_2024 bowlers M Shahrukh Khan.bowlerType: "Pacer" → "Spinner"
- death_2024 bowlers Simarjeet Singh.bowlerType: "Spinner" → "Pacer"
- death_2024 bowlers Yudhvir Singh.bowlerType: "Spinner" → "Pacer"

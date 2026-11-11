# Step 3 economy fix — regression results

Baseline: `C:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src` (2026-10-10T11:46:22.776Z). Patched: `C:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src` (2026-10-14T05:27:58.098Z).

**Verdict: FAIL** — 33/34 checks pass.

Total runs conceded across IPL (column store, innings 1–2): 401,423 → 394,281; raw Cricsheet recount 394,281.

| Check | Result | Detail |
|---|---|---|
| column store: n | PASS | 295557 → 295557 |
| column store: totalRuns | PASS | 401423 → 401423 |
| column store: batRuns | PASS | 381235 → 381235 |
| column store: legal | PASS | 284465 → 284465 |
| column store: wickets | PASS | 14655 → 14655 |
| column store: per-batter runs | PASS | identical for every batter |
| column store: conceded only decreases | PASS | total 401423 → 394281 (−7142); 430 bowlers lower, 0 higher |
| engine: bowl_wickets_by_player | PASS | same rows, order and ranked metric; only runs/econ/avg/dot companion columns changed |
| engine: bowl_balls_by_player | PASS | same rows, order and ranked metric; only runs/econ/avg/dot companion columns changed |
| engine: bowl_five_fors | PASS | same rows, order and ranked metric; only runs/econ/avg/dot companion columns changed |
| engine: bat_runs_by_player | PASS | identical |
| engine: bat_sr_powerplay | PASS | identical |
| engine: bat_average_2024 | PASS | identical |
| engine: results_win_pct | FAIL | differs in l, nr, pct, w |
| season lines: batting, balls bowled, wickets | PASS | 0 differences |
| season lines: runs conceded only decrease | PASS | 430 players lower (largest −132, player 5); 0 higher |
| weakness: V Kohli (batter) | PASS | identical |
| weakness: SA Yadav (batter) | PASS | identical |
| weakness: RG Sharma (batter) | PASS | identical |
| weakness: AB de Villiers (batter) | PASS | identical |
| match model: batter:V Kohli | PASS | identical |
| match model: batter:SA Yadav | PASS | identical |
| match model: batter:RG Sharma | PASS | identical |
| match model: batter:AB de Villiers | PASS | identical |
| legacy /api/stats/query (2025): batters' scoringZones boundaryPct = boundaries per 100 balls | PASS | every zone matches its own counts |
| legacy /api/stats/query (2025): batters (statistics) | PASS | 166 batters identical (metadata fields and the redefined zone boundaryPct excluded) |
| legacy /api/stats/query (2025): bowlers change only in runs-based fields | PASS | 128 of 128 bowlers changed; fields: econ, avg, deliveryBreakdown, trueEconomy, best |
| legacy /api/stats/query (all): batters' scoringZones boundaryPct = boundaries per 100 balls | PASS | every zone matches its own counts |
| legacy /api/stats/query (all): batters (statistics) | PASS | 736 batters identical (metadata fields and the redefined zone boundaryPct excluded) |
| legacy /api/stats/query (all): bowlers change only in runs-based fields | PASS | 576 of 576 bowlers changed; fields: trueEconomy, econ, avg, deliveryBreakdown, best |
| legacy /api/stats/query (death_2024): batters' scoringZones boundaryPct = boundaries per 100 balls | PASS | every zone matches its own counts |
| legacy /api/stats/query (death_2024): batters (statistics) | PASS | 143 batters identical (metadata fields and the redefined zone boundaryPct excluded) |
| legacy /api/stats/query (death_2024): bowlers change only in runs-based fields | PASS | 97 of 97 bowlers changed; fields: econ, avg, deliveryBreakdown, trueEconomy, best |
| truth: patched conceded per bowler vs raw Cricsheet recount | PASS | baseline: 430 bowlers differ; patched: 0 differ (net 0 runs), all attributable to the 17 multi-run no-ball / wide-with-penalty deliveries the warehouse cannot split |

## Advanced-stats engine (/api/ask)

| Query | Depends on conceded | Rows | Rows changed | Order changed | Result |
|---|---|---:|---:|---|---|
| bowl_economy_by_player | yes | 40 | 40 | yes | changed columns: runs, econ, avg, dot |
| bowl_runs_conceded_2025 | yes | 40 | 39 | yes | changed columns: runs, econ, avg, dot |
| bowl_dot_pct_death | yes | 40 | 40 | yes | changed columns: runs, econ, avg, dot |
| bowl_average_by_team | yes | 14 | 14 | yes | changed columns: runs, econ, avg, dot |
| bowl_economy_by_season | yes | 19 | 19 | no | changed columns: runs, econ, avg, dot |
| bowl_economy_by_phase | yes | 3 | 3 | no | changed columns: runs, econ, avg, dot |
| bowl_wickets_by_player | no | 40 | 40 | no | ranking, order and ranked metric identical ✔ (companion columns runs, econ, avg, dot corrected) |
| bowl_balls_by_player | no | 40 | 40 | no | ranking, order and ranked metric identical ✔ (companion columns runs, econ, avg, dot corrected) |
| bowl_five_fors | no | 20 | 20 | no | ranking, order and ranked metric identical ✔ (companion columns runs, econ, avg, dot corrected) |
| bat_runs_by_player | no | 40 | 0 | no | identical ✔ |
| bat_sr_powerplay | no | 40 | 0 | no | identical ✔ |
| bat_average_2024 | no | 40 | 0 | no | identical ✔ |
| results_win_pct | no | 14 | 10 | no | DIFFERS ✘ l, nr, pct, w |

**bowl_economy_by_season** (league level):

| Group | Before | After |
|---|---|---|
| 2008 | 8.31 | 8.1 |
| 2009 | 7.48 | 7.31 |
| 2010 | 8.13 | 7.95 |
| 2011 | 7.73 | 7.55 |
| 2012 | 7.83 | 7.67 |
| 2013 | 7.68 | 7.52 |
| 2014 | 8.2 | 8.01 |
| 2015 | 8.37 | 8.22 |
| 2016 | 8.31 | 8.17 |
| 2017 | 8.41 | 8.26 |
| 2018 | 8.65 | 8.53 |
| 2019 | 8.41 | 8.28 |
| 2020 | 8.29 | 8.17 |
| 2021 | 8.05 | 7.92 |
| 2022 | 8.54 | 8.4 |
| 2023 | 8.99 | 8.85 |
| 2024 | 9.56 | 9.42 |
| 2025 | 9.63 | 9.51 |
| 2026 | 9.88 | 9.77 |

**bowl_economy_by_phase** (league level):

| Group | Before | After |
|---|---|---|
| Death overs | 10.06 | 9.88 |
| Powerplay | 8.09 | 7.92 |
| Middle overs | 7.95 | 7.83 |

**Most economical bowlers (qualified), top 10 before and after:**

| # | Before | After |
|---:|---|---|
| 1 | M Muralitharan 6.91 | M Muralitharan 6.68 |
| 2 | SP Narine 6.92 | SP Narine 6.79 |
| 3 | DW Steyn 7.08 | DW Steyn 6.92 |
| 4 | Harbhajan Singh 7.2 | Harbhajan Singh 7.08 |
| 5 | R Ashwin 7.29 | SL Malinga 7.14 |
| 6 | SK Warne 7.36 | R Ashwin 7.2 |
| 7 | SL Malinga 7.4 | M Kartik 7.25 |
| 8 | M Kartik 7.4 | SK Warne 7.27 |
| 9 | Rashid Khan 7.43 | Rashid Khan 7.28 |
| 10 | A Mishra 7.46 | JJ Bumrah 7.34 |
- weakness report for JJ Bumrah: changed (bowling runs basis corrected)
- weakness report for Rashid Khan: changed (bowling runs basis corrected)
- weakness report for YS Chahal: changed (bowling runs basis corrected)
- weakness report for Arshdeep Singh: changed (bowling runs basis corrected)
- weakness report for SP Narine: changed (bowling runs basis corrected)
- weakness report for B Kumar: changed (bowling runs basis corrected)
- match model bowler:JJ Bumrah: economy by phase 8.13 / 6.79 / 7.64 → 7.94 / 6.67 / 7.48; balls and balls-per-wicket identical
- match model bowler:Rashid Khan: economy by phase 7.16 / 8.41 / 11.01 → 7.07 / 8.27 / 10.74; balls and balls-per-wicket identical
- match model bowler:YS Chahal: economy by phase 6.47 / 8.86 / 10.52 → 6.43 / 8.79 / 10.46; balls and balls-per-wicket identical
- match model bowler:Arshdeep Singh: economy by phase 9.10 / 9.70 / 10.72 → 8.96 / 9.64 / 10.64; balls and balls-per-wicket identical
- match model bowler:SP Narine: economy by phase 8.40 / 7.06 / 6.23 → 8.27 / 6.90 / 6.02; balls and balls-per-wicket identical
- match model bowler:B Kumar: economy by phase 7.55 / 10.00 / 9.96 → 7.38 / 9.96 / 9.88; balls and balls-per-wicket identical

## Player metadata changes since the baseline (not statistics; 89 row-fields, 25 players)

Verified separately against warehouse evidence (SMAT appearances for nationality, IPL appearances for team).

- 2025 batters AR Patel.isIndian: false → true
- 2025 batters R Powell.isIndian: true → false
- 2025 batters AS Roy.isIndian: false → true
- 2025 batters Abdul Samad.isIndian: false → true
- 2025 batters R Shepherd.isIndian: true → false
- 2025 batters D Brevis.isIndian: true → false
- 2025 batters D Ferreira.isIndian: true → false
- 2025 batters Azmatullah Omarzai.isIndian: true → false
- 2025 batters WG Jacks.isIndian: true → false
- 2025 batters RD Rickelton.isIndian: true → false
- 2025 batters J Overton.isIndian: true → false
- 2025 batters PHKD Mendis.isIndian: true → false
- 2025 batters XC Bartlett.isIndian: true → false
- 2025 batters JG Bethell.isIndian: true → false
- 2025 batters Urvil Patel.isIndian: false → true
- 2025 batters MP Breetzke.isIndian: true → false
- 2025 bowlers AR Patel.isIndian: false → true
- 2025 bowlers Rasikh Salam.isIndian: false → true
- 2025 bowlers AS Roy.isIndian: false → true
- 2025 bowlers Abdul Samad.isIndian: false → true
- 2025 bowlers NT Ellis.isIndian: true → false
- 2025 bowlers R Shepherd.isIndian: true → false
- 2025 bowlers Azmatullah Omarzai.isIndian: true → false
- 2025 bowlers WG Jacks.isIndian: true → false
- 2025 bowlers N Thushara.isIndian: true → false
- 2025 bowlers J Overton.isIndian: true → false
- 2025 bowlers PHKD Mendis.isIndian: true → false
- 2025 bowlers XC Bartlett.isIndian: true → false
- all batters AR Patel.isIndian: false → true
- all batters R Powell.isIndian: true → false
- all batters Rasikh Salam.isIndian: false → true
- all batters AS Roy.isIndian: false → true
- all batters Abdul Samad.isIndian: false → true
- all batters Umran Malik.isIndian: false → true
- all batters GD Phillips.isIndian: true → false
- all batters NT Ellis.isIndian: true → false
- all batters R Shepherd.isIndian: true → false
- all batters D Brevis.isIndian: true → false
- all batters D Ferreira.isIndian: true → false
- all batters N Burger.isIndian: true → false
- all batters Azmatullah Omarzai.isIndian: true → false
- all batters WG Jacks.isIndian: true → false
- all batters RD Rickelton.isIndian: true → false
- all batters J Overton.isIndian: true → false
- all batters PHKD Mendis.isIndian: true → false
- all batters XC Bartlett.isIndian: true → false
- all batters JG Bethell.isIndian: true → false
- all batters Urvil Patel.isIndian: false → true
- all batters MP Breetzke.isIndian: true → false
- all batters AM Ghazanfar.isIndian: true → false
- all bowlers AR Patel.isIndian: false → true
- all bowlers R Powell.isIndian: true → false
- all bowlers Rasikh Salam.isIndian: false → true
- all bowlers AS Roy.isIndian: false → true
- all bowlers Abdul Samad.isIndian: false → true
- all bowlers Umran Malik.isIndian: false → true
- all bowlers GD Phillips.isIndian: true → false
- all bowlers NT Ellis.isIndian: true → false
- all bowlers R Shepherd.isIndian: true → false
- all bowlers D Brevis.isIndian: true → false
- all bowlers D Ferreira.isIndian: true → false
- all bowlers N Burger.isIndian: true → false
- all bowlers Azmatullah Omarzai.isIndian: true → false
- all bowlers WG Jacks.isIndian: true → false
- all bowlers N Thushara.isIndian: true → false
- all bowlers J Overton.isIndian: true → false
- all bowlers PHKD Mendis.isIndian: true → false
- all bowlers XC Bartlett.isIndian: true → false
- all bowlers Ashok Sharma.team: "All" → "Gujarat Titans"
- all bowlers AM Ghazanfar.isIndian: true → false
- all bowlers Brijesh Sharma.team: "All" → "Rajasthan Royals"
- death_2024 batters AR Patel.isIndian: false → true
- death_2024 batters R Powell.isIndian: true → false
- death_2024 batters Rasikh Salam.isIndian: false → true
- death_2024 batters AS Roy.isIndian: false → true
- death_2024 batters Abdul Samad.isIndian: false → true
- death_2024 batters R Shepherd.isIndian: true → false
- death_2024 batters D Brevis.isIndian: true → false
- death_2024 batters D Ferreira.isIndian: true → false
- death_2024 batters Azmatullah Omarzai.isIndian: true → false
- death_2024 batters WG Jacks.isIndian: true → false
- death_2024 bowlers AR Patel.isIndian: false → true
- death_2024 bowlers Rasikh Salam.isIndian: false → true
- death_2024 bowlers AS Roy.isIndian: false → true
- death_2024 bowlers NT Ellis.isIndian: true → false
- death_2024 bowlers R Shepherd.isIndian: true → false
- death_2024 bowlers N Burger.isIndian: true → false
- death_2024 bowlers Azmatullah Omarzai.isIndian: true → false
- death_2024 bowlers N Thushara.isIndian: true → false

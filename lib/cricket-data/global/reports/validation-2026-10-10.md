# Validation report — 2026-10-10

Checks: **118 pass, 2 warn, 0 fail.** WARN marks a property of the source worth knowing, not a load error.

| Competition | Catalogue | Archive | README | Database | Deliveries | Seasons |
|---|---:|---:|---:|---:|---:|---:|
| ipl | 1243 | 1243 | 1243 | 1243 | 295,732 | 19 |
| smat | 695 | 695 | 695 | 695 | 158,839 | 9 |
| bbl | 662 | 662 | 662 | 662 | 153,250 | 15 |
| sa20 | 130 | 130 | 130 | 130 | 29,020 | 4 |
| cpl | 445 | 445 | 445 | 445 | 103,717 | 14 |
| ilt20 | 134 | 134 | 134 | 134 | 31,407 | 4 |

## Indian Premier League (ipl)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 1243, archive 1243, README 1243, database 1243 (in newest source) / 1243 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 1243 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 295732 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 4 long overs, 4 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 545 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 650 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 650 chases checked, 0 short |
| PASS | Tied matches have equal totals | 16 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 1203 targets checked, 0 differ; 11 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 9, tie 16, winner 1195, winner (D/L) 23 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.2.0 1243 |

## Syed Mushtaq Ali Trophy (smat)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 695, archive 695, README 695, database 695 (in newest source) / 695 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 695 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 158839 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 2 long overs, 2 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 272 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 409 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 409 chases checked, 0 short |
| PASS | Tied matches have equal totals | 5 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 89 targets checked, 0 differ; 0 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 4, tie 5, winner 681, winner (VJD) 5 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| WARN | No missing seasons between the first and last | missing seasons: 2016/17 |
| WARN | Seasons with far fewer matches than the competition's largest season | 2022/23: 44, 2023/24: 39, 2024/25: 8 |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.2.0 695 |

<details><summary>season_gaps: examples</summary>

```json
[
 "2016/17"
]
```
</details>

<details><summary>thin_seasons: examples</summary>

```json
[
 {
  "season_label": "2022/23",
  "season_year": 2022,
  "matches": 44
 },
 {
  "season_label": "2023/24",
  "season_year": 2023,
  "matches": 39
 },
 {
  "season_label": "2024/25",
  "season_year": 2024,
  "matches": 8
 }
]
```
</details>

## Big Bash League (bbl)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 662, archive 662, README 662, database 662 (in newest source) / 662 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 662 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 153250 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 1 long overs, 1 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 289 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 326 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 326 chases checked, 0 short |
| PASS | Tied matches have equal totals | 4 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 614 targets checked, 0 differ; 10 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 11, tie 4, winner 615, winner (D/L) 32 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.2.0 662 |

## SA20 (sa20)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 130, archive 130, README 130, database 130 (in newest source) / 130 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 130 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 29020 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 0 long overs, 0 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 63 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 54 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 54 chases checked, 0 short |
| PASS | Tied matches have equal totals | 1 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 118 targets checked, 0 differ; 0 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 7, tie 1, winner 117, winner (D/L) 5 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.2.0 130 |

## Caribbean Premier League (cpl)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 445, archive 445, README 445, database 445 (in newest source) / 445 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 445 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 103717 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 1 long overs, 1 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 180 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 226 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 226 chases checked, 0 short |
| PASS | Tied matches have equal totals | 2 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 403 targets checked, 0 differ; 5 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 7, tie 2, winner 406, winner (D/L) 30 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.2.0 442, 1.3.0 3 |

## International League T20 (ilt20)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 134, archive 134, README 134, database 134 (in newest source) / 134 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 134 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 31407 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 0 long overs, 0 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 51 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 81 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 81 chases checked, 0 short |
| PASS | Tied matches have equal totals | 1 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 132 targets checked, 0 differ; 1 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 1, tie 1, winner 132 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.2.0 134 |

## IPL: current Cricsheet archive (global.db) vs existing warehouse (sqlite.db)

- Matches: global 1243, warehouse 1243; only in global: 0; only in warehouse: 0.

| Field (all matches, incl. super overs) | global.db | sqlite.db | Difference |
|---|---:|---:|---:|
| balls | 295,732 | 295,732 | 0 |
| runs | 401,738 | 401,738 | 0 |
| batter_runs | 381,529 | 381,529 | 0 |
| extras | 20,209 | 20,209 | 0 |
| wides | 9,876 | 9,876 | 0 |
| noballs | 1,226 | 1,226 | 0 |
| wickets | 14,705 | 14,705 | 0 |
| innings | 2,514 | 2,514 | 0 |

Match-level differences: **0**.

Player-season comparison (runs, balls faced, dismissals, legal balls, runs conceded, bowler wickets; super overs excluded): 3338 player-seasons, **1485 differing values**.

| Player | Season | Field | global.db | sqlite.db |
|---|---|---|---:|---:|
| D Salunkhe (0264c10e) | 2007/08 | conceded | 78 | 80 |
| Yash Raj Punja (02dfebbe) | 2026 | conceded | 279 | 281 |
| K Yadav (030f3089) | 2021 | conceded | 16 | 17 |
| VRV Singh (034b4b7d) | 2007/08 | conceded | 420 | 425 |
| VRV Singh (034b4b7d) | 2009 | conceded | 82 | 83 |
| VRV Singh (034b4b7d) | 2009/10 | conceded | 40 | 41 |
| JR Hazlewood (03806cf8) | 2020/21 | conceded | 64 | 72 |
| JR Hazlewood (03806cf8) | 2021 | conceded | 293 | 302 |
| JR Hazlewood (03806cf8) | 2022 | conceded | 377 | 380 |
| JR Hazlewood (03806cf8) | 2025 | conceded | 386 | 389 |
| JR Hazlewood (03806cf8) | 2026 | conceded | 494 | 506 |
| V Viyaskanth (03a83c50) | 2024 | conceded | 86 | 90 |
| R Parag (04a418e8) | 2025 | conceded | 170 | 171 |
| RE van der Merwe (05c2ca46) | 2009 | conceded | 248 | 263 |
| RE van der Merwe (05c2ca46) | 2011 | conceded | 92 | 94 |
| SB Bangar (0604ef16) | 2007/08 | conceded | 219 | 221 |
| VR Aaron (0a3d54b9) | 2011 | conceded | 82 | 83 |
| VR Aaron (0a3d54b9) | 2012 | conceded | 271 | 279 |
| VR Aaron (0a3d54b9) | 2014 | conceded | 299 | 309 |
| VR Aaron (0a3d54b9) | 2015 | conceded | 177 | 180 |
| VR Aaron (0a3d54b9) | 2016 | conceded | 227 | 229 |
| VR Aaron (0a3d54b9) | 2017 | conceded | 163 | 170 |
| VR Aaron (0a3d54b9) | 2019 | conceded | 116 | 128 |
| VR Aaron (0a3d54b9) | 2020/21 | conceded | 94 | 96 |
| VR Aaron (0a3d54b9) | 2022 | conceded | 52 | 53 |
| S Dhawan (0a476045) | 2011 | conceded | 11 | 12 |
| S Dhawan (0a476045) | 2012 | conceded | 55 | 60 |
| T Henderson (0a4ebc61) | 2009 | conceded | 40 | 41 |
| Akash Deep (0a67aec0) | 2022 | conceded | 205 | 206 |
| Akash Deep (0a67aec0) | 2023 | conceded | 59 | 63 |
| Akash Deep (0a67aec0) | 2025 | conceded | 229 | 230 |
| Mustafizur Rahman (0a8fce53) | 2016 | conceded | 421 | 427 |
| Mustafizur Rahman (0a8fce53) | 2018 | conceded | 230 | 232 |
| Mustafizur Rahman (0a8fce53) | 2021 | conceded | 436 | 448 |
| Mustafizur Rahman (0a8fce53) | 2022 | conceded | 244 | 248 |
| Mustafizur Rahman (0a8fce53) | 2024 | conceded | 318 | 324 |
| A Kumble (0c2730df) | 2007/08 | conceded | 304 | 314 |
| A Kumble (0c2730df) | 2009 | conceded | 347 | 353 |
| A Kumble (0c2730df) | 2009/10 | conceded | 407 | 422 |
| P Parameswaran (0c432afb) | 2012 | conceded | 87 | 89 |
| HR Shokeen (0c9652b0) | 2022 | conceded | 127 | 130 |
| HR Shokeen (0c9652b0) | 2023 | conceded | 187 | 190 |
| MA Khote (0d232ffd) | 2007/08 | conceded | 51 | 52 |
| Shahid Afridi (0dc00542) | 2007/08 | conceded | 225 | 237 |
| NLTC Perera (0f12f9df) | 2011 | conceded | 111 | 114 |
| NLTC Perera (0f12f9df) | 2013 | conceded | 478 | 490 |
| JO Holder (0f721006) | 2013 | conceded | 168 | 173 |
| JO Holder (0f721006) | 2016 | conceded | 103 | 105 |
| JO Holder (0f721006) | 2020/21 | conceded | 233 | 239 |
| JO Holder (0f721006) | 2021 | conceded | 247 | 248 |
| JO Holder (0f721006) | 2022 | conceded | 391 | 399 |
| JO Holder (0f721006) | 2023 | conceded | 284 | 290 |
| JO Holder (0f721006) | 2026 | conceded | 290 | 292 |
| KT Maphaka (107c26fb) | 2024 | conceded | 89 | 90 |
| KT Maphaka (107c26fb) | 2025 | conceded | 54 | 58 |
| SR Dubey (11061889) | 2026 | conceded | 106 | 110 |
| D Pretorius (11614d87) | 2022 | conceded | 210 | 213 |
| D Pretorius (11614d87) | 2023 | conceded | 28 | 29 |
| KV Sharma (119678fd) | 2013 | conceded | 230 | 235 |
| KV Sharma (119678fd) | 2014 | conceded | 376 | 393 |

- All 1485 runs-conceded differences have one cause: sqlite.db's is_bye, is_legbye and is_penalty flags are 0 on every row, so the existing site's formula (total_runs minus extras when those flags are set) never removes byes, leg-byes or penalties. The warehouse side is higher by 7,142 runs; the current archive records 7,142 bye, leg-bye and penalty runs outside super overs — an exact match. global.db charges bowlers only batter runs + wides + no-balls. The existing IPL site was not changed (Batch 1 scope); this affects its economy figures.
- Runs, balls faced, dismissals, legal balls and bowler wickets agree exactly for every player-season.

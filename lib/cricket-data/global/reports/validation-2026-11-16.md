# Validation report — 2026-11-16

Checks: **265 pass, 14 warn, 1 fail.** WARN marks a property of the source worth knowing, not a load error.

| Competition | Catalogue | Archive | README | Database | Deliveries | Seasons |
|---|---:|---:|---:|---:|---:|---:|
| ipl | 1243 | 1243 | 1243 | 1243 | 295,732 | 19 |
| smat | 695 | 695 | 695 | 695 | 158,839 | 9 |
| bbl | 662 | 662 | 662 | 662 | 153,250 | 15 |
| sa20 | 130 | 130 | 130 | 130 | 29,020 | 4 |
| cpl | 445 | 445 | 445 | 445 | 103,717 | 14 |
| ilt20 | 134 | 134 | 134 | 134 | 31,407 | 4 |
| t20i | 3592 | 3649 | 3649 | 3649 | 820,658 | 45 |
| psl | 357 | 357 | 357 | 357 | 83,799 | 12 |
| bpl | 469 | 469 | 469 | 469 | 111,232 | 12 |
| lpl | 143 | 143 | 143 | 143 | 32,917 | 6 |
| mlc | 109 | 109 | 109 | 109 | 25,529 | 4 |
| blast | 1570 | 1570 | 1570 | 1570 | 360,545 | 13 |
| supersmash | 270 | 270 | 270 | 270 | 61,502 | 11 |
| npl | 76 | 76 | 76 | 76 | 17,553 | 3 |

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
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 1243 |

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
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 695 |

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
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 662 |

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
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 130 |

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
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 445 |

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
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 134 |

## Men's T20 Internationals (t20i)

| Result | Check | Detail |
|---|---|---|
| WARN | Match counts agree (catalogue, archive, README, database) | catalogue 3592, archive 3649, README 3649, database 3649 (in newest source) / 3649 (total) |
| PASS | Every match is male, international, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 3649 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 820658 |
| WARN | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 37 long overs, 36 explained by miscounted_overs, 1 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| FAIL | Win by runs = first-innings total − second-innings total | 1672 matches checked, 1 differ |
| WARN | Win by wickets = 10 − wickets lost by the chasing side | 1731 matches checked, 1 differ |
| PASS | Winning chase reaches the target | 1731 chases checked, 0 short |
| PASS | Tied matches have equal totals | 36 ties checked, 0 differ |
| WARN | Full-length chase target = first-innings total + 1 (no D/L) | 3326 targets checked, 1 differ; 114 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 81, tie 36, tie (D/L) 2, winner 3403, winner (Awarded) 3, winner (D/L) 124 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| WARN | Seasons with far fewer matches than the competition's largest season | 2004/05: 1, 2005: 1, 2005/06: 4, 2006: 2, 2006/07: 4, 2007: 2, 2007/08: 38, 2008: 5, 2008/09: 14, 2009: 33, 2009/10: 19, 2010: 35, 2010/11: 11, 2011: 10, 2011/12: 30, 2012: 16, 2012/13: 46, 2013: 15, 2013/14: 61, 2014: 5, 2014/15: 10, 2015: 27, 2015/16: 84, 2016: 10, 2016/17: 26, 2017: 13, 2017/18: 41, 2018: 30, 2018/19: 52, 2019: 73, 2020: 10, 2020/21: 37, 2026/27: 68 |
| WARN | No unrecognised JSON keys (kept verbatim if found) | 1 unknown paths; data versions: 1.3.0 3649 |

<details><summary>over_structure: examples</summary>

```json
[
 {
  "match_id": 1298152,
  "innings_no": 1,
  "over_no": 8,
  "legal": 7,
  "bpo": 6,
  "miscounted": null
 }
]
```
</details>

<details><summary>margin_runs: examples</summary>

```json
[
 {
  "match": 1495657,
  "first": 178,
  "second": 133,
  "recorded": 46
 }
]
```
</details>

<details><summary>margin_wickets: examples</summary>

```json
[
 {
  "match": 1491604,
  "wicketsLost": 4,
  "recorded": 8
 }
]
```
</details>

<details><summary>targets: examples</summary>

```json
[
 {
  "match": 1457218,
  "target": 169,
  "firstInnings": 166
 }
]
```
</details>

<details><summary>thin_seasons: examples</summary>

```json
[
 {
  "season_label": "2004/05",
  "season_year": 2005,
  "matches": 1
 },
 {
  "season_label": "2005",
  "season_year": 2005,
  "matches": 1
 },
 {
  "season_label": "2005/06",
  "season_year": 2005,
  "matches": 4
 },
 {
  "season_label": "2006",
  "season_year": 2006,
  "matches": 2
 },
 {
  "season_label": "2006/07",
  "season_year": 2006,
  "matches": 4
 },
 {
  "season_label": "2007",
  "season_year": 2007,
  "matches": 2
 },
 {
  "season_label": "2007/08",
  "season_year": 2007,
  "matches": 38
 },
 {
  "season_label": "2008",
  "season_year": 2008,
  "matches": 5
 },
 {
  "season_label": "2008/09",
  "season_year": 2008,
  "matches": 14
 },
 {
  "season_label": "2009",
  "season_year": 2009,
  "matches": 33
 }
]
```
</details>

<details><summary>schema_drift: examples</summary>

```json
[
 {
  "path": "identity.unregistered_fielder.",
  "occurrences": 15
 }
]
```
</details>

## Pakistan Super League (psl)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 357, archive 357, README 357, database 357 (in newest source) / 357 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 357 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 83799 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 2 long overs, 2 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 153 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 193 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 193 chases checked, 0 short |
| PASS | Tied matches have equal totals | 4 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 343 targets checked, 0 differ; 7 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 3, tie 4, winner 346, winner (D/L) 4 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 357 |

## Bangladesh Premier League (bpl)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 469, archive 469, README 469, database 469 (in newest source) / 469 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 469 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 111232 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 1 long overs, 1 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 218 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 245 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 245 chases checked, 0 short |
| PASS | Tied matches have equal totals | 3 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 466 targets checked, 0 differ; 0 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | tie 3, winner 463, winner (D/L) 3 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| WARN | No missing seasons between the first and last | missing seasons: 2013/14, 2014/15, 2020/21 |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| WARN | No unrecognised JSON keys (kept verbatim if found) | 1 unknown paths; data versions: 1.3.0 469 |

<details><summary>season_gaps: examples</summary>

```json
[
 "2013/14",
 "2014/15",
 "2020/21"
]
```
</details>

<details><summary>schema_drift: examples</summary>

```json
[
 {
  "path": "identity.unregistered_fielder.",
  "occurrences": 4
 }
]
```
</details>

## Lanka Premier League (lpl)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 143, archive 143, README 143, database 143 (in newest source) / 143 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 143 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 32917 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 0 long overs, 0 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 69 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 64 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 64 chases checked, 0 short |
| PASS | Tied matches have equal totals | 3 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 131 targets checked, 0 differ; 6 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 3, tie 3, winner 133, winner (D/L) 4 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| WARN | No missing seasons between the first and last | missing seasons: 2025 |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 143 |

<details><summary>season_gaps: examples</summary>

```json
[
 "2025"
]
```
</details>

## Major League Cricket (mlc)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 109, archive 109, README 109, database 109 (in newest source) / 109 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 109 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 25529 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 0 long overs, 0 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 48 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 57 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 57 chases checked, 0 short |
| PASS | Tied matches have equal totals | 0 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 103 targets checked, 0 differ; 3 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 1, winner 105, winner (D/L) 3 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 109 |

## T20 Blast (blast)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 1570, archive 1570, README 1570, database 1570 (in newest source) / 1570 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 1570 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 360545 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 1 long overs, 1 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 742 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 694 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 694 chases checked, 0 short |
| PASS | Tied matches have equal totals | 21 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 1297 targets checked, 0 differ; 47 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 39, tie 21, tie (D/L) 4, winner 1436, winner (D/L) 69, winner (Lost fewer wickets) 1 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| WARN | No unrecognised JSON keys (kept verbatim if found) | 1 unknown paths; data versions: 1.3.0 1570 |

<details><summary>schema_drift: examples</summary>

```json
[
 {
  "path": "identity.unregistered_fielder.",
  "occurrences": 81
 }
]
```
</details>

## Super Smash (men) (supersmash)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 270, archive 270, README 270, database 270 (in newest source) / 270 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 270 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 61502 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 0 long overs, 0 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 116 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 125 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 125 chases checked, 0 short |
| PASS | Tied matches have equal totals | 3 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 239 targets checked, 0 differ; 5 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | no result 13, tie 3, winner 241, winner (D/L) 13 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| WARN | No missing seasons between the first and last | missing seasons: 2014/15, 2015/16, 2016/17 |
| WARN | Seasons with far fewer matches than the competition's largest season | 2012/13: 1, 2013/14: 3 |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 270 |

<details><summary>season_gaps: examples</summary>

```json
[
 "2014/15",
 "2015/16",
 "2016/17"
]
```
</details>

<details><summary>thin_seasons: examples</summary>

```json
[
 {
  "season_label": "2012/13",
  "season_year": 2013,
  "matches": 1
 },
 {
  "season_label": "2013/14",
  "season_year": 2014,
  "matches": 3
 }
]
```
</details>

## Nepal Premier League (npl)

| Result | Check | Detail |
|---|---|---|
| PASS | Match counts agree (catalogue, archive, README, database) | catalogue 76, archive 76, README 76, database 76 (in newest source) / 76 (total) |
| PASS | Every match is male, club, 5/6-ball overs | 0 non-conforming matches |
| PASS | Match types | T20 76 |
| PASS | runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty | 0 deliveries fail out of 17553 |
| PASS | Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted) | 0 long overs, 0 explained by miscounted_overs, 0 unexplained |
| PASS | Overs per innings ≤ scheduled overs | 0 innings exceed the scheduled overs |
| PASS | Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded | 0 innings exceed the limit |
| PASS | Innings with no deliveries (not forfeited) | 0 |
| PASS | Win by runs = first-innings total − second-innings total | 35 matches checked, 0 differ |
| PASS | Win by wickets = 10 − wickets lost by the chasing side | 40 matches checked, 0 differ |
| PASS | Winning chase reaches the target | 40 chases checked, 0 short |
| PASS | Tied matches have equal totals | 1 ties checked, 0 differ |
| PASS | Full-length chase target = first-innings total + 1 (no D/L) | 75 targets checked, 0 differ; 1 reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches) |
| PASS | Outcome mix | tie 1, winner 75 |
| PASS | Every delivery references known players | 0 orphan deliveries |
| PASS | Every squad player has a Cricsheet registry id present in the people register | 0 players outside the register |
| PASS | Matches without any innings (abandoned before a ball) | 0 |
| PASS | No missing seasons between the first and last | continuous |
| PASS | Seasons with far fewer matches than the competition's largest season | none |
| PASS | No unrecognised JSON keys (kept verbatim if found) | 0 unknown paths; data versions: 1.3.0 76 |

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

Match-level differences: **861**.

| Match | Field | global.db | sqlite.db | Cricsheet revision now | Revision of the file the warehouse used |
|---|---|---|---|---:|---:|
| 335982 | venue | M Chinnaswamy Stadium, Bengaluru | M Chinnaswamy Stadium | 3 | 2 |
| 335983 | venue | Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh | Punjab Cricket Association Stadium, Mohali | 3 | 2 |
| 335984 | venue | Feroz Shah Kotla, Delhi | Feroz Shah Kotla | 4 | 3 |
| 335985 | venue | Wankhede Stadium, Mumbai | Wankhede Stadium | 3 | 2 |
| 335986 | venue | Eden Gardens, Kolkata | Eden Gardens | 3 | 2 |
| 335987 | venue | Sawai Mansingh Stadium, Jaipur | Sawai Mansingh Stadium | 3 | 2 |
| 335989 | venue | MA Chidambaram Stadium | MA Chidambaram Stadium, Chepauk | 3 | 2 |
| 335991 | venue | Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh | Punjab Cricket Association Stadium, Mohali | 3 | 2 |
| 335992 | venue | M Chinnaswamy Stadium, Bengaluru | M Chinnaswamy Stadium | 3 | 2 |
| 335993 | venue | MA Chidambaram Stadium | MA Chidambaram Stadium, Chepauk | 3 | 2 |
| 335994 | venue | Dr DY Patil Sports Academy, Navi Mumbai | Dr DY Patil Sports Academy | 3 | 2 |
| 335995 | venue | Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh | Punjab Cricket Association Stadium, Mohali | 3 | 2 |
| 335996 | venue | M Chinnaswamy Stadium, Bengaluru | M Chinnaswamy Stadium | 3 | 2 |
| 335997 | venue | Eden Gardens, Kolkata | Eden Gardens | 3 | 2 |
| 335998 | venue | Feroz Shah Kotla, Delhi | Feroz Shah Kotla | 4 | 3 |
| 336000 | venue | Sawai Mansingh Stadium, Jaipur | Sawai Mansingh Stadium | 3 | 2 |
| 336001 | venue | MA Chidambaram Stadium | MA Chidambaram Stadium, Chepauk | 3 | 2 |
| 336003 | venue | Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh | Punjab Cricket Association Stadium, Mohali | 4 | 3 |
| 336004 | venue | Dr DY Patil Sports Academy, Navi Mumbai | Dr DY Patil Sports Academy | 3 | 2 |
| 336005 | venue | Sawai Mansingh Stadium, Jaipur | Sawai Mansingh Stadium | 4 | 3 |
| 336006 | venue | M Chinnaswamy Stadium, Bengaluru | M Chinnaswamy Stadium | 3 | 2 |
| 336007 | venue | MA Chidambaram Stadium | MA Chidambaram Stadium, Chepauk | 3 | 2 |
| 336008 | venue | Dr DY Patil Sports Academy, Navi Mumbai | Dr DY Patil Sports Academy | 3 | 2 |
| 336009 | venue | Feroz Shah Kotla, Delhi | Feroz Shah Kotla | 3 | 2 |
| 336010 | venue | Eden Gardens, Kolkata | Eden Gardens | 3 | 2 |
| 336011 | venue | Sawai Mansingh Stadium, Jaipur | Sawai Mansingh Stadium | 4 | 3 |
| 336012 | venue | M Chinnaswamy Stadium, Bengaluru | M Chinnaswamy Stadium | 3 | 2 |
| 336013 | venue | MA Chidambaram Stadium | MA Chidambaram Stadium, Chepauk | 3 | 2 |
| 336015 | venue | Sawai Mansingh Stadium, Jaipur | Sawai Mansingh Stadium | 4 | 3 |
| 336016 | venue | Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh | Punjab Cricket Association Stadium, Mohali | 3 | 2 |
| 336017 | venue | Eden Gardens, Kolkata | Eden Gardens | 3 | 2 |
| 336018 | venue | Wankhede Stadium, Mumbai | Wankhede Stadium | 3 | 2 |
| 336019 | venue | Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh | Punjab Cricket Association Stadium, Mohali | 4 | 3 |
| 336020 | venue | Feroz Shah Kotla, Delhi | Feroz Shah Kotla | 3 | 2 |
| 336021 | venue | Wankhede Stadium, Mumbai | Wankhede Stadium | 3 | 2 |
| 336022 | venue | Feroz Shah Kotla, Delhi | Feroz Shah Kotla | 4 | 3 |
| 336023 | venue | Sawai Mansingh Stadium, Jaipur | Sawai Mansingh Stadium | 3 | 2 |
| 336025 | venue | Eden Gardens, Kolkata | Eden Gardens | 3 | 2 |
| 336026 | venue | M Chinnaswamy Stadium, Bengaluru | M Chinnaswamy Stadium | 3 | 2 |
| 336027 | venue | Eden Gardens, Kolkata | Eden Gardens | 3 | 2 |
| 336028 | venue | Wankhede Stadium, Mumbai | Wankhede Stadium | 3 | 2 |
| 336029 | venue | MA Chidambaram Stadium | MA Chidambaram Stadium, Chepauk | 3 | 2 |
| 336031 | venue | Punjab Cricket Association IS Bindra Stadium, Mohali, Chandigarh | Punjab Cricket Association Stadium, Mohali | 3 | 2 |
| 336032 | venue | Feroz Shah Kotla, Delhi | Feroz Shah Kotla | 3 | 2 |
| 336033 | venue | MA Chidambaram Stadium | MA Chidambaram Stadium, Chepauk | 3 | 2 |
| 336034 | venue | M Chinnaswamy Stadium, Bengaluru | M Chinnaswamy Stadium | 3 | 2 |
| 336035 | venue | Eden Gardens, Kolkata | Eden Gardens | 3 | 2 |
| 336036 | venue | Sawai Mansingh Stadium, Jaipur | Sawai Mansingh Stadium | 4 | 3 |
| 336038 | venue | Wankhede Stadium, Mumbai | Wankhede Stadium | 3 | 2 |
| 336039 | venue | Wankhede Stadium, Mumbai | Wankhede Stadium | 3 | 2 |
| 336040 | venue | Dr DY Patil Sports Academy, Navi Mumbai | Dr DY Patil Sports Academy | 4 | 3 |
| 392181 | venue | Newlands, Cape Town | Newlands | 3 | 2 |
| 392182 | venue | Newlands, Cape Town | Newlands | 4 | 3 |
| 392183 | venue | Newlands, Cape Town | Newlands | 4 | 3 |
| 392184 | venue | Newlands, Cape Town | Newlands | 3 | 2 |
| 392185 | venue | St George's Park, Port Elizabeth | St George's Park | 3 | 2 |
| 392186 | venue | Kingsmead, Durban | Kingsmead | 3 | 2 |
| 392188 | venue | Newlands, Cape Town | Newlands | 3 | 2 |
| 392189 | venue | Kingsmead, Durban | Kingsmead | 3 | 2 |
| 392190 | winner |  | Rajasthan Royals | 4 | 3 |
| … | 801 more in the JSON report | | | | |

Player-season comparison (runs, balls faced, dismissals, legal balls, runs conceded, bowler wickets; super overs excluded): 3338 player-seasons, **28 differing values**.

| Player | Season | Field | global.db | sqlite.db |
|---|---|---|---:|---:|
| Mustafizur Rahman (0a8fce53) | 2024 | conceded | 318 | 317 |
| Sikandar Raza (26d041c4) | 2023 | conceded | 119 | 118 |
| TU Deshpande (46a9bea1) | 2023 | conceded | 564 | 563 |
| Yudhvir Singh (4885bbe6) | 2025 | conceded | 131 | 130 |
| OC McCoy (529eb9e0) | 2022 | conceded | 237 | 236 |
| JC Archer (5574750c) | 2019 | conceded | 291 | 290 |
| JC Archer (5574750c) | 2020/21 | conceded | 365 | 364 |
| JC Archer (5574750c) | 2025 | conceded | 431 | 430 |
| CV Varun (5b7ab5a9) | 2022 | conceded | 332 | 331 |
| CV Varun (5b7ab5a9) | 2024 | conceded | 402 | 401 |
| Yash Dayal (7210d461) | 2024 | conceded | 459 | 458 |
| KM Asif (798cc28e) | 2023 | conceded | 138 | 137 |
| VG Arora (7c3b3b78) | 2024 | conceded | 276 | 275 |
| AJ Tye (7c7d63a2) | 2020/21 | conceded | 50 | 49 |
| Umran Malik (81c08fa3) | 2022 | conceded | 444 | 443 |
| M Jansen (81c36ee9) | 2023 | conceded | 267 | 266 |
| M Jansen (81c36ee9) | 2025 | conceded | 434 | 433 |
| M Prasidh Krishna (85e0cf10) | 2020/21 | conceded | 164 | 163 |
| Mohammed Shami (8cf9814c) | 2023 | conceded | 522 | 521 |
| SL Malinga (a12e1d51) | 2014 | conceded | 253 | 251 |
| LB Williams (a1d95bd8) | 2024 | conceded | 72 | 71 |
| Naveen-ul-Haq (c0c411cb) | 2023 | conceded | 219 | 218 |
| UT Yadav (cc1e8c68) | 2020/21 | conceded | 83 | 82 |
| M Siddharth (cf0ccafa) | 2024 | conceded | 71 | 70 |
| AS Rajpoot (db31895a) | 2020/21 | conceded | 199 | 198 |
| K Rabada (e62dd25d) | 2020/21 | conceded | 548 | 547 |
| K Rabada (e62dd25d) | 2023 | conceded | 232 | 231 |
| HV Patel (f986ca1a) | 2023 | conceded | 454 | 453 |

- Runs, balls faced, dismissals, legal balls and bowler wickets agree exactly for every player-season.
- 861 name differences are spelling/renaming of teams or venues between the warehouse build and the current archive, not different results.

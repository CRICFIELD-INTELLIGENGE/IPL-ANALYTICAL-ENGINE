# Who Delivers Under Pressure? — Methodology Report

**SupeRR Selector Season 2 · Round 1** · CricField Pressure Reliability engine · model `cf-pressure.e01281a332` · generated 2026-11-15

## Summary

We score every delivery from 2022 onward in the IPL and in men's T20Is between ICC Full Members. Each ball is compared with what normally
happens in that exact match state. Pressure is defined once per delivery, so the batter and the bowler on the same ball always
share the same pressure label. A player's score is their contextual value per 100 pressure balls, adjusted for sample size with
empirical Bayes. A short hot streak cannot top the table.

**Top 10 batters:** 1. SA Yadav · 2. RR Hendricks · 3. R Shepherd · 4. P Nissanka · 5. Tilak Varma · 6. R Powell · 7. TH David · 8. PD Salt · 9. KD Karthik · 10. MD Shanaka

**Top 10 bowlers:** 1. JJ Bumrah · 2. SP Narine · 3. MJ Santner · 4. Kuldeep Yadav · 5. JA Duffy · 6. M Pathirana · 7. NT Ellis · 8. JC Archer · 9. Mohammad Nawaz · 10. L Ngidi

## 1. Data

| Source | Matches in model | Coverage |
|---|---|---|
| Indian Premier League (`ipl`) | 1243 | 2008-04-18 to 2026-05-31 |
| Syed Mushtaq Ali Trophy (`smat`) | 695 | 2016-01-02 to 2024-12-15 |
| Big Bash League (`bbl`) | 662 | 2011-12-16 to 2026-01-25 |
| SA20 (`sa20`) | 130 | 2023-01-10 to 2026-01-25 |
| Caribbean Premier League (`cpl`) | 445 | 2013-07-30 to 2026-09-20 |
| International League T20 (`ilt20`) | 134 | 2023-01-13 to 2026-01-04 |
| Men's T20 Internationals (`t20i`) | 3638 | 2005-02-17 to 2026-11-01 |

* Ball-by-ball data come from Cricsheet (ODC-BY 1.0), loaded into CricField's warehouse by the repository's pipeline.
  Every delivery passes the check *runs.total = batter + extras*, and *extras = wides + no-balls + byes + leg-byes + penalty*,
  with 0 failures across all competitions.
* **Rankings use** the IPL (2022 onward) plus men's T20Is (2022 onward) where both sides are ICC Full Members:
  815 matches.
  The other leagues and associate-nation T20Is are used only to fit the general models (expected outcomes, win probability).
* **Afghanistan:** Cricsheet withholds every Afghanistan match, so Afghan players are measured on their IPL record only.
* Super overs are excluded. Rain-revised targets come from the official revised target. Reduced first innings, whose length is
  not recorded, are excluded from the first-innings models.

## 2. Defining pressure (the same for bat and ball)

We compared four families of definitions and chose using evidence, not appeal. Each candidate is applied to the same deliveries
(IPL + Full-Member T20Is, 2022 onward) and scored on two tests:

1. **Is player value under it repeatable?** We report K, the number of pressure balls a player needs before half their score is
   their own signal rather than noise. K is estimated from match-to-match variation, and smaller is better. We also report the
   split-half correlation between odd-numbered and even-numbered matches.
2. **Is "better than usual under pressure" repeatable?** This is the split-half correlation of each player's pressure uplift
   (pressure value minus their own ordinary value).

| Definition | Share of balls | Batting K | Bowling K | Batting uplift r | Bowling uplift r |
|---|---|---|---|---|---|
| A. Rules: death overs, or chase needing ≥9 an over, or collapse (≥3 down for ≤35) | 45% | 424 | 1122 | 0.170 | -0.075 |
| C. Rules, but only while the match is live (batting side's win probability 2–98%) | 38% | 621 | 1016 | 0.147 | -0.038 |
| B. Leverage, top 40% of balls (same share as the rules) | 35% | 803 | 3214 | 0.016 | -0.082 |
| Leverage, top 30% of balls | 25% | 622 | 5471 | -0.119 | -0.288 |
| Leverage, top 10% of balls | 9% | 7203482 | 12319 | 0.080 | 0.050 |
| Difficulty: batting side's win probability 5–35% (behind but alive) | 24% | 5575 | 486 | 0.007 | 0.133 |

**Selected: A (rules).** A ball is a pressure ball when any of the following holds, judged before the ball is bowled:

* it is in the **death overs** (16–20); or
* it is in a **chase needing 9 or more an over**; or
* the batting side is in a **collapse**: 3 or more wickets down for 35 or fewer runs.

Against leverage at the same share of balls, rule A needs fewer balls to separate players. Batting K is 424
against 803, and bowling K is 1122 against 3214.
Because one definition must serve both roles, we chose the one with the lowest *combined* K (batting + bowling).
Some alternatives do better for one role alone, as the table shows, but each is much worse for the other.

Leverage was built and validated, but it is *not* used to define pressure. Leverage is the expected change in win probability from
the next ball, using calibrated logistic win-probability models. On matches from 2023 on, which the
models never saw, the Brier score was 0.1133 for chases (against 0.25 for always guessing
the base rate) and 0.2042 for first innings (against 0.2495).

Leverage concentrates on powerplay balls, because early wickets move the projected result. That is true, but in this data it makes
a weaker definition for comparing players (higher K in both roles). Uplift repeatability is low under every definition
(see the table), which is why uplift is reported but not used to rank (Section 4).

**Threshold sensitivity.** We moved each threshold on its own and re-ranked. Top-10 overlap with the selected thresholds:

| Change | Batters kept (of 10) | Bowlers kept (of 10) |
|---|---|---|
| death from over 15 | 8 | 8 |
| death from over 17 | 9 | 8 |
| required rate ≥ 8 | 9 | 8 |
| required rate ≥ 10 | 8 | 8 |
| collapse ≤30 | 10 | 9 |
| collapse ≤40 | 9 | 9 |

## 3. Measuring performance: one value scale for both roles

Each delivery gets a value measured from the player's own side, in runs:

* **Expected outcome.** We use the average for the same innings, over and wickets-down state (0–6+), pooled across all
  1,589,302 deliveries and scaled to the scoring rate of that competition-season. The peer
  baseline never uses the evaluated player's identity.
* **Wicket cost.** A wicket costs the runs it removes from the rest of the innings: the fall in expected remaining runs, read from a
  table by overs left and wickets down that is estimated from completed first innings and forced to be monotone.
* **Batter value** = (runs off the bat − expected) − wicket cost × (dismissed − expected chance of dismissal).
* **Bowler value** = (expected conceded − conceded) + wicket cost × (bowler's wicket − expected chance).
  Runs conceded include wides and no-balls. Byes and leg-byes are not charged. Run-outs are not credited to the bowler.
* **Opposition adjustment.** We subtract the strength of each opposition team-year, estimated by alternating empirical-Bayes
  passes. The spread is ±10.01 per 100 balls between bowling attacks and
  ±14.4 between batting line-ups.

The unit is **runs above expectation per 100 balls**, with the wicket cost included. Positive is good for the player's team in both roles.
Raw diagnostics are reported alongside (strike rate, average, economy, balls per wicket, dot %), split into pressure and usual balls.

## 4. Fair comparisons: reliability and sample size

* **Score = empirical-Bayes estimate of pressure value.** score = μ + B/(B+K)·(raw − μ), where B is the number of pressure balls.
  K is estimated from the data: K = s²/τ², where s² is the within-player match-to-match noise and τ² is the true spread between
  players. Noise is measured between matches, not between balls, so 30 balls from one innings count as one match, not 30 balls.
* This cohort gives K = **424 balls (batting)** and **1122 balls (bowling)**.
  The true spread is about ±14.83 and ±8.84
  runs per 100 pressure balls.
* The 90% range is the posterior interval. **P(top 10)** is the share of 20,000 simulated rankings, drawn from every eligible
  player's posterior, in which the player makes the top 10.
* **Eligibility:** at least 250 pressure balls (faced or bowled) and at least 20 different matches with pressure balls.
  99 batters and 103 bowlers qualify.
* **Usual performance and uplift.** The usual level is the same value measure on non-pressure balls, shrunk the same way.
  Uplift = pressure score − usual level.

**How absolute performance and "relative to usual" enter the ranking.** Players are ranked on absolute pressure value. Uplift is
reported for every player but not used in the score. The reason is in Section 2: uplift barely repeats between odd and even matches
(r ≈ 0 to 0.12). Ranking on it would mostly reward luck. A player who is excellent all the time stays excellent under pressure,
which is what a selector needs. We also built a *forecast* estimator that anchors each player to their usual level. It shows usual
form predicts pressure form with a slope of 0.986 (batting) and
1.223 (bowling). We did not use it for the official lists, because it can rank a player
highly on calm-ball form alone.

## 5. Results

### Top 10 batters under pressure
| # | Player | Team (latest) | Pressure balls | Matches | Pressure SR | Usual SR | Pressure avg | Raw /100 | Usual /100 | **Score /100** (90% range) | Uplift | Good games | P(top 10) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | SA Yadav | Mumbai Indians | 1138 | 79 | 177.3 | 155.9 | 37.4 | +49.4 | +22.6 | **+38.9** (26.2 to 51.6) | +16.3 | 62% | 86% |
| 2 | RR Hendricks | South Africa | 427 | 22 | 167.0 | 122.1 | 44.6 | +65.6 | +7.5 | **+38.3** (21.1 to 55.5) | +30.8 | 68% | 77% |
| 3 | R Shepherd | West Indies | 586 | 62 | 162.1 | 119.3 | 30.6 | +48.2 | +12.2 | **+32.5** (16.7 to 48.3) | +20.3 | 61% | 58% |
| 4 | P Nissanka | Sri Lanka | 494 | 30 | 160.3 | 122.6 | 37.7 | +47.8 | +9.4 | **+30.7** (14.2 to 47.3) | +21.3 | 63% | 51% |
| 5 | Tilak Varma | India | 1188 | 89 | 168.0 | 127.5 | 40.7 | +34.5 | +16.1 | **+28.3** (15.8 to 40.8) | +12.2 | 57% | 37% |
| 6 | R Powell | West Indies | 983 | 89 | 162.9 | 123.3 | 25.4 | +35.8 | +12.2 | **+28.3** (14.9 to 41.7) | +16.0 | 60% | 38% |
| 7 | TH David | Australia | 788 | 80 | 190.7 | 149.1 | 32.7 | +37.3 | +20.8 | **+28.0** (13.6 to 42.4) | +7.2 | 51% | 39% |
| 8 | PD Salt | England | 462 | 32 | 177.5 | 164.9 | 35.7 | +42.4 | +18.6 | **+27.3** (10.4 to 44.2) | +8.7 | 56% | 36% |
| 9 | KD Karthik | Royal Challengers Bengaluru | 534 | 57 | 183.9 | 77.0 | 29.8 | +39.0 | +6.6 | **+26.5** (10.3 to 42.8) | +19.9 | 53% | 33% |
| 10 | MD Shanaka | Sri Lanka | 645 | 53 | 154.7 | 115.3 | 25.6 | +34.5 | +10.7 | **+25.1** (9.7 to 40.5) | +14.4 | 49% | 27% |

Next five: 11. GD Phillips (+24.9, P(top 10) 27%); 12. Shashank Singh (+24.6, P(top 10) 27%); 13. AD Russell (+23.3, P(top 10) 23%); 14. MS Chapman (+22.8, P(top 10) 22%); 15. SS Iyer (+22.6, P(top 10) 18%).

### Top 10 bowlers under pressure
| # | Player | Team (latest) | Pressure balls | Matches | Pressure econ | Usual econ | Balls/wkt | Dot % | Raw /100 | Usual /100 | **Score /100** (90% range) | Uplift | Good games | P(top 10) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | JJ Bumrah | India | 1108 | 81 | 7.25 | 6.72 | 15.8 | 41.7 | +37.5 | +10.1 | **+17.1** (6.8 to 27.4) | +7.1 | 67% | 91% |
| 2 | SP Narine | Kolkata Knight Riders | 610 | 46 | 6.67 | 6.93 | 17.4 | 38.7 | +31.4 | +3.9 | **+9.2** (-2.5 to 20.9) | +5.3 | 74% | 51% |
| 3 | MJ Santner | New Zealand | 834 | 58 | 7.45 | 7.53 | 14.6 | 38.4 | +23.3 | +0.5 | **+8.3** (-2.8 to 19.3) | +7.8 | 62% | 45% |
| 4 | Kuldeep Yadav | India | 820 | 65 | 7.76 | 8.01 | 14.1 | 35.0 | +23.3 | +4.6 | **+8.2** (-2.9 to 19.2) | +3.6 | 63% | 45% |
| 5 | JA Duffy | New Zealand | 540 | 39 | 8.96 | 8.79 | 12.6 | 43.3 | +24.5 | +0.3 | **+6.0** (-6.0 to 17.9) | +5.6 | 51% | 34% |
| 6 | M Pathirana | Kolkata Knight Riders | 713 | 49 | 9.16 | 7.74 | 12.3 | 36.3 | +18.9 | +1.1 | **+5.5** (-5.8 to 16.9) | +4.5 | 63% | 32% |
| 7 | NT Ellis | Australia | 628 | 44 | 8.29 | 7.93 | 13.4 | 38.2 | +18.1 | +2.1 | **+4.6** (-7.0 to 16.3) | +2.5 | 59% | 26% |
| 8 | JC Archer | England | 650 | 57 | 9.51 | 8.74 | 12.7 | 39.2 | +17.1 | -3.4 | **+4.4** (-7.1 to 16.0) | +7.8 | 54% | 26% |
| 9 | Mohammad Nawaz | Pakistan | 285 | 24 | 6.78 | 7.67 | 11.4 | 40.0 | +31.0 | +0.9 | **+4.0** (-9.0 to 16.9) | +3.0 | 54% | 26% |
| 10 | L Ngidi | Delhi Capitals | 464 | 39 | 8.51 | 8.42 | 15.0 | 39.7 | +18.2 | +4.5 | **+3.3** (-9.0 to 15.5) | -1.3 | 56% | 22% |

Next five: 11. YS Chahal (+3.1, P(top 10) 17%); 12. Mustafizur Rahman (+3.1, P(top 10) 19%); 13. G Motie (+3.1, P(top 10) 22%); 14. C Bosch (+3.0, P(top 10) 22%); 15. A Zampa (+2.7, P(top 10) 18%).

Batting columns: pressure SR and average from pressure balls only. Bowling columns: economy, balls per wicket and dot % from pressure
balls only. Raw /100 is the unadjusted value. Usual /100 is non-pressure value, shrunk. Good games is the share of matches with
positive pressure value.

**Where raw statistics and the model disagree.** Players in the raw top 10 who drop out after the sample-size adjustment:
batting: Shashank Singh (raw +38.8 from 409 balls → score +24.6); Ashutosh Sharma (raw +35.7 from 305 balls → score +21.2). Bowling: C Bosch (raw +25.7 from 289 balls → score +3.0); G Motie (raw +23.6 from 327 balls → score +3.1); Mohsin Khan (raw +20.8 from 346 balls → score +2.7); MG Bracewell (raw +19.1 from 288 balls → score +1.6).

### Robustness: top-10 overlap under alternative choices

| Alternative | Batters kept (of 10) | Bowlers kept (of 10) |
|---|---|---|
| Eligibility ≥120 balls, ≥10 matches | 8 | 9 |
| Eligibility ≥400 balls, ≥30 matches | 9 | 9 |
| Pressure = leverage top 30% | 3 | 3 |
| T20I: all nations (associates included) | 4 | 1 |
| IPL only | 3 | 3 |
| Seasons 2024–2026 only | 5 | 8 |
| Forecast estimator (anchored to usual level) | 7 | 5 |
| Rank by lower 90% bound | 10 | 8 |

## 6. Reliability and limitations

* **Pressure skill is real but small.** The between-player spread is about ±14.83 (batting)
  and ±8.84 (bowling) runs per 100 pressure balls. Several 90% ranges overlap, so
  neighbouring ranks are close calls. P(top 10) shows which places are secure.
* **Bowling is harder to separate than batting** (K 1122 against 424).
  Only the leaders' ranges sit clearly above average.
* **Not modelled:** ball tracking, field placements, pitch and weather. These are not in the data and were not invented. Bowling
  style is not used.
* **Team strength** is adjusted per team-year. Associate-nation T20Is are excluded from the rankings, because their strength cannot
  be estimated reliably against Full Members from the few cross-tier matches.
* **The P(top 10) simulation** treats players as independent draws from their posteriors.

## 7. Reproducing this

```
pnpm --filter @workspace/scripts run global:sync -- --only t20i          # load Cricsheet men's T20Is into global.db
cd artifacts/api-server
node --import tsx scripts/pressure/build-pressure-reliability.ts        # fit models, publish snapshot
node --import tsx scripts/pressure/rankings-report.ts                   # this report + rankings.json
```

Code: `artifacts/api-server/src/services/pressure/` (model, serving), `scripts/pressure/` (build, report),
`test/pressure-reliability.test.ts`. The same numbers are served at `/api/stats/pressure-reliability` and shown in CricField
→ Stats → Scenario Intelligence → Pressure Reliability. Snapshot version `cf-pressure.e01281a332` is a hash of its contents.

# Who Delivers Under Pressure? — Methodology Report (official data pack)

**SupeRR Selector Season 2 · Round 1** · CricField Pressure Reliability engine · model `cf-pressure.1593daffa4` · generated 2026-11-15

## Summary

We score every delivery from 2022 onward in the IPL and in men's T20Is between ICC Full Members. Each ball is compared with what normally
happens in that exact match state. Pressure is defined once per delivery, so the batter and the bowler on the same ball always
share the same pressure label. A player's score is their contextual value per 100 pressure balls, adjusted for sample size with
empirical Bayes. A short hot streak cannot top the table.

**Top 10 batters:** 1. Suryakumar Yadav · 2. Pathum Nissanka · 3. Tim David · 4. Romario Shepherd · 5. Dinesh Karthik · 6. Shashank Singh · 7. Ashutosh Sharma · 8. Rovman Powell · 9. Phil Salt · 10. Andre Russell

**Top 10 bowlers:** 1. Jasprit Bumrah · 2. Mitchell Santner · 3. Sunil Narine · 4. Matheesha Pathirana · 5. Rashid Khan · 6. Mohammad Nawaz · 7. Jacob Duffy · 8. Kuldeep Yadav · 9. Bhuvneshwar Kumar · 10. Jofra Archer

## 1. Data

| Source | Matches in model | Coverage |
|---|---|---|
| Indian Premier League (`ipl`) | 371 | 2022-03-26 to 2026-05-31 |
| Men's T20 Internationals (`t20i`) | 482 | 2022-01-22 to 2026-11-01 |
| Emerging / Rising Stars T20 (`emerging`) | 30 | 2024-10-18 to 2025-11-23 |

* **Source: the supplied SupeRR Selector S2 data pack** (200,999 deliveries, 883 matches).
  All modelling (expected outcomes, wicket cost, win probability, pressure, rankings) uses only this data.
* **How the pack was read.** `runs` is the batter's runs; `extras1_runs` is an extras-type code, not a run count. `Overstep`
  and `other` are no-balls, and `extras_2_runs` holds byes or leg-byes off a no-ball. We confirmed these readings by
  aligning 1,479 innings ball for ball with an independent public source (Cricsheet).
* **Imputed extras.** The pack does not record how many runs a wide, bye or leg-bye produced, so each counts as 1 (a penalty as 5).
  This only affects team totals and the chase target; batter runs, wickets and runs charged to bowlers are exact, apart from
  wide boundaries. Checked against the pack's own results:
  wicket margins match exactly in 406 of 407 matches (the single exception is a margin inconsistent with the pack's own ball data); run margins are within 3 runs in 301 of 402 matches (mean absolute difference 2.47 runs).
* **Rankings use** IPL 2022–2026 plus T20Is between ICC Full Members (Afghanistan included): 773 matches.
  T20Is involving associate nations and the Emerging / Rising Stars tournaments (A-teams) feed only the general models.
  A robustness row below adds associate T20Is back.
* Super overs are excluded. Rain-affected chases use the pack's revised target and overs. Reduced first innings are left out of the
  first-innings models.

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
| A. Rules: death overs, or chase needing ≥9 an over, or collapse (≥3 down for ≤35) | 45% | 356 | 1162 | 0.143 | -0.037 |
| C. Rules, but only while the match is live (batting side's win probability 2–98%) | 39% | 534 | 886 | 0.068 | 0.099 |
| B. Leverage, top 40% of balls (same share as the rules) | 39% | 1093 | 2028 | 0.060 | 0.006 |
| Leverage, top 30% of balls | 29% | 516 | 1915 | 0.183 | -0.072 |
| Leverage, top 10% of balls | 10% | 1039 | 1209 | -0.273 | -0.176 |
| Difficulty: batting side's win probability 5–35% (behind but alive) | 23% | 13723 | 430 | 0.173 | 0.111 |

**Selected: A (rules).** A ball is a pressure ball when any of the following holds, judged before the ball is bowled:

* it is in the **death overs** (16–20); or
* it is in a **chase needing 9 or more an over**; or
* the batting side is in a **collapse**: 3 or more wickets down for 35 or fewer runs.

Against leverage at the same share of balls, rule A needs fewer balls to separate players. Batting K is 356
against 1093, and bowling K is 1162 against 2028.
Because one definition must serve both roles, we chose the one with the lowest *combined* K (batting + bowling).
Some alternatives do better for one role alone, as the table shows, but each is much worse for the other.

Leverage was built and validated, but it is *not* used to define pressure. Leverage is the expected change in win probability from
the next ball, using calibrated logistic win-probability models. On matches from 2023 on, which the
models never saw, the Brier score was 0.1322 for chases (against 0.2501 for always guessing
the base rate) and 0.2269 for first innings (against 0.2506).

Leverage concentrates on powerplay balls, because early wickets move the projected result. That is true, but in this data it makes
a weaker definition for comparing players (higher K in both roles). Uplift repeatability is low under every definition
(see the table), which is why uplift is reported but not used to rank (Section 4).

**Threshold sensitivity.** We moved each threshold on its own and re-ranked. Top-10 overlap with the selected thresholds:

| Change | Batters kept (of 10) | Bowlers kept (of 10) |
|---|---|---|
| death from over 15 | 10 | 9 |
| death from over 17 | 9 | 10 |
| required rate ≥ 8 | 9 | 9 |
| required rate ≥ 10 | 8 | 7 |
| collapse ≤30 | 10 | 10 |
| collapse ≤40 | 9 | 10 |

## 3. Measuring performance: one value scale for both roles

Each delivery gets a value measured from the player's own side, in runs:

* **Expected outcome.** We use the average for the same innings, over and wickets-down state (0–6+), pooled across all
  200,961 deliveries and scaled to the scoring rate of that competition-season. The peer
  baseline never uses the evaluated player's identity.
* **Wicket cost.** A wicket costs the runs it removes from the rest of the innings: the fall in expected remaining runs, read from a
  table by overs left and wickets down that is estimated from completed first innings and forced to be monotone.
* **Batter value** = (runs off the bat − expected) − wicket cost × (dismissed − expected chance of dismissal).
* **Bowler value** = (expected conceded − conceded) + wicket cost × (bowler's wicket − expected chance).
  Runs conceded include wides and no-balls. Byes and leg-byes are not charged. Run-outs are not credited to the bowler.
* **Opposition adjustment.** We subtract the strength of each opposition team-year, estimated by alternating empirical-Bayes
  passes. The spread is ±5.6 per 100 balls between bowling attacks and
  ±9.33 between batting line-ups.

The unit is **runs above expectation per 100 balls**, with the wicket cost included. Positive is good for the player's team in both roles.
Raw diagnostics are reported alongside (strike rate, average, economy, balls per wicket, dot %), split into pressure and usual balls.

## 4. Fair comparisons: reliability and sample size

* **Score = empirical-Bayes estimate of pressure value.** score = μ + B/(B+K)·(raw − μ), where B is the number of pressure balls.
  K is estimated from the data: K = s²/τ², where s² is the within-player match-to-match noise and τ² is the true spread between
  players. Noise is measured between matches, not between balls, so 30 balls from one innings count as one match, not 30 balls.
* This cohort gives K = **356 balls (batting)** and **1163 balls (bowling)**.
  The true spread is about ±15.64 and ±8.52
  runs per 100 pressure balls.
* The 90% range is the posterior interval. **P(top 10)** is the share of 20,000 simulated rankings, drawn from every eligible
  player's posterior, in which the player makes the top 10.
* **Eligibility:** at least 250 pressure balls (faced or bowled) and at least 20 different matches with pressure balls.
  91 batters and 98 bowlers qualify.
* **Usual performance and uplift.** The usual level is the same value measure on non-pressure balls, shrunk the same way.
  Uplift = pressure score − usual level.

**How absolute performance and "relative to usual" enter the ranking.** Players are ranked on absolute pressure value. Uplift is
reported for every player but not used in the score. The reason is in Section 2: uplift barely repeats between odd and even matches
(r ≈ 0 to 0.12). Ranking on it would mostly reward luck. A player who is excellent all the time stays excellent under pressure,
which is what a selector needs. We also built a *forecast* estimator that anchors each player to their usual level. It shows usual
form predicts pressure form with a slope of 0.458 (batting) and
1.301 (bowling). We did not use it for the official lists, because it can rank a player
highly on calm-ball form alone.

## 5. Results

### Top 10 batters under pressure
| # | Player | Team (latest) | Pressure balls | Matches | Pressure SR | Usual SR | Pressure avg | Raw /100 | Usual /100 | **Score /100** (90% range) | Uplift | Good games | P(top 10) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Suryakumar Yadav | Mumbai Indians | 1075 | 69 | 179.6 | 156.0 | 42.0 | +47.0 | +15.6 | **+36.7** (23.8 to 49.5) | +21.0 | 68% | 91% |
| 2 | Pathum Nissanka | Sri Lanka | 457 | 26 | 159.3 | 124.4 | 42.8 | +44.8 | -2.5 | **+27.6** (10.5 to 44.6) | +30.1 | 65% | 56% |
| 3 | Tim David | Australia | 745 | 74 | 194.1 | 147.6 | 34.4 | +36.6 | +15.5 | **+26.5** (11.8 to 41.1) | +11.0 | 55% | 52% |
| 4 | Romario Shepherd | West Indies | 539 | 56 | 164.6 | 119.4 | 30.6 | +40.0 | +2.2 | **+26.3** (10.0 to 42.5) | +24.1 | 61% | 52% |
| 5 | Dinesh Karthik | Royal Challengers Bengaluru | 531 | 55 | 184.8 | 81.5 | 31.6 | +40.2 | -3.1 | **+26.2** (9.9 to 42.5) | +29.4 | 53% | 51% |
| 6 | Shashank Singh | Punjab Kings | 409 | 35 | 185.3 | 97.3 | 47.4 | +39.9 | -6.9 | **+23.8** (6.3 to 41.4) | +30.7 | 54% | 41% |
| 7 | Ashutosh Sharma | Delhi Capitals | 305 | 25 | 176.4 | 89.7 | 29.9 | +41.3 | +1.6 | **+21.9** (3.0 to 40.8) | +20.3 | 56% | 36% |
| 8 | Rovman Powell | West Indies | 937 | 82 | 162.2 | 119.3 | 25.8 | +28.1 | -1.3 | **+21.8** (8.3 to 35.3) | +23.2 | 51% | 30% |
| 9 | Phil Salt | England | 375 | 28 | 179.5 | 166.5 | 33.6 | +36.1 | +15.3 | **+21.2** (3.2 to 39.1) | +5.9 | 46% | 33% |
| 10 | Andre Russell | West Indies | 481 | 46 | 179.8 | 154.4 | 26.2 | +31.0 | +12.6 | **+20.1** (3.4 to 36.9) | +7.5 | 52% | 28% |

Next five: 11. Namboori Tilak Varma (+19.2, P(top 10) 19%); 12. Sikandar Raza (+19.1, P(top 10) 24%); 13. Yashasvi Jaiswal (+19.0, P(top 10) 24%); 14. Rinku Singh (+18.9, P(top 10) 21%); 15. Marcus Stoinis (+18.8, P(top 10) 22%).

### Top 10 bowlers under pressure
| # | Player | Team (latest) | Pressure balls | Matches | Pressure econ | Usual econ | Balls/wkt | Dot % | Raw /100 | Usual /100 | **Score /100** (90% range) | Uplift | Good games | P(top 10) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Jasprit Bumrah | India | 894 | 69 | 7.45 | 6.73 | 15.7 | 41.1 | +36.6 | +9.8 | **+15.3** (4.8 to 25.8) | +5.5 | 70% | 79% |
| 2 | Mitchell Santner | New Zealand | 642 | 46 | 7.36 | 7.52 | 14.3 | 37.1 | +32.4 | +4.9 | **+10.8** (-0.5 to 22.1) | +5.9 | 59% | 55% |
| 3 | Sunil Narine | Kolkata Knight Riders | 605 | 46 | 6.56 | 7.06 | 17.3 | 38.5 | +31.1 | +8.6 | **+9.9** (-1.5 to 21.2) | +1.3 | 74% | 48% |
| 4 | Matheesha Pathirana | Kolkata Knight Riders | 715 | 48 | 8.86 | 8.03 | 11.9 | 37.3 | +24.0 | +5.7 | **+8.4** (-2.6 to 19.5) | +2.7 | 67% | 41% |
| 5 | Rashid Khan | Afghanistan | 1114 | 91 | 8.05 | 7.03 | 13.0 | 36.6 | +17.9 | +10.0 | **+8.2** (-1.8 to 18.2) | -1.9 | 58% | 38% |
| 6 | Mohammad Nawaz | Pakistan | 272 | 23 | 6.55 | 7.40 | 11.3 | 42.6 | +44.5 | +3.3 | **+7.5** (-5.1 to 20.1) | +4.2 | 56% | 37% |
| 7 | Jacob Duffy | New Zealand | 468 | 34 | 9.13 | 8.29 | 13.0 | 43.6 | +27.3 | +5.6 | **+7.0** (-4.8 to 18.9) | +1.4 | 59% | 34% |
| 8 | Kuldeep Yadav | India | 727 | 61 | 8.15 | 7.99 | 14.3 | 34.0 | +19.3 | +7.7 | **+6.7** (-4.3 to 17.7) | -1.0 | 56% | 31% |
| 9 | Bhuvneshwar Kumar | India | 1268 | 85 | 8.93 | 7.34 | 17.1 | 37.3 | +12.8 | +7.5 | **+6.1** (-3.6 to 15.8) | -1.4 | 59% | 25% |
| 10 | Jofra Archer | England | 598 | 49 | 9.26 | 8.62 | 13.6 | 39.6 | +19.2 | +0.3 | **+5.8** (-5.6 to 17.2) | +5.4 | 55% | 27% |

Next five: 11. Varun Chakravarthy (+5.3, P(top 10) 22%); 12. Lungi Ngidi (+5.0, P(top 10) 25%); 13. Shaheen Afridi (+4.7, P(top 10) 23%); 14. Eshan Malinga (+4.2, P(top 10) 21%); 15. Arshdeep Singh (+3.8, P(top 10) 12%).

Batting columns: pressure SR and average from pressure balls only. Bowling columns: economy, balls per wicket and dot % from pressure
balls only. Raw /100 is the unadjusted value. Usual /100 is non-pressure value, shrunk. Good games is the share of matches with
positive pressure value.

**Where raw statistics and the model disagree.** Players in the raw top 10 who drop out after the sample-size adjustment:
batting: Glenn Maxwell (raw +29.2 from 411 balls → score +18.2). Bowling: Lungi Ngidi (raw +22.7 from 408 balls → score +5.0); Abrar Ahmed (raw +22.5 from 273 balls → score +3.3); Shaheen Afridi (raw +21.4 from 408 balls → score +4.7).

### Cross-check against an independent source

The same method, run on Cricsheet's public ball-by-ball data (which covers some different T20Is and has no Afghanistan matches),
keeps **7 of 10 batters** and
**8 of 10 bowlers**.
The leaders (Suryakumar Yadav and Jasprit Bumrah) are the same in both.

### Robustness: top-10 overlap under alternative choices

| Alternative | Batters kept (of 10) | Bowlers kept (of 10) |
|---|---|---|
| Eligibility ≥120 balls, ≥10 matches | 8 | 10 |
| Eligibility ≥400 balls, ≥30 matches | 7 | 9 |
| Pressure = leverage top 30% | 4 | 5 |
| T20I: all nations (associates included) | 10 | 9 |
| IPL only | 4 | 6 |
| Seasons 2024–2026 only | 5 | 7 |
| Forecast estimator (anchored to usual level) | 7 | 5 |
| Rank by lower 90% bound | 7 | 9 |

## 6. Reliability and limitations

* **Pressure skill is real but small.** The between-player spread is about ±15.64 (batting)
  and ±8.52 (bowling) runs per 100 pressure balls. Several 90% ranges overlap, so
  neighbouring ranks are close calls. P(top 10) shows which places are secure.
* **Bowling is harder to separate than batting** (K 1163 against 356).
  Only the leaders' ranges sit clearly above average.
* **Imputed extras** (Section 1) can move a chase target by a few runs, which shifts some balls across the required-rate-9 line. The threshold sensitivity in Section 2 covers this: moving that line by a full run an over keeps 7 to 9 of each top 10.
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
→ Stats → Scenario Intelligence → Pressure Reliability. Snapshot version `cf-pressure.1593daffa4` is a hash of its contents.

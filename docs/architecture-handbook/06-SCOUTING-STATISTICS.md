# 06 — Scouting and Statistical Engine

> **This is the chapter interviewers will probe hardest.** Every formula below was read from source *and* executed against `global.db` / `sqlite.db` (read-only) on 2026-10-12. Worked examples use real output. Where the code’s comments, the UI text, or older docs disagree with what the code does, the code wins and the disagreement is listed.

---

## 0. Map of the statistical code

| Engine | File(s) | Data | Surfaces in |
|---|---|---|---|
| **Scout ratings** (league adjustment, shrinkage, intervals, percentiles) | `artifacts/api-server/src/services/scout/scout-service.ts` (API copy) and `scripts/src/scout/service.ts` (CLI copy) | `global.db` | `/scout`, `/scout/player/:id`, `/scout/compare` |
| **Role classification** | same file `:117-191`; built into `scout_roles` by `scripts/src/scout/roles.ts` + `build.ts` | `global.db` | `/scout/roles`, profile pages |
| **Trends, similar players, strengths/weaknesses** | `scout-service.ts:503-740` | `global.db` | Scout profile |
| **Impact model** (runs above average per match) | `services/decision/impact-model.ts` | `sqlite.db` | Playing XI, War Room, Insight Feed |
| **Hidden Weakness Detector** | `services/decision/weakness-detector.ts` | `sqlite.db` | `/ai-analyst/weakness` |
| **Pressure Genome** | `services/decision/pressure-genome.ts` | `sqlite.db` | `/ai-analyst/pressure` |
| **Match engine** (outcome tables, DP win probability, Platt calibration, Monte Carlo) | `services/decision/match-model.ts` | `sqlite.db` | Strategy Sim, Alt Universe, Decision Replay, Opposition Map |
| **Player Pool similarity** | `services/decision/player-pool.ts` | `sqlite.db` | Player Pool, War Room comparables |
| **Squad DNA** | `services/decision/squad-dna.ts` | `sqlite.db` | Squad DNA, War Room “fit” |
| **War Room valuation** | `services/decision/auction-war-room.ts` | `sqlite.db` + auction files | `/ai-analyst/auction-war-room` |
| **Playing XI optimiser** | `services/decision/playing-xi.ts` (javascript-lp-solver) | `sqlite.db` | Playing XI drawer |

**None of these is machine learning in the trained-model sense** except two small fitted pieces: a 2-parameter Platt calibration (logistic) in the match engine, and a k-nearest-neighbour price estimate in the War Room. Everything else is deterministic statistics (Chapter 9).

---

## 1. Scout ratings — the core pipeline

### 1.1 Purpose
Rank T20 players across six leagues on a scale where **100 = league average for the same competition, season and phase**, while (a) not letting tiny samples top the table and (b) showing how uncertain each number is.

### 1.2 Inputs
For batting, per player × competition × season × phase from `agg_batting`: balls faced `n`, runs `a`, boundaries `b` (4s+6s), dots `c`, dismissals `d`. For bowling from `agg_bowling`: legal balls `n`, runs conceded `a`, wickets `b`, dots `c`, boundaries conceded `d`. (`scout-service.ts:277-283`)

### 1.3 Step 1 — League expectation (era/league adjustment)

For each season *s* in the window, the league rate is the sum over **all** players:

$$ r_{s} = \frac{\sum_{\text{players}} a_{s}}{\sum_{\text{players}} n_{s}} $$

A player’s **expected** count is accumulated season by season using *their* balls:

$$ E[a] = \sum_{s} n_{p,s}\, r_{s} \qquad (\texttt{p.ea += r.balls * l.a / l.balls}, \text{ line } 321) $$

**Index:**

$$ \text{index} = 100 \times \frac{\text{actual}}{\text{expected}} $$

*Plain English:* “Abhishek Sharma scored 31% more runs than an average IPL 2026 batter would have scored off the same number of balls.”

*Property (tested):* summed over every player, expected = actual exactly, so the league average index is 100 (`scout:build` asserts it).

*Limitation:* the adjustment is **within a league**. An index of 130 in SMAT and 130 in the IPL are each “30% above their own league” — **not** equal ability. No league-strength multiplier exists (`docs/global-data-engine/scout-service.md`, “Known limitations”).

### 1.4 Step 2 — Shrinkage toward the league average

$$ \text{shrunk} = \frac{n \cdot \text{index} + k \cdot 100}{n + k}, \qquad k = 120 \text{ balls} \quad (\texttt{shrink()}, \text{ line } 96) $$

*Plain English:* the player’s own record counts as *n* balls of evidence; the league average counts as 120 balls of evidence. With 27 balls the league dominates; with 1,500 balls the player dominates.

*What kind of statistics is this?* It is the **posterior mean of a normal–normal model with a fixed prior weight** — the same algebra as Bayesian credibility weighting. It is “empirical-Bayes-*style*”, **not** full empirical Bayes: `k = 120` is a chosen constant, not estimated from the between-player variance of the data. The UI text (“Empirical Bayes shrinkage (K=120)”) slightly overstates this. A defensible interview phrasing: *“credibility-weighted toward the league mean with a fixed prior weight of 120 balls; k was chosen, not fitted.”*

### 1.5 Step 3 — Uncertainty intervals (frequentist, not Bayesian)

| Metric type | Method | Code |
|---|---|---|
| Proportions (boundary %, dot %, wicket rate, dismissal rate) | **Wilson score interval**, 95% (z = 1.959964), on the raw proportion, then divided by the league proportion to express it on the index scale | `wilsonInterval()` `:86-94`; `prop()` `:403-412` |
| Strike rate, economy (runs per ball) | **Normal approximation**: actual ± z·√(σ²·n), divided by expected; σ² is the **league’s** per-ball variance for that competition/season/phase window from `scout_phase_variance` (Σx, Σx², n) | `:291-295`, `:415-421`, `:435-440` |
| Balls per dismissal | Wilson interval on the dismissal rate, inverted | `:424-430` |

Wilson interval, for k successes in n trials:

$$ \tilde p = \frac{\hat p + \frac{z^2}{2n}}{1+\frac{z^2}{n}}, \qquad \text{half} = \frac{z\sqrt{\frac{\hat p(1-\hat p)}{n} + \frac{z^2}{4n^2}}}{1+\frac{z^2}{n}} $$

**These are frequentist confidence intervals, not Bayesian credible intervals.** Three caveats you must state:

1. The SR/economy interval uses the **league’s** per-ball variance because a player’s own variance cannot be recovered from aggregates; a six-hitter’s true variance is larger, so their interval is too narrow. The code comments call these intervals “approximate”.
2. **The interval is centred on the raw index, but the leaderboard headline is the shrunk index.** The two come from different frameworks. Example: V Suryavanshi shows *shrunk 137.4* next to *95% [137.4–157.4]* — the headline sits on the lower edge of its own interval. Display both or neither; do not imply the interval belongs to the shrunk value.
3. For balls-per-dismissal with zero dismissals the upper bound is `Infinity`, which JSON serialises as `null`.

### 1.6 Step 4 — Percentiles

`percentileRanks()` (`:100-115`): sort the population’s **shrunk** values in the “better” direction; a value at sorted positions *i…j* (ties) gets

$$ \text{pct} = 100 \times \frac{(i+j)/2}{N-1} $$

so 100 = best, 0 = worst, ties share the mid-rank. Population = same competition, phase and window, **balls ≥ minBalls**, plus any role filter (`:475-482`). Rows below `minBalls` get `percentile = null`.

**Percentiles are computed per competition.** In an “All 6 leagues” table, each league’s leader is “100th percentile” of *its own* league — the live leaderboard shows six different players at 100th %ile in the top ten.

### 1.7 Sample tiers
`rankable` ≥ 120 balls · `low` 60–119 · `insufficient` < 60 (`sampleTier()` `:83-84`).

### 1.8 Worked example 1 — a rankable batter (real output)

Query: IPL, batting, season 2026, phase all (`ratePlayers({discipline:"batting", competitions:["ipl"], seasons:{ipl:["2026"]}})`).

**Abhishek Sharma** (`f29185a1`), 275 balls, 563 runs, 93 boundaries, 89 dots, 14 dismissals, role `opener`.

| Metric | Value | League | Index | Shrunk | 95% CI (index) | Percentile (of 57) |
|---|---:|---:|---:|---:|---|---:|
| Strike rate | 204.73 | 156.34 | 130.9 | **121.5** | 116.8–145.1 | 98.2 |
| Boundary % | 33.82 | 22.47 | 150.5 | 135.2 | 126.8–176.3 | 96.4 |
| Dot % (lower better) | 32.36 | 34.14 | 94.8 | 96.4 | 79.4–111.6 | 60.7 |
| Balls per dismissal | 19.64 | 19.05 | 102.9 | 102.0 | 62.8–171.7 | 33.0 |

Check the arithmetic yourself:
- Index = 100 × 204.73 / 156.34 = **130.95** ✔
- Shrunk = (275 × 130.95 + 120 × 100) / (275 + 120) = (36,011 + 12,000) / 395 = **121.5** ✔

*Interpretation for a recruiter:* clearly above league scoring rate with a tight-enough interval to be confident (lower bound 116.8 > 100); boundary-driven; dismissal rate is average, so the value comes from tempo, not survival.

### 1.9 Worked example 2 — why shrinkage exists

**Azmatullah Omarzai**, IPL 2026, **27 balls**, 52 runs, SR 192.6 (index 123.2). Shrunk = (27 × 123.2 + 12,000)/147 = **104.3**; CI 78.2–168.2 (contains 100); tier `insufficient`; percentile `null`. A raw-SR table would place him near the top; the engine says “we cannot tell him from average yet.” The repository test `shrinkage pulls small samples toward league average` asserts a 190 SR over 35 balls ranks below 155 over 600 balls.

### 1.10 Worked example 3 — a bowler, and a bug

**JJ Bumrah**, IPL 2026, **death overs**, 78 legal balls, 106 runs, 1 wicket, role `powerplay_specialist` (role is computed over all phases).

| Metric | Value | League | Index | Shrunk | Percentile (of 21) |
|---|---:|---:|---:|---:|---:|
| Economy (lower better) | 8.15 | 10.67 | 76.4 | 90.7 | 95 |
| Balls per wicket | 78.0 | 14.18 | 18.2 (wkt/ball) | 67.8 | 0 |
| Dot % | 32.05 | 30.87 | 103.8 | 101.5 | 55 |
| Boundary % conceded | 16.67 | 24.07 | 69.2 | 87.9 | 85 |

The economy percentile is direction-aware and correct (95 = among the best). **But the API’s default sort is wrong:** `routes/scout.ts:138-153` sorts bowling by `metrics.economy.shrunk` **descending** (the UI default `sortOrder = "desc"`, `scout-home.tsx:83`). A higher economy index is *worse*. Verified: IPL bowling, latest season — rank 1 is SN Thakur (economy 12.27 vs league 9.77, shrunk 113.4, **percentile 0**). The code comment “shrunk index is already direction-oriented” is false. **This is the single most important scouting defect to fix before showing the page to anyone** (Challenge 6 is built on it).

### 1.11 Other ratings defects found in this audit

| Defect | Evidence | Effect |
|---|---|---|
| `minBalls` not applied to the ranking list | `routes/scout.ts:105-125` filters only by search; `competitionRatings` returns all rows. In IPL latest-season bowling, 64 of 125 rows are below 120 balls. | “Showing 25 of 3,435 qualified players” — most are not qualified; a 115-ball player appears in the default “Rankable” view. |
| Role column always “Unclassified” | API returns `role: {label, inputs}`; `RolePill` expects a string (`components/scout/scout-metric-badge.tsx:99-106`; `scout-home.tsx:533`) | Role filter works server-side, but the role is never displayed. |
| API typecheck fails | `routes/scout.ts:123` reads `r.unique_name`, absent from `Rating` | Search-by-unique-name branch is untyped; build relies on esbuild skipping type errors. |
| Bowling label “Strike rate (balls per wicket)” with `better: "higher"` | `BOWLING_METRICS` | Percentile is right (index is wickets per ball) but the label invites the wrong reading. |

---

## 2. Role classification (`roles-v1`)

Roles describe **usage**, not quality. Computed per player × competition × season and stored with their inputs (`scout_roles.inputs` JSON).

**Inputs** (from every ball, super overs excluded): arrival position, entry point (legal balls already bowled when the batter arrived), share of balls per phase, whether the bowler bowled over 1 or 2.

**Batting** (first rule that matches, `battingRole()` `:128-135`):

| # | Rule | Role |
|---|---|---|
| 1 | innings < 3 | `insufficient` |
| 2 | opened (position ≤ 2) in ≥ 50% of innings | `opener` |
| 3 | median position ≥ 8 | `lower_order` |
| 4 | median entry ≥ 72 legal balls (over 13+) **or** (≥ 50% of balls at the death **and** median position ≥ 5) | `finisher` |
| 5 | median entry < 36 legal balls | `top_order` |
| 6 | otherwise | `middle_order` |

**Bowling** (`bowlingRole()` `:137-145`): `none` if no balls; `insufficient` < 60 legal balls; `part_time` < 1.5 overs/innings; a **phase specialist** if exactly one phase’s share ≥ 1.6 × its natural share (6/20, 9/20, 5/20 overs → thresholds 48% PP, 72% middle, 40% death); else `multi_phase`.

*Why 1.6× natural share and not a flat 50%?* The death is only 5 of 20 overs, so a flat 50% would make death specialists almost impossible. This is a good design argument to make in an interview.

**Usage profile** (`usageProfile()` `:147-155`): `keeper_batter` (has stumpings and bats), `all_rounder`, `bowler`, `batter`, `limited`.

**Validation:** unit tests pin the rule order and thresholds (`scripts/src/scout/tests/scout.test.ts`: “batting roles follow the documented order”, “bowling roles scale with phase length”, “usage profiles”). **Not validated:** agreement with how franchises or commentators label players. Roles are a reproducible *description*, not ground truth.

---

## 3. Trends (`trends()` `:656-699`)

For each competition: latest season vs all earlier seasons, on the **raw** league-adjusted index (SR for batting, economy for bowling).

$$ \text{SE} = \frac{\text{CI}_{high} - \text{CI}_{low}}{2z}, \qquad \text{SE}_{diff} = \sqrt{SE_L^2 + SE_E^2}, \qquad \text{significant if } |\Delta| > z \cdot SE_{diff} $$

Verdict `improving` / `declining` only if significant; `stable` otherwise; `insufficient sample` if either side has < 60 balls.

**Real example (Abhishek Sharma):** IPL batting SR index 115 → 131 (±16 at 95%), 1,114 → 275 balls → **improving**; SMAT 107 → 161 (±23) → improving; SMAT bowling economy 87 → 104 (±29) → **stable** (not significant despite a large move); IPL bowling → insufficient sample (29 balls).

*Limitation:* earlier seasons are pooled (a player who peaked three seasons ago and declined since looks “improving” if the latest season beats the pooled mean); assumes independence between periods.

---

## 4. Similar players (`similarPlayers()` `:701-740`)

Feature vector per rankable player: the shrunk index of every discipline metric + 100 × powerplay share, death share, middle share. Each feature is **z-scored** across the pool; distance = Euclidean on z-scores; nearest *k* returned. If the target’s bowling type is verified (pace/spin), only same-type bowlers are compared; **unknown is never treated as spin**.

Real example: Abhishek Sharma (IPL, last 2 seasons) → FH Allen 0.63, Priyansh Arya 1.13, A Mhatre 1.66, V Suryavanshi 2.16, PD Salt 2.35 — all aggressive openers, which is a plausible sanity check, **not** a validation.

*Limitations:* equal feature weights; correlated features (SR and boundary %) double-count tempo; no validation set of “known similar” pairs.

---

## 5. Strengths and weaknesses text (`:503-513`)

A metric at ≥ 75th percentile becomes a strength sentence, ≤ 25th a weakness, generated from the numbers (e.g. “Strike rate 229.0 vs league 155.3 (100th pct of 289)”). No language model is involved.

---

## 6. Impact model (`impact-model.ts`) — runs above an average player per match

$$ \text{bat} = \sum_s w_s \Big[R - B\,\overline{rpb}_s - \big(O - B/\overline{bpo}_s\big) W_s\Big] $$
$$ \text{bowl} = \sum_s w_s \Big[B\,\overline{rpb}_s - R_c + \big(Wk - B/\overline{bpw}_s\big) W_s\Big] $$

- W (run value of a wicket) = 0.25 × runs-per-ball × balls-per-out ≈ ¼ of the season’s runs per wicket (~6.5 runs).
- Recency weight ×0.55 per season back (`recencyWeight`).
- Per-match rate shrunk toward a prior of −1.5 runs/match with weight 4 matches: `(Σ + 4 × −1.5) / (m + 4)`.
- Confidence: high ≥ 10 weighted matches, medium ≥ 4.

*Assumption to defend:* a wicket is worth a fixed fraction of runs-per-wicket. *Not validated:* against match outcomes (no win-contribution regression exists).

---

## 7. Hidden Weakness Detector (`weakness-detector.ts`)

Split a player’s balls into cells (bowler type × over window for batters; batter hand × over window for bowlers; plus single dimensions and innings). Per-ball value `v = runs − W·out`. For each cell with ≥ 30 balls:

$$ z = \frac{\bar v_{cell} - \bar v_{rest}}{\sqrt{s^2_{cell}/n_{cell} + s^2_{rest}/n_{rest}}} \qquad p = \Phi(z) $$

**Bonferroni correction:** confidence = 1 − min(1, p × K) where K = number of cells tested. A weakness needs confidence ≥ 80% **and** a material gap (≥ 12 runs per 100 balls, or getting out 1.5× as often). Otherwise cells go to a “watch list” labelled not significant.

Real saved example (RG Sharma, career, 5,514 balls, 44 cells tested): one significant weakness — spin in overs 7–10, SR 103.8 vs 138 elsewhere, z = −3.51, confidence 99%.

*Strength:* explicitly controls the multiple-comparisons problem — a common mistake in sports analytics. *Limitation:* Bonferroni is conservative; bowler type depends on the incomplete style data (unknown types are their own row); cells overlap (a ball is in several cells), so tests are not independent.

---

## 8. Pressure Genome (`pressure-genome.ts`)

Contexts: death overs, knockouts, close finishes (last 5 overs of a live chase, required rate 6–14, ≤ 8 down), steep chase (RRR > 12), collapse rescue (4+ down inside 12 overs), defending (bowling). Each context compared with **the league in the same context**. Value per ball = runs above league − (wicket cost = 0.3 × league runs per wicket) × outs above league; shrunk toward 0 with 40 balls: `v·n/(n+40)`. **Pressure index** = percentile among players with ≥ 120 pressure balls; **lift** = pressure value − calm value.

*Interpretation trap:* “pressure” is defined by match state, not by anything psychological; “archetype” names (“Ice-cold finisher”) are labels on numeric thresholds.

---

## 9. Match engine (`match-model.ts`)

1. **Ball-outcome tables** (dot/1/2/3/4/6/wicket/wide/no-ball) by era × over band × wickets down × required-rate band; sparse cells shrunk toward parent cells.
2. **Player multipliers** vs league in the same slot, shrunk toward 1, built “as of” a season (no future leakage).
3. **Win probability:** exact dynamic programme over (balls left, runs needed, wickets lost).
4. **Platt calibration:** `p = σ(a + b·logit(p_raw))`, fitted by Newton’s method on the start of every over of every 20-over chase (`:414-476`) — the raw DP was under-confident (a raw 15% won ~31%).
5. **Seeded Monte Carlo** for player-specific simulations; the Alt-Universe engine uses common random numbers so the difference between baseline and what-if is the change, not noise.

*Validation gap:* the calibration is fitted and evaluated on the same historical chases (in-sample). A defensible next step is season-based holdout (fit on ≤ 2023, evaluate on 2024–26) with Brier score and a reliability diagram.

---

## 10. War Room valuation (`auction-war-room.ts`)

| Quantity | Definition | Code |
|---|---|---|
| Impact | §6, “as of” the season before the auction | `featuresAsOf()` |
| Replacement level | 20th percentile impact among regulars (≥ 5 matches) that season | `replacementLevel()` `:182-185` |
| IAR | impact − replacement | |
| Reliability | sample / (sample + 8) | `:195` |
| **Market M** | **k-nearest-neighbour comparable sales**: weighted geometric mean of the 15 nearest past sales (last five auctions) in a feature space (IAR, overseas, log experience, all-rounder, keeper); weight = e^(−d/2) × 0.85^(years ago) | `knnDetail()` `:207-222` |
| **Value V** | max(0, IAR × reliability) × median market price per run of reliable IAR (separately overseas/domestic), **capped at the record fee in the window** | `:258-263`, `:345` |
| Signal | BUY if V ≥ 1.25 M and V − M ≥ ₹1 Cr; AVOID if IAR ≤ 0, or V ≤ 0.75 M with ≥ ₹1 Cr gap, or V < reserve; SCOUT if < 5 IPL matches; else HOLD | `:342-349` |
| Max bid | V rounded down to the bid increment | `:277-283` |
| Franchise fit | Squad DNA gaps (importance > 0.05, team percentile < 45) × the player’s z-score on the mapped feature → 0–100 | `teamNeeds()`, `fitFor()` `:471-518` |

> ⚠️ **The file header still says “Ridge regression of ln(price)”. The code uses kNN comparable sales.** The header is stale. Quote the code, not the comment.

### 10.1 Backtest — what the model actually achieved (run 2026-10-12)

`auctionBoard({ view: "backtest" })`: value the real 2026 auction list (369 players) using data up to 2025, then compare with what happened in IPL 2026.

| Measure | Result | Honest reading |
|---|---|---|
| Training data | 372 auction sales 2021–2025 | small |
| Leave-one-out R² of ln(price) | 0.38 | prices are mostly *not* explained by output |
| Typical LOO miss | 2.07× | a ₹5 Cr estimate is often ₹2.4–10 Cr |
| 2026 list coverage | 288 of 369 = **SCOUT** (no IPL record) | the model cannot value most of the list |
| Sold & matched | 28 | tiny evaluation set |
| Price rank correlation (Spearman) | 0.72 | ranks *prices* reasonably |
| Typical price miss on 2026 sales | 1.6× | |
| **Projection: pre-auction IAR vs actual 2026 impact** | **ρ = 0.17, n = 9** | essentially **no demonstrated predictive validity** for performance |
| AVOID group (played ≥ 4 matches) | 5 of 5 “Delivered” | the AVOID signal was contradicted |
| Hits listed by the backtest | 0 | |
| Misses listed | 5 (e.g., JO Holder flagged AVOID, delivered +8.3 runs/match for ₹7 Cr) | |

Live view (CSK needs): V Suryavanshi valued at the cap (₹27 Cr) with **marketBasis 0.1** (almost no comparable sales) — the UI must show that the estimate is extrapolated.

**What you can claim:** “I built a transparent valuation that separates *market price* from *output value* and backtested it without look-ahead; it ranks prices reasonably (ρ = 0.72 on 28 sales) but did not predict 2026 output (ρ = 0.17, n = 9).” **What you must not claim:** that it identifies undervalued players.

Known sensitivity (Step 3 risk 2): fixing bowler economy changed some batters’ market estimates by up to 39% because kNN neighbours re-selected — the price model is unstable near decision boundaries.

---

## 11. Playing XI optimiser (`playing-xi.ts`)

Mixed-integer LP: maximise Σ adjustedImpactᵢ·xᵢ subject to 11 players, ≤ 4 overseas, ≥ 1 keeper, ≥ 20 overs of bowling capacity, min bowling/batting options, min spinners/pacers, locks/exclusions; solved with `javascript-lp-solver`. Marginal value of each selected player = objective drop when re-solved without them. *Hard constraints use only exact metadata* (overseas from squad files; keeper from parsed stumpings) — never fuzzy names.

---

## 12. What has and has not been validated

| Component | Validated how | Not validated |
|---|---|---|
| Metric definitions (balls, legal balls, conceded, dots, boundaries, dismissals, phases) | Unit tests on fixtures (`metrics.test.ts`, 7 tests) + 118 data checks | — |
| League adjustment unbiasedness | Build-time self-check (Σexpected = Σactual) | — |
| Shrinkage behaviour | Unit test (small vs large sample ordering) | choice of k = 120 |
| Percentiles | Unit test (mid-rank, ties, direction) | — |
| Roles | Unit tests of rules | agreement with expert labels |
| Intervals | Wilson implementation tested | coverage (does a 95% interval contain the truth 95% of the time?) |
| Cross-league comparability | — | **not validated**; no league-strength factor |
| Trends | — | false-positive rate |
| Similar players | sanity check only | |
| Weakness detector | method is principled (Bonferroni) | out-of-sample: do flagged weaknesses persist next season? |
| Match engine | Platt calibration (in-sample) | holdout calibration, Brier score |
| War Room | backtest (above) | predictive validity is weak |
| Economy in IPL warehouse | recount vs raw files: exact except 17 deliveries | — |

---

## 13. How a franchise analyst should read Scout Lab today

1. Read **shrunk index** for ranking, **CI** for confidence, **balls** for sample, **tier** for eligibility — together.
2. Compare players **within a league**. Across leagues, treat a 120 in SMAT and a 120 in the IPL as “both well above their own league,” nothing more.
3. Ignore the default bowling order until the sort bug is fixed; sort ascending, or read the percentile.
4. Treat roles as usage descriptions for the selected window.
5. For bowlers outside the IPL, bowling type is usually `unknown`; type-specific comparisons are unavailable.

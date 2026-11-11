# CricField Player Intelligence Engine

Delivery report, 2026-11-02. Published snapshot: `cf-intel-2026.7a721131b2`, data to 2026-05-30, target season 2027.
Nothing here is committed or deployed.

## 1. Architecture

Built on the existing Vite, Express and SQLite stack, not Next.js. Python is used offline for training only. The site never runs Python.

```
Warehouse + auction + squad files
  → identity.ts          canonical ids, exact links only
  → impact-engine.ts     ball-level, context-adjusted ratings as of any season
  → feature-store.ts     point-in-time training and scoring tables
  → scripts/intelligence/train.py     expanding-window validation, model choice
  → scripts/intelligence/02-publish.ts   batch inference, immutable versioned snapshot
  → service.ts           the only reader; serves envelopes, never computes a price
  → routes/intelligence.ts  → every page and the AI Analyst
```

Rebuild with `pnpm --filter @workspace/api-server intelligence:train`. A running API picks up a new snapshot within 30 seconds. Old versions stay readable with `?version=`.

The version hashes the inputs and all published figures. If nothing changed, publish says so and writes nothing.

## 2. Files

**New, API:** `src/services/intelligence/` (`schema`, `identity`, `impact-engine`, `feature-store`, `squad-optimizer`, `service`), `src/routes/intelligence.ts`, `scripts/intelligence/` (`01-build-features.ts`, `train.py`, `02-publish.ts`), `test/intelligence.test.ts`, `data/intelligence/`.

**New, web:** `src/lib/intelligence-api.ts`, `src/components/intelligence/intel-components.tsx`, `src/pages/ai-analyst-intelligence.tsx`.

**Modified:** `routes/index.ts`, `routes/ai-analyst.ts`, `services/cricfield-analyst.ts`, `services/decision/auction-war-room.ts`, `package.json`, `.gitignore`, `App.tsx`, `lib/sim-api.ts`, `components/decision/intel-panels.tsx`, `components/decision/playing-xi-drawer.tsx`, and pages `player`, `ai-analyst-auction`, `scout-home`, `stats`, `ai-analyst-feed`, `feed-auction`, `methodology`.

## 3. Database and schema changes

None to `sqlite.db`. The warehouse stays read-only. New state is `data/intelligence/current.json` and one `snapshot.json` per version (1.5 MB). Training tables in `data/intelligence/work/` are gitignored.

## 4. Datasets actually available

| Data | Coverage | Limit |
|---|---|---|
| Ball-by-ball | 2008–2026, 1,243 matches, 295,732 deliveries | Complete for what it records |
| Rupee auction sales | 2014–2026, 1,341 rows, 1,337 linked to a player | Sold only. 2008–2013 are in dollars and unused |
| Unsold players | 2026 only | No earlier lists on file |
| Squads and contracts | 2008–2026; `retained` labels 2019–2026 | Some rows have no acquisition label and are excluded |
| Base price | 2014–2026 | Unknown for 2027, so not used live |
| Birth dates | 255 of 1,198 players | Missing age stays null |
| Fielding | Catches, stumpings, run-outs | Counts only, no runs saved |
| Purses | 2026 only | **`strategy-2027-data.ts` purses have no source and are not used** |

Identity: 1,198 players, 964 verified, 234 name-only, and 1 truly ambiguous name (Harmeet Singh, two people). The 4 unresolved sales are listed in section 9.

Problems found in existing data:
- 177 `json:N` player rows are squad stubs with no deliveries, not Cricsheet identities.
- `PlayerMeta.fullName` is loosely matched. It names Anukul Roy "Jason Roy" and Rajesh Bishnoi "Ravi Bishnoi".
- The squad book maps some rows to the wrong player ("Rahul Sharma" to MM Sharma).
- Squad-list roles are unreliable (Piyush Chawla is a "wicketkeeper"), so roles now come from usage.

## 5. Models and validation

Every result below is out of time. Holdout seasons were not used for training or model choice.

| Model | Method | Result | Published as |
|---|---|---|---|
| Runs Above Replacement | Run-expectancy value, adjusted for context, venue and opposition, with empirical-Bayes shrinkage | Next-season rank correlation 0.188 (old model 0.159, n=1,031). 80% interval covered 81.1% | Model Prediction. **Not WAR** |
| Auction price | Average of ridge and gradient-boosted trees (HistGradientBoosting; LightGBM and CatBoost are not installed) | 2024–26, 328 sales: MAE ₹2.15 Cr, median ₹0.61 Cr, typical ×1.85, rank 0.70. Benchmarks: role median ₹2.69 Cr, previous contract ₹2.46 Cr. 80% range covered 79.8% | Model Prediction |
| Sold likelihood | Logistic regression, 2026 pool only | AUC 0.75 inside one auction. Never tested on a later one | Provisional |
| Retention | Calibrated gradient-boosted trees, mini-auction continuation | 2026 holdout: Brier 0.222 vs base rate 0.231, AUC 0.73, calibration error **0.13 against a 0.08 limit** | **Failed gate.** Provisional index, never a percentage |
| Franchise fit | Mixed-integer best XII | Composition only: see below | Provisional |
| Season simulation | Gated on strength predicting matches | **Failed.** 2023–26 Brier 0.2516 vs 0.25 for a coin flip; team-season rank correlation with wins −0.05 (n=98) | **Off.** No playoff or title odds |
| Rupee value of performance | None | No validated conversion | Unavailable. Compared as ranks instead |

Accuracy by band (holdout MAE): under ₹1 Cr ₹0.35 Cr, ₹1–5 Cr ₹1.71 Cr, over ₹5 Cr ₹6.37 Cr. By role: all-rounder ₹1.38 Cr, batter ₹2.26 Cr, bowler ₹2.29 Cr, keeper ₹2.40 Cr. Adding base price barely helps (MAE ₹2.15 Cr either way).

## 6. APIs

Under `/api/intelligence`: `GET players`, `players/:key`, `players/:key/valuation`, `/retention`, `/franchise-fit`, `/comparables`, `/replacements`, `/citation`; `GET compare`, `teams`, `teams/:team`, `models/status`, `diagnostics`, `insights`; `POST squad/simulate`, `auction/simulate`. Ambiguous names return 409 with candidates.

Existing routes kept. `/war-room/board` (live view) and `/intel/player` now read the same snapshot.

## 7. Pages integrated

| Section | Change |
|---|---|
| Auction War Room | Live board uses the shared price, 80% range, rank gap and fit. BUY, HOLD and AVOID now mean rank gap. Value and Max bid removed from the live board. The 2026 backtest keeps the old comparable-sales benchmark, labelled as such |
| Scout Lab | Value board with franchise, role, phase, overseas, price band and evidence filters |
| Squad Builder | New `/ai-analyst/squad-builder` and inside the XI drawer: retention board, gaps, buy, release, trade and replace scenarios, replacements, budget |
| Player profiles | Player Intelligence section with the four concepts apart, history chart, comparables and a copyable citation |
| Stats | New Value & Impact tab |
| Feed | Labelled model-insight snippets on Insight Feed and Auction hub |
| AI Analyst | Five tools: `player_valuation`, `franchise_need`, `best_value`, `squad_scenario`, `replacement_options` |
| Reports | Citation with model version and data cutoff, reproducible with `?version=` |
| Methodology | New Player Intelligence section |

## 8. Tests

| Check | Result |
|---|---|
| New intelligence tests | 31 of 31 |
| Full API suite | 160 of 160 |
| API typecheck | Clean |
| Web typecheck | Clean |
| API and web production builds | Pass |
| Browser, live data | Squad Builder, profile, War Room, Scout, Stats, Feed: no console errors. 375px: no page overflow |
| Lint | No lint script exists in this repo |

Two older failures were fixed in this delivery:
- `day1-security.test.ts` was stale. `gemini-client.ts` sends prompts with no context to `/api/ai/analyst`, and the test now covers both routes.
- `PlayerCareerMilestones` declared `firstSeason` too narrowly. The prop now accepts null, which the component already handled.

The test suite ran with `--test-isolation=none` because this sandbox blocks child processes. `pnpm test` uses isolation.

**Cross-page check, live API:**

| Player | Measure | Auction Intelligence | Scout Lab | Squad Builder | Profile |
|---|---|---|---|---|---|
| V Kohli | Price | ₹13.77 Cr | ₹13.77 Cr | ₹13.77 Cr | ₹13.77 Cr |
| | Runs/match | +1.4 | +1.446 | +1.446 | +1.446 |
| | Value · outlook | Fairly priced · Likely kept | same | same | same |
| JJ Bumrah | Price | ₹8.94 Cr | ₹8.94 Cr | ₹8.94 Cr | ₹8.94 Cr |
| | Runs/match | +2.4 | +2.375 | +2.375 | +2.375 |
| | Value · outlook | Fairly priced · Likely kept | same | same | same |
| Rashid Khan | Price | ₹15.92 Cr | ₹15.92 Cr | ₹15.92 Cr | ₹15.92 Cr |
| | Runs/match | +1.1 | +1.117 | +1.117 | +1.117 |
| | Value · outlook | Fairly priced · Likely kept | same | same | same |

The War Room shows ratings to one decimal place from the same value.

## 9. Blocked by missing data

- **Probability of being sold:** needs unsold lists for 2014–2025.
- **Calibrated retention percentage:** the model failed. Re-test after the 2027 retentions, adding a seasons-since-mega-auction feature. The 2026 miss looks tied to the first year after a mega auction, when teams kept unused players. That is a hypothesis, and it was deliberately not tuned against the holdout.
- **Formal mega-auction retention:** only two comparable events (2022, 2025) exist, so they are excluded.
- **Season simulation:** needs a strength measure that predicts matches.
- **Rupee fair value and WAR:** no validated conversion from runs to rupees or wins.
- **Fielding impact:** needs fielding event data.
- **Purse and pool features:** purses exist for 2026 only, and the 2027 pool is not known.
- **Injury and availability:** no verified source.
- **Age:** 21% of players.
- **4 unresolved sales:** Pratham Singh (2017, 2022), Kshitiz Sharma (2018), Shivalik Sharma (2024).

## 10. Limits and production requirements

**Read these before trusting a number:**
- **Top prices are weak.** Over ₹5 Cr the mean miss is ₹6.37 Cr. Elite retained players rarely reach an auction, so Bumrah's ₹8.94 Cr is low and marked provisional.
- **Fit measures composition, not winning.** Pre-season strength did not predict results, so a "+4.4" is a squad-balance figure.
- **Fit separates bowlers far more than batters.** Bumrah ranges widely by team; Kohli runs from +1.35 to +1.45, because most teams' marginal batter is near replacement.
- **Squads are 2026 lists,** including replacement players, so several exceed 25.
- **All-rounder value ranks rest on 9 rated players,** so read them lightly.

**Not done:**
- The Playing XI optimizer still uses the older impact-vs-average metric, with pitch adjustment. It is labelled, but it is a second metric.
- Scout Lab shows the current pool only. It has no season filter.
- The AI Analyst tools are tested, but no live model answered through them, because no AI provider is configured here.
- No Playwright journey was added.

**Before production:** owner review and commit; rebuild and deploy the API `dist`; confirm the snapshot ships with the deploy; schedule `intelligence:train` after each data update; add a monitor for snapshot age; review the licences of scraped auction and squad sources.

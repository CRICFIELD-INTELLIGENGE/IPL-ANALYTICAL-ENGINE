# 15 — Interview Defense Handbook (100 questions)

> **How to use this chapter.** Read the question, answer aloud *without* looking, then compare with the model answer. A model answer is only useful if you can produce its substance in your own words and point to the evidence. Exercises marked here have answer notes in Chapter 16’s answer key where relevant. Same content: `INTERVIEW-QUESTIONS.csv`.
>
> **Answering principle for every CricField question:** *state what the code does → why → its limitation → what you would do next.* Interviewers reward the limitation more than the feature.

### Worked answers to two exercises referenced below

- **B06 economy over** `1, wd(1), 4, 0, lb(1), 0, 2`: legal balls = 6 (the wide doesn’t count; the leg-bye does). Runs conceded = 1 + 1 + 4 + 0 + 0 + 0 + 2 = 8 (leg-bye not charged). Economy = 6 × 8 / 6 = **8.00**.
- **I13 shrink** an index of 150 over 40 balls (k = 120): (40×150 + 120×100)/(160) = (6,000 + 12,000)/160 = **112.5**.

## Beginner (30)

### B01 · Overview — In two sentences, what is CricField?

**Model answer.** An IPL-first cricket analytics web app: a React front end and an Express API over two SQLite warehouses (IPL 2008–2026 and a six-league T20 warehouse). It offers stats exploration, player/team pages, deterministic decision tools (weakness scans, simulations, auction valuation) and a cross-league scouting view.

- **Evidence:** App.tsx routes; api-server routes; sqlite.db, global.db
- **Follow-ups:** Who is it for? What is the one feature you would demo first?
- **Common misconception:** Calling it an 'AI platform' — almost all of it is deterministic statistics.

### B02 · Overview — What are the two databases and why are there two?

**Model answer.** sqlite.db is the IPL warehouse the site was built on; global.db is a separate, rebuildable Cricsheet warehouse for six leagues. It was kept separate so the new engine could never break the live IPL site, and because its schema follows Cricsheet more faithfully.

- **Evidence:** docs/global-data-engine/00-audit-and-plan.md §3.1
- **Follow-ups:** What is the cost of two copies of IPL data?
- **Common misconception:** 'Two databases is always bad' — it was a deliberate risk-isolation choice.

### B03 · Cricket — What is a legal delivery?

**Model answer.** A delivery that is neither a wide nor a no-ball. Only legal deliveries count toward the six balls of an over and toward a bowler's balls bowled.

- **Evidence:** metrics.md 'Legal ball'; is_wide/is_noball columns
- **Follow-ups:** Is a no-ball a ball faced by the batter?
- **Common misconception:** Treating every row in deliveries as a legal ball.
- **Exercise:** Count legal balls in one over that contains a wide and a no-ball.

### B04 · Cricket — Which deliveries count as balls faced by a batter?

**Model answer.** Every delivery except a wide. No-balls are faced.

- **Evidence:** update-ipl-data-v3.ts:705 `if (!isWide) balls += 1`
- **Follow-ups:** Why are wides excluded?
- **Common misconception:** Excluding no-balls from balls faced.

### B05 · Cricket — How do you compute batting strike rate correctly?

**Model answer.** 100 × runs off the bat ÷ balls faced, where balls faced excludes wides. Extras never count as the batter's runs.

- **Evidence:** Q1 in Ch.4; v_batting view
- **Follow-ups:** What about super-over balls?
- **Common misconception:** Using total_runs (which includes extras) instead of batter_runs.
- **Exercise:** Compute SR from: 4 runs off 3 balls plus a wide.

### B06 · Cricket — How do you compute bowling economy correctly?

**Model answer.** 6 × runs conceded ÷ legal balls. Runs conceded = bat runs + wide runs + no-ball penalty runs; byes, leg-byes and penalties are not charged.

- **Evidence:** RUNS_CONCEDED_SQL (decision/db.ts:88); metrics.md
- **Follow-ups:** Why does CricField's IPL warehouse get 17 deliveries slightly wrong?
- **Common misconception:** Dividing by all deliveries or charging byes to the bowler.
- **Exercise:** Over: 1, wd(1), 4, 0, lb(1), 0, 2 → economy?

### B07 · Cricket — What are the three T20 phases in CricField?

**Model answer.** Powerplay overs 1–6, middle overs 7–15, death overs 16–20 (0-based over numbers 0–5, 6–14, 15–19).

- **Evidence:** metrics.md 'Phases'; phaseFromOver
- **Follow-ups:** How are 5-ball sets in The Hundred handled?
- **Common misconception:** Off-by-one errors from 0-based over numbers.

### B08 · Cricket — Why are super overs excluded from career stats?

**Model answer.** They are tie-breakers, not part of the match proper; official records exclude them. In sqlite.db they are innings 3–6; in global.db they are flagged super_over = 1.

- **Evidence:** innings table counts (16+16+1+1)
- **Follow-ups:** How would including them bias a death-overs economy?

### B09 · SQL — What does GROUP BY do in Q1 (career batting)?

**Model answer.** It collapses all of a player's deliveries into one row so SUM/COUNT aggregate per player.

- **Evidence:** Ch.4 Q1
- **Follow-ups:** Why COUNT(DISTINCT match_id)?
- **Common misconception:** Thinking GROUP BY filters rows (that is WHERE/HAVING).
- **Exercise:** Add a GROUP BY season to Q1.

### B10 · SQL — What is the difference between WHERE and HAVING?

**Model answer.** WHERE filters rows before grouping; HAVING filters groups after aggregation (e.g., HAVING balls >= 200).

- **Evidence:** Ch.4 Q2
- **Follow-ups:** Can HAVING use a column alias in SQLite?

### B11 · SQL — What is a primary key? Give one from CricField.

**Model answer.** A column (or set) that uniquely identifies a row. deliveries in global.db uses (match_id, innings_no, over_no, seq).

- **Evidence:** global schema.sql
- **Follow-ups:** Why is a composite key better than an auto-increment id here?

### B12 · SQL — What is an index and why does deliveries have one on batter_id?

**Model answer.** A sorted lookup structure that lets the database find rows without scanning the whole table; it makes per-player queries fast.

- **Evidence:** idx_deliveries_batter; Q1 plan
- **Follow-ups:** What do indexes cost?
- **Common misconception:** Indexes always make everything faster (they slow writes, use space).

### B13 · Web — What is the role of React in CricField?

**Model answer.** It renders the UI from state; each page is a component that fetches data via hooks and displays tables/charts.

- **Evidence:** pages/*.tsx
- **Follow-ups:** What is a hook?

### B14 · Web — What is Express doing?

**Model answer.** It is the web server: matches URLs to route handlers, runs middleware (logging, CORS, JSON parsing) and returns JSON.

- **Evidence:** app.ts, routes/*
- **Follow-ups:** List the middleware in order.

### B15 · Web — What is a REST endpoint? Give a CricField example.

**Model answer.** A URL + HTTP method that returns a resource representation, e.g. GET /api/scout/rankings returns a JSON page of player ratings.

- **Evidence:** Ch.8
- **Follow-ups:** Which endpoints change state?

### B16 · Web — What is JSON and why is it used between front end and back end?

**Model answer.** A text format for structured data that JavaScript parses natively; both sides speak it.

- **Evidence:** every API response

### B17 · Web — What does Vite do?

**Model answer.** Runs the development server with hot reload and builds the production bundle; it also proxies /api to the backend in development.

- **Evidence:** vite.config.ts
- **Follow-ups:** Why is the production bundle 4.1 MB?

### B18 · Web — What is TypeScript and why use it?

**Model answer.** JavaScript with static types that catch mismatches at compile time.

- **Evidence:** tsconfig.base.json
- **Follow-ups:** Name a bug TypeScript did not catch in CricField.
- **Common misconception:** Types guarantee runtime correctness.

### B19 · Data — Where does CricField's match data come from?

**Model answer.** Cricsheet ball-by-ball files (ODC-BY licence), plus enrichment from ESPN commentary, scraped live scores and compiled squad/auction files.

- **Evidence:** Ch.5 §1; /data-sources page
- **Follow-ups:** Which sources are licensed?

### B20 · Data — What is ETL?

**Model answer.** Extract, Transform, Load: download raw files, convert them into tables/metrics, and load them into the warehouse.

- **Evidence:** scripts/src/global/*
- **Follow-ups:** Which step validates data in CricField?

### B21 · Data — What is a Cricsheet registry id?

**Model answer.** An 8-character hex identifier per person, stable across matches, used to tell players apart even if names collide.

- **Evidence:** identity.md
- **Follow-ups:** Why not use names?

### B22 · Stats — What does an index of 130 mean in Scout Lab?

**Model answer.** 30% above the league average for the same competition, season and phase, given the player's own balls.

- **Evidence:** Ch.6 §1.3
- **Follow-ups:** Is 130 in SMAT the same as 130 in the IPL?
- **Common misconception:** Reading it as a percentage of the best player.

### B23 · Stats — What is a percentile?

**Model answer.** The share of the comparison population the player is better than (here 100 = best, mid-rank for ties).

- **Evidence:** percentileRanks()
- **Follow-ups:** Why compute it on the shrunk value?

### B24 · Stats — Why does sample size matter?

**Model answer.** Small samples are noisy: a 190 strike rate over 27 balls tells you little. CricField shows balls and tiers and shrinks small samples.

- **Evidence:** Omarzai example Ch.6 §1.9

### B25 · Product — Who is the target user?

**Model answer.** Two groups: IPL fans (Dugout, players, Ask) and analysts/scouts (Scout Lab, War Room). The tension between them shapes the UI.

- **Evidence:** Ch.24
- **Follow-ups:** Which would you pick if you had to choose?

### B26 · Product — What is the AI Analyst?

**Model answer.** A set of deterministic analysis modules (stats Q&A, weakness scans, pressure profiles, simulations, auction valuation) plus an optional Gemini tab.

- **Evidence:** Ch.9 §1
- **Follow-ups:** Which parts are actually AI?
- **Common misconception:** Calling it an LLM agent.

### B27 · Tools — What is pnpm and what is a workspace?

**Model answer.** A package manager; a workspace manages several packages (web, API, libs, scripts) in one repository with shared versions.

- **Evidence:** pnpm-workspace.yaml

### B28 · Tools — What is Git used for and what is the state of the repo?

**Model answer.** Version control. The repo has 19 commits and ~274 uncommitted paths, so history doesn't yet show the recent work.

- **Evidence:** git log / status
- **Follow-ups:** How would you split the uncommitted work into commits?

### B29 · Debugging — A page shows a wrong number. What is your first step?

**Model answer.** Reproduce the API call (network panel/curl) to see whether the number is wrong in the data or in the UI.

- **Evidence:** Ch.12 drill

### B30 · Ethics — Which parts did you build with AI assistance?

**Model answer.** Be specific and honest: implementation was largely AI-assisted; I directed scope and design, set review gates, and verified results; here is what I can rebuild myself (name it).

- **Evidence:** Ch.26
- **Follow-ups:** What could you rebuild without Claude Code?
- **Common misconception:** Claiming sole authorship of all code.

## Intermediate (40)

### I01 · SQL — Why did you choose SQLite?

**Model answer.** One developer, read-mostly data (~300k and ~770k rows), no DB server to run on Replit, file is easy to copy and rebuild, and the global engine stays fully reproducible. The known ceiling is concurrency: the synchronous driver blocks Node's event loop.

- **Evidence:** 00-audit-and-plan.md §3.2 storage options table
- **Follow-ups:** When would you switch, and to what?
- **Common misconception:** 'SQLite can't handle production' — it can for read-mostly workloads with caching.

### I02 · SQL — Why does the death-economy query take 871 ms while a global query takes 6 ms?

**Model answer.** The first scans the bowler index across all 295k raw deliveries and joins matches for the season; the second reads pre-aggregated rows keyed by competition/season/phase.

- **Evidence:** Ch.4 Q3 vs Q7 plans
- **Follow-ups:** How would you speed up Q3?
- **Common misconception:** Adding random indexes without checking the plan.
- **Exercise:** Run EXPLAIN QUERY PLAN on Q3 on a copy and propose one index.

### I03 · SQL — How do you avoid SQL injection in CricField?

**Model answer.** Prepared statements with ? placeholders (node:sqlite) and Drizzle's sql tag, which binds values as parameters; the one interpolated fragment uses a Zod-validated enum.

- **Evidence:** scout-service.ts inList(); routes/scout.ts phase enum
- **Follow-ups:** Show the unsafe pattern in the ingest script and explain why it isn't exploitable.
- **Common misconception:** Escaping strings manually is enough.

### I04 · SQL — Why compute ratios in TypeScript after summing, not in SQL per group?

**Model answer.** So groups can be merged first (renamed franchises, venue variants) — you add runs and balls, then divide. Averaging ratios gives the wrong answer.

- **Evidence:** stats-engine.ts header
- **Follow-ups:** Give a numeric example where averaging SRs is wrong.
- **Exercise:** Two seasons: 100 runs/50 balls and 10 runs/20 balls → correct SR?

### I05 · SQL — What does WITHOUT ROWID do and why use it for deliveries?

**Model answer.** Stores the table clustered by its primary key instead of a hidden rowid, saving space and making PK range scans fast for composite keys.

- **Evidence:** global schema.sql

### I06 · SQL — What is the WAL file next to sqlite.db?

**Model answer.** Write-ahead log: recent writes not yet checkpointed into the main file. Copying the DB without it can give stale data.

- **Evidence:** sqlite.db-wal 27 MB
- **Follow-ups:** When is it checkpointed?

### I07 · Data — How do you handle duplicate player names?

**Model answer.** Join on the Cricsheet registry id; names never merge records; ambiguous names return all candidates and no player; unlinked records go to a review queue.

- **Evidence:** identity.md; resolvePlayer('Yuvraj Singh') → 3 candidates
- **Follow-ups:** What went wrong with initial+surname matching?
- **Common misconception:** Fuzzy matching is fine for display.

### I08 · Data — Explain the ball-number wrap bug.

**Model answer.** The CSV ball label '19.10' was parsed as a float 19.1, giving ball 1; any over with 10+ deliveries restarted numbering. Fixed in data on 2026-10-11 with delivery_seq; still present in the ingest script.

- **Evidence:** update-ipl-data-v3.ts:659-661; backup vs current DB
- **Follow-ups:** How would you fix the parser?
- **Exercise:** Write a parser for '19.10' that returns over 19, ball 10.

### I09 · Data — Why were bowler economies wrong before Step 3?

**Model answer.** is_bye/is_legbye were never populated, so the conceded-runs expression charged 7,142 bye/leg-bye runs to bowlers. The fix uses bat runs + wide runs + 1 per no-ball.

- **Evidence:** decision/db.ts:77-89
- **Follow-ups:** What residual remains?

### I10 · Data — What makes the global ETL idempotent and incremental?

**Model answer.** Archives stored by content hash; matches re-ingested only if new or their zip entry CRC changed; aggregates recomputed per competition; rerunning gives the same result (27 s rebuild = incremental).

- **Evidence:** normalize.ts header; README
- **Follow-ups:** What happens when Cricsheet corrects a match?

### I11 · Data — Name five validation checks the global engine runs.

**Model answer.** Match counts agree across catalogue/archive/README/DB; runs.total = batter + extras and extras = sum of types; legal balls per over ≤ 6 except recorded miscounts; win margins reconcile with totals; every delivery references known players.

- **Evidence:** validate.ts; validation-2026-10-10.md
- **Follow-ups:** What does a WARN mean?

### I12 · Data — What is data lineage and how does CricField record it?

**Model answer.** Being able to trace a number to its source file and version. Global engine: acquisitions.jsonl (URL, time, SHA-256), source_files, meta timestamps, in_latest_source, change reports. The IPL warehouse lacks this.

- **Evidence:** Ch.5 §9

### I13 · Stats — Why is Bayesian shrinkage useful?

**Model answer.** It balances a player's own evidence against the league average in proportion to sample size, so tiny samples don't top rankings and estimates are less noisy.

- **Evidence:** shrink() k=120
- **Follow-ups:** Is CricField's version fully Bayesian?
- **Common misconception:** Shrinkage 'penalises' small-sample players unfairly — it reduces expected error.
- **Exercise:** Shrink an index of 150 over 40 balls with k=120.

### I14 · Stats — How do you distinguish confidence from sample size?

**Model answer.** Sample size is how much data; confidence (interval width) also depends on the variability of the quantity. Two players with 200 balls can have different interval widths for boundary % vs dismissal rate.

- **Evidence:** Abhishek: SR CI 116.8–145.1 vs balls/dismissal CI 62.8–171.7 on the same 275 balls
- **Common misconception:** Equating 'rankable' with 'certain'.

### I15 · Stats — What kind of interval does Scout Lab report?

**Model answer.** Frequentist 95% intervals: Wilson score for proportions; a normal approximation using league per-ball variance for strike rate and economy. Not Bayesian credible intervals.

- **Evidence:** scout-service.ts:86-94, 415-440
- **Follow-ups:** Why use league variance?
- **Common misconception:** Calling them credible intervals.

### I16 · Stats — Why the Wilson interval instead of p ± 1.96·SE?

**Model answer.** The Wald interval misbehaves for small n and proportions near 0 or 1 (it can go negative); Wilson stays in [0,1] and has better coverage.

- **Evidence:** wilsonInterval()
- **Exercise:** Compute the Wilson interval for 3 boundaries in 20 balls.

### I17 · Stats — How do you verify cross-league comparisons?

**Model answer.** Today you can't claim equivalence: indices are within-league. Verification would use players who moved between leagues (paired comparison) to estimate league-strength factors, then test them out of sample.

- **Evidence:** scout-service.md 'Known limitations'
- **Follow-ups:** What bias could movers introduce?
- **Common misconception:** Treating a 120 in SMAT as a 120 in the IPL.

### I18 · Stats — What is the multiple-comparisons problem in the Weakness Detector?

**Model answer.** Testing 44 cells at 95% would produce ~2 false 'weaknesses' by chance. The detector multiplies p-values by the number of cells (Bonferroni) and requires a material effect size.

- **Evidence:** weakness-detector.ts
- **Follow-ups:** Why is Bonferroni conservative?

### I19 · Stats — What does the impact model measure?

**Model answer.** Runs per match above an average IPL player: batting runs above league rate minus a wicket cost, bowling the mirror image; recency-weighted and shrunk toward a slightly negative prior.

- **Evidence:** impact-model.ts
- **Follow-ups:** Why is W ≈ ¼ of runs per wicket?

### I20 · Stats — What is Platt scaling and why was it needed?

**Model answer.** A logistic recalibration p = σ(a + b·logit(raw)). The raw dynamic-programming win probability was under-confident (raw 15% chases won ~31%).

- **Evidence:** match-model.ts:414-476
- **Follow-ups:** How would you validate it properly?

### I21 · Stats — How did the War Room perform in its backtest?

**Model answer.** On the 2026 auction: price rank correlation 0.72 on 28 matched sales, typical miss 1.6×; projection of performance ρ = 0.17 on only 9 players; all 5 AVOIDs who played delivered. It ranks prices but has not shown predictive value.

- **Evidence:** auctionBoard({view:'backtest'}) run 2026-10-12
- **Follow-ups:** What would you change?
- **Common misconception:** Claiming it finds undervalued players.

### I22 · API — How does a React component retrieve data in CricField?

**Model answer.** A React Query hook (useQuery) with a key containing all inputs calls a fetch helper (e.g. fetchScoutRankings), caches the JSON, and exposes isLoading/isError/data to the component.

- **Evidence:** scout-home.tsx:89-118
- **Follow-ups:** What is staleTime?

### I23 · API — What happens when an API fails?

**Model answer.** Modern routes return structured errors (400 invalid_request, 404 player_not_found, 503 warehouse_unavailable); React Query sets isError; decision pages show an ErrorBanner or a labelled demo snapshot; some legacy pages just render empty.

- **Evidence:** routes/decision.ts; module-shell.tsx
- **Follow-ups:** Which pages have no error UI?

### I24 · API — Why is Zod used on the server?

**Model answer.** To validate and coerce untrusted input at the boundary (query strings are strings) and reject bad requests with clear issues; types are inferred from schemas.

- **Evidence:** rankingsQuerySchema
- **Follow-ups:** Which routes don't use it?

### I25 · API — Walk through GET /api/scout/rankings.

**Model answer.** Middleware → warehouse guard → Zod parse → ratePlayers per competition → search → sort → paginate → strengths/weaknesses → JSON.

- **Evidence:** Ch.2 §4
- **Follow-ups:** Where are the two bugs?

### I26 · API — Why is /api/stats/query slow?

**Model answer.** It runs multi-join SQL over raw deliveries (or replays every raw JSON file) for each filter combination, synchronously, with no caching; 2.3 s warm.

- **Evidence:** Ch.8 §6
- **Follow-ups:** Propose two fixes.

### I27 · API — What does Cache-Control: no-store on every API response cost you?

**Model answer.** Browsers and CDNs can never reuse responses, even for immutable historical data, so every visit recomputes.

- **Evidence:** app.ts:32-38

### I28 · Frontend — Why is every Scout role 'Unclassified'?

**Model answer.** The API returns role as {label, inputs} but the client type and RolePill expect a string, so the pill receives an object and falls back.

- **Evidence:** scout-api.ts:23; scout-metric-badge.tsx:99
- **Follow-ups:** How do you prevent this class of bug?
- **Exercise:** Write the one-line fix.

### I29 · Frontend — How does team theming work?

**Model answer.** TeamProvider writes CSS custom properties (--team-accent etc.) on the root element and stores the choice in localStorage; components use var(--team-accent).

- **Evidence:** team-context.tsx:255-298

### I30 · Frontend — Why is the JavaScript bundle 4.1 MB?

**Model answer.** All ~50 pages, three.js, Recharts and Radix are imported statically into one chunk; no React.lazy.

- **Evidence:** build output
- **Follow-ups:** How would you split it?

### I31 · Frontend — How did the player page go from crashing to fast?

**Model answer.** It used to download a 33 MB file of every player's matches; now it loads a 67 KB identity index and one per-player shard (median 4 KB).

- **Evidence:** step3/README.md

### I32 · Debugging — How would you debug the inverted bowling ranking?

**Model answer.** Call ratePlayers directly, sort by economy.shrunk desc, and see rank 1 has percentile 0; inspect the sort comparator; fix by applying each metric's 'better' direction; add an API test.

- **Evidence:** Ch.6 §1.10

### I33 · Debugging — A filter returns nothing. How do you know if it's a data or code problem?

**Model answer.** Reproduce with curl; check the parsed filters in logs; run the equivalent SQL on a copy; if SQL returns rows, it's the code; if not, check the data (e.g., pressure_state is always 'Standard').

- **Evidence:** ipl.ts logs; Ch.4 §5.2

### I34 · Architecture — What happens when 1,000 users query Scout Lab simultaneously?

**Model answer.** Each request runs synchronous SQL on one event loop; measured 50 concurrent rankings → 1.9 s wall time, so 1,000 would queue for tens of seconds and block every other endpoint. Fix: cache responses (they change only when the warehouse is rebuilt), precompute default views, add a CDN, run multiple instances, rate-limit.

- **Evidence:** Ch.11 §2.2
- **Follow-ups:** Which single change helps most?

### I35 · Architecture — Why one monolithic server?

**Model answer.** Simplest to build and deploy for one developer with a read-mostly workload; services are still modular internally.

- **Evidence:** Ch.2 §2
- **Follow-ups:** When would you split it?

### I36 · Security — Find a security vulnerability in CricField.

**Model answer.** POST /api/ipl/sync-csv reads any filePath from the request body: an unauthenticated file-existence oracle and read. Remove it or whitelist file ids.

- **Evidence:** csv-sync-route.ts; cricsheet-csv-sync.ts:38-43
- **Follow-ups:** What other risks exist?

### I37 · Security — Is it safe to put a Gemini API key in VITE_GEMINI_API_KEY?

**Model answer.** No. VITE_ variables are compiled into the public JS bundle; anyone can read them. Keys belong on the server behind a proxy.

- **Evidence:** .env.example warning; gemini-client.ts

### I38 · Product — What exactly does the AI Analyst do?

**Model answer.** Ask parses English into a typed query and runs SQL; Weakness/Pressure/Feed are statistical scans; Strategy/Alt Universe/Replay/Opposition are simulations; War Room is valuation; Squad DNA is descriptive stats; an optional Gemini tab is ungrounded.

- **Evidence:** Ch.9

### I39 · Product — What would you cut if you had two weeks to launch?

**Model answer.** Keep Home, Players, Matches, Ask, Dugout; fix Scout and launch it as beta; cut Shop, auction game, Pulse emotions, Gemini tab.

- **Evidence:** Ch.24 §7

### I40 · Testing — What tests exist and what would you add first?

**Model answer.** 41 node:test tests for metrics, pipeline, scouting rules and Step 3 regressions. First additions: HTTP tests for Scout (sort direction, minBalls) and golden-number tests for Advanced Stats.

- **Evidence:** Ch.10

## Advanced (30)

### A01 · Stats — Derive the shrinkage formula used in Scout Lab and state its assumptions.

**Model answer.** Normal–normal model: the player's true index θ has prior N(100, τ²); the observed index has variance σ²/n per ball. The posterior mean is (n/σ² · x + 1/τ² · 100)/(n/σ² + 1/τ²) = (n·x + k·100)/(n + k) with k = σ²/τ². CricField fixes k = 120 instead of estimating σ² and τ² from data, so it is credibility weighting with a chosen prior strength, not fitted empirical Bayes.

- **Evidence:** scout-service.ts:96
- **Follow-ups:** How would you estimate k from the data?
- **Common misconception:** Calling k=120 'empirical'.
- **Exercise:** Estimate τ² by method of moments from rankable players' index variance minus mean sampling variance.

### A02 · Stats — Your CI is centred on the raw index but you rank by the shrunk index. Is that a problem?

**Model answer.** Yes — the interval and the headline come from different estimators; the shrunk value can sit at or outside the raw interval (Suryavanshi 137.4 vs [137.4, 157.4]). Options: show raw with CI; or compute the posterior interval for the shrunk value: mean (n·x+k·100)/(n+k), variance ≈ σ²/(n+k).

- **Evidence:** Ch.6 §1.5
- **Follow-ups:** Which would a scout understand better?

### A03 · Stats — Why might the strike-rate interval be too narrow for power hitters?

**Model answer.** It uses the league's per-ball variance; boundary hitters have higher per-ball variance than the league, so their true standard error is larger.

- **Evidence:** scout-service.ts:291-295
- **Follow-ups:** How could you get player-level variance?

### A04 · Stats — How would you prove the accuracy of your scouting model?

**Model answer.** Define the prediction target (next-season index in the same league, or performance after moving leagues), use only data available before the season, compare against baselines (raw rate, league average), report error and rank correlation with confidence intervals, and check calibration of the intervals (do 95% intervals cover ~95%?). None of this has been done yet.

- **Evidence:** Ch.6 §12
- **Follow-ups:** What would count as success?
- **Common misconception:** Using in-sample fit as proof.

### A05 · Stats — The trend test pools all earlier seasons. What can go wrong?

**Model answer.** A player who peaked years ago and declined since can look 'improving' if the latest season beats the pooled mean; seasons aren't independent; multiple metrics × competitions are tested without correction.

- **Evidence:** trends() :656-699
- **Follow-ups:** Propose a better trend model.

### A06 · Stats — Evaluate the Bonferroni approach in the Weakness Detector.

**Model answer.** It controls family-wise error but is conservative when tests are correlated (cells overlap, e.g. 'Spin' and 'Spin|Overs 7–10'), reducing power. Alternatives: Holm–Bonferroni, Benjamini–Hochberg (false discovery rate), or hierarchical/partial pooling of cell effects.

- **Evidence:** weakness-detector.ts
- **Follow-ups:** Which would you choose for a scout-facing tool?

### A07 · Stats — How would you validate the match engine's calibration properly?

**Model answer.** Fit Platt parameters on seasons ≤ 2023; evaluate on 2024–26 with Brier score, log loss and a reliability diagram; compare with a simple baseline (required-rate logistic).

- **Evidence:** match-model.ts
- **Common misconception:** In-sample calibration curves.

### A08 · Stats — Is the War Room's kNN price model overfitting or underfitting?

**Model answer.** Leave-one-out R² 0.38 and a 2.07× typical miss suggest price is weakly determined by the features; kNN with k=15 and exponential distance weights smooths heavily; the 2026 backtest (ρ 0.72 for price, n=28) suggests it captures market ranking but not value. Sensitivity (up to 39% shifts after an unrelated data fix) indicates instability near neighbour boundaries.

- **Evidence:** auction-war-room.ts; step3 risk 2
- **Follow-ups:** How would you stabilise it?

### A09 · Stats — Why is 'AVOID: 5 of 5 delivered' a red flag, and what's the caveat?

**Model answer.** The signal was contradicted every time it could be checked; but n=5 is too small to conclude much — it is a reason to validate before using signals, not proof the model is wrong.

- **Evidence:** backtest groups

### A10 · Data — Design a fix for the IPL warehouse so it is reproducible.

**Model answer.** One scripted pipeline: acquire Cricsheet (hashing like the global engine) → parse with integer over/ball parsing → store per-type extras → commentary enrichment as a separate idempotent step keyed by delivery → analytics tables → validation (reuse validate.ts checks) → artefact with a version hash. Remove random column generation; remove hand fixes.

- **Evidence:** Ch.5 §8
- **Follow-ups:** Or would you retire sqlite.db and serve IPL from global.db?

### A11 · Data — Should the IPL site read from global.db instead of sqlite.db?

**Model answer.** Arguments for: one source of truth, exact extras, validated, reproducible. Against: hundreds of queries and pages depend on sqlite.db's schema and enrichment (commentary, squads). A staged migration behind the existing service interfaces, verified with golden numbers, is the safe path.

- **Evidence:** Ch.4 §2

### A12 · Data — How would you add bowling style for non-IPL bowlers without guessing?

**Model answer.** Only from named, licensable sources linked by exact id or exact name plus corroboration (team/season), with confidence labels; conflicts recorded; unknown stays unknown and is never treated as spin.

- **Evidence:** enrichment.ts; scout-service.md
- **Follow-ups:** Which sources?

### A13 · Architecture — Redesign CricField for 10,000 daily users.

**Model answer.** CDN + cacheable responses for historical data; precomputed aggregates for Advanced Stats; heavy queries in worker threads or a separate analytics service; read replicas = copies of immutable DB files per instance; rate limiting; route-level code splitting and image optimisation; monitoring and CI. Keep SQLite until concurrency of writes or data size demands Postgres/DuckDB.

- **Evidence:** Ch.11 §6
- **Follow-ups:** What do you do first?

### A14 · Architecture — node:sqlite is synchronous. What are your options?

**Model answer.** Worker threads with a pool of read-only connections; precompute to avoid heavy queries; move to an async driver/database; cache results; set query timeouts.

- **Evidence:** Ch.11 §2.2

### A15 · Architecture — How would you deploy CricField reproducibly?

**Model answer.** Build artefact containing code + checkpointed sqlite.db + global.db + raw JSON (or remove that dependency); container image; CI builds, runs tests and typecheck, then deploys; health check and rollback.

- **Evidence:** Ch.2 §6
- **Follow-ups:** Where should the 120 MB database live?

### A16 · Architecture — Your autoscaled host runs several instances. What breaks?

**Model answer.** In-memory state diverges: the auction game, click counts and caches; each instance warms caches for 12 s; any write goes to one instance's local DB copy.

- **Evidence:** services/auction.ts:429

### A17 · Security — Threat-model the public API.

**Model answer.** Assets: server files, availability, third-party relationships, users' Gemini keys. Threats: file read via sync-csv; DoS via heavy queries and cache bypass; state tampering via auction reset; key leakage in browser; scraping ToS. Controls: remove route, rate limit, cache, auth for admin/state endpoints, server-side LLM proxy.

- **Evidence:** Ch.8 §9, Ch.11 §5

### A18 · Security — How would you fix /api/ipl/sync-csv safely if the feature is needed?

**Model answer.** Accept a dataset id, map it to a whitelisted absolute path under ipl_csv, resolve with path.resolve and verify it stays inside that directory, require admin auth, cap file size, return generic errors.

- **Evidence:** csv-sync-route.ts

### A19 · AI — How would you build a grounded LLM analyst on top of the existing code?

**Model answer.** Server endpoint; LLM receives the question and the StatQuery JSON schema and must call a function returning a StatQuery; validate with statQuerySchema; execute runStatQuery; give the LLM only the result rows to phrase an answer; verify every number in the text exists in the result; evaluate on a labelled question set.

- **Evidence:** decision.ts statQuerySchema; stats-engine.ts header
- **Follow-ups:** How do you measure success?
- **Common misconception:** RAG over match JSON as the first step.

### A20 · AI — What is wrong with the Gemini fallback, technically and ethically?

**Model answer.** It returns pre-written text with specific statistics not computed from data, labelled as model output ('Calibrated Quant Engine'). Technically: ungrounded and untestable. Ethically: it misleads users and undermines the genuine analytics.

- **Evidence:** gemini-client.ts:105-140

### A21 · Frontend — The client types drifted from the API. How do you make that impossible?

**Model answer.** Single source of truth: define response schemas in Zod (or OpenAPI) in a shared package; generate client types and use them in both server handlers and client fetchers; add a contract test in CI.

- **Evidence:** lib/api-spec, lib/api-zod exist but unused

### A22 · Frontend — How would you refactor stats.tsx (4,411 lines)?

**Model answer.** Extract data hooks (query building, fetching), presentational components per panel, and filter state into a typed reducer; delete dead code (FormGuideView); add tests per component; lazy-load heavy panels.

- **Evidence:** pages/stats.tsx

### A23 · Performance — Estimate the cost of 1-second auction polling at scale.

**Model answer.** Each open tab makes 3,600 requests/hour; 500 concurrent viewers → 1.8 M requests/hour for one shared state object. Server-sent events or WebSockets push only changes.

- **Evidence:** lib/live.ts:203

### A24 · Product — How do you prove the scouting product is valuable, not just correct?

**Model answer.** Define a job (build a shortlist of uncapped domestic players), recruit 5–10 analysts, measure time-to-shortlist and quality judged by experts vs their current method; track repeat usage; gather willingness to pay.

- **Evidence:** Ch.24 §6

### A25 · Product — Which parts did you build with AI assistance, and what could you rebuild without Claude Code?

**Model answer.** Implementation was largely AI-assisted. I could rebuild (state honestly after practising): the SQL metrics, a Zod-validated endpoint, a React Query table, the shrinkage/Wilson calculations and the ETL design. I could not yet rebuild the match engine or War Room unaided.

- **Evidence:** Ch.26
- **Follow-ups:** Prove it — here's a laptop.
- **Common misconception:** Over-claiming; or under-claiming the real decisions you made.

### A26 · Debugging — Four Step-3 regression tests now fail. How do you proceed?

**Model answer.** Reproduce each; classify diffs as expected (caused by the 2026-10-11 sequencing fix) or unexpected (e.g., isIndian/team fields changing); fix unexpected ones; regenerate the baseline only with a written explanation; re-run the identity audit and fix the 20 empty pages.

- **Evidence:** Ch.10 §2.1
- **Common misconception:** Just updating the baseline.

### A27 · Debugging — A 17-second query became 1 second. What happened?

**Model answer.** A LEFT JOIN with an extra predicate on player_out_id caused SQLite to probe the per-player index for every delivery; joining on delivery_id only and filtering in CASE let it use the delivery index.

- **Evidence:** project notes (Ch.10 B11)
- **Follow-ups:** How would you have found it?

### A28 · Data — How would you model league strength from players who moved between leagues?

**Model answer.** For players with balls in two leagues in adjacent seasons, compare their indices (or rates) to estimate pairwise league offsets; fit a mixed model with player and league effects; account for selection bias (only good players move) and age; validate on held-out movers.

- **Evidence:** Ch.6 §1.3 limitation

### A29 · Testing — Design the minimum CI pipeline for this repo.

**Model answer.** On every PR: pnpm install (frozen), typecheck all packages, test:global, test:step3 on a fixture DB, supertest API tests, build both apps; block merge on failure; nightly global:validate.

- **Evidence:** Ch.10 §7

### A30 · Ethics — A franchise asks to use War Room signals in a real auction. What do you say?

**Model answer.** Share the backtest honestly (ρ 0.17 for performance on n=9; AVOID contradicted), present it as a market-price lens and an explanation tool, not a recommendation engine, and propose a validation study first.

- **Evidence:** Ch.6 §10.1

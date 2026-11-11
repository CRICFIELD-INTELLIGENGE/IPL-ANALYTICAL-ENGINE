# 19 — Technical Glossary

Terms are defined as they are used **in CricField**, with the file where you meet them.

## Cricket and cricket data

| Term | Meaning |
|---|---|
| Delivery / ball | one bowling action; one row in `deliveries` |
| Legal ball | a delivery that is neither a wide nor a no-ball; counts toward the over |
| Ball faced | every delivery except a wide (no-balls are faced) |
| Wide / no-ball | illegal deliveries; wide runs and the no-ball penalty are charged to the bowler |
| Bye / leg-bye | runs taken when the ball misses the bat (bye) or deflects off the batter’s body (leg-bye); **not** charged to the bowler; counts as a batting dot |
| Penalty runs | awarded by umpires; not charged to the bowler |
| `non_boundary` | Cricsheet flag: 4 or 6 runs were *run*, not a boundary |
| Runs conceded | bat runs + wide runs + no-ball penalty (`RUNS_CONCEDED_SQL`) |
| Strike rate (batting) | 100 × runs ÷ balls faced |
| Economy | 6 × runs conceded ÷ legal balls |
| Bowling strike rate | legal balls ÷ wickets |
| Dot ball | batting: faced ball with 0 bat runs; bowling: legal ball with 0 runs conceded |
| Phases | powerplay overs 1–6, middle 7–15, death 16–20 |
| Super over | one-over tie-breaker; excluded from career stats |
| DLS | rain-rule method that revises targets; targets read from raw files |
| Retired out / retired hurt | retired out is a dismissal (not a bowler’s wicket); retired hurt is not a dismissal |
| Cricsheet | open ball-by-ball cricket data source (ODC-BY) |
| Registry id | Cricsheet’s stable 8-hex person id (`players.cricsheet_id`) |
| SMAT, BBL, SA20, CPL, ILT20 | Syed Mushtaq Ali Trophy (India), Big Bash (Australia), SA20 (South Africa), Caribbean Premier League, International League T20 (UAE) |
| Capped / uncapped | whether a player has played international cricket (IPL auction category) |

## Statistics and modelling

| Term | Meaning in CricField |
|---|---|
| League rate / baseline | league total ÷ league balls for a competition, season and phase |
| Expected count | player’s balls × league rate, summed over seasons |
| Index | 100 × actual ÷ expected; 100 = league average |
| Shrinkage | pulling an estimate toward the league mean in proportion to sample size: (n·x + k·100)/(n + k), k = 120 |
| Credibility weight | n/(n + k): the share of the estimate from the player’s own data |
| Empirical Bayes | shrinkage where the prior is estimated from data — CricField fixes k instead |
| Confidence interval (95%) | frequentist range that would contain the true value in 95% of repeated samples |
| Credible interval | Bayesian posterior interval — **not** what CricField computes |
| Wilson score interval | CI for a proportion that behaves well for small n |
| Normal approximation | CI = estimate ± 1.96 × SE |
| Standard error | standard deviation of an estimate’s sampling distribution |
| Percentile (mid-rank) | position in the sorted population, ties share the average rank, 100 = best |
| Sample tier | rankable ≥ 120 balls, low 60–119, insufficient < 60 |
| z-test | (difference of means) ÷ standard error |
| Bonferroni correction | multiply p-values by the number of tests to control false positives |
| False discovery rate | alternative error control (Benjamini–Hochberg) |
| Monte Carlo | estimating outcomes by simulating many random innings |
| Seed | fixed random start so simulations are reproducible |
| Dynamic programming (win probability) | exact recursion over (balls left, runs needed, wickets lost) |
| Calibration | predicted probabilities match observed frequencies |
| Platt scaling | logistic re-mapping of raw probabilities |
| Brier score | mean squared error of probability forecasts |
| Impact | runs per match above an average player (impact model) |
| IAR | impact above replacement (20th-percentile regular) |
| kNN regression | prediction = weighted average of the k most similar past examples |
| Leave-one-out (LOO) | evaluate each example with a model trained on all the others |
| Backtest | evaluate a method on a past period using only data available then |
| Look-ahead / leakage | accidentally using future data in a backtest |
| Spearman correlation | correlation of ranks |
| z-score (feature) | (value − mean)/SD, used before computing similarity |
| MILP | mixed-integer linear programme (Playing XI) |

## Engineering

| Term | Meaning |
|---|---|
| Monorepo / workspace | one repository containing several packages (pnpm) |
| SPA | single-page application (React app routed in the browser) |
| React Query / query key | server-state cache; the key identifies the cached response |
| `staleTime` | how long cached data is considered fresh |
| Middleware | functions that run on every request before route handlers (Express) |
| Zod / schema | runtime validation + inferred TypeScript types |
| Prepared statement | SQL with `?` placeholders; values bound separately (prevents injection) |
| WAL | SQLite write-ahead log (`sqlite.db-wal`) |
| `WITHOUT ROWID` | SQLite table clustered by its primary key |
| Index / EXPLAIN QUERY PLAN | lookup structure / SQLite’s description of how it will run a query |
| ETL | extract, transform, load |
| Idempotent | running twice gives the same result |
| Incremental load | only new or changed inputs are processed |
| Lineage | traceability from a number back to its source |
| Schema drift | source format changes over time |
| Event loop | Node’s single thread that runs JavaScript; blocking it delays all requests |
| Bundle / code splitting | the JS file(s) the browser downloads / splitting them per route |
| esbuild / Vite | bundlers for the API and the web app |
| CORS | browser rule controlling cross-origin requests |
| Path traversal | reading files outside an intended folder via crafted paths |
| Rate limiting | capping requests per client per time window |
| CDN | content delivery network caching responses near users |
| CI/CD | automated build/test (and deploy) on every change |
| Contract test | test that client and server agree on request/response shapes |

## Product and design

| Term | Meaning |
|---|---|
| Persona | evidence-based archetype of a user (proposed only in this handbook) |
| Job-to-be-done | the progress a user is trying to make |
| IA | information architecture: how content is organised and navigated |
| Heuristic evaluation | expert review against usability principles |
| WCAG AA | accessibility standard; e.g. 4.5:1 text contrast |
| Design token | named design value (colour, size, spacing) shared across components |
| KPI | key performance indicator |
| PRD | product requirements document |
| A/B test | randomised comparison of two variants |

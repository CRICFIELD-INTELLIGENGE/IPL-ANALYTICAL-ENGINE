# 13 — Skill Inventory and Proficiency Audit

> **The rule this chapter enforces:** *code in the repository is not evidence of personal mastery.* Much of CricField was implemented with AI coding assistance. Every skill below is therefore rated twice:
>
> - **Repository evidence** — *Implemented in repository* (code exists and runs), *Partially demonstrated* (some evidence, with gaps), or *Not demonstrated*.
> - **My demonstrated proficiency** — at most *Requires oral/practical verification*: you only earn a stronger rating by explaining or reproducing the work without AI (Chapter 16 challenges, Chapter 15 questions).
>
> The same data is in `MASTER-SKILL-INVENTORY.csv`.

## 1. Full skill matrix (45 skills)

| # | Skill | Evidence in CricField | Required knowledge | Interview difficulty | Repository evidence | My demonstrated proficiency |
|---|---|---|---|---|---|---|
| 1 | **SQL aggregation (GROUP BY, CASE, HAVING)** (Data, foundational) | Q1–Q9 in Ch.4; services/decision/stats-engine.ts; scout-service.ts | joins, grouping, conditional aggregation, NULL handling | Medium | Implemented in repository | Requires oral/practical verification |
| 2 | **Cricket scoring rules as data (legal balls, conceded runs, dismissals)** (Domain, foundational) | scripts/src/global/metrics.ts + tests; RUNS_CONCEDED_SQL (decision/db.ts:88) | wides/no-balls/byes rules, bowler wicket kinds, super overs | Medium | Implemented in repository | Requires oral/practical verification |
| 3 | **Relational modelling & keys** (Data, foundational) | sqlite.db 25 tables; global.db composite WITHOUT ROWID keys | PK/FK, grain, normalisation vs denormalisation | Medium | Implemented in repository | Requires oral/practical verification |
| 4 | **Indexing & EXPLAIN QUERY PLAN** (Data, advanced) | Ch.4 plans (871 ms scan vs 6 ms aggregate) | B-tree indexes, covering indexes, query planner | Hard | Implemented in repository | Requires oral/practical verification |
| 5 | **TypeScript fundamentals** (Engineering, foundational) | all packages; tsc --noEmit | types, unions, generics, narrowing | Medium | Implemented in repository | Requires oral/practical verification |
| 6 | **JavaScript async & event loop** (Engineering, foundational) | sync node:sqlite blocking (10 req → 24 s) | promises, single thread, blocking vs non-blocking | Medium | Implemented in repository | Requires oral/practical verification |
| 7 | **React components & hooks** (Frontend, foundational) | pages/*.tsx; useMemo/useState | state, effects, memoisation, keys | Medium | Implemented in repository | Requires oral/practical verification |
| 8 | **Server-state fetching (React Query)** (Frontend, foundational) | lib/aggregates.ts; scout-home.tsx:89-118 | query keys, staleTime, loading/error | Medium | Implemented in repository | Requires oral/practical verification |
| 9 | **REST API design with Express** (Backend, foundational) | 123 routes; routes/scout.ts | routing, middleware, status codes | Medium | Implemented in repository | Requires oral/practical verification |
| 10 | **Input validation (Zod)** (Backend, foundational) | rankingsQuerySchema, statQuerySchema | schemas, coercion, safeParse, error shapes | Easy | Implemented in repository | Requires oral/practical verification |
| 11 | **ETL design (idempotent, incremental)** (Data, advanced) | scripts/src/global/{acquire,normalize,sync}.ts | hashing, CRC, upserts, lineage | Hard | Implemented in repository | Requires oral/practical verification |
| 12 | **Data validation & quality checks** (Data, advanced) | validate.ts 118 checks; Step 3 recount | invariants, reconciliation, test oracles | Medium | Implemented in repository | Requires oral/practical verification |
| 13 | **Identity resolution (entity matching)** (Data, advanced) | global identity.ts; Step 3.5 identity audit | stable ids, review queues, false merges | Hard | Implemented in repository | Requires oral/practical verification |
| 14 | **Rates vs counts; correct aggregation** (Analytics, foundational) | stats-engine computes ratios after summing | why averaging averages is wrong | Medium | Implemented in repository | Requires oral/practical verification |
| 15 | **League/era adjustment (index = actual/expected)** (Analytics, advanced) | scout-service.ts:285-325 | expected values, baselines | Medium | Implemented in repository | Requires oral/practical verification |
| 16 | **Shrinkage / credibility weighting** (Statistics, advanced) | shrink() k=120; impact model prior | normal-normal posterior mean, bias-variance | Hard | Implemented in repository | Requires oral/practical verification |
| 17 | **Confidence intervals (Wilson, normal approx)** (Statistics, advanced) | wilsonInterval(); SR/economy CI | binomial proportion CI, standard error | Hard | Implemented in repository | Requires oral/practical verification |
| 18 | **Percentiles & ranking with ties** (Statistics, foundational) | percentileRanks() | mid-rank, direction | Easy | Implemented in repository | Requires oral/practical verification |
| 19 | **Hypothesis testing & multiple comparisons** (Statistics, advanced) | weakness-detector.ts z-test + Bonferroni | z-test, p-values, family-wise error | Hard | Implemented in repository | Requires oral/practical verification |
| 20 | **Probability calibration (Platt) & simulation** (Statistics, advanced) | match-model.ts DP + Platt + Monte Carlo | logistic regression, Monte Carlo, seeds | Hard | Implemented in repository | Requires oral/practical verification |
| 21 | **Backtesting without look-ahead** (Analytics, advanced) | auction-war-room backtest (asOf) | time-based splits, leakage, Spearman | Hard | Implemented in repository | Requires oral/practical verification |
| 22 | **k-nearest-neighbour regression** (ML, advanced) | knnDetail() k=15 | distance weighting, LOO evaluation | Medium | Implemented in repository | Requires oral/practical verification |
| 23 | **Optimisation (MILP)** (Analytics, advanced) | playing-xi.ts with javascript-lp-solver | objective, constraints, binaries | Hard | Implemented in repository | Requires oral/practical verification |
| 24 | **Similarity search (z-scores, distance)** (Analytics, advanced) | similarPlayers(); player-pool.ts | standardisation, Euclidean/cosine | Medium | Implemented in repository | Requires oral/practical verification |
| 25 | **Debugging data bugs from symptom to root cause** (Engineering, foundational) | Ch.10 B1–B12 | hypothesis, measure, isolate, verify | Medium | Implemented in repository | Requires oral/practical verification |
| 26 | **Automated testing (node:test)** (Quality, foundational) | 41 tests in scripts/src/**/tests | unit vs integration, fixtures | Medium | Partially demonstrated | Requires oral/practical verification |
| 27 | **API/HTTP and UI testing** (Quality, advanced) | none | supertest, Playwright, contract tests | Medium | Not demonstrated | Not demonstrated |
| 28 | **Web security basics (injection, path traversal, authZ)** (Security, foundational) | parameterised SQL; /sync-csv flaw | OWASP Top 10 | Medium | Partially demonstrated | Requires oral/practical verification |
| 29 | **Performance measurement & optimisation** (Engineering, advanced) | Ch.8/11 measurements; Step 3 33 MB → shards | latency, payload, caching, bundling | Medium | Partially demonstrated | Requires oral/practical verification |
| 30 | **Git & change management** (Engineering, foundational) | 19 commits, patches in docs; much uncommitted | branches, small commits, review | Easy | Partially demonstrated | Requires oral/practical verification |
| 31 | **Build tooling (Vite, esbuild, pnpm workspaces)** (DevOps, advanced) | build.mjs, vite.config.ts, pnpm-workspace.yaml | bundling, monorepos | Medium | Implemented in repository | Requires oral/practical verification |
| 32 | **Deployment & CI/CD** (DevOps, advanced) | .replit only; no CI | pipelines, environments, artefacts | Medium | Partially demonstrated | Requires oral/practical verification |
| 33 | **Tailwind/CSS layout & responsive design** (Frontend, foundational) | index.css; breakpoint classes | flex/grid, breakpoints | Easy | Partially demonstrated | Requires oral/practical verification |
| 34 | **Accessibility (WCAG)** (Design, advanced) | audit found contrast/size/zoom issues | contrast, semantics, keyboard, ARIA | Medium | Not demonstrated | Not demonstrated |
| 35 | **Visual/UI design & design systems** (Design, advanced) | distinctive theme; no tokens/Figma | type scale, colour, components | Medium | Partially demonstrated | Requires oral/practical verification |
| 36 | **UX research & usability testing** (Design, advanced) | none | interviews, synthesis, task tests | Medium | Not demonstrated | Not demonstrated |
| 37 | **Information architecture** (Design, foundational) | 14-item nav, overlapping sections | card sorting, navigation design | Medium | Partially demonstrated | Requires oral/practical verification |
| 38 | **Data visualisation design** (Design, advanced) | heatmaps, CI display, radar misuse | encoding, uncertainty display | Medium | Partially demonstrated | Requires oral/practical verification |
| 39 | **Product scoping & prioritisation** (Product, foundational) | phased plans, holds, approval gates | trade-offs, MVP, roadmaps | Medium | Partially demonstrated | Requires oral/practical verification |
| 40 | **Product metrics & experimentation** (Product, advanced) | GA4 wiring only | funnels, KPIs, A/B tests | Medium | Not demonstrated | Not demonstrated |
| 41 | **Technical writing & documentation** (Product, foundational) | docs/global-data-engine/* | clarity, audience, evidence | Easy | Implemented in repository | Requires oral/practical verification |
| 42 | **LLM integration (prompting, grounding, evaluation)** (AI, advanced) | gemini-client.ts (ungrounded), clip router | function calling, validation, evals | Hard | Partially demonstrated | Requires oral/practical verification |
| 43 | **Python data tooling (Pandas, OpenCV)** (Data, foundational) | image tooling only | dataframes, image processing | Medium | Partially demonstrated | Requires oral/practical verification |
| 44 | **Web scraping & data licensing** (Data, foundational) | cricbuzz.ts, photo scripts; licence gaps | ToS, robots, licences | Easy | Partially demonstrated | Requires oral/practical verification |
| 45 | **Monitoring & logging** (DevOps, foundational) | pino logs only | structured logs, alerts, error tracking | Easy | Partially demonstrated | Requires oral/practical verification |

## 2. The 30 most important skills to defend this project (priority order)

Foundational skills come first because every advanced claim rests on them. Learn in this order; each links to evidence you must be able to explain.

1. **SQL aggregation (GROUP BY, CASE, HAVING)** — foundational; evidence: Q1–Q9 in Ch.4; services/decision/stats-engine.ts; scout-service.ts
2. **Cricket scoring rules as data (legal balls, conceded runs, dismissals)** — foundational; evidence: scripts/src/global/metrics.ts + tests; RUNS_CONCEDED_SQL (decision/db.ts:88)
3. **Relational modelling & keys** — foundational; evidence: sqlite.db 25 tables; global.db composite WITHOUT ROWID keys
4. **TypeScript fundamentals** — foundational; evidence: all packages; tsc --noEmit
5. **React components & hooks** — foundational; evidence: pages/*.tsx; useMemo/useState
6. **REST API design with Express** — foundational; evidence: 123 routes; routes/scout.ts
7. **Data validation & quality checks** — advanced; evidence: validate.ts 118 checks; Step 3 recount
8. **ETL design (idempotent, incremental)** — advanced; evidence: scripts/src/global/{acquire,normalize,sync}.ts
9. **Indexing & EXPLAIN QUERY PLAN** — advanced; evidence: Ch.4 plans (871 ms scan vs 6 ms aggregate)
10. **JavaScript async & event loop** — foundational; evidence: sync node:sqlite blocking (10 req → 24 s)
11. **Server-state fetching (React Query)** — foundational; evidence: lib/aggregates.ts; scout-home.tsx:89-118
12. **Input validation (Zod)** — foundational; evidence: rankingsQuerySchema, statQuerySchema
13. **Identity resolution (entity matching)** — advanced; evidence: global identity.ts; Step 3.5 identity audit
14. **Rates vs counts; correct aggregation** — foundational; evidence: stats-engine computes ratios after summing
15. **League/era adjustment (index = actual/expected)** — advanced; evidence: scout-service.ts:285-325
16. **Shrinkage / credibility weighting** — advanced; evidence: shrink() k=120; impact model prior
17. **Confidence intervals (Wilson, normal approx)** — advanced; evidence: wilsonInterval(); SR/economy CI
18. **Hypothesis testing & multiple comparisons** — advanced; evidence: weakness-detector.ts z-test + Bonferroni
19. **Backtesting without look-ahead** — advanced; evidence: auction-war-room backtest (asOf)
20. **Debugging data bugs from symptom to root cause** — foundational; evidence: Ch.10 B1–B12
21. **Automated testing (node:test)** — foundational; evidence: 41 tests in scripts/src/**/tests
22. **Probability calibration (Platt) & simulation** — advanced; evidence: match-model.ts DP + Platt + Monte Carlo
23. **Web security basics (injection, path traversal, authZ)** — foundational; evidence: parameterised SQL; /sync-csv flaw
24. **Performance measurement & optimisation** — advanced; evidence: Ch.8/11 measurements; Step 3 33 MB → shards
25. **Git & change management** — foundational; evidence: 19 commits, patches in docs; much uncommitted
26. **Accessibility (WCAG)** — advanced; evidence: audit found contrast/size/zoom issues
27. **Visual/UI design & design systems** — advanced; evidence: distinctive theme; no tokens/Figma
28. **UX research & usability testing** — advanced; evidence: none
29. **Data visualisation design** — advanced; evidence: heatmaps, CI display, radar misuse
30. **Product scoping & prioritisation** — foundational; evidence: phased plans, holds, approval gates

## 3. Foundational vs advanced — what “defensible” means for each

| Level | You can defend it when you can… |
|---|---|
| **Foundational** (SQL, TypeScript, React, Express, Zod, cricket rules, rates vs counts, Git, debugging) | build a small version from a blank file in under an hour and explain every line |
| **Advanced** (shrinkage, intervals, multiple testing, calibration, backtesting, ETL design, identity resolution, indexing) | derive or justify the method, state its assumptions and failure modes, and compute one example by hand |

## 4. Skills not demonstrated at all

API/HTTP and UI testing · accessibility · UX research and usability testing · product metrics and experimentation. These are also the cheapest to add (Chapter 17).

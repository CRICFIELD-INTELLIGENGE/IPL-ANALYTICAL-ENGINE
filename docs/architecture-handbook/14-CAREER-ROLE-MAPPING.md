# 14 — Job Role Mapping (the 16 roles you listed)

> **Project relevance is not job readiness.** A role is “relevant” when CricField contains work of that kind; you are “ready” only after you can reproduce and defend that work yourself (Chapters 15–17). Interview readiness below is an estimate from the evidence, pending your own verification. The complete 25-role matrix across all career families is in Chapter 28 and `CAREER-READINESS-MATRIX.csv`.

## Summary

| Priority | Roles |
|---|---|
| **Apply now (after 2–4 weeks of verification work)** | Sports Data Analyst · Cricket Performance Analyst · Data Analyst · Analytics Engineer · Technical Product Analyst · Data Engineer |
| **Apply after one more independent project** | Product Analyst · Business Analyst · Backend Developer · Full-Stack Developer · Software Engineer · APM |
| **Longer path** | AI Engineer · Applied AI Engineer · Sports Technology Researcher · Machine Learning Engineer |

The strongest evidence in the repository is **data modelling, SQL analytics, statistical method and data-quality engineering applied to cricket**. The weakest is ML, LLM engineering, testing, accessibility and user research.

## Role-by-role

### Data Analyst

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | High |
| 2. Verified technical evidence | SQL over 295k/772k-ball warehouses; Ask engine; aggregates; validation reports |
| 3. Skills still missing | BI dashboard (Power BI/Tableau), Excel, stakeholder-facing analysis memo |
| 4. Interview topics | SQL, Excel/Sheets, a BI tool, statistics basics, communication — plus defending the CricField evidence above |
| 5. Additional independent work | Write Q1–Q9 unaided; build one Power BI/Tableau dashboard from an exported CricField table; write a 1-page insight memo |
| 6. Recommended priority | 1 — apply now |

### Analytics Engineer

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | High |
| 2. Verified technical evidence | global engine: layered model, additive aggregates, metric definitions with tests, validation gate |
| 3. Skills still missing | dbt or equivalent, warehouse (BigQuery/Snowflake/DuckDB), orchestration |
| 4. Interview topics | SQL modelling, dbt-style layering, testing, documentation — plus defending the CricField evidence above |
| 5. Additional independent work | Rebuild agg_batting in dbt+DuckDB with tests; document lineage |
| 6. Recommended priority | 1 — apply now |

### Product Analyst

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Medium |
| 2. Verified technical evidence | feature breadth; GA4 wiring; KPI thinking (Ch.24) |
| 3. Skills still missing | measured product metrics, experiments |
| 4. Interview topics | SQL, funnels, A/B testing, product sense — plus defending the CricField evidence above |
| 5. Additional independent work | Instrument 3 events in GA4; design an A/B test for Scout default sort; write the analysis plan |
| 6. Recommended priority | 2 — apply after 1 project |

### Business Analyst

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Medium |
| 2. Verified technical evidence | requirements-like plan docs; trade-off tables |
| 3. Skills still missing | stakeholder work, BRDs, process models |
| 4. Interview topics | requirements, process mapping, SQL/Excel, communication — plus defending the CricField evidence above |
| 5. Additional independent work | Write a BRD + user stories for Scout shortlists; a process map of the auction-prep workflow |
| 6. Recommended priority | 2 |

### Sports Data Analyst

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Very high |
| 2. Verified technical evidence | cricket metrics, phases, matchups, pressure, weakness scans, cross-league indices |
| 3. Skills still missing | Python/R notebooks, video/tracking data exposure, published analysis |
| 4. Interview topics | cricket knowledge, SQL/Python/R, stats, visual storytelling — plus defending the CricField evidence above |
| 5. Additional independent work | Publish 3 analytical write-ups using CricField data (with caveats); one in Python/pandas |
| 6. Recommended priority | 1 — apply now |

### Cricket Performance Analyst

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | High |
| 2. Verified technical evidence | phase/matchup analysis, weakness detector, pressure genome, opposition map |
| 3. Skills still missing | video-tagging workflow (e.g., Hudl/Dartfish), coach-facing reports |
| 4. Interview topics | cricket tactics, video analysis tools, coach communication — plus defending the CricField evidence above |
| 5. Additional independent work | Produce a 2-page opposition report for a real fixture; validate one weakness finding out-of-sample |
| 6. Recommended priority | 1 — apply now (state associations, academies, leagues) |

### Sports Technology Researcher

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Medium |
| 2. Verified technical evidence | uncertainty-aware rankings, calibration, backtesting |
| 3. Skills still missing | a formal study (hypothesis, data, evaluation) |
| 4. Interview topics | research methods, statistics, writing — plus defending the CricField evidence above |
| 5. Additional independent work | Write a short paper: does shrinkage improve next-season prediction across leagues? |
| 6. Recommended priority | 3 |

### Data Engineer

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | High |
| 2. Verified technical evidence | incremental ETL with hashing, validation, lineage, idempotency |
| 3. Skills still missing | Python pipelines, cloud, orchestration, CI |
| 4. Interview topics | Python/SQL, orchestration (Airflow), cloud warehouses, Spark basics — plus defending the CricField evidence above |
| 5. Additional independent work | Port global:acquire+normalize to Python; schedule with a cron/Airflow DAG; add CI |
| 6. Recommended priority | 1–2 |

### Backend Developer

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Medium–High |
| 2. Verified technical evidence | Express API, Zod contracts, services, perf measurements |
| 3. Skills still missing | API tests, auth, caching, async DB, the security fixes |
| 4. Interview topics | Node/Java/Go, REST, DBs, testing, security — plus defending the CricField evidence above |
| 5. Additional independent work | Build a validated, tested, rate-limited API from scratch; fix /sync-csv and scout sort with tests |
| 6. Recommended priority | 2 |

### Full-Stack Developer

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Medium–High |
| 2. Verified technical evidence | React + Express + SQLite end to end |
| 3. Skills still missing | component tests, CI/CD, auth, smaller clean codebase |
| 4. Interview topics | frontend + backend + deployment — plus defending the CricField evidence above |
| 5. Additional independent work | Build a mini-CricField (one page, one API, tests, CI) in a fresh repo without AI |
| 6. Recommended priority | 2 |

### Software Engineer (generalist)

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Medium |
| 2. Verified technical evidence | large TS codebase, debugging stories |
| 3. Skills still missing | DSA practice, code review, tests |
| 4. Interview topics | DSA, system design basics, code quality, testing — plus defending the CricField evidence above |
| 5. Additional independent work | LeetCode-style practice (arrays, hashing, sorting) + 2 system-design write-ups using CricField |
| 6. Recommended priority | 2–3 |

### AI Engineer

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Low–Medium |
| 2. Verified technical evidence | deterministic NL→query design ready for an LLM; ungrounded Gemini client |
| 3. Skills still missing | grounded LLM feature with evals |
| 4. Interview topics | LLM APIs, function calling, RAG, evaluation, guardrails — plus defending the CricField evidence above |
| 5. Additional independent work | Build server-side LLM→StatQuery with Zod validation and a 50-question eval set |
| 6. Recommended priority | 3 |

### Applied AI Engineer

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Low–Medium |
| 2. Verified technical evidence | same as above |
| 3. Skills still missing | deployed, evaluated LLM feature |
| 4. Interview topics | productionising LLM features, cost/latency control — plus defending the CricField evidence above |
| 5. Additional independent work | Same as AI Engineer + cost/latency dashboard |
| 6. Recommended priority | 3 |

### Machine Learning Engineer

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Low |
| 2. Verified technical evidence | kNN pricing, Platt calibration, backtest |
| 3. Skills still missing | a trained, evaluated model in Python; feature pipelines |
| 4. Interview topics | ML theory, Python/sklearn/PyTorch, MLOps — plus defending the CricField evidence above |
| 5. Additional independent work | Train a model predicting next-season impact; compare to shrinkage baseline with time-split CV |
| 6. Recommended priority | 4 |

### Associate Product Manager

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | Medium–High |
| 2. Verified technical evidence | scope decisions, phased plans, approval gates, honesty constraints |
| 3. Skills still missing | user research, metrics, PRDs, stakeholder evidence |
| 4. Interview topics | product sense, prioritisation, metrics, communication — plus defending the CricField evidence above |
| 5. Additional independent work | Write 2 PRDs (Scout shortlists, Ask v2) with metrics; run 10 user interviews |
| 6. Recommended priority | 2 |

### Technical Product Analyst

| Item | Assessment |
|---|---|
| 1. Relevance of CricField | High |
| 2. Verified technical evidence | deep technical + analytical artefacts; documentation |
| 3. Skills still missing | product metrics |
| 4. Interview topics | SQL, product analytics, technical communication — plus defending the CricField evidence above |
| 5. Additional independent work | Instrument events; build a KPI dashboard; write a technical spec |
| 6. Recommended priority | 1–2 |

# 17 — Personalised Learning Roadmap

> **Goal:** move from *understanding* CricField to *independently maintaining and extending* it, prioritising the skills that unlock the most entry-level roles (data/sports analyst, analytics/data engineer, technical product analyst). Effort estimates assume ~12–15 focused hours a week. Nothing here assumes you already know a topic because the repository uses it.

---

## Stage 1 — Foundations (weeks 1–4)

| Skill | What to learn | Why it matters | Where CricField uses it | Effort | Hands-on assignment | Completion criteria |
|---|---|---|---|---|---|---|
| SQL | SELECT/JOIN/GROUP BY/HAVING/CASE, subqueries, CTEs, window functions | core of every analytics role | Ch.4 Q1–Q9; `stats-engine.ts` | 15 h | C1, C2; rewrite Q1–Q9 from memory | all 9 queries reproduce the handbook numbers, unaided, in < 90 min |
| Cricket data rules | legal ball, faced ball, conceded runs, dismissals, phases | correctness of every metric | `metrics.ts`, Ch.5 §6 | 4 h | hand-score 3 overs with extras | 100% on a 10-question quiz you write from `metrics.md` |
| Statistics I | mean/variance, rates vs counts, binomial proportion, standard error, percentiles | interpreting any metric | Ch.6 §1 | 12 h | compute SR, its SE, a Wilson CI by hand for 3 players | matches `ratePlayers` output to 1 dp |
| JavaScript/TypeScript | types, unions, async/await, modules, the event loop | reading and changing the codebase | everywhere | 15 h | small CLI that reads a match JSON and prints a scorecard | runs, typed, no `any` |
| Git | branches, small commits, diffs, `git apply` | your evidence trail | 274 uncommitted paths | 4 h | commit the current work in 6–10 logical commits with messages | a history a reviewer can follow |
| Debugging | reproduce → isolate → hypothesise → verify | interview stories | Ch.10 B1–B12 | 6 h | reproduce bug B4 on a DB copy | you can explain B2 and B4 in 2 minutes each |

## Stage 2 — Data and backend (weeks 5–9)

| Skill | What to learn | Why | Where | Effort | Assignment | Done when |
|---|---|---|---|---|---|---|
| Database design | grain, keys, normalisation, indexes, EXPLAIN | warehouse work | Ch.4 | 10 h | C5 | before/after timing table with plan lines |
| ETL design | idempotency, incremental loads, hashing, validation, lineage | data engineering interviews | `scripts/src/global/*` | 15 h | C7 + a mini incremental loader for 20 matches | rerun gives identical output; a changed file is reloaded |
| Python + pandas | dataframes, groupby, merges, plotting | most analyst roles expect it | (not in CricField’s analytics) | 15 h | redo C1/C2 in pandas from the CSVs; one notebook | notebook reproduces SQL numbers |
| REST APIs | Express routing, middleware, status codes | backend roles | Ch.8 | 10 h | C3, C14 | endpoint with validation and tests |
| Testing | unit vs integration, fixtures, HTTP tests | missing from the repo | Ch.10 | 10 h | C9 + supertest tests for C3 | tests run in CI-like script |
| Security basics | OWASP Top 10, injection, path traversal, auth | release blockers | Ch.11 §5 | 6 h | C13 | written fix + test |

## Stage 3 — Frontend and product (weeks 10–13)

| Skill | What to learn | Why | Where | Effort | Assignment | Done when |
|---|---|---|---|---|---|---|
| React + React Query | components, state, effects, query keys | frontend & full-stack | Ch.7 | 15 h | C4 | filter table with loading/error/empty states |
| Data visualisation | encodings, uncertainty, colour, accessibility | analyst & design roles | Ch.23 | 8 h | C8 | dot plot with CIs reviewed by a peer |
| Accessibility | WCAG contrast, semantics, keyboard, zoom | design & frontend | Ch.20 §6 | 6 h | fix contrast/zoom in a branch; run Lighthouse/axe | report with 0 critical issues on one page |
| BI tool | Power BI or Tableau | data analyst job descriptions | — | 10 h | dashboard from exported Scout rankings | published dashboard with 3 views |
| Product thinking | personas, jobs-to-be-done, PRDs, KPIs | APM / product analyst | Ch.24 | 8 h | PRD for Scout shortlists | PRD reviewed by someone outside the project |
| User research | interview guides, synthesis | design/product roles | Ch.27 | 8 h | 5 interviews | synthesis board + 3 insights |

## Stage 4 — Advanced engineering (weeks 14–18)

| Skill | What to learn | Why | Where | Effort | Assignment | Done when |
|---|---|---|---|---|---|---|
| Shrinkage & hierarchical models | normal–normal model, empirical Bayes, estimating k | defend Scout Lab | Ch.6 §1.4 | 10 h | estimate k from data (A01 exercise) | written derivation + comparison of rankings |
| Hypothesis testing | z-tests, multiple comparisons, FDR | weakness detector | Ch.6 §7 | 8 h | rerun a weakness scan with Benjamini–Hochberg | comparison table |
| Model validation | time-based splits, leakage, calibration, Brier | any modelling claim | Ch.6 §9–10 | 12 h | holdout calibration of the win model | reliability diagram + Brier score |
| Performance & scalability | caching, workers, precomputation | system design interviews | Ch.11 | 8 h | C11 | measured speed-up |
| Deployment & CI | GitHub Actions, artefacts, environments | full-stack/data eng | Ch.2 §6 | 8 h | CI running typecheck + tests | green pipeline on a PR |
| Grounded LLM features (optional) | function calling, validation, evals | AI roles | Ch.9 §4 | 12 h | LLM → StatQuery with 50-question eval | accuracy reported honestly |

## Stage 5 — Interview readiness (weeks 19–22)

| Activity | Done when |
|---|---|
| Project defence | you can give a 3-minute and a 10-minute CricField talk covering architecture, one bug story, one limitation |
| Question bank | 80% of Chapter 15 answered aloud without notes |
| SQL interviews | 30 timed SQL problems (joins, windows, aggregation) |
| Coding | 40 easy/medium problems (arrays, hashing, sorting, two pointers) for SWE tracks |
| Architecture | whiteboard Ch.2 diagram + the 10k-user redesign in 15 min |
| Independent implementation | C1–C15 completed with scores ≥ 70% on each rubric |

---

## Weekly rhythm

- 60% building (challenges), 25% reading/learning, 15% writing (explanations in your own words — the best test of understanding).
- After each stage: record a 3-minute video explaining one thing you built *without* notes.

# 00 — Executive Overview

**CricField / Data-Insight-Engine — Engineering, Architecture, Product & Career Handbook**
Audit date: 2026-10-12/13 · Scope: the repository at `Data-Insight-Engine/` including uncommitted work · Method: source reading, read-only database queries, test and typecheck runs, live API benchmarks and browser inspection on test ports. No application code, database, configuration or asset was modified.

---

## What CricField is

An IPL-first cricket analytics product built as a pnpm monorepo:

- a **React 19 + Vite** single-page app with ≈50 pages;
- an **Express 5** API with **123 endpoints**;
- two **SQLite** warehouses — `sqlite.db` (1,243 IPL matches, 295,732 deliveries) and `global.db` (3,309 matches across IPL, SMAT, BBL, SA20, CPL and ILT20; 771,965 deliveries);
- a TypeScript **ETL** layer.

It serves fans (team HQ, player pages, scorecards, natural-language stats) and aims at franchise analysts (cross-league Scout Lab, weakness scans, simulations, auction valuation).

## The five things to know

1. **The strongest engineering is the data work.** The global engine downloads Cricsheet archives with hashing, loads incrementally, preserves unknown fields, resolves identity by registry id and gates on 118 validation checks (0 failures). Its 23 tests pass.
2. **The analytics are statistics, not machine learning.** They are league-relative indices, credibility shrinkage, Wilson and normal intervals, z-tests with Bonferroni correction, Monte Carlo with Platt calibration, kNN pricing and MILP. The “AI Analyst” is deterministic. The only LLM use is an optional, ungrounded Gemini call, and its no-key fallback shows **invented statistics**.
3. **Correctness gaps exist in shipped UI and the tests show it.**
   - Scout Lab’s default bowling ranking is inverted, unqualified players are listed, and roles always display “Unclassified”.
   - 4 of the 15 Step-3 regression tests now fail, including 20 player pages that show empty recent matches.
   - The API and web typechecks fail (2 and 11 errors).
4. **Security and scale need work before any public launch.**
   - `POST /api/ipl/sync-csv` reads arbitrary server paths, with no auth and no rate limits.
   - Synchronous SQLite serialises requests: 10 concurrent Advanced Stats queries took 24 s.
   - The JavaScript bundle is 4.1 MB.
5. **Process evidence is real but thin in git.** Plans, patches, before/after reports and approval gates are documented in `docs/global-data-engine/`. But only 19 commits exist; one checkpoint added 1.8 M lines, and 274 paths are uncommitted.

## Implementation status at a glance

| Area | Status |
|---|---|
| Global data engine + scouting maths | ✅ verified (tests, validation, worked examples) |
| IPL warehouse | 🟡 works, not reproducible from the repo; known residuals documented |
| Decision modules (Ask, Weakness, Pressure, Sims, Squad DNA, War Room, Playing XI) | ✅ run deterministically; 🟡 little validation; War Room backtest weak |
| Scout Lab UI/API | 🟡 uncommitted; three correctness defects |
| Fan surfaces (Home, Dugout, Beyond XI, Pulse, Shop) | 🟡 mostly presentational; Pulse adds random noise |
| AI / LLM | 🟠 optional Gemini; fabricated fallback |
| Tests | 🟡 41 data/logic tests; no API/UI/E2E tests; no CI |
| Deployment | Replit autoscale config; no Vercel/CI/containers; data files not packaged |

## What this means for your career

CricField is strong, directly relevant evidence for **sports data analyst, data analyst, analytics engineer, data engineer and technical product analyst** roles. That holds **once you can reproduce the core SQL, metrics, statistics and ETL design yourself** (Chapters 15–17).

It is weak evidence for ML/AI engineering, UI/UX design and user research until you build the missing artefacts (Chapters 27–28).

Use the evidence-backed resume bullets in Chapter 18 and avoid the five claims listed there as unsafe.

## How to read the handbook

Start with [AUDIT-SUMMARY.md](AUDIT-SUMMARY.md), then:

- Chapters **04 → 05 → 06** cover data and statistics.
- Chapters **02, 08, 12** cover how requests flow.
- Chapters **13–18 and 26–29** cover career preparation.

The navigation index is [README.md](README.md).

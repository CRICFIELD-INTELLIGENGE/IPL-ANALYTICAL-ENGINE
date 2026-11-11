# Audit Summary — Major Findings, Risks and Missing Knowledge

## A. Verified strengths

| # | Strength | Evidence |
|---|---|---|
| 1 | Reproducible, validated six-league warehouse (incremental, hashed, lineage, 118 checks, 0 fail) | `scripts/src/global/*`; `reports/validation-2026-10-10.md` |
| 2 | Correct, tested cricket metric definitions | `metrics.ts`, `metrics.test.ts` (pass) |
| 3 | Transparent scouting maths with uncertainty (index, shrinkage, Wilson/normal CI, tiers) | `scout-service.ts`; worked examples reproduced |
| 4 | Identity by registry id; ambiguous names never merged | `resolvePlayer("Yuvraj Singh")` → 3 candidates, no player |
| 5 | Deterministic NL querying with a validated query boundary | `nl-parser.ts`, `stats-engine.ts`; live 78 ms answer matching independent recount |
| 6 | Honest documentation of residual issues and before/after evidence | `docs/global-data-engine/step3/*` |
| 7 | Leakage-aware War Room backtest that reports its own weakness | `auction-war-room.ts` |
| 8 | Good empty/demo/error states in Decision modules | `module-shell.tsx` |

## B. Defects and risks (ranked)

| Rank | Finding | Severity | Chapter |
|---|---|---|---|
| 1 | `POST /api/ipl/sync-csv` reads arbitrary server file paths (unauthenticated) | High | 8, 11 |
| 2 | Gemini fallback shows invented statistics labelled as model output | High (trust) | 9 |
| 3 | Scout bowling default order inverted; `minBalls` not applied; role “Unclassified”; CI labels/units wrong | High (correctness) | 6, 23 |
| 4 | 4 / 15 Step-3 regression tests fail (20 empty player pages; unexplained stat diffs) | High | 10 |
| 5 | Typecheck failures (API 2, web 11) block the root build script | Medium | 10 |
| 6 | Synchronous SQLite: 10 concurrent heavy queries → 24 s; `no-store` on all responses | Medium–High (availability) | 11 |
| 7 | `global.db` + raw JSON gitignored; deploys lack data; source-run crash (`__dirname`) | Medium | 2 |
| 8 | IPL warehouse not reproducible; ingest still has the float over/ball bug and random delivery types | Medium | 5 |
| 9 | Scraped, unlicensed sources (commentary, live scores, photos, logos); affiliation-implying copy | High (legal) for any commercial use | 25 |
| 10 | Accessibility: zoom disabled, ~900 low-contrast class usages, 1,558 tiny-text usages | Medium | 20 |
| 11 | `/api/ipl/overview` mixes hardcoded literals with live counts | Low–Medium | 8 |
| 12 | Shared global auction state; 1 s polling | Medium | 8, 11 |
| 13 | `drizzle-kit push` on every Replit merge against the production DB | Medium | 5 |
| 14 | Weak git evidence (19 commits; 274 uncommitted paths) | Career risk | 1 |

## C. Validation gaps (claims you cannot yet make)

Cross-league equivalence · interval coverage · out-of-sample validity of weakness findings · holdout calibration of the win model · predictive value of War Room signals (ρ 0.17, n 9) · any usability or engagement outcome · accessibility compliance · production scalability.

## D. Missing knowledge to build (yours, not the code’s)

1. SQL for Q1–Q9 without help.
2. Cricket metric rules applied on paper.
3. Shrinkage and Wilson-interval derivations.
4. ETL design principles (idempotency, lineage).
5. React Query data flow.
6. Express + Zod endpoint design and testing.
7. Reading `EXPLAIN QUERY PLAN`.
8. Basic web security (path traversal, injection).
9. Accessibility fundamentals.
10. User-research methods.
11. Model validation (time splits, calibration).

## E. Recommended next 10 actions

1. Remove the `/sync-csv` route.
2. Fix Scout sort, `minBalls` and role display, plus the CI labels; add API tests for each.
3. Remove the Gemini fallback numbers.
4. Explain or fix the 4 failing regression tests.
5. Fix the typecheck errors.
6. Commit the uncommitted work in logical commits.
7. Make historical API responses cacheable, and precompute Advanced Stats.
8. Fix the accessibility P0s.
9. Complete Challenges C1–C5 and C10 without AI.
10. Run five user interviews for Scout Lab.

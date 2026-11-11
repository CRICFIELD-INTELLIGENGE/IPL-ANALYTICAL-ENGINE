# 18 — Resume and Career Evidence

> **Principle:** every bullet must survive the follow-up “show me” and “how do you know?”. No users, revenue, model accuracy or performance benchmarks are claimed beyond what this audit measured. Where the honest phrasing is “directed / designed with AI-assisted implementation”, say so — interviewers respect it and will test it anyway.

---

## 1. Evidence table

| # | Claim | Supporting code | Supporting tests / measurements | Defensible? | Likely interview questions | Demonstrate first |
|---|---|---|---|---|---|---|
| 1 | Built a cricket analytics web app (React, TypeScript, Express, SQLite) over 1,243 IPL matches / 295k deliveries | `artifacts/*`, `sqlite.db` | row counts (Ch.4) | ✅ with “AI-assisted implementation” | architecture walk-through; why SQLite | Ch.2 diagram from memory |
| 2 | Designed a six-league T20 data warehouse (3,309 matches, 772k deliveries) with incremental, hash-verified ingestion and 118 automated validation checks | `scripts/src/global/*` | validation report 118 pass / 0 fail; 23 tests pass | ✅ | idempotency, lineage, what a check caught | C7; explain `validate.ts` checks |
| 3 | Implemented league-adjusted player ratings with credibility shrinkage and 95% Wilson/normal confidence intervals | `scout-service.ts` | unit tests; worked example reproduced | ✅ (say “k fixed at 120, not fitted”) | derive shrinkage; interval types; cross-league validity | C10, I13–I16 |
| 4 | Identified and fixed data-quality defects: bowler economy overcharged by 7,142 runs; ball-sequence wrap on 10+ ball overs; 33 MB page payload cut to a 67 KB index + per-player shards | `decision/db.ts:77-89`; `delivery_seq`; Step 3 docs | regression reports; delivery-sequence tests | ✅ | how found, how verified, what remains (17 deliveries) | tell B2/B4 stories |
| 5 | Built deterministic natural-language querying that compiles English questions into a validated, typed query (no generated SQL) | `nl-parser.ts`, `stats-engine.ts` | live: 78 ms answer matching an independent recount | ✅ | why not an LLM; how to add one safely | demo Ask; explain StatQuery |
| 6 | Developed statistical decision tools: two-sample z-tests with Bonferroni correction, Monte Carlo match simulation with Platt-calibrated win probability, MILP Playing-XI optimiser | `weakness-detector.ts`, `match-model.ts`, `playing-xi.ts` | no automated tests; calibration in-sample | 🟡 claim the methods, not accuracy | multiple comparisons; calibration validation | A06, A07 |
| 7 | Built an auction valuation model (kNN comparable sales) with a leakage-free backtest | `auction-war-room.ts` | backtest: price ρ 0.72 (n 28); performance ρ 0.17 (n 9) | 🟡 only with the numbers | “Did it work?” — answer with the backtest | I21, A08 |
| 8 | Measured API performance and identified the synchronous-SQLite bottleneck (10 concurrent queries → 24 s) | — | this audit’s measurements | ✅ if you re-run them | caching/worker plan | re-run the measurements yourself (method in Ch.8 header: built API on a test port, cold + median-of-3 warm timings, 10/50 concurrent requests) |
| 9 | Conducted a full technical, security and accessibility audit of my own product | `docs/architecture-handbook/*` | findings with evidence | ✅ (state AI-assisted audit) | top 3 findings and fixes | AUDIT-SUMMARY in your words |
| 10 | “AI-powered cricket analyst” | Gemini client | none | ❌ do **not** use | — | build grounded LLM first |
| 11 | “Machine learning scouting model” | — | — | ❌ (it’s statistics + kNN) | — | — |
| 12 | “Supports thousands of users / production-grade” | — | measurements show the opposite | ❌ | — | — |
| 13 | “Improved engagement / users loved it” | — | no data | ❌ | — | measure first |
| 14 | “Designed the UI in Figma” | — | no Figma | ❌ | — | Ch.27 plan |
| 15 | “Identifies undervalued auction players” | — | backtest contradicts | ❌ | — | — |

## 2. Claim categories

- **Safe, evidence-backed:** 1, 2, 3, 4, 5, 8, 9.
- **Need further validation / careful wording:** 6 (methods yes, accuracy no), 7 (report the backtest).
- **Must not appear:** 10–15.

---

## 3. Three project descriptions

### A. Data Analyst / Analytics Engineer
**CricField — T20 cricket analytics warehouse & scouting engine** *(personal project; AI-assisted implementation)*
- Designed a six-league T20 warehouse from Cricsheet ball-by-ball data (3,309 matches, 772k deliveries) with incremental, hash-verified loads and 118 automated validation checks (0 failures).
- Defined cricket metrics as tested SQL/TypeScript rules (legal balls, runs conceded, phases) and built league-adjusted player ratings with shrinkage and 95% confidence intervals.
- Found and fixed data-quality defects including 7,142 bye/leg-bye runs wrongly charged to bowlers and a ball-numbering error in 10+-delivery overs, verified against a recount of raw files.

### B. Full-Stack / Backend Engineer
**CricField — cricket analytics web app** *(React 19, TypeScript, Express 5, Zod, SQLite; AI-assisted implementation)*
- Built a 123-endpoint Express API (Zod-validated contracts on the decision and scouting routes) and a React/React Query front end serving player, team, match and scouting views.
- Reduced the player page’s data payload from 33 MB to a 67 KB index plus per-player shards (median 4 KB), fixing a page crash.
- Profiled the API (synchronous SQLite blocking: 10 concurrent heavy queries → 24 s) and documented a caching/precomputation plan; audited and documented security issues for remediation.

### C. Sports Data / Product Analyst
**CricField — IPL decision-support product** *(product direction, data analysis; AI-assisted implementation)*
- Directed a cricket decision-support product for fans and franchise analysts: natural-language stats queries, opposition weakness scans with multiple-testing control, match simulations and auction valuation.
- Backtested the auction valuation against the real 2026 auction without look-ahead (price rank correlation 0.72 on 28 sales) and reported its limits (performance correlation 0.17 on 9 players).
- Scoped and gated releases: separate warehouse for new data, patch-review-before-apply, and explicit documentation of unresolved data issues.

> Adjust numbers only after re-verifying them yourself. Replace “AI-assisted implementation” with your own accurate phrasing — but keep the substance.

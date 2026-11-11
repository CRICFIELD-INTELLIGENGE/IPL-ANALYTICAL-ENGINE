# 22 — Product Design Case Studies

> **Ground rules.** No user research, interviews, usability tests or A/B tests exist for CricField, and none are invented here. “Intended audience” is inferred from the product itself (copy, features, methodology text). “Evidence of iteration” cites only commits, documents or code comments that are actually in the repository.

---

## Case study 1 — Scout Lab (global talent explorer)

| Field | Content |
|---|---|
| **User problem (inferred)** | A franchise scout wants to find T20 players outside the IPL (SMAT, BBL, SA20, CPL, ILT20) who perform well *for their context*, without being fooled by tiny samples or high-scoring eras. |
| **Intended audience** | Franchise analysts and serious fans; copy says “Global Talent Explorer”, “Deterministic cross-competition intelligence”. |
| **Key design choices** | League-relative index (100 = league average); shrinkage with a visible “shrunk vs raw” pair; sample tier badges; 95% intervals on every row; role taxonomy that describes *usage*; compare tray; role catalogue page that explains every rule. |
| **Implemented interactions** | League chips, phase, role, min-volume, sort field and order, search, pagination, compare (≤ 5), profile drill-down, role catalogue. |
| **Limitations** | Default bowling order inverted; role column blank; unqualified players listed; per-league percentiles shown in a mixed table; CI shown beside the shrunk number although it belongs to the raw index; bowling type unknown for most non-IPL bowlers; filters not in the URL; uncommitted. |
| **Evidence of iteration** | Plan → build → review gates in `docs/global-data-engine/00-audit-and-plan.md`, `01-batch-1-report.md`, `02-scout-service-and-demos.md`; Step 4 “Scout Lab UI” was **on hold** in project notes on 2026-10-10 and now exists as uncommitted code (`pages/scout-*.tsx`). Two attribute-linking methods were tried and **rejected** (initials-form names linked the wrong Kumar; duplicated bio names gave conflicting styles) — `scout-service.md` §“Two link methods were tried and rejected”. |
| **Portfolio angle** | “Designing trustworthy rankings: showing uncertainty without overwhelming the user.” Needs: the bug fixes, a before/after of the row design, and user feedback from at least 3 analysts. |

## Case study 2 — My Dugout (franchise headquarters)

| Field | Content |
|---|---|
| **User problem (inferred)** | A fan wants a home for *their* team: identity, history, current squad, stories. |
| **Audience** | Team-loyal fans. |
| **Design choices** | Team switcher re-themes the entire site via CSS variables; hero with titles, record, captain; squad views (carousel, collapsible grid, table); team stories; broadcaster links. Missing facts are shown as unknown rather than invented (`dugout-data.ts:6-9`). |
| **Interactions** | Choose team, season selector, squad view toggle, tabs (Squad, Intelligence, Articles, History, Videos). |
| **Limitations** | Large empty band on `/dugout/csk` at 1440 px; no error state if APIs fail; photos scraped from official sites (licensing). |
| **Evidence of iteration** | Commits `fe309d0` “redesign Dugout page, map with individual team profiles…”, `bae3a9c` “redesign squad placing with compact carousel, collapsible grid, table view…”, `9194613` “resolve photo mapping with multi-alias index…” (all 2026-10-09); photo pipeline scripts and validation report. |

## Case study 3 — Auction War Room

| Field | Content |
|---|---|
| **User problem (inferred)** | Before an auction, which players are worth more than the market will charge, and how much should we bid? |
| **Audience** | Franchise strategists; auction enthusiasts. |
| **Design choices** | Separate **market price** (what teams pay) from **output value** (what the player produces); explicit signals (BUY/HOLD/AVOID/SCOUT) with thresholds and a ₹1 Cr materiality rule; max bid rounded to bid increments; “fit” to a chosen franchise’s weaknesses with written reasons; a **backtest view** against the real 2026 auction; explanatory panels (“How prices and value are set”, “Reading the board”). |
| **Interactions** | View toggle (next auction / 2026 backtest), team, role, overseas, max price, signal, search, sort (edge/fit/market/impact), player detail with comparables. |
| **Limitations** | Backtest shows weak predictive validity (projection ρ = 0.17, n = 9; AVOID group 5/5 delivered); 78% of the 2026 list is SCOUT (no IPL record); thin-evidence prices (basis 0.1) not prominent; price model sensitive to unrelated data changes (up to 39% shifts). |
| **Evidence of iteration** | Project notes: a log-linear price fit was “too flat” → replaced by comparable-sales kNN; value capped at the record fee; backtests must use as-of data to avoid leakage. The file header still describes ridge regression (stale). Step 3 docs record the price shifts after the economy fix (risk 2). |

## Case study 4 — Advanced Stats

| Field | Content |
|---|---|
| **User problem (inferred)** | Answer “who was best in situation X?” — by season, team, opponent, venue, phase, over range, bowler type, delivery type, innings, match stage, nationality. |
| **Audience** | Fantasy players, journalists, analysts (“Statsguru depth” copy). |
| **Design choices** | Many dimensions of slicing; batter/bowler leaderboards with phase splits; matchup and scenario drill-downs; commentary-derived delivery types replacing earlier invented ones. |
| **Interactions** | ~15 filters (zustand store), drill tabs, matchup view, CSV export. |
| **Limitations** | 2–3 s per query; full-screen hero hides the tool; 4,411-line component; tiny labels; dead `FormGuideView` with random numbers; legacy endpoint unvalidated. |
| **Evidence of iteration** | `services/ball-commentary.ts` header documents replacing periodic fake delivery types with commentary-derived data; Step 3 economy fix changed the bowling table (Narine 6.79, Bumrah 7.34, Chahal 8.05 career economies quoted in `step3/README.md`). |

## Case study 5 — AI Analyst: Ask the database

| Field | Content |
|---|---|
| **User problem (inferred)** | Ask a cricket question in plain English and get a correct, sourced answer quickly. |
| **Audience** | Everyone; especially non-SQL users. |
| **Design choices** | Suggestions as starting points; deterministic parser; **interpretation shown as removable chips** (“READ AS”); automatic minimum-volume rule disclosed in the footer (“min 100 balls bowled”); timing shown; demo snapshot when offline, clearly labelled. |
| **Interactions** | Type/submit, click suggestion, remove/edit a chip, switch to Warehouse Summary or Gemini tab. |
| **Limitations** | Coverage limited to phrases the parser knows; the adjacent “Gemini LLM” tab returns invented text when no key is set; an ad labelled “Official Analytics Partner” sits under the answer. |
| **Evidence of iteration** | Header comments in `nl-parser.ts` and `stats-engine.ts` explain the decision to never let language generate SQL, leaving a validated boundary for a future LLM. |

---

## Cross-case lessons

1. The strongest designs in CricField share one idea: **show the system’s reasoning** (chips, intervals, tiers, methodology panels, backtests).
2. The weakest moments come from **presentation drifting from the data contract** (role object vs string, mislabelled intervals, inverted sort).
3. None of these case studies yet has *user* evidence; adding even five moderated sessions per feature would transform them into portfolio-grade work (Chapter 27).

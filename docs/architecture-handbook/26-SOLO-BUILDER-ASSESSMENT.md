# 26 — Solo Product Builder Assessment

> **Purpose:** separate what the repository proves about *you* from what it proves about the *code*. You stated that you independently directed the product vision, feature planning, visual identity, UI/UX decisions, data analysis, implementation workflow and deployment, with AI coding assistance. This chapter accepts that as your account and maps it to evidence; it does **not** infer who typed which line.

---

## 1. The end-to-end responsibilities a product like this involves

| Responsibility | Would normally belong to | Evidence it was exercised in CricField |
|---|---|---|
| Product vision & positioning | Founder / PM | hero copy, meta description, feature set, planned public features (notes) |
| Scope & prioritisation | PM | phased plans, “on hold” decisions, approval gates (Chapter 24 §3) |
| Information architecture & UX | Product designer | 50 pages, nav, flows (with clear IA problems) |
| Visual identity & UI | Visual/UI designer | consistent dark broadcast aesthetic, team theming, redesign commits |
| Data sourcing & licensing | Data engineer + legal | Cricsheet ODC-BY attribution; but scraped sources without licences |
| Data modelling & ETL | Data engineer | two warehouses; global engine with validation |
| Statistics & modelling | Analyst / data scientist | league adjustment, shrinkage, intervals, z-tests, Monte Carlo, calibration, kNN, MILP |
| Backend/API | Backend engineer | 123 endpoints, Zod contracts |
| Frontend engineering | Frontend engineer | React app, React Query data layer |
| QA & testing | QA engineer | 41 automated tests (global/scout/step3), regression reports; no UI/API tests |
| Security | Security engineer | parameterised SQL; but a file-read route and no auth |
| DevOps & deployment | DevOps | Replit autoscale config, esbuild/Vite builds; no CI |
| Documentation | Tech writer | `docs/global-data-engine/*` — the best artefacts in the repo |
| Growth & monetisation | Growth / BD | AdSense/GA4 wiring, consent banner; no measured growth |

---

## 2. Your documented decisions and contributions (evidence-based)

| Decision / contribution | Evidence |
|---|---|
| Chose to build on the existing Express + SQLite stack instead of a Next.js + FastAPI + DuckDB rewrite | project notes 2026-10-07 |
| Required site changes to be **presented before applying** (patches, isolated copies, regression results) | `step3/README.md`, `*.patch`, isolated-testing notes |
| Gated every commit and deploy personally | project notes (“the user gates every commit and deploy”) |
| Insisted the economy issue never be called “completely resolved” | project notes; `economy-residuals.md` |
| Put Scout Lab UI, franchise-fit and Batch 2 on hold until data reliability improved | project notes 2026-10-10 |
| Selected the competitions and phased data acquisition | `00-audit-and-plan.md` “Decisions needed”; `sources.json` enabled flags |
| Directed redesigns (Dugout, Beyond XI, squad views, photo registry) | commit messages 2026-10-09 |
| Chose team-themed visual identity and fan/analyst dual audience | product itself |
| Commissioned photo sourcing and quality review (contact sheets, verification reports) | `public/contact-sheet-rcb-*.html`, `ipl-jersey-verification-report.md` |

---

## 3. Work implemented with AI coding assistance

Signals in the repository: Replit Agent commits and `.agents/` / `.local/secondary_skills/` folders; `.claude`, `.kilo`, `.qodo`, `.sixth` tool folders; AI-session project notes describing modules being built (“Decision OS slices”, “global data engine”), and very uniform explanatory code commentary. **Assume an interviewer will treat all implementation as AI-assisted unless you can reproduce it.**

---

## 4. Skills demonstrated by repository evidence vs. needing practical verification

| Skill | Repository shows the *artifact* | You must still demonstrate |
|---|---|---|
| Product direction & scoping | ✅ decisions and gates are documented | explain trade-offs live; write a one-page PRD unaided |
| Cricket domain modelling | ✅ correct rules in `metrics.ts` | state and apply the rules (legal ball, conceded runs) on paper |
| SQL analytics | ✅ many queries | write Q1–Q9 (Chapter 4) without help |
| Statistics | ✅ shrinkage, Wilson, z-tests, calibration | derive the shrinkage formula; compute a Wilson interval by hand |
| Data pipeline design | ✅ global engine | design an idempotent incremental loader on a whiteboard |
| React/TypeScript | ✅ large app | build a small filterable table with React Query from scratch |
| API design | ✅ Zod contracts | build a validated Express endpoint + test |
| UI/visual design | ✅ distinctive look | produce Figma components, a type scale, an accessible palette |
| UX research | ❌ no evidence | run and synthesise 5 interviews |
| Testing discipline | 🟡 data tests only | write API and component tests |
| Security | 🟡 | spot and fix the file-read route |
| DevOps | 🟡 | set up CI and a reproducible deploy |

---

## 5. Work that would ordinarily belong to specialists (and where the gaps show)

| Specialist area | Gap visible in this audit |
|---|---|
| QA | inverted bowling sort and role display shipped to the UI unnoticed |
| Security | unauthenticated file read; shared auction state |
| Accessibility | contrast, text size, zoom disabled |
| Legal/licensing | scraped media and affiliation-implying copy |
| Data engineering (legacy) | non-reproducible IPL warehouse |

This is normal for a solo builder. The honest narrative is: *“I directed a broad product alone with AI assistance; I then audited it, found X, Y, Z, and here is how I fixed/would fix them.”* That narrative is stronger than claiming everything works.

---

## 6. Self-assessment questions to answer in writing (no AI)

1. Which three decisions am I proudest of, and what alternatives did I reject?
2. Which bug in Chapter 10 can I explain from symptom to fix in two minutes?
3. Which module could I rebuild in a weekend with no AI? Which could I not?
4. What would I cut if I had to ship in two weeks?

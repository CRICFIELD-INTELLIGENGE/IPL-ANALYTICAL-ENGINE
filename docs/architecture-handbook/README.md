# CricField Handbook — Navigation

A reverse-engineered engineering, architecture, product and career handbook for the CricField / Data-Insight-Engine repository. Audit date 2026-10-12/13. Every claim is grounded in repository files, read-only database queries or commands run during the audit; proposals are labelled as proposals.

**Start here:** [00 Executive Overview](00-EXECUTIVE-OVERVIEW.md) → [Audit Summary](AUDIT-SUMMARY.md)

## Part I — Engineering

| # | Chapter | What you get |
|---|---|---|
| 01 | [Repository Audit](01-REPOSITORY-AUDIT.md) | inventory, verified stack, status labels, defects, checks run |
| 02 | [System Architecture](02-SYSTEM-ARCHITECTURE.md) | style, layers, boundaries, one request traced end to end |
| 03 | [Technology Stack](03-TECHNOLOGY-STACK.md) | every technology actually used; what not to claim |
| 04 | [Database Engineering](04-DATABASE-ENGINEERING.md) | both warehouses, data dictionary, 9 SQL queries with plans and timings |
| 05 | [Data Pipelines](05-DATA-PIPELINES.md) | sources, licences, ETL flows, identity, extras rules, lineage |
| 06 | [Scouting & Statistics](06-SCOUTING-STATISTICS.md) | every formula with real worked examples; War Room backtest |
| 07 | [Frontend Engineering](07-FRONTEND-ENGINEERING.md) | shell, data layer, page-by-page status |
| 08 | [API Engineering](08-API-ENGINEERING.md) | 123 endpoints, validation, measured latency, security findings |
| 09 | [AI Engineering Audit](09-AI-ENGINEERING-AUDIT.md) | what is (and isn’t) AI |
| 10 | [Testing & Debugging](10-TESTING-AND-DEBUGGING.md) | test results, bug stories, release blockers |
| 11 | [Performance & Security](11-PERFORMANCE-SECURITY.md) | load model, measurements, findings, proposals |
| 12 | [Feature Walkthroughs](12-FEATURE-WALKTHROUGHS.md) | 12 end-to-end traces |

## Part II — Design & product

| # | Chapter |
|---|---|
| 20 | [UI Design Audit](20-UI-DESIGN-AUDIT.md) |
| 21 | [UX Engineering](21-UX-ENGINEERING.md) |
| 22 | [Product Design Case Studies](22-PRODUCT-DESIGN-CASE-STUDIES.md) |
| 23 | [Data Visualisation Design](23-DATA-VISUALIZATION-DESIGN.md) |
| 24 | [Product Management](24-PRODUCT-MANAGEMENT.md) |
| 25 | [Business & Growth Strategy](25-BUSINESS-GROWTH-STRATEGY.md) |
| 26 | [Solo Product Builder Assessment](26-SOLO-BUILDER-ASSESSMENT.md) |
| 27 | [Design Portfolio Readiness](27-DESIGN-PORTFOLIO-READINESS.md) |

## Part III — Career & learning

| # | Chapter |
|---|---|
| 13 | [Skill Matrix](13-SKILL-MATRIX.md) |
| 14 | [Career Role Mapping (16 roles)](14-CAREER-ROLE-MAPPING.md) |
| 28 | [Complete Career Role Matrix (25 roles)](28-COMPLETE-CAREER-ROLE-MATRIX.md) |
| 15 | [Interview Question Bank (100)](15-INTERVIEW-QUESTION-BANK.md) |
| 29 | [Interview & Practical Design Challenges](29-INTERVIEW-AND-DESIGN-CHALLENGES.md) |
| 16 | [Independent Engineering Challenges (15 + answer key)](16-INDEPENDENT-CHALLENGES.md) |
| 17 | [Learning Roadmap](17-LEARNING-ROADMAP.md) |
| 18 | [Resume Evidence](18-RESUME-EVIDENCE.md) |
| 19 | [Technical Glossary](19-TECHNICAL-GLOSSARY.md) |

## Companion files

| File | Content |
|---|---|
| [ARCHITECTURE-DIAGRAMS.md](ARCHITECTURE-DIAGRAMS.md) | the 10 Mermaid diagrams with explanations |
| [AUDIT-SUMMARY.md](AUDIT-SUMMARY.md) | findings, risks, missing knowledge, next actions |
| [MASTER-SKILL-INVENTORY.csv](MASTER-SKILL-INVENTORY.csv) | 45 skills × evidence × proficiency |
| [CAREER-READINESS-MATRIX.csv](CAREER-READINESS-MATRIX.csv) | 25 roles × readiness |
| [INTERVIEW-QUESTIONS.csv](INTERVIEW-QUESTIONS.csv) | 100 questions with answers |
| `CricField-Handbook.pdf` | consolidated print edition (if generated) |

## Evidence labels

✅ verified · 🟡 partial · 🟠 mocked/hardcoded · ⚪ planned · 🔴 defect · ❔ unverified

## Reproducing the audit’s checks (safe, read-only)

```bash
pnpm --filter @workspace/scripts run test:global
```
```bash
pnpm --filter @workspace/api-server run typecheck
```
```bash
pnpm --filter @workspace/ipl-analytics run typecheck
```
Database queries: open `sqlite.db` / `global.db` with `new DatabaseSync(path, { readOnly: true })`, or work on a copy (copy the `-wal` file too).

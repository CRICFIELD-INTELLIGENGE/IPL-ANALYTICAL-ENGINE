# 24 — Product Management

> **Separation of fact and proposal.** §1–§4 describe what the repository shows. §5–§7 are *proposals* (personas, KPIs, roadmap) and are labelled as such. **No product metrics (users, retention, engagement, revenue) exist in the repository.** GA4 is wired in, but no analytics data is stored or reported here.

---

## 1. Product vision (as expressed in the product)

| Source | Statement |
|---|---|
| Home hero | “IPL is not just about cricket.” “Data-driven insights across sports, business, fans and the IPL economy.” |
| `index.html` meta | “IPL Decision Intelligence OS: Live Strategy Simulator, Alternate Universe Engine, Opposition Exploit Map, Captain’s Decision Replay, Auction War Room, and 280,000+ ball-by-ball deliveries.” |
| Scout Lab | “Deterministic cross-competition intelligence … normalized against match, season, and phase baselines.” |
| Project notes (2026-10-10) | Planned first public features: **Global Player Search, Role-Based Comparisons, Franchise Scouting Shortlists**; data reliability before more UI. |

**Synthesis:** an IPL-first analytics product that serves fans (Dugout, Beyond XI, Pulse) and aspires to serve professional decision-makers (Scout Lab, War Room, Decision OS). The tension between these two audiences is the central product question (§4).

---

## 2. Feature inventory by maturity

| Tier | Features |
|---|---|
| **Core & credible** | Ask the database; Scout Lab ratings engine (after bug fixes); Weakness Detector; Pressure Genome; scorecards; player pages; global data engine |
| **Promising, needs validation** | War Room (weak backtest); Strategy Sim / Alt Universe / Decision Replay (calibration in-sample); Playing XI optimiser; Squad DNA |
| **Engagement / content** | Dugout, Beyond XI (fan arena), Pulse, Insights, 2027 Intel, Visualisations, auction game |
| **Presentational / placeholder** | Shop (no commerce), AI mascot claims, Gemini fallback, photo-pipeline admin (internal) |

Breadth is very high for one builder: ~50 pages, 123 endpoints, 11 decision modules. **Depth and correctness lag breadth** (Chapters 6, 10).

---

## 3. Documented scope and prioritisation decisions (evidence)

| Decision | Evidence | PM reading |
|---|---|---|
| Build the global engine as a **separate warehouse** rather than altering the live IPL DB | `00-audit-and-plan.md §3.1`, “Decisions needed” #2 | risk isolation over convenience |
| Download scope phased (P1 six leagues first; P2 later) | “Decisions needed” #1; Batch 2 `enabled: false` in `sources.json` | incremental delivery |
| Storage options compared (zips, SQLite, Parquet/DuckDB, Postgres) with explicit “not now” | `00-audit-and-plan.md §3.2` | explicit trade-offs |
| Every site change “presented before applying”; patches + regression reports | `step3/README.md`, `*.patch` | change control |
| “Never describe the economy problem as completely resolved” | project notes; `economy-residuals.md` | honesty in communication |
| Scout Lab UI, franchise-fit, Batch 2 **on hold** pending data reliability | project notes 2026-10-10 | sequencing data quality before features |
| Franchise recommendations **not exposed** “until squad eligibility & valuations verified” | `routes/scout.ts` header | responsible scope |
| Build on existing Express + SQLite rather than a suggested Next.js + FastAPI + DuckDB stack | project notes 2026-10-07 | avoid a rewrite |
| Delete fabricated modules (`simulation-models.ts`), replace fake win probability and fake squads | Chapter 10 B6, B7, B12 | quality over appearance |

These are real product-management behaviours. They are documented largely in AI-session notes and plan documents; in an interview, present them as *decisions you made and why*, and be ready to explain each trade-off without notes.

---

## 4. Technical trade-offs that shaped the product

| Trade-off | Choice | Cost |
|---|---|---|
| Speed of building vs correctness | many features quickly | correctness debt found in this audit |
| Static JSON vs API | static for fan pages (fast, cacheable) | stale until regenerated; 62 MB in `public/data` |
| Deterministic analytics vs LLM | deterministic core | the “AI” label over-promises |
| SQLite simplicity vs concurrency | SQLite | 24 s under 10 concurrent heavy queries |
| Fan delight vs analyst clarity | visual-heavy, dense micro-labels | accessibility and comprehension costs |

---

## 5. Personas (proposed — not researched)

| Persona | Goal | Top tasks | Current fit |
|---|---|---|---|
| **Fan “Aarav”, 22** | follow his team, settle debates | team page, player page, ask a question | Dugout + Ask good; nav confusing |
| **Fantasy player “Neha”, 28** | pick a matchup edge before a deadline | venue/phase filters, batter vs bowler | Advanced Stats powerful but slow |
| **Franchise analyst “Rahul”, 34** | build a shortlist of uncapped domestic talent | cross-league ranking, comparisons, evidence | Scout Lab closest; correctness bugs block trust |
| **Journalist “Meera”, 40** | quick, citable numbers | Ask, records, methodology | Ask + Data Sources good |

Validate with 5 interviews per persona before using them in a portfolio.

---

## 6. Success metrics (proposed KPIs — none measured today)

| Area | KPI | How to instrument |
|---|---|---|
| Activation | % of new visitors who complete one analytical task (filter, ask, compare) in the first session | GA4 events on submit/compare |
| Engagement | weekly returning users; questions asked per user | GA4 |
| Quality | % of Ask questions understood; error rate per endpoint; p95 latency | API logs |
| Trust | % of sessions that open Methodology/Data Sources; correction reports | events + contact form |
| Scout value (B2B) | shortlists exported; analyst-reported usefulness (1–5) | interviews, export events |
| Model validity | War Room projection ρ by season; calibration Brier score | backtest scripts |

---

## 7. Roadmap (proposed)

| Horizon | Theme | Items |
|---|---|---|
| **Now (2–4 weeks)** | Trust & safety | remove `/sync-csv`; fix Scout sort/minBalls/role; remove Gemini fallback numbers; fix failing tests and typecheck; commit work in logical commits |
| **Next (1–2 months)** | Focus | one product name; nav ≤ 6 items; global search; mobile pass; accessibility P0s; API caching; Advanced Stats aggregates |
| **Later (quarter)** | Validation | 15 user interviews; War Room/weakness out-of-sample studies; league-strength model using players who moved between leagues; Batch 2 leagues |
| **Not now** | | shop/commerce, real-time multiplayer auction, LLM chat without grounding |

---

## 8. Release strategy (proposed)

1. Private beta of Scout Lab to 5–10 analysts/coaches with a feedback form.
2. Public “fan” release limited to Home, Dugout, Players, Matches, Ask — the most correct, least risky surfaces.
3. Every release gated by: typecheck, tests, the Step-3 regression suite (rebaselined with an explained diff), and a security checklist.

---

## 9. Product risks

| Risk | Likelihood | Impact |
|---|---|---|
| Wrong numbers damage credibility (inverted rankings, fabricated fallback text) | High today | High |
| Licensing/trademark complaints (scraped photos, logos, “official partner” wording) | Medium | High |
| Live data source blocks scraping | Medium | Medium |
| Scope sprawl prevents depth | High | Medium |
| Performance collapse under traffic spikes | Medium | High |

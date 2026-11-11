# 29 — Interview and Practical Design Challenges

> Complements Chapter 16 (engineering challenges) with design, product, analytics and mixed take-home tasks of the kind used in UI/UX, product, analyst and engineering interviews. **Do them without AI generation.** Each has a time box, deliverable and rubric. Choosing a design direction is not the same as executing it in Figma — several tasks exist precisely to build that missing evidence.

---

| # | Type | Challenge | Time | Deliverable | Rubric (score 1–5 each) |
|---|---|---|---|---|---|
| D1 | UI critique | Critique the Scout Lab leaderboard (desktop + 375 px) in 10 minutes aloud, then in writing | 30 min | 1-page critique with 5 issues ranked by severity and a fix for each | issue quality · prioritisation · evidence (screens, contrast numbers) · actionable fixes |
| D2 | Figma component design | Build a “player rating row” component in Figma with variants: tier (rankable/low/insufficient), discipline (bat/bowl), states (default/hover/selected), mobile/desktop | 3 h | Figma file with auto-layout, variants, tokens | component structure · variant logic · tokens used · accessibility (contrast ≥ 4.5:1, ≥ 12 px) |
| D3 | Responsive redesign | Redesign `/stats` for 375 px: filters in a sheet, first table above the fold, card layout for rows | 3 h | wireframes (low-fi) + one high-fi screen | task-first layout · progressive disclosure · touch targets ≥ 44 px · realistic content |
| D4 | UX case-study presentation | Present the Scout Lab case study in 8 minutes (Ch.22/27 structure) | 2 h prep | 8–10 slides | problem clarity · honesty about evidence · iteration story · outcome & next steps |
| D5 | User-flow mapping | Map “scout finds an uncapped death bowler under ₹2 Cr” across Scout → profile → compare → War Room, marking pain points | 1 h | flow diagram + pain-point list | completeness · pain points tied to evidence · proposed changes |
| D6 | Product prioritisation | You have 4 weeks. Prioritise 12 items from Chapters 10–11, 21 and 24 with RICE or MoSCoW; justify the top 3 | 1 h | table + 1-page rationale | framework applied correctly · trade-offs explicit · risk awareness |
| D7 | Metric design | Define activation, engagement and trust KPIs for Ask; specify GA4 events and a dashboard | 1 h | event spec + mock dashboard | metric definitions · instrumentability · guardrails |
| D8 | Experiment design | Design an A/B test: default Scout sort by percentile vs by shrunk index | 45 min | hypothesis, primary metric, sample-size reasoning, risks | hypothesis quality · metric choice · stats reasoning · ethics |
| D9 | SQL (timed) | Write C1, C2 and a head-to-head query in 30 minutes | 30 min | SQL file + results | correctness · edge cases (wides, super overs, renames) · readability |
| D10 | API debugging | Given `curl /api/scout/rankings?discipline=bowling` output, explain why rank 1 has percentile 0 and fix it | 30 min | explanation + diff + test | root cause · minimal fix · test |
| D11 | Statistics | Explain to a coach why a 192 SR in 27 balls ranks below 205 in 275 balls; then compute both shrunk indices | 20 min | 1-paragraph explanation + numbers | plain language · correct maths · uncertainty framing |
| D12 | Engineering design | Whiteboard: make Scout Lab serve 1,000 concurrent users | 30 min | diagram + bottleneck list | correct bottleneck (sync SQLite) · caching/CDN · precompute · measurement plan |
| D13 | Accessibility audit | Run axe/Lighthouse on `/ai-analyst/ask`; fix the top 3 issues in a branch | 2 h | report + diff | issues found · fixes correct · before/after scores |
| D14 | Data storytelling | One-page brief: “Is death bowling getting more expensive?” using `competition_baselines` | 1.5 h | 1 chart + 150 words | chart choice · correct numbers · caveats |
| D15 | Ethics & honesty | Rewrite the Gemini fallback and the “Official Analytics Partner” label so nothing misleads | 30 min | copy + UI sketch | clarity · honesty · user trust |

### Model notes (read after attempting)

- **D10:** default `sortBy=shrunk, sortOrder=desc` sorts by `metrics.economy.shrunk` descending; higher economy index = more runs conceded; percentile is direction-aware, so the worst bowler (percentile 0) is first. Fix: use each metric’s `better` direction (`metricDefs`) or sort by percentile; add a test asserting rank 1 has the highest economy percentile.
- **D11:** (27 × 123.2 + 12,000)/147 = 104.3 vs (275 × 130.95 + 12,000)/395 = 121.5. Plain language: “With 27 balls we’ve barely seen him; most of the estimate is the league average. With 275 balls, his own record dominates.”
- **D12:** the API is CPU-bound on a single thread with synchronous SQLite; rankings change only when the warehouse is rebuilt → cache the JSON (in memory + CDN) keyed by the query string, precompute default views at build time, add instances behind a load balancer, rate-limit, and measure with a load test before and after.
- **D14 (data):** IPL death-overs run rate in `competition_baselines`: 2024 = 11.21 runs per over; extend to all seasons and compare with the powerplay/middle trend before concluding.

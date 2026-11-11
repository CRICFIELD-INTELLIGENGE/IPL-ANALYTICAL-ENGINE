# 25 — Business and Growth Strategy

> **No traction, revenue, customers or partnerships exist in the repository, and none are claimed here.** AdSense and GA4 integrations exist in code (env-gated); whether they are live is **unverified**. Everything below is analysis and hypothesis.

---

## 1. Positioning

| Segment | Offer CricField could make | Existing alternatives |
|---|---|---|
| **B2C fans** | team HQ, player pages, natural-language stats, explainers | ESPNcricinfo Statsguru, Cricbuzz, official IPL app, fantasy apps |
| **B2C fantasy players** | matchup/phase/venue filters, weakness scans | fantasy-tool subscriptions, Twitter analysts |
| **B2B franchises / scouts** | cross-league talent discovery with uncertainty; auction valuation | in-house analytics teams, CricViz, commercial data vendors |
| **B2B media** | embeddable “Ask” answers and insight cards | agency research desks |

**Differentiator (defensible):** transparency — league-relative indices with sample sizes and intervals, published methodology, published backtests, identity rules that never merge players by name. **Not a differentiator:** visuals or “AI” branding.

---

## 2. Distribution hypotheses

| Channel | Hypothesis | Cheapest test |
|---|---|---|
| Social (X/Instagram/LinkedIn) | daily Insight Feed cards travel during the IPL | post 20 cards; measure click-through to site |
| SEO | player/venue pages capture “X stats” searches | requires server-side rendering or prerendering; today the SPA is client-rendered |
| Newsletter/Substack | weekly scouting notes (a `substack/` folder exists with images) | 4 issues, track subscribers |
| Direct B2B outreach | scouts value cross-league shortlists | 10 conversations with coaches/analysts (state associations, T20 franchises) |

---

## 3. Monetisation hypotheses (untested)

| Model | Fit | Risk |
|---|---|---|
| Display ads (AdSense wired) | B2C volume needed; IPL seasonal | low CPMs; ad labelled “Official Analytics Partner” misleads |
| Freemium pro tier (export, saved shortlists, API) | analysts/fantasy | needs auth, billing, reliability |
| B2B scouting reports / licences | franchises, academies | data licensing, validation burden, sales cycle |
| Sponsored content | media | brand-safety and IPL marks |

---

## 4. Licensing and legal risks (must resolve before any commercial use)

| Asset | Status | Risk |
|---|---|---|
| Cricsheet data | ODC-BY — commercial use allowed with attribution | low ✅ |
| Wikipedia-compiled auction/season facts | CC BY-SA 4.0 — share-alike | must license derived data the same way |
| ESPN commentary text | scraped; no licence | high |
| Cricbuzz live data | scraped with spoofed UA | high |
| Player photos from official/franchise sites | copyrighted | high |
| IPL, franchise and JioHotstar marks/logos; “Official Broadcast”/“Official Analytics Partner” wording | trademark / passing-off | high — the site does include a non-affiliation disclaimer in `broadcaster-registry.ts`, but other copy contradicts it |
| Player likeness for commercial products (Shop) | personality rights | high |

---

## 5. Customer-discovery gaps

- No interviews with fans, fantasy players, scouts or franchise staff.
- No evidence that scouts want cross-league indices in this form, nor what price they would pay.
- No measure of which features fans use.
- No competitive teardown in the repository.

**First discovery sprint (proposal):** 5 fan interviews, 5 fantasy players, 5 cricket analysts/coaches; one landing page per segment with an email capture; decide segment focus from evidence.

---

## 6. IPL-first strategy

Strengths: Cricsheet’s complete IPL history; seasonal attention spike; franchises’ auction cycle creates a recurring decision moment. Weakness: seasonality (~2 months of peak traffic), crowded B2C market, legal exposure around IPL IP. The global engine (six leagues) is the credible bridge from IPL fandom to year-round scouting.

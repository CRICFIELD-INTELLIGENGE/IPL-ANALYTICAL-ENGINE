# 07 — Frontend and UI Engineering

> **Evidence base:** source reading of `artifacts/ipl-analytics/src`, a static scan of every page (loading/error/responsive/accessibility markers), and live inspection of the site on a test server (desktop 1440×900 and mobile 375×812) on 2026-10-12. Design-quality judgements are in Chapters 20–23; this chapter is about *how the front end is built*.

---

## 1. Application shell

| Concern | Implementation | File |
|---|---|---|
| Entry | `createRoot(...).render(<App/>)`; polyfills `MediaQueryList.addListener`; **suppresses** a known “addListener” error globally | `src/main.tsx` |
| Providers | `QueryClientProvider` → `TooltipProvider` → `TeamProvider` → `WouterRouter` | `src/App.tsx:156-175` |
| Routing | ~75 `<Route>` entries; legacy paths redirect (`/on-field/*`, `/product`, `/merch`…) | `App.tsx:55-150` |
| Layout | Left icon rail (14 destinations), top bar (live ticker, team switcher, notifications), right “Intelligence Feed” rail, footer, consent banner, “Gully” mascot guide | `components/layout.tsx`, `ai-mascot-guide.tsx` |
| Theming | Choosing a franchise writes `--team-accent`, `--team-secondary`, `--team-glow`, `--team-surface-tint` on `<html>`; persisted in localStorage | `lib/team-context.tsx:255-298` |
| Analytics | GA4 page view per client-side navigation (`AnalyticsRouteTracker`), gated by consent | `components/consent-banner.tsx` |
| Ads | `AdSlot` / `AdVessel` render only if `VITE_ADSENSE_CLIENT` is set | `components/ad-slot.tsx` |

**Primary navigation (left rail, `layout.tsx:25-38`):** Home · My Dugout · Beyond XI · Scout Lab · 2027 Intel · Stats · Pulse · Scores · Intel Hub · Visuals · Auction · Insights · AI Analyst · Shop — 14 top-level items with icon-only labels on desktop.

---

## 2. Data-access layer (how pages get data)

| Client | Fetches | Caching |
|---|---|---|
| `lib/aggregates.ts` | **static JSON** `/data/*.json` (overview, seasons, teams, venues, top batters/bowlers, matches, squads, bios, images…) + some API (`team-analytics`, `venue-analytics`, scorecard, commentary, news, insights) | React Query `staleTime` ≈1 h; API-first-then-static fallback helper at `:400-420` |
| `lib/live.ts` | `/api/live/*`, `/api/auction/*` | polling: scores 30 s, win probability 15 s, **auction state every 1 s** |
| `lib/scout-api.ts` | `/api/scout/*` | 5 min `staleTime` in pages |
| `lib/discovery-api.ts`, `sim-api.ts`, `ask-api.ts`, `dugout-api.ts` | decision endpoints | per page; saved demo snapshot shown **with a banner** if the API is unreachable |
| `lib/player-recent-matches.ts` | shard index + one shard per player | 1 h |
| `lib/gemini-client.ts` | Google Gemini directly from the browser | none |

---

## 3. Page-by-page

Legend for **Data**: 🟢 data-driven (warehouse/API) · 🔵 static JSON generated from the warehouse · 🟣 editorial/static content · 🟠 mocked/hardcoded/randomised.

### 3.1 Homepage — `/home` (`pages/home.tsx`, 653 lines)
- **User problem:** orient a fan: what’s on, who is in form, where to go next.
- **Data:** 🟢 live IPL matches, orange cap, trending (`useLiveIplMatches`, `useLiveOrangeCap`, `useLiveTrending`); 🔵 venues, player images; 🟣 hero copy (“IPL is not just about cricket”), feature cards.
- **States:** 4 loading markers; **no error handling** (0 error markers) — if the live scraper fails the sections are simply empty.
- **Responsive:** 5 breakpoint classes only; hero image dominates the fold.
- **Accessibility:** 8 of 32 buttons have no accessible name (measured in-browser).

### 3.2 Advanced Stats — `/stats` (`pages/stats.tsx`, 4,411 lines)
- **User problem:** “Statsguru-style” slicing of IPL batting/bowling by season, team, opponent, venue, phase, over range, bowler type, delivery type, pressure, innings, match stage, representation, nationality, batter/bowler.
- **Data:** 🟢 `/api/stats/query`, `/drilldown`, `/matchup`, `/scenario`; filters in zustand (`lib/store.ts`).
- **Visualisations:** leaderboards, matchup drill-tabs (zones, delivery types), scenario panels.
- **States:** 7 loading markers, 15 empty-state messages, 1 error marker.
- **Performance:** each filtered query 1.7–2.3 s warm (Chapter 8); the full-screen hero means the first table is below the fold.
- **Hardcoded/dead code:** `FormGuideView` adds `Math.random()` noise to SR/economy and fabricates runs (`:4337-4399`) — **defined but not rendered**; delete it before anyone copies it.
- **Limitations:** 125 instances of 6–9 px text; one 4,400-line component.

### 3.3 Player profiles — `/players/:slug` (`pages/player.tsx`, 3,241 lines)
- **User problem:** everything about one player: identity, career, seasons, teams, recent matches, matchups, intelligence panels.
- **Data:** 🔵 bios, season stats, top lists, squads, captains, images; 🔵 recent-matches **index + per-player shard** (Step 3); 🟢 `/api/intel/player/:key`, `/api/stats/matchup`.
- **Identity:** URL slug → bio key (`lib/player-key.ts`) → exact registry id or **empty state** (no fuzzy matching).
- **States:** 10 loading markers, “Player not found” page.
- **Responsive:** most breakpoint usage of any page (92); also most tiny text (141).
- **Known gaps:** `/players/rohit-sharma` → “Player not found” (Rohit’s page is `/players/rg-sharma`); 20 bios currently show an empty recent-matches state although matches exist (Chapter 10).

### 3.4 My Dugout — `/dugout`, `/dugout/:team` (`pages/dugout.tsx` + `components/dugout/*`)
- **User problem:** a franchise “headquarters”: titles, record, captain, squad by season, stories.
- **Data:** 🟢 `/api/dugout/franchise`, `/api/dugout/squad` (warehouse + squads + captains; nulls shown as unknown, not invented — `dugout-data.ts` header); 🔵 photo registry; 🟣 team articles (`lib/team-articles.ts`), broadcaster links, video registry.
- **Observed:** CSK page renders a large empty band between the tab bar and the stories section at 1440 px (unfilled content area).

### 3.5 Scout Lab — `/scout`, `/scout/player/:id`, `/scout/compare`, `/scout/roles` (**uncommitted**)
- **User problem:** compare T20 players across six leagues fairly; shortlist.
- **Data:** 🟢 `/api/scout/*` over `global.db`.
- **Interactions:** league chips, phase, role, min-volume, sort field + order, search, pagination, compare tray (≤ 5), profile, role catalogue.
- **States:** loading and error markers on all four pages.
- **Defects (live-verified):** role column always “Unclassified”; default bowling order shows worst economy first; unqualified (< minBalls) players listed; each league’s leader shows “100th %ile” in a mixed-league table; on mobile the table overflows horizontally (inside a scroll container) and the right rail takes ~45% of the width in the audit browser.

### 3.6 AI Analyst — `/ai-analyst` hub + 11 modules
| Route | Module | Data |
|---|---|---|
| `/ai-analyst/ask` | Ask the database (+ Gemini tab) | 🟢 `/api/ask`; 🟠 Gemini fallback text (Chapter 9) |
| `/weakness` | Hidden Weakness Detector | 🟢; demo snapshot when offline (labelled) |
| `/pressure` | Pressure Genome | 🟢; demo snapshot (labelled) |
| `/feed` | Insight Feed | 🟢; demo snapshot (labelled) |
| `/strategy-sim` | Strategy Simulator | 🟢 Monte Carlo; also calls Gemini client |
| `/alt-universe` | Alternate Universe | 🟢 |
| `/opposition-map` | Opposition Exploit Map | 🟢 |
| `/decision-replay` | Captain’s Decision Replay | 🟢 |
| `/squad-dna` | Squad DNA | 🟢 |
| `/auction-war-room` | Auction War Room | 🟢 + backtest |
| `/player-pool` | Player Pool graph | 🟢 |
- Shared shell: `components/decision/module-shell.tsx` (header, player picker, segmented control, `DemoBanner`, `ErrorBanner`, diverging colour tokens).
- These pages have the **best** state handling in the app (5–15 error markers each, explicit empty/demo states) and the clearest methodology text.

### 3.7 Match Detail — `/match/:id` (`pages/match-detail.tsx`)
- 🟢 scorecard and commentary from raw Cricsheet + ESPN text; win probability (calibrated model for archived matches); intel panel.
- 🟠 `OversView` with `Math.random()` per-over runs and fake wicket dots exists at `:701-718` — **not rendered**.
- 15 loading markers (best on the site).

### 3.8 Scores / Pulse — `/scores`, `/pulse`
- **Scores:** 🔵 matches, points tables, squads (static archive browser) + filters; 3 empty states.
- **Pulse:** 🟢 live IPL matches (scraped) → 🟠 “emotion” meters (excitement includes `Math.random() * 10`, heat zones `+ Math.random() * 0.15`, `pulse.tsx:137,168`). Presented as live telemetry; it is a heuristic with noise.

### 3.9 Fan Arena / Beyond XI — `/arena`, `/beyond-xi`, `/fan-arena` (1,307 lines)
- 🟣 presentational landing page (“pixel-accurate rebuild of reference design”, commit `e7748b3`); team theme only; 223 hex colours; no data fetching.

### 3.10 Other routes
| Route | Nature |
|---|---|
| `/intelligence` (1,763 lines) | 🟢/🟣 content hub + insight feed; role tabs (data/product/growth/business analyst) |
| `/feed` (“2027 Intel”) | 🟣 strategy content from `data/strategy-2027-data.ts` (1,347 lines of authored data) |
| `/auction` | 🟢 multiplayer auction **game** (in-memory server state, random AI bidders) |
| `/teams/:slug`, `/venues/:slug` | 🔵 + intel panels |
| `/visualizations` | 🔵 gallery (sankey, knowledge graph, spatial, telemetry timeline) |
| `/shop` (1,803 lines) | 🟣 merchandise showcase; no cart/checkout backend |
| `/insights`, `/reports`, `/blogs` | 🟣 section pages |
| `/about`, `/methodology`, `/data-sources`, `/contact`, `/disclaimer`, `/privacy` | 🟣 trust pages (methodology and data-sources pages exist — good practice) |
| `/photo-pipeline`, `/admin/photo-pipeline` | internal tool, **public** |

---

## 4. Cross-cutting engineering assessment

| Aspect | Finding | Evidence |
|---|---|---|
| Component size | 5 pages > 1,300 lines; `stats.tsx` 4,411 | `wc -l` |
| Code splitting | none (`React.lazy` = 0) → 4.11 MB JS (864 KB gzip) loaded on first visit | build output |
| Type safety at the API boundary | hand-written types drift from API (`role`) | `lib/scout-api.ts:23` |
| Error boundaries | none; a render error blanks the app | grep |
| Global error suppression | `main.tsx` swallows a class of runtime errors | `main.tsx:19-45` |
| Accessibility | `aria-*` attributes absent on most large pages; icon-only nav; `maximum-scale=1` disables pinch-zoom | scan + `index.html:5` |
| Fonts | body declares **“Outfit”, which is never loaded**; Inter and JetBrains Mono are loaded but Inter is not applied to `body` | `index.css:43`, `index.html:14` |
| Theme tokens | shadcn HSL tokens defined, but Tailwind v4 `@theme` mapping missing → semantic classes like `bg-primary` don’t resolve; many hard-coded hexes | `index.css` |
| Loading / error states | strong in AI Analyst & Scout; weak on Home, Dugout, Fan Arena | scan |
| Polling | auction 1 s per tab; scores 30 s | `lib/live.ts` |
| Mobile | at 375 px the right rail and overlays (cookie banner, mascot, tour card) cover a large part of the viewport in the audit browser; Advanced Stats title clipped | screenshots (see note) |

> *Note on mobile measurements:* the right-rail width uses a framer-motion animation; in a hidden or throttled tab it can stay wide (documented in project notes). The 375 px screenshots were taken in a visible tab, but confirm on a physical phone before treating the rail width as a production bug.

---

## 5. How raw data becomes an understandable UI (worked example)

`deliveries` rows → `agg_batting` counts → `ratePlayers()` index/shrunk/CI/percentile → JSON → `scout-home.tsx` row:

```
V Suryavanshi  470f446b • IPL   RANKABLE (449B)   23m • 23i
  Shrunk SR index 137.4  · 100th %ile
  Raw index 147.4 · Raw SR 229.0
  95% [137.4–157.4]
```

The design choice that matters: the page shows **sample size, tier and interval next to the headline number**, which is rarer (and better) than most cricket sites. The weakness: four numbers on similar scales (137.4, 147.4, 229.0, the CI) without units or a legend, and the headline (shrunk) does not correspond to the interval (raw).

---

## 6. Interview questions

1. *Walk me through what happens between clicking “Bowling Rankings” and seeing the table.* (Chapter 2 §4.)
2. *Why is the role always “Unclassified”, and how would you prevent that class of bug?* (Generated types from the OpenAPI spec / Zod schema shared by client and server.)
3. *How would you cut the 4 MB bundle?* (`React.lazy` per route, move three.js and Recharts into lazy chunks, image optimisation, remove dead pages.)
4. *What happens if `/api/live/ipl/matches` fails on the homepage?* (Sections stay empty; no error message — a UX gap.)
5. *How does team theming work without re-rendering every component?* (CSS custom properties on `<html>`.)

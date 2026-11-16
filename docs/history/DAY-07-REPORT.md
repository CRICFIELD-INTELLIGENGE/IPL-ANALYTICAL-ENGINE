# Day 7: Core website functional testing

**Date:** 2026-10-19
**Scope:** the existing website, tested as it is. No redesign.
**Environment:** local dev servers. The API runs read-only on the production warehouse (`CRICFIELD_DB_READONLY=1`); the web app is Vite.
**Tooling:** the Claude desktop app's built-in browser (Chromium). The repository has **no Playwright/Cypress suite**, so browser checks were scripted in-page: Resource Timing for status codes, console and error hooks, DOM checks.
**Not touched:** warehouse hashes were unchanged throughout (`ab897a8c…` / `79c75f78…`). Nothing was committed or deployed.

Evidence: `docs/day07/` (`route-api-matrix.json`, `api-tests.log`).

---

## 1. Inventory

- **Frontend:** 60 `<Route>` entries in `src/App.tsx`: 52 distinct pages and 8 redirects or aliases.
- **API:** Express routers `ipl`, `decision`, `decision-intel`, `scout`, `auction`, `live`, `insights`, `clip`, `csv-sync` (admin-only, Day 1).
- **Matrix:** route → page → the API and data calls it makes, captured live in the browser: `docs/day07/route-api-matrix.json`.

| Area | Routes |
|---|---|
| Home and overview | `/home`, `/intelligence` (`/product`, `/revenue`, `/growth`), `/feed` (`/strategy`, `/on-field`) |
| IPL statistics | `/stats`, `/pulse`, `/scores`, `/visualizations` |
| Players / teams / venues / matches | `/players/:slug`, `/teams/:slug`, `/venues/:slug`, `/match/:id`, `/dugout`, `/dugout/:team` |
| Scout Lab | `/scout`, `/scout/player/:id`, `/scout/compare`, `/scout/roles` |
| Decision tools (AI Analyst) | `/ai-analyst` and 12 sub-pages (ask, weakness, pressure, feed, strategy-sim, alt-universe, opposition-map, decision-replay, squad-dna, auction-war-room, player-pool) |
| Auction | `/auction` |
| Content and static | `/arena`, `/reports`, `/blogs`, `/insights`, `/shop`, `/about`, `/methodology`, `/data-sources`, `/contact`, `/disclaimer`, `/privacy`, `/photo-pipeline`, 404 |

## 2. Browser smoke results

### Desktop: 51 routes (every page, with real ids for parameterised routes)

| Check | Result |
|---|---|
| Page renders (non-empty main content, expected heading) | **51 / 51**. The unknown route shows the 404 page |
| API / data calls | **0 non-2xx** on first load, apart from one defect (Hasaranga, below) |
| JavaScript errors / unhandled rejections | **0** |
| Broken images | **3 pages** before the fix (`/feed`, `/strategy`, `/dugout`, `/dugout/royal-challengers-bengaluru`), **0** after |
| Error states shown | None unexpected. Text flagged by the scan: "Direct link unavailable" (truthful clip-link state, Day 1) and the 404 page |

### Mobile: 375 × 812, 12 key routes

| Check | Result |
|---|---|
| Page-level horizontal scroll | **None** (`scrollWidth = 375` on all 12) |
| API errors / JS errors / broken images | 0 / 0 / 0 |
| Wide elements | Tables sit inside horizontal scroll containers (Scout, Match) |

**Needs a check with the browser pane visible (not a confirmed defect):**
- In screenshots the right "Intelligence / Feed" rail covers part of the content, and the `/stats` heading is clipped.
- Player pages lay out at 1,090 px.

The pane was hidden during the run. A known artifact applies: framer animations stop, and the layout's right rail keeps its 240 px desktop width. These may therefore be measurement artifacts. Verify on a real phone, or with the pane visible, before the redesign.

## 3. End-to-end journeys (interactive)

| Area | Journey | Result |
|---|---|---|
| Scout Lab | Search "Bumrah" → suggestion → dossier | Works, 0 failed calls. **Defect fixed:** "Capped 2026" showed "Uncapped / Unverified" for JJ Bumrah when the API had no capped-status evidence. It now shows "Not recorded" |
| AI Analyst (SQL mode) | "Most runs in IPL 2025" | B Sai Sudharsan 759 off 486, SA Yadav 717, V Kohli 657. **Equal to an independent warehouse recount** |
| Strategy simulator | Defaults (GT chasing 201 vs RCB, 120/3 after 14) → Simulate | 200 in 302 ms. Three plans with final-score ranges (166–199), a league-average baseline (73%) and 123 similar real chases (76% defended), plus the method text. **Uncertainty is shown; no figure is presented as certain** |
| Auction | Select CSK → Enter → Start → Bid → Pause → Reset | Bid accepted (+₹25 L official slab); AI counter-bids. Pause freezes the clock and bid. Reset restores purses (₹120 Cr), empty squads, single-player mode |
| Player profile | `/players/wanindu-hasaranga` | **Defect fixed:** the Decision Intelligence panel 404'd (it passed the bio name "PW Hasaranga"). It now resolves through the verified identity index to PWH de Silva (331) |
| Stats | Batter table | The "Bdry%" header shows the Day 6 definition tooltip |

Not run interactively: the Gemini-backed paths (no AI key in this environment; the pages show their truthful "unavailable" states, Day 1). The 3D replay was not driven frame by frame. The Day 6 radar change (no "Spin Profile" axis for an unknown type) is type-checked only: the page I opened renders no radar for that player.

## 4. Auction and simulation reliability

| Item | Finding | Action |
|---|---|---|
| Input validation | **4 defects, reproduced against the running API.** `join-room` with no body → **500** with an HTML stack trace. `set-speed {"speed":"abc"}` stored "abc". `bid` with `increment: -50` accepted (while active, a negative raise **lowers the live bid**). `chat` accepted non-strings and unbounded text | **Fixed.** Zod schemas on every POST body (team 1–20, increment a positive integer ≤ 2,500 lakhs, speed 1–3, chat ≤ 40/40/280 characters, room code `IPL-####`); invalid → 400 with issues. `placeBid` also ignores a non-positive increment. Test: `day7-api` #3 |
| Shared vs session state | **One global in-memory auction** (`auctionService` singleton). Any visitor's start / bid / pause / reset / join changes the game for everyone; multiplayer "rooms" are a label on the same state | **Deferred (design).** Per-session state is a product change, out of scope. It must not be exposed publicly as-is |
| Polling | `/api/auction/state` every **1 s** (`lib/live.ts`), including from `/scores` | Measured and handled in Day 8 |
| Randomness | Decision simulators (strategy sim, alt-universe, opposition map) use the **seeded** mulberry32 PRNG: reproducible, with shared seeds across compared plans. The auction game uses unseeded `Math.random` (a game, not a statistic) | Verified, no change |
| Reset | Clears timers and state correctly (journey above) | Verified |
| Mathematical assumptions | Simulators show ranges, baselines and sample sizes. War Room reports its own backtest weakness (handbook) | Verified on the strategy simulator |

## 5. API reliability

New `artifacts/api-server/test/day7-api.test.ts` (4 tests) runs the real Express app in-process:
- **12 critical read endpoints:** status 200 and the fields the web app reads.
- **6 invalid / unknown inputs:** each is a 4xx, never a 500.
- **9 malformed auction bodies:** each is a 400; a valid speed is accepted and stored.
- **An unknown API route:** 404.
- **Every response** is scanned for filesystem paths and stack traces: none found. Day 5 had already removed the paths from 503 responses.

Full API suite: **68 / 68** (`docs/day07/api-tests.log`).

## 6. Defects fixed today

| # | Defect | Fix | Verified by |
|---|---|---|---|
| 7.1 | 8 team banners point to `/<file>.webp`, but the files are in `/venue-images/`. The RCB banner uses "rcb winner 2026.jpg" for `rcb-winner-2026.jpg` (also two references on the Feed page). Most Dugout heroes and the Feed hero showed a broken image | Paths corrected in `lib/team-context.tsx` and `pages/feed.tsx` | Every banner path exists on disk; the browser re-crawl finds 0 broken images |
| 7.2 | `/api/intel/player/PW%20Hasaranga` → 404 (profile Decision Intelligence panel) | `resolvePlayerId` accepts a bio key or bio display name through the verified identity index (`registryIdForBio`) | curl 200 → player 331; `day7-api` #1 |
| 7.3 | Auction: 500 on a missing room code; negative bid raises; arbitrary AI speed; unvalidated chat | Zod validation; positive-increment guard | `day7-api` #3; manual probes |
| 7.4 | Scout dossier says "Uncapped / Unverified" when the capped status is unknown | Shows "Not recorded" | Code; Bumrah dossier |
| (Day 6) | `/api/ipl/overview`, `/toss-analysis`, `/phase-analysis` literals | Computed live | `day6-metrics` |

## 7. Open after Day 7

- **Shared global auction state:** deferred, a design change.
- **Mobile layout** (right rail, `/stats` heading, player page width): verify with a visible pane or a real device.
- **No browser E2E framework** in the repository: the checks above are scripted, not a committed suite. Recommend Playwright smoke tests over the route matrix before the redesign.
- **Photo licences** (handbook, Day 5): the fixed banner paths restore existing images; their licences are still undocumented.

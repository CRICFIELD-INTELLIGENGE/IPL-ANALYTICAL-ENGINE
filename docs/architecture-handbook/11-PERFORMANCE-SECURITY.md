# 11 — Performance, Scalability and Security

> **Framing:** this chapter evaluates CricField *as if* it were preparing for **10,000 daily users**. It does **not** claim that it supports that traffic today. Measurements are from one laptop on 2026-10-12 (Chapter 8 method); they are indicative, not production benchmarks. Proposals are kept separate from current behaviour (§6).

---

## 1. Back-of-envelope load model (assumption, not data)

10,000 daily users × ~6 API calls per visit ≈ 60,000 requests/day ≈ 0.7 req/s average. Cricket traffic is spiky: during an IPL evening assume 10× the average → **~7 req/s**, with bursts of tens of simultaneous requests after a wicket or a social post.

---

## 2. Measured performance

### 2.1 API latency (single user, warm)

| Endpoint class | Warm | Capacity implication |
|---|---|---|
| Decision caches (`/players/:id/summary`, `/war-room/board`, `/pressure/*`, `/dugout/*`) | 2–14 ms | fine |
| Scout rankings | 35–141 ms | ~10–25 req/s per process |
| Scout profile | 552 ms | ~2 req/s per process |
| Opposition sim | 233 ms | ~4 req/s |
| **Advanced Stats filtered** (`/stats/query?season=2025`) | **2.3 s** | **< 0.5 req/s per process** |

### 2.2 Concurrency (synchronous SQLite on one event loop)

| Test | Wall time |
|---|---|
| 1 × Scout rankings | 42 ms |
| 10 × Scout rankings concurrently | 351 ms |
| 50 × Scout rankings concurrently | 1,883 ms |
| 1 × Advanced Stats (season filter) | 2,664 ms |
| **10 × Advanced Stats concurrently** | **23,892 ms** — every other request (including `/healthz`) waits behind them |

**Conclusion:** the first bottleneck at the target load is not the database size but the **synchronous query on Node’s single thread**. Ten fans filtering Advanced Stats at once would freeze the whole API for ~24 s.

### 2.3 Start-up
Decision caches warm for **11.9 s** after `listen()`; requests arriving then queue. On autoscaling platforms each new instance pays this cost (cold starts).

### 2.4 Front-end weight

| Asset | Size |
|---|---|
| JS bundle (single chunk) | 4.11 MB (**864 KB gzip**, 669 KB brotli) |
| CSS | 403 KB (45 KB gzip) |
| Largest images | `TITLE BANNER.png` 2.6 MB, `keshav-maharaj.png` 2.0 MB, `sam-curran.png` 1.8 MB, `hero-players.png` 1.7 MB, `advance stats title image` 1.3 MB (bundled) |
| `public/` images | 255 PNG/JPG = 68.8 MB; 288 WebP = 14.0 MB |
| `loading="lazy"` usage | 6 occurrences in pages/components |
| Largest JSON payloads | `/api/ipl/top-batters` 1.2 MB; `/api/stats/query` 0.3–0.5 MB; `public/data/player-recent-matches.json` 34 MB (no longer used by the page, still shipped) |
| Polling | auction state **every 1 s per open tab**; live scores 30 s; win probability 15 s |

On a mid-range phone over 4G, ~1 MB of compressed JS plus multi-MB hero images means a slow first paint; the Advanced Stats hero image alone is larger than many whole pages.

### 2.5 Query-level
`EXPLAIN QUERY PLAN` (Chapter 4 §6): death-overs economy scans the whole bowler index (871 ms); pre-aggregated global queries take 1–6 ms. Duplicate index on `dismissals(player_out_id)`.

---

## 3. Caching posture

| Layer | Today |
|---|---|
| Browser | React Query (static JSON ~1 h, scout 5 min). API responses carry `Cache-Control: no-store` — the browser and any CDN are **told never to cache**, even for 2008 scorecards that never change. |
| Server | in-memory: decision caches, raw match JSON (all 1,247 files pre-loaded), scraper cache 30 s (bypassable with `?refresh=true`) |
| CDN | none configured |
| Database | SQLite page cache only |

---

## 4. Deployment, cost, logging and monitoring

| Topic | Today | Risk at 10k/day |
|---|---|---|
| Hosting | Replit autoscale (configured) | each instance needs the data files; local SQLite per instance; in-memory state (auction, click counts) diverges between instances |
| Data shipping | `global.db` and raw JSON gitignored | Scout Lab and many features fail on a clean deploy |
| Cost | unknown (no billing data in repo); compute is dominated by Advanced Stats queries and 1 s auction polling | — |
| Logging | pino JSON to stdout; no retention | no way to investigate incidents after the fact |
| Error monitoring | none (no Sentry or similar); `main.tsx` suppresses a class of browser errors | silent failures |
| Uptime / alerts | none | — |
| Analytics | GA4 (consent-gated) | page views only; no product events |

---

## 5. Security review

### 5.1 Findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| S1 | **Arbitrary file read / existence oracle** via `POST /api/ipl/sync-csv` (`filePath` from request body) | **High** | `routes/csv-sync-route.ts`, `services/cricsheet-csv-sync.ts:38-43` |
| S2 | No authentication or authorisation anywhere; admin “photo pipeline” page public | Medium | `App.tsx` routes, no auth middleware |
| S3 | Global mutable auction state; anyone can reset | Medium | `services/auction.ts:429` |
| S4 | No rate limiting; heavy endpoints enable cheap denial of service | Medium | §2.2 |
| S5 | `?refresh=true` lets anyone force outbound scraping | Medium | `routes/live.ts` |
| S6 | Scraping third-party sites with a spoofed browser User-Agent | Legal/ToS | `services/cricbuzz.ts:3-9` |
| S7 | Gemini key: browser-side, stored in localStorage, sent in URL; `VITE_GEMINI_API_KEY` would ship in the bundle | Low–Medium | `lib/gemini-client.ts` |
| S8 | Error messages returned to clients (`err.message`) | Low | `routes/ipl.ts` |
| S9 | Open CORS (`cors()`) | Low (no credentials) | `app.ts:28` |
| S10 | `.env` committed (public ids only) | Low | `git ls-files` |
| S11 | `drizzle-kit push` on every merge against the production DB file | Medium (integrity) | `scripts/post-merge.sh` |
| S12 | `maximum-scale=1` (accessibility, not security) | — | `index.html:5` |

### 5.2 Things done well
- Parameterised SQL in all modern code; enum-guarded interpolation.
- Zod validation on modern routes with bounded numbers and string lengths (e.g. `q` ≤ 80 chars, `sims` ≤ 5000).
- Read-only DB connections for decision and scout layers.
- Consent banner before analytics/ads; `.env.example` explains that `VITE_` values are public.
- pnpm `minimumReleaseAge: 1440` and an allow-list for packages that run install scripts — supply-chain hygiene.
- ODC-BY attribution requirement documented (`docs/global-data-engine/README.md`).

### 5.3 Data licensing and attribution
| Data | Licence position |
|---|---|
| Cricsheet ball-by-ball | ODC-BY 1.0 — usable with visible attribution. ✅ `/data-sources` credits Cricsheet and links the licence (`pages/data-sources.tsx:65`) |
| Auction/season facts compiled from Wikipedia | CC BY-SA 4.0 (stated on `/data-sources:80`) — **share-alike**: derived datasets you publish must carry the same licence and attribution |
| ESPN commentary text, Cricbuzz live data, official player photos, team logos, IPL marks, JioHotstar branding | **not licensed** for redistribution; the site also labels an ad slot “Official Analytics Partner” — remove claims that imply affiliation |

---

## 6. Proposed improvements (not implemented)

### Essential
1. Delete or lock down `/api/ipl/sync-csv`.
2. Fix Scout ranking correctness (sort direction, `minBalls`, role display) and the Gemini fallback.
3. Make API responses cacheable: `Cache-Control: public, max-age=…` for historical endpoints; put a CDN in front.
4. Move heavy SQL off the event loop: precompute Advanced Stats aggregates (like `global.db` does) **or** run queries in `worker_threads`; add a timeout.
5. Rate-limit by IP (e.g. `express-rate-limit`) and remove public cache bypass.
6. Ship data deliberately: build artefact = code + `sqlite.db` (checkpointed, no WAL) + `global.db` + raw JSON (or remove runtime dependence on raw JSON).
7. Fix typecheck errors; add CI that blocks merges on typecheck + tests.

### Important
8. Route-level code splitting (`React.lazy`) and lazy-load three.js/Recharts; convert PNG heroes to WebP/AVIF with `srcset`; `loading="lazy"` everywhere below the fold.
9. Paginate `/ipl/top-batters` and similar; drop the 34 MB legacy JSON from `public/`.
10. Replace 1 s auction polling with server-sent events or WebSocket, scoped per room.
11. Error monitoring (Sentry) and structured log retention; an uptime check on `/api/healthz`.
12. Remove `drizzle-kit push` from post-merge; use explicit migrations.
13. Remove/qualify affiliation-implying copy; keep only licensed or self-made images.

### Optional
14. Move the warehouses to DuckDB (analytics) or PostgreSQL (multi-instance) when concurrency or data size requires it.
15. Server-side LLM proxy with grounding (Chapter 9 §4) and a spend cap.
16. Load tests (k6/autocannon) in CI with latency budgets.

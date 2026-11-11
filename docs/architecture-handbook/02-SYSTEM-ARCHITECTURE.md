# 02 — System Architecture

> Diagrams for every section live in [ARCHITECTURE-DIAGRAMS.md](ARCHITECTURE-DIAGRAMS.md). This chapter explains the *decisions* behind them and traces one real request end to end.

---

## 1. Beginner explanation

CricField is a **website** (React, runs in your browser) that talks to a **server** (Express, runs on Node.js). The server reads cricket data from two **database files** (SQLite) and some **JSON files**, does the maths, and sends back JSON. The website turns that JSON into tables and charts. Some pages skip the server entirely and download pre-computed JSON files directly.

---

## 2. Architectural style

| Property | What CricField does | Consequence |
|---|---|---|
| **Monolith** | One Node process serves all 123 endpoints, runs simulations, scrapes live sites and (in production) serves the built SPA. | Simple to run and deploy; one slow query slows everyone. |
| **Modular service layer** | `routes/*` are thin; logic lives in `services/*`; decision modules share a data layer (`services/decision/db.ts`, `player-profiles.ts`, `ball-context.ts`). | Good separation — the newer code is easy to test in isolation (this audit ran `ratePlayers` and `auctionBoard` directly). |
| **Embedded database** | SQLite via Node’s built-in synchronous driver. | No DB server; but every query blocks the event loop. |
| **Read-mostly** | Only two code paths write at runtime (insight click counter; and the unsafe CSV reader). | Easy to cache; could be served from a CDN if responses were cacheable. |
| **Pre-compute where possible** | Static JSON (`public/data`), start-up caches (column store, impact model, auction board), aggregates tables. | Fast reads (2–14 ms) after an 11.9 s warm-up. |
| **Two generations of code** | *Legacy* (`stats-aggregator.ts`, `ipl.ts`: no validation, JSON fallbacks, hardcoded literals) and *modern* (decision + scout: Zod, typed services, documented maths). | Inconsistent quality; the legacy path is also the slowest. |
| **Client-side LLM** | Gemini is called from the browser with a user-supplied key. | No server cost, but no control, no grounding, key exposure. |

---

## 3. Layers

### 3.1 Front end (`artifacts/ipl-analytics`)
- React 19 + Vite 7, routing with **wouter** (a 2 KB router; `<Switch>`/`<Route>` in `App.tsx`).
- Server state with **TanStack React Query** (caching, loading/error states, `staleTime` per query).
- Client state: React context for the chosen franchise (`lib/team-context.tsx`, also writes CSS variables `--team-accent` etc. so the whole UI re-themes per team), zustand for Advanced Stats filters (`lib/store.ts`).
- Styling: Tailwind CSS 4 utility classes + shadcn-style components on Radix primitives (`components/ui/*`).
- Visuals: Recharts, hand-built SVG, three.js 3D stadium replay, framer-motion.

### 3.2 Back end (`artifacts/api-server`)
- Express 5; middleware: pino-http, cors, json, no-store headers.
- Route groups: legacy IPL (`ipl.ts`), live (`live.ts`), auction game (`auction.ts`), decision Phase 1–2 (`decision.ts`), decision Phase 3–4 + intel + dugout (`decision-intel.ts`), Scout Lab (`scout.ts`), clip router, CSV sync, health.
- Build: esbuild bundles everything (except native modules) into one ESM file with a banner that recreates `__dirname`/`require`.

### 3.3 Data
- `sqlite.db` (IPL), `global.db` (6 leagues), `lib/cricket-data/raw/*.json` (raw match files, used for stage, scorecards, DLS targets and the JSON-replay stats engine), `artifacts/api-server/data/*.json` and `artifacts/ipl-analytics/public/data/*.json` (curated/derived files).

### 3.4 Analytics
- Deterministic statistics everywhere (Chapter 6). Two small fitted components: Platt calibration and kNN pricing.

### 3.5 Assets and media
- ≈540 images in `public/` (player photos, stadiums, logos), ~60 more at the repo root, a photo registry (`public/data/player-photo-registry.json`) with a validation script and an internal dashboard (`/photo-pipeline`). Photos were scraped from official sites (licensing risk, Chapter 25).

### 3.6 External integrations
Cricbuzz (scraped), Google News & ESPN RSS, Gemini (optional), GA4 + AdSense (env-gated, consent banner).

---

## 4. Request trace: “show me the best batters across six leagues”

**User action:** opens `/scout`, leaves *All 6 Leagues*, *All Phases*, *Rankable (120+)*, sort *Shrunk Strike Rate*.

| Step | Where | What happens |
|---|---|---|
| 1 | `App.tsx` | wouter matches `/scout` → `ScoutHomePage`. |
| 2 | `pages/scout-home.tsx:88-118` | React state holds filters; `useQuery` builds key `["scout-rankings", discipline, comps, phase, role, minBalls, page, limit, sortBy, sortOrder, search]`, `staleTime` 5 min. |
| 3 | `lib/scout-api.ts:240` | `fetchScoutRankings()` builds `URLSearchParams` → `GET /api/scout/rankings?discipline=batting&minBalls=120&page=1&limit=25&sortBy=shrunk&sortOrder=desc`. |
| 4 | Vite dev proxy (`vite.config.ts` `server.proxy`) | forwards `/api` to `localhost:${VITE_BACKEND_PORT}` (in production the API serves the SPA itself, same origin). |
| 5 | `app.ts` | pino logs, CORS, `no-store`. |
| 6 | `routes/scout.ts:78-104` | `requireGlobalWarehouse()`; Zod `rankingsQuerySchema` coerces numbers, defaults, enums. |
| 7 | `scout-service.ts:487` | `ratePlayers()` → for each of 6 competitions `competitionRatings()` runs ~6 SQL statements (aggregates, variance, coverage, roles, names, teams). |
| 8 | `scout-service.ts:395-482` | computes index, shrinkage, intervals, percentiles per competition. |
| 9 | `routes/scout.ts:117-187` | text search, sort by `metrics.strike_rate.shrunk` desc, paginate 25, attach strength/weakness sentences. **No `minBalls` filter here.** |
| 10 | Response | ≈36 KB JSON, measured 35–58 ms. |
| 11 | `scout-home.tsx` | renders the leaderboard: `PlayerScoutRow`, `RolePill`, CI text, tier badges. `RolePill` receives an object → shows “Unclassified” (defect). |
| 12 | React Query | caches for 5 min; changing any filter creates a new key → new request; going back to an old filter is instant. |

**What breaks if a piece is removed:** no `global.db` → 503 `global_warehouse_unavailable` and the page shows its error state; no Zod → `minBalls=abc` would reach SQL as `NaN`; no React Query key per filter → stale tables after changing filters.

---

## 5. System boundaries and trust

| Boundary | Today | Risk |
|---|---|---|
| Browser ↔ API | public, no auth, open CORS | abuse of heavy endpoints, shared auction state, file-read route |
| API ↔ SQLite | same process, file access | a single process; multi-instance autoscale gives each instance its own DB copy |
| API ↔ third parties | server-side scraping with spoofed UA | ToS / legal and reliability |
| Browser ↔ Gemini | direct, user key | key exposure, ungrounded output |
| Repo ↔ data | warehouses and raw data partly gitignored | clean deploys lack data |

---

## 6. Deployment architecture (as configured)

- **Replit** (`.replit`): `deploymentTarget = "autoscale"`, ports 8080→80 etc., post-merge hook `pnpm install && drizzle-kit push`. Commit messages show three “Published your App” events in May 2026.
- **Production process:** `node dist/index.mjs` serves `/api/*` and, if `ipl-analytics/dist/public` exists, the SPA with an index.html fallback (`app.ts:43-58`).
- **Local:** `START.bat`, `run.sh`, `run.ps1` start API (:5000) and Vite (:3000) together; Vite proxies `/api`.
- **Not present:** Vercel config, Docker, CI, IaC, environment-specific config files, secrets manager. Deploying anywhere else would require shipping `sqlite.db` (+WAL), the raw JSON folder and `global.db` with the build.

**Known run-path defect:** the documented source-run (`pnpm exec tsx src/index.ts`, used by `.claude/launch.json`) crashes with `ReferenceError: __dirname is not defined in ES module scope` at `app.ts:46` (uncommitted change). The esbuild bundle works because its banner defines `__dirname`.

---

## 7. Dependencies that matter

| Dependency | Why it matters architecturally |
|---|---|
| `node:sqlite` | experimental API in Node (prints a warning); synchronous; no extra native build |
| Drizzle ORM (`sqlite-proxy`) | used only by the legacy path, wrapped around `node:sqlite`; leftovers from a Postgres setup (`pg` dependency, Pool proxy that throws) |
| Zod | the contract layer for modern routes |
| javascript-lp-solver | MILP for the Playing XI |
| React Query | the whole front end’s data layer |
| three.js | ~1/3 of the custom visual code; its components are where the 11 web type errors are |

---

## 8. Architecture interview questions

1. Why a monolith? *(One developer, read-mostly data, simplest deploy; split when a component needs independent scaling — e.g., move simulations to a worker.)*
2. What is the single biggest architectural bottleneck? *(Synchronous SQLite on the event loop + no response caching.)*
3. Why are there three ways of computing a batting average? *(History: JSON replay, SQL path, decision column store — consolidation is overdue.)*
4. How would you make Scout Lab safe to host for 10,000 users/day? *(Chapter 11.)*
5. Where are the trust boundaries, and which one is currently broken? *(`/api/ipl/sync-csv`.)*

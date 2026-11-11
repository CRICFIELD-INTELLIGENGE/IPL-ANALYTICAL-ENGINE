# 03 — Technology Stack Deep Dive

> **Rule for this chapter:** a technology is listed only if code that runs imports it. “Declared but unused” and “absent” technologies are listed separately in §9 so you never claim them by accident.
>
> Each entry: **What** · **Problem it solves** · **Where in CricField** · **Why here** · **Alternatives** · **Pros / limits** · **Skills to use it independently** · **Interview questions**.

---

## 1. Languages

### TypeScript (~5.9) — ✅ verified
- **What:** JavaScript with static types, compiled away at build time.
- **Problem:** catches shape mismatches (e.g., passing an object where a string is expected) before runtime.
- **Where:** all of `artifacts/*/src`, `lib/*`, `scripts/src`. `tsconfig.base.json` (strict settings), `pnpm run typecheck`.
- **Why here:** one language for browser, server and ETL; types shared via `lib/api-zod`.
- **Alternatives:** plain JS (faster to write, more runtime bugs), Python for ETL.
- **Limits observed:** types only help if they reflect reality. The Scout client declares `role: string` (`lib/scout-api.ts:23`) while the API sends `{label, inputs}` → the bug compiled cleanly. Also, esbuild/Vite do **not** type-check, so the current type errors (API 2, web 11) do not stop dev builds.
- **Skills:** generics, union/discriminated union types (`altSchema` in `decision-intel.ts:163-171`), `unknown` vs `any` (the codebase uses `any` heavily in `stats-aggregator.ts`), `tsc --noEmit`.
- **Interview:** *“How does `z.infer` connect runtime validation to compile-time types?”* *“Why didn’t TypeScript catch the role bug?”*

### JavaScript (ES modules) — ✅
`.mjs` scripts in `scripts/` (photo scraping, registry generation, `generate-player-recent-matches.mjs`). `"type": "module"` in every package.

### Python 3 — 🟡 tooling only
- **Where:** `artifacts/image-ingestion/` (requests, BeautifulSoup, Pillow, FastAPI, pandas — an image-collection tool with its own small API) and ~30 scripts using **OpenCV** (`cv2.grabCut`) + NumPy + Pillow to cut out and crop player photos (`scripts/test_perfect_cutouts.py`, `crop_rcb_2025_to_chest.py`).
- **Not used for:** the cricket data pipeline or analytics. **Do not claim “Python/Pandas data pipeline” for the cricket warehouse.**

### SQL (SQLite dialect) — ✅
Hand-written SQL in `services/decision/*`, `services/scout/*`, `scripts/src/global/*`; Drizzle-generated SQL in the legacy path. Features used: CTEs (`stats-aggregator.ts` `overall_stats`, `match_scores`), `CASE` aggregation, `GROUP BY … HAVING`, window-free ranking done in TS, `WITHOUT ROWID` tables, composite primary keys, views (`v_batting`, …), `EXPLAIN QUERY PLAN` (used in this audit).

---

## 2. Front end

### React 19.1 — ✅
- **What:** UI library; components re-render from state.
- **Where:** every page in `artifacts/ipl-analytics/src/pages/*`.
- **Why:** largest ecosystem for dashboards; pairs with React Query and Radix.
- **Alternatives:** Svelte, Vue, server-rendered Next.js.
- **Limits observed:** very large components (`stats.tsx` 4,411 lines, `player.tsx` 3,241) mix data shaping, layout and visuals — hard to test or review; 29 `useMemo` calls in `player.tsx` alone.
- **Skills:** props/state, effects, memoisation, controlled inputs, lists with keys, error boundaries (none exist in the app).
- **Interview:** *“How does a React component retrieve data in CricField?”* → via a React Query hook; walk through `useQuery` in `scout-home.tsx:89-118`.

### Vite 7 — ✅
Dev server with hot reload and a `/api` proxy (`vite.config.ts`), production build to `dist/public`. Alternatives: webpack, Next.js. Limit observed: no manual chunks / lazy routes → one 4.1 MB bundle.

### wouter 3 — ✅
Tiny router: `<Switch>`, `<Route path="/players/:slug">`, `<Redirect>`, `useRoute`, `useLocation`. Alternatives: React Router (bigger, more features: loaders, nested routes). Limit: no built-in code splitting.

### TanStack React Query 5 — ✅
- **Problem:** fetching, caching, deduplicating, retrying and exposing `isLoading/isError` for server data.
- **Where:** `lib/aggregates.ts` (≈20 hooks over static JSON, `staleTime` 1 h), `scout-home.tsx`, decision pages.
- **Pattern to know:** the **query key** contains every filter, so each filter combination is a separate cache entry.
- **Interview:** *“What is `staleTime` vs `gcTime`?”* *“What happens when the API fails?”* → `isError` → page shows `ErrorBanner` or, for Phase 2 pages when the API is unreachable, a clearly labelled **DemoBanner** with a saved real snapshot (`ai-analyst-weakness.tsx:35-56`).

### Tailwind CSS 4 + shadcn-style components on Radix UI — ✅
- **Where:** `index.css` (`@import "tailwindcss"`, HSL CSS variables), `components/ui/*` (~50 primitives: dialog, tabs, select, tooltip…).
- **Why:** fast iteration, consistent primitives, accessible behaviour from Radix (focus traps, ARIA on dialogs/menus).
- **Limits observed:** `bg-primary`/`text-primary` render nothing (Tailwind v4 needs an `@theme` mapping that is missing), so many pages hard-code hex colours (`bg-[#0B1020]`) and arbitrary sizes (`text-[7px]`, `text-[10px]`) — 69 text elements under 10 px on `/stats` at 375 px width.

### framer-motion 12 — ✅
Animations (layout rail width, hero transitions). Known quirk: animations stall when the tab is hidden, distorting measurements (project memory note).

### three.js 0.170 — ✅
`components/cricket3d/*` (stadium, ball trajectory, crowd, audio) driven by `lib/cricket3d/deliveryAdapter.ts`. All 11 web type errors are here.

### Recharts 2.15 + custom SVG + d3-scale-chromatic — ✅
Charts in decision modules (`components/decision/*`), visualisations (`components/visualizations/*`: sankey, knowledge graph, spatial analytics).

### zustand 5 — ✅
Small global store for Advanced Stats filters and live-match id (`lib/store.ts`).

### Others imported by the web app
`@tanstack/react-table` (data tables), `papaparse`/`react-csv` (CSV export), `lucide-react`/`react-icons`, `sonner` (toasts), `embla-carousel`, `cmdk`.

---

## 3. Back end

### Node.js 24 — ✅
Runtime for API and ETL. Uses built-in `node:sqlite`, `node:test`, `fetch`. Single-threaded event loop — the reason synchronous SQL serialises requests.

### Express 5 — ✅
- **Where:** `artifacts/api-server/src/app.ts`, `routes/*.ts`.
- **Why:** minimal, ubiquitous. Express 5 forwards rejected promises to error handlers.
- **Alternatives:** Fastify (faster, schema-first), Hono, NestJS (structure), FastAPI (Python).
- **Limit:** no global error-handling middleware is registered; each route has its own try/catch with inconsistent responses.
- **Interview:** *“What is middleware? Name the four in `app.ts` in order.”*

### Zod 3 — ✅
Runtime validation with type inference. Exemplary schemas: `rankingsQuerySchema` (`routes/scout.ts:64-76`), `statQuerySchema` (`routes/decision.ts:102-127`, `.strict()` rejects unknown keys), `strategySchema`. Uses `z.coerce.number()` to turn query strings into numbers. Not used by legacy `ipl.ts`.

### pino / pino-http — ✅
Structured JSON logs; serializers strip query strings from logged URLs. No log shipping or monitoring.

### javascript-lp-solver 0.4.24 — ✅
Solves the Playing XI mixed-integer linear programme (`services/decision/playing-xi.ts`). Alternatives: GLPK, OR-Tools, PuLP. Limit: small problems only; fine for 25-player squads.

### cors — ✅ (open to all origins)

---

## 4. Data layer

### SQLite via `node:sqlite` (`DatabaseSync`) — ✅
- **What:** embedded relational database; one file; the driver runs in-process.
- **Why here:** no server to run on Replit; ~300k–770k rows fit easily; read-mostly workload; easy to copy.
- **Alternatives:** PostgreSQL (concurrency, many writers, async drivers), DuckDB (columnar analytics, much faster scans), better-sqlite3 (mature sync driver; declared but not used).
- **Limits observed:** synchronous → blocks the event loop; WAL file must travel with the DB; `node:sqlite` is flagged experimental.
- **Interview:** *“Why did you choose SQLite?”* (one dev, embedded, read-mostly, fast enough at this scale; I know the ceiling is concurrency).

### Drizzle ORM 0.45 (sqlite-proxy) — 🟡
Schema in `lib/db/src/schema/index.ts`; queries via `db.execute(sql\`…\`)` in the legacy aggregator. `drizzle-kit push` runs on every Replit merge (`scripts/post-merge.sh`) — risky against a hand-patched warehouse.

### fflate — ✅ (ETL only)
Reads zip archives in memory for the global engine (`scripts/src/global/zip.ts`).

---

## 5. Build, tooling, testing

| Tool | Role | Evidence |
|---|---|---|
| **pnpm workspaces** + catalog | monorepo dependency management; shared versions in `pnpm-workspace.yaml` catalog; `minimumReleaseAge: 1440` (refuses packages < 1 day old — a supply-chain safeguard) | `pnpm-workspace.yaml` |
| **esbuild** | bundles the API to one ESM file, externalises native modules, adds `__dirname` banner | `api-server/build.mjs` |
| **tsx** | runs TypeScript directly for scripts and tests | `scripts/package.json` |
| **node:test** + `node:assert/strict` | test runner (no Jest/Vitest) | `scripts/src/**/tests/*.test.ts` |
| **OpenAPI 3.1 + Orval** | generates Zod and React Query client from `openapi.yaml` | `lib/api-spec/`, only 19 paths; client unused |
| **Prettier** | declared at root | no config enforcement seen |
| Git | version control | 19 commits, much uncommitted |

---

## 6. AI / LLM

| Item | Status |
|---|---|
| Google Gemini 1.5 Flash REST (browser) | 🟡 optional, user key, no grounding (`lib/gemini-client.ts`) |
| Gemini in clip router (server) | 🟡 optional via `GEMINI_API_KEY`, keyword fallback (`routes/clip-router.ts:126-186`) |
| Natural-language → typed query | ✅ deterministic phrase parser, **not** an LLM (`nl-parser.ts`) |
| ML training / models | ❌ none |

Details: Chapter 9.

---

## 7. DevOps and hosting

| Item | Status |
|---|---|
| Replit (autoscale) | ✅ configured (`.replit`) |
| Vercel | ❌ no config in repo |
| CI/CD | ❌ none |
| Containers | ❌ none |
| Environment variables | `PORT`, `BASE_PATH`, `VITE_BACKEND_PORT`, `VITE_GA_MEASUREMENT_ID`, `VITE_ADSENSE_CLIENT`, `VITE_GEMINI_API_KEY`, `GEMINI_API_KEY`, `REPL_ID`, `NODE_ENV` |
| Monitoring / error tracking | ❌ none (pino to stdout only) |

---

## 8. Security-relevant technology

| Concern | Technology used | Gap |
|---|---|---|
| Input validation | Zod (modern routes) | legacy routes unvalidated |
| SQL injection | prepared statements / Drizzle parameters | one interpolated, enum-guarded fragment |
| Secrets | `.env` (only public `VITE_` ids); `.env.example` warns that `VITE_` vars ship to the browser | `.env` is tracked in git; Gemini key handled in browser |
| AuthN/AuthZ | none | admin page and write endpoints public |
| Dependency hygiene | `minimumReleaseAge`, `onlyBuiltDependencies` allow-list | no `pnpm audit` in a pipeline |

---

## 9. Declared-but-unused and absent technologies (do not claim)

| Technology | Status |
|---|---|
| PostgreSQL / `pg` | declared in `lib/db`; replaced by a throwing Proxy — **not used** |
| better-sqlite3 | declared; **not used** (node:sqlite instead) |
| `@workspace/api-client-react` | generated; **not imported** by the site |
| puppeteer, cheerio | dev scraping only |
| mockup-sandbox | Replit design sandbox, not product |
| Next.js, FastAPI (for the product), DuckDB, Pandas (for analytics), Redis, Docker, Kubernetes, GitHub Actions, Jest/Vitest/Playwright, LangChain, vector DBs, RAG, fine-tuning, scikit-learn, PyTorch | **absent** |

---

## 10. Skills needed to work on this stack independently

Foundational: JavaScript/TypeScript, HTML/CSS, SQL (joins, GROUP BY, CASE), HTTP/REST, Git, debugging with logs and devtools.
Framework: React hooks, React Query, Express routing/middleware, Zod schemas, Tailwind utilities.
Data: SQLite specifics (WAL, indexes, EXPLAIN QUERY PLAN), ETL design (idempotency, validation), cricket scoring rules.
Statistics: rates vs counts, binomial proportions, Wilson interval, shrinkage, percentiles, multiple testing, calibration, backtesting.
Ops: environment variables, build pipelines, bundling, performance measurement.

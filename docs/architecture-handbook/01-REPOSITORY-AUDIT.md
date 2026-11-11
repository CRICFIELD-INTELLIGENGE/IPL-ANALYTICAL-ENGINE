# 01 — Repository Audit (Phase A)

> **Audit date:** 2026-10-12. **Auditor stance:** everything below was checked against files on disk, the two SQLite databases (opened read-only) and commands that were actually run. Where something could not be verified it is labelled **Unverified**.
>
> **Evidence labels used throughout the handbook**
>
> | Label | Meaning |
> |---|---|
> | ✅ **Verified** | Code exists *and* was exercised (test, query, build, or live request) during this audit. |
> | 🟡 **Partial** | Code exists and partly works, or works only for some inputs. |
> | 🟠 **Mocked / hardcoded** | The UI shows values that do not come from the data, or come from a frozen snapshot. |
> | ⚪ **Planned** | Described in docs or comments, not implemented. |
> | 🔴 **Defect / debt** | Known bug, failing test, or risky construction. |
> | ❔ **Unverified** | Plausible from reading code, not executed in this audit. |

---

## 1. Where the project lives

| Item | Value |
|---|---|
| Outer folder | `C:\Users\KIIT0001\Downloads\Data-Insight-Engine\` (contains a 137 MB `Data-Insight-Engine.zip`, a second `sqlite.db` of 28 KB, and `scratch/`) |
| **Actual repository** | `Data-Insight-Engine/Data-Insight-Engine/` (git root) |
| Package manager | **pnpm workspaces** (`pnpm-workspace.yaml`, `pnpm-lock.yaml`) |
| Runtime | **Node.js 24.10** (verified with `node --version`). `node:sqlite` is used, which requires Node ≥ 22.5. |
| Original host | **Replit** (`.replit`, `replit.nix`, `replit.md`, commits titled “Published your App”) |
| Vercel | **No Vercel configuration exists in the repository** (no `vercel.json`, no `.vercel/`). Any claim that CricField is deployed on Vercel is **Unverified** from the repo. |

### Git history

- **19 commits**, dated 2026-05-06 → 2026-10-09 (`git log`).
  - 12 commits in May 2026 (Replit Agent era: “Initial commit”, “Add IPL analytics engine…”, “Published your App” ×3).
  - 7 commits on 2026-10-09, including `9289895 checkpoint: pre-video-engine-architecture-audit`, which alone added **2,041 files / 1.81 M lines** — i.e., months of work were committed in one checkpoint, so **git history cannot show how most features evolved**.
- **274 paths are uncommitted** right now (`git status --short`), including the whole Scout Lab API (`routes/scout.ts`, `services/scout/`), the Scout pages, the global data engine (`scripts/src/global`, `scripts/src/scout`, `scripts/src/step3*`), `docs/global-data-engine/`, and a modified `sqlite.db`.
- Author on all October commits: `Srihari1806`.

> **Interview implication.** You cannot point an interviewer at a commit history that shows your iteration. The best evidence of process is the `docs/global-data-engine/` folder (plans, before/after reports, patches, regression results). Committing the current work in logical chunks would materially improve your evidence.

---

## 2. Size and layout

| Measure | Value | How measured |
|---|---|---|
| Tracked files | 2,270 | `git ls-files \| wc -l` |
| Hand-written source (TS/TSX/MJS/PY in `src` folders) | ≈ **97,900 lines** | `wc -l` over `artifacts/*/src`, `scripts/src`, `lib/*/src` |
| Largest files | `pages/stats.tsx` 4,411 · `pages/player.tsx` 3,241 · `services/stats-aggregator.ts` 3,028 · `pages/shop.tsx` 1,803 · `pages/intelligence.tsx` 1,763 | `wc -l` |
| API endpoints | **123** route handlers in 9 route files | grep of `router.get/post` |
| Frontend routes | **≈ 75** `<Route>` entries in `App.tsx` (≈ 50 distinct pages + redirects) | `artifacts/ipl-analytics/src/App.tsx` |
| IPL warehouse | `sqlite.db` **119 MB** + 27 MB WAL, 25 tables | read-only dump |
| Global warehouse | `lib/cricket-data/global/warehouse/global.db` **79 MB**, 37 tables, 4 views | read-only dump |
| Raw IPL match JSON | `lib/cricket-data/raw/` **1,247 files, 112 MB** (gitignored) | `ls`, `du` |
| Raw IPL CSV | `ipl_csv/` 31 MB | `du` |
| Static site data | `artifacts/ipl-analytics/public/data/` 62 MB (largest: `player-recent-matches.json` 34 MB, now split into shards) | `ls -S` |
| Built frontend | `dist/public` 151 MB (mostly images); **one JS bundle of 4.11 MB (864 KB gzip)**, CSS 403 KB | measured with zlib |

### Directory map (what each top-level folder is for)

```
Data-Insight-Engine/                      ← git root, pnpm workspace
├─ artifacts/
│  ├─ ipl-analytics/        React 19 + Vite 7 SPA (the website)            ✅ main product
│  ├─ api-server/           Express 5 API on Node 24 (123 endpoints)       ✅ main product
│  ├─ image-ingestion/      Python photo pipeline (api.py, run_pipeline.py) 🟡 tooling
│  └─ mockup-sandbox/       Replit design-preview sandbox (Vite)           ⚪ not part of product
├─ lib/
│  ├─ db/                   Drizzle ORM schema + node:sqlite proxy client  ✅
│  ├─ api-spec/             OpenAPI 3.1 spec (19 paths) + Orval config     🟡 covers ~15% of API
│  ├─ api-zod/              Zod schemas generated from the spec            🟡
│  ├─ api-client-react/     React-Query hooks generated from the spec      🔴 not imported by the web app
│  └─ cricket-data/
│     ├─ raw/               1,247 Cricsheet IPL JSON files (gitignored)
│     ├─ aggregated/        derived JSON
│     └─ global/            Global engine: manifests (tracked), reports (tracked),
│                           raw archives + global.db (gitignored)
├─ scripts/                 ETL + audits. src/ is the real pipeline; the ~100 loose
│  │                        *.mjs/*.py files at scripts/ root are one-off photo
│  │                        scraping/cropping utilities.
│  └─ src/{global,scout,step3,step3_5}/   global engine, scouting, fix verification
├─ docs/
│  ├─ global-data-engine/   High-quality engineering docs (plan, reports, patches)
│  └─ architecture-handbook/   ← this handbook
├─ ipl_csv/                 Cricsheet IPL CSVs (source of sqlite.db deliveries)
├─ sqlite.db (+ -wal, -shm, .pre-delivery-fix.bak)   IPL warehouse
├─ schema.sql, migrations.sql, erd.md, database_inventory.md
├─ *.md at root (PROJECT_OVERVIEW, TECH_STACK, MASTER_ARCHITECTURE_HANDBOOK …)
│                           earlier, shorter docs from June–July 2026; several are now stale
├─ ~60 stadium/logo images at root (should live under public/ or assets/)
└─ scratch/                 ~90 ad-hoc debug scripts (tracked in part)
```

---

## 3. Verified technology stack

Only technologies **imported by running code** are listed. Versions come from `package.json` + the pnpm catalog.

| Layer | Technology | Evidence |
|---|---|---|
| Language | **TypeScript ~5.9** (strict typecheck runs), some **Python 3** for photo tooling | `package.json`, `tsconfig.base.json` |
| Frontend framework | **React 19.1**, **Vite 7**, **wouter 3** (routing), **TanStack React Query 5** (server state) | `ipl-analytics/package.json`, `App.tsx` |
| Styling | **Tailwind CSS 4** (`@tailwindcss/vite`), shadcn/ui-style components on **Radix UI** primitives, `class-variance-authority`, `tailwind-merge` | `components/ui/*`, `index.css` |
| Motion / 3D | **framer-motion 12**, **three.js 0.170** (cricket stadium replay) | `components/cricket3d/*` |
| Charts | **Recharts 2.15**, d3-scale-chromatic, hand-written SVG | `components/visualizations/*` |
| Client state | **zustand 5** (`lib/store`), React context (`lib/team-context.tsx`) | |
| Backend | **Express 5**, **Zod 3** validation, **pino / pino-http** logging, `cors` | `api-server/src/app.ts` |
| Optimisation | **javascript-lp-solver** (mixed-integer LP for Playing XI) | `services/decision/playing-xi.ts` |
| Database | **SQLite** via **`node:sqlite` (`DatabaseSync`)**; **Drizzle ORM** in `sqlite-proxy` mode for the legacy stats path | `lib/db/src/index.ts`, `services/decision/db.ts`, `services/scout/db.ts` |
| ETL | TypeScript run with **tsx**; `fflate` for zip reading; Node’s built-in test runner (`node --test`) | `scripts/package.json` |
| Build | **esbuild** (API bundle → `dist/index.mjs`), Vite (web → `dist/public`) | `api-server/build.mjs`, `vite.config.ts` |
| External data at runtime | Cricbuzz HTML/JSON scraping, Google News RSS, ESPNcricinfo RSS | `services/cricbuzz.ts`, `services/news.ts` |
| LLM | **Google Gemini 1.5 Flash REST API — optional, called from the browser** with a user-supplied key; plus a server-side clip router that also calls Gemini if `GEMINI_API_KEY` is set | `lib/gemini-client.ts`, `routes/clip-router.ts` |
| Analytics/ads | Google Analytics 4 + AdSense via `VITE_*` env vars, consent banner | `.env.example`, `components/consent-banner.tsx` |

**Present but not used by the product:** `pg` (PostgreSQL driver; `lib/db` replaces the Pool with a throwing Proxy — evidence of a Postgres→SQLite migration), `better-sqlite3` (declared, `node:sqlite` is used instead), `puppeteer`/`cheerio` (dev-only scraping), `@workspace/api-client-react` (generated but not imported), `mockup-sandbox`.

**Not present (do not claim):** Next.js, FastAPI, DuckDB, Pandas, PostgreSQL in production, Docker, CI/CD pipelines (no `.github/workflows`), authentication, Redis, any ML training framework, any vector database or RAG.

---

## 4. Major implemented features and their status

| Feature | Route(s) | Data source | Status |
|---|---|---|---|
| Homepage | `/home` | static JSON (`/data/*.json`) + `/api/ipl/news` + live scores | ✅ data-driven, with editorial content |
| Advanced Stats (filterable batting/bowling tables, matchups, scenarios, drilldowns) | `/stats` | `/api/stats/query`, `/drilldown`, `/matchup`, `/scenario` → `stats-aggregator.ts` (SQL path + JSON-replay path) | ✅ works; 🔴 legacy endpoint takes 3–5 s warm (measured in Step 3 docs) |
| Player profiles | `/players/:slug` | static JSON + per-player shards + `/api/intel/player/:key` | ✅ (fixed in Step 3: previously crashed by loading a 33 MB file) |
| Team / Venue profiles | `/teams/:slug`, `/venues/:slug` | static JSON + `/api/ipl/team-analytics`, `/api/intel/*` | ✅ ❔ not individually re-tested |
| Match Detail | `/match/:id` | `/api/ipl/match/:id/scorecard`, `/commentary`, `/api/intel/match/:id` | ✅; 🟠 `OversView` with random numbers exists but is **not rendered** (dead code) |
| My Dugout (franchise HQ) | `/dugout`, `/dugout/:team` | `/api/dugout/franchise`, `/api/dugout/squad` + photo registry | ✅ |
| Scout Lab (global talent) | `/scout`, `/scout/player/:id`, `/scout/compare`, `/scout/roles` | `/api/scout/*` → `global.db` | 🟡 **uncommitted**; API typecheck fails on `scout.ts:123` (`unique_name` not on `Rating`) |
| AI Analyst hub + 11 modules (Ask, Weakness, Pressure, Insight Feed, Strategy Sim, Alt Universe, Opposition Map, Decision Replay, Squad DNA, Auction War Room, Player Pool) | `/ai-analyst/*` | `/api/ask`, `/api/weakness`, `/api/pressure`, `/api/war-room/*`, … → `services/decision/*` | ✅ deterministic statistics/simulation; 🟠 snapshot “demo” fallbacks shown when API is unreachable |
| “Gemini LLM” tab on Ask page | `/ai-analyst/ask?tab=gemini` | browser → Gemini API with **user’s own key** | 🟠 **without a key it returns hardcoded text containing invented statistics, labelled “gemini-1.5-flash (Calibrated Quant Engine)”** (`lib/gemini-client.ts:105-140`) |
| Auction simulator (game) | `/auction` | `/api/auction/*` in-memory state machine, random AI bidders | ✅ game logic; not analytics |
| Scores / Pulse (live) | `/scores`, `/pulse` | Cricbuzz scraping (`services/cricbuzz.ts`) | ❔ depends on third-party site; 🟠 Pulse “emotion” bars include `Math.random()` (`pulse.tsx:137,168`) |
| Fan Arena / Beyond XI | `/arena` | mostly static content | 🟠 largely presentational |
| Shop | `/shop` | static | 🟠 presentational, no commerce backend |
| Intelligence hub, Feed (“2027 Intel”), Insights, Visualizations, Portal | various | static JSON + content modules (`content-engine-100.ts`, `strategy-2027-data.ts`) | 🟡 mix of computed and editorial content |
| Photo pipeline dashboard | `/photo-pipeline`, `/admin/photo-pipeline` | registry JSON | 🟡 internal tool, **publicly routed, no auth** |
| Global data engine (CLI) | — | Cricsheet → `global.db` | ✅ 23/23 tests pass |

---

## 5. Known defects and incomplete work (verified)

| # | Defect | Evidence | Severity |
|---|---|---|---|
| D1 | **Step 3 regression suite fails 4 of 15 tests** today (economy baseline drift after the Step 3.5 `sqlite.db` change on 2026-10-11; 20 player pages now “MISSING (empty page)”) | `npx tsx --test src/step3/tests/identity.test.ts src/step3/tests/step3-regression.test.ts` → pass 11, fail 4 | 🔴 release blocker until explained |
| D2 | API typecheck fails: `routes/scout.ts(123)` uses `unique_name` not present on `Rating` | `tsc --noEmit` in `artifacts/api-server` → exit 2 | 🔴 |
| D3 | Web typecheck: 11 errors, all in `components/cricket3d/*` | `tsc --noEmit` in `artifacts/ipl-analytics` → exit 2 | 🟡 pre-existing |
| D4 | Ingest script writes **random** `delivery_type` / `scoring_area` (`scripts/src/update-ipl-data-v3.ts:678-681`). The **current** DB values were later overwritten from ESPN commentary (`scratch/backfill-delivery-columns.mjs`; values now e.g. “Short of a length”, 95,511 NULLs). Re-running the ingest would silently re-introduce random data. | code + `GROUP BY delivery_type` on `sqlite.db` | 🔴 latent data-integrity risk |
| D5 | `deliveries.pressure_state` is `'Standard'` on all 295,732 rows, yet the SQL filter tests for `'Clutch'/'High'/'Playoff'` (`stats-aggregator.ts:1760-1768`). The code routes pressure filters to the JSON path, so the SQL branch is dead. | query + code | 🟡 |
| D6 | Economy residual: 13 bowlers on 17 deliveries (net −30 runs) cannot be exactly reconciled | `docs/global-data-engine/step3/economy-residuals.md` | 🟡 documented, not fully resolved |
| D7 | Gemini fallback fabricates statistics and labels them as a model | `lib/gemini-client.ts` | 🔴 trust / honesty risk |
| D8 | Single 4.1 MB JS bundle, no route-level code splitting (`React.lazy` count = 0) | measured | 🟡 performance |
| D9 | `CORS` fully open (`app.use(cors())`), no auth, no rate limiting, admin photo dashboard public | `app.ts` | 🟡 security |
| D10 | `global.db` is gitignored and the API server expects it at runtime; a clean deploy has no Scout Lab data unless the warehouse is built or shipped | `.gitignore:61-63`, `services/scout/db.ts` | 🔴 deployment gap |
| D11 | `artifacts/ipl-analytics/.env` is **tracked in git**. It holds only public `VITE_` identifiers (AdSense client, GA4 id, port), not secrets — but the pattern is risky. | `git ls-files` | 🟡 |
| D12 | Live scores depend on scraping cricbuzz.com with a spoofed browser User-Agent | `services/cricbuzz.ts:3-9,81` | 🔴 legal / reliability risk |
| D13 | Stale earlier docs at repo root contradict current code (e.g., they predate Scout Lab and the decision services) | root `*.md` dated June–July | 🟡 |
| D14 | `players.country` / `players.role` largely empty or wrong; `dismissals.fielder_id` all NULL; `matches.match_type` = “T20” everywhere; `seasons` champions NULL | project memory + queries | 🟡 known, worked around in code |

---

## 6. Tests and checks run during this audit

| Command (run from the folder shown) | Result |
|---|---|
| `scripts/`: `npx tsx --test src/global/tests/*.test.ts src/scout/tests/*.test.ts` | ✅ **23 / 23 pass** |
| `scripts/`: delivery-sequence test, run against a **copy** of `sqlite.db` | ✅ 3 / 3 pass |
| `scripts/`: `npx tsx --test src/step3/tests/identity.test.ts src/step3/tests/step3-regression.test.ts` | 🔴 **11 pass / 4 fail** |
| `artifacts/api-server`: `npx tsc -p tsconfig.json --noEmit` | 🔴 2 errors |
| `artifacts/ipl-analytics`: `npx tsc -p tsconfig.json --noEmit` | 🔴 11 errors (cricket3d) |
| `scripts`: `npx tsc -p tsconfig.json --noEmit` | ✅ 0 errors |
| Frontend unit / component / E2E tests | **None exist** |
| API contract tests | Only `scripts/src/scout/tests/api.test.ts` (checks the service, not HTTP) |

`sqlite.db` modification time was checked before and after: unchanged (`Oct 11 00:15`).

---

## 7. Estimated handbook scope and execution order

The handbook has 30 chapters plus 6 companion files. Because the most error-prone material is the data and statistics, the order is **data → statistics → API → architecture → UI → career**:

1. 01 Repository audit (this file)
2. 04 Database engineering, 05 Data pipelines
3. 06 Scouting & statistics
4. 08 API engineering
5. 02 System architecture + `ARCHITECTURE-DIAGRAMS.md`, 03 Technology stack
6. 07 Frontend, 09 AI audit, 10 Testing, 11 Performance & security
7. 12 Feature walkthroughs
8. 20–23 UI, UX, product case studies, data-visualisation
9. 24–27 Product management, business, solo-builder, portfolio readiness
10. 13, 14, 28 Skills and role matrices; 15 & 29 interview banks; 16 challenges; 17 roadmap; 18 resume evidence; 19 glossary
11. `00-EXECUTIVE-OVERVIEW.md`, `AUDIT-SUMMARY.md`, `README.md`, CSV files, PDF

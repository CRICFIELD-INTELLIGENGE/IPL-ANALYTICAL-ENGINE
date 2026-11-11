# Architecture Diagrams

All ten diagrams are Mermaid (render on GitHub, VS Code with a Mermaid extension, or mermaid.live). Each is followed by the files it describes, what moves across it, and where its boundaries are. Diagrams describe the code **as it is on 2026-10-12**, including the uncommitted Scout Lab work.

---

## 1. High-level system architecture

```mermaid
flowchart TB
  subgraph Client["Browser"]
    SPA["React 19 SPA<br/>artifacts/ipl-analytics"]
    LS[("localStorage<br/>team choice, Gemini key, consent")]
  end
  subgraph Static["Static assets (Vite build / public)"]
    JS["index-*.js 4.1 MB<br/>(864 KB gzip)"]
    PJ["/data/*.json 62 MB<br/>player shards, bios, squads"]
    IMG["~540 images"]
  end
  subgraph Server["Node 24 process — artifacts/api-server"]
    EX["Express 5 + pino + cors + Zod"]
    LEG["Legacy stats<br/>stats-aggregator.ts"]
    DEC["Decision Intelligence<br/>services/decision/*"]
    SC["Scout service<br/>services/scout/*"]
    LIVE["Live/news scrapers<br/>cricbuzz.ts, news.ts"]
    AUC["Auction game state<br/>(in-memory singleton)"]
    CACHE["In-memory caches<br/>column store ~25 MB, match JSON"]
  end
  subgraph Data["Local files"]
    IPL[("sqlite.db<br/>IPL warehouse")]
    GLB[("global.db<br/>6-league warehouse")]
    RAW["lib/cricket-data/raw/*.json<br/>1,247 match files"]
    SJ["api-server/data/*.json"]
  end
  subgraph External["Third parties"]
    CB["cricbuzz.com (scraped)"]
    RSS["Google News / ESPN RSS"]
    GEM["Google Gemini API"]
    GA["GA4 / AdSense"]
  end
  SPA -->|"fetch /api/*"| EX
  SPA -->|"fetch /data/*.json"| PJ
  SPA -.->|"optional, user's own key"| GEM
  SPA -.-> GA
  SPA <--> LS
  EX --> LEG & DEC & SC & LIVE & AUC
  LEG --> IPL & RAW & SJ
  DEC --> IPL & RAW & CACHE
  SC --> GLB
  LIVE --> CB & RSS
  EX -.->|"serves dist/public if present"| Static
```

**Files:** `artifacts/ipl-analytics/src/App.tsx`, `artifacts/api-server/src/{index,app}.ts`, `routes/index.ts`.
**Movement:** the browser pulls both *static JSON* (precomputed at build time) and *API JSON* (computed per request). Only the API touches SQLite.
**Boundaries:** one Node process does everything (HTTP, SQL, simulation, scraping). No queue, no worker, no separate DB server, no auth layer. The Gemini call is made **from the browser**, outside the server boundary.

---

## 2. Front-end component architecture

```mermaid
flowchart TB
  main["main.tsx"] --> App["App.tsx"]
  App --> QC["QueryClientProvider<br/>(refetchOnWindowFocus: false)"]
  QC --> TP["TooltipProvider"] --> TeamP["TeamProvider<br/>lib/team-context.tsx<br/>sets --team-* CSS vars"]
  TeamP --> WR["wouter Router (base = BASE_URL)"]
  WR --> ART["AnalyticsRouteTracker (GA4 page views)"]
  WR --> SW["Switch: ~75 routes"]
  TeamP --> CB["ConsentBanner"] & TO["Toaster"]
  SW --> PG["pages/*.tsx (≈50)"]
  PG --> LAY["components/layout.tsx<br/>left nav rail · top bar · right Intelligence Feed rail"]
  PG --> FEAT["Feature folders<br/>components/{scout,decision,dugout,match,visualizations,cricket3d,scrolltide,site}"]
  FEAT --> UI["components/ui/* (shadcn-style on Radix)"]
  PG --> HOOKS["Data hooks / clients<br/>lib/aggregates.ts (static JSON + some API)<br/>lib/scout-api.ts · sim-api.ts · discovery-api.ts<br/>ask-api.ts · dugout-api.ts · live.ts"]
  HOOKS --> RQ["React Query cache"]
  PG --> ZS["zustand store (lib/store.ts)<br/>analytics filters, live match id"]
```

**Files:** `App.tsx`, `components/layout.tsx`, `lib/*.ts`.
**Data movement:** pages call hooks; hooks call `fetch` and cache in React Query (keys like `["agg","top-batters"]`, `staleTime` 1 h for static JSON). Global UI state (chosen franchise) lives in React context + localStorage; filter state on Advanced Stats in zustand.
**Boundaries:** there is **no code splitting** — every page is imported statically into `App.tsx`, so the whole site ships in one 4.1 MB bundle.

---

## 3. Back-end request lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant P as pino-http
  participant X as cors / json / no-cache
  participant RT as Router
  participant Z as Zod schema
  participant S as Service
  participant Q as node:sqlite (sync)
  C->>P: HTTP request
  P->>X: log {id, method, url-without-query}
  X->>RT: set Cache-Control: no-store
  RT->>RT: warehouse guard (503 if DB missing)
  RT->>Z: safeParse(query/body)
  alt invalid
    Z-->>C: 400 {error, issues}
  else valid
    RT->>S: call with typed input
    S->>Q: prepare(sql).all(params)
    Note over Q: blocks the event loop<br/>until rows return
    Q-->>S: rows
    S-->>RT: domain object | null
    RT-->>C: 200 JSON | 404 {error code}
  end
  P->>P: log {statusCode, responseTime}
```

**Files:** `src/app.ts`, `routes/scout.ts` (exemplary), `routes/ipl.ts` (no Zod; `500 {error: err.message}`).
**Boundary to remember:** because the SQLite driver is synchronous, “concurrent” requests are processed one after another; measured 10 parallel Advanced Stats queries → 24 s.

---

## 4. Data ingestion and ETL pipeline

```mermaid
flowchart LR
  subgraph A["Pipeline A — IPL (manual)"]
    a1["ipl_csv/*.csv"] --> a2["update-ipl-data-v3.ts<br/>DROP + CREATE + INSERT"] --> a3[("sqlite.db")]
    a3 --> a4["compute_analytics.ts"] --> a3
    a5["raw/*.json"] --> a6["aggregate-ipl.ts"] --> a7["public/data/*.json"]
    a8["scratch/*.mjs fixes<br/>(commentary, names)"] -.-> a3
    a9["2026-10-11 sequencing fix<br/>(script not in repo)"] -.-> a3
  end
  subgraph B["Pipeline B — Global engine (global:sync)"]
    b1["sources.json"] --> b2["acquire.ts<br/>HEAD/If-Modified-Since,<br/>CRC-32, SHA-256"] --> b3["immutable archives"]
    b3 --> b4["normalize.ts<br/>incremental by entry CRC"] --> b5[("global.db")]
    b6["people.csv / names.csv"] --> b7["identity.ts"] --> b5
    b5 --> b8["aggregate.ts"] --> b5
    b5 --> b9["validate.ts<br/>118 checks, exit 2 on fail"] --> b10["reports/*.md"]
    b5 --> b11["scout/build.ts<br/>roles · variance · coverage · attributes"] --> b5
  end
  a3 -. "read-only identity bridge" .-> b7
```

**Files:** `scripts/src/update-ipl-data-v3.ts`, `compute_analytics.ts`, `aggregate-ipl.ts`, `scripts/src/global/*.ts`, `scripts/src/scout/*.ts`.
**Boundary:** Pipeline B never writes to `sqlite.db`. Pipeline A is not reproducible from the repo (Chapter 5 §8).

---

## 5. Database relationships

```mermaid
erDiagram
  competitions ||--o{ matches : has
  competitions ||--o{ seasons : has
  matches ||--|{ innings : has
  innings ||--|{ deliveries : "has (PK match,innings,over,seq)"
  deliveries ||--o{ wickets : "may have"
  wickets ||--o{ wicket_fielders : credits
  players ||--o{ deliveries : "batter/bowler/non_striker"
  players ||--o{ player_names : "variants"
  players ||--o{ player_source_ids : "key_* ids"
  players ||--o{ identity_links : "linked from other systems"
  players ||--o{ agg_batting : "per comp·season·phase"
  players ||--o{ agg_bowling : "per comp·season·phase"
  players ||--o{ scout_roles : "per comp·season"
  players ||--o{ player_attributes : "style/hand/capped"
  competitions ||--o{ competition_baselines : "league totals"
  competitions ||--o{ scout_phase_variance : "Σx, Σx², n"
```

This is the **global** warehouse (the IPL warehouse ERD is in Chapter 4 §3.3). Every aggregate has the same grain as its league baseline, which is what makes `index = 100 × actual / expected` a simple join.

---

## 6. Scouting engine processing

```mermaid
flowchart TB
  Q["RatingQuery<br/>discipline · competitions · phase · window · minBalls · roles"] --> W["windowSeasons()"]
  W --> R1["SELECT agg_batting|agg_bowling<br/>per player-season"]
  R1 --> L["League rates per season<br/>Σa/Σn over ALL players"]
  R1 --> P["Pool per player:<br/>actual Σa, expected Σ n·r_s"]
  L --> P
  V["scout_phase_variance → per-ball σ²"] --> CI
  P --> IDX["index = 100·actual/expected"]
  IDX --> SH["shrunk = (n·index + 120·100)/(n+120)"]
  IDX --> CI["95% CI: Wilson (proportions)<br/>normal approx (SR/economy)"]
  RO["scout_batting/bowling_innings → battingRole()/bowlingRole()"] --> F
  SH --> F{"role filter"}
  F --> PCT["percentileRanks(shrunk) within comp,<br/>balls ≥ minBalls, direction-aware"]
  PCT --> OUT["Rating[]"]
  OUT --> API["routes/scout.ts: search · sort · paginate<br/>⚠ no minBalls filter · ⚠ bowling sort direction"]
```

**Files:** `services/scout/scout-service.ts:269-489`, `routes/scout.ts:78-188`.

---

## 7. Player profile data flow (`/players/:slug`)

```mermaid
flowchart LR
  U["URL slug"] --> PK["lib/player-key.ts<br/>slug → bio key"]
  PK --> IDX["/data/player-recent-matches/index.json<br/>(67 KB, cached 1 h)"]
  IDX -->|"exact registry id or empty state"| SH["/data/player-recent-matches/&lt;id&gt;.json<br/>(median 4.2 KB)"]
  PK --> BIO["/data/player-bio.json"]
  PK --> SEAS["/data/player-season-stats.json<br/>/data/top-batters.json · top-bowlers.json"]
  PK --> INT["/api/intel/player/:key<br/>(decision layer)"]
  PK --> MU["/api/stats/matchup"]
  SH & BIO & SEAS & INT & MU --> PAGE["pages/player.tsx (3,241 lines)<br/>hero · career · seasons · recent matches · intel panels"]
```

**Why it matters:** before Step 3 the page loaded one 33 MB JSON for every player and crashed; now it loads a 67 KB index + one shard. The identity rule is exact-only, so an unverified bio shows an empty state instead of another player’s matches.

---

## 8. War Room data flow

```mermaid
flowchart TB
  AL["2026 auction list CSV (369)"] --> B["buildBoard(view)"]
  SALES["player-auctions.json<br/>sales 2014+ (soldLakh)"] --> FIT["fitModel(asOf)<br/>372 sales 2021–25"]
  WH[("sqlite.db")] --> PROF["player-profiles.ts<br/>season lines, baselines"] --> IMP["impact-model.ts<br/>runs/match above avg"]
  IMP --> FEAT["featuresAsOf(id, asOf)<br/>no look-ahead"]
  FEAT --> REPL["replacement = 20th pct regular"]
  FEAT & REPL --> IAR["IAR = impact − replacement"]
  FIT --> KNN["kNN comparable sales (k=15)<br/>→ market M + basis"]
  IAR --> VAL["V = IAR·reliability·median ₹ per IAR<br/>capped at record fee"]
  KNN & VAL --> SIG["BUY / HOLD / AVOID / SCOUT · max bid"]
  DNA["squad-dna.ts gaps"] --> FITS["fitFor(): 0–100 + reasons"]
  SIG & FITS --> BOARD["/api/war-room/board"]
  BOARD --> BT["backtestSummary(): Spearman, typical miss,<br/>projection ρ (2026: 0.17, n=9)"]
  BOARD --> UI["pages/ai-analyst-auction.tsx"]
```

---

## 9. AI Analyst request flow

```mermaid
flowchart TB
  subgraph SQLTab["‘SQL Database’ tab — deterministic"]
    Q1["User question"] --> P1["POST /api/ask"]
    P1 --> NL["nl-parser.ts<br/>phrase → typed StatQuery fields<br/>(no SQL, no LLM)"]
    NL --> SE["stats-engine.ts<br/>StatQuery → parameterised SQL<br/>additive components → ratios in TS"]
    SE --> DB[("sqlite.db")]
    SE --> ANS["answer sentence + table + ‘READ AS’ chips"]
    ANS -->|"user edits a chip"| P2["POST /api/ask/run (strict Zod StatQuery)"] --> SE
  end
  subgraph GemTab["‘Gemini LLM’ tab — browser only"]
    G1["User prompt"] --> K{"API key in env or localStorage?"}
    K -->|yes| G2["fetch generativelanguage.googleapis.com<br/>gemini-1.5-flash, key in URL"] --> G3["markdown text, no grounding, no validation"]
    K -->|"no / error"| G4["generateCalibratedFallback()<br/>⚠ hardcoded text with invented numbers,<br/>labelled ‘Calibrated Quant Engine’"]
  end
```

**Files:** `routes/decision.ts:138-171`, `services/decision/nl-parser.ts`, `stats-engine.ts`, `ipl-analytics/src/lib/gemini-client.ts`.

---

## 10. Deployment and build process

```mermaid
flowchart LR
  DEV["Developer machine / Replit"] --> INST["pnpm install (workspace)"]
  INST --> TC["pnpm run typecheck<br/>(tsc --build libs + per-package --noEmit)<br/>⚠ currently fails: API 2 errors, web 11"]
  TC --> BW["vite build → ipl-analytics/dist/public"]
  TC --> BA["node build.mjs (esbuild) → api-server/dist/index.mjs<br/>banner defines __dirname/require"]
  BA --> RUN["node --enable-source-maps dist/index.mjs<br/>PORT=5000"]
  BW --> RUN
  RUN -->|"serves /api + SPA fallback"| USERS["Users"]
  subgraph Replit[".replit"]
    AS["deploymentTarget = autoscale"]
    PM["post-merge.sh: pnpm install + drizzle-kit push → sqlite.db ⚠"]
  end
  DATA["Must ship alongside: sqlite.db (+WAL), lib/cricket-data/raw (gitignored), global.db (gitignored), public/data shards"] -.-> RUN
```

**Facts:** root `build` = typecheck then `pnpm -r build`, so a failing typecheck blocks a clean build. The API bundle was last built 2026-10-12 15:50. There is **no CI** (no `.github/workflows`), **no container**, **no Vercel config**. Autoscale hosting with a local SQLite file means each instance has its own copy; writes (click counter, auction state) are not shared between instances.

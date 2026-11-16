# CricField: IPL Analytical Engine

CricField is an IPL analytics website (https://www.cricfield.in) with the data pipeline and analytics engine behind it. The repository has three parts:

| Part | What it is | Code |
|---|---|---|
| **CricField product** | React single-page site: stats, players, venues, teams, Dugout articles, Scout, Arcade, Retention Room | `artifacts/ipl-analytics` |
| **Analytics engine** | Express API and models: decision intelligence, player intelligence, pressure reliability, retention, scouting | `artifacts/api-server`, `lib/arcade-rules` |
| **Cricket data pipeline** | Builds the warehouses and the static JSON the site serves | `scripts/`, `lib/cricket-data/`, `artifacts/api-server/scripts/` |

> **How production works:** Vercel deploys only the static frontend. No API runs in production. Pages read committed JSON from `artifacts/ipl-analytics/public/data/`, and every API-only feature needs a separately running API. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Features

### Implemented (in production, static)

- IPL statistics, records, season, team, venue and player pages, built from Cricsheet ball-by-ball data covering 2008–2026 (1,243 matches in the local warehouse)
- Pressure Reliability rankings, from the published snapshot `public/data/pressure-reliability.json`
- Batter Lens explorer (`public/data/batter-lens/`)
- Dugout editorial articles, the Feed / Pulse desk and Retention Room views that read committed data (for example `public/data/retention-intelligence-master.json`)
- A separate mobile shell below 1024px (`src/mobile`)

### Implemented (requires the API; not available on the static site)

- Decision Intelligence: natural-language stat questions (`/api/ask`), playing-XI optimiser, strategy simulator, alternate-universe what-ifs, opposition map, squad DNA, auction war room ([docs/SCENARIO_INTELLIGENCE.md](docs/SCENARIO_INTELLIGENCE.md))
- Scenario statistics (`/api/scenario-intelligence`)
- Player Intelligence: price, value and franchise fit from published model snapshots
- Scout over the multi-league warehouse: IPL, SMAT, BBL, CPL, SA20, ILT20 and men's T20Is (`global.db`)
- Arcade games, with live rooms served by the API
- Admin-only routes (data sync, retention freeze, video catalogue), guarded by `ADMIN_API_TOKEN`

### Experimental (off by default)

- **AI Analyst and Scout AI:** an LLM answers using only CricField tool evidence. Needs `AI_ANALYST_ENABLED=true` and a provider ([docs/AI_ANALYST.md](docs/AI_ANALYST.md)).
- AI ball commentary (`AI_COMMENTARY_ENABLED`)
- Platform notifications worker (`PLATFORM_WORKER_ENABLED`) and the WhatsApp prototype (`integrations/whatsapp-prototype`)

### Not available: failed validation

- The retention-probability forecast fails its calibration gate, so no percentages are published.
- Season simulation failed its gate and is switched off.

See [docs/ANALYTICS_METHODOLOGY.md](docs/ANALYTICS_METHODOLOGY.md).

### Planned / open

- Re-test the retention forecast after the 2027 retentions ([docs/player-intelligence/README.md](docs/player-intelligence/README.md) §9)
- No hosted production API and no CI exist yet ([docs/TESTING.md](docs/TESTING.md))

## Tech stack

From the package manifests: React 19.1 · Vite 7 · Tailwind CSS 4 · wouter · TanStack Query · Recharts · Express 5 · Node `node:sqlite` · Drizzle (`sqlite-proxy`) · zod · pino · `javascript-lp-solver` · Playwright · pnpm 11 workspace · TypeScript 5.9. Python is used for model fitting and some data scripts.

## Quick start

```bash
pnpm install
```

```bash
pnpm --filter @workspace/ipl-analytics run dev
```

The dev server proxies `/api` and starts the API if none is running. Most API features need the git-ignored `sqlite.db` at the repo root. Full setup: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

| Topic | Doc |
|---|---|
| System design, packages, request flow | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Pipelines and where data comes from | [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md) |
| SQLite stores, tables, IDs | [docs/DATABASE.md](docs/DATABASE.md) |
| All 241 API routes | [docs/API_REFERENCE.md](docs/API_REFERENCE.md) |
| Models and validation status | [docs/ANALYTICS_METHODOLOGY.md](docs/ANALYTICS_METHODOLOGY.md) |
| AI Analyst | [docs/AI_ANALYST.md](docs/AI_ANALYST.md) |
| Scenario statistics and simulators | [docs/SCENARIO_INTELLIGENCE.md](docs/SCENARIO_INTELLIGENCE.md) |
| Local setup | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Vercel and releases | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Checks and test suites | [docs/TESTING.md](docs/TESTING.md) |
| Repository audit and restructure proposal | [docs/REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md) |

Older reports (`DAY-*-REPORT.md`, `MASTER_ARCHITECTURE_HANDBOOK.md` and others), now in [docs/history/](docs/history/), are historical records. Where they disagree with the docs above, the docs above were checked against the code on 2026-11-16.

## Data and licence

Match data is derived from [Cricsheet](https://cricsheet.org) under ODC-BY 1.0. The code is licensed under the MIT License (see [LICENSE](LICENSE)). Player photos and editorial images have their own rights and are not covered by the code licence.

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md) · Security: [SECURITY.md](SECURITY.md)

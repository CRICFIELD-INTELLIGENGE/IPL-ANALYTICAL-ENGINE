# CricField browser smoke suite (Playwright)

Committed replacement for the Day 7 in-page browser crawl (defect register CH10-G4, S7-5).

```bash
pnpm --filter @workspace/ipl-analytics run test:e2e
```

That one command builds the web app, starts its own servers, warms every route once, runs everything, and stops
the servers:

| Server | Port | How |
|---|---|---|
| API | 5065 | `tsx src/index.ts` in `artifacts/api-server` with **`CRICFIELD_DB_READONLY=1`** (warehouse opened read-only) |
| Web | 3066 | `vite build --outDir e2e/.dist`, then `vite preview` of it, `/api` proxied to 5065. The app's own `dist/` is not touched |

The ports differ from `.claude/launch.json` (5055 / 3055), so the suite can run while those dev servers are up.
The production build is the default because the Vite dev server serves hundreds of unbundled modules to every
fresh browser context and timed pages out under parallel load on this laptop (`E2E_MODE=dev` still works, slowly).

## What it checks

**`smoke.spec.ts`**: every route in `docs/day07/route-api-matrix.json` (52 paths: grouped entries split, redirect
sources included, parameterised routes filled with the Day 7 ids: `/match/1473469`, `/players/v-kohli`,
`/players/wanindu-hasaranga`, `/venues/wankhede-stadium`, `/teams/mumbai-indians`, `/scout/player/456`,
`/dugout/royal-challengers-bengaluru`), in two projects: `desktop` 1280×800 and `mobile` 375×812 (touch, DPR 3).
Each route must:

- show a visible heading and a non-empty `<main>` (the unknown route must show the 404 page);
- log no console errors, uncaught errors or unhandled rejections;
- get no `/api` or `/data` response with status >= 400 (aborted requests are ignored);
- have no broken image (`complete && naturalWidth === 0`);
- on mobile, have no page-level horizontal scroll (`scrollWidth <= innerWidth`). Each mobile result also carries a
  `layout` annotation (main / rail / h1 boxes, rail overlap and h1 clipping in px) for the DAY-07 §2 right-rail question.

**`journeys.spec.ts`** (desktop only), from DAY-07-REPORT §3:

- Scout: search "Bumrah", pick the suggestion, land on the dossier (`Capped 2026` shown).
- AI Analyst Ask (SQL mode): "Most runs in IPL 2025" → the B Sai Sudharsan row shows 759.
- Auction: Single-Player → franchise #2 (CSK) → Enter → Start → Pause → Reset, each step confirmed against
  `/api/auction/state`; purses back to ₹120 Cr and squads empty. The auction is one global in-memory game, so the
  suite also `POST /api/auction/reset`s before and after.

Nothing writes the warehouse: the API is read-only and the journeys only touch in-memory auction state.

## Known mobile overflow (open defect)

With a real 375 px viewport, 8 routes are wider than the screen: `/scout` (378 px), `/scout/player/456` (415),
`/scores` (540), `/players/v-kohli` and `/players/wanindu-hasaranga` (1,090), `/venues/wankhede-stadium` (399),
`/teams/mumbai-indians` (653), `/shop` (381). The collapsed right Intelligence rail (56 px, sticky, z-index 2000)
then sits over the overflowing content. These routes are listed in `KNOWN_MOBILE_OVERFLOW` (`smoke.spec.ts`). For
them the suite asserts that the overflow is **still present**, so it fails the day one is fixed and the entry
can be removed. Every other check still applies to those routes.

## Options (environment variables)

| Variable | Effect |
|---|---|
| `E2E_MODE=dev` | Use the Vite dev server on 3065 instead of a production build (no build step; much slower per page). In dev mode `/photo-pipeline` renders the admin page; in a production build it is the 404 page. |
| `E2E_BASE_URL=http://localhost:3055` | Test servers that are already running; nothing is started. Make sure that API runs with `CRICFIELD_DB_READONLY=1`. |
| `E2E_CHANNEL` | Browser. Default `chrome` (the installed Google Chrome, no download). `E2E_CHANNEL=` (empty) uses Playwright's bundled Chromium after `pnpm exec playwright install chromium`. |
| `E2E_STRICT_LAYOUT=1` | Apply the no-horizontal-scroll rule to the known-overflow routes too (below). |
| `E2E_WORKERS` | Parallel workers (default 2; more overloads the dev server on a laptop). |
| `E2E_API_PORT`, `E2E_WEB_PORT` | Override the ports above. |

Run one part: `pnpm --filter @workspace/ipl-analytics run test:e2e --project=mobile` or `... run test:e2e journeys` (no `--`: pnpm would pass it through and Playwright then ignores the filter).

Output (git-ignored): `e2e/.report/` (HTML report: `pnpm exec playwright show-report e2e/.report`) and
`e2e/.results/` (traces and screenshots of failures, `results.json` with the mobile layout annotations).

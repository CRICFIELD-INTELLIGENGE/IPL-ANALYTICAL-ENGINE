# IPL Analytics Engine

A Cricbuzz/ESPNCricinfo-style cricket portal that pairs a clean, fast UI with deep analytics — featuring live IPL 2026 scores, real-time news, and 18 seasons of historical data.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/ipl-analytics run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod schemas (only for `/api/ipl/*` historical endpoints; `/api/live/*` is intentionally outside the OpenAPI spec)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, pino logging
- Frontend: React 18 + Vite + wouter + TanStack Query + Tailwind
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec, historical endpoints only)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/services/cricbuzz.ts` — live data scraper (Cricbuzz HTML + ESPN RSS)
- `artifacts/api-server/src/routes/live.ts` — live data endpoints (`/api/live/*`)
- `artifacts/api-server/src/routes/ipl.ts` — historical IPL data endpoints (`/api/ipl/*`)
- `artifacts/ipl-analytics/src/lib/live.ts` — frontend live-data React Query hooks
- `artifacts/ipl-analytics/src/index.css` — design tokens / color palette
- `artifacts/ipl-analytics/src/pages/` — all top-level pages (home, matches, match-detail, news, stats, dashboard, business, records)
- `lib/api-spec/openapi.yaml` — source of truth for historical API contract

## Architecture decisions

- **Live data via server-side scraping.** Cricbuzz's `/cricket-match/live-scores` page embeds match data in Next.js RSC chunks (`self.__next_f.push`); we extract and parse it server-side with a brace-depth JSON walker. ESPN Cricinfo RSS is parsed with regex (no extra deps). All live calls are cached in-memory (30s for matches, 60s for news) with stale-fallback on upstream failure.
- **Live endpoints intentionally bypass OpenAPI codegen** to keep iteration fast on volatile upstream shapes; the frontend fetches them via a small typed helper in `src/lib/live.ts`.
- **Cache hardening**: cache is capped at 32 keys with insertion-order eviction; news `category` query param is allowlisted (`general`/`ipl`) before being used as a cache key.
- **Color palette = "Pitch & Trophy"**: deep cricket-pitch emerald (`160 84% 22%`) primary, warm trophy amber (`38 92% 50%`) accent, crimson (`0 84% 50%`) live indicator, off-white background.
- **Routing**: wouter is mounted with `base={import.meta.env.BASE_URL}` so the artifact works correctly under its proxied path prefix.

## Product

- **Home**: live & upcoming match strip, hero news story, latest-news sidebar, all-time stats summary, featured stories, top run-getters/wicket-takers, recent champions.
- **Matches**: Live / Upcoming / Recent / All tabs with auto-select-first-non-empty UX, IPL-only vs all-cricket scope toggle, manual refresh button, 30s auto-refresh.
- **Match detail** (`/match/:id`): scorecard with team scores, overs, run-rates, venue, format, status.
- **News**: Hero story + grid layout with All Cricket / IPL category tabs, click-out to ESPN Cricinfo.
- **Stats / Dashboard / Business / Records**: rich historical analytics across 18 IPL seasons.

## User preferences

- Surprise-me color palette chosen by the user — keep emerald/amber/crimson "Pitch & Trophy" theme unless asked to change.

## Gotchas

- Do not call `pnpm run dev` at workspace root — use the per-artifact workflows instead.
- The Cricbuzz scraper depends on the structure of their RSC payload; if matches stop appearing, check `extractAllJsonObjects` in `services/cricbuzz.ts` and look for the `"matchInfo":{` marker in the upstream HTML.
- The `addListener is undefined` runtime error in dev console is a benign matchMedia shim issue from a UI dependency — does not affect rendering.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

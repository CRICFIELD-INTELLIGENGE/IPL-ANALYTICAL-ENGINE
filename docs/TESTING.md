# Testing

There is **no CI** in this repository: `.github/` contains only a PR template, and Vercel only builds the frontend. Every check below runs locally. Run them before opening a PR.

| Check | Command (from repo root unless noted) | Needs |
|---|---|---|
| Library typecheck | `pnpm run typecheck:libs` | — |
| Web typecheck | `pnpm --filter @workspace/ipl-analytics run typecheck` | — |
| API typecheck | `pnpm --filter @workspace/api-server run typecheck` | — |
| Scripts typecheck | `pnpm --filter @workspace/scripts run typecheck` | — |
| Everything typecheck | `pnpm run typecheck` | — |
| Web build (what Vercel runs) | `pnpm --filter @workspace/ipl-analytics run build` | — |
| API build | `pnpm --filter @workspace/api-server run build` | — |
| API tests | in `artifacts/api-server`: `node --import ./test/test-readonly-env.mjs --import tsx --test --test-isolation=none test/*.test.ts` | `sqlite.db`; some tests need `global.db` or the git-ignored official data |
| Web unit test | in `artifacts/api-server`: `TSX_TSCONFIG_PATH=../ipl-analytics/tsconfig.json node --import tsx --test ../ipl-analytics/src/lib/pulse-auction.test.ts` (the web package has no `tsx`, and the test needs the `@/` path alias) | — |
| Global warehouse tests | `pnpm --filter @workspace/scripts run test:global` | `global.db` |
| Step 3 tests | `pnpm --filter @workspace/scripts run test:step3` | `sqlite.db`, `lib/cricket-data/raw/` |
| Browser smoke and journeys | `pnpm --filter @workspace/ipl-analytics run test:e2e` | Chrome; starts its own API :5065 and web :3066 ([e2e/README.md](../artifacts/ipl-analytics/e2e/README.md)) |
| Supabase policies | `supabase/tests/` | Supabase CLI. Not run in this audit. |

## Rules that keep tests safe

- Every API and scripts test preloads a `test-readonly-env.mjs` that sets `CRICFIELD_DB_READONLY=1`, so a test can never write the production `sqlite.db`.
- Tests that write use a **copy** passed by path (`CRICFIELD_DB_PATH`).
- Use ports other than the ones your dev servers use. The e2e suite defaults to 5065 / 3066.

## Recorded baseline

The results recorded on 2026-11-16 for branch `refactor/repository-architecture`, including the failures that were already present, are in [refactor/BASELINE.md](refactor/BASELINE.md).

# Development

## Requirements

- Node.js ≥ 20 (the API uses the built-in `node:sqlite`; development has used Node 24–26) and pnpm (`packageManager: pnpm@11.1.2`).
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`: new package versions install only once they are a day old. Do not disable it.
- Python 3 only for `intelligence:fit` and the image-ingestion / audit scripts.
- Local data that is **not in git** and that you must obtain separately:
  - `sqlite.db` at the repo root (the IPL warehouse, about 111 MB). Most API features need it.
  - `lib/cricket-data/global/warehouse/global.db` for Scout. You can rebuild it with `pnpm --filter @workspace/scripts run global:sync`.
  - `lib/cricket-data/raw/` for `aggregate-ipl`.

## Install and run

```bash
pnpm install
```

```bash
pnpm --filter @workspace/ipl-analytics run dev
```

The Vite dev server (`artifacts/ipl-analytics/vite.config.ts`) proxies `/api` to the API on `VITE_BACKEND_PORT` (default 5000). If no compatible API is listening there, it starts one itself. Set `CRICFIELD_API_AUTOSTART=0` to turn that off. Set the web port with `PORT`.

To run the API on its own:

```bash
pnpm --filter @workspace/api-server run dev
```

The API listens on `PORT` (default 5000). Windows users can also double-click `START-CRICFIELD.bat` to get the API on :5000 and the site on :3000.

## Environment

`.env.example` lists, by name only, every variable the code reads. Where values go:

- **API (server-only):** `src/lib/load-env.ts` loads `env/api.env` at the repo root, if that file exists, and variables set by the host take precedence. `/env/*.env` is git-ignored.
- **Frontend (`VITE_*`):** Vite reads `artifacts/ipl-analytics/.env` / `.env.local` (git-ignored).

Rules:

- Anything prefixed `VITE_` is compiled into the public bundle. Never put a secret behind `VITE_`.
- Keep `CRICFIELD_DB_READONLY=1` unless you are deliberately writing a **copy** of the warehouse, which you select with `CRICFIELD_DB_PATH`.

## Layout

See [ARCHITECTURE.md](ARCHITECTURE.md). Short version:

- `artifacts/ipl-analytics/src/pages` holds the pages (routes are in `src/App.tsx`). `src/mobile` is a separate mobile shell below 1024px; desktop changes must not alter it.
- `artifacts/api-server/src/routes` holds HTTP handlers, and `src/services` holds the logic and models.
- `artifacts/ipl-analytics/public/data` holds the static JSON the production site serves.

## Generated code

`lib/api-zod` and `lib/api-client-react/src/generated` are generated from `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Conventions

- TypeScript project references: `pnpm run typecheck:libs` builds `lib/*` declarations, and each app has its own `typecheck` script.
- Formatting: Prettier 3 (root `devDependencies`), plus `.editorconfig`.
- Commit style: Conventional Commits (`feat(scope): …`, `docs(…)`, `chore: …`), as in `git log`.
- Never commit `.env*`, `*.db`, the SQLite sidecar files or the official challenge data (see `.gitignore`).

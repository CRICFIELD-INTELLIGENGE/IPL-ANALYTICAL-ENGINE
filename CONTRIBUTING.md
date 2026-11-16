# Contributing to CricField

## Workflow

1. Branch from `main` (`feat/…`, `fix/…`, `docs/…`, `refactor/…`). **Never push to `main` directly**, because every push to `main` deploys production (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
2. Set up locally with [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
3. Keep the change small and stage only your own files.
4. Run the checks in [docs/TESTING.md](docs/TESTING.md). At minimum, the typechecks and the web build must match the baseline: no new errors.
5. Use Conventional Commits (`feat(scope): …`, `fix: …`, `docs: …`).
6. Open a PR with the template filled in.

## Data rules

- Do not change raw datasets, player IDs or the warehouses (`sqlite.db`, `global.db`) without a written repair plan, a backup and before/after checksums. Past repairs are under `docs/data-repairs/`.
- Test against database **copies** (`CRICFIELD_DB_PATH`) and keep `CRICFIELD_DB_READONLY=1` everywhere else.
- If you edit a JSON file that exists in both `artifacts/api-server/data/` and `artifacts/ipl-analytics/public/data/`, update both copies or explain in the PR why only one changed.
- Cricsheet data is ODC-BY 1.0. Keep attribution.
- The official challenge data (`lib/cricket-data/official/`, `artifacts/api-server/data/pressure-official/`) must never be committed.
- `scripts/data-release.mjs` can fingerprint datasets. Its output folder `data-release/` is git-ignored.

## Secrets

Never commit `.env` files, `env/*.env`, API keys or tokens. Server credentials must never use the `VITE_` prefix. `.env.example` lists names only. See [SECURITY.md](SECURITY.md).

## UI changes

Desktop (≥1024px) and the mobile shell (`artifacts/ipl-analytics/src/mobile`) are separate trees. A desktop change must leave the mobile shell unchanged unless the PR says otherwise. Attach screenshots for both.

# Security policy

## Supported code

Only the `main` branch (what https://www.cricfield.in serves) receives security fixes. There are no versioned releases.

## Reporting a vulnerability

Report privately through a GitHub security advisory:
https://github.com/CRICFIELD-INTELLIGENGE/IPL-ANALYTICAL-ENGINE/security/advisories/new

Do not open a public issue for a vulnerability.

## What is in place

- **Secrets:** `.env`, `.env.*` (except `.env.example`) and `/env/*.env` are git-ignored. The API reads secrets only from the host environment or `env/api.env`. `VITE_*` values are public by design and must never hold secrets.
- **Admin routes:** `requireAdmin` (`artifacts/api-server/src/lib/admin-auth.ts`) answers 404 unless `ADMIN_API_TOKEN` (at least 24 characters) is set, and compares tokens in constant time.
- **Signed-in routes:** bearer tokens are verified against Supabase (`services/platform/auth.ts`). Row-level security policies live in `supabase/migrations/`.
- **HTTP:** security headers, a CORS allow-list (`CORS_ORIGINS`), 100 kB body limit, per-client rate limits and generic public errors (`src/app.ts`, `src/lib/http-security.ts`).
- **Data:** the deployed API opens the warehouse read-only (`CRICFIELD_DB_READONLY=1`), and tests force the same.
- **Supply chain:** `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440`.

## Known items for maintainers

The repository audit of 2026-11-16 ([docs/REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md#possible-secrets)) recorded possible secrets by location only. No live credential was found in tracked files.

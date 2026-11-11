# CricField launch audit — 28 October 2026

## Baseline and scope

Audit of the existing working tree, including its extensive staged, modified and untracked work. No reset, checkout, content publication, database migration or deployment is authorized by this audit. Baseline status is saved in `launch-evidence/baseline-git-status.txt`. This report is created before implementation changes and will be supplemented with verification results.

Architecture: pnpm monorepo; React/TypeScript/Vite frontend in `artifacts/ipl-analytics`, Express 5 API in `artifacts/api-server`, SQLite access through `lib/db` and read-only `node:sqlite` analytical services. Frontend routes are lazy loaded in `src/App.tsx`. API router mounts IPL, live, auction simulation, 2027 manual desk, decision intelligence, Scout, arcade and video routes. Data includes SQLite warehouses, JSON catalogues and CSV deliveries. Existing Playwright and Node test suites are available. No AGENTS.md was found in the application repository.

Public features inspected include Home, Feed and categories, Pulse, Dugout, players/teams/venues, Scout, analytical tools, games, articles, and information pages. Internal photo/editorial routes are gated by build environment. Existing image and article build gates must remain intact.

Baseline: workspace typecheck passed; frontend production build passed (150 seconds, chunk warning); API production build passed. API tests initially failed to connect to their own loopback servers with EACCES; a rerun with local network access is in progress. Dependency audit initially could not access the registry; retry results are recorded separately. Runtime is Node 26.12.1 while package engines require Node 24. No localhost:3000 server was running. No live production environment or deployment credentials have been verified.

## Findings recorded before fixes

| ID | Severity | File / area | Problem and risk | Smallest proposed fix | Verification |
|---|---|---|---|---|---|
| SEC-01 | P0 | `artifacts/api-server/src/routes/video.ts` | Public POST sync/add/webhook handlers can change the video catalogue and invoke external ingestion; no admin middleware is installed. | Gate maintenance writes with existing admin authentication; bound input; generic errors. | Unauthorized requests return 404/401 without invoking services or changing files. |
| SEC-02 | P1 | `artifacts/api-server/src/app.ts` | No global error handler: malformed JSON and uncaught exceptions use Express default responses. Security headers absent. | Safe JSON error responses, nosniff/referrer/frame policy and conservative CSP; retain localhost behavior. | Malformed/oversize JSON, injected exceptions, header regression tests. |
| SEC-03 | P1 | `artifacts/api-server/src/routes/decision-intel.ts:fail` | Unknown service errors return their message publicly, potentially revealing SQL or paths. | Log safely on server, return generic code. | Regression test/source inspection and API checks. |
| SEC-04 | P1 | `artifacts/ipl-analytics/src/lib/gemini-client.ts` | Optional provider key is browser-persisted and model requests bypass server usage controls. | Move provider request to server, retain accurate unavailable state until configured. | Client bundle contains no provider secrets or key persistence; validation/rate-limit/provider failure checks. |
| REL-01 | P1 | `artifacts/ipl-analytics/src/App.tsx` | No React error boundary for route chunk or render failures. | Add recovery boundary using existing dark visual language. | Simulated chunk/render error shows reload/Home recovery. |
| UX-01 | P1 | `src/pages/not-found.tsx` | Generic light developer 404; no recovery navigation. | Branded dark 404 with Home and Feed links. | Unknown route screenshot and navigation checks. |
| SEO-01 | P1 | `public/sitemap.xml`, `public/robots.txt`, `index.html` | Sitemap uses legacy hardcoded origin; most routes share generic client metadata. SPA initial HTML is empty. | Configured canonical origin, route metadata and safe sitemap generation; document prerender strategy. | Production HTML/metadata/sitemap checks; no promise of indexing from client metadata. |
| LEG-01 | P1 | Information pages / `site-profile.ts` | No Terms route; no public email configured. Existing GitHub contact is real, but private support channel remains owner decision. | Add accurate product terms draft and public access; never invent contact details. | Routes and links; owner/legal review remains outstanding. |
| DATA-01 | P1 | Pulse / auction source data | Lot-number ordering cannot prove actual bid/sale chronology; prior output claimed a complete replay without timestamps. | Accurate historical snapshot labels; source/status verification. | Inspect snapshot UI against source fields and test status totals. |
| OPS-01 | P1 | Runtime / deployment | Node version differs from supported engines; production HTTPS, proxy topology, backups and licensing have not been verified. | Document deployment gates; do not change live configuration. | Staging deployment with Node 24 and configured trusted proxy/TLS. |
| PERF-01 | P1 | Production frontend chunks | Article chunk ~938 kB and editorial data ~1.46 MB uncompressed; performance needs measurement. | Measure route loading before selecting a safe optimization. | Build sizes and browser timing; no invented Lighthouse score. |
| QA-01 | P1 | `e2e/smoke.spec.ts` | Existing smoke suite explicitly tolerates known mobile overflow and covers an older route matrix. | Run strict overflow checks and add new major routes to launch coverage. | 320/375/390/430/768/1024/1440 viewport checks. |

## Existing controls to preserve

### Dependency remediation follow-up

Narrow overrides in `pnpm-workspace.yaml` select proxy-addr 2.0.8, path-to-regexp 8.4.0, body-parser 2.4.0 and qs 6.17.0. `pnpm-lock.yaml` was regenerated by pnpm with lifecycle scripts disabled. The first compatible-range update had no effect; explicit overrides were required. Fresh registry scan in `launch-evidence/dependency-audit-patched.json` reports zero critical, zero moderate and zero low advisories, with one high Zod advisory remaining. This proves the critical advisory is removed from the resolved graph; behavioral verification is separately recorded in `dependency-patch-tests.log` and `dependency-patch-typecheck.log`. Zod remains open: installed 3.25.76, reported patched version >=4.6.6; a major migration must not be silently forced across generated schemas.

Admin token comparison uses timing-safe equality; missing token disables protected routes. API body limit is 100 kB, general and heavy API limiters exist, CORS permits configured origins and localhost in development. Ask database validates input and uses a constrained query model. Analytics/advertising scripts require configuration and consent. Getty consent is separate from image rights; release plugins strip unapproved editorial imagery and unpublished v2 articles. Tests preload read-only database mode.

## Evidence and completion discipline

Raw verification logs are under `docs/launch-evidence/`. A successful build alone is not launch approval. All unverified rights, production infrastructure, dependency, content and browser coverage findings remain open until evidence supports closure. Final status, exact changes and remaining decisions will be in `CRICFIELD_LAUNCH_READINESS.md`.

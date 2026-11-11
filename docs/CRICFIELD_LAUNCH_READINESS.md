# CricField launch readiness — audit in progress

Date: 28 October 2026. Recommendation: **NO-GO for public launch pending the open checks below.** This is an interim report; it does not certify the full 17-phase brief as completed.

## Verified baseline

- Existing workspace typecheck passed; frontend and API production builds passed.
- Original API suite: 97/97 passed with loopback networking enabled. The restricted environment's EACCES failures were environmental, not counted as application defects.
- Resumed workspace typecheck passed after hardening changes.
- New maintenance/security regression: 1/1 passed. Covers disabled video maintenance access, safe exception responses, headers, malformed/oversize JSON and disabled AI gateway.
- Updated full regression and production builds are logged in `launch-evidence/hardening-*`; inspect their final summaries before treating them as passed.

## Implemented local fixes

### Verified dependency fix (P0)

Files modified: `pnpm-workspace.yaml`, `pnpm-lock.yaml`. Patched proxy-addr to 2.0.8, path-to-regexp to 8.4.0, body-parser to 2.4.0 and qs to 6.17.0 using narrow overrides. No major package version was forced.

Verification: `pnpm audit --prod --json` now reports 0 critical / 0 moderate / 0 low and 1 high (Zod). The read-only API regression suite passes **99/99** after installation. Evidence: `launch-evidence/dependency-audit-patched.json`, `dependency-patch-tests.log`, `security-overrides-install.log`. The critical proxy-addr dependency finding is resolved for this lockfile. This does not close overall dependency readiness: the Zod high advisory remains open, and production runtime verification is separate. Typecheck/build follow-up logs: `dependency-patch-typecheck.log`, `dependency-patch-build.log`; only their final successful results establish those checks.

- Protected video maintenance writes with existing admin-token checks. Restricted caller URLs to official HTTPS Hotstar hosts, blocked fetch redirects, added timeout and maintenance rate limiting. New manually entered clips start unverified.
- Added conservative security headers and sanitized global error responses, including malformed/oversize bodies. Unknown API routes return JSON 404. Added sensitive header redaction and removed internal decision-service errors from public responses.
- Moved optional Gemini commentary to a server gateway with bounded inputs/output, provider timeout, per-client limits, concurrency cap and process-local daily allowance. Explicit operator opt-in and server credentials/model are required. No paid provider calls were made. Removed browser credential input/persistence and updated privacy text.
- Added a dark branded 404 with Home/Feed recovery and a React recovery boundary.
- Corrected Pulse snapshot wording: published lot number order does not establish timestamped transaction chronology.
- Added root `.env.example` with placeholders only.

## Open launch blockers / important work

| Priority | Area | Remaining verification or decision |
|---|---|---|
| P1 | Dependencies | Critical proxy-addr and Express transitive advisories resolved with narrow overrides and 99 passing regression tests. High Zod advisory remains: installed 3.25.76, reported fix >=4.6.6. A tested schema migration or verified mitigation remains required. Current evidence: `launch-evidence/dependency-audit-patched.json`. |
| P1 | Functionality/mobile | Full current-route browser matrix and seven requested viewport widths not completed. Existing older suite tolerates documented mobile overflow; do not count those exceptions as passing launch quality. |
| P1 | SEO | Legacy sitemap origin, generic route metadata, empty SPA initial HTML and article social preview need resolution with the actual public domain. Add compatible prerendering or server metadata; client metadata alone is insufficient. |
| P1 | Legal/trust | Terms page and legal review outstanding. No public email configured; do not invent one. Existing About/Contact/Privacy/Data Sources/Disclaimer pages need final owner review. |
| P1 | Images | Release approval gates preserved. Comprehensive asset licensing/provenance review and final embed consent/browser verification remain outstanding. No imagery was approved or downloaded by this hardening pass. |
| P1 | Data | Full cross-feature data/source/sample-size review remains open. Existing identity/data tests provide useful coverage, not complete certification. |
| P1 | Production | TLS, proxy trust, backups, monitoring, deployment host and actual production origin not verified. Node runtime here is 26.12.1; declared support is Node 24. |
| P1 | Performance | Baseline frontend build took 150 seconds; article and editorial-data chunks were approximately 938 kB and 1.46 MB uncompressed. No Lighthouse or field performance score claimed. |
| P2 | Monitoring | Health endpoint exists. External error monitoring and expanded product events need privacy-conscious configuration; no paid services configured. AI budgets and rate limits are per process, requiring shared infrastructure for multiple instances. |

## Deployment checklist

1. Resolve dependency exposure and run supported-runtime builds/tests.
2. Complete strict desktop/mobile journeys, screenshots and recovery/consent checks against production builds.
3. Confirm domain and generate accurate canonical URLs, sitemap, social metadata and indexable content.
4. Complete rights, editorial and legal review; retain publication and image gates.
5. Verify deployment TLS, trusted proxy, allowed origins, credential rotation where indicated, read-only warehouse access and backups.
6. Configure optional providers only with approved budgets; verify failure/retry states.
7. Reassess all P0/P1 findings and obtain explicit deployment approval.

No production deployment, destructive database operation, article publication or paid integration was performed. Existing unrelated working-tree changes are preserved. Review-worker attempts hit the account usage limit, so no independent worker review is claimed.

# Day 5: Repository, build and deployment stabilization

**Date:** 2026-10-14

**Outcome:** the codebase typechecks with 0 errors, builds, installs cleanly from the lockfile, and starts correctly from the production bundle. All tests pass, and the warehouse hashes are identical before and after. Tests and the deployed API can now run strictly read-only. A latent data-destroying automatic schema push was found and removed.

**Not done, by instruction:** no commit, no reset, no stash, no deployment, no hosting change, no UI redesign, no new features, and no statistic or identity change.

---

## 1. Before / after

| Check | Before Day 5 | After |
|---|---|---|
| Web typecheck | **11 errors** (`components/cricket3d`) | **0** |
| API / scripts / root typecheck | 0 / 0 / — | **0 / 0 / 0** (`pnpm run typecheck`) |
| API tests | 45 | **48/48** (+3 database-safety tests) |
| Global/scout tests | 23/23 | **23/23** |
| Step-3 tests | 27 pass, 1 skip | **27 pass**, 1 skip (optional `CORRECTED_DB`) |
| API build / web build | ✔ / ✔ | ✔ / ✔ |
| Clean install (isolated copy, frozen lockfile, offline) | **failed**: `ERR_PNPM_IGNORED_BUILDS` (placeholder in `pnpm-workspace.yaml`) | **✔**, 608 packages, exit 0 |
| Production startup smoke (built `dist/index.mjs`) | not tested | **14/14** |
| Served frontend data vs corrected source | **stale**: 4 identity files from 2026-10-12, 22 shards missing | identical (rebuilt), and a startup warning added if it recurs |
| Automatic schema push on merge | **active**: would DROP 3 warehouse tables | removed; manual push refuses production |
| Tests' access to the warehouse | read-write (unchanged only because no test hit a writing route) | **read-only, enforced and tested** |
| `sqlite.db` | `ab897a8c…` | `ab897a8c…` (unchanged; WAL 0 bytes) |
| `global.db` | `79c75f78…` | `79c75f78…` (unchanged) |

---

## 2. Fixes made in code

### 2a. The 11 web type errors: four real 3D bugs

Each error marked a real runtime defect. I made each function do what its UI already promises; no 3D behaviour was removed.

| Error | Runtime effect before | Fix |
|---|---|---|
| `BatterHandedness` imported from a module that doesn't export it | type-only | Import from `lib/cricket3d/coordinateTransform` |
| `preset.position.x/.y/.z` (×6). Presets are `[x, y, z]` tuples. | Switching camera set **NaN** positions | `set(...preset.position)` |
| `replayController.pause()` doesn't exist | **TypeError** when Pause is clicked | Added `BoundaryReplayController.pause()`: stop in place |
| `stadiumAudio.toggleMute()` doesn't exist | **TypeError** when the audio button is clicked | Added `StadiumAudioEngine.toggleMute()` |
| Phase names `PHASE_2_FLIGHT`, `PHASE_4_CELEBRATION`, `PHASE_5_RESET` don't match the state machine | Labels showed raw ids; "playing" never reset after a replay | Use the real names (`PHASE_2_BALL_TRAVEL`, `PHASE_4_CROWD_REACTION`, `PHASE_5_COMPLETE`) |
| Camera mode `WAGON_WHEEL` doesn't exist | The "Wagon 360°" button did nothing | `AERIAL_WAGON_WHEEL` (same label) |

### 2b. Repository, install and database safety

| File | Change |
|---|---|
| `.gitignore` | Appended: `*.db-wal`, `*.db-shm`, `*.db-journal`, `*.bak`, `sqlite.db.*`, `scripts/sqlite.db`, `.env*` (except `.env.example`), `__pycache__/`. Your pending edits are preserved. These rules only affect untracked files (§5). |
| `pnpm-workspace.yaml` | `allowBuilds.better-sqlite3: "set this to true or false"` → `false`. The placeholder made every fresh install exit with an error. Nothing imports `better-sqlite3`; all database access uses `node:sqlite`. |
| `scripts/post-merge.sh` | **Removed `pnpm --filter db push`**, which Replit ran after every merge (original backed up). |
| `lib/db/drizzle.config.ts` | Targets `CRICFIELD_DB_PATH` if set. **Refuses the production `sqlite.db`** unless `DRIZZLE_ALLOW_PRODUCTION=1`. Verified: production is refused, a copy is accepted. |
| `lib/db/src/index.ts` | Opt-in `CRICFIELD_DB_READONLY=1`: open read-only and skip `PRAGMA journal_mode = WAL`. Unset, behaviour is unchanged. |
| `artifacts/api-server/src/services/insights.ts` | Honours `CRICFIELD_DB_READONLY` (no `CREATE TABLE`; click counting fails quietly; the redirect still works). |
| `artifacts/api-server/package.json`, `scripts/package.json` | `test`, `test:global` and `test:step3` preload `test-readonly-env.mjs`, so every test, and every process a test spawns, opens the warehouse read-only. |
| `artifacts/api-server/test/db-safety.test.ts` (new) | Asserts that read-only mode is on, that a write through `@workspace/db` is refused and leaves no trace, that `post-merge.sh` has no schema push, and that the drizzle guard is present. |

### 2c. Deployment reliability

| File | Change |
|---|---|
| `artifacts/api-server/src/app.ts` | At startup, compares the served build's `data/player-bio.json`, `squads-by-season.json` and `player-recent-matches/index.json` with the source. If they differ, it logs a **warning** ("Frontend build is older than the source data…"). Before this, the 2026-10-12 build would have served pre-repair identities silently. |
| `routes/decision.ts`, `decision-intel.ts`, `scout.ts` | 503 responses no longer include the server's absolute file path (found by the smoke test). The detail is logged server-side once; clients get a fixed message. |
| `scripts/day5-prod-start-smoke.mjs` (new) | Starts the **built** server exactly as `npm start` does, against a database copy. It checks 14 things: health; the SQL, decision, summary and match-card routes; the SPA fallback; that the served data equals the source; that the admin route is hidden without a token; that the server runs without AI keys; no stale-build warning; no unhandled errors; a clear invalid-`PORT` failure; a missing database giving a 503 with no path; and the error being in the log. |

**Rebuilt:** `artifacts/ipl-analytics/dist/public` from current sources. The previous build is backed up to `../day05-backup/ipl-analytics-dist-public-before/`. Afterwards, 0 identity files are stale.

---

## 3. Build warnings, classified

| Severity | Warning | Notes |
|---|---|---|
| **Medium (performance)** | One main JS chunk of **4.09 MB** (`assets/index-*.js`); Rollup's ">500 kB" warning | No route-level code-splitting. It affects first load on mobile. Fixing it (lazy routes / `manualChunks`) is a refactor, deferred. |
| Low | `tooltip.tsx` / `sheet.tsx` "Error when using sourcemap…" | Vite strips the `"use client"` directive from shadcn files. Output is unaffected. |
| Low (environment) | `npm warn Unknown project config` (`auto-install-peers`, `node-linker`, …) | `.npmrc` keys are pnpm settings that npm also reads. Harmless. |
| Low | Git: "LF will be replaced by CRLF" on 37 files | There's no `.gitattributes`, so line endings depend on each machine. Proposed in §8. |
| — | API (esbuild) build | No warnings. |

---

## 4. Clean-install evidence

- **Isolated copy:** `../day05-work/clean2/`, built from the tracked and untracked source files only, with no `node_modules`, `dist` or ignored data.
- **Install:** `pnpm install --frozen-lockfile --offline` → "Lockfile is up to date, resolution step is skipped", **+608 packages, exit 0** (pnpm 11.1.2, Node 24.10.0).
  - Offline mode means it installed only from the local store and downloaded nothing.
  - The first attempt failed on the `allowBuilds` placeholder, which is now fixed.
- **Typecheck:** `pnpm run typecheck` = 0 errors. Per-package typechecks need `tsc --build` (`typecheck:libs`) **first**; run on a fresh copy without it, the API showed 4 errors from missing library declarations. The root script already runs things in the right order.
- **Builds:** API and web both succeed in the clean copy.
- **API tests in the clean copy:** they **fail**, by design of the repository rather than because of code. `lib/cricket-data/raw/` (1,243 IPL JSON files, 112 MB) and `global.db` (76 MB) are git-ignored, and nothing restores them (§6, blocker 1).

### Exact commands (from the repository root; Node 24, pnpm 11)

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/ipl-analytics run build
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/scripts run test:global
pnpm --filter @workspace/scripts run test:step3
node scripts/day5-prod-start-smoke.mjs <copy-of-sqlite.db>
```

To start the API in production mode, from `artifacts/api-server`:

```bash
PORT=8080 NODE_ENV=production CRICFIELD_DB_READONLY=1 node --enable-source-maps ./dist/index.mjs
```

Optional environment variables: `ADMIN_API_TOKEN` (24+ characters; enables the admin CSV sync), `CORS_ORIGINS`, `TRUST_PROXY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY` (AI features show "unavailable" without them), `LOG_LEVEL`. `CRICFIELD_DB_PATH` points the API at another warehouse file.

---

## 5. Repository safety findings

| Finding | Risk | Action |
|---|---|---|
| **`sqlite.db`, `sqlite.db-wal` and `sqlite.db-shm` are tracked** in git | WAL/SHM files are transient state; committing them can pair a database with a mismatched log. **`sqlite.db` is 115.5 MB, above GitHub's 100 MB hard file limit**, so a push of it to GitHub would be rejected. | **Needs your approval:** `git rm --cached sqlite.db-wal sqlite.db-shm` (keeps the files on disk). Decide whether `sqlite.db` lives in git, Git LFS, or a release artifact with a checksum (§6). |
| `artifacts/ipl-analytics/.env` is tracked | Holds only public `VITE_` identifiers (an AdSense publisher id and a port); **no secret** | Recommend `git rm --cached` (approval) and keep `.env.example` |
| Secret scan (1,051 tracked and untracked source files; data folders excluded) | No API keys, tokens or private keys. Only hits: Hotstar URL slugs containing "sk-vs-". | — |
| `scripts/sqlite.db` | A 0-byte stray database, created 2026-10-11 by a script run from `scripts/` | Now ignored. Delete it after approval. |
| `scripts/test_keys.json` | Player-name test data, not keys | — |
| `scratch/`: ~90 PNG/JPG cut-outs, HTML dumps, scraped JSON; `manoj_bhandage_toi.jpg` and `mohit_rathee_toi.jpg` in the root | Working artifacts; photos of **unknown licence** | Do not commit (§8) |
| `IPL PLAYER PROFILE/2026/` (274 photos, 22 MB) | Source photos of **undocumented licence** | Keep out of a public repository until licences are recorded |
| `docs/data-repairs/**/backup/` (≈2,400 files) | Large backup copies of bios and shards | Keep local, or archive; not needed in git |
| `.local/share/pnpm/store` inside the repository | Ignored (`.local/`) and excluded by `.replitignore` | — |

### Backups made today (nothing in git touched)

All are in `../day05-backup/`, with `SHA256SUMS.txt`:
- `uncommitted-worktree.tar`: all 4,364 modified and untracked files, 437 MB.
- `tracked-changes.patch`: a binary diff of every tracked change against `HEAD` 9194613.
- `HEAD.txt` and `file-list.txt`.
- The previous `dist/public` build.
- The original `post-merge.sh`.

---

## 6. Deployment: findings, blockers and plan

### Current configuration (inspected, not changed)

- **There is no Vercel configuration in the repository** (no `vercel.json`).
- **The real target is Replit autoscale** (`.replit`, `artifacts/*/.replit-artifact/artifact.toml`):
  - API: build `pnpm --filter @workspace/api-server run build`, run `node --enable-source-maps artifacts/api-server/dist/index.mjs`, `PORT=8080`, health check `/api/healthz`, path `/api`.
  - Web: build `pnpm --filter @workspace/ipl-analytics run build`, served **statically** from `artifacts/ipl-analytics/dist/public` with an SPA rewrite.
- **The frontend calls same-origin paths** (`${BASE_URL}api/…`, `${BASE_URL}data/…`). That works with Replit's path routing. There is no configurable API origin, so hosting the frontend separately (e.g. Vercel) would need a rewrite of `/api/*` to the API host, plus `CORS_ORIGINS`.
- **Data the API reads at runtime, relative to the repository:**
  - `sqlite.db`;
  - `lib/cricket-data/raw/*.json` (match cards, stats aggregator, bio lookup);
  - `lib/cricket-data/global/warehouse/global.db` (Scout);
  - `artifacts/ipl-analytics/public/data/*` (bios, squads, identity index);
  - `artifacts/api-server/data/*`.

### Blockers (must be resolved before a public deployment)

1. **Raw match data and `global.db` aren't reproducible from the repository.** Both are git-ignored and no script restores them. The raw files carry an extra `actual_delivery` field, so a fresh Cricsheet download would **not** reproduce the files the Day 4 reconciliation was verified against (source hash `05386ef4…`). Fix: publish both as a versioned data artifact with checksums, plus a fetch-and-verify script.
2. **`sqlite.db` packaging.** It's in git, at 115.5 MB, which exceeds GitHub's limit. Its header is in WAL mode, so even read-only readers create `-wal`/`-shm` files. Fix: ship a release copy made with `VACUUM INTO` followed by `PRAGMA journal_mode=DELETE` on the copy, with its checksum. Do not commit WAL/SHM files.
3. **Runtime writes on an autoscale (replicated, ephemeral) filesystem.** Insight click counts are written into the warehouse, so they diverge per instance and are lost on redeploy, and the verified database file changes. Fix: deploy the API with `CRICFIELD_DB_READONLY=1` (verified 14/14; the database copy's hash is unchanged by a full smoke run). Move click counting to a separate store later; that would be a feature change, so it's not done today.
4. **Versions aren't pinned.** There are no `packageManager` or `engines` fields, while `.replit` uses `nodejs-24` and this machine has pnpm 11.1.2. Fix: add `"packageManager": "pnpm@11.1.2"` and `"engines": {"node": ">=24"}` (approval: a manifest change).
5. **The frontend build must run in every deploy.** It does on Replit. Skipping it would serve stale identities; the new startup warning catches this.

### Reproducible deployment plan (for approval; nothing deployed)

1. Approve and make the commits in §8.
2. Produce a data release:
   - `sqlite.db` copy (`VACUUM INTO` → `journal_mode=DELETE`);
   - `lib/cricket-data/raw/` as a zip;
   - `global.db`;
   - `SHA256SUMS` for all three. Verify against `ab897a8c…`, `05386ef4…` and `79c75f78…`.
3. Run the clean install from the lockfile: `pnpm install --frozen-lockfile`.
4. Restore and verify the data release against its checksums.
5. Typecheck, build, and run all suites (§4).
6. Run `node scripts/day5-prod-start-smoke.mjs <copy>`, which must pass 14/14.
7. Deploy on Replit with the API environment `NODE_ENV=production`, `PORT=8080`, `CRICFIELD_DB_READONLY=1`, and optionally `ADMIN_API_TOKEN`, `CORS_ORIGINS` and AI keys.
8. After deploying, check: `/api/healthz`, `/api/history/overview` ("Exact match"), and `/data/player-bio.json` matching the source checksum.

---

## 7. Database safety (Phase 5)

| Check | Result |
|---|---|
| Day 4.5 warehouse corrections intact | `warehouse-reconcile.test.ts`: production equals the source; 0 spell / innings / batting / phase differences; the exact runs-conceded expression matches all 295,732 deliveries |
| Day 4.6 identity corrections intact | Identity, bio-merge-guard and `bio-lookup` tests pass; 0 registry ids with two bios; 0 initial+surname mismatches |
| Hashes before / after **all** tests, builds and smoke runs | `sqlite.db` `ab897a8ccdc590ca64b0512fd3c787a48dbd763779a6aeda76ef677b424309ac` (both); `global.db` `79c75f780ebe4d9e…` (both); WAL 0 bytes |
| Tests cannot modify production | Enforced: preload sets `CRICFIELD_DB_READONLY=1`, and `db-safety.test.ts` proves a write is refused and leaves no trace |
| Dangerous automatic schema change | **Found and removed.** The post-merge `drizzle-kit push` would make `sqlite.db` match `lib/db/src/schema`, which omits `delivery_commentary` (**293,652 rows**, the only source of delivery length and scoring area), `player_matchups` (31,370) and `insight_clicks`. A manual push now refuses production by default. |
| Other schema-changing tools | `update-ipl-data-v3.ts` (refuses production without `--allow-production`, Day 3); `compute_analytics.ts` (refuses production without the flag, Day 4); `build-corrected-db.ts` (copies only) |

---

## 8. Proposed commit groups (not executed; needs your approval)

Some files contain changes from more than one group (`app.ts`, `stats-aggregator.ts`, `decision/db.ts`, `player.tsx`); those need `git add -p`. Before any commit:
- `git rm --cached sqlite.db-wal sqlite.db-shm artifacts/ipl-analytics/.env` (approval);
- decide how `sqlite.db` is stored (§6-2);
- optionally add a `.gitattributes` (`* text=auto eol=lf`).

| # | Commit | Contents |
|---|---|---|
| 1 | `chore(repo): safety ignores, pnpm allowBuilds, remove auto schema push` | `.gitignore`, `pnpm-workspace.yaml`, `scripts/post-merge.sh`, `lib/db/drizzle.config.ts` |
| 2 | `fix(security): admin-only CSV sync, CORS allowlist, rate limits, truthful AI states` (Day 1) | `lib/admin-auth.ts`, `lib/rate-limit.ts`, `services/csv-dataset.ts`, `routes/csv-sync-route.ts`, `scripts/csv-sync-cli.ts`, `routes/live.ts`, `routes/clip-router.ts`, `routes/index.ts`, `app.ts` (CORS/limits), `gemini-client.ts`, `ai-analyst-*.tsx`, `ai-mascot-guide.tsx`, `pulse.tsx`, `App.tsx`, `test/day1-security.test.ts` |
| 3 | `fix(scout): ranking order, minBalls, roles, intervals` (Day 2) | `services/scout/*`, `routes/scout.ts`, scout pages / components / `scout-api.ts`, `test/scout-rankings.test.ts` |
| 4 | `fix(ingestion): legacy CSV parser, sequencing, wicket rules, extras flags` (Day 3–4) | `cricsheet-csv-sync.ts`, `update-ipl-data-v3.ts`, `compute_analytics.ts`, `test/data-integrity.test.ts` + `test/fixtures/` |
| 5 | `fix(stats): exact runs conceded, metric definitions, registry bio lookup` (Day 4–4.6) | `decision/db.ts`, `stats-aggregator.ts`, `player-bio-lookup.ts`, `cricsheet-csv-sync.ts` (docs), `test/bio-lookup.test.ts` |
| 6 | `data: warehouse corrections C1–C7` (Day 4.5) | `sqlite.db` (per §6-2), `scripts/src/day4/*` tools, `warehouse-reconcile.test.ts`, `step3-regression.test.ts`, `economy-compare.ts`, `baseline-post-day45-snapshot.json` |
| 7 | `data(identity): duplicate merges, squad corrections, aliases` (Day 3–4.6) | `player-bio.json` ×2, `squads-by-season.json` ×2, `player-identity-aliases.json`, `player-recent-matches/` and `.json`, `step3_6/dedupe-photo-bios.ts`, identity / guard tests, `scratch/run_photo_mapping.py` |
| 8 | `fix(build): cricket3d type errors, read-only serving, stale-build guard, smoke test` (Day 5) | `components/cricket3d/*`, `lib/db/src/index.ts`, `insights.ts`, `match-card.ts`, `routes/decision*.ts`, `app.ts` (guard), `test/db-safety.test.ts`, both `test-readonly-env.mjs`, the package.json test scripts, `scripts/day5-prod-start-smoke.mjs`, `src/scripts/smoke-db.ts` |
| 9 | `docs: day reports, architecture handbook, data-repair evidence` | `DAY-0*.md`, `docs/architecture-handbook/`, `docs/global-data-engine/`, `docs/data-repairs/**` (**excluding `backup/` folders**), `docs/day05/` |
| — | **Review separately (not from Days 1–5)** | Your earlier uncommitted UI/photo work: `dugout.tsx`, `franchise-hero.tsx`, `team-squad.tsx`, `player-avatar.tsx`, `layout.tsx`, `home.tsx`, `stats.tsx`, `index.css`, `player-photo-registry.ts`, `player-images.json`, `player-photo-registry.json`, `match/*`, `spatial-analytics.tsx`. Also `schema.sql`, `lib/db/src/schema/index.ts`, `migrate_deliveries.ts` (the 2026-10-11 delivery-sequence work). |
| — | **Do not commit** | `scratch/` images and dumps, root `*_toi.jpg`, `IPL PLAYER PROFILE/` (licence), `sqlite.db.pre-delivery-fix.bak`, `scripts/sqlite.db`, `docs/data-repairs/**/backup/` |

---

## 9. Remaining defects (handbook and Days 1–4.6)

| Area | Defect | Status |
|---|---|---|
| Deployment | §6 blockers 1–4 (data reproducibility, `sqlite.db` packaging and size, runtime click writes, version pins) | Open; plan in §6 |
| Performance | 4.09 MB main bundle, no code-splitting | Open |
| Identity | `player-profiles.ts` `NameIndex` initial+surname fallback (Nitin Saini shows Navdeep's style); bowler type has no "Unknown"; "Harmeet Singh" ×2 in one row; 50 unverified bios; Tejasvi = T Dahiya unproven | Open (Day 4.6 §6) |
| Data | Player styles empty in `players`; country/role placeholders on 793 rows; delivery length/area unknown where commentary is silent | Open, unknown values kept |
| Photos | Registry entries marked "approved" without licence evidence; source photo licences unrecorded | Open |
| Metrics | `boundaryPct` has two meanings by endpoint; static "league" constants in `stats-aggregator.ts`; `team_intelligence.avg_economy` sums overs in cricket notation | Open (Day 4) |
| Code health | Dead `ingest-cricsheet-json.ts` in the API; legacy ingestion scripts (`update-ipl-data.ts`, `parse-cricsheet-csv.ts`) with old wicket rules; `scratch/` tooling | Open; don't run the legacy scripts |
| Product (handbook) | AI analyst / agent and API / MCP offering for franchises | Not started (Day 6+ scope, by instruction) |

---

## 10. Exact next actions (awaiting your decisions)

1. **Approve the index cleanup:** `git rm --cached sqlite.db-wal sqlite.db-shm artifacts/ipl-analytics/.env` (the files stay on disk).
2. **Decide how `sqlite.db` is stored:** git / Git LFS / release artifact. It is 115.5 MB, above GitHub's 100 MB limit.
3. **Approve the commit groups in §8** (I'd stage them with `git add -p` and show each diff before committing).
4. **Approve `packageManager` / `engines` pins** and a `.gitattributes`.
5. **Approve producing the versioned data release** (`sqlite.db` copy in DELETE-journal mode, raw match zip, `global.db`, checksums) and a fetch-and-verify script.
6. Then, separately, **approve a deployment rehearsal** on Replit with `CRICFIELD_DB_READONLY=1`.

Day 6 has not been started.

**Artifacts:** `docs/day05/` holds the git status at start, the build logs, the web type errors before, `phase6-results.txt` and `prod-start-smoke.json`. The scratch copies `../day05-work/clean`, `clean2`, `smoke.db`, `ro.db` and `final.db` can be deleted; they hold no unique data. Delete the copies' `node_modules` with care, because their junctions point into the copies.

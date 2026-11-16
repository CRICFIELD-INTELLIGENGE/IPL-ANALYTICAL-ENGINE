# Day 5.5 verification checkpoint (Phase 0)

**Date:** 2026-10-19
**Verdict:** Day 5.5's technical work is present and verifies. Its report (`DAY-05.5-REPORT.md`) **does not exist**, so every claim below was re-checked against the repository instead of being taken from a report. Two Day 5.5 decisions are still open, because they need your approval: committing the staged "group 1", and what to do about `sqlite.db` in Git history.

Evidence logs are in `docs/day055v/`.

---

## 1. What Day 5.5 left behind

| Artifact | Location | State |
|---|---|---|
| `DAY-05.5-REPORT.md` | — | **Missing.** `docs/day055/commit-preview.md` refers to it, but it was never written. |
| Commit preview (groups 1–9) | `docs/day055/commit-preview.md`, `commit-preview-stats.md` | Present |
| Backup | `../day055-backup/` (`worktree.tar`, `staged-group1.patch`, `unstaged-tracked.patch`, `HEAD.txt`, `file-list.txt`) | `sha256sum -c` **OK** for all 3 checksummed files; `HEAD.txt` = `9194613` |
| Day 5 backup | `../day05-backup/` | `sha256sum -c` **OK** (worktree tar, tracked-changes patch) |
| Data release builder | `scripts/data-release.mjs` (staged) | Present; `build` / `verify` / `restore` |
| Data release | `data-release/cricfield-data-2026.10.14/` (git-ignored) | **Verifies:** 1,247 files, version `2026.10.14-day5.5` |
| Clean restore | `../day055-clean/` | Restore OK (1,246 files, 0 mismatches). The Day 5.5 run **stopped at step 4 (typecheck)**, and its install had exited 1. Both are completed below. |

---

## 2. Repository checks

| Check | Result | Evidence |
|---|---|---|
| Branch | `main`, HEAD `9194613` (same as both backups) | `git log` |
| Commits since Day 5 | **None.** No commit was created by Day 5 or 5.5, so there is no unsafe commit to review. | `git log` |
| Staged (index) | Group 1 "repository hygiene" only: `.gitattributes` (new), `.gitignore`, root `package.json` (pins), `pnpm-workspace.yaml`, `lib/db/drizzle.config.ts`, `scripts/post-merge.sh`, `scripts/data-release.mjs` (new); index deletions of `sqlite.db`, `sqlite.db-wal`, `sqlite.db-shm`, `artifacts/ipl-analytics/.env` (files kept on disk) | `git diff --cached --stat` |
| Unstaged / untracked | 257 status entries (earlier uncommitted work + Days 1–5 changes) | `git status --short` |
| Secret scan of the staged diff | 0 hits (keys, tokens, private keys, Google/OpenAI key patterns) | grep over `git diff --cached` |
| WAL/SHM and `.env` tracked? | **In HEAD: yes.** In the index: no (staged deletions). Now ignored by `*.db-wal`, `*.db-shm`, `**/.env`. They stop being tracked only once group 1 is committed. | `git ls-tree HEAD`, `git ls-files`, `git check-ignore -v` |
| `sqlite.db` in history | **Yes**: blob `a2fadd2d` (117,899,264 bytes), plus `sqlite.db-wal` (88 MB) in HEAD. One commit touches it. Untracking does not remove it from history; a push to GitHub would be refused (> 100 MB). | `git rev-list --objects --all`, `git ls-tree -l HEAD` |
| Other tracked large files | 2–4.6 MB JSON data files, PNG images, a 3 MB notebook (all under 5 MB) | `git ls-tree -r -l HEAD` |
| Node / pnpm pinned | **Staged, not committed:** `"packageManager": "pnpm@11.1.2"`, `engines.node ">=24 <25"`, `engines.pnpm "11.1.2"`. Local: Node 24.10.0, pnpm 11.1.2. | `git diff --cached package.json` |
| Remote | `gitsafe-backup` (Replit's internal backup). No GitHub remote is configured. | `git remote -v` |

---

## 3. Data artifacts

| Data | Live file | Release | Clean restore |
|---|---|---|---|
| `sqlite.db` | `ab897a8c…09ac` (same as Day 4.6 / 5) | snapshot `77f96b01…` (VACUUM INTO, DELETE journal; logically identical by per-table fingerprint) | `77f96b01…`, identical to the release |
| `global.db` | `79c75f78…0037` (same as Day 5) | snapshot | `80d0ed58…`, as restored |
| Raw IPL JSON | 1,243 files, concatenated SHA-256 `05386ef4…6510` (the Day 4 reconciliation hash) | same `05386ef4…` in `MANIFEST.json` | 1,243 files, `05386ef4…`, identical |

The release README records the provenance: Cricsheet ODC-BY 1.0, plus two local modifications to the raw files (`actual_delivery` field, `data_version` relabel). **It is not published anywhere**, and must not be until a destination and licensing review are approved.

`sqlite.db-shm` on disk is dated today. That was my dev API server, which opened the warehouse **read-write** (`.claude/launch.json` did not set read-only mode). The database hash and the 0-byte WAL show nothing was written. I changed the launch configuration to `CRICFIELD_DB_READONLY=1` and restarted the server.

---

## 4. Tests and builds

### Main repository (`docs/day055v/*.log`)

| Suite | Result |
|---|---|
| API (`pnpm --filter @workspace/api-server test`) | **48 / 48** |
| Global / scout (`test:global`) | **23 / 23** |
| Step-3 (`test:step3`) | **27 pass, 0 fail, 1 skip** (optional `CORRECTED_DB` check) |
| Root typecheck (`pnpm run typecheck`) | **0 errors** (this includes today's `index.css` theme change, which is CSS only) |

### Clean checkout (`../day055-clean`, restored from the release; `docs/day055v/clean-*.log`)

| Step | Result |
|---|---|
| `pnpm install --frozen-lockfile --offline` | **exit 0** (Day 5.5's attempt had exited 1 part-way; a resumed install completed in 3 m 40 s) |
| `pnpm run typecheck` | exit 0 |
| API build / web build | exit 0 / exit 0 (web main chunk **4,091.54 kB**, gzip 860.48 kB, the Day 5 figure) |
| API tests | **48 / 48** |
| Global / scout tests | **23 / 23** |
| Step-3 tests | **27 pass, 1 skip** |
| DB hashes before vs after the whole run | unchanged |

**Limitation:** `day055-clean` is a copy of the tracked **and untracked** source files, not a `git clone`. Most of the working code (Scout Lab, Days 1–5 fixes, the 3D module) has never been committed, so a real clone of `9194613` cannot build today's application. That only changes once groups 2–8 are committed.

---

## 5. Day 5.5 tasks: status

| Task | Status | Note |
|---|---|---|
| Backups with checksums | Done, verified | §1 |
| `.gitignore` / `.gitattributes` / version pins | Done, **staged only** | Commit needs approval |
| Untrack WAL/SHM/`.env`/`sqlite.db` | Done, **staged only** | Same |
| Versioned data release + restore script | Done, verified | Not published (approval + licence review) |
| Clean-checkout restore, install, typecheck, build, tests | **Completed today** (Day 5.5 had stopped at typecheck) | §4 |
| Commit groups | Group 1 staged, groups 2–8 previewed | Your decision (`docs/day055/commit-preview.md` options 1–3) |
| `sqlite.db` in history | Open | Removing it needs a history rewrite. **Not done**, per the no-rewrite rule. Alternative: push to GitHub only from a new history / LFS, which is your decision. |
| `DAY-05.5-REPORT.md` | Missing | This file replaces it as the verified record |

**Blockers carried forward (need you):**
1. Approve committing group 1 (the index is ready). Also choose an option for groups 2–8.
2. Decide how `sqlite.db` is stored (history rewrite, LFS, or release artifact only).
3. Approve a publishing destination for the data release, after a licence review.

None of these block Day 6, which works on copies and on uncommitted files, as Days 1–5 did.

Next: Phase 1 (Day 6).

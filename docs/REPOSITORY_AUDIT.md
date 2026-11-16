# Repository audit and restructure proposal

Audited on 2026-11-16 at `main` commit `5e71e6d`, on branch `refactor/repository-architecture`. Section 4 is the proposal. Section 5 is the migration manifest. On 2026-11-16 the user approved **M1, M3 and D1–D5**, and those rows are now applied and validated. Every other row is still held. No code, data, route or config path was moved.

## 1. Inventory

10,042 tracked files, about 680 MB in the working tree.

| Path | Files | MB | Class | Notes |
|---|---:|---:|---|---|
| `artifacts/ipl-analytics` | 7,220 | 516 | app code + assets | Product SPA; `public/` holds the images and static JSON production serves |
| `artifacts/api-server` | 215 | 41 | backend | API, model services, data snapshots (`data/`), model scripts (`scripts/`), 33 test files |
| `artifacts/mockup-sandbox` | small | — | app code (dev tool) | Standalone design sandbox; nothing imports it |
| `artifacts/image-ingestion` | few | — | generated | Output folder of `scripts/image_ingestion` (only `.gitkeep`s tracked) |
| `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`, `lib/arcade-rules` | — | — | shared lib | `api-zod` and `api-client-react/src/generated` are generated |
| `lib/cricket-data` | 93 (whole `lib/`) | 7.1 | data engineering | `aggregated/` JSON, `global/manifests` + `reports`; `raw/`, `global/raw`, `global/warehouse` git-ignored |
| `scripts/src` | — | — | data engineering | `@workspace/scripts`: global warehouse, IPL aggregate, migrations, scout, step3 |
| `scripts/*` (top level) | 137 | — | data engineering / legacy | One-off `.py`/`.mjs` scrapers, audits, photo tools; not wired to package scripts |
| `scratch/` | 200 | 1.6 | legacy **and** data provenance | One-off scripts. Several generated files now in `public/data` (see DATA_PIPELINE) |
| `ipl_csv/` | 1,244 | 27.8 | dataset | Per-match Cricsheet CSVs; path resolved in `services/csv-dataset.ts` |
| `IPL PLAYER PROFILE/` | 274 | 20.8 | asset (source) | All 274 also exist in the frontend. Paths cited in `public/data/player-photo-registry.json` |
| `image players/` | 45 | 11.4 | asset (duplicate) | All 45 also in the frontend; referenced only by `scratch/*.py` |
| `docs/` | 197 | 24.8 | docs | Day reports, data repairs, handbook, methodology |
| root `*.md` | 40 (37 besides README / CONTRIBUTING / SECURITY) | — | docs (historical) | `DAY-*`, `MASTER_ARCHITECTURE_HANDBOOK`, `PROJECT_TREE`, … |
| root images | 43 | ~9 | asset (duplicate) | 41 byte-identical to files in `artifacts/ipl-analytics/public/`; 2 unique (`*_toi.jpg`) |
| `exports/` | 82 | 5.0 | generated | Player-bio handoff CSVs + zip (`scripts/export-player-bio-handoff.py`) |
| `attached_assets/` | 9 | 9.7 | asset / unknown | Replit uploads; Vite config lists it as an alias root |
| `data/` | 4 | 0.2 | generated (stray) | `ipl.db` (0 bytes), `platform.sqlite` + `-wal` + `-shm` |
| `integrations/whatsapp-prototype` | 8 | — | app code (experimental) | Standalone prototype |
| `supabase/` | 6 | — | config | RLS migrations + a policy test |
| `substack/` | 2 | 0.2 | asset / unknown | No code reference to the folder or its two images (`content-hub.ts` mentions only substack.com URLs) |
| Root configs | — | — | config | `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `vercel.json`, `.vercelignore`, `.npmrc`, `.replit`, `replit.nix`, `START*.bat`, `run.*` |

**Git-ignored local stores** that the apps need: `sqlite.db` (111 MB), `global.db` (155 MB), `lib/cricket-data/raw` (112 MB), `env/*.env`, `artifacts/api-server/data/platform.sqlite`, `pressure-official/`, `intelligence/work/`.

**CI:** none. `.github/` held only a PR template. Vercel builds the frontend on every push to `main`.

**Large tracked files (>3 MB):** `public/data/player-recent-matches.json` 32.3 MB · `api-server/data/pressure/pressure-reliability.json` 12.0 MB · `public/data/pressure-reliability.json` 10.6 MB · `public/data/ball-commentary.json` 4.4 MB · `docs/architecture-handbook/CricField-Handbook.pdf` 4.4 MB · `public/branding/ipl-nostalgia-frame.png` 3.7 MB · `src/data/editorial-images/manifest.json` 3.4 MB · four `docs/global-data-engine/step3/*-snapshot.json` at 3.3–3.4 MB each · `api-server/data/intelligence/cf-intel-2026.e526fafa43/snapshot.json` 3.2 MB.

**Duplicates:** 452 groups of byte-identical tracked blobs (771 extra copies). The main sources are the root images, `image players/` and `IPL PLAYER PROFILE/` mirrored into `public/`, `TITLE BANNER.png` (×3), and 17 JSON files identical in `api-server/data` and `public/data`. Another 8 same-named JSON pairs **differ**; see DATA_PIPELINE.

**Tracked files that look generated or stray:** `.gitignore.tmp`, `temp.json`, `etl_output.log`, `desktop.ini`, 5 `__pycache__/*.pyc` under `scripts/image_ingestion`, `artifacts/ipl-analytics/test-results/.last-run.json`, `scratch/player-bio.json.bak`, `data/*`.

## Possible secrets

Tracked files were scanned for key formats (AWS, GitHub, OpenAI-style `sk-`, Groq `gsk_`, Slack, Google `AIza`, JWT, PEM private keys, Resend `re_`, Supabase `sb_secret_`/`sb_publishable_`, and `KEY|SECRET|TOKEN|PASSWORD = <16+ chars>`). Values are not reproduced here.

| Finding | Location | Assessment |
|---|---|---|
| `sk-` pattern, 467 hits | `api-server/src/data/video-catalogue.json`, `api-server/data/auction-2027-updates.json` | False positive. The matches are inside slugs and URLs; a strict boundary-anchored pattern found 0 hits. |
| Token-like assignments, 3 | `api-server/test/auction-2027.test.ts:14`, `day1-security.test.ts:20`, `platform-routes.test.ts:8` | Test fixtures (`…-admin-token-0123…`, `admin-fixture-token…`). Not credentials. |
| JWT-shaped strings, 3 | `scripts/iplt20_rcb_squad.html`, `scripts/iplt20_rcb_squad_rsc.txt`, `scripts/rcb_page.html` | Embedded in saved third-party web pages. Probably public page tokens. Low risk, but these pages need not be tracked. |
| Past `.env` in history | `artifacts/ipl-analytics/.env` (commits `deba169`, `45618e8`) | Held `VITE_ADSENSE_CLIENT` (a public AdSense client id) and `VITE_BACKEND_PORT`. No secret. The file is no longer tracked. |
| Supabase project URL | old `.env.example` | A public project URL, not a secret. Removed now that `.env.example` holds names only. |

No live credential was found. History was not rewritten.

## 2. Classification summary

- **App code:** `artifacts/ipl-analytics`, `artifacts/mockup-sandbox`, `integrations/whatsapp-prototype`
- **Backend:** `artifacts/api-server/src`
- **Shared lib:** `lib/db`, `lib/api-*`, `lib/arcade-rules`
- **Data engineering:** `scripts/src`, `lib/cricket-data`, `artifacts/api-server/scripts`, top-level `scripts/*`
- **Modelling:** `api-server/src/services/{intelligence,pressure,retention,decision,scout}`, `api-server/scripts/intelligence/train.py`
- **Datasets:** `ipl_csv/`, `players-data-updated.csv`, `people.csv`, `2026 ipl auction player list.*`, `api-server/data/`, `public/data/`
- **Config:** root manifests, `vercel.json`, `supabase/`, `.replit`, `replit.nix`
- **Docs:** `docs/`, root `*.md`
- **Test:** `api-server/test`, `ipl-analytics/e2e`, `scripts/src/**/tests`, `supabase/tests`
- **Assets:** `public/`, `IPL PLAYER PROFILE/`, `image players/`, root images, `attached_assets/`
- **Unknown:** `substack/`
- **Generated:** `exports/`, `artifacts/image-ingestion`, `lib/api-zod`, `api-client-react/src/generated`, `data/`
- **Legacy / unknown:** `scratch/` (partly provenance), root `schema.sql` / `migrations.sql` (describe older schemas), `run.*`, `START.bat`, `TODO.md`, `replit.md`

## 3. Current tree (top level)

```
.
├── artifacts/
│   ├── ipl-analytics/      # product SPA (Vercel builds this)
│   ├── api-server/         # API + models + data snapshots + model scripts
│   ├── mockup-sandbox/     # design sandbox
│   └── image-ingestion/    # generated output
├── lib/                    # db, api-spec, api-zod, api-client-react, arcade-rules, cricket-data
├── scripts/                # @workspace/scripts (src/) + 137 one-off files
├── scratch/                # 200 one-off scripts (some produced public/data)
├── ipl_csv/                # 1,244 Cricsheet match CSVs (runtime path)
├── docs/                   # reports, repairs, methodology
├── IPL PLAYER PROFILE/  image players/  attached_assets/  substack/  exports/  data/
├── integrations/whatsapp-prototype/   supabase/
├── 40 × *.md   43 × images   csv/xlsx datasets   run.* / START*.bat
└── package.json  pnpm-workspace.yaml  vercel.json  tsconfig*.json
```

## 4. Recommended tree (proposal: needs approval)

The structure already maps onto the three identities. The proposal therefore **keeps every code and data path** and only clears the root. No package is renamed or moved, because `vercel.json`, `.claude/launch.json`, `e2e/playwright.config.ts`, `START-CRICFIELD.bat`, `app.ts` (`../../ipl-analytics/dist/public`) and the `pnpm` workspace globs all depend on the current paths.

```
.
├── artifacts/
│   ├── ipl-analytics/        # CricField product           (unchanged)
│   ├── api-server/           # Analytics engine            (unchanged)
│   ├── mockup-sandbox/       #                              (unchanged)
│   └── image-ingestion/      #                              (unchanged)
├── lib/                      # shared libs + cricket-data   (unchanged)
├── scripts/                  # Data pipeline                (unchanged for now)
├── scratch/                  # unchanged until each generator is reviewed
├── ipl_csv/                  # unchanged (runtime path)
├── IPL PLAYER PROFILE/       # unchanged (cited by photo registry)
├── docs/
│   ├── ARCHITECTURE.md … TESTING.md, REPOSITORY_AUDIT.md   # added in this branch
│   ├── history/              # ← root DAY-*.md and other historical reports (proposed M1)
│   └── …existing folders
├── assets/source/            # ← 2 unique root images (proposed M3)
├── README.md  CONTRIBUTING.md  SECURITY.md  LICENSE  .env.example
├── players-data-updated.csv  people.csv  2026 ipl auction player list.*   # stay: read by code at root
└── configs (package.json, pnpm-workspace.yaml, vercel.json, tsconfig*, START*.bat, run.*)
```

Not proposed: a deeper monorepo split (for example `apps/` and `packages/`). It would change deploy entry points and launch configs and gain nothing functional.

## 5. Migration manifest

| ID | Old path | New path | Reason | Evidence / risk | Validation status |
|---|---|---|---|---|---|
| M1 | 37 historical root `*.md` (`DAY-*`, `*_REPORT`, `MASTER_ARCHITECTURE_HANDBOOK.md`, `PROJECT_TREE.md`, …) | `docs/history/` | Clear the root; these are dated reports | No code reads them. Links to them: `ENGINEERING-SPRINT-SUMMARY.md` and `docs/data-repairs/2026-10-19-day6b/baseline-refresh.md` (would be updated). Low risk. | **applied**, checks match baseline |
| M2 | `CONTRIBUTING.md`, `SECURITY.md`, `README.md`, `LICENSE` | stay | GitHub expects them at the root | — | n/a |
| M3 | `manoj_bhandage_toi.jpg`, `mohit_rathee_toi.jpg` | `assets/source/` | Unique images with no code reference | `git grep` shows no reference. Low risk. | **applied**, checks match baseline |
| D1 | 41 root images (stadiums, team logos, `rcb winner 2026.jpg`) | delete | Byte-identical copies already in `artifacts/ipl-analytics/public/` | The app maps names to `public/venue-images/` (`src/lib/aggregates.ts`). Vite serves only `public/`. Low risk. | **applied**, checks match baseline |
| D2 | `.gitignore.tmp`, `temp.json`, `etl_output.log`, `desktop.ini` | delete | Stray files | `git grep` shows no reference. Low risk. | **applied**, checks match baseline |
| D3 | 5 × `scripts/image_ingestion/**/__pycache__/*.pyc` | delete (`__pycache__/` was already ignored; the files had been force-added) | Compiled Python | Regenerated automatically. Low risk. | **applied**, checks match baseline |
| D4 | `artifacts/ipl-analytics/test-results/.last-run.json` | delete, and ignore `test-results/` | Playwright output | Generated. Low risk. | **applied**, checks match baseline |
| D5 | `scratch/player-bio.json.bak` | delete | Backup file (`*.bak` is already ignored) | No reference. Low risk. | **applied**, checks match baseline |
| H1 | `data/ipl.db` (0 bytes), `data/platform.sqlite` + `-wal`/`-shm` | untrack (`git rm --cached`), keep on disk | Stray database files; `.gitignore` already names `data/platform.sqlite` | No code reference to `data/ipl.db`. `platform.sqlite` is recreated when the API runs from the repo root. **Touches database files, so it needs explicit approval.** | held |
| H2 | `image players/` (45) | keep for now | All duplicated in the frontend | Referenced by `scratch/*.py` photo scripts. Uncertain dependency. | held |
| H3 | `scratch/`, top-level `scripts/*` | keep | Some generated production `public/data` files | Provenance would be lost. Review each script first. | held |
| H4 | `exports/`, `attached_assets/`, `substack/` | keep | `exports` is the output of a script; Vite aliases `attached_assets`; `substack/` has no reference but its purpose is unknown | `exports` and `attached_assets` dependencies confirmed; `substack/` uncertain. | held |
| H5 | saved third-party pages `scripts/*.html`, `*_rsc.txt` | candidates to untrack | Scrape inputs containing page tokens | Possibly read by scrape scripts. Needs review. | held |
| H6 | 8 differing JSON pairs in `api-server/data` vs `public/data` | no change | A data decision, not a cleanup | Changing either copy changes analytics output, which this task forbids | held |

Rows marked *held* stay unless the user decides otherwise.

### Applied file list

- **M1:** 37 files `X.md` → `docs/history/X.md` (`git mv`, so history follows with `git log --follow`). No relative links needed rewriting. Their only link is an absolute `file://` link, kept as it was. Code comments that name these reports (for example "DAY-05-REPORT.md") still identify them by file name.
- **M3:** `manoj_bhandage_toi.jpg`, `mohit_rathee_toi.jpg` → `assets/source/`.
- **D1:** 41 deletions. Each was re-verified byte-identical (`git hash-object`) to its copy in `artifacts/ipl-analytics/public/` (`public/venue-images/<same name>` for stadiums; `public/<same name>` for logos; `public/rcb-winner-2026.jpg`).
- **D2–D5:** 11 deletions. Added `artifacts/ipl-analytics/test-results/` to `.gitignore`.

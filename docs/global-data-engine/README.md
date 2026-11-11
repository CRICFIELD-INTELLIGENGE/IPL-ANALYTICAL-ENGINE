# Global Cricket Data Engine

A separate, competition-aware warehouse (`global.db`) built from Cricsheet ball-by-ball data. It holds IPL plus other T20 competitions, so players can be compared across leagues. The existing IPL site keeps reading `sqlite.db`, which this engine only ever opens read-only.

- Plan and audit: [00-audit-and-plan.md](00-audit-and-plan.md).
- Batch 1 results: [01-batch-1-report.md](01-batch-1-report.md).
- Scouting service (Step 1) and demonstration queries (Step 2): [02-scout-service-and-demos.md](02-scout-service-and-demos.md); definitions in [scout-service.md](scout-service.md).
- Existing-site fixes prepared for review (Step 3, not applied): [step3/README.md](step3/README.md).
- Metric definitions: [metrics.md](metrics.md).
- Identity rules: [identity.md](identity.md).
- Schema, with comments: [`scripts/src/global/schema.sql`](../../scripts/src/global/schema.sql).

## Data source and licence

- Match data comes from [Cricsheet](https://cricsheet.org/). It is used under the [Open Data Commons Attribution License (ODC-BY 1.0)](https://opendatacommons.org/licenses/by/1-0/); see [Cricsheet licensing](https://cricsheet.org/licensing/).
- Every archive ships its own `LICENSE.txt`, which is kept inside the stored zip.
- Any public page built on this data must credit Cricsheet and state the licence.
- Cricsheet publishes historical data periodically. It is not a live-score feed.

## Layout

```
lib/cricket-data/global/
├─ raw/cricsheet/                 gitignored, immutable
│  ├─ archives/<slug>/<lastModified>_<sha8>.zip      one file per distinct content hash
│  └─ register/{people,names}/<lastModified>_<sha8>.csv
├─ manifests/                     tracked
│  ├─ sources.json                competition catalogue (enabled flag, catalogue counts)
│  ├─ acquisitions.jsonl          append-only download log (url, time, Last-Modified, bytes, SHA-256, entries)
│  ├─ coverage.json               generated: seasons, matches, deliveries, archive hash per competition
│  ├─ team-aliases.json           explicit, sourced franchise renames
│  └─ identity-decisions.json     reviewed identity decisions (survive a rebuild)
├─ warehouse/global.db            gitignored, rebuildable from raw/
└─ reports/                       tracked: validation, identity, change and benchmark reports
scripts/src/global/               pipeline (run with tsx through @workspace/scripts)
scripts/src/global/tests/         node:test suites
```

## Commands

Run from the repository root.

| Command | What it does |
|---|---|
| `pnpm --filter @workspace/scripts run global:sync` | **The update command.** Checks Cricsheet with conditional requests and downloads only changed files. It then normalizes changed matches, refreshes identity, recomputes the affected competitions, validates, and writes a change report. |
| `pnpm --filter @workspace/scripts run global:build` | Runs the same steps from the archives already on disk, with no network. |
| `pnpm --filter @workspace/scripts run global:sync -- --only smat,bbl` | Limits the run to some competitions. |
| `pnpm --filter @workspace/scripts run global:build -- --force` | Re-normalizes and re-aggregates everything. |
| `pnpm --filter @workspace/scripts run global:acquire` | Download step only. |
| `pnpm --filter @workspace/scripts run global:normalize` | Normalize step only. |
| `pnpm --filter @workspace/scripts run global:identity` | Identity step only. |
| `pnpm --filter @workspace/scripts run global:aggregate` | Aggregate step only. |
| `pnpm --filter @workspace/scripts run global:validate` | Validation step only. |
| `pnpm --filter @workspace/scripts run global:bench -- --vacuum` | Compacts `global.db` and writes `reports/bench-<date>.md`. |
| `pnpm --filter @workspace/scripts run test:global` | Unit and end-to-end tests on an in-memory database. |

A rebuild from scratch is: delete `lib/cricket-data/global/warehouse/global.db`, then run `global:build`. It takes about 30 seconds for Batch 1 (measured: 27 s, and the result was identical to the incremental build).

Nothing is scheduled. Every run is manual.

## How an update works

1. **Acquire.**
   - Downloads one file at a time, sending `If-Modified-Since`. Cricsheet sends `Last-Modified` but no ETag.
   - A changed file goes to a `.part` file first. Its size is checked, every zip entry is inflated and checked against its CRC-32, and its SHA-256 is recorded.
   - A new immutable file is stored only if the hash differs. Old archives are never deleted.
2. **Normalize.**
   - Reads JSON straight from the zip.
   - A match is re-ingested only if it is new or its zip-entry CRC changed. Cricsheet bumps `meta.revision` when it corrects a file.
   - Matches missing from the newest archive are flagged with `in_latest_source = 0`, not deleted.
   - Unknown JSON keys are stored verbatim in `extra` columns and counted in `schema_drift`.
3. **Identity.** Loads the people register, links the IPL warehouse by exact Cricsheet identifier, rebuilds the review queue, and writes `reports/identity-<date>.md`.
4. **Aggregate.** Recomputes the analytics tables for competitions that changed.
5. **Validate.** Writes `reports/validation-<date>.md` and `manifests/coverage.json`. The process exits with code 2 if any check fails.

## Adding a competition

1. Find the slug on <https://cricsheet.org/downloads/> (for example `ctc_json` for the CSA T20 Challenge).
2. Register it. This makes a HEAD request only, and the entry is added disabled:

   ```bash
   pnpm --filter @workspace/scripts run global:onboard -- --code csa-t20 --name "CSA T20 Challenge" --slug ctc_json --region "South Africa" --format T20 --gender male --team-type club --catalogue-matches 314
   ```

3. When it is approved, enable it and sync just that competition:

   ```bash
   pnpm --filter @workspace/scripts run global:onboard -- --code csa-t20 --enable
   ```

   ```bash
   pnpm --filter @workspace/scripts run global:sync -- --only csa-t20
   ```

Batch 2 (PSL, BPL, LPL, MLC, The Hundred men, T20 Blast, Super Smash men, men's T20Is) is already listed in `sources.json` with `enabled: false`.

**The Hundred** uses 5-ball sets (`balls_per_over` = 5). The schema and phase rules handle it, and its rates are per ball.

## Boundaries

- **Read only:** `sqlite.db`, `ipl_csv/`, `lib/cricket-data/raw/` and the site's JSON files. The engine opens them read-only and never writes to them.
- **Not in the browser:** no `global.db` data reaches the frontend bundle. `fflate` is a dependency of `@workspace/scripts` only.
- **Not shipped:** no website UI, route or API endpoint uses `global.db` yet. That integration needs separate approval.
- **No invented attributes:** bowling style, batting hand, nationality, date of birth and capped status are not in Cricsheet. They are absent from `global.db`, not guessed.

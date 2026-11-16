# Global T20 warehouse — status 2026-11-17

Pipeline (existing, reused):
`pnpm --filter @workspace/scripts run global:sync`
It runs acquire → normalize → identity → aggregate → validate → change report. It is idempotent: archives are compared by SHA-256, matches by `meta.revision`. It never touches `sqlite.db`.
New: `global:coverage` writes `lib/cricket-data/global/reports/coverage-<date>.md|json` from the database. The competition registry, with every requested competition and its source or blocker, is `lib/cricket-data/global/manifests/competition-registry.json`.

## Ingested this pass (Cricsheet, ODC-BY 1.0, ball-by-ball)
| League | Matches (= Cricsheet catalogue) | Deliveries | Seasons |
|---|---|---|---|
| Pakistan Super League | 357 | 83,799 | 2016–2026 |
| Bangladesh Premier League | 469 | 111,232 | 2012–2025 |
| Lanka Premier League | 143 | 32,917 | 2020–2026 |
| Major League Cricket | 109 | 25,529 | 2023–2026 |
| Vitality T20 Blast | 1,570 | 360,545 | 2014–2026 |
| Super Smash (men) | 270 | 61,502 | 2013–2025 |
| Nepal Premier League | 76 | 17,553 | 2024–2026 |

Already present and refreshed to Cricsheet's latest revisions: IPL, SMAT, BBL, SA20, CPL, ILT20 and men's T20Is. The warehouse now holds 14 men's T20 competitions. The Hundred stays disabled (100-ball format) and is never aggregated with T20.

Validation of the 2026-11-16 run: 265 pass, 14 warn, 1 fail.
- The fail is one T20I, Cricsheet match `1495657`. It records "won by 46 runs", but the innings totals are 178 and 133, a 45-run margin. Every delivery in it passes the run-total checks. It was failing before this pass, and is reported, not altered.
- The warnings are properties of the sources: missing seasons, small seasons, one unexplained long over.

Identity: 7,804 players in loaded matches; 964 IPL warehouse players linked exactly. 177 ambiguous identities sit in `identity_review_queue` for a human decision. Nothing is merged on name similarity.

Backup taken before ingestion: `..\backups-global\global-pre-batch2-2026-11-17.db`, outside the repo. integrity_check: ok.

## Not ingested, and why
- **SMAT after 2024-25.** Cricsheet's catalogue still has 695 matches through 2024-25. BCCI serves scorecards from `bcci.tv/api/`, which its `robots.txt` disallows, and offers no download or licence. Re-running `global:sync` picks up new seasons when Cricsheet publishes them.
- **Indian state T20 leagues and U23 State A.** None are on Cricsheet (verified). The associations' own sites have **not yet been investigated** for a permitted machine-readable feed, so no adapter exists. The next step is per-league: find the official scorecard source and check its terms before writing an adapter.
- **Cricmetric.** No published API, dataset or data licence; `robots.txt` disallows `/api/` and `/jscripts/`. It only offers aggregates, which can't supply ball-by-ball data. No adapter was built.
- **Kaggle / GitHub datasets.** Not investigated in this pass.

## Product changes
- The Scout Lab backend reads competitions from `global.db`, so every ingested league works through `/api/scout/*`.
- The Scout Lab league list and map (`SCOUT_LEAGUES`) now include the seven new leagues.
- Not built in this pass: player similarity, auction suitability scoring, competition-adjusted estimates for the new leagues, and the Ask AI extensions for scouting questions.
- **Production note:** `global.db` is not in Git. Production reads Turso's copy, which doesn't have the new leagues. Hybrid hosting serves them from the laptop's local warehouse.

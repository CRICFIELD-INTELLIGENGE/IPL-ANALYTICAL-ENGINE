# CricField IPL 2027 Intelligence Hub — Phase 1 delivery

Implemented on 27 October 2026. This is the public-launch MVP specified in Phase 1 of the supplied brief. Phase 2 and Phase 3 are explicitly not represented as complete.

## Architecture audit and implementation map

| Existing system | Location | Reuse in this delivery |
| --- | --- | --- |
| Feed and six feature categories | `artifacts/ipl-analytics/src/pages/feed.tsx` | Existing hero, cards, imagery, spacing and animations preserved; destination links extended |
| Lazy page routes | `artifacts/ipl-analytics/src/App.tsx` | One additional lazy route, `/feed/ipl-2027` |
| Header, left navigation, right panel toggle and mobile rails | `src/components/layout.tsx` | Existing `Layout`; child Feed route receives the existing active indicator |
| Right-hand Analyst Navigator | `src/components/analyst-navigator.tsx` | Hub-specific destinations and warehouse question handoff, with selected franchise and module context |
| Franchise identity | `src/lib/team-context.tsx` | Existing ten franchise IDs, names, logos, colors and global header switcher |
| Squad explorer and player profiles | `src/components/team-squad.tsx`, `src/pages/player.tsx` | Existing profiles linked; same shared player-avatar component |
| Franchise Dugout | `/dugout`, `/dugout/:team` | Routes and components preserved |
| Global Scout Engine | `/scout`, `/scout/player/:id`, `/scout/compare`, `/scout/roles` | Existing engine linked rather than duplicated |
| Franchise/venue analytics | `src/lib/aggregates.ts`, API `src/services/team-analytics.ts` | Existing typed data hooks and optional franchise phase API |
| UI and charts | `src/components/ui`, Recharts, Tailwind, Framer Motion | Reused Card, Tabs, Button, Input, Badge and chart conventions; no new dependencies |
| IPL data warehouse | root `sqlite.db` | Audited read-only: 1,243 matches, 295,732 deliveries, 1,141 players; no writes or schema changes |
| Multi-league warehouse | `lib/cricket-data/global/warehouse/global.db` | Audited read-only: 18,623 players; IPL, SMAT, BBL, SA20, CPL and ILT20 present |
| Existing 2027 illustrative content | `src/data/strategy-2027-data.ts` | Not used: contains illustrative ratings/budget values unsuitable as verified inputs |
| Existing API services | `artifacts/api-server/src/services/decision`, `services/scout` | Remain authoritative for advanced analytics and scouting; no duplicate backend |

Paths beginning `src/` in the table are relative to `artifacts/ipl-analytics`.

The audit preceded edits. The implementation adds a page and pure analytical functions while preserving source datasets, editorial publication statuses and Getty rights controls.

## Files created

- `artifacts/ipl-analytics/src/lib/ipl-2027.ts`: typed event registry, exact-alias roster retrieval, role coverage, historical performance indexing, configurable retention model and saved-scenario validation.
- `artifacts/ipl-analytics/src/lib/use-ipl-2027.ts`: composition of existing data hooks and official squad snapshot.
- `artifacts/ipl-analytics/src/pages/ipl-2027.tsx`: working Phase 1 hub and franchise briefs.
- `artifacts/ipl-analytics/src/pages/ipl-2027.css`: scoped print styling only.
- `scripts/check-ipl-2027.mjs`: deterministic model/data/scenario checks using the real datasets.
- `scripts/check-ipl-2027-browser.mjs`: desktop/mobile browser journeys, negative states and screenshots.
- This report, `coverage.json`, `browser-results.json`, `visual-comparison.json`, test/build logs and screenshots in this directory.

## Existing files modified for this feature

- `artifacts/ipl-analytics/src/App.tsx`: lazy hub route.
- `artifacts/ipl-analytics/src/pages/feed.tsx`: Explore action and feature destinations. Replaced the unverified “₹120 CR CAP” card badge with “AUCTION PLANNING”; no 2027 purse assertion is made.
- `artifacts/ipl-analytics/src/components/analyst-navigator.tsx`: contextual hub guidance and destinations; existing toggle and layout preserved. Context instructions are passed to the Ask URL, not displayed as part of the suggested question.
- `artifacts/ipl-analytics/src/components/layout.tsx`: recognize `/feed/*` as an active Feed destination. No geometry or responsive styles changed.

Other pre-existing working-tree changes, including player-photo work from earlier requests, were preserved and are outside this feature's file list.

## Routes and navigation

- New route: `/feed/ipl-2027`.
- Query state: `team=CSK|MI|RCB|KKR|SRH|RR|DC|PBKS|GT|LSG` and `module=overview|retention|gaps|brief|tools`.
- Ten shareable briefs, for example `/feed/ipl-2027?team=RCB&module=brief`.
- Unknown team/module query values use a safe existing team/default module.
- Back to Feed link is always available on screen.
- Explore 2027 Intel now opens the hub. Squad Building opens the lab; Auction opens planning gaps; Tactics opens existing tools; Star Watch opens Scout; Venues keeps its existing visualization destination; Storylines opens the evidence-based franchise brief.
- Existing player, team analytics, Scout, AI Analyst and Dugout URLs remain in use.

## Database and source data changes

None. The feature reads existing datasets and APIs. User decisions are local browser data under `cricfield:ipl-2027:retention:<TEAM>:v1`. No accounts, remote writes, database migrations, publication changes or editorial predictions were added.

## Working features

1. Hub with a ten-franchise selector synchronized with the existing header switcher and URL state.
2. Six-event preparation timeline: retention deadline, retention announcements, registration, auction, results and completion. Each event has a status, source field, checked date and missing-information explanation.
3. Current planning baseline and composition: listed options, nationality, batting/keeping/bowling/all-rounder roles, known pace/spin styles and handedness. Missing attributes remain unavailable.
4. Retention Lab: player search, role filtering, player evidence, retain/release/trade/undecided scenarios, dynamic composition changes, local save/reload and reset with storage-error handling.
5. Historical batting and bowling tables, descriptive batting phase rates, minimum-sample controls, factor breakdown, editable model weights and same-role historical comparison options.
6. Squad Gap Analyzer: role coverage chart, editable targets, remaining resources and three explained planning questions.
7. Ten data-generated briefs with previous-season dataset context, resources, balance, retention questions, auction priorities, scouting/tactical links, source references and limitations.
8. Copyable brief URLs and a print view without an added PDF dependency.
9. Existing right-hand Navigator destinations, contextual warehouse question links and existing Scout/tactics tools.
10. Useful loading, empty, missing-performance, unavailable-backend, unknown-nationality and missing-finance states. No unsupported statistics are synthesized.

## Dataset coverage and verification

The roster baseline is the existing official IPL snapshot, retrieved 26 October 2026. It lists players across the season, including replacements; **it is not a verified eligible 2027 squad**. Post-season transfers need review before an official 2027 list can replace the baseline.

| Team | Listed 2026 players | Matched historical performance |
| --- | ---: | ---: |
| CSK | 30 | 25 |
| MI | 29 | 21 |
| RCB | 26 | 19 |
| KKR | 29 | 20 |
| SRH | 29 | 20 |
| RR | 27 | 19 |
| DC | 26 | 21 |
| PBKS | 25 | 21 |
| GT | 27 | 23 |
| LSG | 26 | 21 |

Matching uses exact recorded names and aliases in the squad/bio files, never a first-initial/surname guess. Unmatched players stay visible and do not receive fabricated season records. Performance export update timestamps are not recorded, and the UI states that limitation. The export includes historical seasons through 2026 but is not asserted to be complete.

Sources:

- `public/data/official-squads.json`: listing, keeper flag, roles and nationality.
- `public/data/squads-by-season.json`: recorded player-name mappings and historical acquisition fee, when present.
- `public/data/player-bio.json`: exact bio aliases, batting and bowling styles.
- `public/data/player-season-stats.json`: batting/bowling history and recent rate benchmarks.
- `public/data/matches.json`: loaded previous-season result context, expressly not a completeness claim.
- Existing `/api/ipl/team-analytics`: optional 2024–2026 phase rates with sample thresholds. API failure produces a transparent unavailable state.

The 15 November and 16 December 2026 dates are marked **reported**, not confirmed. The registry links to the [26 October report](https://www.business-standard.com/amp/sports/business/ipl-2027-auction-december-16-goa-retention-deadline-november-15-126102601223_1.html). The official [2025–2027 regulations announcement](https://www.iplt20.com/news/article/ipl-governing-council-announces-tata-ipl-player-regulations-2025-27) was checked, but its original mega-auction retention rules are not silently applied as 2027 mini-auction rules. No verified event countdown or 2027 purse is inferred.

## Calculation methodology

### Squad structure

Default analytical depth targets: 5 batters, 6 bowlers, 3 all-rounders and 2 wicketkeepers. Targets are editable and are **not IPL limits**. A keeper flag takes precedence over a general batter label. Unknown roles are excluded from role totals and remain present in the roster.

`shortfall(role) = max(0, target(role) − remaining listed options(role))`.

Priorities sort by shortfall, then coverage/target. Where a target is already met, the output asks for quality/phase validation rather than falsely declaring a weakness. Pace/spin/handedness counts describe known profile attributes only. No overall squad strength score is invented.

### Retention model

Qualifying window: 2024–2026. Default minimum sample: 120 batting balls or 60 bowling balls in a season. Both thresholds are editable.

- Recent performance, weight 50: latest qualifying season's SR percentile for batters/keepers, inverse economy percentile for bowlers; all-rounders average available batting and bowling percentiles. Cohort is IPL player-season records in the same season with the relevant minimum balls; at least three cohort records required.
- Consistency, weight 20: `max(0, 100 × (1 − population standard deviation / mean))`, over at least two qualifying seasonal rates. Uses economy for bowlers and strike rate for batting roles. Stability is not treated as quality.
- Role scarcity, weight 20: `100 × min(1, role target / current role options)`; unknown roles unavailable.
- Replacement scarcity, weight 10: `100 / (1 + qualifying same-role options outside this squad)`; comparison availability is hypothetical, not auction registration.
- Overall: `sum(available factor × positive weight) / sum(available positive weights)`. Missing factors are excluded and weights re-normalized. No score without a qualifying performance factor; all-zero weights also yield no score.
- Interpretation: at least 65 → review for retention; 40–64 → compare alternatives; below 40 → review release scenario. These configurable analytical assumptions are not official franchise decisions or prices.

Age trajectory, injury information and contract efficiency are excluded for insufficient verified inputs. Historical acquisition fees are labeled as references, never converted into 2027 savings or purse figures.

Player phase strike rates are descriptive because the export lacks their per-phase ball counts. No phase recommendation is calculated from these unqualified rates. Optional team phase rates require at least 120 balls in the returned phase. Player bowling phase economy is explicitly unavailable where absent from the export.

### Local scenarios

Release/trade remove a player from the scenario's remaining resources; retain/undecided keep the player. Trade does not assume a willing partner or official eligibility. Save validation checks schema version, franchise, timestamp, player IDs and decision values. Unknown IDs/values are ignored. Reset clears decisions and that franchise's saved record. Scenario changes do not change source data, official status, salary or auction balances.

## Validation

- Frontend type checking: passed.
- Frontend production build: passed. Existing non-blocking source-map, chunk-size and Node engine warnings remain; the environment runs Node 26 while the repository requests Node 24.
- `node scripts/check-ipl-2027.mjs`: passed with real data for all ten rosters, unique identities, role counts, release arithmetic, valid/corrupt/cross-team saves, empty rosters, no performance data, all-zero weights, a known qualifying player score and event provenance.
- `node scripts/check-ipl-2027-browser.mjs`: passed in installed Chrome against the local Vite preview. Exercises all ten selectors and brief URLs, Feed entry, save/reload, team isolation, reset, empty search, editable targets, backend-unavailable rendering, Navigator toggles/context links, header switcher, print, empty-squad rendering and mobile overflow. No uncaught page errors.
- Existing identity, data-integrity and Scout tests: **33 passed, 0 failed**. Invoked through the existing `tsx --test` infrastructure, with its read-only environment.
- Full all-route end-to-end suite was not run. Browser checks intentionally force API 503 responses to verify actual static fallback datasets and honest unavailable states; they do not replace live-backend coverage. Existing Scout tests exercise the real warehouse through their local API harness.

Reproduce the existing regression subset from the repository root:

```powershell
pnpm --filter @workspace/api-server exec tsx --import ./test/test-readonly-env.mjs --test test/scout-rankings.test.ts test/day6-identity.test.ts test/data-integrity.test.ts
```

For browser checks, set `E2E_BASE_URL` if the preview is not at `http://127.0.0.1:3078`. Local browser/API access must be permitted by the host. Logs and machine-readable results are saved alongside this report.

## UI preservation evidence

Screenshots in `screenshots/`:

- `feed-before-desktop.png`, `feed-after-desktop.png` at 1440 × 1000.
- `feed-before-mobile.png`, `feed-after-mobile.png` at 390 × 844.
- Corresponding `feed-diff-*.png` and quantified bounds in `visual-comparison.json`.
- `hub-retention-desktop.png`, `hub-brief-desktop.png`, `hub-overview-mobile.png`, `hub-brief-print.png`.

The Feed's original layout, hero, typography, cards and navigation geometry are unchanged. Capture differences are confined to dynamic clock/animation/text regions; these screenshots are not claimed to be a deterministic all-pixel regression suite. The new mobile hub has no horizontal document overflow. Its tables and module strip scroll within their own containers.

## Deferred phases and blockers

Phase 2 remains deferred: dedicated 2027 Auction War Room scenario engine, cross-league candidate-to-auction shortlist workflow, shareable user scenario payloads, and public immutable editorial Prediction Tracker. Existing Scout and auction tools are linked, not claimed as those completed modules.

Phase 3 remains deferred: conversational answers aware of local decision state, advanced tactical synthesis, post-retention prediction evaluation and auction outcome comparisons. The current integration passes franchise/module and historical-only instructions to the existing Ask page; it does not claim a new 2027 AI backend.

Data blockers for official claims: verified 2027 eligible squads, retentions/releases, auction registration, purse/contract data, event confirmations and applicable auction rules. There is no implementation blocker to using the Phase 1 scenario tools. Missing phase/biographical data remains explicit. No Getty controls, article review statuses or source datasets were changed by this feature.

# CRICFIELD Retention Room

> **Superseded in part by [V2](V2.md) (2026-11-04).** CRICFIELD Picks now use the Composite Retention Rating (`crr-2.0`); the eight-metric index below is kept only for comparison. The deadline is now reported as 17 Nov, and voting locks on 16 Nov at 18:30 UTC.

Delivery report, 2026-11-03. Live at `/retention-room` and `/retention-room/:team`. Snapshot `cf-intel-2026.edfb72b57d`, data to 2026-05-30, index `rri-1.0`. Nothing is committed or deployed.

## Implemented

| Area | What exists |
|---|---|
| CRICFIELD Picks | Eight-metric 100-point index for 280 players across all ten squads, categories, evidence coverage, expandable analysis, replacement options, editorial override kept beside the score |
| Retention Forecast | Shows "Forecast unavailable — insufficient validated evidence." The model failed its gate, so no percentage appears. Confirmed decisions are labelled confirmed. A provisional rank is shown and marked as not a forecast |
| Fan Picks | Signed-in ballots, one per user, franchise and cycle; editable until the lock; rule checks; community results |
| Squad Impact | Current squad vs CRICFIELD Picks vs Fan Picks vs your own choices, on the existing optimizer |
| Dilemmas | Generated from model evidence, with a separate slot for editorial opinion |
| Past Predictions | Immutable freezes, scoring against sourced decisions, and a separate retrospective evaluation |
| Rules engine | `data/retention/season-rules.json`, covering 2027 mini, 2026 mini, 2025 mega |

**Site integration:** War Room, Squad Builder (load CRICFIELD or fan squad), Scout Lab, player profiles, Dugout pages, Feed, Auction hub, AI Analyst (four tools), Account Saved Items, and the Analyst Navigator. The Methodology page has not been updated for the index.

## Files

**New:** `artifacts/api-server/src/services/retention/` (`rules`, `picks`, `store`, `service`), `src/routes/retention.ts`, `data/retention/season-rules.json`, `test/retention.test.ts`; `artifacts/ipl-analytics/src/lib/retention-api.ts`, `src/components/retention/` (`retention-widgets.tsx`, `retention.css`), `src/pages/retention-room.tsx`.

**Modified, API:** `routes/index.ts`, `routes/ai-analyst.ts`, `services/cricfield-analyst.ts`, `services/platform/worker.ts`, `services/decision/auction-war-room.ts`, `services/intelligence/service.ts`, `services/intelligence/squad-optimizer.ts`, `scripts/intelligence/train.py`, `scripts/intelligence/02-publish.ts`.

**Modified, web:** `App.tsx`, `lib/sim-api.ts`, `lib/intelligence-api.ts`, `components/intelligence/intel-components.tsx`, `components/analyst-navigator.tsx`, `components/desktop-auth/DesktopAccountProfile.tsx`, pages `player`, `dugout`, `feed-auction`, `ai-analyst-feed`, `ai-analyst-auction`, `ipl-2027-retentions`.

**Also:** a `decision-api-direct` entry in `.claude/launch.json`, because the `tsx` CLI cannot spawn here.

## Data sources

| Fact | Status |
|---|---|
| Retention deadline 15 Nov 2026, auction 16 Dec, Goa, mini-auction | Reported ([CricTracker](https://www.crictracker.com/cricket-news/bcci-sets-november-15-as-ipl-2027-retention-deadline-ahead-of-auction-3582/), Business Standard). No public IPL notice located |
| 25-player, 8-overseas limits for 2027 | Carried from 2026. Not confirmed |
| ₹157 Cr 2027 figure | A total salary cap, not the auction purse |
| 2026 purse ₹125 Cr | Derived: retained contracts plus official starting purse equal exactly ₹125 Cr for six teams |
| 2027 auction purse | **Not verified.** Purse results show Unavailable |
| 2025 mega rules | 6 retentions, slabs ₹18/14/11/18/14 Cr, ₹4 Cr uncapped; matches the published ₹79 Cr example |

Contract records fall short of the official 2026 totals for CSK (₹2 Cr), DC (₹3.45 Cr), RR (₹4 Cr) and KKR (₹6 Cr), and 32 of the 280 squad players have no salary on file. Where one is missing, the committed total is shown as a known part plus a missing count.

## Model validation

Mini-auction continuation, expanding-window by season, 948 out-of-time decisions.

| Measure | 2026 holdout | All folds |
|---|---|---|
| Accuracy | 67.1% | 73.3% |
| Precision | 77.1% | 78.3% |
| Recall | 68.8% | 79.8% |
| Brier | 0.222 (base rate 0.231) | 0.181 |
| Calibration error | **0.13 (limit 0.08)** | |

By season, accuracy: 2021 73%, 2023 72%, 2024 81%, 2026 67%. By franchise: 67% (RCB) to 79% (CSK). Trades are too few for a three-way model (24 rows across all seasons), so the model is binary. Mega retention is excluded: two comparable events cannot be tested out of time.

**The gate failed, so no percentage is published.** The model was not retuned against the 2026 holdout. The real 2027 decisions will be its first clean test.

The index weights are editorial and unvalidated. Picks are a recommendation.

## APIs

`GET /api/retention/seasons`, `/summary`, `/history`, `/freezes/:id`; `GET /api/retention/:season/franchises/:team` with `/picks`, `/forecast`, `/fan-results`, `/dilemmas`; `GET /api/retention/:season/players/:key`; `POST /api/retention/simulate`, `/ballots`, `/ballots/check`; `GET /api/retention/ballots/mine`; admin `POST /api/retention/:season/freeze`, `/editorial`.

## Franchise coverage

All ten: CSK, DC, GT, KKR, LSG, MI, PBKS, RCB, RR, SRH. 280 players; 53 are Insufficient Evidence, mostly uncapped players with no IPL record. The roster is the IPL 2026 squad list, stated on every response. It includes replacement players, so several lists exceed 25.

## Tests

| Check | Result |
|---|---|
| API tests | 188 of 188, including 28 for retention |
| API and web typecheck | Clean |
| API and web production builds | Pass |
| Browser | All five tabs, profile, Squad Builder load, Dugout. 375px: no page overflow |
| Lint | No lint script exists |

The tests cover the 15 items in the brief except that signed-in voting was tested through the API, not in a browser. The suite ran with `--test-isolation=none` because this sandbox blocks child processes.

## Unavailable

Verified 2027 purse; post-2026 trades; availability and injury; age for 118 of 280 squad players (162 have a birth date); capped status, so mega-auction limits are tested but not usable live; historic ballots; official retention list, which has not been announced.

## Design

The room uses the earlier /feed/squad layout: journey timeline, franchise pills, stadium stage with three action pods, Squad DNA, strengths and concerns, the squad table with a sticky Your Squad Impact panel, and an editorial and tools row. Every value in it is live. The old radar scores, story cards with invented dates, and the Mega Event and RTM figures were not brought back.

## Older retention features still on the site

- `/feed/squad` now redirects to the Retention Room, keeping the team. Its filters moved into Fan Picks, picks saved on a device are loaded there, and "Save on this device" keeps the Auction hub and Star Watch imports working. Its hard-coded story cards, Squad DNA charts and strengths lists were not carried over.
- `components/retention-room.tsx` is no longer used and can be deleted. It is untracked in git, so that deletion is permanent and was left to the owner.
- `/feed/ipl-2027` uses `retentionModel` in `lib/ipl-2027.ts`, a separate score that has not been replaced.
- `lib/retention-assessment.ts` is no longer imported and can be deleted.

## Production blockers

1. **Enter the 2027 purse** in `season-rules.json` once verified, and confirm the squad limits.
2. **Keep the API running through the voting lock (14 Nov, 18:30 UTC).** Auto-freeze is on: a one-minute timer in the API freezes once at the lock, with no flag needed and without starting notification delivery. It must be the deployed code. If the server is down at the lock, it freezes on restart; a freeze taken after decisions begin is kept but never scored.
3. **Durable disk.** Ballots, editorial notes and freezes live in `platform.sqlite`. An ephemeral host would lose them, including the accountability record.
4. **Sign-in check.** Run one real vote on a deployed Supabase project.
5. **Set `ADMIN_API_TOKEN`** so the desk can write overrides and freeze. Post official decisions through the existing desk log.
6. **Editorial copy.** No editorial override, dilemma opinion or feed article has been written. Those need the desk.
7. **Commit and deploy** after review.

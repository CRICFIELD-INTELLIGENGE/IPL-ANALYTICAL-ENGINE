# CRICFIELD Arcade — The Pavilion (rebuild report, 2026-11-07)

Status: **working tree only — nothing committed or deployed.** All 14 games are routed, playable and were
play-tested in the browser at least once end to end. Limitations are listed per game; nothing below is
claimed beyond what was run.

## 1. Repository audit (before)

| Finding | Where | Severity |
|---|---|---|
| Higher or Lower used a hand-typed 15-player table with invented values (economy for players who never bowled, e.g. Sanju Samson "9.5"). Confirmed in the browser. | `api-server/src/services/arcade/arcade-engine.ts` | High — fabricated stats |
| The challenge response sent player B's value to the browser, and `/guess` graded client-supplied numbers (a forged `{1,2,"higher"}` returned `correct: true`). | `routes/arcade.ts` | High — answer leak, forgeable |
| Guess the Cricketer had 5 hard-coded puzzles, sent `name` with the clues, and contained unverified claims. | same | High |
| Super Over, Hand Cricket and the auction rolled `Math.random()` with no seed; nothing could be validated or replayed. | web pages | Medium |
| Build Your XI and the Auction used hand-typed demo pools (made-up averages, prices, "archetypes"). | web pages | High |
| No progression, achievements, leaderboards, daily-challenge integrity or saves (only `localStorage` "recent"). | — | Gap |

## 2. REA usage

REA is installed here as an **MCP server** (reverse-engineering tools: web page/bundle inspection, browser and
process capture), not as a Claude Code skill — there is no REA `SKILL.md` or documented workflow to invoke.
I did not invent commands. Exploration, design and testing used the built-in browser pane, the project's
own test runner and its existing services. REA's tools were not needed for this work.

## 3–5. Games

| # | Game | Route | Status | Tested in browser | Known limitations |
|---|---|---|---|---|---|
| 1 | Cup Chase | `/arcade/cup-chase` | Fully playable and tested | Full 3-round cup on Easy (scripted timing), server replay accepted; mobile layout | Hard/Medium only unit-tested; replay offered for sixes and wickets only |
| 2 | Hand Cricket | `/arcade/hand-cricket` | Fully playable and tested | Best-of-three vs Adaptive Expert; Schoolyard Tournament round 1 → round 2 → knocked out; each match replay-validated | A full four-win tournament run was not reached by the scripted player |
| 3 | Super Over Showdown | `/arcade/super-over` | Fully playable and tested | Balanced chase to result | Final-ball glow not observed in the run; custom target not clicked |
| 4 | Higher or Lower | `/arcade/higher-or-lower` | Fully playable and tested | Daily run to a miss | Some display names are scorecard names (e.g. "JA Morkel") when squad lists lack a full name |
| 5 | Guess the Cricketer | `/arcade/guess-cricketer` | Fully playable and tested | Daily: 4 clues, 1 wrong, solved (45 pts) | — |
| 6 | Build Your XI | `/arcade/build-your-xi` | Fully playable and tested | All four modes: Open Draft; Budget (over-budget rejected); Rebuild (4th outside signing rejected, valid XI accepted); Season 2016 (overseas cap enforced) | Drag-and-drop not exercised (tap/buttons were); ratings follow the Player Intelligence model, which weights specialist bowling heavily |
| 7 | Mega Auction Room | `/arcade/auction-room` | Fully playable and tested | All four modes: Quick; Full (80 lots); Rebuild (named 4-player core, bought 2, valid); Historical (55 real lots, recorded price shown after each simulated sale); save → reload → resume | — |
| 8 | Cricket Grid (new) | `/arcade/cricket-grid` | Fully playable and tested | Daily: correct cell, wrong cell, finish | Rarity appears only after 5 real players answer a cell |
| 9 | IPL Time Machine (new) | `/arcade/time-machine` | Fully playable and tested | 2008 chapter, unlock gate | Chapter progress is per browser (results go to the account when signed in) |
| 10 | DRS: You Decide (new) | `/arcade/drs` | Fully playable and tested | 10 reviews incl. umpire's call | Front view only (no side/height view) |
| 11 | Predict the Next Ball (new) | `/arcade/next-ball` | Fully playable and tested | Death overs and Quick; scoring bug found and fixed | — |
| 12 | Captain's Call (new) | `/arcade/captains-call` | Fully playable and tested | "Defend 12" scenario | Matchup multipliers are synthetic (labelled) |
| 13 | Scout the Hidden Gem (new) | `/arcade/scout-gem` | Fully playable and tested | Death-pacer brief, graded | Three briefs only |
| 14 | Franchise GM (new) | `/arcade/franchise-gm` | Playable with limitations (milestone 1) | Two careers to a finished season; trades: unfair offer refused with a reason, fair one accepted, purse and both squads updated, server accepted the traded season | One season per career; market is fixed-price (model price) not an auction; released players cannot be re-signed |

Signed-in flows (XP, passport, leaderboards, saves to account) are covered by API integration tests with a
fake identity; there was no Supabase session in the test browser, so they were **not** clicked through, and
the new **Arcade** tab in Your Dugout (`/account`) was not opened while signed in.

## 6. Shared architecture

- `lib/arcade-rules` (new workspace package `@workspace/arcade-rules`): seeded RNG and IST daily clock, Hand
  Cricket (+4 AI personalities, commit-before-reveal), Super Over, Cup Chase timing, DRS (Law 36 + documented
  umpire's-call thresholds), Captain's Call Monte Carlo, auction engine, XP/levels/achievements. Shared by the
  browser and the server, so a submitted game is re-simulated before any score is stored.
- `api-server/src/services/arcade/`: `arcade-data.ts` (one verified fact table from the identity registry,
  match rosters, season lines and final winners), `puzzles.ts` (all factual generators/graders), `squads.ts`
  (Player Intelligence snapshot + existing `bestSide` optimiser), `arcade-store.ts` (persistence).
- Web: `src/lib/arcade/` (API client using the existing Supabase session, sound/motion, sessions),
  `src/components/arcade/` (game shell, results + share card, leaderboards, player search, passport, original
  SVG art). Every game is a lazy chunk.
- Lifecycle: factual games are server runs (`active → done`, 24 h TTL); simulation games get a server seed and
  submit inputs once; offline play falls back to a local seed and is kept in the browser only.

## 7. Database changes

New tables in the existing platform SQLite (`api-server/data/platform.sqlite`, created on first use):
`arcade_runs`, `arcade_results`, `arcade_profile`, `arcade_achievements`, `arcade_daily`, `arcade_saves`,
`arcade_grid_picks`. Keyed by the Supabase user id from `verifiedUser()` — no new auth. The IPL warehouse is
only read.

## 8. API (`/api/arcade/*`)

`games`, `meta`, `players/search`, `base-rates`; `higher-or-lower/start|:id/guess`;
`guess-cricketer/start|:id/clue|:id/answer|:id/give-up`; `cricket-grid/start|:id/guess|:id/finish`;
`time-machine/chapters|start|:id/answer`; `next-ball/start|:id/guess`; `scout-gem/start|:id/answer`;
`session/start|:id/submit` (cup, hand, super over, DRS, captain's call, auction); `xi/pool|evaluate|submit`;
`gm/setup|strength|trade|season`; `passport`, `passport/profile`, `leaderboard/:game`, `saves/:game[/:slot]`.

## 9. Data validation

Factual questions come only from the warehouse; qualification thresholds are shown; ties are never asked;
Guess puzzles are rejected if their clue set fits two players; grids are generated only when every cell has
≥ 3 answers and a 9-distinct-player fill exists; champions are recorded final winners; simulations are labelled.
Data cut-off: 2026-05-31 (seasons 2008–2026).

## 10. Tests

- `api-server/test/day10-arcade-games.test.ts`: 27 tests (rules, fairness, replay determinism, purse logic,
  puzzle integrity against the warehouse, daily consistency, answer non-leakage, auth/ownership, one scored
  daily attempt, forged-submission rejection, leaderboard privacy, saves, player search). All pass.
- Full API suite (`npm test`): 175 tests, 158 pass. Of the 17 failures, 9 were `spawn EPERM` (this sandbox
  refusing child processes); 8 of those 9 pass when run one file at a time, `ollama.test.ts` still cannot spawn.
  The other 8 are in `retention.test.ts` (28 pass / 8 fail), covering Retention Room files (`crr.ts`,
  `service.ts`) that were being edited by someone else on the same day — not part of this work.
- Web production build (`vite build`): passes. `tsc` on the web app: arcade code clean; pre-existing errors
  remain in Retention Room / Pulse files.
- Browser: every game played to a result once (table above); mobile 375 px checked on the Pavilion, Hand
  Cricket and Cup Chase.

## 11. Performance

Homepage chunk 14 kB JS + 4 kB CSS; games 7–17 kB each, loaded on demand; artwork is inline SVG (no image
downloads). Cup Chase's canvas only animates while a ball, shot or replay is live and pauses when the tab is
hidden. No game library (Phaser/Three) was added. The fact table takes ~35 s to build cold and is warmed at
API start-up.

## 12. Remaining issues / next steps

1. Fixed in the 2026-11-08 mode pass: duplicated budget note; "No legal XII" wording in an XI game; season-XI value
   ignored batters' dismissals (now symmetric with bowlers' wickets; 2016 is led by Kohli, 2008 by Watson); Historical
   auction ran 40 of 55 lots and showed each player's current team (the real buyer) before bidding; "a all-rounder";
   Rebuild core was unnamed, used 6 of 8 slots and earned Auction Mastermind for free (now a named top-4 core with at
   most 2 overseas, scored on players bought); a stale bid error stayed on the result screen.
2. Signed-in browser pass: passport tab in Your Dugout, XP/achievement toasts, leaderboard handles.
3. Franchise GM milestone 2: auction-based market (reuse the auction engine), multi-season careers.
4. Old files now unused (deletion was blocked in this session): `ipl-analytics/src/lib/cup-chase-rules.ts`,
   `src/lib/arcade-client-engine.ts`, `src/lib/arcade-api.ts`, `src/pages/arcade/cup-chase.css`.
5. Pre-existing typecheck errors in Retention Room / Pulse files (not touched here) still fail `pnpm typecheck`.
6. `pnpm-lock.yaml` also picked up dependencies that were already in `package.json` but missing from the lock.

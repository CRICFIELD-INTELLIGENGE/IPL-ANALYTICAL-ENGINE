# 12 — Reverse-Engineering Walkthroughs (12 features)

> Each walkthrough follows the same path: **user action → UI component → API request → backend logic → database query → transformation → response → visualisation**, then *why it exists*, *what breaks without it*, *how to debug*, *how to extend*, *what an interviewer asks*. Code excerpts are short and quoted from the repository.

---

## W1. Scout Lab leaderboard

1. **Action:** open `/scout`, choose *Bowling Rankings*, *Death Overs (16–20)*.
2. **UI:** `pages/scout-home.tsx` state (`discipline`, `phase`, `minBalls`, `sortBy="shrunk"`, `sortOrder="desc"`) → `useQuery({queryKey:["scout-rankings", …]})`.
3. **Request:** `lib/scout-api.ts fetchScoutRankings()` → `GET /api/scout/rankings?discipline=bowling&phase=death&minBalls=120&sortBy=shrunk&sortOrder=desc`.
4. **Backend:** `routes/scout.ts` validates with Zod, calls `ratePlayers()`.
5. **DB:** `SELECT player_key, season_label, … legal_balls balls, runs_conceded a, wickets b, dots c, fours+sixes d FROM agg_bowling WHERE competition_id=? AND phase=? AND season_label IN (…)`.
6. **Transform:** league rate per season → expected → index → shrink → Wilson/normal CI → per-competition percentile.
7. **Response:** paginated `Rating[]` (≈37 KB, 141 ms).
8. **Visual:** rows with tier badge, shrunk index, raw index, CI, percentile.

```ts
// routes/scout.ts:138-153 (abridged) — the defect
} else if (sortBy === "shrunk") {
  const primaryMetric = discipline === "batting" ? "strike_rate" : "economy";
  valA = a.metrics[primaryMetric]?.shrunk ?? null; …
}
// For economy, lower raw value is better, but shrunk index is already direction-oriented  ← false
return (valA - valB) * order;   // desc ⇒ highest (worst) economy first
```

- **Why:** fair cross-season, phase-aware ranking with uncertainty.
- **Breaks without:** shrinkage → 27-ball cameos top the table; league adjustment → 2026 batters (higher scoring era) dominate all-time lists.
- **Debug:** call `ratePlayers` directly, sort by `metrics.economy.shrunk`, compare with `percentile`; rank 1 having percentile 0 proves the inversion.
- **Extend:** add `better` direction to the sort (`metricDefs(discipline)`), filter `r.balls >= minBalls`.
- **Interview:** *“How did you verify your ranking was correct?”* — answer honestly: it wasn’t, for bowling; describe how you found and would test it.

## W2. Scout player profile

`/scout/player/:id` → `fetchScoutPlayer(id)` → `GET /api/scout/player/206` → `resolvePlayer()` (key → Cricsheet id → exact name; ambiguous → 404 with candidates) → `playerAttributes()` (style/hand/capped with source + confidence), `seasonLines()` (one `ratePlayers` per competition-season), `trends()`, `similarPlayers()` → 20 KB, **552 ms** (many repeated `ratePlayers` calls) → profile with provenance chips, season table, trend verdicts, similar players.
- **Breaks without exact identity:** two “Yuvraj Singh”s would merge.
- **Extend/optimise:** compute all season lines in one grouped query instead of N calls.
- **Interview:** *“How do you handle duplicate player names?”* → registry id; names never merge; ambiguous names return candidates.

## W3. Ask the database

1. **Action:** type “Best economy in the death overs since 2022”.
2. **UI:** `pages/ai-analyst-ask.tsx` → `lib/ask-api.ts` → `POST /api/ask {question}`.
3. **Parser** (`nl-parser.ts`): consumes phrases into typed fields.

```ts
// nl-parser.ts:364 and :398
} else if ((m = t.take(/\b(since|after|from) (20\d\d)\b/))) { … seasonFrom = 2022 }
else if (t.take(/\b(?:at the )?death(?: overs| bowling| phase)?\b|\bslog overs\b/)) f.phase = "death";
```

4. **Engine:** `runStatQuery()` (`stats-engine.ts:1140`) chooses `runBowling`, compiles parameterised SQL returning **additive components** (runs, legal balls, wickets), computes ratios in TS, applies an automatic minimum volume (“min 100 balls bowled”).
5. **Response:** answer sentence + table + `query` object.
6. **Visual:** “READ AS” chips (since 2022 · Death overs · min 100 balls); 78 ms.
- **Why additive components?** So renamed franchises and venue variants can be merged *before* dividing (averaging averages is wrong).
- **Debug:** if a phrase isn’t understood the API returns `understood:false` + suggestions; inspect the parsed `query` in the response.
- **Extend:** add a phrase → field rule plus a test; or let an LLM emit `StatQuery` JSON validated by `statQuerySchema`.

## W4. Advanced Stats filtered leaderboard

`/stats` filter panel (zustand store) → `GET /api/stats/query?season=2025&phase=Death…` → `routes/ipl.ts` (`getStatsQuery` normalises labels; `isDefault` short-circuits to career JSON) → `aggregateQueryStats()` → **SQL path** (Drizzle CTEs over `deliveries` + joins) unless batting-hand or pressure filters require the **JSON replay path** (walk every ball of every raw match file) → batters/bowlers arrays with phase splits, delivery breakdowns, zones → 0.3–0.5 MB → tables and drill tabs.
- **Cost:** 1.7–2.3 s warm; 10 concurrent → 24 s.
- **Breaks:** if `lib/cricket-data/raw` is missing, stage/handedness/pressure filters silently return less.
- **Debug:** logs `stats/query incoming` with the effective filters and result counts (`ipl.ts:470-500`).
- **Extend:** add precomputed aggregate tables per (player, season, phase, opponent…) — the global engine’s approach.
- **Interview:** *“Why two engines?”* — historical; the DB lacked per-ball context; consolidation is technical debt.

## W5. Player page — recent matches

`/players/virat-kohli` → `lib/player-key.ts` maps slug → bio key → `usePlayerIdentityIndex()` fetches `/data/player-recent-matches/index.json` (67 KB) → if the key maps to a registry id, fetch `/data/player-recent-matches/<id>.json` (Kohli 86 KB) → render list; else **empty state**.
- **Why:** replaced a 33 MB download that crashed the page; exact identity prevents another player’s matches appearing.
- **Debug:** `scripts/src/step3/identity-audit.ts` audits all 788 bios against ground truth.
- **Current issue:** 20 bios now resolve to empty although matches exist (Chapter 10).

## W6. Match scorecard

`/match/1473469` → `useMatchScorecard(id)` (`lib/aggregates.ts:788`) → `GET /api/ipl/match/1473469/scorecard` → `getMatchScorecard()` (`services/match-card.ts`) reads `lib/cricket-data/raw/1473469.json` (cached) and builds innings, batting/bowling cards, extras, fall of wickets → 6.8 KB, 2 ms → scorecard view.
- **Why from raw JSON:** independent of warehouse bugs; exact Cricsheet record.
- **Breaks:** raw folder absent on a fresh deploy → 404 “no match data held for this id”.

## W7. Hidden Weakness Detector

`/ai-analyst/weakness?player=RG Sharma` → `fetchWeakness()` → `GET /api/weakness/51` → `scanPlayer()` → uses the in-memory **column store** (`ball-context.ts`) to bucket every ball by bowler type × over window → per-ball value `v = runs − W·out` → z-test per cell:

```ts
// weakness-detector.ts:72-77
function zScore(cell: Agg, rest: Agg): number {
  const m1 = cell.sumV / cell.n, m2 = rest.sumV / rest.n;
  const v1 = Math.max((cell.sumV2 - cell.n * m1 * m1) / (cell.n - 1), 1e-6);
  const v2 = Math.max((rest.sumV2 - rest.n * m2 * m2) / (rest.n - 1), 1e-6);
  return (m1 - m2) / Math.sqrt(v1 / cell.n + v2 / rest.n);
}
```

→ Bonferroni-adjusted confidence → weaknesses / strengths / watch list + evidence dismissals → heatmap (diverging colours) and evidence lists. 14 ms.
- **Interview:** *“What is the multiple-comparisons problem and how did you handle it?”*

## W8. Auction War Room board

`/ai-analyst/auction-war-room?view=live&team=CSK` → `fetchBoard()` → `GET /api/war-room/board?view=live&team=CSK` → `auctionBoard()` → cached `buildBoard("live")` (impact, IAR, kNN market, value, signal) + `teamNeeds("CSK")` (Squad DNA gaps) + `fitFor()` per player → 94 KB, 3 ms (after a 6 s first build) → table with BUY/HOLD/AVOID/SCOUT chips, market vs value, max bid, fit score and reasons; a backtest tab.
- **Honesty requirement:** show `marketBasis` (Suryavanshi 0.1 = extrapolated) and the backtest (projection ρ = 0.17, n = 9).
- **Debug:** `auctionPlayer(key, view)` returns comparables behind a price.

## W9. My Dugout franchise HQ

`/dugout/csk` → `resolveTeamCode` → `fetchFranchise({team:"CSK"})` → `GET /api/dugout/franchise?team=CSK` → `dugout-data.ts` builds season-by-season record, titles (from finals on record), head-to-head, latest captain → hero stats; squad via `GET /api/dugout/squad?team=CSK&season=2026` (season is **required**; without it → 400).
- **Design principle in code:** “Where a fact is not in those sources … the field is null and the UI says so rather than filling it in.” (`dugout-data.ts:6-9`)

## W10. Homepage live scores

`/home` → `useLiveIplMatches()` (`lib/live.ts:67`, refetch 30 s) → `GET /api/live/ipl/matches` → `getIplMatches()` scrapes cricbuzz.com (cached 30 s) → ticker cards. On failure: 502 `live_source_unavailable`; the homepage has **no error UI**, sections stay empty.
- **Risks:** scraping ToS; `?refresh=true` bypass.

## W11. Playing XI optimiser

Playing XI drawer → `POST /api/optimizer/playing-xi {teamId, pitch, maxOverseas:4, …}` → Zod `playingXiSchema` → candidate impacts (impact model + pitch adjustment) → MILP:

```ts
// playing-xi.ts:246-252
if (c.locked) model.constraints[`lock_${c.playerId}`] = { equal: 1 };
model.binaries![v] = 1;
const res = solver.Solve(model);
if (!res.feasible) return null;
```

→ re-solve without each chosen player to get marginal value → XI with reasons. Hard constraints use exact metadata (overseas from squad files, keeper from stumpings) — never fuzzy names.
- **Interview:** *“Why integer programming instead of picking the top 11?”* — constraints (4 overseas, ≥1 keeper, 20 overs of bowling) interact.

## W12. Team theming

`TeamSwitcher` → `setTeam("CSK")` in `TeamProvider` → localStorage + `root.style.setProperty("--team-accent", …)` (`team-context.tsx:289-292`) → every component using `var(--team-accent)` re-colours without React re-renders.
- **Breaks:** hard-coded hex colours (hundreds in `fan-arena.tsx`) ignore the theme.

---

## Debugging drill: a wrong number, end to end

1. Note the page, filters and the number.
2. Open the network panel → copy the API URL → `curl` it.
3. Find the route (`grep -n "router.get(\"/stats/query" artifacts/api-server/src/routes/*.ts`).
4. Call the service function in a `tsx` script with the same input.
5. Re-derive the number with a hand-written SQL query on a **copy** of the DB (`readOnly: true`).
6. If the SQL differs from the service → logic bug. If the SQL matches but the raw Cricsheet recount differs → data bug (like B2/B4 in Chapter 10).

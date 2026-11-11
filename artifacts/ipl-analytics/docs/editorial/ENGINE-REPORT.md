# Editorial engine report — all 1,000 titles (2026-10-26)

## Status
| | Count |
|---|---|
| Titles in the plan | 1,000 (10 franchises × 100) |
| Hand-written articles (Batch 1, RCB) | 10 |
| Engine-built articles (`generator: "engine:v1"`) | 990 |
| Validating with 0 errors | 1,000 |
| Status | all `review` — none published; production build ships 0 article or evidence bodies (2,000 null stubs) |
| Getty hero photos for engine articles | 990 candidates, all `pending-license` (see below) |

Word count of rendered prose: min 269, median 342, max 837. Engine articles are short by design. They are data briefs, not features.

## How the engine works
`scripts/editorial/engine/` has one `SlotSpec` per plan slot (1–100), grouped by aspect in `slots/*.ts`. Each template:
- runs SQL against the warehouse;
- registers every figure as an evidence metric with a sample-size or plausibility check;
- writes prose that uses only `{{ev:…}}` tokens.

The validator rejects any numeral that is not a token or a declared literal. Wording is conditional on materiality thresholds, so a 2% gap is never called "efficient". Claims the data cannot test are written as labelled hypotheses with a test plan.

```
pnpm exec tsx --no-warnings scripts/editorial/engine/run.ts <FR…> [--slot n,n]
pnpm exec tsx scripts/editorial/validate-articles.ts
```

## Honest limits
- **Business (41–50) and Fan culture (51–60):** the warehouse has no revenue, attendance, audience, merchandise, survey or social data. These articles measure on-field proxies (home fixtures, weekend share, rivalry closeness, losing-season recoveries, streaks) and say plainly what they cannot see.
- **Nationality and age:** these use player-bio data with squad lists as a fallback. Coverage is stated in each article, and seasons before about 2016 are thin.
- **Legacy URLs:** decisions for the 90 non-RCB legacy articles are **pending review**. The legacy pieces are hand-written and longer, so no engine article takes over a legacy URL automatically. A few engine titles therefore overlap legacy pieces until those decisions are made.

## Data defects found (and how they are handled)
- `deliveries.required_rr` is 0 on every row: required rates are recomputed from target, runs and balls.
- `matches.player_of_match_id` is empty: not used.
- The `partnerships` table is empty: partnerships are rebuilt from striker and non-striker on each delivery.
- `players.country` is "Unknown" for about 70% of players: nationality comes from bio data and squads instead.
- Player-bio `country` can be an empty string. Fixed a fallback bug (`??` → `||`) that had under-counted Indian players in slots 34, 58 and 72.
- In `captains.json`, records that combine franchises carry first and last seasons across every team led (for example, Hardik Pandya "GT 2022–2026"). Only franchise-only records are used for spans.
- `speed_kph` is populated on about 2% of deliveries.

## Getty hero photos (added 2026-10-26)
The owner passed Getty's security check, and the work then ran at a gentle rate (six seconds between searches).

**How the photos were chosen**
1. 120 Getty editorial searches built per-franchise candidate pools.
2. Getty's own search data was used to keep only photos flagged `isEmbeddable`, in landscape orientation.
3. Captions were filtered so that the article's franchise is the first IPL team named before "during", which means the subject is in that franchise's kit.
4. Captions were excluded for dismissals (bowled, stumped, run out, lbw), WPL, Test, World Cup and national-team matches, injuries, and the 4 June 2025 Bengaluru events.
5. No photo is reused, and none duplicates the existing 340.
6. Each article got the best caption match on its named players and theme (batting, bowling, fans, captain, team, stadium).
7. The official snippet for each photo came from Getty's embed-preview endpoint, and the asset ID was checked against it.

**Results**
- 990 records, one `hero` per engine article, all `pending-license`, none approved.
- All 990 embed codes render a Getty viewer for the correct asset on a localhost test page (990/990).
- Production build: 0 hero records, 0 Getty records.
- Selection is automatic, so each photo needs human review.

**Known weaknesses**
- Some photos come from the same match session. For example, several MI articles use 1 May 2025 Rohit Sharma frames.
- Surname matching can hit a first name ("Ravindra" matched Ravindra Jadeja rather than Rachin Ravindra). The subject is still in the franchise's kit.

**Not redone:** the eligibility recheck of the original 340. Those records are now marked `approved-embed` by the Editorial Desk under the new release gate, which also requires a commercial-embed authorization reference before any of them can ship. As a result, `check-editorial-images.ts` currently reports 340 "approved record passes the gate" failures, because those references are missing. The gate is doing its job; it is not an engine fault.

## Checks run
- `validate-articles.ts`: 1,000 articles, 0 errors.
- Text scan for NaN, undefined, unresolved tokens and plural slips: clean.
- `check-editorial-images.ts`: 1,055 passed.
- Placement audit: all checks pass; 340 records, all `pending-license`, none approved automatically.
- Coverage report: every franchise is at 100 in review.
- Production build: 0 review records, 0 Getty records, no article bodies.
- Localhost render checked for `mi-bowling-plans-…` (four charts, no raw tokens) and `lsg-bench-to-xi-…`.

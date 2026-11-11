# Steps 1–2 report — scouting service and demonstration queries

Date: 2026-10-10. Scope, as approved:

- **Built:** Step 1, the backend scouting service.
- **Run:** Step 2, the three demonstration queries.
- **Not changed:** website pages, routes, API endpoints and `sqlite.db`.
- **Not started:** Steps 4–6.

**References**

- Definitions: [scout-service.md](scout-service.md).
- Full generated output, with every table: `lib/cricket-data/global/reports/scout-demos-2026-10-10.md` (and `.json`).

## 1. What was built

**Code** (all in `scripts/src/scout/`, reading `global.db`)

| File | Contents |
|---|---|
| `scout-schema.sql` | Derived tables (see below) |
| `roles.ts` | Usage-derived, season-specific roles |
| `enrichment.ts` | Linked attributes from named sources |
| `service.ts` | Ratings, percentiles, trends, comparisons |
| `build.ts` | Builds the derived layer |
| `demos.ts` | The three demonstrations |
| `tests/scout.test.ts` | Tests |

**Derived tables**

- `scout_batting_innings`: 51,567 rows
- `scout_bowling_innings`: 39,201 rows
- `scout_roles`: 11,759 season roles
- `scout_phase_variance`, `scout_coverage`
- `player_attributes`, `attribute_link_issues`

**Commands**

- `scout:build` takes 12 s.
- `scout:demo`.
- `test:global` now runs 19 tests, all passing.
- `scout:build` checks that the league adjustment is unbiased: summed over all players, expected equals actual for every competition, in both batting and bowling. It passes.

**Sanity checks on derived roles** (all within the expected range)

| Player | Season | Derived role |
|---|---|---|
| Kohli, Rohit | IPL 2024–26 | Openers (100% opening) |
| Dhoni | IPL 2023–25 | Finisher (arrives after a median ~100 legal balls; 80–100% of balls faced at the death) |
| Chahal | IPL 2024–26 | Middle-overs specialist (75–87% of balls in the middle overs) |
| Arshdeep | IPL 2024–26 | Powerplay specialist (52–54% of balls in the powerplay) |
| Bumrah | IPL 2024–25 | Multi-phase |
| Bumrah | IPL 2026 | Powerplay specialist |
| Narine | CPL 2026 | Opener and powerplay specialist |

**Quality problems found and fixed before the demonstrations**

- **Phase thresholds.** A flat 50% "specialist" threshold produced almost no death specialists, because the death phase is only 5 of 20 overs. Thresholds now scale with phase length.
- **Initials-form auction links.** Initials-form matching linked auction-list "Manvanth Kumar" to Mukesh Kumar. Both were in Delhi's 2025 squad, so team corroboration didn't catch it. Initials matching was removed.
- **Duplicate bio names.** Two `player-bio.json` entries named "R Bishnoi" carried different bowling styles. Duplicate bio names are now ambiguous and unlinked.

After these fixes there are 0 attribute conflicts.

## 2. Query performance

| Demonstration | Time | Notes |
|---|---:|---|
| 1. Cross-league profile | 1.25 s | Season lines for 24 seasons in 5 leagues, career by league and phase, trends, similar players |
| 2. Emerging talent | 0.44 s | 6 searches |
| 3. Middle-overs spin shortlist | 0.13 s | SMAT, SA20, BBL |

A single league-adjusted rating query takes 2–5 ms. Global benchmarks are in `reports/bench-2026-10-10.md`.

## 3. Demonstration 1 — cross-league profile: Rashid Khan (`5f547c8b`)

**Identity**

- Chosen as the bowler appearing in the most Batch 1 leagues.
- External ids: cricinfo 793463, pulse 2885.
- Bowling style: spin, "Legbreak Googly". Source: IPL player bio, exact link.
- **Capped status: not established.** No linked official record. It is not assumed.

**Career bowling, league-adjusted**

| League | Legal balls | Econ | League econ (same balls) | Econ index (95%) | Econ pct | Balls/wkt | Wkt index (95%) |
|---|---:|---:|---:|---|---:|---:|---|
| IPL | 3,530 | 7.28 | 8.68 | 84 (80–88) | 100 | 19.7 | 104 (91–120) |
| BBL | 1,598 | 6.44 | 7.94 | 81 (75–87) | 99 | 16.3 | 120 (99–145) |
| CPL | 618 | 5.99 | 7.46 | 80 (70–91) | 94 | 21.3 | 91 (64–129) |
| SA20 | 618 | 7.21 | 8.02 | 90 (80–100) | 82 | 22.9 | 81 (56–117) |
| ILT20 | 144 | 7.29 | 8.01 | 91 (71–111) | 71 | 18.0 | 109 (56–207) |

His IPL economy of 7.28 matches the corrected figure from Step 3 (7.43 on the live site today). The profile also contains:

- 24 season lines with season roles
- phase splits per league; e.g. BBL middle overs: economy index 81 and wicket index 155 (99th percentile)
- **Trends:** "stable" in every league; for example IPL economy index 83 → 93, ±13, not significant
- **Similar bowlers:** among verified spinners only: Zampa, Rahul Chahar, Kuldeep Yadav, Livingstone, Imran Tahir, Hasaranga, Adil Rashid

## 4. Demonstration 2 — emerging talent

**Definition of "statistically emerging"**

- Debuted in that league within the analysis window.
- At least 120 balls in the window.
- Composite of league-adjusted percentiles ≥ 70:
  - batters: strike rate and balls per dismissal, with strike rate ≥ 60th percentile;
  - bowlers: economy and wicket rate.
- At most 5 IPL matches.

**Officially uncapped** is a separate column. It comes only from an explicit value in the 2026 IPL auction list, through a recorded link.

| Search | Window | Players with ≥120 balls | Meet criteria |
|---|---|---:|---:|
| SMAT batters | 2022/23–2024/25 (partial coverage: 44, 39, 8 matches) | 36 | **0** |
| SMAT bowlers | same | 38 | **0** |
| SMAT batters | 2019/20–2021/22 (latest complete seasons) | 207 | 2 |
| SMAT bowlers | same | 219 | 2 |
| Overseas batters | last 3 seasons of BBL, SA20, CPL, ILT20 | 254 | 6 |
| Overseas bowlers | same | 267 | 15 |

**Selected output**

| Player | League | Debut | Balls | Composite | Evidence | IPL apps | Official status |
|---|---|---|---:|---:|---|---:|---|
| Maaz Sadaqat | CPL | 2026 | 208 | 95 | SR 174.5 vs 130.4 league (index 134, 115–152); 29.7 balls/dismissal | 0 | not established |
| AGS Gous | ILT20 | 2023/24 | 345 | 88 | SR 151.9 vs 129.7 (index 117, 104–131); trend improving (106 → 136) | 0 | not established |
| Usman Tariq | CPL | 2025 | 433 | 91 | econ 6.82 vs 8.30 (index 82, 70–94); 30 wkts, 14.4 balls/wkt | 0 | not established; style unknown |
| DJ Worrall | SA20 | 2023/24 | 324 | 81 | econ 6.91 vs 8.45 (index 82, 69–95) | 0 | not established; style unknown |
| Kishan Lyngdoh | SMAT | 2021/22 | 173 | 91 | SR 142.8 vs 113.5 (index 126) — **100% of balls in Plate Group matches** | 0 | not established |
| Khrievitso Kense | SMAT | 2020/21 | 149 | 92 | econ 5.56 vs 7.26 (index 77) — **100% Plate Group** | 0 | not established |

**What this shows**

- **SMAT coverage limits the query.** The recent SMAT window returns nobody: Cricsheet's last three SMAT seasons hold 91 matches in total. The complete-coverage window returns players from Plate Group sides, and the output flags them rather than hiding the opposition caveat.
- **Plate Group exposure is reported, not adjusted.** The engine shows it as a share of balls only.
- **"Emerging" can only mean "new to this league".** Age is not in the data, and capped status is linked for only 101 auction-list players. So the list includes established internationals new to a league, such as Joe Root (SA20 2024/25) and Naseem Shah (ILT20 2025/26).
- **The official-status column is the safeguard.** It reads "not established" for all of them instead of guessing. Telling young players apart needs an age source or more official links.

## 5. Demonstration 3 — middle-overs spin shortlist (SMAT, SA20, BBL)

**Population and coverage**

- Every bowler with at least 120 legal balls in overs 7–15 across each league's last 3 seasons: 76 bowlers.
- Bowling type: 26 verified spin, 15 verified pace, **35 unknown**.

| League | Seasons | Middle-overs economy | Balls per wicket | Qualifying bowlers | Coverage |
|---|---|---:|---:|---:|---|
| SMAT | 2022/23–2024/25 | 7.19 | 23.4 | 10 | all three seasons partial |
| SA20 | 2023/24–2025/26 | 7.72 | 21.5 | 24 | complete |
| BBL | 2023/24–2025/26 | 8.11 | 20.8 | 42 | complete |

**Tier rules**

- **Composite** = the mean of the economy-index and wicket-rate-index percentiles, equally weighted, within the bowler's own league.
- **Priority:**
  - composite ≥ 75 and a rankable sample;
  - economy or wicket rate significantly better than league;
  - at least 20 qualifying bowlers in the league window;
  - no partial seasons, and not mainly Plate Group.
- **Monitor:** composite ≥ 60.

| Tier | Player | League | Legal balls | Econ (league) | Econ idx 95% | Econ pct | Wkt idx 95% | Wkt pct | Composite | Official status |
|---|---|---|---:|---|---|---:|---|---:|---:|---|
| **Priority** | Noor Ahmad | SA20 | 392 | 6.55 (7.70) | 73–97 | 100 | 94–199 | 91 | 96 | not established |
| Monitor | SZ Mulani | SMAT | 157 | 5.62 (7.10) | 60–99 | 100 | 84–271 | 89 | 94 | Uncapped (auction list, corroborated, unreviewed) |
| Monitor | D Ferreira | SA20 | 150 | 6.24 (7.63) | 62–101 | 91 | 59–219 | 70 | 80 | not established |
| Monitor | Sikandar Raza | SA20 | 150 | 6.92 (7.81) | 69–108 | 57 | 89–272 | 96 | 76 | not established |
| Monitor | Tanush Kotian | SMAT | 174 | 6.62 (7.29) | 73–109 | 44 | 102–285 | 100 | 72 | Uncapped (auction list, corroborated, unreviewed) |
| Monitor | MW Short | BBL | 168 | 7.36 (8.12) | 73–108 | 85 | 51–190 | 51 | 68 | not established |
| Monitor | KA Maharaj | SA20 | 606 | 7.16 (7.75) | 83–102 | 61 | 75–150 | 65 | 63 | not established |
| Monitor | WG Jacks | SA20 | 120 | 6.40 (7.65) | 62–105 | 74 | 39–202 | 48 | 61 | not established |

Eighteen more verified spinners are listed below the shortlist in the full output, with their reasons. They include Rashid Khan (SA20 composite 54), Zampa, Maxwell and Shamsi.

**How to read it**

- **Why Noor Ahmad is priority.**
  - Middle-overs economy 15% better than SA20's for the same seasons, and significantly so: the interval tops out at 97.
  - 25 wickets in 392 balls (15.7 balls per wicket, against a league 21.5).
  - The only qualifier meeting every priority condition.
- **Why Shams Mulani is capped at monitor.** He meets the priority thresholds, but SMAT's window has only 10 qualifying bowlers and every season in it is partial. The report states this rather than overstating him.
- **Uncertainty is shown, not hidden.** Wicket-rate intervals are wide at these sample sizes (e.g. 84–271), which is why the composite uses shrunk indices and the tiers require significance.
- **League differences.** Every economy is shown against its own league's middle-overs rate for the same seasons. The league table makes BBL's higher scoring (8.11) visible, rather than treating 7.36 in the BBL and 7.36 in SMAT as equal.
- **35 strong bowlers are not classified.** They appear in a separate table, "style unverified — NOT classified as spinners". It includes bowlers many would call spinners (Usama Mir, Muthusamy, Linde, Dawson, Wellalage, Rishad Hossain), but no verified source says so. Adding a verified bowling-style source is the single biggest improvement to this query.

## 6. Data-quality limitations

| Limitation | Effect | What would fix it |
|---|---|---|
| SMAT on Cricsheet: 2016/17 missing; 2022/23–2024/25 partial; nothing after Dec 2024 | Indian domestic scouting is thin and dated | A permitted, more complete SMAT source |
| No bowling style for most non-IPL bowlers (35 of 76 middle-overs qualifiers unknown) | Spin and pace queries cover verified players only | A verified style source keyed by `key_cricinfo`, or a reviewed curated list |
| No age; capped status for only 101 linked auction-list players | "Emerging" can't separate young players from new arrivals | Age and official-status sources with reviewed links |
| Opposition strength not adjusted (Plate Group only flagged) | Lower-division numbers look better than they are | An opposition-quality model (part of the franchise-fit design) |
| Approximate intervals for strike rate and economy (league variance) | Intervals indicative, not exact | Per-player variance stored in the aggregates |
| League indices are within-league | Cross-league comparison is "relative standing in own league", not equivalence | A validated league-strength model (Step 5 design, not approved) |

## 7. Next

Step 3 (economy-rate and player-page fixes) is prepared for review in [step3/README.md](step3/README.md). It is not applied.

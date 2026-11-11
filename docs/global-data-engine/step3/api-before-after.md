# Step 3 — API before/after (test API on :5055, same machine, warm second call)

Before: 2026-10-10T16:04:32.335Z (unpatched). After: 2026-10-10T16:19:24.340Z (both patches applied, API restarted).

| Endpoint | Depends on runs conceded | Response | Changed fields (sample) | Warm ms before → after |
|---|---|---|---|---|
| ask: bowling economy by player | yes | 200→200, 234 values changed | answer, runs, econ, avg, dot, key | 1595 → 1494 |
| ask: bowling economy, death overs 2025 | yes | 200→200, 149 values changed | runs, econ, avg, dot, key, label | 44 → 56 |
| ask: batting runs by player | no | 200→200, identical | — | 1752 → 1058 |
| ask: batting strike rate, powerplay | no | 200→200, identical | — | 537 → 864 |
| advanced stats (legacy): season 2025 | yes | 200→200, 657 values changed | econ, avg, runs, trueEconomy, best | 4139 → 4983 |
| advanced stats (legacy): 2025 death overs | yes | 200→200, 288 values changed | econ, avg, trueEconomy, runs, best | 4616 → 3582 |
| player summary: V Kohli | no | 200→200, 11 values changed | runsConceded, economy, bowlingAverage | 8 → 5 |
| player summary: JJ Bumrah | yes | 200→200, 41 values changed | runsConceded, economy, bowlingAverage, bowling, total | 10 → 8 |
| player intel: JJ Bumrah | yes | 200→200, 29 values changed | liftPer100, weakness, headline, similarity, playerId, name | 181 → 176 |
| weakness: JJ Bumrah | yes | 200→200, 33 values changed | runs, rate, dotPct, boundaryPct, weaknesses, headline | 30 → 26 |
| weakness: V Kohli | no | 200→200, identical | — | 46 → 41 |
| squad DNA: CSK 2025 | yes | 200→200, 16 values changed | score, percentile, importance, value, display, similarity | 22 → 11 |
| dugout franchise: CSK | no | 200→200, identical | — | 5 → 3 |
| dugout squad: CSK 2025 | yes | 200→200, 9 values changed | economy | 18 → 15 |
| auction war room board | yes | 200→200, 3214 values changed | looR2, overseas, domestic, BUY, HOLD, AVOID | 15 → 6 |
| history overview | no | 200→200, identical | — | 3 → 2 |

Notes:
- Kohli summary changes only his career/season **bowling** fields (runs conceded, economy, bowling average); batting fields identical.
- Squad DNA changes only its three bowling dimensions (death bowling, spin economy, pace economy) and the two fingerprint scores built from them; 35 of 38 dimensions identical.
- Auction War Room: rows reorder; 5 batters who also bowl change impact; market prices move for many players because the comparable-sales model re-selects neighbours when other players’ bowling figures change (see risks in README).
- Latency differences are run-to-run noise (the legacy /api/stats/query path takes 3–5 s before and after).

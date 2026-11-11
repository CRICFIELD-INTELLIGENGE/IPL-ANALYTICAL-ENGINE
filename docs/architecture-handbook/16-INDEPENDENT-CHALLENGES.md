# 16 — Independent Engineering Challenges

> **Rules:** no AI-generated implementation. You may read documentation (MDN, SQLite docs, React docs) and this handbook’s explanations. Work in a **new folder or a scratch copy** — never on the production `sqlite.db` (copy it with its `-wal` file, or open it with `{ readOnly: true }`). Time yourself. The answer key is at the end — attempt first.

**Setup once:**
```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('sqlite.db',{readOnly:true});console.log(db.prepare('select count(*) n from deliveries').get())"
```

---

### C1 — Season batting strike rate (SQL)
- **Prerequisites:** SELECT, JOIN, GROUP BY, HAVING.
- **Instructions:** For IPL season 2025, list the top 10 batters by strike rate with at least 200 balls faced. Exclude super overs. Columns: name, runs, balls, SR (1 dp).
- **Expected result:** Pooran 196.3 (524/267) first; Abhishek Sharma 193.4 second.
- **Rubric:** correct ball definition (wides excluded) 30% · super-over exclusion 20% · correct season filter 20% · readable SQL 15% · explains HAVING vs WHERE 15%.
- **Files:** `04-DATABASE-ENGINEERING.md` Q2; `sqlite.db` schema.

### C2 — Bowling economy including extras correctly
- **Prerequisites:** C1, cricket extras rules.
- **Instructions:** Lowest death-overs (overs 16–20) economy since 2022, min 100 legal balls. Charge wides and no-ball penalties to the bowler; not byes/leg-byes.
- **Expected result:** SP Narine 6.06 (218 runs, 216 legal balls).
- **Rubric:** legal-ball definition 25% · conceded-runs expression 35% · phase filter (0-based overs) 20% · explains why `is_bye` can’t be used 20%.
- **Files:** `services/decision/db.ts:77-89`.

### C3 — A small REST API
- **Prerequisites:** Node, Express basics.
- **Instructions:** In a fresh folder, build `GET /api/players/:name/career` returning runs, balls, SR from a read-only connection to a copy of `sqlite.db`. 404 if the name is unknown; 400 if the name is shorter than 2 characters.
- **Expected result:** `curl /api/players/V%20Kohli/career` → runs 9336, balls 6926, SR 134.8.
- **Rubric:** parameterised SQL 30% · status codes 25% · validation 20% · code structure (route vs service) 25%.
- **Files:** `routes/decision.ts` (pattern), `services/decision/db.ts`.

### C4 — A React filter component
- **Prerequisites:** React state, props, `fetch`.
- **Instructions:** Build a table of C1’s results with a season dropdown and a minimum-balls slider; refetch on change; show loading and error states.
- **Expected result:** changing season updates the table; an API error shows a message, not a blank page.
- **Rubric:** controlled inputs 25% · loading/error/empty states 30% · no fetch loops 20% · accessible labels 25%.
- **Files:** `pages/scout-home.tsx:88-118`, `lib/aggregates.ts`.

### C5 — Add an index and measure it
- **Prerequisites:** C2, EXPLAIN QUERY PLAN.
- **Instructions:** On a **copy** of `sqlite.db`, time C2’s query, read its plan, add one index you justify, re-time, re-read the plan.
- **Expected result:** a before/after table with plan lines and milliseconds (baseline ≈ 0.9 s on the audit laptop).
- **Rubric:** measurement method 30% · justified index 30% · correct reading of plans 25% · notes write-cost trade-off 15%.

### C6 — Debug a deliberately broken player lookup
- **Prerequisites:** JavaScript, string handling.
- **Instructions:** This function is used to find a player’s matches. Find every way it can return the wrong player, write failing tests, then fix it.
```js
function findPlayer(bioName, players) {
  const surname = bioName.split(" ").pop().toLowerCase();
  const initial = bioName[0].toLowerCase();
  return players.find(p => p.name.toLowerCase().endsWith(surname) &&
                           p.name[0].toLowerCase() === initial);
}
// players: [{id:"aaa", name:"MD Choudhary"}, {id:"bbb", name:"Mukesh Choudhary"}, {id:"ccc", name:"Prince Choudhary"}]
```
- **Expected result:** tests showing “Prince Choudhary” can match the wrong person in other datasets; a fixed version that requires an exact registry id or exact full-name match and returns *no player* when ambiguous.
- **Rubric:** finds ≥ 3 failure modes 40% · tests 30% · fix returns null on ambiguity 30%.
- **Files:** `scripts/src/step3/tests/identity.test.ts`, `05-DATA-PIPELINES.md §5`.

### C7 — Cricket CSV parser (Python or TypeScript)
- **Prerequisites:** file I/O, CSV.
- **Instructions:** Parse one `ipl_csv/<match>.csv` into innings totals and per-batter lines. **Parse the `ball` column as two integers** (“19.10” → over 19, ball 10).
- **Expected result:** innings totals that equal the match result; a test proving “19.10” ≠ “19.1”.
- **Rubric:** correct over/ball parsing 30% · extras handled by type 30% · tests 20% · code clarity 20%.
- **Files:** `update-ipl-data-v3.ts:659-661` (the bug to avoid).

### C8 — Player comparison visualisation
- **Prerequisites:** a chart library or SVG.
- **Instructions:** For two batters, draw a **dot plot**: one row per metric (SR index, boundary % index, dot % index, balls/dismissal index), a vertical line at 100, error bars for the 95% interval.
- **Expected result:** a readable chart that shows overlap of intervals.
- **Rubric:** correct encoding 30% · reference line & units 25% · uncertainty shown 25% · accessibility (labels, contrast) 20%.
- **Files:** `23-DATA-VISUALIZATION-DESIGN.md`.

### C9 — Unit test for a scouting metric
- **Prerequisites:** `node:test`.
- **Instructions:** Write tests for (a) `shrink()` — small samples pull toward 100, large samples stay near their index, n=0 returns 100; (b) `wilsonInterval()` — bounds within [0,100], k=0 has low bound 0.
- **Rubric:** meaningful assertions 40% · edge cases 30% · test names 15% · runs green 15%.
- **Files:** `scout-service.ts:86-98`; `scripts/src/scout/tests/scout.test.ts` (pattern).

### C10 — Reproduce the Bayesian adjustment by hand
- **Instructions:** Abhishek Sharma, IPL 2026: 563 runs, 275 balls; league SR 156.34. Compute index, shrunk index (k=120), and the share of the estimate that comes from his own data. Then do the same for 27 balls at SR 192.6.
- **Expected result:** 130.9 → 121.5 (70% own data); 123.2 → 104.3 (18% own data).
- **Rubric:** arithmetic 40% · explains weights 30% · states assumptions 30%.

### C11 — Optimise a slow query
- **Instructions:** The legacy `/api/stats/query?season=2025` takes ~2.3 s. Propose and prototype (on a copy) a pre-aggregated table that answers the default batting leaderboard for any season in < 50 ms.
- **Rubric:** schema of the aggregate 30% · correctness check vs original 30% · measured speed-up 25% · refresh strategy 15%.
- **Files:** `global.db agg_batting` (pattern), `stats-aggregator.ts`.

### C12 — Trace a browser request through the backend
- **Instructions:** With the app running on test ports, open Scout Lab, choose Bowling. Record: the URL requested, the route handler line, the service functions called, the SQL statements, and the response size and time. Explain why rank 1 has percentile 0.
- **Rubric:** complete trace 40% · correct explanation of the sort bug 40% · proposed fix 20%.
- **Files:** `02-SYSTEM-ARCHITECTURE.md §4`, `routes/scout.ts:128-154`.

### C13 — Identify a security vulnerability
- **Instructions:** Review `artifacts/api-server/src/routes/*.ts`. Find the route that lets an unauthenticated caller interact with the server’s file system. **Do not exploit it.** Write: impact, likelihood, a fix and a test.
- **Rubric:** finds it 30% · correct impact analysis 30% · safe fix (whitelist + path containment + auth) 30% · test 10%.

### C14 — Safe API input validator
- **Instructions:** Write a Zod schema for `/api/scout/rankings` that also enforces: `sortBy` ∈ {shrunk, balls, matches, strike_rate, boundary_pct, dot_pct, economy, wicket_rate}, `competitions` ⊆ known codes, `search` ≤ 40 chars. Return 400 with field-level messages.
- **Rubric:** schema completeness 40% · coercion of numeric strings 20% · error shape 20% · tests 20%.
- **Files:** `routes/scout.ts:64-76`.

### C15 — Design an IPL franchise scouting use case
- **Instructions:** One page: a franchise needs an uncapped Indian death bowler for ≤ ₹2 Cr. Specify the data, filters, metrics (with directions), sample thresholds, uncertainty handling, the shortlist format, and what CricField cannot tell them (e.g., bowling type unknown, no opposition-strength adjustment, no fitness data).
- **Rubric:** clear user/job 20% · correct metrics and directions 25% · uncertainty/limitations 30% · actionable output 25%.

---

## ANSWER KEY — attempt the challenges first

**C1**
```sql
SELECT p.name, SUM(d.batter_runs) runs, SUM(d.is_wide = 0) balls,
       ROUND(100.0 * SUM(d.batter_runs) / SUM(d.is_wide = 0), 1) sr
FROM deliveries d
JOIN matches m ON m.match_id = d.match_id
JOIN innings i ON i.innings_id = d.innings_id
JOIN players p ON p.player_id = d.batter_id
WHERE m.season_id = '2025' AND i.innings_number <= 2
GROUP BY d.batter_id HAVING balls >= 200
ORDER BY sr DESC LIMIT 10;
```
WHERE filters deliveries before grouping; HAVING filters players after the sums exist.

**C2** — see Chapter 4 Q3. Conceded expression: `d.batter_runs + CASE WHEN d.is_wide=1 THEN d.extra_runs ELSE 0 END + CASE WHEN d.is_noball=1 THEN 1 ELSE 0 END`; legal balls: `d.is_wide=0 AND d.is_noball=0`; death: `d.over_num >= 15`. `is_bye/is_legbye` are 0 on every row, so subtracting them changes nothing and would charge every bye to the bowler.

**C3** — shape:
```js
app.get("/api/players/:name/career", (req, res) => {
  const name = String(req.params.name ?? "");
  if (name.trim().length < 2) return res.status(400).json({ error: "invalid_request" });
  const row = db.prepare(`SELECT SUM(d.batter_runs) runs, SUM(d.is_wide=0) balls
    FROM deliveries d JOIN innings i ON i.innings_id=d.innings_id
    JOIN players p ON p.player_id=d.batter_id
    WHERE p.name = ? AND i.innings_number <= 2`).get(name);
  if (!row || row.balls == null) return res.status(404).json({ error: "player_not_found" });
  res.json({ ...row, sr: +(100 * row.runs / row.balls).toFixed(1) });
});
```

**C4** — key points: `useEffect` (or React Query) keyed on `[season, minBalls]`; `AbortController` to cancel stale requests; render `Loading…`, `Error: …`, `No players match` explicitly; `<label htmlFor>` on inputs.

**C5** — a reasonable candidate is `CREATE INDEX ix_del_over_bowler ON deliveries(over_num, bowler_id);` so the planner can start from `over_num >= 15` (~25% of rows). Measure; if the season join dominates, an index won’t help much and a pre-aggregate (C11) is the better answer. Mention: every index slows inserts and grows the file.

**C6** — failure modes: two players sharing initial + surname (MD/Mukesh/Mukul Choudhary all start with M); bios using full names vs scorecard initials (“Prince Choudhary” vs “P Choudhary”); name variants (“Wanindu Hasaranga” vs “PWH de Silva”); first match wins arbitrarily. Fix:
```js
function findPlayer(bio, playersById, nameIndex) {
  if (bio.registryId && playersById.has(bio.registryId)) return playersById.get(bio.registryId);
  const hits = nameIndex.get(bio.fullName) ?? [];
  return hits.length === 1 ? hits[0] : null;   // ambiguous or unknown → empty state
}
```

**C7** — `const [o, b] = ball.split(".").map(Number);` Never `parseFloat`. Bowler conceded = bat runs + wides + noballs; batter balls = rows where wides == 0.

**C8** — x-axis 0–200 index with a line at 100; one row per metric; dot = index; whiskers = CI; label direction (“lower is better” for dot %).

**C9**
```ts
test("shrink pulls small samples toward 100", () => {
  assert.ok(Math.abs(shrink(150, 10)! - 100) < Math.abs(150 - 100));
  assert.ok(Math.abs(shrink(150, 5000)! - 150) < 2);
  assert.equal(shrink(150, 0), 100);
});
test("wilson bounds", () => {
  const w = wilsonInterval(0, 20)!; assert.equal(w.low, 0); assert.ok(w.high > 0 && w.high < 100);
});
```

**C10** — index = 100 × 204.73 / 156.34 = 130.95. Shrunk = (275×130.95 + 120×100)/395 = 121.5. Own-data weight = 275/395 = 69.6%. Small sample: (27×123.2 + 12,000)/147 = 104.3; weight 27/147 = 18.4%. Assumption: k=120 balls is the prior strength; it was chosen, not estimated.

**C11** — table `bat_season(player_id, season, phase, runs, balls, fours, sixes, outs)`; build with one GROUP BY over deliveries; leaderboard = `SELECT … FROM bat_season WHERE season=? AND phase='all' AND balls>=?`; verify equality with the original query for 3 seasons; refresh after each ingest.

**C12** — URL `/api/scout/rankings?discipline=bowling&…&sortBy=shrunk&sortOrder=desc`; handler `routes/scout.ts:78`; `ratePlayers → competitionRatings` (aggregates, variance, coverage, roles, names, teams SQL); sort at `:128-154` uses `metrics.economy.shrunk` descending — higher economy index means *more* runs conceded, so the worst bowlers rank first; percentile (direction-aware) is 0 for them. Fix: sort by `better` direction or by percentile.

**C13** — `POST /api/ipl/sync-csv` (`routes/csv-sync-route.ts`) reads `filePath` from the body and calls `fs.existsSync`/`fs.readFileSync` on it (`services/cricsheet-csv-sync.ts:38-43`). Impact: file existence disclosure, partial content disclosure, resource exhaustion. Fix: remove; or accept an id → whitelist map; `path.resolve` + `startsWith(allowedDir)`; admin auth; size cap; generic errors. Test: request with `../../package.json` returns 400.

**C14**
```ts
const COMPS = ["ipl","smat","bbl","sa20","cpl","ilt20"] as const;
const schema = z.object({
  discipline: z.enum(["batting","bowling"]).default("batting"),
  competitions: z.string().optional().transform(s => s?.split(",").map(x => x.trim().toLowerCase()))
    .refine(a => !a || a.every(c => (COMPS as readonly string[]).includes(c)), "unknown competition"),
  sortBy: z.enum(["shrunk","balls","matches","strike_rate","boundary_pct","dot_pct","economy","wicket_rate"]).default("shrunk"),
  search: z.string().max(40).optional(),
  minBalls: z.coerce.number().int().min(0).max(10000).default(120),
});
```

**C15** — filters: SMAT + IPL, phase death, recent 2–3 seasons, `minBalls ≥ 120`, capped status = uncapped (only where `player_attributes` has corroborated status); metrics: economy (lower), boundary % conceded (lower), dot % (higher), wicket rate (higher) — rank by shrunk index *with direction*; show CI and balls; flag `bowling type unknown`; output: 8–10 names with evidence lines and limitations (no opposition-strength adjustment; SMAT Plate Group share; no fitness/age data).

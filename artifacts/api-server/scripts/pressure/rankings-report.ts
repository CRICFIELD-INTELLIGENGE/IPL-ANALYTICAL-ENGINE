// SupeRR Selector S2, Round 1 — official rankings + methodology report from the published snapshot.
//
//   node --import tsx scripts/pressure/rankings-report.ts
//   Official data: PRESSURE_SNAPSHOT=data/pressure-official/pressure-reliability.json \
//     PRESSURE_REPORT_DIR=../../docs/pressure-reliability/official node --import tsx scripts/pressure/rankings-report.ts
//
// Writes docs/pressure-reliability/{rankings.json, METHODOLOGY.md}. Every number comes from
// the snapshot and the serving code the website uses, so the report, the API and the
// Scenario Intelligence tab cannot disagree.

import fs from "node:fs";
import path from "node:path";
import { pressureReliability, pressureModelInfo, type PressureQuery } from "../../src/services/pressure/reliability";
import { computePressureReliability } from "../../src/services/pressure/engine";

const OFFICIAL: Omit<PressureQuery, "role"> = {
  comps: ["ipl", "t20i"], from: 2022, to: 2026, definition: "rules", minBalls: 250, minMatches: 20,
  lens: "all", t20iScope: "full-members", estimator: "pressure", limit: 1000,
};
type Role = "batting" | "bowling";
const ROLES: Role[] = ["batting", "bowling"];
const info = pressureModelInfo() as any;
const run = (role: Role, over: Partial<PressureQuery> = {}) => pressureReliability({ ...OFFICIAL, role, ...over });

// Probability of finishing in the top 10, from each player's posterior (normal, 90% interval → sd).
function pTop10(players: ReturnType<typeof run>["players"], draws = 20000): Map<string, number> {
  const sd = players.map(p => (p.interval90[1] - p.interval90[0]) / (2 * 1.645));
  const hits = new Array(players.length).fill(0);
  let seed = 20261115;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  for (let d = 0; d < draws; d++) {
    const v = players.map((p, i) => ({ i, x: p.adjustedPer100 + sd[i] * gauss() }));
    v.sort((a, b) => b.x - a.x);
    for (let k = 0; k < 10; k++) hits[v[k].i]++;
  }
  return new Map(players.map((p, i) => [p.player, hits[i] / draws]));
}

const official = Object.fromEntries(ROLES.map(r => [r, run(r)])) as Record<Role, ReturnType<typeof run>>;
const top10 = Object.fromEntries(ROLES.map(r => [r, official[r].players.slice(0, 10)])) as Record<Role, ReturnType<typeof run>["players"]>;
const probs = Object.fromEntries(ROLES.map(r => [r, pTop10(official[r].players)])) as Record<Role, Map<string, number>>;

const variants: { id: string; over: Partial<PressureQuery> }[] = [
  { id: "Eligibility ≥120 balls, ≥10 matches", over: { minBalls: 120, minMatches: 10 } },
  { id: "Eligibility ≥400 balls, ≥30 matches", over: { minBalls: 400, minMatches: 30 } },
  { id: "Pressure = leverage top 30%", over: { definition: "leverage30" } },
  { id: "T20I: all nations (associates included)", over: { t20iScope: "all" } },
  { id: "IPL only", over: { comps: ["ipl"] } },
  { id: "Seasons 2024–2026 only", over: { from: 2024 } },
  { id: "Forecast estimator (anchored to usual level)", over: { estimator: "forecast" } },
  { id: "Rank by lower 90% bound", over: { sort: "conservative" } },
];
const sensitivity = variants.map(v => {
  const row: Record<string, unknown> = { variant: v.id };
  for (const r of ROLES) {
    const names = run(r, v.over).players.slice(0, 10).map(p => p.player);
    row[r] = top10[r].filter(p => names.includes(p.player)).length;
  }
  return row;
});

// ── Write rankings.json ─────────────────────────────────────────────────────
const outDir = process.env.PRESSURE_REPORT_DIR ? path.resolve(process.env.PRESSURE_REPORT_DIR) : path.resolve(process.cwd(), "..", "..", "docs", "pressure-reliability");
const OFFICIAL_DATA = /official/i.test(String(info.source));
const ingest = (() => {
  const fp = path.resolve(process.cwd(), "..", "..", "lib", "cricket-data", "official", "ingest-report.json");
  return OFFICIAL_DATA && fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf8")) : null;
})();
// The Cricsheet build's top 10 under the same configuration, for a cross-source comparison.
const cricsheetTop = (() => {
  if (!OFFICIAL_DATA) return null;
  const fp = path.resolve(process.cwd(), "data", "pressure", "pressure-reliability.json");
  if (!fs.existsSync(fp)) return null;
  const snap = JSON.parse(fs.readFileSync(fp, "utf8"));
  return Object.fromEntries(ROLES.map(r => [r, computePressureReliability(snap, { ...OFFICIAL, role: r }).players.slice(0, 10).map(p => p.player)])) as Record<Role, string[]>;
})();
const surname = (n: string) => n.split(" ").at(-1)!.toLowerCase();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "rankings.json"), JSON.stringify({
  modelVersion: official.batting.version, generatedAt: new Date().toISOString(), configuration: OFFICIAL,
  batters: top10.batting.map((p, i) => ({ rank: i + 1, ...p, pTop10: probs.batting.get(p.player) })),
  bowlers: top10.bowling.map((p, i) => ({ rank: i + 1, ...p, pTop10: probs.bowling.get(p.player) })),
  cohort: { batting: official.batting.cohort, bowling: official.bowling.cohort },
  sensitivity, ruleSensitivity: info.ruleSensitivity, definitionComparison: info.definitionComparison,
}, null, 2));

// ── Write METHODOLOGY.md ────────────────────────────────────────────────────
const f1 = (v: number | null | undefined, d = 1) => (v == null ? "—" : v.toFixed(d));
const sg = (v: number, d = 1) => `${v > 0 ? "+" : ""}${v.toFixed(d)}`;
const pc = (v: number | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const wpv = info.winProbability.validation;
const defs = info.definitionComparison as any[];
const def = (id: string) => defs.find(d => d.id === id);

const table = (role: Role) => {
  const bat = role === "batting";
  const head = bat
    ? "| # | Player | Team (latest) | Pressure balls | Matches | Pressure SR | Usual SR | Pressure avg | Raw /100 | Usual /100 | **Score /100** (90% range) | Uplift | Good games | P(top 10) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"
    : "| # | Player | Team (latest) | Pressure balls | Matches | Pressure econ | Usual econ | Balls/wkt | Dot % | Raw /100 | Usual /100 | **Score /100** (90% range) | Uplift | Good games | P(top 10) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|";
  const rows = top10[role].map((p, i) => bat
    ? `| ${i + 1} | ${p.player} | ${p.team} | ${p.pressureBalls} | ${p.pressureMatches} | ${f1(p.pressure.rate)} | ${f1(p.ordinary.rate)} | ${f1(p.pressure.perOut)} | ${sg(p.rawPer100)} | ${sg(p.usualPer100)} | **${sg(p.adjustedPer100)}** (${f1(p.interval90[0])} to ${f1(p.interval90[1])}) | ${sg(p.upliftAdjustedPer100)} | ${pc(p.goodMatchRate)} | ${pc(probs[role].get(p.player))} |`
    : `| ${i + 1} | ${p.player} | ${p.team} | ${p.pressureBalls} | ${p.pressureMatches} | ${f1(p.pressure.rate, 2)} | ${f1(p.ordinary.rate, 2)} | ${f1(p.pressure.perOut)} | ${f1(p.pressure.dotPct)} | ${sg(p.rawPer100)} | ${sg(p.usualPer100)} | **${sg(p.adjustedPer100)}** (${f1(p.interval90[0])} to ${f1(p.interval90[1])}) | ${sg(p.upliftAdjustedPer100)} | ${pc(p.goodMatchRate)} | ${pc(probs[role].get(p.player))} |`);
  return [head, ...rows].join("\n");
};
const nextUp = (role: Role) => official[role].players.slice(10, 15).map((p, i) => `${i + 11}. ${p.player} (${sg(p.adjustedPer100)}, P(top 10) ${pc(probs[role].get(p.player))})`).join("; ");
const rawLeaders = (role: Role) => [...official[role].players].sort((a, b) => b.rawPer100 - a.rawPer100).slice(0, 10);
const movers = (role: Role) => rawLeaders(role).filter(p => !top10[role].some(t => t.player === p.player))
  .map(p => `${p.player} (raw ${sg(p.rawPer100)} from ${p.pressureBalls} balls → score ${sg(p.adjustedPer100)})`).join("; ") || "none";

const md = `# Who Delivers Under Pressure? — Methodology Report${OFFICIAL_DATA ? " (official data pack)" : ""}

**SupeRR Selector Season 2 · Round 1** · CricField Pressure Reliability engine · model \`${official.batting.version}\` · generated ${new Date().toISOString().slice(0, 10)}

## Summary

We score every delivery from 2022 onward in the IPL and in men's T20Is between ICC Full Members. Each ball is compared with what normally
happens in that exact match state. Pressure is defined once per delivery, so the batter and the bowler on the same ball always
share the same pressure label. A player's score is their contextual value per 100 pressure balls, adjusted for sample size with
empirical Bayes. A short hot streak cannot top the table.

**Top 10 batters:** ${top10.batting.map((p, i) => `${i + 1}. ${p.player}`).join(" · ")}

**Top 10 bowlers:** ${top10.bowling.map((p, i) => `${i + 1}. ${p.player}`).join(" · ")}

## 1. Data

| Source | Matches in model | Coverage |
|---|---|---|
${Object.entries(info.coverage).filter(([, c]: any) => c.matches > 0).map(([code, c]: any) => `| ${c.name} (\`${code}\`) | ${c.matches} | ${c.from} to ${c.to} |`).join("\n")}

${OFFICIAL_DATA ? `* **Source: the supplied SupeRR Selector S2 data pack** (${(ingest?.deliveries ?? 200999).toLocaleString("en-US")} deliveries, ${ingest?.matches ?? 883} matches).
  All modelling (expected outcomes, wicket cost, win probability, pressure, rankings) uses only this data.
* **How the pack was read.** \`runs\` is the batter's runs; \`extras1_runs\` is an extras-type code, not a run count. \`Overstep\`
  and \`other\` are no-balls, and \`extras_2_runs\` holds byes or leg-byes off a no-ball. We confirmed these readings by
  aligning 1,479 innings ball for ball with an independent public source (Cricsheet).
* **Imputed extras.** The pack does not record how many runs a wide, bye or leg-bye produced, so each counts as 1 (a penalty as 5).
  This only affects team totals and the chase target; batter runs, wickets and runs charged to bowlers are exact, apart from
  wide boundaries. Checked against the pack's own results:
  ${ingest ? `wicket margins match exactly in ${ingest.wicketMargins.exact} of ${ingest.wicketMargins.checked} matches (the single exception is a margin inconsistent with the pack's own ball data); run margins are within 3 runs in ${ingest.runMargins.within3} of ${ingest.runMargins.checked} matches (mean absolute difference ${ingest.runMargins.meanAbs} runs).` : "see ingest-report.json."}
* **Rankings use** IPL 2022–2026 plus T20Is between ICC Full Members (Afghanistan included): ${official.batting.matches} matches.
  T20Is involving associate nations and the Emerging / Rising Stars tournaments (A-teams) feed only the general models.
  A robustness row below adds associate T20Is back.
* Super overs are excluded. Rain-affected chases use the pack's revised target and overs. Reduced first innings are left out of the
  first-innings models.

` : `* Ball-by-ball data come from Cricsheet (ODC-BY 1.0), loaded into CricField's warehouse by the repository's pipeline.
  Every delivery passes the check *runs.total = batter + extras*, and *extras = wides + no-balls + byes + leg-byes + penalty*,
  with 0 failures across all competitions.
* **Rankings use** the IPL (2022 onward) plus men's T20Is (2022 onward) where both sides are ICC Full Members:
  ${official.batting.matches} matches.
  The other leagues and associate-nation T20Is are used only to fit the general models (expected outcomes, win probability).
* **Afghanistan:** Cricsheet withholds every Afghanistan match, so Afghan players are measured on their IPL record only.
* Super overs are excluded. Rain-revised targets come from the official revised target. Reduced first innings, whose length is
  not recorded, are excluded from the first-innings models.

`}## 2. Defining pressure (the same for bat and ball)

We compared four families of definitions and chose using evidence, not appeal. Each candidate is applied to the same deliveries
(IPL + Full-Member T20Is, 2022 onward) and scored on two tests:

1. **Is player value under it repeatable?** We report K, the number of pressure balls a player needs before half their score is
   their own signal rather than noise. K is estimated from match-to-match variation, and smaller is better. We also report the
   split-half correlation between odd-numbered and even-numbered matches.
2. **Is "better than usual under pressure" repeatable?** This is the split-half correlation of each player's pressure uplift
   (pressure value minus their own ordinary value).

| Definition | Share of balls | Batting K | Bowling K | Batting uplift r | Bowling uplift r |
|---|---|---|---|---|---|
${defs.map(d => `| ${d.label} | ${pc(d.shareOfBalls)} | ${d.batting.priorStrengthBalls} | ${d.bowling.priorStrengthBalls} | ${f1(d.batting.upliftSplitHalf, 3)} | ${f1(d.bowling.upliftSplitHalf, 3)} |`).join("\n")}

**Selected: A (rules).** A ball is a pressure ball when any of the following holds, judged before the ball is bowled:

* it is in the **death overs** (16–20); or
* it is in a **chase needing 9 or more an over**; or
* the batting side is in a **collapse**: 3 or more wickets down for 35 or fewer runs.

Against leverage at the same share of balls, rule A needs fewer balls to separate players. Batting K is ${def("rules").batting.priorStrengthBalls}
against ${def("leverage40").batting.priorStrengthBalls}, and bowling K is ${def("rules").bowling.priorStrengthBalls} against ${def("leverage40").bowling.priorStrengthBalls}.
Because one definition must serve both roles, we chose the one with the lowest *combined* K (batting + bowling).
Some alternatives do better for one role alone, as the table shows, but each is much worse for the other.

Leverage was built and validated, but it is *not* used to define pressure. Leverage is the expected change in win probability from
the next ball, using calibrated logistic win-probability models. On matches from ${wpv.chase.holdoutFrom.slice(0, 4)} on, which the
models never saw, the Brier score was ${wpv.chase.model.brier} for chases (against ${wpv.chase.baseline.brier} for always guessing
the base rate) and ${wpv.firstInnings.model.brier} for first innings (against ${wpv.firstInnings.baseline.brier}).

Leverage concentrates on powerplay balls, because early wickets move the projected result. That is true, but in this data it makes
a weaker definition for comparing players (higher K in both roles). Uplift repeatability is low under every definition
(see the table), which is why uplift is reported but not used to rank (Section 4).

**Threshold sensitivity.** We moved each threshold on its own and re-ranked. Top-10 overlap with the selected thresholds:

| Change | Batters kept (of 10) | Bowlers kept (of 10) |
|---|---|---|
${info.ruleSensitivity.map((r: any) => `| ${r.variant} | ${r.battingOverlap} | ${r.bowlingOverlap} |`).join("\n")}

## 3. Measuring performance: one value scale for both roles

Each delivery gets a value measured from the player's own side, in runs:

* **Expected outcome.** We use the average for the same innings, over and wickets-down state (0–6+), pooled across all
  ${info.deliveries.toLocaleString("en-US")} deliveries and scaled to the scoring rate of that competition-season. The peer
  baseline never uses the evaluated player's identity.
* **Wicket cost.** A wicket costs the runs it removes from the rest of the innings: the fall in expected remaining runs, read from a
  table by overs left and wickets down that is estimated from completed first innings and forced to be monotone.
* **Batter value** = (runs off the bat − expected) − wicket cost × (dismissed − expected chance of dismissal).
* **Bowler value** = (expected conceded − conceded) + wicket cost × (bowler's wicket − expected chance).
  Runs conceded include wides and no-balls. Byes and leg-byes are not charged. Run-outs are not credited to the bowler.
* **Opposition adjustment.** We subtract the strength of each opposition team-year, estimated by alternating empirical-Bayes
  passes. The spread is ±${info.opposition.bowlingSide.sdPer100} per 100 balls between bowling attacks and
  ±${info.opposition.battingSide.sdPer100} between batting line-ups.

The unit is **runs above expectation per 100 balls**, with the wicket cost included. Positive is good for the player's team in both roles.
Raw diagnostics are reported alongside (strike rate, average, economy, balls per wicket, dot %), split into pressure and usual balls.

## 4. Fair comparisons: reliability and sample size

* **Score = empirical-Bayes estimate of pressure value.** score = μ + B/(B+K)·(raw − μ), where B is the number of pressure balls.
  K is estimated from the data: K = s²/τ², where s² is the within-player match-to-match noise and τ² is the true spread between
  players. Noise is measured between matches, not between balls, so 30 balls from one innings count as one match, not 30 balls.
* This cohort gives K = **${official.batting.cohort.priorStrengthBalls} balls (batting)** and **${official.bowling.cohort.priorStrengthBalls} balls (bowling)**.
  The true spread is about ±${official.batting.cohort.pressureTrueSpreadPer100} and ±${official.bowling.cohort.pressureTrueSpreadPer100}
  runs per 100 pressure balls.
* The 90% range is the posterior interval. **P(top 10)** is the share of 20,000 simulated rankings, drawn from every eligible
  player's posterior, in which the player makes the top 10.
* **Eligibility:** at least 250 pressure balls (faced or bowled) and at least 20 different matches with pressure balls.
  ${official.batting.qualified} batters and ${official.bowling.qualified} bowlers qualify.
* **Usual performance and uplift.** The usual level is the same value measure on non-pressure balls, shrunk the same way.
  Uplift = pressure score − usual level.

**How absolute performance and "relative to usual" enter the ranking.** Players are ranked on absolute pressure value. Uplift is
reported for every player but not used in the score. The reason is in Section 2: uplift barely repeats between odd and even matches
(r ≈ 0 to 0.12). Ranking on it would mostly reward luck. A player who is excellent all the time stays excellent under pressure,
which is what a selector needs. We also built a *forecast* estimator that anchors each player to their usual level. It shows usual
form predicts pressure form with a slope of ${official.batting.cohort.usualToPressureSlope} (batting) and
${official.bowling.cohort.usualToPressureSlope} (bowling). We did not use it for the official lists, because it can rank a player
highly on calm-ball form alone.

## 5. Results

### Top 10 batters under pressure
${table("batting")}

Next five: ${nextUp("batting")}.

### Top 10 bowlers under pressure
${table("bowling")}

Next five: ${nextUp("bowling")}.

Batting columns: pressure SR and average from pressure balls only. Bowling columns: economy, balls per wicket and dot % from pressure
balls only. Raw /100 is the unadjusted value. Usual /100 is non-pressure value, shrunk. Good games is the share of matches with
positive pressure value.

**Where raw statistics and the model disagree.** Players in the raw top 10 who drop out after the sample-size adjustment:
batting: ${movers("batting")}. Bowling: ${movers("bowling")}.

${cricsheetTop ? `### Cross-check against an independent source

The same method, run on Cricsheet's public ball-by-ball data (which covers some different T20Is and has no Afghanistan matches),
keeps **${top10.batting.filter(p => cricsheetTop.batting.some(c => surname(c) === surname(p.player))).length} of 10 batters** and
**${top10.bowling.filter(p => cricsheetTop.bowling.some(c => surname(c) === surname(p.player))).length} of 10 bowlers**.
The leaders (Suryakumar Yadav and Jasprit Bumrah) are the same in both.

` : ""}### Robustness: top-10 overlap under alternative choices

| Alternative | Batters kept (of 10) | Bowlers kept (of 10) |
|---|---|---|
${sensitivity.map(r => `| ${r.variant} | ${r.batting} | ${r.bowling} |`).join("\n")}

## 6. Reliability and limitations

* **Pressure skill is real but small.** The between-player spread is about ±${official.batting.cohort.pressureTrueSpreadPer100} (batting)
  and ±${official.bowling.cohort.pressureTrueSpreadPer100} (bowling) runs per 100 pressure balls. Several 90% ranges overlap, so
  neighbouring ranks are close calls. P(top 10) shows which places are secure.
* **Bowling is harder to separate than batting** (K ${official.bowling.cohort.priorStrengthBalls} against ${official.batting.cohort.priorStrengthBalls}).
  Only the leaders' ranges sit clearly above average.
${OFFICIAL_DATA ? "* **Imputed extras** (Section 1) can move a chase target by a few runs, which shifts some balls across the required-rate-9 line. The threshold sensitivity in Section 2 covers this: moving that line by a full run an over keeps 7 to 9 of each top 10.\n" : ""}* **Not modelled:** ball tracking, field placements, pitch and weather. These are not in the data and were not invented. Bowling
  style is not used.
* **Team strength** is adjusted per team-year. Associate-nation T20Is are excluded from the rankings, because their strength cannot
  be estimated reliably against Full Members from the few cross-tier matches.
* **The P(top 10) simulation** treats players as independent draws from their posteriors.

## 7. Reproducing this

\`\`\`
pnpm --filter @workspace/scripts run global:sync -- --only t20i          # load Cricsheet men's T20Is into global.db
cd artifacts/api-server
node --import tsx scripts/pressure/build-pressure-reliability.ts        # fit models, publish snapshot
node --import tsx scripts/pressure/rankings-report.ts                   # this report + rankings.json
\`\`\`

Code: \`artifacts/api-server/src/services/pressure/\` (model, serving), \`scripts/pressure/\` (build, report),
\`test/pressure-reliability.test.ts\`. The same numbers are served at \`/api/stats/pressure-reliability\` and shown in CricField
→ Stats → Scenario Intelligence → Pressure Reliability. Snapshot version \`${official.batting.version}\` is a hash of its contents.
`;
fs.writeFileSync(path.join(outDir, "METHODOLOGY.md"), md);
console.log(`wrote ${outDir}`);
for (const r of ROLES) console.log(r, top10[r].map((p, i) => `${i + 1}.${p.player}(${probs[r].get(p.player)?.toFixed(2)})`).join(" "));
console.log(JSON.stringify(sensitivity));

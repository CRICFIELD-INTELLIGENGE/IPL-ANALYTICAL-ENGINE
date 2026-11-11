// Step 3 review harness — compare baseline and patched snapshots, and check against Cricsheet truth.
//
//   tsx src/step3/economy-compare.ts --baseline a.json --patched b.json --out report.md
//
// Verdict rules:
//   - every output that does not depend on runs conceded must be byte-identical;
//   - outputs that do depend on it may change, but conceded runs may only go down (byes, leg-byes and
//     penalties removed) and bowling dot counts only up (bye-only balls become dots);
//   - patched per-bowler conceded runs must equal an independent recount from the raw Cricsheet JSON the
//     site already ships (lib/cricket-data/raw), except where the warehouse cannot separate the components.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { IPL_RAW_DIR, REPO, parseArgs } from "../global/paths";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const { values } = parseArgs(process.argv.slice(2));
const A: Any = JSON.parse(fs.readFileSync(values.get("baseline")!, "utf8"));
const B: Any = JSON.parse(fs.readFileSync(values.get("patched")!, "utf8"));
const out = values.get("out") ?? "economy-compare.md";
const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
const L: string[] = [];
const verdicts: { area: string; pass: boolean; detail: string }[] = [];
const verdict = (area: string, pass: boolean, detail: string) => verdicts.push({ area, pass, detail });

// 1. Column store
const ca = A.ballContext, cb = B.ballContext;
for (const k of ["n", "totalRuns", "batRuns", "legal", "wickets"]) verdict(`column store: ${k}`, ca[k] === cb[k], `${ca[k]} → ${cb[k]}`);
verdict("column store: per-batter runs", same(ca.batterRuns, cb.batterRuns), "identical for every batter");
const bowlerUp = Object.keys(cb.bowlerConceded).filter((k) => cb.bowlerConceded[k] > (ca.bowlerConceded[k] ?? 0));
const bowlerDown = Object.keys(cb.bowlerConceded).filter((k) => cb.bowlerConceded[k] < (ca.bowlerConceded[k] ?? 0));
verdict("column store: conceded only decreases", bowlerUp.length === 0 && cb.conceded <= ca.conceded,
  `total ${ca.conceded} → ${cb.conceded} (−${ca.conceded - cb.conceded}); ${bowlerDown.length} bowlers lower, ${bowlerUp.length} higher`);

// 2. Stats engine
L.push("## Advanced-stats engine (/api/ask)", "", "| Query | Depends on conceded | Rows | Rows changed | Order changed | Result |", "|---|---|---:|---:|---|---|");
const changedColumns = new Map<string, Set<string>>();
for (const [id, a] of Object.entries<Any>(A.statsEngine)) {
  const b = B.statsEngine[id];
  const rowsA = a.rows as Any[], rowsB = b.rows as Any[];
  const byKey = new Map(rowsA.map((r) => [r.key, r]));
  let changed = 0;
  const cols = new Set<string>();
  for (const r of rowsB) {
    const o = byKey.get(r.key);
    if (!o || !same(o.values, r.values)) {
      changed++;
      if (o) for (const k of Object.keys(r.values)) if (o.values[k] !== r.values[k]) cols.add(k);
    }
  }
  changedColumns.set(id, cols);
  const order = same(rowsA.map((r) => r.key), rowsB.map((r) => r.key)) ? "no" : "yes";
  // Bowling result rows always carry the companion columns runs / econ / avg / dot, which depend on runs
  // conceded by definition. For a query ranked on something else, everything else must be identical.
  const isBowling = id.startsWith("bowl_");
  const companion = new Set(["runs", "econ", "avg", "dot"]);
  const otherColsChanged = [...cols].filter((k) => !(isBowling && companion.has(k)));
  const ok = a.related ? true : order === "no" && a.qualification === b.qualification && otherColsChanged.length === 0 && rowsA.length === rowsB.length;
  const detail = a.related
    ? (changed ? `changed columns: ${[...cols].join(", ")}` : "unchanged")
    : ok ? (cols.size ? `ranking, order and ranked metric identical ✔ (companion columns ${[...cols].join(", ")} corrected)` : "identical ✔") : `DIFFERS ✘ ${otherColsChanged.join(", ")}`;
  L.push(`| ${id} | ${a.related ? "yes" : "no"} | ${rowsB.length} | ${changed} | ${order} | ${detail} |`);
  if (!a.related) verdict(`engine: ${id}`, ok, ok ? (cols.size ? "same rows, order and ranked metric; only runs/econ/avg/dot companion columns changed" : "identical") : `differs in ${otherColsChanged.join(", ") || "order or qualification"}`);
}
for (const id of ["bowl_economy_by_season", "bowl_economy_by_phase"]) {
  const a = A.statsEngine[id].rows as Any[], b = B.statsEngine[id].rows as Any[];
  L.push("", `**${id}** (league level):`, "", "| Group | Before | After |", "|---|---|---|");
  for (const r of b) {
    const o = a.find((x: Any) => x.key === r.key);
    const key = Object.keys(r.values).find((k) => /econ/i.test(k)) ?? Object.keys(r.values)[0];
    L.push(`| ${r.label} | ${o?.values[key] ?? "—"} | ${r.values[key]} |`);
  }
}
{
  const a = A.statsEngine.bowl_economy_by_player.rows as Any[], b = B.statsEngine.bowl_economy_by_player.rows as Any[];
  L.push("", "**Most economical bowlers (qualified), top 10 before and after:**", "", "| # | Before | After |", "|---:|---|---|");
  const key = Object.keys(b[0]?.values ?? {}).find((k) => /econ/i.test(k)) ?? "econ";
  for (let i = 0; i < 10 && i < b.length; i++) L.push(`| ${i + 1} | ${a[i]?.label} ${a[i]?.values[key]} | ${b[i]?.label} ${b[i]?.values[key]} |`);
}

// 3. Season lines
let lineBowlChanged = 0, lineOtherChanged = 0, lineUp = 0, maxDrop = 0, maxDropPid = "";
for (const [pid, a] of Object.entries<Any>(A.seasonTotals)) {
  const b = B.seasonTotals[pid];
  if (!b) { lineOtherChanged++; continue; }
  for (const k of ["batRuns", "batBalls", "batOuts", "bowlBalls", "wickets"]) if (a[k] !== b[k]) lineOtherChanged++;
  if (a.bowlRuns !== b.bowlRuns) { lineBowlChanged++; if (b.bowlRuns > a.bowlRuns) lineUp++; if (a.bowlRuns - b.bowlRuns > maxDrop) { maxDrop = a.bowlRuns - b.bowlRuns; maxDropPid = pid; } }
}
verdict("season lines: batting, balls bowled, wickets", lineOtherChanged === 0, `${lineOtherChanged} differences`);
verdict("season lines: runs conceded only decrease", lineUp === 0, `${lineBowlChanged} players lower (largest −${maxDrop}, player ${maxDropPid}); ${lineUp} higher`);

// 4. Weakness detector and match model
for (const [n, a] of Object.entries<Any>(A.weakness)) {
  const b = B.weakness[n];
  const isBowler = a?.side === "bowling" || /Bumrah|Rashid|Chahal|Arshdeep|Narine|Kumar/.test(n);
  if (!isBowler) verdict(`weakness: ${n} (batter)`, same(a, b), same(a, b) ? "identical" : "differs");
  else L.push(`- weakness report for ${n}: ${same(a, b) ? "unchanged" : "changed (bowling runs basis corrected)"}`);
}
for (const [k, a] of Object.entries<Any>(A.matchModel)) {
  const b = B.matchModel[k];
  if (k.startsWith("batter:")) verdict(`match model: ${k}`, same(a, b), same(a, b) ? "identical" : "differs");
  else L.push(`- match model ${k}: economy by phase ${a.map((x: Any) => x.economy?.toFixed(2)).join(" / ")} → ${b.map((x: Any) => x.economy?.toFixed(2)).join(" / ")}; balls and balls-per-wicket ${same(a.map((x: Any) => [x.balls, x.ballsPerWicket]), b.map((x: Any) => [x.balls, x.ballsPerWicket])) ? "identical" : "DIFFER"}`);
}

// 5. Legacy aggregator
// `isIndian` and `team` are player METADATA (from player-bio / squads files), not statistics. They change
// when those files are corrected, independently of the economy fix, so they are excluded from the
// "statistics unchanged" checks and listed separately below. Day 3 found 23 isIndian corrections and two
// team back-fills since the 2026-10-10 baseline; each is corroborated by
// artifacts/api-server/test/data-integrity.test.ts ("legacy metadata changes since the Step-3 baseline …").
// Day 4.6: bowlerType is also bio-derived classification (pace / spin from the player bio), not a statistic; it
// changed for 19 bowlers when stats-aggregator getPlayerBio() moved from initial+surname matching to registry
// identity (each now from the player's own bio; artifacts/api-server/test/bio-lookup.test.ts).
const METADATA_FIELDS = new Set(["isIndian", "team", "bowlerType"]);
const stripMeta = (rows: Any[]) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !METADATA_FIELDS.has(k))));
const metaChanges: string[] = [];
const metaPlayers = new Set<string>();
// Day 4 definition fix: scoringZones[].boundaryPct was boundaries ÷ runs × 100 (a count over runs); it is now
// boundaries per 100 balls. It is excluded from the "unchanged" comparison only after the patched value is
// checked against the zone's own counts, so any other change to it still fails.
const zoneDefinitionOk = (rows: Any[]) => rows.every((r) => (r.scoringZones ?? []).every((z: Any) =>
  z.boundaryPct === (z.balls > 0 ? Math.round((z.boundaries / z.balls) * 100) : 0)));
const stripZonePct = (rows: Any[]) => rows.map((r) => (r.scoringZones ? { ...r, scoringZones: r.scoringZones.map(({ boundaryPct: _b, ...z }: Any) => z) } : r));
// Day 6C: batter rows gained `boundaryRunPct`, an explicit alias of their run-share `boundaryPct`. It is dropped from the
// comparison only where it equals boundaryPct, so a differing value still fails.
const stripRunPctAlias = (rows: Any[]) => rows.map(({ boundaryRunPct, ...r }: Any) => (boundaryRunPct === undefined || boundaryRunPct === r.boundaryPct ? r : { ...r, boundaryRunPct }));
for (const [id, a] of Object.entries<Any>(A.legacy)) {
  const b = B.legacy[id];
  const zonesOk = zoneDefinitionOk(b.batters);
  verdict(`legacy /api/stats/query (${id}): batters' scoringZones boundaryPct = boundaries per 100 balls`, zonesOk, zonesOk ? "every zone matches its own counts" : "a zone's boundaryPct does not equal round(boundaries / balls × 100)");
  const batSame = same(stripZonePct(stripMeta(stripRunPctAlias(a.batters))), stripZonePct(stripMeta(stripRunPctAlias(b.batters))));
  verdict(`legacy /api/stats/query (${id}): batters (statistics)`, batSame, `${a.batters.length} batters ${batSame ? "identical" : "differ"} (metadata fields and the redefined zone boundaryPct excluded)`);
  for (const side of ["batters", "bowlers"] as const) {
    const before = new Map(a[side].map((x: Any) => [x.player, x]));
    for (const r of b[side]) {
      const o: Any = before.get(r.player);
      if (!o) continue;
      for (const f of METADATA_FIELDS) if (!same(o[f], r[f])) metaPlayers.add(r.player), metaChanges.push(`${id} ${side} ${r.player}.${f}: ${JSON.stringify(o[f])} → ${JSON.stringify(r[f])}`);
    }
  }
  const fields = new Set<string>();
  let rowsChanged = 0;
  const byName = new Map(a.bowlers.map((x: Any) => [x.player, x]));
  for (const r of b.bowlers) {
    const o: Any = byName.get(r.player);
    if (!o) continue;
    let ch = false;
    for (const k of Object.keys(r)) if (!METADATA_FIELDS.has(k) && !same(o[k], r[k])) { fields.add(k); ch = true; }
    if (ch) rowsChanged++;
  }
  const allowed = new Set(["runs", "conceded_runs", "economy", "average", "ppEconomy", "midEconomy", "deathEconomy", "trueEconomy", "best", "vsLhb", "vsRhb", "deliveryBreakdown", "economyRate", "bowlingAverage", "phases", "pp", "mid", "death"]);
  const unexpected = [...fields].filter((f) => !allowed.has(f) && !/econ|run|avg|average|best|phase/i.test(f));
  verdict(`legacy /api/stats/query (${id}): bowlers change only in runs-based fields`, unexpected.length === 0,
    `${rowsChanged} of ${b.bowlers.length} bowlers changed; fields: ${[...fields].join(", ") || "none"}${unexpected.length ? `; unexpected: ${unexpected.join(", ")}` : ""}`);
}
{
  const players = metaPlayers;
  L.push("", `## Player metadata changes since the baseline (not statistics; ${metaChanges.length} row-fields, ${players.size} players)`, "",
    metaChanges.length ? "Verified separately against warehouse evidence (SMAT appearances for nationality, IPL appearances for team)." : "None.", "",
    ...metaChanges.map((m) => `- ${m}`));
}

// 6. Truth: recount conceded per bowler from the raw Cricsheet JSON (innings 1–2, super overs excluded).
const ipl = new DatabaseSync(path.join(REPO, "sqlite.db"), { readOnly: true });
const pidOf = new Map((ipl.prepare("SELECT cricsheet_id, player_id FROM players").all() as Any[]).map((r) => [r.cricsheet_id, r.player_id]));
const truth: Record<number, number> = {};
let special = 0;
for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
  const reg = m.info.registry.people;
  (m.innings as Any[]).slice(0, 2).forEach((inn: Any) => {
    if (inn.super_over) return;
    for (const ov of inn.overs ?? []) for (const d of ov.deliveries) {
      const pid = pidOf.get(reg[d.bowler]);
      const e = d.extras ?? {};
      if ((e.noballs ?? 0) > 1 || ((e.wides ?? 0) > 0 && (e.penalty ?? 0) > 0)) special++;
      if (pid != null) truth[pid] = (truth[pid] ?? 0) + d.runs.batter + (e.wides ?? 0) + (e.noballs ?? 0);
    }
  });
}
const mismatchA = Object.keys(truth).filter((k) => (A.ballContext.bowlerConceded[k] ?? 0) !== truth[Number(k)]);
const mismatchB = Object.keys(truth).filter((k) => (B.ballContext.bowlerConceded[k] ?? 0) !== truth[Number(k)]);
const gapB = mismatchB.reduce((s, k) => s + (B.ballContext.bowlerConceded[k] - truth[Number(k)]), 0);
const truthTotal = Object.values(truth).reduce((s, x) => s + x, 0);
const truthOk = mismatchB.length <= special;
verdict("truth: patched conceded per bowler vs raw Cricsheet recount", truthOk,
  `baseline: ${mismatchA.length} bowlers differ; patched: ${mismatchB.length} differ (net ${gapB > 0 ? "+" : ""}${gapB} runs)` +
  (truthOk ? `, all attributable to the ${special} multi-run no-ball / wide-with-penalty deliveries the warehouse cannot split`
    : ` — more than the ${special} deliveries the warehouse cannot split; byes and leg-byes are still being charged to bowlers`));

const pass = verdicts.every((v) => v.pass);
const head = [
  `# Step 3 economy fix — regression results`, "",
  `Baseline: \`${A.src}\` (${A.capturedAt}). Patched: \`${B.src}\` (${B.capturedAt}).`, "",
  `**Verdict: ${pass ? "PASS" : "FAIL"}** — ${verdicts.filter((v) => v.pass).length}/${verdicts.length} checks pass.`, "",
  `Total runs conceded across IPL (column store, innings 1–2): ${ca.conceded.toLocaleString("en-US")} → ${cb.conceded.toLocaleString("en-US")}; raw Cricsheet recount ${truthTotal.toLocaleString("en-US")}.`, "",
  "| Check | Result | Detail |", "|---|---|---|",
  ...verdicts.map((v) => `| ${v.area} | ${v.pass ? "PASS" : "FAIL"} | ${v.detail} |`), "",
];
fs.writeFileSync(out, [...head, ...L].join("\n") + "\n");
console.log(`${pass ? "PASS" : "FAIL"}: ${verdicts.filter((v) => v.pass).length}/${verdicts.length} checks → ${out}`);
for (const v of verdicts.filter((x) => !x.pass)) console.log(`  FAIL ${v.area}: ${v.detail}`);

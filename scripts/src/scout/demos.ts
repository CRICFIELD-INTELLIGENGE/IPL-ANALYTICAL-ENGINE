// Scouting service — the three demonstration queries.
//
//   pnpm --filter @workspace/scripts run scout:demo [-- --player 5f547c8b]
//
// Writes lib/cricket-data/global/reports/scout-demos-<date>.{md,json}. Every number comes from
// service.ts over global.db; the wording around the numbers is fixed templates, not generated text.

import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { all, openGlobalDb } from "../global/db";
import { REPORT_DIR, ensureDir, parseArgs, today } from "../global/paths";
import {
  type Discipline, type Rating, debutSeason, fmtMetric, iplAppearances, playerAttributes, ratePlayers, resolvePlayer, seasonLines,
  similarPlayers, strengthsAndWeaknesses, trends, windowSeasons,
} from "./service";

const f1 = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(1));
const f0 = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? "—" : Math.round(x).toString());
const ci = (c: [number, number] | null) => (c ? `${f0(c[0])}–${f0(c[1])}` : "—");
const pct = (x: number | null) => (x == null ? "—" : f0(x));

function timed<T>(fn: () => T): { result: T; ms: number } {
  const t = performance.now();
  const result = fn();
  return { result, ms: performance.now() - t };
}

function statusLabel(db: DatabaseSync, pk: number): string {
  const a = playerAttributes(db, pk).cappedStatus2026;
  return a ? `${a.value} (2026 auction list; ${a.confidence === "exact" ? "exact link" : "corroborated link, unreviewed"})` : "not established (no linked official record)";
}
function styleLabel(db: DatabaseSync, pk: number): string {
  const b = playerAttributes(db, pk).bowling;
  if (b.type === "unknown") return "unknown (no verified source)";
  if (b.type === "conflict") return `conflict: ${b.style}`;
  return `${b.type} — ${b.style} [${b.source}, ${b.confidence}]`;
}

// ── Demo 1: cross-league player profile ────────────────────────────────────

function demoProfile(db: DatabaseSync, ref: string) {
  const { player, candidates } = resolvePlayer(db, ref);
  if (!player) throw new Error(`player "${ref}" not resolved (${candidates.length} candidates)`);
  const attrs = playerAttributes(db, player.player_key);
  const lines = seasonLines(db, player.player_key);
  const comps = [...new Set(lines.map((l) => l.competition))];
  const career = (d: Discipline, phase: "all" | "powerplay" | "middle" | "death") =>
    ratePlayers(db, { discipline: d, competitions: comps, phase, minBalls: 120 }).filter((r) => r.player_key === player.player_key);
  const bowlAll = career("bowling", "all"), batAll = career("batting", "all");
  const bowlPhases = (["powerplay", "middle", "death"] as const).flatMap((p) => career("bowling", p));
  const tr = trends(db, player.player_key);
  const sim = similarPlayers(db, player.player_key, { discipline: bowlAll.reduce((s, r) => s + r.balls, 0) >= batAll.reduce((s, r) => s + r.balls, 0) ? "bowling" : "batting", competitions: ["ipl", "smat", "bbl", "sa20", "cpl", "ilt20"], recentSeasons: 3 });
  const extIds = all<{ source: string; source_id: string }>(db, "SELECT source, source_id FROM player_source_ids WHERE player_key = ? AND source IN ('cricinfo', 'bcci', 'pulse') ORDER BY source", player.player_key);
  return { player, attrs, extIds, lines, bowlAll, batAll, bowlPhases, trends: tr, similar: sim };
}

// ── Demo 2: emerging talent ────────────────────────────────────────────────

interface Emerging { r: Rating; composite: number; debut: string; ipl: number; status: string; style: string; trend: string; why: string }

/** IPL exposure allowed for an "emerging" candidate (matches in the loaded IPL data, shown in the output). */
const MAX_IPL_MATCHES = 5;

/** The last N seasons of a competition whose coverage is complete (scout_coverage). */
function completeSeasons(db: DatabaseSync, code: string, n: number): string[] {
  return all<{ season_label: string }>(db, `SELECT sc.season_label FROM scout_coverage sc JOIN competitions c USING (competition_id)
    JOIN seasons s ON s.competition_id = sc.competition_id AND s.season_label = sc.season_label
    WHERE c.code = ? AND sc.status = 'complete' ORDER BY s.season_year DESC, s.start_date DESC LIMIT ?`, code, n).map((r) => r.season_label).reverse();
}

function demoEmerging(db: DatabaseSync, comps: string[], d: Discipline, opts: { recent?: number; seasons?: Record<string, string[]>; limit?: number } = {}): { window: Record<string, string[]>; rows: Emerging[]; considered: number; qualified: number } {
  const recent = opts.recent ?? 3, limit = opts.limit ?? 10;
  const ratings = ratePlayers(db, { discipline: d, competitions: comps, recentSeasons: recent, seasons: opts.seasons, minBalls: 120 }).filter((r) => r.balls >= 120);
  const window = Object.fromEntries(comps.map((c) => [c, windowSeasons(db, c, { recentSeasons: recent, seasons: opts.seasons })]));
  const rows: Emerging[] = [];
  for (const r of ratings) {
    const debut = debutSeason(db, r.player_key, r.competition);
    if (!debut || !window[r.competition].includes(debut)) continue; // new to the competition within the window
    const m = r.metrics;
    const composite = d === "batting"
      ? ((m.strike_rate.percentile ?? 0) + (m.balls_per_dismissal.percentile ?? 0)) / 2
      : ((m.economy.percentile ?? 0) + (m.wicket_rate.percentile ?? 0)) / 2;
    const passes = d === "batting" ? composite >= 70 && (m.strike_rate.percentile ?? 0) >= 60 : composite >= 70;
    if (!passes) continue;
    const ipl = iplAppearances(db, r.player_key);
    if (ipl > MAX_IPL_MATCHES) continue; // unexposed or barely exposed to the IPL
    const t = trends(db, r.player_key).find((x) => x.competition === r.competition && x.discipline === d);
    const main = d === "batting" ? m.strike_rate : m.economy;
    const why = d === "batting"
      ? `SR ${f1(main.value)} vs ${f1(main.league)} league for the same balls (index ${f0(main.index)}, 95% ${ci(main.ci)}); ${f1(m.balls_per_dismissal.value)} balls per dismissal (${pct(m.balls_per_dismissal.percentile)}th pct)`
      : `economy ${fmtMetric("economy", main.value)} vs ${fmtMetric("economy", main.league)} league (index ${f0(main.index)}, 95% ${ci(main.ci)}); ${r.counts.wickets} wickets, ${f1(m.wicket_rate.value)} balls per wicket (${pct(m.wicket_rate.percentile)}th pct)`;
    const context = r.lowerDivisionShare ? `; ${Math.round(100 * r.lowerDivisionShare)}% of these balls in Plate Group matches (weaker opposition; not adjusted for)` : "";
    rows.push({ r, composite, debut, ipl, status: statusLabel(db, r.player_key), style: d === "bowling" ? styleLabel(db, r.player_key) : "", trend: t ? `${t.verdict}${t.change != null ? ` (${t.detail})` : ""}` : "one season only", why: why + context });
  }
  rows.sort((a, b) => b.composite - a.composite || b.r.balls - a.r.balls);
  return { window, rows: rows.slice(0, limit), considered: ratings.length, qualified: rows.length };
}

// ── Demo 3: middle-overs spin shortlist ────────────────────────────────────

interface Candidate { r: Rating; type: string; style: string; composite: number; tier: string; reason: string; otherPhases: string; ipl: number; status: string }

/** Below this many qualifying bowlers a league's percentiles are too coarse to justify a priority call. */
const MIN_POPULATION_FOR_PRIORITY = 20;

function demoSpin(db: DatabaseSync, comps: string[], recent = 3) {
  const middle = ratePlayers(db, { discipline: "bowling", competitions: comps, phase: "middle", recentSeasons: recent, minBalls: 120 }).filter((r) => r.balls >= 120);
  const other = new Map<string, Rating>();
  for (const p of ["powerplay", "death"] as const) {
    for (const r of ratePlayers(db, { discipline: "bowling", competitions: comps, phase: p, recentSeasons: recent, minBalls: 60 })) other.set(`${r.player_key}|${r.competition}|${p}`, r);
  }
  const league = Object.fromEntries(comps.map((c) => {
    const rs = middle.filter((r) => r.competition === c);
    const anyR = rs[0];
    const all = ratePlayers(db, { discipline: "bowling", competitions: [c], phase: "middle", recentSeasons: recent, minBalls: 0 });
    const legal = all.reduce((s, r) => s + r.balls, 0), conceded = all.reduce((s, r) => s + r.counts.runs_conceded, 0), wk = all.reduce((s, r) => s + r.counts.wickets, 0);
    return [c, { seasons: windowSeasons(db, c, { recentSeasons: recent }), economy: legal ? (6 * conceded) / legal : null, ballsPerWicket: wk ? legal / wk : null, qualifying: rs.length, partial: anyR ? anyR.partialSeasons : [] }];
  }));
  const groups: Record<string, Candidate[]> = { spin: [], unknown: [], pace: [], mixed: [], conflict: [] };
  for (const r of middle) {
    const b = playerAttributes(db, r.player_key).bowling;
    const m = r.metrics;
    const composite = ((m.economy.percentile ?? 0) + (m.wicket_rate.percentile ?? 0)) / 2;
    const econBetter = m.economy.ci != null && m.economy.ci[1] < 100;
    const wktBetter = m.wicket_rate.ci != null && m.wicket_rate.ci[0] > 100;
    const plateHeavy = (r.lowerDivisionShare ?? 0) >= 0.5;
    const smallOrPartial = m.economy.population < MIN_POPULATION_FOR_PRIORITY || r.partialSeasons.length > 0 || plateHeavy;
    let tier = b.type !== "spin" ? "not classified" : composite >= 75 && r.tier === "rankable" && (econBetter || wktBetter) ? "priority" : composite >= 60 ? "monitor" : "below shortlist";
    const capped = tier === "priority" && smallOrPartial;
    if (capped) tier = "monitor";
    const sw = strengthsAndWeaknesses(r);
    const parts: string[] = [];
    if (capped) {
      const why = [
        m.economy.population < MIN_POPULATION_FOR_PRIORITY ? `only ${m.economy.population} qualifying bowlers in this league window` : "",
        r.partialSeasons.length ? "partial-coverage seasons in the window" : "",
        plateHeavy ? "most balls in Plate Group matches" : "",
      ].filter(Boolean);
      parts.push(`meets the priority thresholds but is capped at monitor (${why.join("; ")})`);
    }
    if (r.lowerDivisionShare) parts.push(`${Math.round(100 * r.lowerDivisionShare)}% of middle-overs balls in Plate Group matches`);
    parts.push(`middle-overs economy ${fmtMetric("economy", m.economy.value)} vs ${fmtMetric("economy", m.economy.league)} for ${r.competition.toUpperCase()} in the same seasons (index ${f0(m.economy.index)}, 95% ${ci(m.economy.ci)})`);
    parts.push(`${r.counts.wickets} wickets in ${r.balls} legal balls (${f1(m.wicket_rate.value)} balls/wkt vs ${f1(m.wicket_rate.league)})`);
    if (econBetter) parts.push("economy significantly better than league");
    if (wktBetter) parts.push("wicket rate significantly better than league");
    if (sw.weaknesses.length) parts.push(`watch: ${sw.weaknesses.map((w) => w.split(" vs ")[0]).join(", ")}`);
    if (r.partialSeasons.length) parts.push(`window includes partial-coverage seasons ${r.partialSeasons.join(", ")}`);
    const op = (["powerplay", "death"] as const).map((p) => {
      const o = other.get(`${r.player_key}|${r.competition}|${p}`);
      return o && o.balls >= 60 ? `${p} econ idx ${f0(o.metrics.economy.index)} (${o.balls} balls)` : `${p}: <60 balls`;
    }).join("; ");
    const style = b.type === "unknown" ? "unknown" : b.type === "conflict" ? b.style ?? "" : `${b.style} [${b.source}, ${b.confidence === "exact" ? "exact" : "corroborated, unreviewed"}]`;
    groups[b.type].push({ r, type: b.type, style, composite, tier, reason: parts.join("; "), otherPhases: op, ipl: iplAppearances(db, r.player_key), status: statusLabel(db, r.player_key) });
  }
  for (const g of Object.values(groups)) g.sort((a, b) => b.composite - a.composite || b.r.balls - a.r.balls);
  return { league, groups, qualifying: middle.length };
}

// ── report ────────────────────────────────────────────────────────────────

function main() {
  const { values } = parseArgs(process.argv.slice(2));
  const db = openGlobalDb();
  const timings: { query: string; ms: number }[] = [];
  const t1 = timed(() => demoProfile(db, values.get("player") ?? "5f547c8b"));
  timings.push({ query: "1. Cross-league profile (season lines, career by league and phase, trends, similar players)", ms: t1.ms });
  const smatComplete = { smat: completeSeasons(db, "smat", 3) };
  const t2a = timed(() => demoEmerging(db, ["smat"], "batting"));
  const t2b = timed(() => demoEmerging(db, ["smat"], "bowling"));
  const t2e = timed(() => demoEmerging(db, ["smat"], "batting", { seasons: smatComplete }));
  const t2f = timed(() => demoEmerging(db, ["smat"], "bowling", { seasons: smatComplete }));
  const t2c = timed(() => demoEmerging(db, ["bbl", "sa20", "cpl", "ilt20"], "batting"));
  const t2d = timed(() => demoEmerging(db, ["bbl", "sa20", "cpl", "ilt20"], "bowling"));
  timings.push({ query: "2. Emerging talent (6 searches: SMAT latest and latest-complete windows, overseas leagues; batting and bowling)", ms: t2a.ms + t2b.ms + t2c.ms + t2d.ms + t2e.ms + t2f.ms });
  const t3 = timed(() => demoSpin(db, ["smat", "sa20", "bbl"]));
  timings.push({ query: "3. Middle-overs spin shortlist (SMAT, SA20, BBL)", ms: t3.ms });

  const L: string[] = [];
  L.push(`# Scouting demonstrations — ${today()}`, "", "Generated by `scout:demo` from global.db. Every number is a deterministic calculation; definitions in docs/global-data-engine/scout-service.md.", "");
  L.push("| Query | Time |", "|---|---:|");
  for (const t of timings) L.push(`| ${t.query} | ${(t.ms / 1000).toFixed(2)} s |`);

  // Demo 1
  const p = t1.result;
  L.push("", `## 1. Cross-league profile — ${p.player.name} (${p.player.cricsheet_id})`, "");
  L.push(`- External ids: ${p.extIds.map((e) => `${e.source} ${e.source_id}`).join(", ") || "none"}.`);
  L.push(`- Bowling style: ${styleLabel(db, p.player.player_key)}. Batting hand: ${p.attrs.battingHand ?? "unknown"}. Capped status: ${statusLabel(db, p.player.player_key)}.`, "");
  L.push("### Season by season", "", "| League | Season | Team | Coverage | Batting role | Bowling role | Bat inns | Runs | Balls | SR | SR idx | Legal balls | Wkts | Econ | Econ idx |", "|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const l of p.lines) {
    L.push(`| ${l.competition} | ${l.season} | ${l.team} | ${l.coverage} | ${l.batting_role} | ${l.bowling_role} | ${l.bat?.innings ?? 0} | ${l.bat?.runs ?? 0} | ${l.bat?.balls ?? 0} | ${f1(l.bat?.sr)} | ${f0(l.bat?.srIndex)} | ${l.bowl?.legal ?? 0} | ${l.bowl?.wickets ?? 0} | ${l.bowl?.economy != null ? l.bowl.economy.toFixed(2) : "—"} | ${f0(l.bowl?.econIndex)} |`);
  }
  L.push("", "Index: 100 = that league's average for the same balls in the same seasons; for economy, below 100 is better.", "");
  L.push("### Career by league — bowling (league-adjusted, percentile among bowlers with ≥120 legal balls in that league)", "", "| League | Phase | Legal balls | Econ | League econ | Econ idx (95%) | Econ pct | Balls/wkt | Wkt idx (95%) | Wkt pct | Dot % pct | Bnd % pct |", "|---|---|---:|---:|---:|---|---:|---:|---|---:|---:|---:|");
  for (const r of [...p.bowlAll, ...p.bowlPhases].sort((a, b) => a.competition.localeCompare(b.competition) || ["all", "powerplay", "middle", "death"].indexOf(a.phase) - ["all", "powerplay", "middle", "death"].indexOf(b.phase))) {
    const m = r.metrics;
    L.push(`| ${r.competition} | ${r.phase} | ${r.balls} | ${fmtMetric("economy", m.economy.value)} | ${fmtMetric("economy", m.economy.league)} | ${f0(m.economy.index)} (${ci(m.economy.ci)}) | ${pct(m.economy.percentile)} | ${f1(m.wicket_rate.value)} | ${f0(m.wicket_rate.index)} (${ci(m.wicket_rate.ci)}) | ${pct(m.wicket_rate.percentile)} | ${pct(m.dot_pct.percentile)} | ${pct(m.boundary_pct.percentile)} |`);
  }
  L.push("", "### Career by league — batting", "", "| League | Inns | Balls | SR | League SR | SR idx (95%) | SR pct | Balls/dismissal | Tier |", "|---|---:|---:|---:|---:|---|---:|---:|---|");
  for (const r of p.batAll) L.push(`| ${r.competition} | ${r.innings} | ${r.balls} | ${f1(r.metrics.strike_rate.value)} | ${f1(r.metrics.strike_rate.league)} | ${f0(r.metrics.strike_rate.index)} (${ci(r.metrics.strike_rate.ci)}) | ${pct(r.metrics.strike_rate.percentile)} | ${f1(r.metrics.balls_per_dismissal.value)} | ${r.tier} |`);
  L.push("", "### Trends (latest season vs earlier seasons in the same league)", "", "| League | Discipline | Latest | Verdict | Detail |", "|---|---|---|---|---|");
  for (const t of p.trends) L.push(`| ${t.competition} | ${t.discipline} | ${t.latestSeason} | ${t.verdict} | ${t.detail} |`);
  if (p.similar.player) {
    L.push("", `### Most similar ${p.similar.player.discipline === "bowling" ? "bowlers" : "batters"} (last 3 seasons, all six leagues, league-adjusted indices + phase usage)`, "", "| Player | League | Balls | Distance | Role |", "|---|---|---:|---:|---|");
    for (const s of p.similar.similar) L.push(`| ${s.name} | ${s.competition} | ${s.balls} | ${s.distance.toFixed(2)} | ${s.role.label} |`);
  }

  // Demo 2
  L.push("", "## 2. Emerging talent", "");
  L.push(`**Statistically emerging** (from data): debuted in that league within the analysis window; ≥120 balls in the window; composite of league-adjusted percentiles ≥ 70 (batters: strike rate and balls per dismissal, with strike rate ≥ 60th; bowlers: economy and wicket rate); at most ${MAX_IPL_MATCHES} IPL matches in the loaded IPL data (shown).`);
  L.push("**Officially uncapped** is a separate column: only an explicit value in the 2026 IPL auction list, through a recorded link. Absence of a record is reported as \"not established\", never as uncapped.");
  L.push("SMAT is shown twice because Cricsheet's three most recent SMAT seasons are partial (44, 39 and 8 matches): once on that latest window, once on the latest three seasons with complete coverage. IPL exposure is counted up to 2026 for both, so a historical-window result means \"emerged then, still little or no IPL by 2026\".", "");
  const em = [
    ["SMAT batters — latest window (partial coverage)", t2a.result], ["SMAT bowlers — latest window (partial coverage)", t2b.result],
    ["SMAT batters — latest complete-coverage window", t2e.result], ["SMAT bowlers — latest complete-coverage window", t2f.result],
    ["Overseas leagues (BBL, SA20, CPL, ILT20) batters", t2c.result], ["Overseas leagues bowlers", t2d.result],
  ] as const;
  for (const [title, e] of em) {
    L.push(`### ${title}`, "", `Window: ${Object.entries(e.window).map(([c, s]) => `${c} ${s.join(", ")}`).join("; ")}. ${e.considered} players with ≥120 balls; ${e.qualified} meet the criteria; top ${e.rows.length} shown.`, "");
    L.push("| Player | League | Team | Debut | Balls | Composite | Evidence | Trend | Official status | IPL apps |", "|---|---|---|---|---:|---:|---|---|---|---:|");
    for (const x of e.rows) L.push(`| ${x.r.name} | ${x.r.competition} | ${x.r.teams.join(" / ")} | ${x.debut} | ${x.r.balls} | ${f0(x.composite)} | ${x.why}${x.style ? `; style: ${x.style}` : ""}${x.r.partialSeasons.length ? `; partial-coverage seasons: ${x.r.partialSeasons.join(", ")}` : ""} | ${x.trend} | ${x.status} | ${x.ipl} |`);
    L.push("");
  }

  // Demo 3
  const s = t3.result;
  L.push("## 3. Middle-overs spin shortlist — SMAT, SA20, BBL", "");
  L.push(`Population: every bowler with ≥120 legal balls in overs 7–15 across each league's last 3 seasons. Percentiles are within that league's middle-overs population (pace and spin together). Composite = mean of the economy-index and wicket-rate-index percentiles (equal weights). **Priority**: verified spinner, rankable sample, composite ≥ 75, economy or wicket rate significantly better than league (95% interval clear of 100), at least ${MIN_POPULATION_FOR_PRIORITY} qualifying bowlers in the league window and no partial-coverage seasons — otherwise capped at monitor. **Monitor**: verified spinner, composite ≥ 60.`, "");
  L.push("| League | Seasons | Middle-overs economy (league) | Balls per wicket (league) | Qualifying bowlers | Partial seasons |", "|---|---|---:|---:|---:|---|");
  for (const [c, l] of Object.entries(s.league)) L.push(`| ${c} | ${l.seasons.join(", ")} | ${l.economy?.toFixed(2) ?? "—"} | ${f1(l.ballsPerWicket)} | ${l.qualifying} | ${l.partial.join(", ") || "none"} |`);
  L.push("", `Bowling type of the ${s.qualifying} qualifying bowlers: ${Object.entries(s.groups).map(([k, v]) => `${k} ${v.length}`).join(", ")}.`, "");
  L.push("### Verified spinners", "", "| Tier | Player | League | Style [source] | Window role | Legal balls | Econ (league) | Econ idx 95% | Econ pct | Balls/wkt | Wkt idx 95% | Wkt pct | Dot pct | Bnd pct | Composite | Other phases | Official status | IPL apps |", "|---|---|---|---|---|---:|---|---|---:|---:|---|---:|---:|---:|---:|---|---|---:|");
  for (const c of s.groups.spin) {
    const m = c.r.metrics;
    L.push(`| ${c.tier} | ${c.r.name} | ${c.r.competition} | ${c.style} | ${c.r.role.label} | ${c.r.balls} | ${fmtMetric("economy", m.economy.value)} (${fmtMetric("economy", m.economy.league)}) | ${ci(m.economy.ci)} | ${pct(m.economy.percentile)} | ${f1(m.wicket_rate.value)} | ${ci(m.wicket_rate.ci)} | ${pct(m.wicket_rate.percentile)} | ${pct(m.dot_pct.percentile)} | ${pct(m.boundary_pct.percentile)} | ${f0(c.composite)} | ${c.otherPhases} | ${c.status} | ${c.ipl} |`);
  }
  for (const tier of ["priority", "monitor"]) {
    L.push("", `#### Why the ${tier} candidates`, "");
    const list = s.groups.spin.filter((x) => x.tier === tier);
    for (const c of list) L.push(`- **${c.r.name}** (${c.r.competition}, ${c.r.teams.join(" / ")}): ${c.reason}.`);
    if (!list.length) L.push("- None.");
  }
  L.push("", "### Strong middle-overs bowlers whose bowling style is unverified (NOT classified as spinners)", "", "| Player | League | Legal balls | Econ idx 95% | Econ pct | Wkt pct | Composite | IPL apps |", "|---|---|---:|---|---:|---:|---:|---:|");
  for (const c of s.groups.unknown.slice(0, 15)) L.push(`| ${c.r.name} | ${c.r.competition} | ${c.r.balls} | ${f0(c.r.metrics.economy.index)} (${ci(c.r.metrics.economy.ci)}) | ${pct(c.r.metrics.economy.percentile)} | ${pct(c.r.metrics.wicket_rate.percentile)} | ${f0(c.composite)} | ${c.ipl} |`);
  if (s.groups.mixed.length || s.groups.conflict.length) {
    L.push("", "### Mixed or conflicting style records (excluded)", "");
    for (const c of [...s.groups.mixed, ...s.groups.conflict]) L.push(`- ${c.r.name} (${c.r.competition}): ${c.style}`);
  }

  ensureDir(REPORT_DIR);
  fs.writeFileSync(path.join(REPORT_DIR, `scout-demos-${today()}.md`), L.join("\n") + "\n");
  const json = { generatedAt: new Date().toISOString(), timings, profile: p, emerging: Object.fromEntries(em.map(([k, v]) => [k, v])), spin: s };
  fs.writeFileSync(path.join(REPORT_DIR, `scout-demos-${today()}.json`), JSON.stringify(json, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v), 1));
  for (const t of timings) console.log(`  ${(t.ms / 1000).toFixed(2)} s  ${t.query}`);
  console.log(`  → reports/scout-demos-${today()}.md`);
  db.close();
}

main();

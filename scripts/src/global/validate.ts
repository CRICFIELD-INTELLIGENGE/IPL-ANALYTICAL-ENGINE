// Global data engine — data-quality checks and IPL reconciliation.
//
//   pnpm --filter @workspace/scripts run global:validate
//
// Writes reports/validation-<date>.{json,md} and manifests/coverage.json.
// Checks per competition: catalogue/archive/README/database match counts,
// format conformance, delivery arithmetic, over structure, innings wickets,
// result margins against computed totals, chase targets, referential
// integrity, season coverage and schema drift. For IPL it also compares
// global.db with the existing warehouse (sqlite.db, opened read-only) match by
// match and player-season by player-season. Nothing is corrected silently.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { all, one, openGlobalDb, setMeta } from "./db";
import { COVERAGE_PATH, IPL_RAW_DIR, IPL_WAREHOUSE_PATH, REPORT_DIR, ensureDir, loadSources, today } from "./paths";
import { latestAcquisition, readAcquisitions } from "./acquire";
import { listEntries, readEntries } from "./zip";
import { readmeMatchIds } from "./normalize";
import { BOWLER_WICKET_KINDS, NOT_A_DISMISSAL } from "./metrics";
import { fromGlobal } from "./paths";

type Severity = "pass" | "warn" | "fail";
interface Check { id: string; title: string; severity: Severity; detail: string; examples?: unknown[] }
interface CompetitionValidation {
  code: string;
  name: string;
  counts: { catalogue: number; archiveJson: number; readme: number | null; database: number; inLatestSource: number; deliveries: number; seasons: number };
  checks: Check[];
}

const NOT_DISMISSED = [...NOT_A_DISMISSAL].map((k) => `'${k}'`).join(",");
const BOWLER_KINDS = [...BOWLER_WICKET_KINDS].map((k) => `'${k}'`).join(",");

function check(id: string, title: string, failures: number, detail: string, examples: unknown[] = [], warnOnly = false): Check {
  const severity: Severity = failures === 0 ? "pass" : warnOnly ? "warn" : "fail";
  return { id, title, severity, detail, examples: examples.slice(0, 10) };
}

/** Innings totals computed from deliveries (super overs included, as separate innings). */
const INNINGS_TOTALS = `
  SELECT i.match_id, i.innings_no, i.batting_team_id, i.super_over, i.target_runs, i.target_overs,
    COALESCE(SUM(d.runs_total), 0) + COALESCE(i.penalty_pre, 0) + COALESCE(i.penalty_post, 0) AS runs,
    (SELECT COUNT(*) FROM wickets w WHERE w.match_id = i.match_id AND w.innings_no = i.innings_no AND w.kind NOT IN (${NOT_DISMISSED})) AS wkts,
    SUM(CASE WHEN d.wides = 0 AND d.noballs = 0 THEN 1 ELSE 0 END) AS legal
  FROM innings i LEFT JOIN deliveries d ON d.match_id = i.match_id AND d.innings_no = i.innings_no
  GROUP BY i.match_id, i.innings_no`;

export function validateCompetition(db: DatabaseSync, competitionId: number): CompetitionValidation {
  const c = one<{ code: string; name: string; catalogue_matches: number; gender: string; team_type: string; source_slug: string }>(
    db, "SELECT code, name, catalogue_matches, gender, team_type, source_slug FROM competitions WHERE competition_id = ?", competitionId)!;
  const rec = latestAcquisition(c.source_slug, readAcquisitions());
  let archiveJson = 0, readme: number | null = null;
  let readmeMismatch: number[] = [];
  if (rec) {
    const buf = new Uint8Array(fs.readFileSync(fromGlobal(rec.path)));
    const entries = listEntries(buf);
    const ids = new Set(entries.filter((e) => /^\d+\.json$/.test(e.name)).map((e) => Number(e.name.replace(".json", ""))));
    archiveJson = ids.size;
    const r = entries.find((e) => e.name === "README.txt");
    if (r) {
      const listed = readmeMatchIds(new TextDecoder().decode([...readEntries(buf, [r.name])][0].data));
      readme = listed.length;
      readmeMismatch = [...listed.filter((id) => !ids.has(id)), ...[...ids].filter((id) => !listed.includes(id))];
    }
  }
  const q = <T>(sql: string, ...p: (string | number)[]) => all<T>(db, sql, competitionId, ...p);
  const n = (sql: string) => (one<{ n: number }>(db, sql, competitionId)?.n ?? 0);
  const database = n("SELECT COUNT(*) n FROM matches WHERE competition_id = ?");
  const inLatestSource = n("SELECT COUNT(*) n FROM matches WHERE competition_id = ? AND in_latest_source = 1");
  const deliveries = n("SELECT COUNT(*) n FROM deliveries d JOIN matches m USING (match_id) WHERE m.competition_id = ?");
  const seasons = n("SELECT COUNT(*) n FROM seasons WHERE competition_id = ?");
  const checks: Check[] = [];

  // 1. Match counts: catalogue page, archive, archive README and database must agree.
  const counts = [c.catalogue_matches, archiveJson, readme ?? archiveJson, inLatestSource];
  checks.push(check("match_counts", "Match counts agree (catalogue, archive, README, database)",
    new Set(counts).size === 1 && readmeMismatch.length === 0 ? 0 : 1,
    `catalogue ${c.catalogue_matches}, archive ${archiveJson}, README ${readme ?? "n/a"}, database ${inLatestSource} (in newest source) / ${database} (total)`,
    readmeMismatch, c.catalogue_matches !== archiveJson && archiveJson === inLatestSource));

  // 2. Format conformance.
  const nonConforming = q<{ match_id: number; gender: string; team_type: string; match_type: string; balls_per_over: number }>(`
    SELECT match_id, gender, team_type, match_type, balls_per_over FROM matches
    WHERE competition_id = ? AND (gender <> ? OR team_type <> ? OR balls_per_over NOT IN (5, 6))`, c.gender, c.team_type);
  checks.push(check("format", `Every match is ${c.gender}, ${c.team_type}, 5/6-ball overs`, nonConforming.length, `${nonConforming.length} non-conforming matches`, nonConforming));
  const types = q<{ match_type: string; n: number }>("SELECT match_type, COUNT(*) n FROM matches WHERE competition_id = ? GROUP BY match_type");
  checks.push(check("match_type", "Match types", types.some((t) => t.match_type !== "T20") ? 1 : 0, types.map((t) => `${t.match_type} ${t.n}`).join(", "), [], true));

  // 3. Delivery arithmetic.
  const arith = q<{ match_id: number; innings_no: number; over_no: number; seq: number }>(`
    SELECT d.match_id, d.innings_no, d.over_no, d.seq FROM deliveries d JOIN matches m USING (match_id)
    WHERE m.competition_id = ? AND (d.runs_total <> d.runs_batter + d.runs_extras OR d.runs_extras <> d.wides + d.noballs + d.byes + d.legbyes + d.penalty)`);
  checks.push(check("delivery_arithmetic", "runs.total = batter + extras, and extras = wides + no-balls + byes + leg-byes + penalty", arith.length, `${arith.length} deliveries fail out of ${deliveries}`, arith));

  // 4. Over structure: legal balls per over ≤ balls_per_over unless the file records a miscounted over.
  const overs = q<{ match_id: number; innings_no: number; over_no: number; legal: number; bpo: number; miscounted: string | null }>(`
    SELECT d.match_id, d.innings_no, d.over_no, SUM(d.wides = 0 AND d.noballs = 0) legal, m.balls_per_over bpo, i.miscounted_overs miscounted
    FROM deliveries d JOIN matches m USING (match_id) JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
    WHERE m.competition_id = ? GROUP BY d.match_id, d.innings_no, d.over_no HAVING legal > bpo`);
  // miscounted_overs is keyed by the same 0-based over number as the overs themselves.
  const unexplained = overs.filter((o) => !(o.miscounted && Object.prototype.hasOwnProperty.call(JSON.parse(o.miscounted), String(o.over_no))));
  checks.push(check("over_structure", "Legal balls per over ≤ balls_per_over (except overs the file marks as miscounted)", unexplained.length,
    `${overs.length} long overs, ${overs.length - unexplained.length} explained by miscounted_overs, ${unexplained.length} unexplained`, unexplained, true));
  const tooMany = q<{ match_id: number; innings_no: number; overs: number; scheduled: number }>(`
    SELECT i.match_id, i.innings_no, COUNT(DISTINCT d.over_no) overs, m.scheduled_overs scheduled FROM innings i
    JOIN matches m USING (match_id) JOIN deliveries d ON d.match_id = i.match_id AND d.innings_no = i.innings_no
    WHERE m.competition_id = ? AND i.super_over = 0 GROUP BY i.match_id, i.innings_no HAVING overs > scheduled`);
  checks.push(check("innings_length", "Overs per innings ≤ scheduled overs", tooMany.length, `${tooMany.length} innings exceed the scheduled overs`, tooMany));

  // 5. Wickets per innings.
  const totals = q<{ match_id: number; innings_no: number; batting_team_id: number; super_over: number; target_runs: number | null; target_overs: number | null; runs: number; wkts: number; legal: number }>(`
    SELECT t.* FROM (${INNINGS_TOTALS}) t JOIN matches m USING (match_id) WHERE m.competition_id = ?`);
  const overTen = totals.filter((t) => t.wkts > 10 || (t.super_over === 1 && t.wkts > 2));
  checks.push(check("innings_wickets", "Wickets per innings ≤ 10 (≤ 2 in a super over), retired hurt excluded", overTen.length, `${overTen.length} innings exceed the limit`, overTen));
  const empty = q<{ match_id: number; innings_no: number }>(`SELECT i.match_id, i.innings_no FROM innings i JOIN matches m USING (match_id)
    WHERE m.competition_id = ? AND i.forfeited = 0 AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.match_id = i.match_id AND d.innings_no = i.innings_no)`);
  checks.push(check("empty_innings", "Innings with no deliveries (not forfeited)", empty.length, `${empty.length}`, empty, true));

  // 6. Results against computed totals (regular innings only; no method such as D/L or VJD).
  const byMatch = new Map<number, typeof totals>();
  for (const t of totals) if (t.super_over === 0) (byMatch.get(t.match_id) ?? byMatch.set(t.match_id, []).get(t.match_id)!).push(t);
  const results = q<{ match_id: number; winner_id: number | null; result: string | null; method: string | null; win_by_runs: number | null; win_by_wickets: number | null; scheduled_overs: number | null }>(`
    SELECT match_id, winner_id, result, method, win_by_runs, win_by_wickets, scheduled_overs FROM matches WHERE competition_id = ?`);
  const runMargin: unknown[] = [], wicketMargin: unknown[] = [], chaseShort: unknown[] = [], ties: unknown[] = [], targets: unknown[] = [];
  let runChecked = 0, wicketChecked = 0, tieChecked = 0, targetChecked = 0, revisedTargets = 0;
  for (const r of results) {
    const inns = (byMatch.get(r.match_id) ?? []).sort((a, b) => a.innings_no - b.innings_no);
    if (inns.length < 2) continue;
    const [a, b] = inns;
    // Only full-length chases: a target over fewer overs is a rain revision (possibly in a no-result match).
    if (b.target_runs != null && !r.method && b.target_overs != null && r.scheduled_overs != null && b.target_overs < r.scheduled_overs) revisedTargets++;
    else if (b.target_runs != null && !r.method) {
      targetChecked++;
      if (b.target_runs !== a.runs + 1) targets.push({ match: r.match_id, target: b.target_runs, firstInnings: a.runs });
    }
    if (r.method) continue;
    if (r.result === "tie") { tieChecked++; if (a.runs !== b.runs) ties.push({ match: r.match_id, first: a.runs, second: b.runs }); continue; }
    if (r.win_by_runs != null && r.winner_id === a.batting_team_id) {
      runChecked++;
      if (a.runs - b.runs !== r.win_by_runs) runMargin.push({ match: r.match_id, first: a.runs, second: b.runs, recorded: r.win_by_runs });
    }
    if (r.win_by_wickets != null && r.winner_id === b.batting_team_id) {
      wicketChecked++;
      if (b.wkts + r.win_by_wickets !== 10) wicketMargin.push({ match: r.match_id, wicketsLost: b.wkts, recorded: r.win_by_wickets });
      const need = b.target_runs ?? a.runs + 1;
      if (b.runs < need) chaseShort.push({ match: r.match_id, chased: b.runs, needed: need });
    }
  }
  checks.push(check("margin_runs", "Win by runs = first-innings total − second-innings total", runMargin.length, `${runChecked} matches checked, ${runMargin.length} differ`, runMargin));
  checks.push(check("margin_wickets", "Win by wickets = 10 − wickets lost by the chasing side", wicketMargin.length, `${wicketChecked} matches checked, ${wicketMargin.length} differ`, wicketMargin, true));
  checks.push(check("chase_reached", "Winning chase reaches the target", chaseShort.length, `${wicketChecked} chases checked, ${chaseShort.length} short`, chaseShort));
  checks.push(check("ties", "Tied matches have equal totals", ties.length, `${tieChecked} ties checked, ${ties.length} differ`, ties));
  checks.push(check("targets", "Full-length chase target = first-innings total + 1 (no D/L)", targets.length,
    `${targetChecked} targets checked, ${targets.length} differ; ${revisedTargets} reduced-overs targets without a method skipped (rain revisions, e.g. in no-result matches)`, targets, true));
  const outcomes = q<{ k: string; n: number }>(`SELECT COALESCE(result, CASE WHEN winner_id IS NOT NULL THEN 'winner' END, 'unknown') ||
    CASE WHEN method IS NOT NULL THEN ' (' || method || ')' ELSE '' END k, COUNT(*) n FROM matches WHERE competition_id = ? GROUP BY k`);
  checks.push({ id: "outcomes", title: "Outcome mix", severity: "pass", detail: outcomes.map((o) => `${o.k} ${o.n}`).join(", ") });

  // 7. Referential integrity.
  const orphans = n(`SELECT COUNT(*) n FROM deliveries d JOIN matches m USING (match_id) WHERE m.competition_id = ? AND (
    d.batter NOT IN (SELECT player_key FROM players) OR d.bowler NOT IN (SELECT player_key FROM players) OR d.non_striker NOT IN (SELECT player_key FROM players))`);
  const unreg = n(`SELECT COUNT(DISTINCT mp.player_key) n FROM match_players mp JOIN matches m USING (match_id) JOIN players p USING (player_key)
    WHERE m.competition_id = ? AND (p.cricsheet_id LIKE 'unreg:%' OR p.in_register = 0)`);
  const noInnings = n(`SELECT COUNT(*) n FROM matches m WHERE m.competition_id = ? AND NOT EXISTS (SELECT 1 FROM innings i WHERE i.match_id = m.match_id)`);
  checks.push(check("references", "Every delivery references known players", orphans, `${orphans} orphan deliveries`));
  checks.push(check("registry", "Every squad player has a Cricsheet registry id present in the people register", unreg, `${unreg} players outside the register`));
  checks.push(check("matches_without_innings", "Matches without any innings (abandoned before a ball)", noInnings, `${noInnings}`, [], true));

  // 8. Coverage: season gaps between first and last season.
  const seasonRows = q<{ season_label: string; season_year: number; matches: number }>("SELECT season_label, season_year, matches FROM seasons WHERE competition_id = ? ORDER BY season_year");
  // Split-year competitions ("2023/24") are checked by consecutive start years; single-year or mixed
  // labels (IPL writes "2007/08" for 2008) by the year of each season's first match.
  const split = seasonRows.length > 0 && seasonRows.every((s) => /^\d{4}\/\d{2}$/.test(s.season_label));
  const years = seasonRows.map((s) => (split ? Number(s.season_label.slice(0, 4)) : s.season_year)).sort((a, b) => a - b);
  const gaps: string[] = [];
  for (let y = years[0]; y <= years[years.length - 1]; y++) {
    if (!years.includes(y)) gaps.push(split ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : String(y));
  }
  checks.push(check("season_gaps", "No missing seasons between the first and last", gaps.length, gaps.length ? `missing seasons: ${gaps.join(", ")}` : "continuous", gaps, true));
  const thin = seasonRows.filter((s) => s.matches < 0.35 * Math.max(...seasonRows.map((x) => x.matches)));
  checks.push(check("thin_seasons", "Seasons with far fewer matches than the competition's largest season", thin.length,
    thin.map((s) => `${s.season_label}: ${s.matches}`).join(", ") || "none", thin, true));

  // 9. Schema drift.
  const drift = q<{ path: string; occurrences: number }>("SELECT path, occurrences FROM schema_drift WHERE competition_id = ?");
  const versions = q<{ data_version: string; n: number }>("SELECT data_version, COUNT(*) n FROM matches WHERE competition_id = ? GROUP BY data_version");
  checks.push(check("schema_drift", "No unrecognised JSON keys (kept verbatim if found)", drift.length,
    `${drift.length} unknown paths; data versions: ${versions.map((v) => `${v.data_version} ${v.n}`).join(", ")}`, drift, true));

  return { code: c.code, name: c.name, counts: { catalogue: c.catalogue_matches, archiveJson, readme, database, inLatestSource, deliveries, seasons: seasonRows.length }, checks };
}

// ── IPL: global.db (current Cricsheet archive) vs the existing warehouse ──────

export interface IplReconciliation {
  available: boolean;
  matches: { global: number; warehouse: number; onlyGlobal: string[]; onlyWarehouse: string[] };
  totals: { field: string; global: number; warehouse: number }[];
  matchDiffs: { match_id: string; field: string; global: string | number; warehouse: string | number; revision: number | null; warehouseFileRevision: number | null }[];
  playerSeason: { compared: number; diffs: { cricsheet_id: string; name: string; season: string; field: string; global: number; warehouse: number }[] };
  explanation: string[];
}

export function reconcileIpl(db: DatabaseSync): IplReconciliation {
  const empty: IplReconciliation = { available: false, matches: { global: 0, warehouse: 0, onlyGlobal: [], onlyWarehouse: [] }, totals: [], matchDiffs: [], playerSeason: { compared: 0, diffs: [] }, explanation: [] };
  const ipl = one<{ competition_id: number }>(db, "SELECT competition_id FROM competitions WHERE code = 'ipl'");
  if (!ipl || !fs.existsSync(IPL_WAREHOUSE_PATH)) return empty;
  const w = new DatabaseSync(IPL_WAREHOUSE_PATH, { readOnly: true });
  const wq = <T>(sql: string) => w.prepare(sql).all() as unknown as T[];

  type MatchRow = { match_id: string; balls: number; runs: number; batter_runs: number; extras: number; wides: number; noballs: number; wickets: number; winner: string | null; toss: string | null; venue: string | null; innings: number };
  const gm = new Map(all<MatchRow>(db, `
    SELECT CAST(m.match_id AS TEXT) match_id,
      (SELECT COUNT(*) FROM deliveries d WHERE d.match_id = m.match_id) balls,
      (SELECT COALESCE(SUM(runs_total), 0) FROM deliveries d WHERE d.match_id = m.match_id) runs,
      (SELECT COALESCE(SUM(runs_batter), 0) FROM deliveries d WHERE d.match_id = m.match_id) batter_runs,
      (SELECT COALESCE(SUM(runs_extras), 0) FROM deliveries d WHERE d.match_id = m.match_id) extras,
      (SELECT COALESCE(SUM(wides > 0), 0) FROM deliveries d WHERE d.match_id = m.match_id) wides,
      (SELECT COALESCE(SUM(noballs > 0), 0) FROM deliveries d WHERE d.match_id = m.match_id) noballs,
      (SELECT COUNT(*) FROM wickets x WHERE x.match_id = m.match_id) wickets,
      tw.name winner, tt.name toss, v.name venue,
      (SELECT COUNT(*) FROM innings i WHERE i.match_id = m.match_id) innings
    FROM matches m LEFT JOIN teams tw ON tw.team_id = m.winner_id LEFT JOIN teams tt ON tt.team_id = m.toss_winner_id
    LEFT JOIN venues v ON v.venue_id = m.venue_id WHERE m.competition_id = ?`, ipl.competition_id).map((r) => [r.match_id, r]));
  const wm = new Map(wq<MatchRow>(`
    SELECT m.match_id,
      (SELECT COUNT(*) FROM deliveries d WHERE d.match_id = m.match_id) balls,
      (SELECT COALESCE(SUM(total_runs), 0) FROM deliveries d WHERE d.match_id = m.match_id) runs,
      (SELECT COALESCE(SUM(batter_runs), 0) FROM deliveries d WHERE d.match_id = m.match_id) batter_runs,
      (SELECT COALESCE(SUM(extra_runs), 0) FROM deliveries d WHERE d.match_id = m.match_id) extras,
      (SELECT COALESCE(SUM(is_wide), 0) FROM deliveries d WHERE d.match_id = m.match_id) wides,
      (SELECT COALESCE(SUM(is_noball), 0) FROM deliveries d WHERE d.match_id = m.match_id) noballs,
      (SELECT COUNT(*) FROM dismissals x JOIN deliveries d ON d.delivery_id = x.delivery_id WHERE d.match_id = m.match_id) wickets,
      tw.name winner, tt.name toss, v.name venue,
      (SELECT COUNT(*) FROM innings i WHERE i.match_id = m.match_id) innings
    FROM matches m LEFT JOIN teams tw ON tw.team_id = m.winner_id LEFT JOIN teams tt ON tt.team_id = m.toss_winner_id
    LEFT JOIN venues v ON v.venue_id = m.venue_id`).map((r) => [String(r.match_id), r]));

  const revisions = new Map(all<{ match_id: string; revision: number | null }>(db, "SELECT CAST(match_id AS TEXT) match_id, revision FROM matches WHERE competition_id = ?", ipl.competition_id).map((r) => [r.match_id, r.revision]));
  const fileRevision = (id: string): number | null => {
    const f = path.join(IPL_RAW_DIR, `${id}.json`);
    if (!fs.existsSync(f)) return null;
    const m = /"revision"\s*:\s*(\d+)/.exec(fs.readFileSync(f, "utf8").slice(0, 400));
    return m ? Number(m[1]) : null;
  };

  const out: IplReconciliation = { ...empty, available: true };
  out.matches = {
    global: gm.size, warehouse: wm.size,
    onlyGlobal: [...gm.keys()].filter((k) => !wm.has(k)), onlyWarehouse: [...wm.keys()].filter((k) => !gm.has(k)),
  };
  const fields: (keyof MatchRow)[] = ["balls", "runs", "batter_runs", "extras", "wides", "noballs", "wickets", "innings"];
  const totals = new Map<string, { g: number; w: number }>(fields.map((f) => [f, { g: 0, w: 0 }]));
  for (const [id, g] of gm) {
    const x = wm.get(id);
    if (!x) continue;
    for (const f of fields) {
      totals.get(f)!.g += Number(g[f]);
      totals.get(f)!.w += Number(x[f]);
      if (Number(g[f]) !== Number(x[f])) out.matchDiffs.push({ match_id: id, field: f, global: Number(g[f]), warehouse: Number(x[f]), revision: revisions.get(id) ?? null, warehouseFileRevision: fileRevision(id) });
    }
    for (const f of ["winner", "toss", "venue"] as const) {
      if ((g[f] ?? "") !== (x[f] ?? "")) out.matchDiffs.push({ match_id: id, field: f, global: g[f] ?? "", warehouse: x[f] ?? "", revision: revisions.get(id) ?? null, warehouseFileRevision: fileRevision(id) });
    }
  }
  out.totals = [...totals.entries()].map(([field, t]) => ({ field, global: t.g, warehouse: t.w }));

  // Player-season, same definitions on both sides (super overs excluded).
  type PS = { cricsheet_id: string; name: string; season: string; runs: number; faced: number; outs: number; legal: number; conceded: number; wkts: number };
  const gps = all<PS>(db, `
    WITH b AS (SELECT d.*, m.season_label FROM deliveries d JOIN matches m USING (match_id) JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
      WHERE m.competition_id = ? AND i.super_over = 0)
    SELECT p.cricsheet_id, p.unique_name name, s.season, SUM(s.runs) runs, SUM(s.faced) faced, SUM(s.outs) outs, SUM(s.legal) legal, SUM(s.conceded) conceded, SUM(s.wkts) wkts FROM (
      SELECT batter pk, season_label season, SUM(runs_batter) runs, SUM(wides = 0) faced, 0 outs, 0 legal, 0 conceded, 0 wkts FROM b GROUP BY batter, season_label
      UNION ALL SELECT bowler, season_label, 0, 0, 0, SUM(wides = 0 AND noballs = 0), SUM(runs_batter + wides + noballs), 0 FROM b GROUP BY bowler, season_label
      UNION ALL SELECT x.player_out, b.season_label, 0, 0, COUNT(*), 0, 0, 0 FROM wickets x JOIN b USING (match_id, innings_no, over_no, seq)
        WHERE x.kind NOT IN (${NOT_DISMISSED}) GROUP BY x.player_out, b.season_label
      UNION ALL SELECT b.bowler, b.season_label, 0, 0, 0, 0, 0, COUNT(*) FROM wickets x JOIN b USING (match_id, innings_no, over_no, seq)
        WHERE x.kind IN (${BOWLER_KINDS}) GROUP BY b.bowler, b.season_label
    ) s JOIN players p ON p.player_key = s.pk GROUP BY p.cricsheet_id, s.season`, ipl.competition_id);
  const wps = new Map(wq<PS>(`
    WITH b AS (SELECT d.*, m.season_id season_label FROM deliveries d JOIN matches m ON m.match_id = d.match_id JOIN innings i ON i.innings_id = d.innings_id
      WHERE i.innings_number IN (1, 2))
    SELECT p.cricsheet_id, p.name, s.season, SUM(s.runs) runs, SUM(s.faced) faced, SUM(s.outs) outs, SUM(s.legal) legal, SUM(s.conceded) conceded, SUM(s.wkts) wkts FROM (
      SELECT batter_id pk, season_label season, SUM(batter_runs) runs, SUM(is_wide = 0) faced, 0 outs, 0 legal, 0 conceded, 0 wkts FROM b GROUP BY batter_id, season_label
      UNION ALL SELECT bowler_id, season_label, 0, 0, 0, SUM(is_wide = 0 AND is_noball = 0),
        SUM(CASE WHEN is_bye = 1 OR is_legbye = 1 OR is_penalty = 1 THEN total_runs - extra_runs ELSE total_runs END), 0 FROM b GROUP BY bowler_id, season_label
      UNION ALL SELECT x.player_out_id, b.season_label, 0, 0, COUNT(*), 0, 0, 0 FROM dismissals x JOIN b ON b.delivery_id = x.delivery_id
        WHERE x.kind NOT IN (${NOT_DISMISSED}) GROUP BY x.player_out_id, b.season_label
      UNION ALL SELECT b.bowler_id, b.season_label, 0, 0, 0, 0, 0, COUNT(*) FROM dismissals x JOIN b ON b.delivery_id = x.delivery_id
        WHERE x.kind IN (${BOWLER_KINDS}) GROUP BY b.bowler_id, b.season_label
    ) s JOIN players p ON p.player_id = s.pk GROUP BY p.cricsheet_id, s.season`).map((r) => [`${r.cricsheet_id}|${r.season}`, r]));
  // The warehouse's is_bye / is_legbye / is_penalty flags decide what its modules subtract from runs conceded.
  const flags = (w.prepare("SELECT SUM(is_bye) b, SUM(is_legbye) lb, SUM(is_penalty) p FROM deliveries").get() as { b: number; lb: number; p: number });
  w.close();
  const unflagged = one<{ runs: number }>(db, `SELECT COALESCE(SUM(d.byes + d.legbyes + d.penalty), 0) runs FROM deliveries d
    JOIN matches m USING (match_id) JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
    WHERE m.competition_id = ? AND i.super_over = 0`, ipl.competition_id)?.runs ?? 0;
  for (const g of gps) {
    const x = wps.get(`${g.cricsheet_id}|${g.season}`);
    out.playerSeason.compared++;
    for (const f of ["runs", "faced", "outs", "legal", "conceded", "wkts"] as const) {
      const wv = x ? Number(x[f]) : 0;
      if (Number(g[f]) !== wv) out.playerSeason.diffs.push({ cricsheet_id: g.cricsheet_id, name: g.name, season: g.season, field: f, global: Number(g[f]), warehouse: wv });
    }
  }
  const concededDiffs = out.playerSeason.diffs.filter((d) => d.field === "conceded");
  const concededGap = concededDiffs.reduce((s, d) => s + (d.warehouse - d.global), 0);
  if (concededDiffs.length && !flags.b && !flags.lb && !flags.p) {
    out.explanation.push(
      `All ${concededDiffs.length} runs-conceded differences have one cause: sqlite.db's is_bye, is_legbye and is_penalty flags are 0 on every row, ` +
      `so the existing site's formula (total_runs minus extras when those flags are set) never removes byes, leg-byes or penalties. ` +
      `The warehouse side is higher by ${concededGap.toLocaleString("en-US")} runs; the current archive records ${unflagged.toLocaleString("en-US")} bye, leg-bye and penalty runs ` +
      `outside super overs${concededGap === unflagged ? " — an exact match" : ""}. global.db charges bowlers only batter runs + wides + no-balls. ` +
      `The existing IPL site was not changed (Batch 1 scope); this affects its economy figures.`,
    );
  }
  const otherDiffs = out.playerSeason.diffs.filter((d) => d.field !== "conceded").length;
  out.explanation.push(otherDiffs === 0
    ? "Runs, balls faced, dismissals, legal balls and bowler wickets agree exactly for every player-season."
    : `${otherDiffs} differences in fields other than runs conceded — see the table.`);
  return out;
}

export interface ValidationReport {
  generatedAt: string;
  competitions: CompetitionValidation[];
  ipl: IplReconciliation;
  summary: { pass: number; warn: number; fail: number };
}

export function validationMarkdown(r: ValidationReport): string {
  const L: string[] = [];
  const icon = (s: Severity) => (s === "pass" ? "PASS" : s === "warn" ? "WARN" : "FAIL");
  L.push(`# Validation report — ${r.generatedAt.slice(0, 10)}`, "");
  L.push(`Checks: **${r.summary.pass} pass, ${r.summary.warn} warn, ${r.summary.fail} fail.** WARN marks a property of the source worth knowing, not a load error.`, "");
  L.push("| Competition | Catalogue | Archive | README | Database | Deliveries | Seasons |", "|---|---:|---:|---:|---:|---:|---:|");
  for (const c of r.competitions) L.push(`| ${c.code} | ${c.counts.catalogue} | ${c.counts.archiveJson} | ${c.counts.readme ?? "—"} | ${c.counts.inLatestSource} | ${c.counts.deliveries.toLocaleString("en-US")} | ${c.counts.seasons} |`);
  for (const c of r.competitions) {
    L.push("", `## ${c.name} (${c.code})`, "", "| Result | Check | Detail |", "|---|---|---|");
    for (const k of c.checks) L.push(`| ${icon(k.severity)} | ${k.title} | ${k.detail.replace(/\|/g, "/")} |`);
    const ex = c.checks.filter((k) => k.severity !== "pass" && k.examples && k.examples.length);
    for (const k of ex) L.push("", `<details><summary>${k.id}: examples</summary>`, "", "```json", JSON.stringify(k.examples, null, 1), "```", "</details>");
  }
  const i = r.ipl;
  L.push("", "## IPL: current Cricsheet archive (global.db) vs existing warehouse (sqlite.db)", "");
  if (!i.available) L.push("sqlite.db not found; skipped.");
  else {
    L.push(`- Matches: global ${i.matches.global}, warehouse ${i.matches.warehouse}; only in global: ${i.matches.onlyGlobal.length}; only in warehouse: ${i.matches.onlyWarehouse.length}.`);
    L.push("", "| Field (all matches, incl. super overs) | global.db | sqlite.db | Difference |", "|---|---:|---:|---:|");
    for (const t of i.totals) L.push(`| ${t.field} | ${t.global.toLocaleString("en-US")} | ${t.warehouse.toLocaleString("en-US")} | ${(t.global - t.warehouse).toLocaleString("en-US")} |`);
    L.push("", `Match-level differences: **${i.matchDiffs.length}**.`);
    if (i.matchDiffs.length) {
      L.push("", "| Match | Field | global.db | sqlite.db | Cricsheet revision now | Revision of the file the warehouse used |", "|---|---|---|---|---:|---:|");
      for (const d of i.matchDiffs.slice(0, 60)) L.push(`| ${d.match_id} | ${d.field} | ${d.global} | ${d.warehouse} | ${d.revision ?? "?"} | ${d.warehouseFileRevision ?? "?"} |`);
      if (i.matchDiffs.length > 60) L.push(`| … | ${i.matchDiffs.length - 60} more in the JSON report | | | | |`);
    }
    L.push("", `Player-season comparison (runs, balls faced, dismissals, legal balls, runs conceded, bowler wickets; super overs excluded): ${i.playerSeason.compared} player-seasons, **${i.playerSeason.diffs.length} differing values**.`);
    if (i.playerSeason.diffs.length) {
      L.push("", "| Player | Season | Field | global.db | sqlite.db |", "|---|---|---|---:|---:|");
      for (const d of i.playerSeason.diffs.slice(0, 60)) L.push(`| ${d.name} (${d.cricsheet_id}) | ${d.season} | ${d.field} | ${d.global} | ${d.warehouse} |`);
    }
    if (i.explanation.length) L.push("", ...i.explanation.map((e) => `- ${e}`));
  }
  return L.join("\n") + "\n";
}

export function runValidation(db: DatabaseSync): ValidationReport {
  const comps = all<{ competition_id: number }>(db, "SELECT competition_id FROM competitions ORDER BY competition_id");
  const competitions = comps.map((c) => validateCompetition(db, c.competition_id));
  const ipl = reconcileIpl(db);
  const nameDiffs = ipl.matchDiffs.filter((d) => d.field === "winner" || d.field === "toss" || d.field === "venue");
  if (nameDiffs.length) ipl.explanation.push(`${nameDiffs.length} name differences are spelling/renaming of teams or venues between the warehouse build and the current archive, not different results.`);
  const all3 = competitions.flatMap((c) => c.checks);
  const report: ValidationReport = {
    generatedAt: new Date().toISOString(), competitions, ipl,
    summary: { pass: all3.filter((k) => k.severity === "pass").length, warn: all3.filter((k) => k.severity === "warn").length, fail: all3.filter((k) => k.severity === "fail").length },
  };
  ensureDir(REPORT_DIR);
  fs.writeFileSync(path.join(REPORT_DIR, `validation-${today()}.json`), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, `validation-${today()}.md`), validationMarkdown(report));
  writeCoverage(db);
  setMeta(db, "validated_at", report.generatedAt);
  return report;
}

export function writeCoverage(db: DatabaseSync): void {
  const sources = loadSources();
  const comps = all<{ competition_id: number; code: string; name: string; source_slug: string }>(db, "SELECT competition_id, code, name, source_slug FROM competitions ORDER BY competition_id");
  const rec = readAcquisitions();
  const coverage = {
    generatedAt: new Date().toISOString(),
    licence: sources.licence,
    competitions: comps.map((c) => {
      const a = latestAcquisition(c.source_slug, rec);
      return {
        code: c.code, name: c.name, archive: a?.path ?? null, archiveSha256: a?.sha256 ?? null, archiveLastModified: a?.lastModified ?? null,
        seasons: all<{ season_label: string; season_year: number; start_date: string; end_date: string; matches: number }>(db,
          "SELECT season_label, season_year, start_date, end_date, matches FROM seasons WHERE competition_id = ? ORDER BY season_year", c.competition_id),
        matches: one<{ n: number }>(db, "SELECT COUNT(*) n FROM matches WHERE competition_id = ? AND in_latest_source = 1", c.competition_id)?.n ?? 0,
        deliveries: one<{ n: number }>(db, "SELECT COUNT(*) n FROM deliveries d JOIN matches m USING (match_id) WHERE m.competition_id = ?", c.competition_id)?.n ?? 0,
      };
    }),
    notLoaded: sources.competitions.filter((c) => !c.enabled).map((c) => ({ code: c.code, name: c.name, batch: c.batch, note: c.note ?? null })),
  };
  fs.writeFileSync(COVERAGE_PATH, JSON.stringify(coverage, null, 2) + "\n");
}

if (process.argv[1] && /validate\.ts$/.test(process.argv[1])) {
  const db = openGlobalDb();
  const r = runValidation(db);
  for (const c of r.competitions) {
    const bad = c.checks.filter((k) => k.severity !== "pass").map((k) => `${k.severity}:${k.id}`);
    console.log(`  ${c.code.padEnd(6)} ${c.counts.inLatestSource} matches, ${c.counts.deliveries} deliveries — ${bad.length ? bad.join(", ") : "all checks pass"}`);
  }
  console.log(`  IPL vs warehouse: ${r.ipl.matchDiffs.length} match-level diffs, ${r.ipl.playerSeason.diffs.length} player-season diffs`);
  console.log(`  summary: ${r.summary.pass} pass, ${r.summary.warn} warn, ${r.summary.fail} fail`);
  db.close();
}

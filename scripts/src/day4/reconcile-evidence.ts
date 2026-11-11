// Day 4 — read-only reconciliation of the IPL warehouse (sqlite.db) against the raw Cricsheet JSON.
//
//   tsx src/day4/reconcile-evidence.ts [--db <path>] [--json out.json] [--out report.md]
//
// Opens the database read-only (never writes, never checkpoints). Ground truth is lib/cricket-data/raw/*.json:
// each delivery's runs.batter and extras {wides, noballs, byes, legbyes, penalty} and its wickets[].kind.
// Warehouse deliveries are matched by (match, innings number, over, delivery position within the over), which
// is exact since the 2026-10-11 sequencing repair (delivery_seq == position).
//
// Definitions used as truth (Laws of Cricket; Cricsheet conventions):
//   - runs conceded by the bowler = runs off the bat + wides + no-ball extras (not byes, leg-byes, penalty);
//   - bowler wicket = a dismissal whose kind is not run out / retired hurt / retired out / retired not out /
//     obstructing the field / handled the ball / timed out;
//   - innings wicket (fall of wicket) = any dismissal except retired hurt / retired not out.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { IPL_RAW_DIR, REPO, parseArgs } from "../global/paths";

export const NOT_BOWLER_WICKET = new Set(["run out", "retired hurt", "retired out", "retired not out", "obstructing the field", "handled the ball", "timed out"]);
export const NOT_A_WICKET = new Set(["retired hurt", "retired not out"]);

type Extras = { wides?: number; noballs?: number; byes?: number; legbyes?: number; penalty?: number };
type RawDelivery = { batter: string; bowler: string; runs: { batter: number; extras: number; total: number }; extras?: Extras; wickets?: { kind: string; player_out: string }[] };
type RawMatch = { info: { dates: string[]; season: string | number }; innings: { team: string; overs?: { over: number; deliveries: RawDelivery[] }[] }[] };

export interface TruthBall {
  key: string; match: string; date: string; inn: number; over: number; ball: number;
  batter: string; bowler: string; bat: number; extras: Required<Extras>; total: number; kinds: string[]; out: string[];
}

export function loadTruth(rawDir = IPL_RAW_DIR): Map<string, TruthBall> {
  const out = new Map<string, TruthBall>();
  for (const f of fs.readdirSync(rawDir).filter((x) => x.endsWith(".json")).sort()) {
    const match = f.replace(/\.json$/, "");
    const m = JSON.parse(fs.readFileSync(path.join(rawDir, f), "utf8")) as RawMatch;
    m.innings.forEach((inn, i) => {
      for (const o of inn.overs ?? []) o.deliveries.forEach((d, j) => {
        const e = d.extras ?? {};
        const key = `${match}:${i + 1}:${o.over}:${j + 1}`;
        out.set(key, {
          key, match, date: m.info.dates[0], inn: i + 1, over: o.over, ball: j + 1, batter: d.batter, bowler: d.bowler,
          bat: d.runs.batter, total: d.runs.total,
          extras: { wides: e.wides ?? 0, noballs: e.noballs ?? 0, byes: e.byes ?? 0, legbyes: e.legbyes ?? 0, penalty: e.penalty ?? 0 },
          kinds: (d.wickets ?? []).map((w) => w.kind), out: (d.wickets ?? []).map((w) => w.player_out),
        });
      });
    });
  }
  return out;
}

export const conceded = (t: TruthBall) => t.bat + t.extras.wides + t.extras.noballs;

/** The API's runs-conceded expression BEFORE Day 4.5 (batter + wide extras + 1 per no-ball), kept as the historical residual measure. */
export const liveConceded = (r: { batter_runs: number; extra_runs: number; is_wide: number; is_noball: number }) =>
  r.batter_runs + (r.is_wide ? r.extra_runs : 0) + (r.is_noball ? 1 : 0);
/** scripts/src/compute_analytics.ts's expression BEFORE Day 4 (player_*_stats tables as built until 2026-10-14). */
export const precomputedConceded = (r: { batter_runs: number; extra_runs: number; is_wide: number; is_noball: number }) =>
  r.batter_runs + (r.is_wide || r.is_noball ? r.extra_runs : 0);

/** RUNS_CONCEDED_SQL since Day 4.5 (services/decision/db.ts), evaluated per row; needs the extras-type flags. */
export const exactConceded = (r: { batter_runs: number; extra_runs: number; is_wide: number; is_noball: number; is_bye: number; is_legbye: number; is_penalty: number }) =>
  r.batter_runs + (r.is_wide ? r.extra_runs - 5 * r.is_penalty : r.is_noball ? (r.is_bye || r.is_legbye ? 1 : r.extra_runs - 5 * r.is_penalty) : 0);

export function reconcile(dbPath: string, truth: Map<string, TruthBall>) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const q = <T>(s: string, ...a: (string | number)[]) => db.prepare(s).all(...a) as T[];
  try {
    type Row = { delivery_id: number; match_id: string; innings_id: number; inn: number; over_num: number; ball_num: number; bowler_id: number;
      bowler: string; batter: string; batter_runs: number; extra_runs: number; total_runs: number; is_wide: number; is_noball: number; is_bye: number; is_legbye: number; is_penalty: number; kinds: string | null };
    const rows = q<Row>(`SELECT d.delivery_id, d.match_id, d.innings_id, i.innings_number inn, d.over_num, d.ball_num, d.bowler_id,
        pb.name bowler, pt.name batter, d.batter_runs, d.extra_runs, d.total_runs, d.is_wide, d.is_noball, d.is_bye, d.is_legbye, d.is_penalty,
        (SELECT group_concat(x.kind, '|') FROM dismissals x WHERE x.delivery_id = d.delivery_id) kinds
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
      LEFT JOIN players pb ON pb.player_id = d.bowler_id LEFT JOIN players pt ON pt.player_id = d.batter_id`);

    const unmatched: string[] = [];
    const residual: (TruthBall & { delivery_id: number; stored: Pick<Row, "batter_runs" | "extra_runs" | "is_wide" | "is_noball">; live: number; precomputed: number; truth: number; cause: string })[] = [];
    const penaltyBalls: (TruthBall & { delivery_id: number; innings_id: number; bowler_id: number })[] = [];
    const spellTruth = new Map<string, { wickets: number; runs: number }>();
    const inningsTruth = new Map<number, { runs: number; wickets: number; retiredHurt: string[] }>();
    const wicketEvidence: { kind: string; delivery_id: number; innings_id: number; bowler_id: number; t: TruthBall }[] = [];
    let liveTotal = 0, preTotal = 0, truthTotal = 0, exactTotal = 0, exactMismatches = 0;

    for (const r of rows) {
      const t = truth.get(`${r.match_id}:${r.inn}:${r.over_num}:${r.ball_num}`);
      if (!t) { unmatched.push(`${r.delivery_id} ${r.match_id}:${r.inn}:${r.over_num}.${r.ball_num}`); continue; }
      const c = conceded(t), live = liveConceded(r), pre = precomputedConceded(r);
      liveTotal += live; preTotal += pre; truthTotal += c;
      const ex = exactConceded(r); exactTotal += ex; if (ex !== c) exactMismatches++;
      if (live !== c || pre !== c) {
        const e = t.extras;
        const cause = e.penalty ? "penalty runs on the delivery"
          : r.is_noball && (e.byes || e.legbyes) ? "byes/leg-byes run off a no-ball"
          : r.is_noball && e.noballs !== 1 ? `no-ball extra of ${e.noballs}`
          : r.is_wide !== (e.wides > 0 ? 1 : 0) || r.is_noball !== (e.noballs > 0 ? 1 : 0) ? "wide/no-ball flag differs from source"
          : "other";
        residual.push({ ...t, delivery_id: r.delivery_id, stored: { batter_runs: r.batter_runs, extra_runs: r.extra_runs, is_wide: r.is_wide, is_noball: r.is_noball }, live, precomputed: pre, truth: c, cause });
      }
      if (t.extras.penalty) penaltyBalls.push({ ...t, delivery_id: r.delivery_id, innings_id: r.innings_id, bowler_id: r.bowler_id });

      const sk = `${r.innings_id}:${r.bowler_id}`;
      const s = spellTruth.get(sk) ?? { wickets: 0, runs: 0 };
      s.runs += c;
      for (const k of t.kinds) {
        if (!NOT_BOWLER_WICKET.has(k)) s.wickets += 1;
        if (["retired out", "retired hurt", "retired not out"].includes(k)) wicketEvidence.push({ kind: k, delivery_id: r.delivery_id, innings_id: r.innings_id, bowler_id: r.bowler_id, t });
      }
      spellTruth.set(sk, s);

      const it = inningsTruth.get(r.innings_id) ?? { runs: 0, wickets: 0, retiredHurt: [] };
      it.runs += t.total;
      for (const [i, k] of t.kinds.entries()) { if (!NOT_A_WICKET.has(k)) it.wickets += 1; else it.retiredHurt.push(`${t.out[i]} (${t.over}.${t.ball})`); }
      inningsTruth.set(r.innings_id, it);
    }

    const spells = q<{ spell_id: number; match_id: string; innings_id: number; bowler_id: number; name: string; wickets: number; runs_conceded: number }>(
      `SELECT s.spell_id, s.match_id, s.innings_id, s.bowler_id, p.name, s.wickets, s.runs_conceded FROM fact_bowling_spells s LEFT JOIN players p ON p.player_id = s.bowler_id`);
    const spellDiffs = spells.map((s) => ({ ...s, truth: spellTruth.get(`${s.innings_id}:${s.bowler_id}`) ?? { wickets: 0, runs: 0 } }))
      .filter((s) => s.wickets !== s.truth.wickets || s.runs_conceded !== s.truth.runs);

    const innings = q<{ innings_id: number; match_id: string; innings_number: number; runs: number; wickets: number; team: string }>(
      `SELECT i.innings_id, i.match_id, i.innings_number, i.runs, i.wickets, t.name team FROM innings i LEFT JOIN teams t ON t.team_id = i.batting_team_id`);
    const inningsDiffs = innings.map((i) => ({ ...i, truth: inningsTruth.get(i.innings_id) ?? { runs: 0, wickets: 0, retiredHurt: [] } }))
      .filter((i) => i.runs !== i.truth.runs || i.wickets !== i.truth.wickets);

    // Derived table built by compute_analytics.ts: player_phase_stats.bowling_runs per (bowler, phase), every innings,
    // phase by over number exactly as that script defines it. Compared with the source truth.
    const phaseOf = (o: number) => (o < 6 ? "powerplay" : o >= 15 ? "death" : "middle");
    const phaseTruth = new Map<string, number>();
    for (const r of rows) {
      const t = truth.get(`${r.match_id}:${r.inn}:${r.over_num}:${r.ball_num}`);
      if (!t) continue;
      const k = `${r.bowler_id}:${phaseOf(r.over_num)}`;
      phaseTruth.set(k, (phaseTruth.get(k) ?? 0) + conceded(t));
    }
    const phaseRows = q<{ player_id: number; name: string; phase: string; bowling_runs: number | null; bowling_balls: number | null; bowling_economy: number | null }>(
      `SELECT s.player_id, p.name, s.phase, s.bowling_runs, s.bowling_balls, s.bowling_economy FROM player_phase_stats s LEFT JOIN players p ON p.player_id = s.player_id`);
    const phaseDiffs = phaseRows.filter((r) => phaseTruth.has(`${r.player_id}:${r.phase}`) && (r.bowling_runs ?? 0) !== phaseTruth.get(`${r.player_id}:${r.phase}`))
      .map((r) => ({ ...r, truth: phaseTruth.get(`${r.player_id}:${r.phase}`)! }));

    // fact_batting_innings: per (innings, batter) runs, balls faced (wides excluded) and dismissal, from the source.
    // A batter is out when any dismissal of theirs in the innings is not retired hurt / retired not out, whether
    // they were on strike or not (run outs and retirements can happen at the non-striker end).
    // Written name → warehouse player_id through the Cricsheet registry (players.cricsheet_id), so batters who
    // never faced a ball are resolved too.
    const idByReg = new Map(q<{ player_id: number; cricsheet_id: string }>("SELECT player_id, cricsheet_id FROM players WHERE cricsheet_id IS NOT NULL").map((p) => [p.cricsheet_id, p.player_id]));
    const regCache = new Map<string, Record<string, string>>();
    const nameToId = { get(k: string) {
      const i = k.indexOf(":"); const match = k.slice(0, i), name = k.slice(i + 1);
      if (!regCache.has(match)) regCache.set(match, JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, `${match}.json`), "utf8")).info.registry.people);
      const reg = regCache.get(match)![name];
      return reg ? idByReg.get(reg) : undefined;
    } };
    const batTruth = new Map<string, { runs: number; balls: number; out: number; name: string }>();
    for (const r of rows) {
      const t = truth.get(`${r.match_id}:${r.inn}:${r.over_num}:${r.ball_num}`);
      if (!t) continue;
      const k = `${r.innings_id}:${nameToId.get(`${r.match_id}:${t.batter}`)}`;
      const b = batTruth.get(k) ?? { runs: 0, balls: 0, out: 0, name: t.batter };
      b.runs += t.bat; if (!t.extras.wides) b.balls += 1;
      batTruth.set(k, b);
      t.kinds.forEach((kind, i) => {
        const id = nameToId.get(`${r.match_id}:${t.out[i]}`);
        const ko = `${r.innings_id}:${id}`;
        const o = batTruth.get(ko) ?? { runs: 0, balls: 0, out: 0, name: t.out[i] };
        if (!NOT_A_WICKET.has(kind)) o.out = 1;
        batTruth.set(ko, o);
      });
    }
    const batRows = q<{ batting_id: number; match_id: string; innings_id: number; striker_id: number; runs: number; balls_faced: number; was_dismissed: number }>(
      `SELECT batting_id, match_id, innings_id, striker_id, runs, balls_faced, was_dismissed FROM fact_batting_innings`);
    const seenBat = new Set(batRows.map((b) => `${b.innings_id}:${b.striker_id}`));
    const battingDiffs = batRows.map((b) => ({ ...b, truth: batTruth.get(`${b.innings_id}:${b.striker_id}`) }))
      .filter((b) => !b.truth || b.truth.runs !== b.runs || b.truth.balls !== b.balls_faced || b.truth.out !== b.was_dismissed);
    const battingMissing = [...batTruth].filter(([k]) => !seenBat.has(k)).map(([k, v]) => ({ key: k, ...v }));

    return {
      deliveries: rows.length, truthDeliveries: truth.size, unmatched,
      totals: { truthConceded: truthTotal, exactConceded: exactTotal, liveConceded: liveTotal, precomputedConceded: preTotal }, exactMismatches,
      residual, penaltyBalls, wicketEvidence, spellDiffs, inningsDiffs, phaseDiffs, battingDiffs, battingMissing,
    };
  } finally {
    db.close();
  }
}

// ── CLI ──
if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join("day4", "reconcile-evidence.ts"))) {
  const { values } = parseArgs(process.argv.slice(2));
  const dbPath = values.get("db") ?? path.join(REPO, "sqlite.db");
  const r = reconcile(dbPath, loadTruth());
  const outJson = values.get("json");
  if (outJson) fs.writeFileSync(outJson, JSON.stringify(r, null, 2));
  const sum = (xs: { live: number; truth: number }[], k: "live") => xs.reduce((s, x) => s + x[k] - x.truth, 0);
  console.log(JSON.stringify({
    db: dbPath, deliveries: r.deliveries, truthDeliveries: r.truthDeliveries, unmatched: r.unmatched.length, totals: r.totals,
    residualDeliveries: r.residual.length, residualLiveNet: sum(r.residual, "live"),
    residualByCause: r.residual.reduce<Record<string, number>>((a, x) => ((a[x.cause] = (a[x.cause] ?? 0) + 1), a), {}),
    penaltyBalls: r.penaltyBalls.length, wicketEvidence: r.wicketEvidence.length, spellDiffs: r.spellDiffs.length,
    inningsDiffs: r.inningsDiffs.length, phaseDiffs: r.phaseDiffs.length, battingDiffs: r.battingDiffs.length, battingMissing: r.battingMissing.length, phaseNet: r.phaseDiffs.reduce((s, x) => s + (x.bowling_runs ?? 0) - x.truth, 0),
  }, null, 2));
}

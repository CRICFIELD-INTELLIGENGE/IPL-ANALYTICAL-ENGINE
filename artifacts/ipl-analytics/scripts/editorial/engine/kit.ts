// Reusable analyses for slot templates. Each registers its metrics/tables (ids prefixed by `p`)
// and returns tokens plus raw values for the template's conditional prose.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../evidence/lib";
import { A, BOWLER_RUNS, FR_NAME, LEGAL, REGULATION, YEAR, binomialP, derived, dp, floor, range, wilson, type Row } from "./core";
import { FRANCHISE_IDS } from "./context";

export const PHASES = {
  pp: { o1: 0, o2: 5, label: "powerplay", overs: "overs 1–6" },
  middle: { o1: 6, o2: 14, label: "middle overs", overs: "overs 7–15" },
  death: { o1: 15, o2: 19, label: "death overs", overs: "overs 16–20" },
  newball: { o1: 0, o2: 2, label: "first three overs", overs: "overs 1–3" },
  last5: { o1: 15, o2: 19, label: "last five overs", overs: "overs 16–20" },
} as const;
export type PhaseKey = keyof typeof PHASES;

/** Era split used throughout: the franchise's history up to 2023 vs the impact-player era 2024–2026. */
export const eras = (a: A) => ({ e1: [a.c.firstYear, 2023] as [number, number], e2: [2024, 2026] as [number, number] });

/** Phase rate block: team vs league over two eras + season series table. */
export function phaseBlock(a: A, p: string, side: "bat" | "bowl", key: PhaseKey) {
  const ph = PHASES[key];
  const { e1, e2 } = eras(a);
  const what = side === "bat" ? "run rate" : "economy";
  const unit = "runs per over";
  const t1 = a.rate(side, ph.o1, ph.o2, e1[0], e1[1], "team");
  const l1 = a.rate(side, ph.o1, ph.o2, e1[0], e1[1], "league");
  const t2 = a.rate(side, ph.o1, ph.o2, e2[0], e2[1], "team");
  const l2 = a.rate(side, ph.o1, ph.o2, e2[0], e2[1], "league");
  const lab = (who: string, era: number[]) => `${who} ${ph.label} ${what}, ${era[0]}–${era[1]}`;
  const f = (era: number[], who: string) => `${who}, ${ph.overs}, regulation innings, ${era[0]}–${era[1]}`;
  const tok = {
    t1: a.num(`${p}-team-e1`, t1.v, lab(a.code, e1), { unit, filters: f(e1, `${a.code} ${side === "bat" ? "batting" : "bowling"}`), n: t1.balls, nUnit: "legal balls", sql: t1.sql, check: range(t1.v, 4, 14, what) }, 2),
    l1: a.num(`${p}-league-e1`, l1.v, lab("IPL", e1), { unit, filters: f(e1, "All teams"), n: l1.balls, nUnit: "legal balls", sql: l1.sql, check: range(l1.v, 4, 14, what) }, 2),
    t2: a.num(`${p}-team-e2`, t2.v, lab(a.code, e2), { unit, filters: f(e2, `${a.code} ${side === "bat" ? "batting" : "bowling"}`), n: t2.balls, nUnit: "legal balls", sql: t2.sql, check: floor(t2.balls, 200, "balls") }, 2),
    l2: a.num(`${p}-league-e2`, l2.v, lab("IPL", e2), { unit, filters: f(e2, "All teams"), n: l2.balls, nUnit: "legal balls", sql: l2.sql, check: range(l2.v, 4, 14, what) }, 2),
  };
  const s = a.rateSeries(side, ph.o1, ph.o2);
  a.table(`${p}-series`, `${ph.label[0].toUpperCase() + ph.label.slice(1)} ${what} by season: ${a.code} vs IPL`, `${ph.overs}, regulation innings; ${side === "bat" ? "all runs" : "runs charged to bowler"} ÷ legal balls × 6`, s.rows.reduce((x, r) => x + r.balls, 0), `${a.code} legal balls`, s.sql, s.rows.map((r) => ({ season: String(r.year), team: dp(r.team, 2), league: dp(r.league, 2) })));
  const better = (r: { team: number; league: number }) => (side === "bat" ? r.team > r.league : r.team < r.league);
  const good = s.rows.filter(better).length;
  tok["good" as keyof typeof tok] = a.int(`${p}-good-seasons`, good, `Seasons ${a.code} ${side === "bat" ? "scored faster" : "conceded less"} than the league in the ${ph.label}`, { filters: "Season-level comparison", n: s.rows.length, nUnit: "seasons", sql: s.sql, check: derived("count over season table") }) as never;
  tok["seasons" as keyof typeof tok] = a.int(`${p}-season-count`, s.rows.length, `${a.code} seasons in the warehouse`, { filters: "Seasons with data", n: s.rows.length, nUnit: "seasons", sql: s.sql, check: range(s.rows.length, 1, 19, "season count") }) as never;
  return { tok: tok as typeof tok & { good: string; seasons: string }, v: { t1: t1.v, l1: l1.v, t2: t2.v, l2: l2.v, good, seasons: s.rows.length, rows: s.rows }, table: `${p}-series`, better: side === "bat" ? t2.v > l2.v : t2.v < l2.v, betterE1: side === "bat" ? t1.v > l1.v : t1.v < l1.v };
}

/** Win rate by wickets lost (batting) in an over range, team and league. */
export function wicketsWin(a: A, p: string, o1: number, o2: number, label: string) {
  const sql = `WITH w AS (
      SELECT i.innings_id, i.match_id, i.batting_team_id bt,
        SUM(CASE WHEN dm.dismissal_id IS NOT NULL AND dm.kind NOT IN ('retired hurt') THEN 1 ELSE 0 END) wk
      FROM innings i JOIN deliveries d ON d.innings_id = i.innings_id LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND d.over_num BETWEEN ${o1} AND ${o2} GROUP BY i.innings_id)
    SELECT w.wk, CASE WHEN w.bt IN ${a.T} THEN 1 ELSE 0 END is_t, CASE WHEN m.winner_id = w.bt THEN 1 ELSE 0 END won
    FROM w JOIN matches m ON m.match_id = w.match_id WHERE m.winner_id IS NOT NULL`;
  const rs = a.rows<{ wk: number; is_t: number; won: number }>(sql);
  const b = (k: number) => (k >= 3 ? "3+" : String(k));
  const rows = ["0", "1", "2", "3+"].map((k) => {
    const all = rs.filter((r) => b(r.wk) === k), t = all.filter((r) => r.is_t);
    return { wickets: k, team: t.length ? dp((t.reduce((x, r) => x + r.won, 0) / t.length) * 100) : null, league: dp((all.reduce((x, r) => x + r.won, 0) / all.length) * 100), teamInnings: t.length, leagueInnings: all.length };
  });
  a.table(`${p}-wkts-win`, `Win rate by wickets lost in the ${label}`, `Regulation innings with a result; dismissals in the over range (retired hurt excluded)`, rs.length, "innings", sql, rows);
  const steps = rows.slice(1).map((r, i) => (rows[i].league as number) - (r.league as number));
  const tok = {
    l0: a.pct(`${p}-l0`, rows[0].league as number, `IPL win rate after losing no wickets in the ${label}`, { filters: "All innings with a result", n: rows[0].leagueInnings, nUnit: "innings", sql, check: floor(rows[0].leagueInnings, 100, "innings") }),
    l2: a.pct(`${p}-l2`, rows[2].league as number, `IPL win rate after losing two wickets in the ${label}`, { filters: "All innings with a result", n: rows[2].leagueInnings, nUnit: "innings", sql, check: floor(rows[2].leagueInnings, 100, "innings") }),
    l3: a.pct(`${p}-l3`, rows[3].league as number, `IPL win rate after losing three or more wickets in the ${label}`, { filters: "All innings with a result", n: rows[3].leagueInnings, nUnit: "innings", sql, check: floor(rows[3].leagueInnings, 50, "innings") }),
    stepMax: a.num(`${p}-stepmax`, Math.max(...steps), `Largest drop in IPL win rate per extra wicket in the ${label}`, { unit: "percentage points", filters: "Adjacent buckets", n: rs.length, nUnit: "innings", sql, check: derived() }, 0),
    t0: rows[0].teamInnings >= 15 ? a.pct(`${p}-t0`, rows[0].team as number, `${a.code} win rate after losing no wickets in the ${label}`, { filters: `${a.code} innings with a result`, n: rows[0].teamInnings, nUnit: "innings", sql, check: floor(rows[0].teamInnings, 15, "innings") }) : null,
    t3: rows[3].teamInnings >= 10 ? a.pct(`${p}-t3`, rows[3].team as number, `${a.code} win rate after losing three or more wickets in the ${label}`, { filters: `${a.code} innings with a result`, n: rows[3].teamInnings, nUnit: "innings", sql, check: floor(rows[3].teamInnings, 10, "innings") }) : null,
    tInn: a.int(`${p}-tinn`, rs.filter((r) => r.is_t).length, `${a.code} innings with a result`, { filters: "Regulation innings, matches with a winner", n: rs.filter((r) => r.is_t).length, nUnit: "innings", sql, check: floor(rs.filter((r) => r.is_t).length, 20, "innings") }),
  };
  return { tok, rows, table: `${p}-wkts-win` };
}

/** Player table for a phase: batters (SR, balls per dismissal) or bowlers (economy, dot %, wickets). */
export function phasePlayers(a: A, p: string, side: "bat" | "bowl", o1: number, o2: number, from: number, to: number, minBalls: number) {
  const sql =
    side === "bat"
      ? `SELECT pl.name, SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls,
          SUM(CASE WHEN dm.player_out_id = d.batter_id THEN 1 ELSE 0 END) outs, SUM(CASE WHEN d.is_boundary = 1 THEN 1 ELSE 0 END) bnd,
          SUM(CASE WHEN d.batter_runs = 0 AND d.is_wide = 0 THEN 1 ELSE 0 END) dots
         FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players pl ON pl.player_id = d.batter_id
         LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
         WHERE ${REGULATION} AND d.over_num BETWEEN ${o1} AND ${o2} AND i.batting_team_id IN ${a.T} AND ${YEAR()} BETWEEN ${from} AND ${to}
         GROUP BY d.batter_id HAVING balls >= ${minBalls} ORDER BY balls DESC LIMIT 8`
      : `SELECT pl.name, SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls,
          SUM(CASE WHEN dm.dismissal_id IS NOT NULL AND dm.kind NOT IN ('run out','retired hurt','retired out','obstructing the field') THEN 1 ELSE 0 END) wk,
          SUM(CASE WHEN ${BOWLER_RUNS} = 0 AND ${LEGAL} THEN 1 ELSE 0 END) dots
         FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players pl ON pl.player_id = d.bowler_id
         LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
         WHERE ${REGULATION} AND d.over_num BETWEEN ${o1} AND ${o2} AND i.bowling_team_id IN ${a.T} AND ${YEAR()} BETWEEN ${from} AND ${to}
         GROUP BY d.bowler_id HAVING balls >= ${minBalls} ORDER BY balls DESC LIMIT 8`;
  const rs = a.rows<{ name: string; runs: number; balls: number; outs?: number; bnd?: number; dots: number; wk?: number }>(sql);
  const rows: Row[] =
    side === "bat"
      ? rs.map((r) => ({ player: r.name, balls: r.balls, strikeRate: dp((r.runs / r.balls) * 100), ballsPerDismissal: r.outs ? dp(r.balls / r.outs) : null, dotPct: dp((r.dots / r.balls) * 100) }))
      : rs.map((r) => ({ player: r.name, balls: r.balls, economy: dp((r.runs * 6) / r.balls, 2), dotPct: dp((r.dots / r.balls) * 100), wickets: r.wk ?? 0 }));
  a.table(`${p}-players`, `${a.code} ${side === "bat" ? "batters" : "bowlers"}, overs ${o1 + 1}–${o2 + 1}, ${from}–${to} (min. ${minBalls} balls)`, `${a.code} ${side === "bat" ? "batting" : "bowling"}, regulation innings`, rs.reduce((x, r) => x + r.balls, 0), "balls", sql, rows);
  const lead = rs[0];
  const tok = lead
    ? {
        name: a.text(`${p}-lead-name`, lead.name, `${a.code}'s most-used ${side === "bat" ? "batter" : "bowler"} in this phase, ${from}–${to}`, { filters: "Ranked by balls", n: lead.balls, nUnit: "balls", sql, check: derived("rank by balls") }),
        balls: a.int(`${p}-lead-balls`, lead.balls, `${lead.name} balls in this phase, ${from}–${to}`, { filters: `${a.code}, ${from}–${to}`, n: lead.balls, nUnit: "balls", sql, check: floor(lead.balls, minBalls, "balls") }),
        rate:
          side === "bat"
            ? a.num(`${p}-lead-sr`, (lead.runs / lead.balls) * 100, `${lead.name} strike rate in this phase, ${from}–${to}`, { unit: "runs per 100 balls", filters: `${a.code}, ${from}–${to}`, n: lead.balls, nUnit: "balls", sql, check: floor(lead.balls, minBalls, "balls") })
            : a.num(`${p}-lead-econ`, (lead.runs * 6) / lead.balls, `${lead.name} economy in this phase, ${from}–${to}`, { unit: "runs per over", filters: `${a.code}, ${from}–${to}`, n: lead.balls, nUnit: "balls", sql, check: floor(lead.balls, minBalls, "balls") }, 2),
      }
    : null;
  return { tok, rows, rs, table: `${p}-players`, lead };
}

/** Season-by-season record with finish (points tables + finals). */
type PT = { position: number; team: string; teamCode: string; wins: number; result: string | null };
// Match by team name: Deccan Chargers also use the code "DC" in the points tables.
const PT_NAME: Record<string, RegExp> = { CSK: /^Chennai Super Kings$/, MI: /^Mumbai Indians$/, RCB: /^Royal Challengers/, KKR: /^Kolkata Knight Riders$/, SRH: /^Sunrisers Hyderabad$/, RR: /^Rajasthan Royals$/, DC: /^Delhi (Capitals|Daredevils)$/, PBKS: /^(Punjab Kings|Kings XI Punjab)$/, GT: /^Gujarat Titans$/, LSG: /^Lucknow Super Giants$/ };
export function seasonRecord(a: A, p: string) {
  const pts = JSON.parse(readFileSync(resolve(ROOT, "artifacts/api-server/data/points-tables.json"), "utf8")) as Record<string, PT[]>;
  const sql = `SELECT ${YEAR()} year, COUNT(*) n, SUM(CASE WHEN ${a.won} THEN 1 ELSE 0 END) won FROM matches m WHERE ${a.playsIn} AND m.winner_id IS NOT NULL GROUP BY year ORDER BY year`;
  const finSql = `SELECT ${YEAR()} year, CASE WHEN ${a.won} THEN 1 ELSE 0 END won FROM matches m WHERE m.date = (SELECT MAX(x.date) FROM matches x WHERE x.season_id = m.season_id) AND ${a.playsIn}`;
  const seasons = a.rows<{ year: number; n: number; won: number }>(sql);
  const finals = a.rows<{ year: number; won: number }>(finSql);
  const rows = seasons.map((s) => {
    const t = (pts[String(s.year)] ?? []).find((r) => PT_NAME[a.code].test(r.team));
    const f = finals.find((x) => x.year === s.year);
    const outcome = f ? (f.won ? "Champions" : "Runners-up") : t?.result ? "Playoffs" : "League stage";
    return { season: String(s.year), winPct: dp((s.won / s.n) * 100), matches: s.n, position: t?.position ?? null, outcome };
  });
  a.table(`${p}-seasons`, `${a.code} season by season`, "All matches with a result; position from the league-stage table", seasons.reduce((x, s) => x + s.n, 0), "matches", `${sql} ;; ${finSql}`, rows);
  const titles = rows.filter((r) => r.outcome === "Champions");
  const playoffs = rows.filter((r) => r.outcome !== "League stage");
  const best = [...rows].sort((x, y) => (y.winPct as number) - (x.winPct as number))[0];
  const worst = [...rows].sort((x, y) => (x.winPct as number) - (y.winPct as number))[0];
  const all = a.results();
  const tok = {
    seasons: a.int(`${p}-n-seasons`, rows.length, `${a.code} seasons in the warehouse`, { filters: "Seasons with matches", n: rows.length, nUnit: "seasons", sql, check: range(rows.length, 1, 19, "seasons") }),
    titles: a.int(`${p}-titles`, titles.length, `${a.code} titles, as winner of the season's final`, { filters: "Final = last match of each season", n: finals.length, nUnit: "finals", sql: finSql, check: range(titles.length, 0, 6, "titles") }),
    playoffs: a.int(`${p}-playoffs`, playoffs.length, `${a.code} seasons with a playoff place`, { filters: "Points-table playoff result or a final", n: rows.length, nUnit: "seasons", sql: finSql, check: derived("count over season table") }),
    winPct: a.pct(`${p}-win-all`, all.pct, `${a.code} win rate, all seasons`, { filters: "Matches with a result", n: all.n, nUnit: "matches", sql: all.sql, check: floor(all.n, 20, "matches") }),
    matches: a.int(`${p}-matches`, all.n, `${a.code} matches with a result`, { filters: "All seasons", n: all.n, nUnit: "matches", sql: all.sql, check: floor(all.n, 20, "matches") }),
    bestYear: a.text(`${p}-best-year`, best.season as string, `${a.code}'s best season by win rate`, { filters: "Season win rate", n: rows.length, nUnit: "seasons", sql, check: derived("max over season table") }),
    bestPct: a.pct(`${p}-best-pct`, best.winPct as number, `${a.code} win rate in ${best.season}`, { filters: String(best.season), n: best.matches as number, nUnit: "matches", sql, check: floor(best.matches as number, 8, "matches") }),
    worstYear: a.text(`${p}-worst-year`, worst.season as string, `${a.code}'s weakest season by win rate`, { filters: "Season win rate", n: rows.length, nUnit: "seasons", sql, check: derived("min over season table") }),
    worstPct: a.pct(`${p}-worst-pct`, worst.winPct as number, `${a.code} win rate in ${worst.season}`, { filters: String(worst.season), n: worst.matches as number, nUnit: "matches", sql, check: floor(worst.matches as number, 8, "matches") }),
  };
  return { tok, rows, titles: titles.map((t) => t.season as string), playoffs: playoffs.length, best, worst, table: `${p}-seasons`, n: rows.length, all };
}

/** Home venue profile and home/away record. */
export function homeGround(a: A, p: string) {
  const H = a.c.homeSql;
  const profSql = `SELECT CASE WHEN m.venue_id IN ${H} THEN 'home' ELSE 'other' END v, COUNT(DISTINCT m.match_id) matches,
      SUM(d.total_runs) * 6.0 / SUM(CASE WHEN ${LEGAL} THEN 1 END) rr, SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) * 1.0 / COUNT(DISTINCT m.match_id) sixes, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id WHERE ${REGULATION} GROUP BY v`;
  const firstSql = `SELECT CASE WHEN m.venue_id IN ${H} THEN 'home' ELSE 'other' END v, AVG(i.runs) avg1, COUNT(*) n,
      SUM(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id <> i.batting_team_id THEN 1 ELSE 0 END) cw, SUM(CASE WHEN m.winner_id IS NOT NULL THEN 1 ELSE 0 END) dec
    FROM innings i JOIN matches m ON m.match_id = i.match_id WHERE i.innings_number = 1 GROUP BY v`;
  const prof = a.rows<{ v: string; matches: number; rr: number; sixes: number; balls: number }>(profSql);
  const first = a.rows<{ v: string; avg1: number; n: number; cw: number; dec: number }>(firstSql);
  const ph = prof.find((x) => x.v === "home")!, po = prof.find((x) => x.v === "other")!;
  const fh = first.find((x) => x.v === "home")!, fo = first.find((x) => x.v === "other")!;
  const haSql = `SELECT CASE WHEN m.venue_id IN ${H} THEN 'home' ELSE 'away' END loc, SUM(CASE WHEN ${a.won} THEN 1 ELSE 0 END) won, COUNT(*) n FROM matches m WHERE ${a.playsIn} AND m.winner_id IS NOT NULL GROUP BY loc`;
  const ha = a.rows<{ loc: string; won: number; n: number }>(haSql);
  const h = ha.find((x) => x.loc === "home") ?? { won: 0, n: 0 }, w = ha.find((x) => x.loc === "away") ?? { won: 0, n: 0 };
  const [lo, hi] = wilson(h.won, h.n);
  const pval = binomialP(h.won, h.n);
  const tossSql = `SELECT SUM(CASE WHEN toss_decision = 'field' THEN 1 ELSE 0 END) field, COUNT(*) n FROM matches m WHERE m.venue_id IN ${H}`;
  const toss = a.one<{ field: number; n: number }>(tossSql);
  const homeName = a.c.homeLabel;
  const tok = {
    matches: a.int(`${p}-home-matches`, ph.matches, `Matches at ${homeName} in the warehouse`, { filters: "All teams, regulation innings", n: ph.matches, nUnit: "matches", sql: profSql, check: floor(ph.matches, 10, "matches") }),
    rrH: a.num(`${p}-rr-home`, ph.rr, `Run rate at ${homeName}`, { unit: "runs per over", filters: "All matches at the ground", n: ph.balls, nUnit: "legal balls", sql: profSql, check: range(ph.rr, 6, 12, "run rate") }, 2),
    rrO: a.num(`${p}-rr-other`, po.rr, "Run rate at all other IPL venues", { unit: "runs per over", filters: "All other venues", n: po.balls, nUnit: "legal balls", sql: profSql, check: range(po.rr, 6, 12, "run rate") }, 2),
    sixH: a.num(`${p}-six-home`, ph.sixes, `Sixes per match at ${homeName}`, { unit: "sixes per match", filters: "All matches at the ground", n: ph.matches, nUnit: "matches", sql: profSql, check: floor(ph.matches, 10, "matches") }),
    sixO: a.num(`${p}-six-other`, po.sixes, "Sixes per match at other venues", { unit: "sixes per match", filters: "All other venues", n: po.matches, nUnit: "matches", sql: profSql, check: floor(po.matches, 100, "matches") }),
    firstH: a.num(`${p}-first-home`, fh.avg1, `Average first-innings score at ${homeName}`, { unit: "runs", filters: "First innings", n: fh.n, nUnit: "innings", sql: firstSql, check: floor(fh.n, 10, "innings") }, 0),
    firstO: a.num(`${p}-first-other`, fo.avg1, "Average first-innings score at other venues", { unit: "runs", filters: "First innings", n: fo.n, nUnit: "innings", sql: firstSql, check: floor(fo.n, 100, "innings") }, 0),
    chaseH: a.pct(`${p}-chase-home`, (fh.cw / fh.dec) * 100, `Chasing side's win rate at ${homeName}`, { filters: "Matches with a result", n: fh.dec, nUnit: "matches", sql: firstSql, check: floor(fh.dec, 10, "matches") }),
    chaseO: a.pct(`${p}-chase-other`, (fo.cw / fo.dec) * 100, "Chasing side's win rate at other venues", { filters: "Matches with a result", n: fo.dec, nUnit: "matches", sql: firstSql, check: floor(fo.dec, 100, "matches") }),
    homePct: a.pct(`${p}-home-win`, (h.won / h.n) * 100, `${a.code} win rate at ${homeName}`, { filters: `${a.code} matches with a result at the ground`, n: h.n, nUnit: "matches", sql: haSql, check: floor(h.n, 10, "matches") }),
    awayPct: a.pct(`${p}-away-win`, (w.won / w.n) * 100, `${a.code} win rate elsewhere`, { filters: `${a.code} matches with a result at other venues`, n: w.n, nUnit: "matches", sql: haSql, check: floor(w.n, 10, "matches") }),
    homeN: a.int(`${p}-home-n`, h.n, `${a.code} decided matches at ${homeName}`, { filters: "Matches with a result", n: h.n, nUnit: "matches", sql: haSql, check: floor(h.n, 10, "matches") }),
    ci: a.text(`${p}-home-ci`, `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`, `95% interval for ${a.code}'s home win rate`, { filters: "Wilson score interval", n: h.n, nUnit: "matches", sql: haSql, check: { method: "interval contains point estimate", passed: lo <= h.won / h.n && h.won / h.n <= hi } }),
    p: a.num(`${p}-home-p`, pval, "Probability of a home record at least this far from 50/50 if each match were a coin toss", { filters: "Two-sided exact binomial test", n: h.n, nUnit: "matches", sql: haSql, check: range(pval, 0, 1, "p-value") }, 2),
    fieldPct: a.pct(`${p}-toss-field`, (toss.field / toss.n) * 100, `Toss winners choosing to bowl first at ${homeName}`, { filters: "All matches at the ground", n: toss.n, nUnit: "matches", sql: tossSql, check: floor(toss.n, 10, "matches") }, 0),
  };
  a.table(`${p}-home-away`, `${a.code} win rate at ${homeName} vs elsewhere`, "Matches with a result", h.n + w.n, "matches", haSql, [
    { where: homeName, winPct: dp((h.won / h.n) * 100), matches: h.n },
    { where: "Elsewhere", winPct: dp((w.won / w.n) * 100), matches: w.n },
  ]);
  return { tok, v: { rrH: ph.rr, rrO: po.rr, sixH: ph.sixes, sixO: po.sixes, firstH: fh.avg1, firstO: fo.avg1, homePct: (h.won / h.n) * 100, awayPct: (w.won / w.n) * 100, p: pval, chaseH: (fh.cw / fh.dec) * 100 }, table: `${p}-home-away` };
}

/** Close matches (≤ 10 runs, ≤ 6 balls to spare, super over) for every franchise. */
export function closeMatches(a: A, p: string) {
  const sql = `WITH r AS (SELECT m.match_id, ${YEAR()} year, m.date, m.winner_id, m.team1_id, m.team2_id,
      MAX(CASE WHEN i.innings_number = 1 THEN i.batting_team_id END) bat1, MAX(CASE WHEN i.innings_number = 1 THEN i.runs END) r1,
      MAX(CASE WHEN i.innings_number = 2 THEN i.runs END) r2, MAX(CASE WHEN i.innings_number = 2 THEN i.total_legal_balls END) b2,
      MAX(CASE WHEN i.innings_number > 2 THEN 1 ELSE 0 END) so
      FROM matches m JOIN innings i ON i.match_id = m.match_id WHERE m.winner_id IS NOT NULL GROUP BY m.match_id)
    SELECT *, CASE WHEN so = 1 THEN 1 WHEN winner_id = bat1 AND r1 - r2 <= 10 THEN 1 WHEN winner_id <> bat1 AND b2 >= 114 THEN 1 ELSE 0 END close FROM r`;
  const all = a.rows<{ year: number; date: string; winner_id: number; team1_id: number; team2_id: number; close: number }>(sql);
  const rec = (ids: number[], ms: typeof all) => {
    const x = ms.filter((m) => ids.includes(m.team1_id) || ids.includes(m.team2_id));
    return { n: x.length, won: x.filter((m) => ids.includes(m.winner_id)).length };
  };
  const close = all.filter((m) => m.close);
  const rows = Object.entries(FRANCHISE_IDS).map(([code, ids]) => {
    const r = rec(ids, close);
    return { franchise: code, closeWinPct: dp((r.won / r.n) * 100), closeMatches: r.n, p: dp(binomialP(r.won, r.n), 3) };
  }).sort((x, y) => (y.closeWinPct as number) - (x.closeWinPct as number));
  a.table(`${p}-close-table`, "Win rate in close matches by franchise", "Close = decided by ten runs or fewer, six or fewer balls to spare, or a super over", close.length, "close matches", sql, rows);
  const me = rec(a.c.ids, close), other = rec(a.c.ids, all.filter((m) => !m.close));
  const [lo, hi] = wilson(me.won, me.n);
  const pv = binomialP(me.won, me.n);
  const rank = rows.findIndex((r) => r.franchise === a.code) + 1;
  const sig = rows.filter((r) => (r.p as number) < 0.05).length;
  const tok = {
    n: a.int(`${p}-close-n`, me.n, `${a.code} close matches`, { filters: "As defined", n: me.n, nUnit: "matches", sql, check: floor(me.n, 10, "matches") }),
    won: a.int(`${p}-close-won`, me.won, `${a.code} close-match wins`, { filters: "As defined", n: me.n, nUnit: "matches", sql, check: floor(me.n, 10, "matches") }),
    pct: a.pct(`${p}-close-pct`, (me.won / me.n) * 100, `${a.code} win rate in close matches`, { filters: "As defined", n: me.n, nUnit: "matches", sql, check: floor(me.n, 10, "matches") }),
    ci: a.text(`${p}-close-ci`, `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`, `95% interval for ${a.code}'s close-match win rate`, { filters: "Wilson interval", n: me.n, nUnit: "matches", sql, check: { method: "interval contains point estimate", passed: lo <= me.won / me.n && me.won / me.n <= hi } }),
    p: a.num(`${p}-close-p`, pv, "Probability of a close-match record at least this far from 50/50 by chance", { filters: "Two-sided exact binomial test", n: me.n, nUnit: "matches", sql, check: range(pv, 0, 1, "p-value") }, 2),
    other: a.pct(`${p}-other-pct`, (other.won / other.n) * 100, `${a.code} win rate in matches that were not close`, { filters: "Matches with a result, not close", n: other.n, nUnit: "matches", sql, check: floor(other.n, 10, "matches") }),
    rank: a.text(`${p}-close-rank`, ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"][rank - 1], `${a.code}'s rank among ten franchises by close-match win rate`, { filters: "All seasons", n: 10, nUnit: "franchises", sql, check: range(rank, 1, 10, "rank") }),
    sig: a.text(`${p}-close-sig`, ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "all ten"][sig], "Franchises whose close-match record differs from 50/50 at p < 0.05", { filters: "Exact binomial test per franchise", n: 10, nUnit: "franchises", sql, check: derived("ten tests") }),
  };
  return { tok, v: { pct: (me.won / me.n) * 100, lo, hi, p: pv, rank, sig, n: me.n }, table: `${p}-close-table` };
}

/** Head-to-head record against every current franchise. */
export function headToHead(a: A, p: string) {
  const rows: Row[] = [];
  let sqlUsed = "";
  for (const [code, ids] of Object.entries(FRANCHISE_IDS)) {
    if (code === a.code) continue;
    const sql = `SELECT COUNT(*) n, SUM(CASE WHEN ${a.won} THEN 1 ELSE 0 END) won FROM matches m WHERE ${a.playsIn} AND (m.team1_id IN (${ids}) OR m.team2_id IN (${ids})) AND m.winner_id IS NOT NULL`;
    sqlUsed = sql;
    const r = a.one<{ n: number; won: number }>(sql);
    if (r.n) rows.push({ opponent: code, winPct: dp((r.won / r.n) * 100), matches: r.n, won: r.won });
  }
  rows.sort((x, y) => (y.matches as number) - (x.matches as number));
  a.table(`${p}-h2h`, `${a.code} head-to-head record by opponent`, "Matches with a result; opponents under their current franchise names", rows.reduce((x, r) => x + (r.matches as number), 0), "matches", sqlUsed, rows);
  const most = rows[0], best = [...rows].filter((r) => (r.matches as number) >= 6).sort((x, y) => (y.winPct as number) - (x.winPct as number))[0], worst = [...rows].filter((r) => (r.matches as number) >= 6).sort((x, y) => (x.winPct as number) - (y.winPct as number))[0];
  const tok = {
    mostName: a.text(`${p}-most-opp`, FR_NAME[most.opponent as string], `${a.code}'s most-played opponent`, { filters: "Matches with a result", n: most.matches as number, nUnit: "matches", sql: sqlUsed, check: derived("max over opponents") }),
    mostN: a.int(`${p}-most-n`, most.matches as number, `Matches against ${most.opponent}`, { filters: "Matches with a result", n: most.matches as number, nUnit: "matches", sql: sqlUsed, check: floor(most.matches as number, 3, "matches") }),
    mostPct: a.pct(`${p}-most-pct`, most.winPct as number, `${a.code} win rate against ${most.opponent}`, { filters: "Matches with a result", n: most.matches as number, nUnit: "matches", sql: sqlUsed, check: floor(most.matches as number, 3, "matches") }),
    bestName: best ? a.text(`${p}-best-opp`, FR_NAME[best.opponent as string], `Opponent ${a.code} beat most often (min. six matches)`, { filters: "Min. six matches", n: best.matches as number, nUnit: "matches", sql: sqlUsed, check: derived("max over opponents") }) : "",
    bestPct: best ? a.pct(`${p}-best-pct`, best.winPct as number, `${a.code} win rate against ${best.opponent}`, { filters: "Min. six matches", n: best.matches as number, nUnit: "matches", sql: sqlUsed, check: floor(best.matches as number, 6, "matches") }) : "",
    worstName: worst ? a.text(`${p}-worst-opp`, FR_NAME[worst.opponent as string], `Opponent ${a.code} beat least often (min. six matches)`, { filters: "Min. six matches", n: worst.matches as number, nUnit: "matches", sql: sqlUsed, check: derived("min over opponents") }) : "",
    worstPct: worst ? a.pct(`${p}-worst-pct`, worst.winPct as number, `${a.code} win rate against ${worst.opponent}`, { filters: "Min. six matches", n: worst.matches as number, nUnit: "matches", sql: sqlUsed, check: floor(worst.matches as number, 6, "matches") }) : "",
  };
  return { tok, rows, most, best, worst, table: `${p}-h2h` };
}

/** Tempo runs above average (batting + bowling vs same season & phase), with squad prices. */
export function traa(a: A, p: string, from: number, to: number) {
  const baseSql = `SELECT ${YEAR()} year, d.phase, SUM(d.batter_runs) * 1.0 / SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) bat, SUM(${BOWLER_RUNS}) * 1.0 / SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) bowl FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id WHERE ${REGULATION} AND ${YEAR()} BETWEEN ${from} AND ${to} GROUP BY year, d.phase`;
  const base = new Map(a.rows<{ year: number; phase: string; bat: number; bowl: number }>(baseSql).map((r) => [`${r.year}|${r.phase}`, r]));
  const batSql = `SELECT ${YEAR()} year, pl.name, d.phase, SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players pl ON pl.player_id = d.batter_id WHERE ${REGULATION} AND i.batting_team_id IN ${a.T} AND ${YEAR()} BETWEEN ${from} AND ${to} GROUP BY year, pl.name, d.phase`;
  const bowlSql = `SELECT ${YEAR()} year, pl.name, d.phase, SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players pl ON pl.player_id = d.bowler_id WHERE ${REGULATION} AND i.bowling_team_id IN ${a.T} AND ${YEAR()} BETWEEN ${from} AND ${to} GROUP BY year, pl.name, d.phase`;
  const c = new Map<string, { bat: number; bowl: number; balls: number; batBalls: number; bowlBalls: number }>();
  const add = (k: string, f: "bat" | "bowl", v: number, balls: number) => {
    const x = c.get(k) ?? { bat: 0, bowl: 0, balls: 0, batBalls: 0, bowlBalls: 0 };
    x[f] += v;
    x.balls += balls;
    if (f === "bat") x.batBalls += balls;
    else x.bowlBalls += balls;
    c.set(k, x);
  };
  for (const r of a.rows<{ year: number; name: string; phase: string; runs: number; balls: number }>(batSql)) add(`${r.year}|${r.name}`, "bat", r.runs - r.balls * base.get(`${r.year}|${r.phase}`)!.bat, r.balls);
  for (const r of a.rows<{ year: number; name: string; phase: string; runs: number; balls: number }>(bowlSql)) add(`${r.year}|${r.name}`, "bowl", r.balls * base.get(`${r.year}|${r.phase}`)!.bowl - r.runs, r.balls);
  type P = { year: number; player: string; cricsheet: string; crore: number | null; acquisition: string; country: string | null; traa: number; bat: number; bowl: number; balls: number; batBalls: number; bowlBalls: number };
  const players: P[] = [];
  for (let y = from; y <= to; y++)
    for (const s of a.squad(y)) {
      const x = c.get(`${y}|${s.cricsheetName}`);
      players.push({ year: y, player: s.name, cricsheet: s.cricsheetName, crore: s.priceLakh != null ? s.priceLakh / 100 : null, acquisition: s.acquisition, country: s.country, traa: x ? x.bat + x.bowl : 0, bat: x?.bat ?? 0, bowl: x?.bowl ?? 0, balls: x?.balls ?? 0, batBalls: x?.batBalls ?? 0, bowlBalls: x?.bowlBalls ?? 0 });
    }
  const sql = `${baseSql} ;; ${batSql} ;; ${bowlSql}`;
  return { players, sql, contributions: c };
}

/** Sentence naming the strongest and weakest season in a series, with recorded values. */
export function extremes(a: A, p: string, rows: { year: number; team: number }[], what: string, unit: string, higherIsBetter: boolean, digits = 2, sql = "season series", words: [string, string] = ["strongest", "weakest"]) {
  const usable = rows.filter((r) => Number.isFinite(r.team));
  if (usable.length < 3) return "";
  const sorted = [...usable].sort((x, y) => (higherIsBetter ? y.team - x.team : x.team - y.team));
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const o = (y: number) => ({ unit, filters: `${a.code}, ${y}`, n: 1, nUnit: "season", sql, check: derived("taken from the season table") });
  const bv = a.num(`${p}-best-v`, best.team, `${a.code} ${what} in ${best.year}`, o(best.year), digits);
  const wv = a.num(`${p}-worst-v`, worst.team, `${a.code} ${what} in ${worst.year}`, o(worst.year), digits);
  return `On this measure their ${words[0]} season was ${best.year}, at ${bv}, and their ${words[1]} ${worst.year}, at ${wv}.`;
}

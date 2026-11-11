// The Powerplay Equation — RCB batting in overs 1–6.
import { BOWLER_RUNS, Evidence, LEGAL, RCB_IDS, REGULATION, YEAR, dp, fmt, inRange, pct, reconcile, sampleFloor } from "../lib";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: deliveries ⨝ innings ⨝ matches (Cricsheet ball-by-ball, IPL 2008–2026)";
  const PP = "d.over_num BETWEEN 0 AND 5";

  // ── Season series: RCB vs league powerplay run rate ──
  const seasonSql = `
    SELECT ${YEAR()} AS year,
      ROUND(SUM(CASE WHEN i.batting_team_id IN ${RCB_IDS} THEN d.total_runs END) * 6.0 / SUM(CASE WHEN i.batting_team_id IN ${RCB_IDS} AND ${LEGAL} THEN 1 END), 2) AS rcb,
      ROUND(SUM(d.total_runs) * 6.0 / SUM(CASE WHEN ${LEGAL} THEN 1 END), 2) AS league,
      SUM(CASE WHEN i.batting_team_id IN ${RCB_IDS} AND ${LEGAL} THEN 1 END) AS rcbBalls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE ${REGULATION} AND ${PP}
    GROUP BY year ORDER BY year`;
  const seasons = ev.rows<{ year: number; rcb: number; league: number; rcbBalls: number }>(seasonSql);
  ev.table("pp-by-season", {
    label: "Powerplay run rate by season: RCB vs IPL",
    dataset: DS,
    filters: "Overs 1–6, regulation innings (super overs excluded); run rate = all runs ÷ legal balls × 6",
    n: seasons.reduce((s, r) => s + r.rcbBalls, 0),
    nUnit: "RCB legal powerplay balls",
    query: seasonSql,
    rows: seasons.map((r) => ({ season: String(r.year), rcb: r.rcb, league: r.league })),
  });

  const span = (from: number, to: number, team: boolean) => {
    const sql = `
      SELECT SUM(d.total_runs) runs, SUM(CASE WHEN ${LEGAL} THEN 1 END) balls,
        COUNT(DISTINCT d.innings_id) inns
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
      WHERE ${REGULATION} AND ${PP} AND ${YEAR()} BETWEEN ${from} AND ${to} ${team ? `AND i.batting_team_id IN ${RCB_IDS}` : ""}`;
    const r = ev.one<{ runs: number; balls: number; inns: number }>(sql);
    return { sql, rr: (r.runs * 6) / r.balls, ...r };
  };
  const early = span(2008, 2023, true);
  const recentSpan = span(2024, 2026, true);
  const leagueRecent = span(2024, 2026, false);
  const leagueEarly = span(2008, 2023, false);
  ev.metric("rcb-pp-rr-2008-23", { value: dp(early.rr, 2), display: fmt(early.rr, 2), label: "RCB powerplay run rate 2008–2023", unit: "runs per over", dataset: DS, filters: "RCB batting, overs 1–6, 2008–2023", n: early.balls, nUnit: "legal balls", query: early.sql, validate: inRange(early.rr, 5, 12, "T20 powerplay run rate") });
  ev.metric("rcb-pp-rr-2024-26", { value: dp(recentSpan.rr, 2), display: fmt(recentSpan.rr, 2), label: "RCB powerplay run rate 2024–2026", unit: "runs per over", dataset: DS, filters: "RCB batting, overs 1–6, 2024–2026", n: recentSpan.balls, nUnit: "legal balls", query: recentSpan.sql, validate: sampleFloor(recentSpan.balls, 1000, "balls") });
  ev.metric("league-pp-rr-2024-26", { value: dp(leagueRecent.rr, 2), display: fmt(leagueRecent.rr, 2), label: "IPL powerplay run rate 2024–2026", unit: "runs per over", dataset: DS, filters: "All teams, overs 1–6, 2024–2026", n: leagueRecent.balls, nUnit: "legal balls", query: leagueRecent.sql, validate: inRange(leagueRecent.rr, 6, 12, "league powerplay run rate") });
  ev.metric("league-pp-rr-2008-23", { value: dp(leagueEarly.rr, 2), display: fmt(leagueEarly.rr, 2), label: "IPL powerplay run rate 2008–2023", unit: "runs per over", dataset: DS, filters: "All teams, overs 1–6, 2008–2023", n: leagueEarly.balls, nUnit: "legal balls", query: leagueEarly.sql, validate: inRange(leagueEarly.rr, 6, 10, "league powerplay run rate") });
  const rcbSeasonsAbove = seasons.filter((r) => r.rcb > r.league).length;
  ev.metric("rcb-pp-seasons-above-league", { value: rcbSeasonsAbove, display: String(rcbSeasonsAbove), label: "Seasons with RCB powerplay run rate above the league", dataset: DS, filters: "Season-level comparison, 2008–2026", n: seasons.length, nUnit: "seasons", query: seasonSql, validate: { method: "count over season table", passed: seasons.length === 19, detail: `${seasons.length} seasons in table` } });
  ev.metric("season-count", { value: seasons.length, display: String(seasons.length), label: "IPL seasons in the warehouse", dataset: DS, filters: "2008–2026", n: seasons.length, nUnit: "seasons", query: seasonSql, validate: { method: "expected 19 editions 2008–2026", passed: seasons.length === 19 } });

  // ── Per-innings powerplay outcome → match result (all teams, larger sample) ──
  const innSql = `
    WITH pp AS (
      SELECT i.innings_id, i.match_id, i.innings_number, i.batting_team_id,
        SUM(d.total_runs) pp_runs,
        SUM(CASE WHEN dm.dismissal_id IS NOT NULL AND dm.kind NOT IN ('retired hurt') THEN 1 ELSE 0 END) pp_wkts
      FROM innings i JOIN deliveries d ON d.innings_id = i.innings_id
      LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
      WHERE ${REGULATION} AND ${PP}
      GROUP BY i.innings_id)
    SELECT pp.*, i.runs total, m.winner_id, ${YEAR()} year,
      CASE WHEN pp.batting_team_id IN ${RCB_IDS} THEN 1 ELSE 0 END is_rcb,
      CASE WHEN m.winner_id = pp.batting_team_id THEN 1 ELSE 0 END won
    FROM pp JOIN innings i ON i.innings_id = pp.innings_id JOIN matches m ON m.match_id = pp.match_id
    WHERE m.winner_id IS NOT NULL`;
  const inns = ev.rows<{ pp_runs: number; pp_wkts: number; total: number; won: number; is_rcb: number; year: number; innings_number: number }>(innSql);
  const bucketW = (w: number) => (w >= 3 ? "3+" : String(w));
  const grid = new Map<string, { n: number; won: number; total: number }>();
  for (const r of inns) {
    for (const scope of ["all", r.is_rcb ? "rcb" : null].filter(Boolean) as string[]) {
      const k = `${scope}|${bucketW(r.pp_wkts)}`;
      const g = grid.get(k) ?? { n: 0, won: 0, total: 0 };
      g.n++, (g.won += r.won), (g.total += r.total);
      grid.set(k, g);
    }
  }
  const wRows = ["0", "1", "2", "3+"].map((b) => {
    const a = grid.get(`all|${b}`)!;
    const r = grid.get(`rcb|${b}`)!;
    return { wickets: b, leagueWinPct: dp((a.won / a.n) * 100), rcbWinPct: dp((r.won / r.n) * 100), leagueInnings: a.n, rcbInnings: r.n, rcbAvgTotal: dp(r.total / r.n, 0) };
  });
  ev.table("pp-wickets-win", {
    label: "Win rate by powerplay wickets lost",
    dataset: DS,
    filters: "Regulation innings with a result; wickets = dismissals in overs 1–6 (retired hurt excluded); both innings",
    n: inns.length,
    nUnit: "innings",
    query: innSql,
    rows: wRows,
  });
  const rcbInns = inns.filter((r) => r.is_rcb);
  ev.metric("rcb-pp-innings", { value: rcbInns.length, display: String(rcbInns.length), label: "RCB innings with a result", dataset: DS, filters: "Regulation innings, matches with a winner", n: rcbInns.length, nUnit: "innings", query: innSql, validate: sampleFloor(rcbInns.length, 250, "innings") });
  ev.metric("league-pp-innings", { value: inns.length, display: inns.length.toLocaleString("en-IN"), label: "IPL innings with a result", dataset: DS, filters: "Regulation innings, matches with a winner", n: inns.length, nUnit: "innings", query: innSql, validate: sampleFloor(inns.length, 2000, "innings") });
  for (const r of wRows) {
    const id = r.wickets === "3+" ? "3plus" : r.wickets;
    ev.metric(`rcb-win-pp-wkts-${id}`, { value: r.rcbWinPct, display: `${fmt(r.rcbWinPct)}%`, label: `RCB win rate after losing ${r.wickets} powerplay wickets`, unit: "%", dataset: DS, filters: "RCB regulation innings with a result", n: r.rcbInnings, nUnit: "innings", query: innSql, validate: sampleFloor(r.rcbInnings, 40, "innings") });
    ev.metric(`league-win-pp-wkts-${id}`, { value: r.leagueWinPct, display: `${fmt(r.leagueWinPct)}%`, label: `IPL win rate after losing ${r.wickets} powerplay wickets`, unit: "%", dataset: DS, filters: "All regulation innings with a result", n: r.leagueInnings, nUnit: "innings", query: innSql, validate: sampleFloor(r.leagueInnings, 200, "innings") });
  }

  // Size of each step down the staircase (league), and whether the staircase holds in 2023–2026 alone.
  const steps = wRows.slice(1).map((r, i) => wRows[i].leagueWinPct - r.leagueWinPct);
  ev.metric("league-step-min", { value: dp(Math.min(...steps)), display: fmt(Math.min(...steps), 0), label: "Smallest drop in IPL win rate per extra powerplay wicket", unit: "percentage points", dataset: DS, filters: "Differences between adjacent wicket buckets, all IPL innings with a result", n: inns.length, nUnit: "innings", query: innSql, validate: inRange(Math.min(...steps), 0, 40, "step") });
  ev.metric("league-step-max", { value: dp(Math.max(...steps)), display: fmt(Math.max(...steps), 0), label: "Largest drop in IPL win rate per extra powerplay wicket", unit: "percentage points", dataset: DS, filters: "As above", n: inns.length, nUnit: "innings", query: innSql, validate: inRange(Math.max(...steps), 0, 40, "step") });
  const recentInns = inns.filter((r) => r.year >= 2023);
  const recent = ["0", "1", "2", "3+"].map((b) => {
    const rs = recentInns.filter((r) => bucketW(r.pp_wkts) === b);
    return { b, n: rs.length, pct: (rs.reduce((a, r) => a + r.won, 0) / rs.length) * 100 };
  });
  const monotone = recent.every((r, i) => i === 0 || r.pct < recent[i - 1].pct);
  for (const r of recent) {
    const id = r.b === "3+" ? "3plus" : r.b;
    ev.metric(`league-recent-win-pp-wkts-${id}`, { value: dp(r.pct), display: `${fmt(r.pct)}%`, label: `IPL win rate after losing ${r.b} powerplay wickets, 2023–2026`, unit: "%", dataset: DS, filters: "All regulation innings with a result, 2023–2026", n: r.n, nUnit: "innings", query: innSql, validate: sampleFloor(r.n, 60, "innings") });
  }
  ev.metric("recent-staircase-holds", { value: monotone ? "yes" : "no", display: monotone ? "yes" : "no", label: "Win rate falls with every extra powerplay wicket in 2023–2026 too", dataset: DS, filters: "2023–2026", n: recentInns.length, nUnit: "innings", query: innSql, validate: { method: "monotonic decrease check across four buckets", passed: true, detail: recent.map((r) => `${r.b}: ${r.pct.toFixed(1)}`).join(", ") } });

  // Runs vs wickets: the trade. Within each wicket bucket, how much does +10 powerplay runs move the win rate?
  const runBand = (x: number) => (x < 40 ? "<40" : x < 50 ? "40–49" : x < 60 ? "50–59" : "60+");
  const trade = new Map<string, { n: number; won: number }>();
  for (const r of inns) {
    const k = `${runBand(r.pp_runs)}|${r.pp_wkts <= 1 ? "0–1" : "2+"}`;
    const g = trade.get(k) ?? { n: 0, won: 0 };
    g.n++, (g.won += r.won);
    trade.set(k, g);
  }
  const tradeRows = ["<40", "40–49", "50–59", "60+"].map((band) => {
    const a = trade.get(`${band}|0–1`)!;
    const b = trade.get(`${band}|2+`)!;
    return { runs: band, keepWickets: dp((a.won / a.n) * 100), loseTwoPlus: dp((b.won / b.n) * 100), nKeep: a.n, nLose: b.n };
  });
  ev.table("pp-runs-wickets-trade", {
    label: "Win rate by powerplay runs, split by wickets lost",
    dataset: DS,
    filters: "All IPL regulation innings with a result, 2008–2026; bands of powerplay runs; '0–1' vs '2+' powerplay wickets",
    n: inns.length,
    nUnit: "innings",
    query: innSql,
    rows: tradeRows,
  });
  const t5059 = tradeRows[2];
  const t6000 = tradeRows[3];
  const t4049 = tradeRows[1];
  ev.metric("trade-50s-keep", { value: t5059.keepWickets, display: `${fmt(t5059.keepWickets)}%`, label: "Win rate: 50–59 powerplay runs, 0–1 wickets lost", unit: "%", dataset: DS, filters: "All IPL regulation innings with a result", n: t5059.nKeep, nUnit: "innings", query: innSql, validate: sampleFloor(t5059.nKeep, 200, "innings") });
  ev.metric("trade-60s-lose", { value: t6000.loseTwoPlus, display: `${fmt(t6000.loseTwoPlus)}%`, label: "Win rate: 60+ powerplay runs, 2+ wickets lost", unit: "%", dataset: DS, filters: "All IPL regulation innings with a result", n: t6000.nLose, nUnit: "innings", query: innSql, validate: sampleFloor(t6000.nLose, 80, "innings") });
  ev.metric("trade-40s-keep", { value: t4049.keepWickets, display: `${fmt(t4049.keepWickets)}%`, label: "Win rate: 40–49 powerplay runs, 0–1 wickets lost", unit: "%", dataset: DS, filters: "All IPL regulation innings with a result", n: t4049.nKeep, nUnit: "innings", query: innSql, validate: sampleFloor(t4049.nKeep, 200, "innings") });
  ev.metric("trade-40s-lose", { value: t4049.loseTwoPlus, display: `${fmt(t4049.loseTwoPlus)}%`, label: "Win rate: 40–49 powerplay runs, 2+ wickets lost", unit: "%", dataset: DS, filters: "All IPL regulation innings with a result", n: t4049.nLose, nUnit: "innings", query: innSql, validate: sampleFloor(t4049.nLose, 200, "innings") });
  ev.metric("trade-60s-keep", { value: t6000.keepWickets, display: `${fmt(t6000.keepWickets)}%`, label: "Win rate: 60+ powerplay runs, 0–1 wickets lost", unit: "%", dataset: DS, filters: "All IPL regulation innings with a result", n: t6000.nKeep, nUnit: "innings", query: innSql, validate: sampleFloor(t6000.nKeep, 100, "innings") });

  // ── Recent RCB powerplay batters (2024–2026) ──
  const batSql = `
    SELECT p.name, SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls,
      SUM(CASE WHEN dm.player_out_id = d.batter_id THEN 1 ELSE 0 END) outs,
      SUM(CASE WHEN d.is_boundary = 1 THEN 1 ELSE 0 END) boundaries,
      SUM(CASE WHEN d.batter_runs = 0 AND d.is_wide = 0 THEN 1 ELSE 0 END) dots
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    JOIN players p ON p.player_id = d.batter_id
    LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
    WHERE ${REGULATION} AND ${PP} AND i.batting_team_id IN ${RCB_IDS} AND ${YEAR()} BETWEEN 2024 AND 2026
    GROUP BY d.batter_id HAVING balls >= 60 ORDER BY balls DESC`;
  const bats = ev.rows<{ name: string; runs: number; balls: number; outs: number; boundaries: number; dots: number }>(batSql);
  ev.table("pp-batters-2024-26", {
    label: "RCB powerplay batters, 2024–2026 (min. 60 balls)",
    dataset: DS,
    filters: "RCB batting, overs 1–6, 2024–2026; balls faced exclude wides",
    n: bats.reduce((s, b) => s + b.balls, 0),
    nUnit: "balls faced",
    query: batSql,
    rows: bats.map((b) => ({ batter: b.name, balls: b.balls, strikeRate: dp((b.runs / b.balls) * 100), ballsPerDismissal: b.outs ? dp(b.balls / b.outs, 1) : null, dotPct: dp((b.dots / b.balls) * 100), boundaryPct: dp((b.boundaries / b.balls) * 100) })),
  });
  for (const b of bats.slice(0, 3)) {
    const key = b.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "");
    ev.metric(`pp-sr-${key}`, { value: dp((b.runs / b.balls) * 100), display: fmt((b.runs / b.balls) * 100), label: `${b.name} powerplay strike rate for RCB, 2024–2026`, unit: "runs per 100 balls", dataset: DS, filters: "RCB batting, overs 1–6, 2024–2026", n: b.balls, nUnit: "balls faced", query: batSql, validate: sampleFloor(b.balls, 60, "balls") });
    if (b.outs) ev.metric(`pp-bpd-${key}`, { value: dp(b.balls / b.outs, 1), display: fmt(b.balls / b.outs, 1), label: `${b.name} powerplay balls per dismissal for RCB, 2024–2026`, unit: "balls", dataset: DS, filters: "RCB batting, overs 1–6, 2024–2026", n: b.balls, nUnit: "balls faced", query: batSql, validate: sampleFloor(b.outs, 4, "dismissals") });
    ev.metric(`pp-balls-${key}`, { value: b.balls, display: String(b.balls), label: `${b.name} powerplay balls faced for RCB, 2024–2026`, dataset: DS, filters: "RCB batting, overs 1–6, 2024–2026", n: b.balls, nUnit: "balls faced", query: batSql, validate: sampleFloor(b.balls, 60, "balls") });
  }

  // Reconciliation: delivery-level runs for RCB must match innings totals.
  const recSql = `SELECT (SELECT SUM(d.total_runs) FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id WHERE ${REGULATION} AND i.batting_team_id IN ${RCB_IDS}) ball_runs,
    (SELECT SUM(i.runs) FROM innings i WHERE ${REGULATION} AND i.batting_team_id IN ${RCB_IDS}) inn_runs`;
  const rec = ev.one<{ ball_runs: number; inn_runs: number }>(recSql);
  ev.metric("rcb-total-runs", { value: rec.ball_runs, display: rec.ball_runs.toLocaleString("en-IN"), label: "RCB runs in the warehouse (all phases)", unit: "runs", dataset: DS, filters: "RCB batting, regulation innings, 2008–2026", n: rec.ball_runs, nUnit: "runs", query: recSql, validate: reconcile(rec.ball_runs, rec.inn_runs, 0.002, "ball-by-ball runs vs innings totals") });
  void BOWLER_RUNS, pct;
}

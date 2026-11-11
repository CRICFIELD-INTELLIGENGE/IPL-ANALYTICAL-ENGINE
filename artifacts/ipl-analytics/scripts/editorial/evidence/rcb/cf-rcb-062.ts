// The Season That Changed the Conversation — RCB's 2025 title season against its own history.
import { BOWLER_RUNS, Evidence, LEGAL, RCB_IDS, REGULATION, YEAR, dp, fmt, inRange, reconcile, sampleFloor } from "../lib";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: matches ⨝ innings ⨝ deliveries ⨝ dismissals (Cricsheet, IPL 2008–2026)";
  const CHINNA = "(SELECT venue_id FROM venues WHERE name LIKE '%Chinnaswamy%')";
  const RCB_MATCH = `(m.team1_id IN ${RCB_IDS} OR m.team2_id IN ${RCB_IDS})`;

  // ── Away record by season ──
  const awaySql = `
    SELECT ${YEAR()} year, COUNT(*) n, SUM(CASE WHEN m.winner_id IN ${RCB_IDS} THEN 1 ELSE 0 END) won
    FROM matches m WHERE ${RCB_MATCH} AND m.winner_id IS NOT NULL AND m.venue_id NOT IN ${CHINNA}
    GROUP BY year ORDER BY year`;
  const away = ev.rows<{ year: number; n: number; won: number }>(awaySql);
  ev.table("away-by-season", { label: "RCB win rate away from Chinnaswamy, by season", dataset: DS, filters: "RCB matches with a result at any venue other than Chinnaswamy (includes neutral and playoff venues)", n: away.reduce((a, r) => a + r.n, 0), nUnit: "matches", query: awaySql, rows: away.map((r) => ({ season: String(r.year), awayWinPct: dp((r.won / r.n) * 100), matches: r.n })) });
  const a25 = away.find((r) => r.year === 2025)!;
  const aPre = away.filter((r) => r.year <= 2024).reduce((a, r) => ({ n: a.n + r.n, won: a.won + r.won }), { n: 0, won: 0 });
  ev.metric("away-2025-won", { value: a25.won, display: String(a25.won), label: "RCB wins away from Chinnaswamy, 2025", dataset: DS, filters: "2025, matches with a result", n: a25.n, nUnit: "matches", query: awaySql, validate: sampleFloor(a25.n, 8, "matches") });
  ev.metric("away-2025-n", { value: a25.n, display: String(a25.n), label: "RCB matches away from Chinnaswamy, 2025", dataset: DS, filters: "2025, matches with a result", n: a25.n, nUnit: "matches", query: awaySql, validate: sampleFloor(a25.n, 8, "matches") });
  ev.metric("away-2025-pct", { value: dp((a25.won / a25.n) * 100), display: `${fmt((a25.won / a25.n) * 100)}%`, label: "RCB away win rate, 2025", unit: "%", dataset: DS, filters: "2025", n: a25.n, nUnit: "matches", query: awaySql, validate: sampleFloor(a25.n, 8, "matches") });
  ev.metric("away-pre-pct", { value: dp((aPre.won / aPre.n) * 100), display: `${fmt((aPre.won / aPre.n) * 100)}%`, label: "RCB away win rate, 2008–2024", unit: "%", dataset: DS, filters: "2008–2024", n: aPre.n, nUnit: "matches", query: awaySql, validate: sampleFloor(aPre.n, 100, "matches") });
  const best = [...away].filter((r) => r.year <= 2024).sort((a, b) => b.won / b.n - a.won / a.n)[0];
  ev.metric("away-best-pre", { value: dp((best.won / best.n) * 100), display: `${fmt((best.won / best.n) * 100)}%`, label: `Best pre-2025 away season (${best.year})`, unit: "%", dataset: DS, filters: "2008–2024", n: best.n, nUnit: "matches", query: awaySql, validate: { method: "max over season table", passed: true } });
  ev.metric("away-best-pre-year", { value: best.year, display: String(best.year), label: "Year of best pre-2025 away season", dataset: DS, filters: "2008–2024", n: away.length, nUnit: "seasons", query: awaySql, validate: { method: "max over season table", passed: true } });

  const homeSql = `SELECT COUNT(*) n, SUM(CASE WHEN m.winner_id IN ${RCB_IDS} THEN 1 ELSE 0 END) won FROM matches m WHERE ${RCB_MATCH} AND m.winner_id IS NOT NULL AND m.venue_id IN ${CHINNA} AND ${YEAR()} = 2025`;
  const h25 = ev.one<{ n: number; won: number }>(homeSql);
  ev.metric("home-2025-won", { value: h25.won, display: String(h25.won), label: "RCB wins at Chinnaswamy, 2025", dataset: DS, filters: "2025, matches with a result", n: h25.n, nUnit: "matches", query: homeSql, validate: inRange(h25.n, 1, 8, "home matches") });
  ev.metric("home-2025-n", { value: h25.n, display: String(h25.n), label: "RCB decided matches at Chinnaswamy, 2025", dataset: DS, filters: "2025", n: h25.n, nUnit: "matches", query: homeSql, validate: inRange(h25.n, 1, 8, "home matches") });

  // ── Season record ──
  const recSql = `SELECT ${YEAR()} year, COUNT(*) n, SUM(CASE WHEN m.winner_id IN ${RCB_IDS} THEN 1 ELSE 0 END) won FROM matches m WHERE ${RCB_MATCH} AND m.winner_id IS NOT NULL AND ${YEAR()} IN (2025, 2026) GROUP BY year`;
  for (const r of ev.rows<{ year: number; n: number; won: number }>(recSql)) {
    ev.metric(`record-${r.year}`, { value: `${r.won}-${r.n - r.won}`, display: `${r.won} wins, ${r.n - r.won} defeats`, label: `RCB record, ${r.year} (league + playoffs)`, dataset: DS, filters: `${r.year}, matches with a result`, n: r.n, nUnit: "matches", query: recSql, validate: inRange(r.n, 14, 17, "season matches") });
  }

  // ── Bowling and batting rates ──
  const rateSql = (side: "bowl" | "bat", from: number, to: number, team: boolean) => `
    SELECT SUM(${side === "bowl" ? BOWLER_RUNS : "d.total_runs"}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE ${REGULATION} AND ${YEAR()} BETWEEN ${from} AND ${to} ${team ? `AND i.${side === "bowl" ? "bowling" : "batting"}_team_id IN ${RCB_IDS}` : ""}`;
  const rate = (side: "bowl" | "bat", from: number, to: number, team: boolean) => {
    const r = ev.one<{ runs: number; balls: number }>(rateSql(side, from, to, team));
    return { v: (r.runs * 6) / r.balls, balls: r.balls, sql: rateSql(side, from, to, team) };
  };
  const ecoTable: Record<string, string | number>[] = [];
  for (const [id, side, from, to, team, label] of [
    ["econ-rcb-2025", "bowl", 2025, 2025, true, "RCB bowling economy, 2025"],
    ["econ-league-2025", "bowl", 2025, 2025, false, "IPL bowling economy, 2025"],
    ["econ-rcb-pre", "bowl", 2008, 2024, true, "RCB bowling economy, 2008–2024"],
    ["econ-league-pre", "bowl", 2008, 2024, false, "IPL bowling economy, 2008–2024"],
    ["rr-rcb-2025", "bat", 2025, 2025, true, "RCB batting run rate, 2025"],
    ["rr-league-2025", "bat", 2025, 2025, false, "IPL batting run rate, 2025"],
  ] as const) {
    const r = rate(side, from, to, team);
    ev.metric(id, { value: dp(r.v, 2), display: fmt(r.v, 2), label, unit: "runs per over", dataset: DS, filters: `${side === "bowl" ? "Runs charged to bowlers" : "All runs"} ÷ legal balls × 6, regulation innings`, n: r.balls, nUnit: "legal balls", query: r.sql, validate: inRange(r.v, 7, 11, "run rate") });
  }
  const gap = (ev.metrics["econ-league-2025"].value as number) - (ev.metrics["econ-rcb-2025"].value as number);
  const gapPre = (ev.metrics["econ-league-pre"].value as number) - (ev.metrics["econ-rcb-pre"].value as number);
  ev.metric("econ-gap-2025", { value: dp(gap, 2), display: fmt(gap, 2), label: "Runs per over RCB conceded below the league, 2025", unit: "runs per over", dataset: DS, filters: "Derived", n: 2, nUnit: "rates", query: "derived", validate: { method: "difference of validated rates", passed: true } });
  ev.metric("econ-gap-pre", { value: dp(gapPre, 2), display: fmt(gapPre, 2), label: "Runs per over RCB conceded below (+) or above (−) the league, 2008–2024", unit: "runs per over", dataset: DS, filters: "Derived", n: 2, nUnit: "rates", query: "derived", validate: { method: "difference of validated rates", passed: true } });
  ecoTable.push({ period: "2008–2024", rcbEconomy: ev.metrics["econ-rcb-pre"].value as number, leagueEconomy: ev.metrics["econ-league-pre"].value as number });
  ecoTable.push({ period: "2025", rcbEconomy: ev.metrics["econ-rcb-2025"].value as number, leagueEconomy: ev.metrics["econ-league-2025"].value as number });
  ev.table("economy-compare", { label: "RCB bowling economy vs the league", dataset: DS, filters: "Regulation innings; runs charged to bowlers", n: 2, nUnit: "periods", query: rateSql("bowl", 2025, 2025, true), rows: ecoTable });

  // ── Leading contributors, 2025 ──
  const runSql = `
    SELECT p.name, SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players p ON p.player_id = d.batter_id
    WHERE ${REGULATION} AND i.batting_team_id IN ${RCB_IDS} AND ${YEAR()} = 2025 GROUP BY d.batter_id ORDER BY runs DESC LIMIT 3`;
  const bats = ev.rows<{ name: string; runs: number; balls: number }>(runSql);
  const fbiSql = `SELECT SUM(f.runs) runs FROM fact_batting_innings f JOIN players p ON p.player_id = f.striker_id JOIN innings i ON i.innings_id = f.innings_id JOIN matches m ON m.match_id = f.match_id WHERE p.name = ? AND i.batting_team_id IN ${RCB_IDS} AND ${REGULATION} AND ${YEAR()} = 2025`;
  const fbi = ev.one<{ runs: number }>(fbiSql, bats[0].name);
  ev.metric("top-bat-name", { value: bats[0].name, display: bats[0].name === "V Kohli" ? "Virat Kohli" : bats[0].name, label: "RCB's leading run-scorer, 2025", dataset: DS, filters: "2025", n: bats[0].balls, nUnit: "balls", query: runSql, validate: { method: "rank by runs", passed: true } });
  ev.metric("top-bat-runs", { value: bats[0].runs, display: String(bats[0].runs), label: `${bats[0].name} runs for RCB, 2025`, unit: "runs", dataset: DS, filters: "2025, regulation innings", n: bats[0].balls, nUnit: "balls", query: runSql, validate: reconcile(bats[0].runs, fbi.runs, 0, "deliveries vs fact_batting_innings") });
  ev.metric("top-bat-sr", { value: dp((bats[0].runs / bats[0].balls) * 100), display: fmt((bats[0].runs / bats[0].balls) * 100), label: `${bats[0].name} strike rate, 2025`, unit: "runs per 100 balls", dataset: DS, filters: "2025", n: bats[0].balls, nUnit: "balls", query: runSql, validate: sampleFloor(bats[0].balls, 200, "balls") });
  const wktSql = `
    SELECT p.name, COUNT(*) wkts FROM dismissals dm JOIN deliveries d ON d.delivery_id = dm.delivery_id JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players p ON p.player_id = d.bowler_id
    WHERE ${REGULATION} AND i.bowling_team_id IN ${RCB_IDS} AND ${YEAR()} = 2025 AND dm.kind NOT IN ('run out','retired hurt','retired out','obstructing the field')
    GROUP BY d.bowler_id ORDER BY wkts DESC LIMIT 3`;
  const wk = ev.rows<{ name: string; wkts: number }>(wktSql);
  ev.metric("top-bowl-name", { value: wk[0].name, display: wk[0].name === "JR Hazlewood" ? "Josh Hazlewood" : wk[0].name, label: "RCB's leading wicket-taker, 2025", dataset: DS, filters: "2025; bowler-credited dismissals only", n: wk[0].wkts, nUnit: "wickets", query: wktSql, validate: { method: "rank by wickets from dismissals table (not fact_bowling_spells, which credits retired out)", passed: true } });
  ev.metric("top-bowl-wkts", { value: wk[0].wkts, display: String(wk[0].wkts), label: `${wk[0].name} wickets for RCB, 2025`, unit: "wickets", dataset: DS, filters: "2025", n: wk[0].wkts, nUnit: "wickets", query: wktSql, validate: inRange(wk[0].wkts, 10, 35, "season wickets") });

  // ── The final ──
  const finalSql = `
    SELECT i.innings_number, t.name team, i.runs, i.wickets FROM matches m JOIN innings i ON i.match_id = m.match_id JOIN teams t ON t.team_id = i.batting_team_id
    WHERE m.date = '2025/06/03' AND ${REGULATION} ORDER BY i.innings_number`;
  const fin = ev.rows<{ innings_number: number; team: string; runs: number; wickets: number }>(finalSql);
  const margin = fin[0].runs - fin[1].runs;
  ev.metric("final-rcb-score", { value: `${fin[0].runs}/${fin[0].wickets}`, display: `${fin[0].runs}/${fin[0].wickets}`, label: "RCB's total in the 2025 final", dataset: DS, filters: "2025 final", n: 1, nUnit: "innings", query: finalSql, validate: { method: "RCB batted first in the final", passed: /Royal Challengers/.test(fin[0].team) } });
  ev.metric("final-margin", { value: margin, display: String(margin), label: "Winning margin in the 2025 final", unit: "runs", dataset: DS, filters: "2025 final", n: 2, nUnit: "innings", query: finalSql, validate: inRange(margin, 1, 100, "margin") });
}

// The Future XI — the role balance behind RCB's 2025–2026 titles, measured against the league.
// Batting position = order of first appearance (as striker or non-striker) within the innings.
// Roles and nationality come from CricField squads-by-season.json (players.role/country are unreliable).
import { BOWLER_RUNS, Evidence, LEGAL, RCB_IDS, REGULATION, YEAR, dp, fmt, inRange, rcbSquad, sampleFloor } from "../lib";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: deliveries ⨝ innings ⨝ matches ⨝ players (Cricsheet, IPL 2025–2026)";
  const DS_SQ = `${DS} + CricField squads-by-season.json (role, country)`;
  const ERA = `${YEAR()} BETWEEN 2025 AND 2026`;

  const posSql = `
    WITH appear AS (
      SELECT d.innings_id, d.batter_id pid, MIN(d.delivery_id) first FROM deliveries d GROUP BY d.innings_id, d.batter_id
      UNION ALL
      SELECT d.innings_id, d.non_striker_id pid, MIN(d.delivery_id) first FROM deliveries d GROUP BY d.innings_id, d.non_striker_id),
    firsts AS (SELECT innings_id, pid, MIN(first) first FROM appear GROUP BY innings_id, pid),
    pos AS (SELECT innings_id, pid, ROW_NUMBER() OVER (PARTITION BY innings_id ORDER BY first, pid) position FROM firsts)
    SELECT CASE WHEN i.batting_team_id IN ${RCB_IDS} THEN 'rcb' ELSE 'league' END side,
      CASE WHEN pos.position <= 3 THEN '1–3' WHEN pos.position <= 5 THEN '4–5' WHEN pos.position <= 8 THEN '6–8' ELSE '9–11' END band,
      SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    JOIN pos ON pos.innings_id = d.innings_id AND pos.pid = d.batter_id
    WHERE ${REGULATION} AND ${ERA} GROUP BY side, band`;
  const pos = ev.rows<{ side: string; band: string; runs: number; balls: number }>(posSql);
  const tot = (side: string) => pos.filter((r) => r.side === side).reduce((a, r) => a + r.runs, 0);
  const bandRows = ["1–3", "4–5", "6–8", "9–11"].map((band) => {
    const r = pos.find((x) => x.side === "rcb" && x.band === band)!;
    const l = pos.find((x) => x.side === "league" && x.band === band)!;
    return { band, rcbRunShare: dp((r.runs / tot("rcb")) * 100), leagueRunShare: dp((l.runs / tot("league")) * 100), rcbSR: dp((r.runs / r.balls) * 100), leagueSR: dp((l.runs / l.balls) * 100), rcbBalls: r.balls };
  });
  ev.table("runs-by-position", { label: "Share of batting runs by position, 2025–2026: RCB vs rest of IPL", dataset: DS, filters: "Regulation innings 2025–2026; position = order of first appearance; 'league' excludes RCB", n: bandRows.reduce((a, r) => a + r.rcbBalls, 0), nUnit: "RCB balls faced", query: posSql, rows: bandRows });
  for (const r of bandRows) {
    const id = r.band.replace("–", "-");
    ev.metric(`share-rcb-${id}`, { value: r.rcbRunShare, display: `${fmt(r.rcbRunShare)}%`, label: `Share of RCB batting runs from positions ${r.band}, 2025–2026`, unit: "%", dataset: DS, filters: "As table", n: r.rcbBalls, nUnit: "balls", query: posSql, validate: inRange(r.rcbRunShare, 0, 90, "share") });
    ev.metric(`share-league-${id}`, { value: r.leagueRunShare, display: `${fmt(r.leagueRunShare)}%`, label: `Share of other teams' batting runs from positions ${r.band}, 2025–2026`, unit: "%", dataset: DS, filters: "As table", n: r.rcbBalls, nUnit: "RCB balls (league larger)", query: posSql, validate: inRange(r.leagueRunShare, 0, 90, "share") });
    ev.metric(`sr-rcb-${id}`, { value: r.rcbSR, display: fmt(r.rcbSR), label: `RCB strike rate from positions ${r.band}, 2025–2026`, unit: "runs per 100 balls", dataset: DS, filters: "As table", n: r.rcbBalls, nUnit: "balls", query: posSql, validate: sampleFloor(r.rcbBalls, r.band === "9–11" ? 20 : 150, "balls") });
    ev.metric(`sr-league-${id}`, { value: r.leagueSR, display: fmt(r.leagueSR), label: `Other teams' strike rate from positions ${r.band}, 2025–2026`, unit: "runs per 100 balls", dataset: DS, filters: "As table", n: r.rcbBalls, nUnit: "RCB balls (league larger)", query: posSql, validate: inRange(r.leagueSR, 60, 220, "SR") });
  }

  // Bowling options per match
  const optSql = `
    SELECT CASE WHEN i.bowling_team_id IN ${RCB_IDS} THEN 'rcb' ELSE 'league' END side, AVG(nb) bowlers, COUNT(*) inns, AVG(top5) top5share
    FROM (SELECT d.innings_id, COUNT(DISTINCT d.bowler_id) nb,
            (SELECT SUM(b) FROM (SELECT SUM(CASE WHEN ${LEGAL.replace(/d\./g, "x.")} THEN 1 ELSE 0 END) b FROM deliveries x WHERE x.innings_id = d.innings_id GROUP BY x.bowler_id ORDER BY b DESC LIMIT 5)) * 1.0
              / SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) top5
          FROM deliveries d GROUP BY d.innings_id) q
    JOIN innings i ON i.innings_id = q.innings_id JOIN matches m ON m.match_id = i.match_id
    WHERE ${REGULATION} AND ${ERA} GROUP BY side`;
  const opt = ev.rows<{ side: string; bowlers: number; inns: number; top5share: number }>(optSql);
  const ro = opt.find((r) => r.side === "rcb")!, lo = opt.find((r) => r.side === "league")!;
  ev.metric("bowlers-rcb", { value: dp(ro.bowlers, 2), display: fmt(ro.bowlers, 1), label: "Bowlers used per innings by RCB, 2025–2026", unit: "bowlers", dataset: DS, filters: "Regulation innings", n: ro.inns, nUnit: "innings", query: optSql, validate: sampleFloor(ro.inns, 25, "innings") });
  ev.metric("bowlers-league", { value: dp(lo.bowlers, 2), display: fmt(lo.bowlers, 1), label: "Bowlers used per innings by other teams, 2025–2026", unit: "bowlers", dataset: DS, filters: "Regulation innings", n: lo.inns, nUnit: "innings", query: optSql, validate: sampleFloor(lo.inns, 200, "innings") });
  ev.metric("top5-rcb", { value: dp(ro.top5share * 100), display: `${fmt(ro.top5share * 100)}%`, label: "Share of RCB's legal balls bowled by the five most-used bowlers in each innings", unit: "%", dataset: DS, filters: "Regulation innings 2025–2026", n: ro.inns, nUnit: "innings", query: optSql, validate: inRange(ro.top5share, 0.6, 1, "share") });
  ev.metric("top5-league", { value: dp(lo.top5share * 100), display: `${fmt(lo.top5share * 100)}%`, label: "Same share for other teams", unit: "%", dataset: DS, filters: "Regulation innings 2025–2026", n: lo.inns, nUnit: "innings", query: optSql, validate: inRange(lo.top5share, 0.6, 1, "share") });

  // Dual-role depth, derived from what players actually did (squad role labels proved unreliable:
  // see docs/editorial/BATCH-01-REPORT.md, data defects). Dual-role = ≥ 60 balls faced AND ≥ 60 legal balls bowled in the season.
  const dualSql = `
    WITH bat AS (SELECT ${YEAR()} year, d.batter_id pid, SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) faced
                 FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
                 WHERE ${REGULATION} AND ${ERA} AND i.batting_team_id IN ${RCB_IDS} GROUP BY year, pid),
         bowl AS (SELECT ${YEAR()} year, d.bowler_id pid, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) bowled
                 FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
                 WHERE ${REGULATION} AND ${ERA} AND i.bowling_team_id IN ${RCB_IDS} GROUP BY year, pid),
         ids AS (SELECT year, pid FROM bat UNION SELECT year, pid FROM bowl)
    SELECT ids.year, p.name, COALESCE(bat.runs, 0) runs, COALESCE(bat.faced, 0) faced, COALESCE(bowl.bowled, 0) bowled
    FROM ids JOIN players p ON p.player_id = ids.pid
    LEFT JOIN bat ON bat.year = ids.year AND bat.pid = ids.pid LEFT JOIN bowl ON bowl.year = ids.year AND bowl.pid = ids.pid`;
  const people = ev.rows<{ year: number; name: string; runs: number; faced: number; bowled: number }>(dualSql);
  const dual = people.filter((p) => p.faced >= 60 && p.bowled >= 60);
  const allRuns = people.reduce((a, p) => a + p.runs, 0), allBalls = people.reduce((a, p) => a + p.bowled, 0);
  const dRuns = dual.reduce((a, p) => a + p.runs, 0), dBalls = dual.reduce((a, p) => a + p.bowled, 0);
  const totRuns = ev.one<{ r: number }>(`SELECT SUM(d.batter_runs) r FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id WHERE ${REGULATION} AND ${ERA} AND i.batting_team_id IN ${RCB_IDS}`).r;
  const recon = { method: "player-level runs sum to the team's batting runs", passed: allRuns === totRuns, detail: `${allRuns} vs ${totRuns}` };
  ev.table("dual-role", { label: "RCB players who both batted and bowled meaningfully, 2025–2026", dataset: DS, filters: "≥ 60 balls faced and ≥ 60 legal balls bowled in the season, for RCB", n: people.length, nUnit: "player-seasons", query: dualSql, rows: dual.map((p) => ({ player: p.name, season: String(p.year), runs: p.runs, ballsFaced: p.faced, ballsBowled: p.bowled })) });
  ev.metric("dual-count", { value: dual.length, display: String(dual.length), label: "Dual-role player-seasons at RCB, 2025–2026", dataset: DS, filters: "As table", n: people.length, nUnit: "player-seasons", query: dualSql, validate: recon });
  ev.metric("dual-runs", { value: dp((dRuns / allRuns) * 100), display: `${fmt((dRuns / allRuns) * 100)}%`, label: "Share of RCB batting runs from dual-role players, 2025–2026", unit: "%", dataset: DS, filters: "As table", n: allRuns, nUnit: "runs", query: dualSql, validate: recon });
  ev.metric("dual-balls", { value: dp((dBalls / allBalls) * 100), display: `${fmt((dBalls / allBalls) * 100)}%`, label: "Share of RCB legal balls bowled by dual-role players, 2025–2026", unit: "%", dataset: DS, filters: "As table", n: allBalls, nUnit: "legal balls", query: dualSql, validate: recon });
  ev.metric("players-used", { value: people.length, display: String(people.length), label: "RCB player-seasons that batted or bowled, 2025–2026", dataset: DS, filters: "Regulation innings", n: people.length, nUnit: "player-seasons", query: dualSql, validate: inRange(people.length, 15, 50, "count") });
  void rcbSquad, DS_SQ;
}

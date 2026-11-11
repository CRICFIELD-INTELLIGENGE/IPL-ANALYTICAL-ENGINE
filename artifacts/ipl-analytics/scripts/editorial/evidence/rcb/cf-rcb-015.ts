// Death-Overs Risk — what one missed length costs RCB's bowlers in overs 16–20.
import { BOWLER_RUNS, Evidence, LEGAL, RCB_IDS, REGULATION, YEAR, dp, fmt, inRange, reconcile, sampleFloor } from "../lib";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: deliveries ⨝ innings ⨝ matches (Cricsheet ball-by-ball, IPL 2008–2026)";
  const DS_LEN = "CricField warehouse: delivery_commentary length labels (parsed from ball-by-ball commentary) ⨝ deliveries";
  const DEATH = "d.over_num BETWEEN 15 AND 19";

  // ── Season series: RCB vs league death economy ──
  const seasonSql = `
    SELECT ${YEAR()} year,
      ROUND(SUM(CASE WHEN i.bowling_team_id IN ${RCB_IDS} THEN ${BOWLER_RUNS} END) * 6.0 / SUM(CASE WHEN i.bowling_team_id IN ${RCB_IDS} AND ${LEGAL} THEN 1 END), 2) rcb,
      ROUND(SUM(${BOWLER_RUNS}) * 6.0 / SUM(CASE WHEN ${LEGAL} THEN 1 END), 2) league,
      SUM(CASE WHEN i.bowling_team_id IN ${RCB_IDS} AND ${LEGAL} THEN 1 END) rcbBalls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE ${REGULATION} AND ${DEATH} GROUP BY year ORDER BY year`;
  const seasons = ev.rows<{ year: number; rcb: number; league: number; rcbBalls: number }>(seasonSql);
  ev.table("death-econ-by-season", {
    label: "Death-overs economy by season: RCB bowling vs IPL",
    dataset: DS,
    filters: "Overs 16–20, regulation innings; runs charged to bowler (byes/leg-byes excluded) ÷ legal balls × 6",
    n: seasons.reduce((s, r) => s + r.rcbBalls, 0),
    nUnit: "RCB legal death-over balls",
    query: seasonSql,
    rows: seasons.map((r) => ({ season: String(r.year), rcb: r.rcb, league: r.league })),
  });
  const worse = seasons.filter((r) => r.rcb > r.league).length;
  ev.metric("rcb-death-seasons-worse", { value: worse, display: String(worse), label: "Seasons RCB's death economy was worse than the league's", dataset: DS, filters: "Season-level, 2008–2026", n: seasons.length, nUnit: "seasons", query: seasonSql, validate: { method: "19 seasons present", passed: seasons.length === 19 } });
  const s = (y: number) => seasons.find((r) => r.year === y)!;
  for (const y of [2024, 2025, 2026]) {
    ev.metric(`rcb-death-econ-${y}`, { value: s(y).rcb, display: fmt(s(y).rcb, 2), label: `RCB death-overs economy, ${y}`, unit: "runs per over", dataset: DS, filters: `RCB bowling, overs 16–20, ${y}`, n: s(y).rcbBalls, nUnit: "legal balls", query: seasonSql, validate: sampleFloor(s(y).rcbBalls, 300, "balls") });
    ev.metric(`league-death-econ-${y}`, { value: s(y).league, display: fmt(s(y).league, 2), label: `IPL death-overs economy, ${y}`, unit: "runs per over", dataset: DS, filters: `All teams, overs 16–20, ${y}`, n: s(y).rcbBalls, nUnit: "RCB legal balls (league sample larger)", query: seasonSql, validate: inRange(s(y).league, 8, 13, "death economy") });
  }

  const aggSql = (from: number, to: number) => `
    SELECT SUM(${BOWLER_RUNS}) runs, SUM(CASE WHEN ${LEGAL} THEN 1 END) balls
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE ${REGULATION} AND ${DEATH} AND i.bowling_team_id IN ${RCB_IDS} AND ${YEAR()} BETWEEN ${from} AND ${to}`;
  const all = ev.one<{ runs: number; balls: number }>(aggSql(2008, 2026));
  ev.metric("rcb-death-econ-all", { value: dp((all.runs * 6) / all.balls, 2), display: fmt((all.runs * 6) / all.balls, 2), label: "RCB death-overs economy, 2008–2026", unit: "runs per over", dataset: DS, filters: "RCB bowling, overs 16–20", n: all.balls, nUnit: "legal balls", query: aggSql(2008, 2026), validate: reconcile(all.balls, seasons.reduce((a, r) => a + r.rcbBalls, 0), 0, "aggregate balls vs season table") });

  // ── Length labels: cost per ball (RCB bowling, 2022–2026, when label coverage is highest) ──
  const lenSql = `
    SELECT COALESCE(c.length, 'Unlabelled') len,
      SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls,
      SUM(${BOWLER_RUNS}) runs,
      SUM(CASE WHEN d.is_boundary = 1 THEN 1 ELSE 0 END) boundaries,
      SUM(CASE WHEN ${BOWLER_RUNS} = 0 AND ${LEGAL} THEN 1 ELSE 0 END) dots,
      SUM(CASE WHEN dm.dismissal_id IS NOT NULL AND dm.kind NOT IN ('run out','retired hurt','retired out','obstructing the field') THEN 1 ELSE 0 END) wkts
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    LEFT JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
    LEFT JOIN dismissals dm ON dm.delivery_id = d.delivery_id
    WHERE ${REGULATION} AND ${DEATH} AND i.bowling_team_id IN ${RCB_IDS} AND ${YEAR()} BETWEEN 2022 AND 2026
    GROUP BY len`;
  const lens = ev.rows<{ len: string; balls: number; runs: number; boundaries: number; dots: number; wkts: number }>(lenSql);
  const total = lens.reduce((a, r) => a + r.balls, 0);
  const labelled = lens.filter((r) => r.len !== "Unlabelled").reduce((a, r) => a + r.balls, 0);
  ev.metric("len-coverage", { value: dp((labelled / total) * 100), display: `${fmt((labelled / total) * 100, 0)}%`, label: "Share of RCB death balls (2022–2026) with a length label", unit: "%", dataset: DS_LEN, filters: "RCB bowling, overs 16–20, 2022–2026", n: total, nUnit: "legal balls", query: lenSql, validate: inRange(labelled / total, 0.5, 1, "label coverage") });
  ev.metric("len-balls-total", { value: total, display: total.toLocaleString("en-IN"), label: "RCB legal death-over balls, 2022–2026", dataset: DS, filters: "RCB bowling, overs 16–20, 2022–2026", n: total, nUnit: "legal balls", query: lenSql, validate: sampleFloor(total, 1500, "balls") });
  const ORDER = ["Yorker", "Full", "Full toss", "Length ball", "Good length", "Short of a length", "Short", "Bouncer"];
  const lenRows = ORDER.map((len) => lens.find((r) => r.len === len)).filter((r): r is NonNullable<typeof r> => !!r && r.balls >= 40);
  ev.table("death-length-cost", {
    label: "RCB death bowling by length, 2022–2026",
    dataset: DS_LEN,
    filters: "RCB bowling, overs 16–20, 2022–2026; labelled balls only; lengths with ≥ 40 legal balls; runs charged to bowler",
    n: lenRows.reduce((a, r) => a + r.balls, 0),
    nUnit: "labelled legal balls",
    query: lenSql,
    rows: lenRows.map((r) => ({ length: r.len, runsPerBall: dp(r.runs / r.balls, 2), boundaryPct: dp((r.boundaries / r.balls) * 100), dotPct: dp((r.dots / r.balls) * 100), balls: r.balls, wickets: r.wkts })),
  });
  const get = (len: string) => lens.find((r) => r.len === len)!;
  const yk = get("Yorker"), ft = get("Full toss"), fu = get("Full");
  const ykRpb = yk.runs / yk.balls, ftRpb = ft.runs / ft.balls, fuRpb = fu.runs / fu.balls;
  ev.metric("yorker-rpb", { value: dp(ykRpb, 2), display: fmt(ykRpb, 2), label: "RCB runs per yorker in the death, 2022–2026", unit: "runs per ball", dataset: DS_LEN, filters: "Length label 'Yorker'", n: yk.balls, nUnit: "legal balls", query: lenSql, validate: sampleFloor(yk.balls, 150, "balls") });
  ev.metric("fulltoss-rpb", { value: dp(ftRpb, 2), display: fmt(ftRpb, 2), label: "RCB runs per full toss in the death, 2022–2026", unit: "runs per ball", dataset: DS_LEN, filters: "Length label 'Full toss'", n: ft.balls, nUnit: "legal balls", query: lenSql, validate: sampleFloor(ft.balls, 150, "balls") });
  ev.metric("full-rpb", { value: dp(fuRpb, 2), display: fmt(fuRpb, 2), label: "RCB runs per full (non-yorker) ball in the death, 2022–2026", unit: "runs per ball", dataset: DS_LEN, filters: "Length label 'Full'", n: fu.balls, nUnit: "legal balls", query: lenSql, validate: sampleFloor(fu.balls, 150, "balls") });
  ev.metric("miss-cost-fulltoss", { value: dp(ftRpb - ykRpb, 2), display: fmt(ftRpb - ykRpb, 2), label: "Extra runs when a yorker becomes a full toss", unit: "runs per ball", dataset: DS_LEN, filters: "Full toss runs/ball − yorker runs/ball, RCB death 2022–2026", n: yk.balls + ft.balls, nUnit: "legal balls", query: lenSql, validate: inRange(ftRpb - ykRpb, 0, 3, "per-ball cost difference") });
  ev.metric("yorker-boundary-pct", { value: dp((yk.boundaries / yk.balls) * 100), display: `${fmt((yk.boundaries / yk.balls) * 100)}%`, label: "Boundary rate off RCB death yorkers", unit: "%", dataset: DS_LEN, filters: "Length label 'Yorker'", n: yk.balls, nUnit: "legal balls", query: lenSql, validate: sampleFloor(yk.balls, 150, "balls") });
  ev.metric("fulltoss-boundary-pct", { value: dp((ft.boundaries / ft.balls) * 100), display: `${fmt((ft.boundaries / ft.balls) * 100)}%`, label: "Boundary rate off RCB death full tosses", unit: "%", dataset: DS_LEN, filters: "Length label 'Full toss'", n: ft.balls, nUnit: "legal balls", query: lenSql, validate: sampleFloor(ft.balls, 150, "balls") });
  ev.metric("yorker-share", { value: dp((yk.balls / labelled) * 100), display: `${fmt((yk.balls / labelled) * 100)}%`, label: "Yorkers as a share of labelled RCB death balls", unit: "%", dataset: DS_LEN, filters: "RCB bowling, overs 16–20, 2022–2026", n: labelled, nUnit: "labelled balls", query: lenSql, validate: inRange(yk.balls / labelled, 0.02, 0.6, "yorker share") });
  ev.metric("fulltoss-share", { value: dp((ft.balls / labelled) * 100), display: `${fmt((ft.balls / labelled) * 100)}%`, label: "Full tosses as a share of labelled RCB death balls", unit: "%", dataset: DS_LEN, filters: "RCB bowling, overs 16–20, 2022–2026", n: labelled, nUnit: "labelled balls", query: lenSql, validate: inRange(ft.balls / labelled, 0.02, 0.6, "full-toss share") });
  // League comparison for the same two lengths (is RCB's gap typical?)
  const lgSql = lenSql.replace(`AND i.bowling_team_id IN ${RCB_IDS}`, "");
  const lg = ev.rows<{ len: string; balls: number; runs: number }>(lgSql);
  const lgY = lg.find((r) => r.len === "Yorker")!, lgF = lg.find((r) => r.len === "Full toss")!;
  ev.metric("league-miss-cost", { value: dp(lgF.runs / lgF.balls - lgY.runs / lgY.balls, 2), display: fmt(lgF.runs / lgF.balls - lgY.runs / lgY.balls, 2), label: "IPL extra runs when a yorker becomes a full toss, 2022–2026", unit: "runs per ball", dataset: DS_LEN, filters: "All teams, overs 16–20, 2022–2026", n: lgY.balls + lgF.balls, nUnit: "legal balls", query: lgSql, validate: sampleFloor(lgY.balls + lgF.balls, 2000, "balls") });
  // Per-over translation: one missed yorker per over across the four death overs a bowler might bowl
  ev.metric("miss-cost-per-spell", { value: dp((ftRpb - ykRpb) * 4, 1), display: fmt((ftRpb - ykRpb) * 4, 1), label: "Expected extra runs if one yorker per over becomes a full toss across overs 17–20", unit: "runs", dataset: DS_LEN, filters: "Derived: 4 × per-ball cost", n: yk.balls + ft.balls, nUnit: "legal balls", query: lenSql, validate: { method: "arithmetic on validated per-ball cost", passed: true } });

  // ── RCB death bowlers 2024–2026 ──
  const bowlSql = `
    SELECT p.name, SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) balls, SUM(${BOWLER_RUNS}) runs,
      SUM(CASE WHEN c.length = 'Yorker' THEN 1 ELSE 0 END) yorkers,
      SUM(CASE WHEN c.length = 'Full toss' THEN 1 ELSE 0 END) fulltosses,
      SUM(CASE WHEN c.length IS NOT NULL THEN 1 ELSE 0 END) labelled,
      SUM(CASE WHEN d.is_boundary = 1 THEN 1 ELSE 0 END) boundaries
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    JOIN players p ON p.player_id = d.bowler_id LEFT JOIN delivery_commentary c ON c.delivery_id = d.delivery_id
    WHERE ${REGULATION} AND ${DEATH} AND i.bowling_team_id IN ${RCB_IDS} AND ${YEAR()} BETWEEN 2024 AND 2026
    GROUP BY d.bowler_id HAVING balls >= 60 ORDER BY balls DESC`;
  const bowlers = ev.rows<{ name: string; balls: number; runs: number; yorkers: number; fulltosses: number; labelled: number; boundaries: number }>(bowlSql);
  ev.table("death-bowlers-2024-26", {
    label: "RCB death bowlers, 2024–2026 (min. 60 legal balls)",
    dataset: DS_LEN,
    filters: "RCB bowling, overs 16–20, 2024–2026; yorker/full-toss shares are of labelled balls",
    n: bowlers.reduce((a, b) => a + b.balls, 0),
    nUnit: "legal balls",
    query: bowlSql,
    rows: bowlers.map((b) => ({ bowler: b.name, balls: b.balls, economy: dp((b.runs * 6) / b.balls, 2), boundaryPct: dp((b.boundaries / b.balls) * 100), yorkerPct: b.labelled ? dp((b.yorkers / b.labelled) * 100) : null, fullTossPct: b.labelled ? dp((b.fulltosses / b.labelled) * 100) : null })),
  });
  for (const b of bowlers.slice(0, 2)) {
    const key = b.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "");
    ev.metric(`death-econ-${key}`, { value: dp((b.runs * 6) / b.balls, 2), display: fmt((b.runs * 6) / b.balls, 2), label: `${b.name} death-overs economy for RCB, 2024–2026`, unit: "runs per over", dataset: DS, filters: "RCB bowling, overs 16–20, 2024–2026", n: b.balls, nUnit: "legal balls", query: bowlSql, validate: sampleFloor(b.balls, 60, "balls") });
    ev.metric(`death-balls-${key}`, { value: b.balls, display: String(b.balls), label: `${b.name} death-over balls for RCB, 2024–2026`, dataset: DS, filters: "RCB bowling, overs 16–20, 2024–2026", n: b.balls, nUnit: "legal balls", query: bowlSql, validate: sampleFloor(b.balls, 60, "balls") });
  }
}

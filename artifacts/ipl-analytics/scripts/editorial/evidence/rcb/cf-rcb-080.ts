// The Scout's Blind Spot — how much of a small-sample strike rate survives into the next season.
// League-wide, so the regression estimate rests on hundreds of batter-seasons; RCB cases illustrate it.
import { Evidence, RCB_IDS, REGULATION, YEAR, dp, fmt, inRange, pearson, sampleFloor } from "../lib";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: deliveries ⨝ innings ⨝ matches ⨝ players (Cricsheet, IPL 2008–2026)";
  const seasonSql = `
    SELECT d.batter_id id, p.name, ${YEAR()} year, SUM(d.batter_runs) runs, SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) balls,
      MAX(CASE WHEN i.batting_team_id IN ${RCB_IDS} THEN 1 ELSE 0 END) rcb
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id JOIN players p ON p.player_id = d.batter_id
    WHERE ${REGULATION} GROUP BY d.batter_id, year`;
  const rows = ev.rows<{ id: number; name: string; year: number; runs: number; balls: number; rcb: number }>(seasonSql);
  const leagueSql = `SELECT ${YEAR()} year, SUM(d.batter_runs) * 100.0 / SUM(CASE WHEN d.is_wide = 0 THEN 1 ELSE 0 END) sr FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id WHERE ${REGULATION} GROUP BY year`;
  const league = new Map(ev.rows<{ year: number; sr: number }>(leagueSql).map((r) => [r.year, r.sr]));
  const by = new Map(rows.map((r) => [`${r.id}|${r.year}`, r]));
  // Pairs: season y (any sample) → season y+1 with ≥ 60 balls. Strike rates expressed relative to that season's league SR.
  type Pair = { balls: number; rel1: number; rel2: number };
  const pairs: Pair[] = [];
  for (const r of rows) {
    const next = by.get(`${r.id}|${r.year + 1}`);
    if (!next || next.balls < 60 || r.balls < 10) continue;
    pairs.push({ balls: r.balls, rel1: (r.runs / r.balls) * 100 - league.get(r.year)!, rel2: (next.runs / next.balls) * 100 - league.get(next.year)! });
  }
  const buckets = [
    { id: "10-59", lo: 10, hi: 59 },
    { id: "60-149", lo: 60, hi: 149 },
    { id: "150-299", lo: 150, hi: 299 },
    { id: "300plus", lo: 300, hi: 1e9 },
  ];
  const q = `${seasonSql} ;; ${leagueSql}`;
  const bucketRows = buckets.map((b) => {
    const ps = pairs.filter((p) => p.balls >= b.lo && p.balls <= b.hi);
    // Retention = slope of next-season relative SR on this-season relative SR (how much of the edge carries over).
    const mx = ps.reduce((a, p) => a + p.rel1, 0) / ps.length, my = ps.reduce((a, p) => a + p.rel2, 0) / ps.length;
    const slope = ps.reduce((a, p) => a + (p.rel1 - mx) * (p.rel2 - my), 0) / ps.reduce((a, p) => a + (p.rel1 - mx) ** 2, 0);
    const hotAll = ps.filter((p) => p.rel1 >= 30);
    const hot = hotAll.length >= 15 ? hotAll : []; // too few hot batters to report a mean
    return { sample: b.id.replace("plus", "+").replace("-", "–") + " balls", pairs: ps.length, retainedPct: dp(slope * 100, 0), r: dp(pearson(ps.map((p) => p.rel1), ps.map((p) => p.rel2)), 2), hotNow: hot.length ? dp(hot.reduce((a, p) => a + p.rel1, 0) / hot.length, 0) : null, hotNext: hot.length ? dp(hot.reduce((a, p) => a + p.rel2, 0) / hot.length, 0) : null, hotN: hotAll.length };
  });
  ev.table("retention-by-sample", { label: "How much of a strike-rate edge survives to the next season", dataset: DS, filters: "IPL batter-seasons 2008–2025 with ≥ 10 balls, followed by a season with ≥ 60 balls; SR measured relative to that season's league SR", n: pairs.length, nUnit: "consecutive batter-season pairs", query: q, rows: bucketRows });
  ev.metric("pairs", { value: pairs.length, display: pairs.length.toLocaleString("en-IN"), label: "Consecutive batter-season pairs analysed", dataset: DS, filters: "As table", n: pairs.length, nUnit: "pairs", query: q, validate: sampleFloor(pairs.length, 500, "pairs") });
  for (const b of bucketRows) {
    const id = buckets[bucketRows.indexOf(b)].id;
    ev.metric(`retain-${id}`, { value: b.retainedPct, display: `${fmt(b.retainedPct, 0)}%`, label: `Share of a strike-rate edge retained next season (${b.sample})`, unit: "%", dataset: DS, filters: "Regression slope, relative SR", n: b.pairs, nUnit: "pairs", query: q, validate: sampleFloor(b.pairs, 80, "pairs") });
    if (b.hotNow != null) {
      ev.metric(`hot-now-${id}`, { value: b.hotNow!, display: `+${fmt(b.hotNow!, 0)}`, label: `Average SR above league for 'hot' batters (≥ +30) in the first season (${b.sample})`, unit: "SR points", dataset: DS, filters: "First season ≥ 30 SR points above league", n: b.hotN, nUnit: "pairs", query: q, validate: sampleFloor(b.hotN, 15, "pairs") });
      ev.metric(`hot-next-${id}`, { value: b.hotNext!, display: `${b.hotNext! >= 0 ? "+" : ""}${fmt(b.hotNext!, 0)}`, label: `Same batters' SR versus league the next season (${b.sample})`, unit: "SR points", dataset: DS, filters: "Next season ≥ 60 balls", n: b.hotN, nUnit: "pairs", query: q, validate: sampleFloor(b.hotN, 15, "pairs") });
    }
  }

  // Shrinkage constant: choose k (balls of league-average prior) that best predicts next-season relative SR.
  let bestK = 0, bestErr = Infinity;
  for (let k = 0; k <= 1500; k += 10) {
    const err = pairs.reduce((a, p) => a + (p.rel2 - (p.rel1 * p.balls) / (p.balls + k)) ** 2, 0) / pairs.length;
    if (err < bestErr) (bestErr = err), (bestK = k);
  }
  const rawErr = pairs.reduce((a, p) => a + (p.rel2 - p.rel1) ** 2, 0) / pairs.length;
  ev.metric("shrink-k", { value: bestK, display: String(bestK), label: "Best-fitting prior weight: balls of league-average performance to blend in", unit: "balls", dataset: DS, filters: "Grid search k = 0…1500, minimising squared error on next-season relative SR", n: pairs.length, nUnit: "pairs", query: q, validate: inRange(bestK, 20, 1400, "prior weight (not at grid edge)") });
  ev.metric("shrink-gain", { value: dp((1 - bestErr / rawErr) * 100, 0), display: `${fmt((1 - bestErr / rawErr) * 100, 0)}%`, label: "Reduction in prediction error from shrinking vs taking strike rate at face value", unit: "%", dataset: DS, filters: "Mean squared error, next-season relative SR", n: pairs.length, nUnit: "pairs", query: q, validate: inRange(1 - bestErr / rawErr, 0, 1, "error reduction") });

  // RCB illustrations: small samples in 2024–2026, raw vs shrunk.
  const rcb = rows.filter((r) => r.rcb && r.year >= 2024 && r.balls >= 15 && r.balls < 100).map((r) => {
    const rel = (r.runs / r.balls) * 100 - league.get(r.year)!;
    return { batter: r.name, season: String(r.year), balls: r.balls, rawSR: dp((r.runs / r.balls) * 100, 1), shrunkSR: dp(league.get(r.year)! + (rel * r.balls) / (r.balls + bestK), 1), leagueSR: dp(league.get(r.year)!, 1) };
  }).sort((a, b) => b.rawSR - a.rawSR);
  ev.table("rcb-small-samples", { label: `RCB small samples, 2024–2026: raw vs shrunk strike rate (k = ${bestK} balls)`, dataset: DS, filters: "RCB batter-seasons with 15–99 balls (a player who also batted for another team that season is pooled)", n: rcb.length, nUnit: "batter-seasons", query: q, rows: rcb });
  ev.metric("rcb-small-n", { value: rcb.length, display: String(rcb.length), label: "RCB batter-seasons with 15–99 balls, 2024–2026", dataset: DS, filters: "As table", n: rcb.length, nUnit: "batter-seasons", query: q, validate: sampleFloor(rcb.length, 5, "batter-seasons") });
  if (rcb[0]) {
    ev.metric("rcb-top-raw-name", { value: `${rcb[0].batter} (${rcb[0].season})`, display: `${rcb[0].batter} (${rcb[0].season})`, label: "Highest raw small-sample SR at RCB, 2024–2026", dataset: DS, filters: "15–99 balls", n: rcb[0].balls, nUnit: "balls", query: q, validate: { method: "rank", passed: true } });
    ev.metric("rcb-top-raw", { value: rcb[0].rawSR, display: fmt(rcb[0].rawSR, 1), label: "Raw strike rate", dataset: DS, filters: "As above", n: rcb[0].balls, nUnit: "balls", query: q, validate: inRange(rcb[0].rawSR, 50, 400, "SR") });
    ev.metric("rcb-top-shrunk", { value: rcb[0].shrunkSR, display: fmt(rcb[0].shrunkSR, 1), label: "Shrunk strike rate", dataset: DS, filters: "As above", n: rcb[0].balls, nUnit: "balls", query: q, validate: inRange(rcb[0].shrunkSR, 50, 400, "SR") });
    ev.metric("rcb-top-balls", { value: rcb[0].balls, display: String(rcb[0].balls), label: "Balls faced", dataset: DS, filters: "As above", n: rcb[0].balls, nUnit: "balls", query: q, validate: sampleFloor(rcb[0].balls, 15, "balls") });
  }
}

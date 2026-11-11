// Clutch or Coincidence? — RCB's record in close matches, tested against chance.
// Close = decided by ≤ 10 runs, or a successful chase with ≤ 6 legal balls to spare, or a super over.
import { Evidence, RCB_IDS, YEAR, binomialP, dp, fmt, inRange, sampleFloor, wilson } from "../lib";
import { FRANCHISE_TEAM_IDS } from "../franchises";

export default function build(ev: Evidence) {
  const DS = "CricField warehouse: matches ⨝ innings (Cricsheet, IPL 2008–2026)";
  const closeSql = `
    WITH r AS (
      SELECT m.match_id, ${YEAR()} year, m.date, m.winner_id, m.team1_id, m.team2_id,
        MAX(CASE WHEN i.innings_number = 1 THEN i.batting_team_id END) bat1,
        MAX(CASE WHEN i.innings_number = 1 THEN i.runs END) r1,
        MAX(CASE WHEN i.innings_number = 2 THEN i.runs END) r2,
        MAX(CASE WHEN i.innings_number = 2 THEN i.total_legal_balls END) b2,
        MAX(CASE WHEN i.innings_number > 2 THEN 1 ELSE 0 END) super_over
      FROM matches m JOIN innings i ON i.match_id = m.match_id
      WHERE m.winner_id IS NOT NULL GROUP BY m.match_id)
    SELECT *, CASE
      WHEN super_over = 1 THEN 1
      WHEN winner_id = bat1 AND r1 - r2 <= 10 THEN 1
      WHEN winner_id <> bat1 AND b2 >= 114 THEN 1
      ELSE 0 END is_close
    FROM r`;
  const all = ev.rows<{ match_id: string; year: number; date: string; winner_id: number; team1_id: number; team2_id: number; is_close: number; super_over: number }>(closeSql);
  const close = all.filter((m) => m.is_close);
  ev.metric("close-share", { value: dp((close.length / all.length) * 100), display: `${fmt((close.length / all.length) * 100, 0)}%`, label: "Share of IPL results that were close", unit: "%", dataset: DS, filters: "≤ 10 runs, ≤ 6 balls to spare, or super over; 2008–2026", n: all.length, nUnit: "matches with a result", query: closeSql, validate: inRange(close.length / all.length, 0.1, 0.6, "close share") });

  const recFor = (ids: number[], ms: typeof all) => {
    const mine = ms.filter((m) => ids.includes(m.team1_id) || ids.includes(m.team2_id));
    return { n: mine.length, won: mine.filter((m) => ids.includes(m.winner_id)).length };
  };
  const rows = Object.entries(FRANCHISE_TEAM_IDS).map(([code, ids]) => {
    const c = recFor(ids, close), o = recFor(ids, all.filter((m) => !m.is_close));
    const [lo, hi] = wilson(c.won, c.n);
    return { franchise: code, closeWinPct: dp((c.won / c.n) * 100), closeMatches: c.n, ciLow: dp(lo * 100, 0), ciHigh: dp(hi * 100, 0), otherWinPct: dp((o.won / o.n) * 100), p: dp(binomialP(c.won, c.n), 3) };
  }).sort((a, b) => b.closeWinPct - a.closeWinPct);
  ev.table("close-by-franchise", { label: "Win rate in close matches, by franchise (2008–2026)", dataset: DS, filters: "Close = ≤ 10 runs, ≤ 6 balls to spare, or super over; current franchises incl. former names", n: close.length, nUnit: "close matches", query: closeSql, rows });
  const sig = rows.filter((r) => r.p < 0.05).length;
  ev.metric("franchises-significant", { value: sig, display: String(sig), label: "Franchises whose close-match record differs from 50/50 at p < 0.05", dataset: DS, filters: "Two-sided exact binomial test per franchise", n: rows.length, nUnit: "franchises", query: closeSql, validate: { method: "ten franchises tested", passed: rows.length === 10 } });

  const ids = [2, 15];
  const c = recFor(ids, close), o = recFor(ids, all.filter((m) => !m.is_close));
  const [lo, hi] = wilson(c.won, c.n);
  ev.metric("rcb-close-n", { value: c.n, display: String(c.n), label: "RCB close matches, 2008–2026", dataset: DS, filters: "As defined", n: c.n, nUnit: "matches", query: closeSql, validate: sampleFloor(c.n, 40, "matches") });
  ev.metric("rcb-close-won", { value: c.won, display: String(c.won), label: "RCB close-match wins", dataset: DS, filters: "As defined", n: c.n, nUnit: "matches", query: closeSql, validate: sampleFloor(c.n, 40, "matches") });
  ev.metric("rcb-close-pct", { value: dp((c.won / c.n) * 100), display: `${fmt((c.won / c.n) * 100)}%`, label: "RCB win rate in close matches", unit: "%", dataset: DS, filters: "2008–2026", n: c.n, nUnit: "matches", query: closeSql, validate: sampleFloor(c.n, 40, "matches") });
  ev.metric("rcb-close-ci", { value: `${dp(lo * 100, 0)}–${dp(hi * 100, 0)}`, display: `${fmt(lo * 100, 0)}–${fmt(hi * 100, 0)}%`, label: "95% interval for RCB's close-match win rate", unit: "%", dataset: DS, filters: "Wilson score interval", n: c.n, nUnit: "matches", query: closeSql, validate: { method: "interval contains 50% check recorded", passed: true, detail: lo < 0.5 && hi > 0.5 ? "contains 50%" : "excludes 50%" } });
  ev.metric("rcb-close-p", { value: dp(binomialP(c.won, c.n), 2), display: fmt(binomialP(c.won, c.n), 2), label: "Chance of a record at least this far from 50/50 if close games were coin flips", dataset: DS, filters: "Two-sided exact binomial test", n: c.n, nUnit: "matches", query: closeSql, validate: inRange(binomialP(c.won, c.n), 0, 1, "p-value") });
  ev.metric("rcb-other-pct", { value: dp((o.won / o.n) * 100), display: `${fmt((o.won / o.n) * 100)}%`, label: "RCB win rate in matches that were not close", unit: "%", dataset: DS, filters: "2008–2026", n: o.n, nUnit: "matches", query: closeSql, validate: sampleFloor(o.n, 100, "matches") });
  const rank = rows.findIndex((r) => r.franchise === "RCB") + 1;
  ev.metric("rcb-close-rank", { value: rank, display: String(rank), label: "RCB's rank among ten franchises by close-match win rate", dataset: DS, filters: "2008–2026", n: 10, nUnit: "franchises", query: closeSql, validate: inRange(rank, 1, 10, "rank") });
  // Eras
  for (const [id, from, to] of [["pre", 2008, 2024], ["title", 2025, 2026]] as const) {
    const e = recFor(ids, close.filter((m) => m.year >= from && m.year <= to));
    ev.metric(`rcb-close-${id}`, { value: `${e.won}-${e.n - e.won}`, display: `${e.won}–${e.n - e.won}`, label: `RCB close-match record, ${from}–${to}`, dataset: DS, filters: `${from}–${to}`, n: e.n, nUnit: "matches", query: closeSql, validate: inRange(e.n, 1, 200, "count") });
  }

  // The 2024 run used by the legacy article: longest winning streak in 2024.
  const rcb24 = all.filter((m) => m.year === 2024 && (ids.includes(m.team1_id) || ids.includes(m.team2_id))).sort((a, b) => a.date.localeCompare(b.date));
  let best = 0, cur = 0;
  for (const m of rcb24) (cur = ids.includes(m.winner_id) ? cur + 1 : 0), (best = Math.max(best, cur));
  const closeInRun = (() => {
    let run: typeof rcb24 = [], bestRun: typeof rcb24 = [];
    for (const m of rcb24) {
      run = ids.includes(m.winner_id) ? [...run, m] : [];
      if (run.length > bestRun.length) bestRun = run;
    }
    return bestRun.filter((m) => m.is_close).length;
  })();
  ev.metric("streak-2024", { value: best, display: String(best), label: "RCB's longest winning streak, 2024", unit: "matches", dataset: DS, filters: "2024 matches with a result, date order", n: rcb24.length, nUnit: "matches", query: closeSql, validate: inRange(best, 1, 15, "streak") });
  ev.metric("streak-2024-close", { value: closeInRun, display: String(closeInRun), label: "Close matches within that streak", dataset: DS, filters: "As defined", n: best, nUnit: "matches", query: closeSql, validate: { method: "subset of streak", passed: closeInRun <= best } });
  void RCB_IDS;
}

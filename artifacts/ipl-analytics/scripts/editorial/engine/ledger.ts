// One row per IPL match, shared by the business and fan-culture templates.
import { YEAR } from "../evidence/lib";
import type { A } from "./core";

export type LedgerRow = {
  match_id: number; year: number; dt: string; wd: number; venue_id: number; city: string | null;
  t1: number; t2: number; w: number | null; bat1: number; r1: number; r2: number | null; b2: number | null; so: number;
  sixes: number; runs: number; close: boolean;
};

export const LEDGER_SQL = `WITH ms AS (SELECT m.match_id, ${YEAR()} year, replace(m.date, '/', '-') dt, m.venue_id, v.city, m.team1_id t1, m.team2_id t2, m.winner_id w FROM matches m LEFT JOIN venues v ON v.venue_id = m.venue_id),
  inn AS (SELECT i.match_id, MAX(CASE WHEN i.innings_number = 1 THEN i.batting_team_id END) bat1, MAX(CASE WHEN i.innings_number = 1 THEN i.runs END) r1,
    MAX(CASE WHEN i.innings_number = 2 THEN i.runs END) r2, MAX(CASE WHEN i.innings_number = 2 THEN i.total_legal_balls END) b2, MAX(CASE WHEN i.innings_number > 2 THEN 1 ELSE 0 END) so FROM innings i GROUP BY i.match_id),
  dl AS (SELECT d.match_id, SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes, SUM(d.total_runs) runs FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id WHERE i.innings_number <= 2 GROUP BY d.match_id)
SELECT ms.*, CAST(strftime('%w', ms.dt) AS INTEGER) wd, inn.bat1, inn.r1, inn.r2, inn.b2, inn.so, COALESCE(dl.sixes, 0) sixes, COALESCE(dl.runs, 0) runs
FROM ms JOIN inn ON inn.match_id = ms.match_id LEFT JOIN dl ON dl.match_id = ms.match_id ORDER BY ms.dt`;

let cache: LedgerRow[] | null = null;
export function ledger(a: A): LedgerRow[] {
  if (!cache)
    cache = a.rows<Omit<LedgerRow, "close">>(LEDGER_SQL).map((m) => ({
      ...m,
      close: m.w != null && (m.so === 1 || (m.w === m.bat1 && m.r2 != null && m.r1 - m.r2 <= 10) || (m.w !== m.bat1 && (m.b2 ?? 0) >= 114)),
    }));
  return cache;
}

/** The franchise's matches, with perspective fields. */
export function mine(a: A) {
  const ids = a.c.ids;
  const home = new Set(a.rows<{ venue_id: number }>(`SELECT venue_id FROM venues WHERE venue_id IN ${a.c.homeSql}`).map((r) => r.venue_id));
  return ledger(a)
    .filter((m) => ids.includes(m.t1) || ids.includes(m.t2))
    .map((m) => ({ ...m, opp: ids.includes(m.t1) ? m.t2 : m.t1, won: m.w != null && ids.includes(m.w), lost: m.w != null && !ids.includes(m.w), home: home.has(m.venue_id), weekend: m.wd === 0 || m.wd === 6 }));
}
export type MyMatch = ReturnType<typeof mine>[number];

export const mean = (xs: number[]) => (xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : NaN);
export const words = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

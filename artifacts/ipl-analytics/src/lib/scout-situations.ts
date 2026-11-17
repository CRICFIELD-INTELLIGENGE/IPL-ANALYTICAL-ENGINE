// Scout Lab "Under Pressure": loads the static situation snapshots and ranks players.
// Built by artifacts/api-server/scripts/pressure/build-scout-situations.ts.

export interface SituationDef { id: string; group: string; label: string }
export interface SituationIndex {
  builtAt: string; source: string; situations: SituationDef[];
  competitions: { code: string; name: string; seasons: string[]; file: string }[];
}
export interface SituationData {
  comp: string; seasons: string[];
  players: [cricsheetId: string, name: string, bowlType: string, batHand: string][];
  rows: number[][]; // player, season, role (0 bat, 1 bowl), situation, balls, runs, outs, dots, boundaries
}
export interface SituationRow {
  cricsheetId: string; name: string; bowlType: string; batHand: string;
  balls: number; runs: number; outs: number; dots: number; boundaries: number;
  impact: number; // shrunk runs above situation average per 100 balls (bowling: runs saved)
}

const base = () => (import.meta.env?.BASE_URL ?? "/") + "data/scout-situations/";
let indexP: Promise<SituationIndex> | null = null;
const dataP = new Map<string, Promise<SituationData>>();
const getJson = <T,>(url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json() as Promise<T>; });

export const loadSituationIndex = () => (indexP ??= getJson<SituationIndex>(base() + "index.json").catch(e => { indexP = null; throw e; }));
export function loadSituationData(file: string) {
  let p = dataP.get(file);
  if (!p) { p = getJson<SituationData>(base() + file).catch(e => { dataP.delete(file); throw e; }); dataP.set(file, p); }
  return p;
}

/** Prior strength in balls: a player needs ~this many balls to keep half their raw impact. */
export const SHRINK_BALLS = 60;

export function rankSituation(d: SituationData, role: 0 | 1, situation: number, seasons: Set<number>, minBalls: number): { rows: SituationRow[]; baseline: { balls: number; runs: number; outs: number } } {
  const match = d.rows.filter(r => r[2] === role && r[3] === situation && seasons.has(r[1]));
  // Each season is judged against that season's average in the situation, so scoring eras don't leak in.
  const bySeason = new Map<number, number[]>();
  for (const r of match) { const t = bySeason.get(r[1]) ?? bySeason.set(r[1], [0, 0, 0]).get(r[1])!; t[0] += r[4]; t[1] += r[5]; t[2] += r[6]; }
  const per = new Map<number, number[]>(); // balls, runs, outs, dots, boundaries, value
  for (const r of match) {
    const [B, R, O] = bySeason.get(r[1])!;
    if (!B) continue; // a season with only wides/no-balls in this split
    // A dismissal is valued at half the situation's runs per wicket (T20 wickets cost less than a full average).
    const wicket = O ? R / O / 2 : 0;
    const [balls, runs, outs] = [r[4], r[5], r[6]];
    const runsAbove = role === 0 ? runs - (balls * R) / B : (balls * R) / B - runs;
    const wktsAbove = role === 0 ? (balls * O) / B - outs : outs - (balls * O) / B;
    const a = per.get(r[0]) ?? per.set(r[0], [0, 0, 0, 0, 0, 0]).get(r[0])!;
    for (let i = 0; i < 5; i++) a[i] += r[4 + i];
    a[5] += runsAbove + wicket * wktsAbove;
  }
  const rows: SituationRow[] = [];
  for (const [p, [balls, runs, outs, dots, boundaries, value]] of per) {
    if (balls < Math.max(1, minBalls)) continue;
    const [cricsheetId, name, bowlType, batHand] = d.players[p];
    rows.push({ cricsheetId, name, bowlType, batHand, balls, runs, outs, dots, boundaries, impact: ((100 * value) / balls) * (balls / (balls + SHRINK_BALLS)) });
  }
  rows.sort((a, b) => b.impact - a.impact);
  const tot = [...bySeason.values()].reduce((a, t) => [a[0] + t[0], a[1] + t[1], a[2] + t[2]], [0, 0, 0]);
  return { rows, baseline: { balls: tot[0], runs: tot[1], outs: tot[2] } };
}

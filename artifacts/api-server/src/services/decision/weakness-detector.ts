// Decision Intelligence OS — Phase 2: Hidden Weakness Detector.
//
// Splits one player's balls into cells — bowler type × over window for a
// batter, batter hand × over window for a bowler, plus each dimension on its
// own and batting first vs chasing — and tests every cell against the rest
// of the player's own record:
//
//   per-ball value  v = runs − W·out          (batter; bowler is the mirror)
//   z = (mean v in cell − mean v elsewhere) / standard error
//
// Because many cells are tested at once, the one-sided p-value is Bonferroni
// adjusted (× number of cells) before it becomes an "anomaly confidence".
// A cell is reported as a weakness only when that confidence is high AND the
// effect is large enough to matter on the field; otherwise the weakest cells
// are shown as a watch list, clearly labelled as not significant.

import { normalizeSeason, queryAll, seasonToDbLabel, RUNS_CONCEDED_SQL } from "./db";
import { round } from "./impact-model";
import { bowlingSubtype, getBaselines, getPlayerMeta, getSeasons, type BowlingSubtype } from "./player-profiles";
import { getFranchiseRefs } from "./stats-engine";

export type Side = "batting" | "bowling";
export type ScanWindow = "recent" | "career";

const OVER_WINDOWS = [
  { key: "1-6", label: "Overs 1–6", from: 0, to: 5 },
  { key: "7-10", label: "Overs 7–10", from: 6, to: 9 },
  { key: "11-15", label: "Overs 11–15", from: 10, to: 14 },
  { key: "16-20", label: "Overs 16–20", from: 15, to: 19 },
];

const MIN_CELL_BALLS = 30;
const REPORT_CONFIDENCE = 0.8;

interface Ball {
  id: number; matchId: string; season: string; date: string; over: number; ballNum: number;
  opponentTeam: number; innings: number; counterpart: number; // bowler (batting side) / batter (bowling side)
  runs: number; legal: boolean; out: boolean; kind: string | null;
}

interface Dim { key: string; label: string; of: (b: Ball) => string | null }

/* ─── Statistics ─────────────────────────────────────────────────────────── */

// Abramowitz–Stegun approximation of the standard normal CDF.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

interface Agg { n: number; legal: number; runs: number; outs: number; dots: number; boundaries: number; sumV: number; sumV2: number }
const emptyAgg = (): Agg => ({ n: 0, legal: 0, runs: 0, outs: 0, dots: 0, boundaries: 0, sumV: 0, sumV2: 0 });

function addBall(a: Agg, b: Ball, v: number) {
  a.n++;
  if (b.legal) a.legal++;
  a.runs += b.runs;
  if (b.out) a.outs++;
  if (b.legal && b.runs === 0) a.dots++;
  if (b.runs === 4 || b.runs === 6) a.boundaries++;
  a.sumV += v;
  a.sumV2 += v * v;
}

function minus(a: Agg, b: Agg): Agg {
  return { n: a.n - b.n, legal: a.legal - b.legal, runs: a.runs - b.runs, outs: a.outs - b.outs, dots: a.dots - b.dots, boundaries: a.boundaries - b.boundaries, sumV: a.sumV - b.sumV, sumV2: a.sumV2 - b.sumV2 };
}

function zScore(cell: Agg, rest: Agg): number {
  if (cell.n < 2 || rest.n < 2) return 0;
  const m1 = cell.sumV / cell.n, m2 = rest.sumV / rest.n;
  const v1 = Math.max((cell.sumV2 - cell.n * m1 * m1) / (cell.n - 1), 1e-6);
  const v2 = Math.max((rest.sumV2 - rest.n * m2 * m2) / (rest.n - 1), 1e-6);
  return (m1 - m2) / Math.sqrt(v1 / cell.n + v2 / rest.n);
}

/* ─── Output types ───────────────────────────────────────────────────────── */

export interface CellStats {
  balls: number;
  runs: number;
  outs: number;
  rate: number | null; // SR (batting) / economy (bowling)
  ballsPerOut: number | null;
  dotPct: number | null;
  boundaryPct: number | null;
}

export interface EvidenceDismissal { matchId: string; date: string; season: string; opponent: string; counterpart: string; ball: string; kind: string }
export interface EvidenceCounterpart { name: string; balls: number; runs: number; outs: number; rate: number | null }

export interface Anomaly {
  id: string;
  kind: "weakness" | "strength";
  dimensions: string[]; // e.g. ["Leg-spin", "Overs 7–10"]
  headline: string;
  cell: CellStats;
  elsewhere: CellStats;
  /** Runs per 100 balls worse (−) or better (+) than the player's own record elsewhere. */
  effectPer100: number;
  z: number;
  /** 0–100, after correcting for the number of cells tested. */
  confidence: number;
  significant: boolean;
  exploit: string | null;
  evidence: { dismissals: EvidenceDismissal[]; counterparts: EvidenceCounterpart[]; distribution: Record<string, number> };
}

export interface HeatCell { row: string; col: string; balls: number; rate: number | null; ballsPerOut: number | null; effectPer100: number | null }

export interface WeaknessReport {
  playerId: number;
  name: string;
  fullName: string | null;
  side: Side;
  sidesAvailable: Side[];
  window: ScanWindow;
  windowLabel: string;
  overall: CellStats;
  cellsTested: number;
  weaknesses: Anomaly[];
  strengths: Anomaly[];
  watchList: Anomaly[];
  heatmap: { rows: string[]; cols: string[]; cells: HeatCell[]; rowLabel: string };
  summary: string;
  method: string;
}

/* ─── Data ───────────────────────────────────────────────────────────────── */

function loadBalls(playerId: number, side: Side, seasons: string[] | null): Ball[] {
  const col = side === "batting" ? "d.batter_id" : "d.bowler_id";
  const other = side === "batting" ? "d.bowler_id" : "d.batter_id";
  const opp = side === "batting" ? "i.bowling_team_id" : "i.batting_team_id";
  // Join on delivery_id only (index-friendly) and keep just the dismissals that count.
  const outKind = side === "batting"
    ? "CASE WHEN x.player_out_id = d.batter_id AND x.kind <> 'retired hurt' THEN x.kind END"
    : "CASE WHEN x.kind IN ('bowled','caught','caught and bowled','lbw','stumped','hit wicket') THEN x.kind END";
  const runs = side === "batting"
    ? "d.batter_runs"
    : RUNS_CONCEDED_SQL;
  const legal = side === "batting" ? "d.is_wide = 0" : "d.is_wide = 0 AND d.is_noball = 0";
  const seasonSql = seasons ? `AND m.season_id IN (${seasons.map(() => "?").join(",")})` : "";
  const rows = queryAll<{ id: number; mid: string; season: string; date: string; ov: number; bn: number; opp: number; num: number; cp: number; runs: number; legal: number; kind: string | null }>(`
    SELECT d.delivery_id id, d.match_id mid, m.season_id season, m.date date, d.over_num ov, d.ball_num bn,
      ${opp} opp, i.innings_number num, ${other} cp, ${runs} runs, CASE WHEN ${legal} THEN 1 ELSE 0 END legal, ${outKind} kind
    FROM deliveries d
    JOIN innings i ON i.innings_id = d.innings_id
    JOIN matches m ON m.match_id = d.match_id
    LEFT JOIN dismissals x ON x.delivery_id = d.delivery_id
    WHERE ${col} = ? AND i.innings_number IN (1, 2) ${seasonSql}
    ORDER BY d.delivery_id`, playerId, ...(seasons ?? []));
  // A batter faces no ball on a wide, but can still be stumped off one.
  return rows
    .filter((r) => side === "bowling" || r.legal || r.kind)
    .map((r) => ({
      id: r.id, matchId: r.mid, season: normalizeSeason(r.season), date: r.date, over: r.ov, ballNum: r.bn,
      opponentTeam: r.opp, innings: r.num, counterpart: r.cp, runs: r.runs, legal: Boolean(r.legal), out: Boolean(r.kind), kind: r.kind,
    }));
}

function dims(side: Side): { row: Dim; col: Dim; extra: Dim[] } {
  const meta = getPlayerMeta();
  const subtypeCache = new Map<number, BowlingSubtype | null>();
  const subtype = (id: number) => {
    if (!subtypeCache.has(id)) { const m = meta.get(id); subtypeCache.set(id, m ? bowlingSubtype(m) : null); }
    return subtypeCache.get(id) ?? null;
  };
  const overWindow: Dim = { key: "overs", label: "Over window", of: (b) => OVER_WINDOWS.find((w) => b.over >= w.from && b.over <= w.to)?.label ?? null };
  const innings: Dim = { key: "innings", label: "Innings", of: (b) => (b.innings === 1 ? (side === "batting" ? "Batting first" : "Bowling first") : side === "batting" ? "Chasing" : "Defending") };
  if (side === "batting") {
    const row: Dim = { key: "bowler", label: "Bowler type", of: (b) => subtype(b.counterpart) };
    const coarse: Dim = { key: "pace-spin", label: "Pace / spin", of: (b) => { const s = subtype(b.counterpart); return s ? (/pace/i.test(s) ? "Pace" : "Spin") : null; } };
    return { row, col: overWindow, extra: [coarse, innings] };
  }
  const row: Dim = { key: "hand", label: "Batter hand", of: (b) => { const h = meta.get(b.counterpart)?.battingHand; return h === "L" ? "Left-handers" : h === "R" ? "Right-handers" : null; } };
  return { row, col: overWindow, extra: [innings] };
}

/* ─── Scan ───────────────────────────────────────────────────────────────── */

function stats(side: Side, a: Agg): CellStats {
  const balls = a.legal;
  return {
    balls,
    runs: a.runs,
    outs: a.outs,
    rate: balls ? round(side === "batting" ? (a.runs / balls) * 100 : (a.runs / balls) * 6, 1) : null,
    ballsPerOut: a.outs ? round(balls / a.outs, 1) : null,
    dotPct: balls ? round((a.dots / balls) * 100, 1) : null,
    boundaryPct: balls ? round((a.boundaries / balls) * 100, 1) : null,
  };
}

function windowSeasons(window: ScanWindow): { seasons: string[] | null; label: string } {
  const all = getSeasons();
  if (window === "career") return { seasons: null, label: `IPL career (${all[0]}–${all.at(-1)})` };
  const recent = all.slice(-3);
  return { seasons: recent.map(seasonToDbLabel), label: `IPL ${recent[0]}–${recent.at(-1)}` };
}

/** Run value of a wicket: 30% of league runs per dismissal across the window's seasons. */
function wicketValue(window: ScanWindow): number {
  const b = getBaselines();
  const seasons = window === "career" ? getSeasons() : getSeasons().slice(-3);
  const vals = seasons.map((s) => b.get(s)).filter(Boolean).map((x) => x!.batRunsPerBall * x!.batBallsPerOut);
  return 0.3 * (vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length));
}

export function scanPlayer(playerId: number, window: ScanWindow = "recent", sideIn?: Side): WeaknessReport | null {
  const meta = getPlayerMeta().get(playerId);
  if (!meta) return null;
  const { seasons, label: windowLabel } = windowSeasons(window);
  const batBalls = loadBalls(playerId, "batting", seasons);
  const bowlBalls = loadBalls(playerId, "bowling", seasons);
  const sidesAvailable: Side[] = [];
  if (batBalls.length) sidesAvailable.push("batting");
  if (bowlBalls.length) sidesAvailable.push("bowling");
  if (!sidesAvailable.length) return null;
  const side: Side = sideIn && sidesAvailable.includes(sideIn) ? sideIn : bowlBalls.length > batBalls.length ? "bowling" : "batting";
  const balls = side === "batting" ? batBalls : bowlBalls;

  const W = wicketValue(window);
  // Batter: runs good, wicket bad. Bowler: the mirror, so a negative z is always a weakness.
  const valueOf = (b: Ball) => (side === "batting" ? b.runs - (b.out ? W : 0) : -b.runs + (b.out ? W : 0));

  const { row, col, extra } = dims(side);
  const total = emptyAgg();
  const cells = new Map<string, { dims: string[]; agg: Agg; balls: Ball[] }>();
  const put = (labels: string[], b: Ball, v: number) => {
    const key = labels.join(" · ");
    let c = cells.get(key);
    if (!c) { c = { dims: labels, agg: emptyAgg(), balls: [] }; cells.set(key, c); }
    addBall(c.agg, b, v);
    c.balls.push(b);
  };
  for (const b of balls) {
    const v = valueOf(b);
    addBall(total, b, v);
    const r = row.of(b), c = col.of(b);
    if (r) put([r], b, v);
    if (c) put([c], b, v);
    if (r && c) put([r, c], b, v);
    for (const d of extra) {
      const e = d.of(b);
      if (!e) continue;
      put([e], b, v);
      if (d.key === "pace-spin" && c) put([e, c], b, v);
    }
  }

  const testable = [...cells.values()].filter((c) => c.agg.n >= MIN_CELL_BALLS && total.n - c.agg.n >= MIN_CELL_BALLS);
  const K = Math.max(1, testable.length);
  const meanAll = total.n ? total.sumV / total.n : 0;

  const meta2 = getPlayerMeta();
  const teamShort = new Map<number, string>();
  for (const fr of getFranchiseRefs()) for (const id of fr.teamIds) teamShort.set(id, fr.short);

  const anomalies: Anomaly[] = testable.map((c) => {
    const rest = minus(total, c.agg);
    const z = zScore(c.agg, rest);
    const pWeak = normalCdf(z);
    const pStrong = 1 - pWeak;
    const isWeak = z < 0;
    const confidence = Math.max(0, 1 - Math.min(1, (isWeak ? pWeak : pStrong) * K));
    const cellStats = stats(side, c.agg);
    const restStats = stats(side, rest);
    const effectPer100 = round(((c.agg.sumV / c.agg.n) - (rest.sumV / rest.n)) * 100, 1);
    // "Matters on the field": ≥ 12 runs/100 balls, or getting out ≥ 1.5× as often.
    const outRatio = cellStats.ballsPerOut && restStats.ballsPerOut ? restStats.ballsPerOut / cellStats.ballsPerOut : c.agg.outs > 0 && rest.outs === 0 ? 2 : 1;
    const material = Math.abs(effectPer100) >= 12 || (isWeak && side === "batting" && outRatio >= 1.5) || (!isWeak && side === "bowling" && outRatio >= 1.5);
    const significant = confidence >= REPORT_CONFIDENCE && material;
    return buildAnomaly(side, c.dims, c.agg, c.balls, cellStats, restStats, effectPer100, z, confidence, significant, isWeak, meta2, teamShort);
  });

  const byZ = [...anomalies].sort((a, b) => a.z - b.z);
  const pickDistinct = (list: Anomaly[], max: number) => {
    const out: Anomaly[] = [];
    for (const a of list) {
      // Skip a sub-cell whose broader parent is already reported with a similar effect.
      const parent = out.find((o) => o.dimensions.length < a.dimensions.length && o.dimensions.every((d) => a.dimensions.includes(d)));
      if (parent && Math.abs(a.effectPer100) < Math.abs(parent.effectPer100) * 1.25) continue;
      // …and a broader cell already explained by a sharper sub-cell ("overs 7–10" after "spin in overs 7–10").
      const child = out.find((o) => o.dimensions.length > a.dimensions.length && a.dimensions.every((d) => o.dimensions.includes(d)));
      if (child && Math.abs(child.effectPer100) >= Math.abs(a.effectPer100)) continue;
      out.push(a);
      if (out.length >= max) break;
    }
    return out;
  };
  const weaknesses = pickDistinct(byZ.filter((a) => a.kind === "weakness" && a.significant), 4);
  const strengths = pickDistinct([...byZ].reverse().filter((a) => a.kind === "strength" && a.significant), 3);
  const watchList = weaknesses.length ? [] : pickDistinct(byZ.filter((a) => a.kind === "weakness" && a.effectPer100 < 0), 3);

  // Heatmap: row dimension × over window, effect vs the player's own average.
  const rows = [...new Set(balls.map((b) => row.of(b)).filter(Boolean) as string[])].sort();
  const cols = OVER_WINDOWS.map((w) => w.label);
  const heat: HeatCell[] = [];
  for (const r of rows) for (const c of cols) {
    const cell = cells.get(`${r} · ${c}`);
    if (!cell) { heat.push({ row: r, col: c, balls: 0, rate: null, ballsPerOut: null, effectPer100: null }); continue; }
    const s = stats(side, cell.agg);
    heat.push({ row: r, col: c, balls: s.balls, rate: s.rate, ballsPerOut: s.ballsPerOut, effectPer100: cell.agg.n >= 12 ? round((cell.agg.sumV / cell.agg.n - meanAll) * 100, 1) : null });
  }

  const overall = stats(side, total);
  const summary = !balls.length
    ? `${meta.name} has no ${side} balls in ${windowLabel}.`
    : weaknesses.length
      ? `Scanned ${testable.length} situations across ${overall.balls.toLocaleString("en-US")} balls (${windowLabel}). ${weaknesses.length} reliable weakness${weaknesses.length > 1 ? "es" : ""} found — the sharpest: ${weaknesses[0].headline.charAt(0).toLowerCase()}${weaknesses[0].headline.slice(1)}.`
      : `Scanned ${testable.length} situations across ${overall.balls.toLocaleString("en-US")} balls (${windowLabel}). No weakness passes the significance bar — ${meta.name} has no exploitable hole in this window. The weakest situations are shown as a watch list.`;

  return {
    playerId,
    name: meta.name,
    fullName: meta.fullName,
    side,
    sidesAvailable,
    window,
    windowLabel,
    overall,
    cellsTested: testable.length,
    weaknesses,
    strengths,
    watchList,
    heatmap: { rows, cols, cells: heat, rowLabel: row.label },
    summary,
    method: `Each situation with ${MIN_CELL_BALLS}+ balls is compared with the rest of the player's own record on runs per ball net of dismissals (a wicket costs ${round(W, 1)} runs). Confidence is one-sided and Bonferroni-corrected for the ${testable.length} situations tested; weaknesses need ${Math.round(REPORT_CONFIDENCE * 100)}%+ confidence and a gap of 12+ runs per 100 balls (or getting out 1.5× as often).`,
  };
}

function buildAnomaly(
  side: Side, dimensions: string[], agg: Agg, balls: Ball[], cell: CellStats, elsewhere: CellStats,
  effectPer100: number, z: number, confidence: number, significant: boolean, isWeak: boolean,
  meta: ReturnType<typeof getPlayerMeta>, teamShort: Map<number, string>,
): Anomaly {
  const overs = dimensions.find((d) => d.startsWith("Overs"));
  const type = dimensions.find((d) => !d.startsWith("Overs") && !/first|Chasing|Defending/.test(d));
  const inn = dimensions.find((d) => /first|Chasing|Defending/.test(d));
  const innPhrase: Record<string, string> = { "Batting first": "when batting first", Chasing: "in chases", "Bowling first": "when bowling first", Defending: "when defending a total" };
  // "against leg-spin in overs 7–10 in chases"
  const situation = [type && `against ${type.toLowerCase()}`, overs && `in ${overs.toLowerCase()}`, inn && innPhrase[inn]].filter(Boolean).join(" ");

  const rateName = side === "batting" ? "SR" : "economy";
  const outName = side === "batting" ? "out every" : "a wicket every";
  const verb = side === "batting" ? (isWeak ? "Struggles" : "Dominates") : isWeak ? "Leaks runs" : "Thrives";
  const headline = `${verb} ${situation}: ${rateName} ${cell.rate ?? "—"} (${elsewhere.rate ?? "—"} elsewhere)` +
    (cell.ballsPerOut ? `, ${outName} ${cell.ballsPerOut} balls (${elsewhere.ballsPerOut ?? "—"})` : side === "batting" ? ", not dismissed" : ", no wickets");

  const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");
  const bowlerPhrase = type ? (/^(Pace|Spin)$/.test(type) ? type.toLowerCase() : `${article(type)} ${type.toLowerCase()} bowler`) : "your best option";
  const tail = [overs && `in ${overs.toLowerCase()}`, inn && innPhrase[inn]].filter(Boolean).join(" ");
  const exploit = !isWeak ? null : side === "batting"
    ? `Bowl ${bowlerPhrase}${tail ? ` ${tail}` : ""}.`
    : `Send ${type ? type.toLowerCase() : "your most aggressive batters"} at this bowler${tail ? ` ${tail}` : ""}.`;

  // Latest first by match date: delivery_id follows ingest order (by match-file name), not the calendar.
  const dismissals = balls.filter((b) => b.out).sort((x, y) => y.date.localeCompare(x.date) || y.id - x.id).slice(0, 10).map((b) => ({
    matchId: b.matchId,
    date: b.date,
    season: b.season,
    opponent: teamShort.get(b.opponentTeam) ?? "",
    counterpart: meta.get(b.counterpart)?.name ?? `#${b.counterpart}`,
    ball: `${b.over}.${b.ballNum}`,
    kind: b.kind ?? "",
  }));
  const byCp = new Map<number, Agg>();
  for (const b of balls) {
    const a = byCp.get(b.counterpart) ?? emptyAgg();
    addBall(a, b, 0);
    byCp.set(b.counterpart, a);
  }
  const counterparts = [...byCp.entries()]
    .sort((a, b) => b[1].outs - a[1].outs || b[1].legal - a[1].legal)
    .slice(0, 5)
    .map(([id, a]) => ({ name: meta.get(id)?.name ?? `#${id}`, balls: a.legal, runs: a.runs, outs: a.outs, rate: stats(side, a).rate }));
  const distribution: Record<string, number> = { dot: 0, "1": 0, "2": 0, "3": 0, "4": 0, "6": 0, out: agg.outs };
  for (const b of balls) {
    if (!b.legal) continue;
    const k = b.runs === 0 ? "dot" : String(Math.min(b.runs, 6));
    if (k in distribution) distribution[k]++;
  }

  return {
    id: dimensions.join("|"),
    kind: isWeak ? "weakness" : "strength",
    dimensions,
    headline,
    cell,
    elsewhere,
    effectPer100,
    z: round(z, 2),
    confidence: Math.round(confidence * 100),
    significant,
    exploit,
    evidence: { dismissals, counterparts, distribution },
  };
}

/** Sharpest reliable weakness for each player (used by the Insight Feed). */
export function topWeaknesses(playerIds: number[], window: ScanWindow = "recent"): { report: WeaknessReport; anomaly: Anomaly }[] {
  const out: { report: WeaknessReport; anomaly: Anomaly }[] = [];
  for (const id of playerIds) {
    const r = scanPlayer(id, window, "batting");
    if (r && r.side === "batting" && r.weaknesses[0]) out.push({ report: r, anomaly: r.weaknesses[0] });
  }
  return out.sort((a, b) => a.anomaly.z - b.anomaly.z);
}

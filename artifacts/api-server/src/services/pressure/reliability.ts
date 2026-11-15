// Pressure Reliability — serving. Reads the published snapshot only; never trains.
// Build: node --import tsx scripts/pressure/build-pressure-reliability.ts

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../decision/db";
import { fitEb, shrink, type EbInput } from "./model";

interface Snapshot {
  version: string; builtAt: string; source: string;
  competitions: { code: string; name: string }[];
  model: Record<string, any>;
  data: {
    matches: { date: string[]; comp: number[] };
    players: string[]; teams: string[];
    rows: { match: number[]; player: number[]; role: number[]; team: number[]; bins: number[]; phase: number[] };
  };
}

let snap: Snapshot | null = null;
function load(): Snapshot {
  if (snap) return snap;
  const fp = path.join(getProjectRoot(), "artifacts", "api-server", "data", "pressure", "pressure-reliability.json");
  const alt = path.join(process.cwd(), "data", "pressure", "pressure-reliability.json");
  snap = JSON.parse(fs.readFileSync(fs.existsSync(fp) ? fp : alt, "utf8")) as Snapshot;
  return snap;
}

export const TIERS = { medium: 1, high: 2, extreme: 3 } as const;
export const LENSES = ["all", "powerplay", "middle", "death"] as const;
export type Tier = keyof typeof TIERS;
export type Lens = (typeof LENSES)[number];

export interface PressureQuery {
  comps: string[]; from?: number; to?: number;
  role: "batting" | "bowling"; tier: Tier; minBalls: number; minMatches: number; lens: Lens;
  sort?: "adjusted" | "conservative"; limit?: number;
}

/** Cohort floor for estimating the prior; separate from the user's qualification filter. */
const COHORT_MIN_BALLS = 30;
/** A player fits a phase lens when at least this share of their pressure balls fall in it. */
const LENS_SHARE = 0.4;

export function pressureReliability(q: PressureQuery) {
  const s = load();
  const { matches, rows } = s.data;
  const compIdx = new Set(q.comps.map(c => s.competitions.findIndex(x => x.code === c)).filter(i => i >= 0));
  const role = q.role === "batting" ? 0 : 1;
  const t = TIERS[q.tier];

  type Acc = { p: [number, number, number, number]; o: [number, number, number]; m: Map<number, { b: number; v: number }>; phase: number[]; team: number; last: string; comps: Set<number> };
  const acc = new Map<number, Acc>();
  const matchSet = new Set<number>();
  for (let i = 0; i < rows.match.length; i++) {
    if (rows.role[i] !== role) continue;
    const mi = rows.match[i];
    if (!compIdx.has(matches.comp[mi])) continue;
    const year = Number(matches.date[mi].slice(0, 4));
    if ((q.from && year < q.from) || (q.to && year > q.to)) continue;
    matchSet.add(mi);
    const pid = rows.player[i];
    const a = acc.get(pid) ?? acc.set(pid, { p: [0, 0, 0, 0], o: [0, 0, 0], m: new Map(), phase: [0, 0, 0], team: rows.team[i], last: "", comps: new Set() }).get(pid)!;
    const base = i * 16;
    let pb = 0, pv = 0;
    for (let k = 0; k < 4; k++) {
      const b = rows.bins[base + k * 4], r = rows.bins[base + k * 4 + 1], out = rows.bins[base + k * 4 + 2], v = rows.bins[base + k * 4 + 3] / 100;
      if (k >= t) { a.p[0] += b; a.p[1] += r; a.p[2] += out; a.p[3] += v; pb += b; pv += v; }
      else { a.o[0] += b; a.o[1] += r; a.o[2] += out; }
    }
    if (pb > 0) a.m.set(mi, { b: pb, v: pv });
    for (let k = 0; k < 3; k++) a.phase[k] += rows.phase[i * 3 + k];
    if (matches.date[mi] >= a.last) { a.last = matches.date[mi]; a.team = rows.team[i]; }
    a.comps.add(matches.comp[mi]);
  }

  const toEb = (a: Acc): EbInput => ({ balls: a.p[0], value: a.p[3], matches: [...a.m.values()] });
  const cohort = [...acc.values()].filter(a => a.p[0] >= COHORT_MIN_BALLS).map(toEb);
  const eb = fitEb(cohort);
  const lensIdx = q.lens === "all" ? -1 : ["powerplay", "middle", "death"].indexOf(q.lens);

  const players = [...acc.entries()]
    .filter(([, a]) => a.p[0] >= q.minBalls && a.m.size >= q.minMatches)
    .map(([pid, a]) => {
      const phaseTotal = a.phase.reduce((x, y) => x + y, 0) || 1;
      const phaseShare = a.phase.map(v => +(v / phaseTotal).toFixed(3));
      const sh = shrink(eb, a.p[0], a.p[3]);
      const [b, r, out] = a.p, [ob, orr] = a.o;
      const rate = (runs: number, balls: number) => (balls > 0 ? (role === 0 ? (runs / balls) * 100 : (runs / balls) * 6) : null);
      const pRate = rate(r, b), oRate = rate(orr, ob);
      const matchList = [...a.m.values()];
      return {
        player: s.data.players[pid],
        team: s.data.teams[a.team],
        competitions: [...a.comps].map(c => s.competitions[c].code),
        pressureBalls: b,
        pressureMatches: a.m.size,
        pressureRuns: r,
        pressureOuts: out,
        pressureRate: pRate === null ? null : +pRate.toFixed(2),     // SR (batting) or economy (bowling)
        ordinaryRate: oRate === null ? null : +oRate.toFixed(2),
        // Positive lift = better under pressure (higher SR / lower economy).
        lift: pRate === null || oRate === null ? null : +((role === 0 ? pRate - oRate : oRate - pRate)).toFixed(2),
        rawPer100: +((a.p[3] / b) * 100).toFixed(2),
        adjustedPer100: +(sh.mean * 100).toFixed(2),
        interval90: [+((sh.mean - 1.645 * sh.sd) * 100).toFixed(2), +((sh.mean + 1.645 * sh.sd) * 100).toFixed(2)],
        reliability: +sh.weight.toFixed(3),
        // Reliability = share of the score from the player's own balls (rest is the cohort average).
        confidence: sh.weight >= 0.5 ? "high" : sh.weight >= 0.3 ? "medium" : "low",
        successRate: +(matchList.filter(m => m.v > 0).length / matchList.length).toFixed(3),
        phaseShare: { powerplay: phaseShare[0], middle: phaseShare[1], death: phaseShare[2] },
      };
    })
    .filter(p => lensIdx < 0 || [p.phaseShare.powerplay, p.phaseShare.middle, p.phaseShare.death][lensIdx] >= LENS_SHARE)
    .sort((x, y) => q.sort === "conservative" ? y.interval90[0] - x.interval90[0] : y.adjustedPer100 - x.adjustedPer100);

  const compNames = q.comps.map(c => s.competitions.find(x => x.code === c)?.name ?? c);
  return {
    version: s.version,
    scope: `${compNames.join(" + ")} | ${q.from ?? "start"}–${q.to ?? "latest"} | ${q.tier} pressure (top ${q.tier === "medium" ? 50 : q.tier === "high" ? 30 : 10}% of balls by leverage) | ${q.role} | ≥${q.minBalls} pressure balls, ≥${q.minMatches} matches${q.lens === "all" ? "" : ` | ${q.lens} lens`}`,
    unit: "Runs above context expectation per 100 pressure balls (wicket cost included)",
    matches: matchSet.size,
    cohort: { players: cohort.length, mean: +(eb.mu * 100).toFixed(2), priorStrengthBalls: Math.round(eb.K), trueSpreadSd: +(Math.sqrt(eb.tau2) * 100).toFixed(2) },
    qualified: players.length,
    players: players.slice(0, q.limit ?? 50),
  };
}

export function pressureModelInfo() {
  const s = load();
  return { version: s.version, builtAt: s.builtAt, source: s.source, competitions: s.competitions, ...s.model, remainingRunsTable: undefined };
}

/** Competition codes present in the snapshot. */
export function pressureCompetitions(): string[] {
  return load().competitions.map(c => c.code);
}

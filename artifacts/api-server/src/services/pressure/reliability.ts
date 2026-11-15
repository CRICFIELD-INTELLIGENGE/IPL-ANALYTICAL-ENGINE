// Pressure Reliability — serving. Reads the published snapshot only; never trains.
// Build: node --import tsx scripts/pressure/build-pressure-reliability.ts

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../decision/db";
import { anchoredShrink, fitAnchoredEb, type AnchoredInput } from "./model";

interface Snapshot {
  version: string; builtAt: string; source: string;
  competitions: { code: string; name: string }[];
  model: Record<string, any>;
  data: {
    matches: { date: string[]; comp: number[]; fullMember: number[] };
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

/** Snapshot groups: 0 all balls, 1 rules (selected), 2 leverage top 30%, 3 leverage top 10%. */
export const DEFINITIONS = { rules: 1, leverage30: 2, leverage10: 3 } as const;
export const LENSES = ["all", "powerplay", "middle", "death"] as const;
export type Definition = keyof typeof DEFINITIONS;
export type Lens = (typeof LENSES)[number];
const NF = 6; // balls, runs, outs, value×100, dots, boundaries
const NG = 4;

export interface PressureQuery {
  comps: string[]; from?: number; to?: number;
  role: "batting" | "bowling"; definition: Definition; minBalls: number; minMatches: number; lens: Lens;
  sort?: "adjusted" | "conservative"; limit?: number;
  /** T20Is between ICC Full Members only (default), or every T20I including associate nations. */
  t20iScope?: "full-members" | "all";
}

/** A player fits a phase lens when at least this share of their balls fall in it. */
const LENS_SHARE = 0.4;

const DEF_LABEL: Record<Definition, string> = {
  rules: "Pressure = death overs, chase needing ≥9/over, or collapse (≥3 down for ≤35)",
  leverage30: "Pressure = top 30% of balls by leverage",
  leverage10: "Pressure = top 10% of balls by leverage",
};

export function pressureReliability(q: PressureQuery) {
  const s = load();
  const { matches, rows } = s.data;
  const compIdx = new Set(q.comps.map(c => s.competitions.findIndex(x => x.code === c)).filter(i => i >= 0));
  const role = q.role === "batting" ? 0 : 1;
  const g = DEFINITIONS[q.definition];

  type Acc = { all: number[]; p: number[]; pm: Map<number, { b: number; v: number }>; om: Map<number, { b: number; v: number }>; phase: number[]; team: number; last: string; comps: Set<number> };
  const acc = new Map<number, Acc>();
  const matchSet = new Set<number>();
  for (let i = 0; i < rows.match.length; i++) {
    if (rows.role[i] !== role) continue;
    const mi = rows.match[i];
    if (!compIdx.has(matches.comp[mi])) continue;
    if ((q.t20iScope ?? "full-members") === "full-members" && !matches.fullMember[mi]) continue;
    const year = Number(matches.date[mi].slice(0, 4));
    if ((q.from && year < q.from) || (q.to && year > q.to)) continue;
    matchSet.add(mi);
    const pid = rows.player[i];
    const a = acc.get(pid) ?? acc.set(pid, { all: new Array(NF).fill(0), p: new Array(NF).fill(0), pm: new Map(), om: new Map(), phase: [0, 0, 0], team: rows.team[i], last: "", comps: new Set() }).get(pid)!;
    const base = i * NG * NF;
    for (let k = 0; k < NF; k++) { a.all[k] += rows.bins[base + k]; a.p[k] += rows.bins[base + g * NF + k]; }
    const pb = rows.bins[base + g * NF], pv = rows.bins[base + g * NF + 3] / 100;
    const ob = rows.bins[base] - pb, ov = rows.bins[base + 3] / 100 - pv;
    if (pb > 0) a.pm.set(mi, { b: pb, v: pv });
    if (ob > 0) a.om.set(mi, { b: ob, v: ov });
    for (let k = 0; k < 3; k++) a.phase[k] += rows.phase[i * 3 + k];
    if (matches.date[mi] >= a.last) { a.last = matches.date[mi]; a.team = rows.team[i]; }
    a.comps.add(matches.comp[mi]);
  }

  const inputOf = (a: Acc): AnchoredInput => ({
    pB: a.p[0], pV: a.p[3] / 100, pMatches: [...a.pm.values()],
    oB: a.all[0] - a.p[0], oV: (a.all[3] - a.p[3]) / 100, oMatches: [...a.om.values()],
  });
  const fit = fitAnchoredEb([...acc.values()].map(inputOf));
  const lensIdx = q.lens === "all" ? -1 : ["powerplay", "middle", "death"].indexOf(q.lens);
  const per100 = (v: number) => +(v * 100).toFixed(2);

  const players = [...acc.entries()]
    .filter(([, a]) => a.p[0] >= q.minBalls && a.pm.size >= q.minMatches)
    .map(([pid, a]) => {
      const inp = inputOf(a);
      const sh = anchoredShrink(fit, inp);
      const [b, r, out, , dots, bnd] = a.p;
      const ob = a.all[0] - b, orr = a.all[1] - r, oout = a.all[2] - out, odots = a.all[4] - dots;
      const phaseTotal = a.phase.reduce((x, y) => x + y, 0) || 1;
      const rate = (runs: number, balls: number) => (balls > 0 ? (role === 0 ? (runs / balls) * 100 : (runs / balls) * 6) : null);
      const pRate = rate(r, b), oRate = rate(orr, ob);
      const matchList = [...a.pm.values()];
      return {
        player: s.data.players[pid],
        team: s.data.teams[a.team],
        competitions: [...a.comps].map(c => s.competitions[c].code),
        pressureBalls: b,
        pressureMatches: a.pm.size,
        ordinaryBalls: ob,
        // Batting: SR, average, dot %, boundary %. Bowling: economy, balls per wicket, dot %, boundary %.
        pressure: {
          rate: pRate === null ? null : +pRate.toFixed(2),
          perOut: out > 0 ? +(role === 0 ? r / out : b / out).toFixed(1) : null,
          outs: out, dotPct: b ? +((dots / b) * 100).toFixed(1) : null, boundaryPct: b ? +((bnd / b) * 100).toFixed(1) : null,
        },
        ordinary: {
          rate: oRate === null ? null : +oRate.toFixed(2),
          perOut: oout > 0 ? +(role === 0 ? orr / oout : ob / oout).toFixed(1) : null,
          dotPct: ob ? +((odots / ob) * 100).toFixed(1) : null,
        },
        // Positive = better under pressure (higher SR / lower economy).
        rateLift: pRate === null || oRate === null ? null : +((role === 0 ? pRate - oRate : oRate - pRate)).toFixed(2),
        // Contextual value, runs above expectation per 100 balls (wicket cost included; bowlers from the bowling side).
        rawPer100: per100(sh.rP),
        ordinaryPer100: per100(sh.rO),
        usualPer100: per100(sh.usual),
        expectedFromUsualPer100: per100(sh.prior),
        adjustedPer100: per100(sh.mean),
        interval90: [per100(sh.mean - 1.645 * sh.sd), per100(sh.mean + 1.645 * sh.sd)],
        upliftRawPer100: per100(sh.rP - sh.rO),
        upliftAdjustedPer100: per100(sh.mean - sh.usual),
        // Share of the estimate that comes from the player's own pressure balls (the rest from their usual level).
        evidenceWeight: +sh.weight.toFixed(3),
        goodMatchRate: +(matchList.filter(m => m.v > 0).length / matchList.length).toFixed(3),
        phaseShare: { powerplay: +(a.phase[0] / phaseTotal).toFixed(3), middle: +(a.phase[1] / phaseTotal).toFixed(3), death: +(a.phase[2] / phaseTotal).toFixed(3) },
      };
    })
    .filter(p => lensIdx < 0 || [p.phaseShare.powerplay, p.phaseShare.middle, p.phaseShare.death][lensIdx] >= LENS_SHARE)
    .sort((x, y) => q.sort === "conservative" ? y.interval90[0] - x.interval90[0] : y.adjustedPer100 - x.adjustedPer100);

  const compNames = q.comps.map(c => s.competitions.find(x => x.code === c)?.name ?? c);
  return {
    version: s.version,
    definition: q.definition,
    definitionLabel: DEF_LABEL[q.definition],
    scope: `${compNames.join(" + ")} | ${q.from ?? s.model.rowsFrom?.slice(0, 4) ?? "start"}–${q.to ?? "latest"} | ${q.role} | ≥${q.minBalls} pressure balls, ≥${q.minMatches} matches${q.lens === "all" ? "" : ` | ${q.lens} lens`}${q.comps.includes("t20i") ? ((q.t20iScope ?? "full-members") === "full-members" ? " | T20I: Full Members only" : " | T20I: all nations") : ""}`,
    unit: "Runs above context expectation per 100 balls (wicket cost included)",
    matches: matchSet.size,
    cohort: {
      players: fit.players,
      pressureMeanPer100: per100(fit.muP), ordinaryMeanPer100: per100(fit.muO),
      // How strongly usual form predicts pressure form, and how many pressure balls before half the estimate is pressure-specific.
      usualToPressureSlope: +fit.beta.toFixed(3), priorStrengthBalls: Math.round(fit.K), usualPriorStrengthBalls: Math.round(fit.KO),
      pressureSpecificSdPer100: per100(Math.sqrt(fit.tau2)),
    },
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

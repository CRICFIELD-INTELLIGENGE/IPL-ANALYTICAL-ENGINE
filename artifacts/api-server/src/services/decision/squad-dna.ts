// Decision Intelligence OS — Phase 4: Squad DNA.
//
// Every franchise-season is measured on 38 dimensions of how it actually
// played — phase scoring and bowling, spin/pace game, depth, composition
// and results. Each dimension is turned into a z-score *within its own
// season* (so a 2010 powerplay and a 2026 powerplay are compared fairly)
// and then a percentile across all team-seasons.
//
//   Fingerprint      11 grouped axes (mean of their dimensions' scores)
//   Importance       correlation of each dimension with win % across all team-seasons
//   Vulnerability    importance-weighted shortfall below the 50th percentile (0–100)
//   Twins            most similar team-seasons in history (cosine on z-vectors)
//   History's best   the team-season that tops each dimension

import { F_FACED, F_LEGAL, F_WICKET, getBallColumns } from "./ball-context";
import { getPlayerMeta, getRoster, getSeasonLines, getSeasons } from "./player-profiles";
import { franchiseOf, getFranchiseRefs, resolveFranchise } from "./stats-engine";
import { bowlingSubtype } from "./player-profiles";
import { phaseOf } from "./match-model";

type Direction = "high" | "low" | "style";

interface DimDef { key: string; label: string; group: string; unit: string; dp: number; direction: Direction }

export const DIMENSIONS: DimDef[] = [
  { key: "pp_rr", label: "Powerplay run rate", group: "Powerplay batting", unit: "rpo", dp: 2, direction: "high" },
  { key: "pp_wkts_lost", label: "Powerplay wickets lost / innings", group: "Powerplay batting", unit: "", dp: 2, direction: "low" },
  { key: "mid_rr", label: "Middle-overs run rate", group: "Middle batting", unit: "rpo", dp: 2, direction: "high" },
  { key: "death_rr", label: "Death-overs run rate", group: "Death batting", unit: "rpo", dp: 2, direction: "high" },
  { key: "sixes_pm", label: "Sixes per match", group: "Death batting", unit: "", dp: 1, direction: "high" },
  { key: "bat_avg", label: "Runs per wicket", group: "Batting depth", unit: "", dp: 1, direction: "high" },
  { key: "bat_dot", label: "Dot % faced", group: "Batting depth", unit: "%", dp: 1, direction: "low" },
  { key: "bat_bnd", label: "Boundary % (batting)", group: "Batting depth", unit: "%", dp: 1, direction: "high" },
  { key: "first_inns", label: "Average first-innings total", group: "Batting depth", unit: "", dp: 1, direction: "high" },
  { key: "top3_share", label: "Share of runs from top 3 scorers", group: "Batting depth", unit: "%", dp: 1, direction: "style" },
  { key: "left_share", label: "Left-hander share of balls faced", group: "Batting depth", unit: "%", dp: 1, direction: "style" },
  { key: "spin_sr", label: "Strike rate vs spin", group: "Spin game", unit: "", dp: 1, direction: "high" },
  { key: "pace_sr", label: "Strike rate vs pace", group: "Pace game", unit: "", dp: 1, direction: "high" },
  { key: "pp_econ", label: "Powerplay economy", group: "Powerplay bowling", unit: "rpo", dp: 2, direction: "low" },
  { key: "pp_wkts", label: "Powerplay wickets / innings", group: "Powerplay bowling", unit: "", dp: 2, direction: "high" },
  { key: "mid_econ", label: "Middle-overs economy", group: "Middle bowling", unit: "rpo", dp: 2, direction: "low" },
  { key: "mid_wkts", label: "Middle-overs wickets / innings", group: "Middle bowling", unit: "", dp: 2, direction: "high" },
  { key: "death_econ", label: "Death economy", group: "Death bowling", unit: "rpo", dp: 2, direction: "low" },
  { key: "death_wkts", label: "Death wickets / innings", group: "Death bowling", unit: "", dp: 2, direction: "high" },
  { key: "death_depth", label: "Bowlers holding the death (≥6 death overs, below league economy)", group: "Death bowling", unit: "", dp: 0, direction: "high" },
  { key: "bowl_dot", label: "Dot % bowled", group: "Bowling control", unit: "%", dp: 1, direction: "high" },
  { key: "bowl_bnd", label: "Boundary % conceded", group: "Bowling control", unit: "%", dp: 1, direction: "low" },
  { key: "wkts_pm", label: "Wickets per match", group: "Bowling control", unit: "", dp: 2, direction: "high" },
  { key: "spin_econ", label: "Spin economy", group: "Spin game", unit: "rpo", dp: 2, direction: "low" },
  { key: "pace_econ", label: "Pace economy", group: "Pace game", unit: "rpo", dp: 2, direction: "low" },
  { key: "spin_share", label: "Share of overs bowled by spin", group: "Spin game", unit: "%", dp: 1, direction: "style" },
  { key: "left_arm_share", label: "Share of balls from left-arm bowlers", group: "Bowling control", unit: "%", dp: 1, direction: "style" },
  { key: "bowlers_per_inns", label: "Bowlers used per innings", group: "Bowling control", unit: "", dp: 1, direction: "style" },
  { key: "experience", label: "Prior IPL matches per player", group: "Squad", unit: "", dp: 1, direction: "high" },
  { key: "youth_share", label: "Appearances by players in their first two IPL seasons", group: "Squad", unit: "%", dp: 1, direction: "style" },
  { key: "overseas_share", label: "Overseas share of balls", group: "Squad", unit: "%", dp: 1, direction: "style" },
  { key: "players_used", label: "Players used", group: "Squad", unit: "", dp: 0, direction: "low" },
  { key: "allrounders", label: "All-rounders (60+ balls faced and bowled)", group: "Squad", unit: "", dp: 0, direction: "high" },
  { key: "win_pct", label: "Win %", group: "Results", unit: "%", dp: 1, direction: "high" },
  { key: "nrr", label: "Net run rate", group: "Results", unit: "", dp: 2, direction: "high" },
  { key: "close_win_pct", label: "Win % in close games", group: "Results", unit: "%", dp: 1, direction: "high" },
  { key: "bat_first_win", label: "Win % batting first", group: "Results", unit: "%", dp: 1, direction: "high" },
  { key: "chase_win", label: "Win % chasing", group: "Results", unit: "%", dp: 1, direction: "high" },
];
const GROUPS = ["Powerplay batting", "Middle batting", "Death batting", "Batting depth", "Powerplay bowling", "Middle bowling", "Death bowling", "Bowling control", "Spin game", "Pace game", "Squad", "Results"];

interface TeamSeason { key: string; franchise: string; short: string; season: number; matches: number; raw: Record<string, number | null>; z: Record<string, number | null> }

let store: { list: TeamSeason[]; byKey: Map<string, TeamSeason>; importance: Record<string, number> } | null = null;

function build() {
  if (store) return store;
  const c = getBallColumns();
  const meta = getPlayerMeta();
  const lines = getSeasonLines();
  type Acc = {
    franchise: string; short: string; season: number;
    bat: { legal: number[]; runs: number[]; wk: number[]; bnd: number; dots: number; faced: number; sixes: number; bRuns: number; spinR: number; spinB: number; paceR: number; paceB: number; leftB: number; knownHandB: number; wkTotal: number; runsTotal: number; legalTotal: number };
    bowl: { legal: number[]; runs: number[]; wk: number[]; dots: number; bnd: number; spinB: number; spinR: number; paceB: number; paceR: number; leftArmB: number; legalTotal: number; runsTotal: number; wkTotal: number };
    batterRuns: Map<number, number>;
    batInnings: Set<number>; bowlInnings: Set<number>;
    bowlerDeath: Map<number, { b: number; r: number }>;
    bowlersByInnings: Map<number, Set<number>>;
    firstInnings: Map<number, number>;
    playersBall: Map<number, { faced: number; bowled: number }>;
    overseasBalls: number; totalBalls: number;
  };
  const accs = new Map<string, Acc>();
  const get = (teamId: number, season: number) => {
    const fr = franchiseOf(teamId);
    if (!fr) return null;
    const key = `${fr.short}:${season}`;
    let a = accs.get(key);
    if (!a) {
      a = {
        franchise: fr.name, short: fr.short, season,
        bat: { legal: [0, 0, 0], runs: [0, 0, 0], wk: [0, 0, 0], bnd: 0, dots: 0, faced: 0, sixes: 0, bRuns: 0, spinR: 0, spinB: 0, paceR: 0, paceB: 0, leftB: 0, knownHandB: 0, wkTotal: 0, runsTotal: 0, legalTotal: 0 },
        bowl: { legal: [0, 0, 0], runs: [0, 0, 0], wk: [0, 0, 0], dots: 0, bnd: 0, spinB: 0, spinR: 0, paceB: 0, paceR: 0, leftArmB: 0, legalTotal: 0, runsTotal: 0, wkTotal: 0 },
        batterRuns: new Map(), batInnings: new Set(), bowlInnings: new Set(), bowlerDeath: new Map(), bowlersByInnings: new Map(),
        firstInnings: new Map(), playersBall: new Map(), overseasBalls: 0, totalBalls: 0,
      };
      accs.set(key, a);
    }
    return a;
  };
  const leftArm = new Map<number, boolean>();
  const isLeftArm = (b: number) => {
    let v = leftArm.get(b);
    if (v === undefined) { const m = meta.get(b); v = Boolean(m && /^Left-arm/.test(bowlingSubtype(m) ?? "")); leftArm.set(b, v); }
    return v;
  };
  const leagueDeath = new Map<number, { b: number; r: number }>();
  for (let i = 0; i < c.n; i++) {
    const s = c.season[i];
    const ph = phaseOf(c.over[i]);
    const f = c.flags[i];
    const legal = f & F_LEGAL ? 1 : 0;
    const wk = f & F_WICKET ? 1 : 0;
    const tr = c.totalRuns[i], br = c.batterRuns[i];
    const spin = meta.get(c.bowler[i])?.bowlingType === "spin";
    const B = get(c.battingTeam[i], s), W = get(c.bowlingTeam[i], s);
    if (B) {
      const t = B.bat;
      t.legal[ph] += legal; t.runs[ph] += tr; t.wk[ph] += wk;
      t.legalTotal += legal; t.runsTotal += tr; t.wkTotal += wk;
      if (f & F_FACED) {
        t.faced++; t.bRuns += br;
        if (br === 4 || br === 6) t.bnd++;
        if (br === 6) t.sixes++;
        if (br === 0) t.dots++;
        if (spin) { t.spinB++; t.spinR += br; } else { t.paceB++; t.paceR += br; }
        const hand = meta.get(c.batter[i])?.battingHand;
        if (hand) { t.knownHandB++; if (hand === "L") t.leftB++; }
        const pb = B.playersBall.get(c.batter[i]) ?? { faced: 0, bowled: 0 };
        pb.faced++;
        B.playersBall.set(c.batter[i], pb);
        B.totalBalls++;
        if (meta.get(c.batter[i])?.overseas) B.overseasBalls++;
      }
      B.batterRuns.set(c.batter[i], (B.batterRuns.get(c.batter[i]) ?? 0) + br);
      B.batInnings.add(c.innings[i]);
      if (c.inningsNumber[i] === 1) B.firstInnings.set(c.innings[i], (B.firstInnings.get(c.innings[i]) ?? 0) + tr);
    }
    if (W) {
      const t = W.bowl;
      t.legal[ph] += legal; t.runs[ph] += tr; t.wk[ph] += wk;
      t.legalTotal += legal; t.runsTotal += tr; t.wkTotal += wk;
      if (legal && tr === 0) t.dots++;
      if (br === 4 || br === 6) t.bnd++;
      if (spin) { t.spinB += legal; t.spinR += c.conceded[i]; } else { t.paceB += legal; t.paceR += c.conceded[i]; }
      if (isLeftArm(c.bowler[i])) t.leftArmB += legal;
      W.bowlInnings.add(c.innings[i]);
      const set = W.bowlersByInnings.get(c.innings[i]) ?? new Set<number>();
      set.add(c.bowler[i]);
      W.bowlersByInnings.set(c.innings[i], set);
      if (ph === 2) {
        const d = W.bowlerDeath.get(c.bowler[i]) ?? { b: 0, r: 0 };
        d.b += legal; d.r += c.conceded[i];
        W.bowlerDeath.set(c.bowler[i], d);
        const ld = leagueDeath.get(s) ?? { b: 0, r: 0 };
        ld.b += legal; ld.r += c.conceded[i];
        leagueDeath.set(s, ld);
      }
      if (legal) {
        const pb = W.playersBall.get(c.bowler[i]) ?? { faced: 0, bowled: 0 };
        pb.bowled++;
        W.playersBall.set(c.bowler[i], pb);
        W.totalBalls++;
        if (meta.get(c.bowler[i])?.overseas) W.overseasBalls++;
      }
    }
  }

  // Results per franchise-season.
  const results = new Map<string, { m: number; w: number; nr: number; close: number; closeW: number; bf: number; bfW: number; ch: number; chW: number }>();
  const firstBat = new Map<number, number>();
  for (let i = 0; i < c.n; i++) if (c.inningsNumber[i] === 1 && !firstBat.has(c.match[i])) firstBat.set(c.match[i], c.battingTeam[i]);
  c.matches.forEach((m, mi) => {
    for (const team of [m.team1, m.team2]) {
      const fr = franchiseOf(team);
      if (!fr) continue;
      const key = `${fr.short}:${m.season}`;
      const r = results.get(key) ?? { m: 0, w: 0, nr: 0, close: 0, closeW: 0, bf: 0, bfW: 0, ch: 0, chW: 0 };
      r.m++;
      if (m.winner === null) { r.nr++; results.set(key, r); continue; }
      const won = franchiseOf(m.winner)?.short === fr.short;
      if (won) r.w++;
      const close = (m.marginType === "runs" && (m.marginValue ?? 99) <= 10) || (m.marginType === "wickets" && (m.marginValue ?? 99) <= 3);
      if (close) { r.close++; if (won) r.closeW++; }
      const battedFirst = firstBat.get(mi) === team;
      if (battedFirst) { r.bf++; if (won) r.bfW++; } else { r.ch++; if (won) r.chW++; }
      results.set(key, r);
    }
  });

  // Squad composition from the roster (appearances by team-season).
  const comp = new Map<string, { appearances: number; priorSum: number; youth: number; players: Set<number> }>();
  for (const season of getSeasons()) {
    for (const r of getRoster(season)) {
      const fr = franchiseOf(r.teamId);
      if (!fr) continue;
      const key = `${fr.short}:${season}`;
      const e = comp.get(key) ?? { appearances: 0, priorSum: 0, youth: 0, players: new Set<number>() };
      const ls = lines.get(r.playerId) ?? [];
      const prior = ls.filter((l) => Number(l.season) < Number(season)).reduce((s, l) => s + l.matches, 0);
      const seasonsBefore = ls.filter((l) => Number(l.season) < Number(season)).length;
      e.appearances += r.matches;
      e.priorSum += prior * r.matches;
      if (seasonsBefore < 2) e.youth += r.matches;
      e.players.add(r.playerId);
      comp.set(key, e);
    }
  }

  const list: TeamSeason[] = [];
  for (const [key, a] of accs) {
    const res = results.get(key);
    if (!res || res.m < 8) continue;
    const cm = comp.get(key);
    const bat = a.bat, bowl = a.bowl;
    const nBat = Math.max(1, a.batInnings.size), nBowl = Math.max(1, a.bowlInnings.size);
    const rpo = (r: number, b: number) => (b ? (r / b) * 6 : null);
    const pct = (x: number, y: number) => (y ? (x / y) * 100 : null);
    const runsSorted = [...a.batterRuns.values()].sort((x, y) => y - x);
    const ld = leagueDeath.get(a.season);
    const lgDeathEcon = ld && ld.b ? (ld.r / ld.b) * 6 : 9;
    const depth = [...a.bowlerDeath.values()].filter((d) => d.b >= 36 && (d.r / d.b) * 6 <= lgDeathEcon).length;
    const allrounders = [...a.playersBall.values()].filter((p) => p.faced >= 60 && p.bowled >= 60).length;
    const raw: Record<string, number | null> = {
      pp_rr: rpo(bat.runs[0], bat.legal[0]), pp_wkts_lost: bat.wk[0] / nBat,
      mid_rr: rpo(bat.runs[1], bat.legal[1]), death_rr: rpo(bat.runs[2], bat.legal[2]),
      sixes_pm: bat.sixes / res.m, bat_avg: bat.wkTotal ? bat.runsTotal / bat.wkTotal : null,
      bat_dot: pct(bat.dots, bat.faced), bat_bnd: pct(bat.bnd, bat.faced),
      first_inns: a.firstInnings.size ? [...a.firstInnings.values()].reduce((s, x) => s + x, 0) / a.firstInnings.size : null,
      top3_share: pct(runsSorted.slice(0, 3).reduce((s, x) => s + x, 0), bat.bRuns),
      left_share: pct(bat.leftB, bat.knownHandB),
      spin_sr: pct(bat.spinR, bat.spinB), pace_sr: pct(bat.paceR, bat.paceB),
      pp_econ: rpo(bowl.runs[0], bowl.legal[0]), pp_wkts: bowl.wk[0] / nBowl,
      mid_econ: rpo(bowl.runs[1], bowl.legal[1]), mid_wkts: bowl.wk[1] / nBowl,
      death_econ: rpo(bowl.runs[2], bowl.legal[2]), death_wkts: bowl.wk[2] / nBowl, death_depth: depth,
      bowl_dot: pct(bowl.dots, bowl.legalTotal), bowl_bnd: pct(bowl.bnd, bowl.legalTotal), wkts_pm: bowl.wkTotal / res.m,
      spin_econ: rpo(bowl.spinR, bowl.spinB), pace_econ: rpo(bowl.paceR, bowl.paceB),
      spin_share: pct(bowl.spinB, bowl.spinB + bowl.paceB), left_arm_share: pct(bowl.leftArmB, bowl.legalTotal),
      bowlers_per_inns: a.bowlersByInnings.size ? [...a.bowlersByInnings.values()].reduce((s, x) => s + x.size, 0) / a.bowlersByInnings.size : null,
      experience: cm && cm.appearances ? cm.priorSum / cm.appearances : null,
      youth_share: cm ? pct(cm.youth, cm.appearances) : null,
      overseas_share: pct(a.overseasBalls, a.totalBalls),
      players_used: cm?.players.size ?? null, allrounders,
      win_pct: pct(res.w, res.m - res.nr),
      nrr: bat.legalTotal && bowl.legalTotal ? (bat.runsTotal / bat.legalTotal) * 6 - (bowl.runsTotal / bowl.legalTotal) * 6 : null,
      close_win_pct: res.close ? pct(res.closeW, res.close) : null,
      bat_first_win: res.bf ? pct(res.bfW, res.bf) : null,
      chase_win: res.ch ? pct(res.chW, res.ch) : null,
    };
    list.push({ key, franchise: a.franchise, short: a.short, season: a.season, matches: res.m, raw, z: {} });
  }

  // z within season, then importance = correlation with win % z.
  const seasons = [...new Set(list.map((t) => t.season))];
  for (const d of DIMENSIONS) {
    for (const s of seasons) {
      const ts = list.filter((t) => t.season === s && t.raw[d.key] !== null);
      const vals = ts.map((t) => t.raw[d.key] as number);
      const mean = vals.reduce((x, y) => x + y, 0) / Math.max(1, vals.length);
      const sd = Math.sqrt(vals.reduce((x, y) => x + (y - mean) ** 2, 0) / Math.max(1, vals.length)) || 1;
      for (const t of list.filter((x) => x.season === s)) t.z[d.key] = t.raw[d.key] === null ? null : ((t.raw[d.key] as number) - mean) / sd;
    }
  }
  const importance: Record<string, number> = {};
  for (const d of DIMENSIONS) {
    if (d.group === "Results") continue;
    const pairs = list.filter((t) => t.z[d.key] !== null && t.z.win_pct !== null).map((t) => [t.z[d.key] as number, t.z.win_pct as number]);
    const n = pairs.length;
    const mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
    const cov = pairs.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
    const vx = pairs.reduce((s, p) => s + (p[0] - mx) ** 2, 0), vy = pairs.reduce((s, p) => s + (p[1] - my) ** 2, 0);
    const r = vx && vy ? cov / Math.sqrt(vx * vy) : 0;
    // Orient so positive means "the good direction helps you win".
    importance[d.key] = d.direction === "low" ? -r : r;
  }
  store = { list, byKey: new Map(list.map((t) => [t.key, t])), importance };
  return store;
}

/* ─── Profiles ───────────────────────────────────────────────────────────── */

export interface DimensionView {
  key: string; label: string; group: string; unit: string; direction: Direction;
  value: number | null; display: string; percentile: number | null; score: number | null; importance: number | null;
  best: { team: string; season: number; display: string } | null;
}

export interface SquadProfile {
  franchise: string; short: string; season: number; matches: number;
  fingerprint: { group: string; score: number | null }[];
  dimensions: DimensionView[];
  vulnerability: { score: number; exposures: { label: string; score: number; importance: number }[] };
  strengths: { label: string; score: number }[];
  twins: { franchise: string; short: string; season: number; similarity: number; winPct: number | null }[];
  roster: { playerId: number; name: string; matches: number }[];
}

function fmt(d: DimDef, v: number | null) {
  if (v === null) return "—";
  return `${v.toFixed(d.dp)}${d.unit === "%" ? "%" : ""}`;
}

function percentileOf(values: number[], v: number) {
  const below = values.filter((x) => x < v).length, eq = values.filter((x) => x === v).length;
  return Math.round(((below + eq / 2) / values.length) * 100);
}

export function squadProfile(teamKey: string, seasonIn?: number): SquadProfile | null {
  const st = build();
  const fr = resolveFranchise(teamKey);
  if (!fr) return null;
  const season = seasonIn ?? Math.max(...st.list.filter((t) => t.short === fr.short).map((t) => t.season));
  const me = st.byKey.get(`${fr.short}:${season}`);
  if (!me) return null;
  const dims: DimensionView[] = DIMENSIONS.map((d) => {
    const zs = st.list.map((t) => t.z[d.key]).filter((x): x is number => x !== null);
    const z = me.z[d.key];
    const p = z === null ? null : percentileOf(zs, z);
    const score = p === null ? null : d.direction === "low" ? 100 - p : p;
    const ranked = st.list.filter((t) => t.z[d.key] !== null).sort((a, b) => (d.direction === "low" ? (a.z[d.key] as number) - (b.z[d.key] as number) : (b.z[d.key] as number) - (a.z[d.key] as number)));
    const top = d.direction === "style" ? null : ranked[0];
    return {
      key: d.key, label: d.label, group: d.group, unit: d.unit, direction: d.direction,
      value: me.raw[d.key], display: fmt(d, me.raw[d.key]), percentile: p, score,
      importance: d.group === "Results" ? null : Math.round(st.importance[d.key] * 100) / 100,
      best: top ? { team: top.short, season: top.season, display: fmt(d, top.raw[d.key]) } : null,
    };
  });
  const fingerprint = GROUPS.map((g) => {
    const scored = dims.filter((d) => d.group === g && d.direction !== "style" && d.score !== null);
    return { group: g, score: scored.length ? Math.round(scored.reduce((s, d) => s + d.score!, 0) / scored.length) : null };
  });
  const weighted = dims.filter((d) => d.importance !== null && d.importance > 0.1 && d.score !== null && d.direction !== "style");
  const totalW = weighted.reduce((s, d) => s + d.importance!, 0) || 1;
  const vulnScore = Math.round((weighted.reduce((s, d) => s + d.importance! * Math.max(0, 50 - d.score!) / 50, 0) / totalW) * 100);
  const exposures = weighted.filter((d) => d.score! < 40).sort((a, b) => b.importance! * (50 - b.score!) - a.importance! * (50 - a.score!)).slice(0, 4)
    .map((d) => ({ label: d.label, score: d.score!, importance: d.importance! }));
  const strengths = dims.filter((d) => d.direction !== "style" && d.score !== null && d.score >= 80 && d.group !== "Results").sort((a, b) => b.score! - a.score!).slice(0, 4).map((d) => ({ label: d.label, score: d.score! }));

  // Twins: cosine similarity over non-results, non-style z.
  const keys = DIMENSIONS.filter((d) => d.group !== "Results").map((d) => d.key);
  const vec = (t: TeamSeason) => keys.map((k) => t.z[k] ?? 0);
  const mv = vec(me);
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const twins = st.list.filter((t) => t.key !== me.key)
    .map((t) => { const v = vec(t); return { t, cos: mv.reduce((s, x, i) => s + x * v[i], 0) / (norm(mv) * norm(v)) }; })
    .sort((a, b) => b.cos - a.cos).slice(0, 5)
    .map(({ t, cos }) => ({ franchise: t.franchise, short: t.short, season: t.season, similarity: Math.max(0, Math.round(cos * 100)), winPct: t.raw.win_pct !== null ? Math.round((t.raw.win_pct as number) * 10) / 10 : null }));

  const meta = getPlayerMeta();
  const roster = getRoster(String(season)).filter((r) => fr.teamIds.includes(r.teamId)).sort((a, b) => b.matches - a.matches)
    .map((r) => ({ playerId: r.playerId, name: meta.get(r.playerId)?.name ?? `#${r.playerId}`, matches: r.matches }));

  return { franchise: me.franchise, short: me.short, season, matches: me.matches, fingerprint, dimensions: dims, vulnerability: { score: vulnScore, exposures }, strengths, twins, roster };
}

export function squadTeams(): { franchise: string; short: string; seasons: number[] }[] {
  const st = build();
  return getFranchiseRefs().map((f) => ({ franchise: f.name, short: f.short, seasons: st.list.filter((t) => t.short === f.short).map((t) => t.season).sort((a, b) => b - a) }))
    .filter((f) => f.seasons.length).sort((a, b) => b.seasons[0] - a.seasons[0] || a.franchise.localeCompare(b.franchise));
}

export function compareSquads(a: { team: string; season?: number }, b: { team: string; season?: number }) {
  const pa = squadProfile(a.team, a.season), pb = squadProfile(b.team, b.season);
  if (!pa || !pb) return null;
  const st = build();
  const keys = DIMENSIONS.filter((d) => d.group !== "Results").map((d) => d.key);
  const za = keys.map((k) => st.byKey.get(`${pa.short}:${pa.season}`)!.z[k] ?? 0);
  const zb = keys.map((k) => st.byKey.get(`${pb.short}:${pb.season}`)!.z[k] ?? 0);
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const cos = za.reduce((s, x, i) => s + x * zb[i], 0) / (norm(za) * norm(zb));
  const gaps = pa.dimensions.map((d, i) => ({ label: d.label, a: d.score, b: pb.dimensions[i].score, aDisplay: d.display, bDisplay: pb.dimensions[i].display, direction: d.direction }))
    .filter((g) => g.a !== null && g.b !== null && g.direction !== "style")
    .sort((x, y) => Math.abs(y.a! - y.b!) - Math.abs(x.a! - x.b!));
  // Signed: +1 = same shape of strengths and weaknesses, −1 = mirror images.
  return { a: pa, b: pb, correlation: Math.round(cos * 100) / 100, biggestGaps: gaps.slice(0, 6) };
}

export function warmSquadDna(): void { build(); }

/** Weakest dimension keys for a franchise-season (used by the Auction War Room's fit score). */
export function squadGaps(teamKey: string, season?: number): { key: string; label: string; score: number; importance: number }[] {
  const p = squadProfile(teamKey, season);
  if (!p) return [];
  return p.dimensions.filter((d) => d.direction !== "style" && d.group !== "Results" && d.score !== null && d.importance !== null && d.importance > 0.05)
    .map((d) => ({ key: d.key, label: d.label, score: d.score!, importance: d.importance! }))
    .sort((a, b) => b.importance * (50 - b.score) - a.importance * (50 - a.score))
    .slice(0, 4)
    .filter((g) => g.score < 50);
}

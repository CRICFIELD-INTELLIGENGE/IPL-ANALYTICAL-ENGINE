// Decision Intelligence OS — Phase 3: Opposition Exploit Map.
//
// A pre-match briefing for one franchise against another, built from both
// squads' real records:
//   • each opposition batter's sharpest tested weakness (weakness-detector)
//   • a spin-type grid and death-overs threat list for their batters
//   • our bowling rotation, planned against their actual batting order
//   • a full-match Monte Carlo (both batting orders) → win chance and toss call
//   • head-to-head and venue context

import { F_FACED, F_LEGAL, getBallColumns } from "./ball-context";
import {
  getProfiles, likelyAttack, likelyBattingOrder, lineupCost, optimalPolicy, overExpectation,
  planOvers, quantile, rng, simulateInnings, teamSeasonSquad, venueBoundaryFactor, type InningsState,
} from "./match-model";
import { playerName } from "./innings-snapshot";
import { bowlingSubtype, getPlayerMeta, getSeasons } from "./player-profiles";
import { resolveFranchise, resolveVenue, type FranchiseRef } from "./stats-engine";
import { scanPlayer } from "./weakness-detector";

export interface OppositionRequest { team: string; opponent: string; venue?: string; season?: number; sims?: number }

type Vuln = "High" | "Med" | "Low" | "—";

export interface BatterBrief {
  playerId: number;
  name: string;
  position: number;
  balls: number;
  strikeRate: number | null;
  trap: string | null;
  trapConfidence: number;
  trapSignificant: boolean;
  srInTrap: number | null;
  dismissalWindow: string | null;
  exploit: string | null;
  vulnerabilityIndex: number;
  spin: Record<"Leg-spin" | "Left-arm orthodox" | "Off-spin", { balls: number; sr: number | null; ballsPerOut: number | null; vulnerability: Vuln }>;
}

export interface OppositionReport {
  team: string;
  teamName: string;
  opponent: string;
  opponentName: string;
  season: number;
  venue: string | null;
  winProbability: { overall: number; battingFirst: number; chasing: number; toss: string; medianTotalBattingFirst: number; medianOppTotalBattingFirst: number; sims: number };
  tacticalOverview: string[];
  batters: BatterBrief[];
  deathThreats: { playerId: number; name: string; deathSR: number; deathBalls: number; boundaryPct: number; vsPaceSR: number | null; vsSpinSR: number | null; counter: string }[];
  rotation: { phase: string; overs: string; bowlers: { playerId: number; name: string; overs: number; type: string }[]; expectedEconomy: number; mission: string }[];
  headToHead: { played: number; won: number; lost: number; recentPlayed: number; recentWon: number };
  venueProfile: { matches: number; avgFirstInnings: number | null; chasingWinPct: number | null; paceEconomy: number | null; spinEconomy: number | null } | null;
}

interface Line { balls: number; runs: number; outs: number; bnd: number }
const emptyLine = (): Line => ({ balls: 0, runs: 0, outs: 0, bnd: 0 });

/** Batting lines for a set of batters by subtype and in the death, over seasons ≥ from. */
function batterSplits(batters: number[], fromSeason: number) {
  const c = getBallColumns();
  const meta = getPlayerMeta();
  const want = new Set(batters);
  const sub = new Map<number, string | null>();
  const subOf = (b: number) => { if (!sub.has(b)) { const m = meta.get(b); sub.set(b, m ? bowlingSubtype(m) : null); } return sub.get(b)!; };
  const out = new Map<number, { all: Line; bySub: Map<string, Line>; death: Line; deathPace: Line; deathSpin: Line }>();
  for (let i = 0; i < c.n; i++) {
    if (!want.has(c.batter[i]) || c.season[i] < fromSeason || !(c.flags[i] & F_FACED)) continue;
    const e = out.get(c.batter[i]) ?? { all: emptyLine(), bySub: new Map(), death: emptyLine(), deathPace: emptyLine(), deathSpin: emptyLine() };
    const r = c.batterRuns[i], o = c.outPlayer[i] === c.batter[i] ? 1 : 0, bd = r === 4 || r === 6 ? 1 : 0;
    const add = (l: Line) => { l.balls++; l.runs += r; l.outs += o; l.bnd += bd; };
    add(e.all);
    const s = subOf(c.bowler[i]);
    if (s) { const l = e.bySub.get(s) ?? emptyLine(); add(l); e.bySub.set(s, l); }
    if (c.over[i] >= 15) {
      add(e.death);
      const t = meta.get(c.bowler[i])?.bowlingType; // unknown types count in death totals only
      if (t === "spin") add(e.deathSpin); else if (t === "pace") add(e.deathPace);
    }
    out.set(c.batter[i], e);
  }
  return out;
}

const sr = (l: Line) => (l.balls ? Math.round((l.runs / l.balls) * 1000) / 10 : null);
const bpo = (l: Line) => (l.outs ? Math.round((l.balls / l.outs) * 10) / 10 : null);

function vulnerability(cell: Line, overall: Line): Vuln {
  if (cell.balls < 12 || !overall.balls) return "—";
  const cs = cell.runs / cell.balls, os = overall.runs / overall.balls;
  const co = cell.outs / cell.balls, oo = overall.outs / Math.max(1, overall.balls);
  if (cell.balls >= 18 && (cs <= 0.85 * os || co >= 1.5 * oo)) return "High";
  if (cs <= 0.97 * os || co >= 1.15 * oo) return "Med";
  return "Low";
}

export function buildOppositionMap(req: OppositionRequest): OppositionReport {
  const season = req.season ?? Number(getSeasons().at(-1) ?? 2026);
  const us = resolveFranchise(req.team);
  const them = resolveFranchise(req.opponent);
  if (!us || !them) throw new Error("unknown_team");
  if (us.name === them.name) throw new Error("same_team");
  const p = getProfiles(season);
  const venueRef = req.venue ? resolveVenue(req.venue) : undefined;
  const venueFactor = venueRef ? venueBoundaryFactor(venueRef.venueIds, season) : 1;
  const ourSquad = teamSeasonSquad(us.teamIds, season);
  const theirSquad = teamSeasonSquad(them.teamIds, season);
  const ourOrder = likelyBattingOrder(ourSquad), theirOrder = likelyBattingOrder(theirSquad);
  const ourAttack = likelyAttack(ourSquad), theirAttack = likelyAttack(theirSquad);
  if (theirOrder.length < 5 || ourAttack.length < 4) throw new Error("squad_unavailable");
  const meta = getPlayerMeta();

  /* Opposition batters */
  const top = theirOrder.slice(0, 7);
  const recent = batterSplits(top, season - 2);
  const career = batterSplits(top, 0);
  const batters: BatterBrief[] = top.map((pid, i) => {
    const rec = recent.get(pid), car = career.get(pid);
    const pickLine = (getter: (x: NonNullable<typeof rec>) => Line) => (rec && getter(rec).balls >= 20 ? getter(rec) : car ? getter(car) : emptyLine());
    const overall = pickLine((x) => x.all);
    const scan = scanPlayer(pid, (rec?.all.balls ?? 0) >= 200 ? "recent" : "career", "batting");
    // A briefing needs something a bowling plan can act on: a bowler type or an over window,
    // not just "batting first" / "chasing".
    const actionable = (x: { dimensions: string[] }) => x.dimensions.some((d) => !/^(Batting first|Chasing)$/.test(d));
    const a = scan?.weaknesses.find(actionable) ?? scan?.watchList.find(actionable) ?? null;
    const spin = {} as BatterBrief["spin"];
    for (const t of ["Leg-spin", "Left-arm orthodox", "Off-spin"] as const) {
      const cell = pickLine((x) => x.bySub.get(t) ?? emptyLine());
      spin[t] = { balls: cell.balls, sr: sr(cell), ballsPerOut: bpo(cell), vulnerability: vulnerability(cell, overall) };
    }
    return {
      playerId: pid, name: playerName(pid), position: i + 1, balls: overall.balls, strikeRate: sr(overall),
      trap: a ? a.dimensions.join(" · ") : null,
      trapConfidence: a?.confidence ?? 0,
      trapSignificant: a?.significant ?? false,
      srInTrap: a?.cell.rate ?? null,
      dismissalWindow: a?.dimensions.find((d) => d.startsWith("Overs")) ?? null,
      exploit: a?.exploit ?? null,
      vulnerabilityIndex: a ? Math.round(Math.min(100, (a.significant ? a.confidence : a.confidence * 0.5) * Math.min(1, Math.abs(a.effectPer100) / 40))) : 0,
      spin,
    };
  });

  /* Death threats */
  const deathThreats = top
    .map((pid) => {
      const rec = recent.get(pid), car = career.get(pid);
      const src = rec && rec.death.balls >= 24 ? rec : car;
      if (!src || src.death.balls < 24) return null;
      const pace = sr(src.deathPace), spinSR = sr(src.deathSpin);
      const usePace = src.deathPace.balls >= 12, useSpin = src.deathSpin.balls >= 12;
      const counter = usePace && useSpin
        ? (pace! <= spinSR! ? `Pace contains this batter better at the death (SR ${pace} vs ${spinSR} against spin).` : `Spin contains this batter better at the death (SR ${spinSR} vs ${pace} against pace).`)
        : "Too few death balls against one of pace/spin to compare — use the best death bowler available.";
      return { playerId: pid, name: playerName(pid), deathSR: sr(src.death)!, deathBalls: src.death.balls, boundaryPct: Math.round((src.death.bnd / src.death.balls) * 1000) / 10, vsPaceSR: usePace ? pace : null, vsSpinSR: useSpin ? spinSR : null, counter };
    })
    .filter(<T>(x: T | null): x is T => x !== null)
    .sort((a, b) => b.deathSR - a.deathSR)
    .slice(0, 4);

  /* Our rotation, planned against their order by phase */
  const groups = [theirOrder.slice(0, 3), theirOrder.slice(2, 6), theirOrder.slice(4, 8)];
  const phaseCost = [lineupCost(p, season, groups[0]), lineupCost(p, season, groups[1]), lineupCost(p, season, groups[2])];
  const costFn = (b: number, o: number) => phaseCost[o <= 5 ? 0 : o <= 14 ? 1 : 2](b, o);
  const plan = planOvers(p, season, 0, 20, ourAttack, new Map(), null, 4, costFn);
  const phases = [
    { phase: "Powerplay", overs: "1–6", from: 0, to: 5 },
    { phase: "Middle overs", overs: "7–15", from: 6, to: 14 },
    { phase: "Death overs", overs: "16–20", from: 15, to: 19 },
  ];
  const rotation = phases.map((ph, gi) => {
    const counts = new Map<number, number>();
    let runs = 0;
    for (let o = ph.from; o <= ph.to; o++) {
      const b = plan.get(o)!;
      counts.set(b, (counts.get(b) ?? 0) + 1);
      runs += groups[gi].reduce((s, bat) => s + overExpectation(p, season, o, b, bat, venueFactor).runs, 0) / Math.max(1, groups[gi].length);
    }
    const econ = Math.round((runs / (ph.to - ph.from + 1)) * 10) / 10;
    const names = groups[gi].map(playerName).join(", ");
    return {
      phase: ph.phase, overs: ph.overs,
      bowlers: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([b, n]) => ({ playerId: b, name: playerName(b), overs: n, type: (meta.get(b) ? bowlingSubtype(meta.get(b)!) : null) ?? "—" })),
      expectedEconomy: econ,
      mission: `Bowl at ${names} — expected ${econ} an over with these bowlers.`,
    };
  });

  /* Full-match simulation: both batting orders */
  const sims = Math.min(Math.max(req.sims ?? 500, 100), 2000);
  const cache = new Map<string, Float64Array>();
  const inningsStart = (order: number[], target: number | null): InningsState => ({
    season, chase: target !== null, target, totalBalls: 120, legalBowled: 0, runs: 0, wickets: 0,
    striker: order[0], nonStriker: order[1], queue: order.slice(2), oversBowled: new Map(), lastBowler: null, venueFactor,
  });
  const matchSims = (firstOrder: number[], firstAttack: number[], secondOrder: number[], secondAttack: number[], seed: number) => {
    const random = rng(seed);
    const pol = optimalPolicy(p, season);
    let firstWins = 0;
    const totals: number[] = [];
    for (let k = 0; k < sims; k++) {
      const a = simulateInnings(p, inningsStart(firstOrder, null), secondAttack, pol, random, new Map(), cache);
      const b = simulateInnings(p, inningsStart(secondOrder, a.runs + 1), firstAttack, pol, random, new Map(), cache);
      if (!b.won) firstWins++;
      totals.push(a.runs);
    }
    totals.sort((x, y) => x - y);
    return { firstWinPct: (firstWins / sims) * 100, median: quantile(totals, 0.5) };
  };
  const weFirst = matchSims(ourOrder, ourAttack, theirOrder, theirAttack, 11);
  const theyFirst = matchSims(theirOrder, theirAttack, ourOrder, ourAttack, 12);
  const battingFirst = Math.round(weFirst.firstWinPct * 10) / 10;
  const chasing = Math.round((100 - theyFirst.firstWinPct) * 10) / 10;
  const overall = Math.round(((battingFirst + chasing) / 2) * 10) / 10;
  const toss = Math.abs(battingFirst - chasing) < 3 ? "Either — the simulations split evenly" : battingFirst > chasing ? "Bat first" : "Bowl first";

  /* Head to head & venue */
  const h2h = headToHead(us, them, season);
  const venueProfile = venueRef ? profileVenue(venueRef.venueIds, season) : null;

  const exploitable = [...batters].sort((a, b) => b.vulnerabilityIndex - a.vulnerabilityIndex)[0];
  const overview: string[] = [];
  overview.push(`Win chance ${overall}% across ${sims * 2} simulated matches (${battingFirst}% batting first, ${chasing}% chasing). Toss: ${toss.toLowerCase()}.`);
  if (exploitable && exploitable.vulnerabilityIndex > 0) overview.push(`Most exploitable: ${exploitable.name} — ${exploitable.trap}${exploitable.trapSignificant ? "" : " (watch list, not significant)"}. ${exploitable.exploit ?? ""}`.trim());
  if (deathThreats[0]) overview.push(`Biggest death threat: ${deathThreats[0].name}, SR ${deathThreats[0].deathSR} in overs 16–20. ${deathThreats[0].counter}`);
  overview.push(`Head to head: ${us.short} ${h2h.won}–${h2h.lost} ${them.short} all time (${h2h.recentWon}–${h2h.recentPlayed - h2h.recentWon} in the last 3 seasons).`);

  return {
    team: us.short, teamName: us.name, opponent: them.short, opponentName: them.name, season, venue: venueRef?.name ?? null,
    winProbability: { overall, battingFirst, chasing, toss, medianTotalBattingFirst: weFirst.median, medianOppTotalBattingFirst: theyFirst.median, sims: sims * 2 },
    tacticalOverview: overview,
    batters,
    deathThreats,
    rotation,
    headToHead: h2h,
    venueProfile,
  };
}

function headToHead(us: FranchiseRef, them: FranchiseRef, season: number) {
  const c = getBallColumns();
  const a = new Set(us.teamIds), b = new Set(them.teamIds);
  let played = 0, won = 0, lost = 0, recentPlayed = 0, recentWon = 0;
  for (const m of c.matches) {
    const meet = (a.has(m.team1) && b.has(m.team2)) || (a.has(m.team2) && b.has(m.team1));
    if (!meet || m.winner === null) continue;
    played++;
    const w = a.has(m.winner);
    if (w) won++; else lost++;
    if (Number(m.season) >= season - 2) { recentPlayed++; if (w) recentWon++; }
  }
  return { played, won, lost, recentPlayed, recentWon };
}

/** The last `years` seasons at a ground: first-innings average, chasing record, pace vs spin economy. */
export function profileVenue(venueIds: number[], season: number, years = 5) {
  const c = getBallColumns();
  const ids = new Set(venueIds);
  const meta = getPlayerMeta();
  let paceR = 0, paceB = 0, spinR = 0, spinB = 0;
  const firstTotals = new Map<number, number>();
  const firstBatting = new Map<number, number>();
  for (let i = 0; i < c.n; i++) {
    if (!ids.has(c.venue[i]) || c.season[i] <= season - years || c.season[i] > season) continue;
    const t = meta.get(c.bowler[i])?.bowlingType;
    if (c.flags[i] & F_LEGAL) { if (t === "spin") spinB++; else if (t === "pace") paceB++; }
    if (t === "spin") spinR += c.conceded[i]; else if (t === "pace") paceR += c.conceded[i];
    if (c.inningsNumber[i] === 1) {
      firstTotals.set(c.match[i], (firstTotals.get(c.match[i]) ?? 0) + c.totalRuns[i]);
      firstBatting.set(c.match[i], c.battingTeam[i]);
    }
  }
  // The chasing side won whenever the winner is not the side that batted first.
  let chased = 0, decided = 0;
  for (const [mi, bat1] of firstBatting) {
    const m = c.matches[mi];
    if (m.winner === null) continue;
    decided++;
    if (m.winner !== bat1) chased++;
  }
  const totals = [...firstTotals.values()];
  return {
    matches: firstTotals.size,
    avgFirstInnings: totals.length ? Math.round((totals.reduce((s, x) => s + x, 0) / totals.length) * 10) / 10 : null,
    chasingWinPct: decided ? Math.round((chased / decided) * 1000) / 10 : null,
    paceEconomy: paceB ? Math.round((paceR / paceB) * 600) / 100 : null,
    spinEconomy: spinB ? Math.round((spinR / spinB) * 600) / 100 : null,
  };
}


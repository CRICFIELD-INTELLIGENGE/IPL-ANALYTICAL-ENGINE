// Decision Intelligence OS — Phase 4: Auction War Room.
//
// Two boards, both built only from data available at the time:
//
//   backtest  The real 2026 auction list (369 players), valued with data up
//             to 2025, then checked against what each player actually sold
//             for and actually delivered in IPL 2026.
//   live      Every player active in 2026, valued with data up to 2026 for
//             the next auction, with a retain / release read on their contract.
//
// For each player:
//   impact   runs per match above an average IPL player (impact model, as of the view's season)
//   IAR      impact above replacement — replacement = the 20th-percentile regular that season
//   market   M: what the market would pay. Ridge regression of ln(price) on IAR, overseas,
//            experience, all-rounder and keeper, fitted on the previous five auctions
//   value    V: IAR × the market's median price per run of IAR (separately for overseas
//            and Indian players, so the overseas premium is priced in)
//   signal   BUY when V ≥ 1.25·M · AVOID when V ≤ 0.75·M or IAR ≤ 0 · HOLD otherwise ·
//            SCOUT when there are fewer than 5 IPL matches to judge on
//   max bid  V rounded down to the bid increment (never below the reserve price)

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot, parseCsv, readTextLoose } from "./db";
import { estimateImpact, round } from "./impact-model";
import { getBaselines, getPlayerMeta, getRoster, getSeasonLines, getSeasons } from "./player-profiles";
import { getPoolSpace, similarPlayers, type PoolSide, type Space } from "./player-pool";
import { squadProfile } from "./squad-dna";
import { franchiseOf, getFranchiseRefs, resolveFranchise } from "./stats-engine";

export type AuctionView = "backtest" | "live";
export type Signal = "BUY" | "HOLD" | "AVOID" | "SCOUT";
export type AuctionRole = "Batter" | "Bowler" | "All-rounder" | "Wicketkeeper";

/* ─── Sources ────────────────────────────────────────────────────────────── */

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

interface ListRow { fullName: string; country: string; age: number | null; role: AuctionRole; capped: boolean; reserve: number; iplCaps: number; team2025: string | null; set: string }
interface Sale { season: number; player: string; team: string; lakh: number; baseLakh: number | null; playerId: number | null }

function loadAuctionList(): ListRow[] {
  const root = getProjectRoot();
  const file = fs.readdirSync(root).find((f) => /ipl auction player list.*\.csv$/i.test(f));
  const text = file ? readTextLoose(path.join(root, file)) : null;
  if (!text) return [];
  const roleOf = (s: string): AuctionRole => (/BOWL/i.test(s) ? "Bowler" : /ALL/i.test(s) ? "All-rounder" : /KEEP/i.test(s) ? "Wicketkeeper" : "Batter");
  // Columns: 2 set, 3 first, 4 surname, 5 country, 8 age, 9 specialism, 15 IPL caps, 16 2025 team, 18 C/U/A, 19 reserve (lakh).
  return parseCsv(text)
    .filter((r) => /^\d+$/.test(r[0] ?? ""))
    .map((r) => ({
      fullName: `${r[3] ?? ""} ${r[4] ?? ""}`.replace(/\s+/g, " ").trim(),
      country: (r[5] ?? "").trim(),
      age: Number(r[8]) || null,
      role: roleOf(r[9] ?? ""),
      capped: /^capped/i.test((r[18] ?? "").trim()),
      reserve: Number(r[19]) || 30,
      iplCaps: Number(r[15]) || 0,
      team2025: (r[16] ?? "").trim() || null,
      set: (r[2] ?? "").trim(),
    }));
}

let salesCache: Sale[] | null = null;
function loadSales(): Sale[] {
  if (salesCache) return salesCache;
  const fp = path.join(getProjectRoot(), "artifacts", "api-server", "data", "player-auctions.json");
  if (!fs.existsSync(fp)) return (salesCache = []);
  const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as { season: number; player: string; team: string; teamCanonical?: string; soldLakh: number | null; baseLakh: number | null }[];
  salesCache = raw
    .filter((s) => s.soldLakh && s.season >= 2014)
    .map((s) => ({ season: s.season, player: s.player, team: s.teamCanonical ?? s.team, lakh: s.soldLakh!, baseLakh: s.baseLakh, playerId: null as number | null }));
  for (const s of salesCache) {
    const fr = resolveFranchise(s.team);
    s.playerId = matchName(s.player, (id) => {
      // Prefer someone active around the auction, then someone who played for the buyer.
      const seasons = activeSeasons(id);
      let score = 0;
      if ([s.season - 1, s.season, s.season + 1].some((x) => seasons.has(x))) score += 2;
      if (fr && rosterTeam(id, s.season) === fr.short) score += 3;
      return score;
    });
  }
  return salesCache;
}

/* ─── Name matching (unique matches only; ties broken by context) ────────── */

let nameKeys: Map<string, Set<number>>[] | null = null;
function keysFor(name: string): string[] {
  const t = norm(name).split(" ").filter(Boolean);
  if (!t.length) return [];
  return [t.join(" "), `${t[0]} ${t[t.length - 1]}`, `${t[0][0]}|${t[t.length - 1]}`];
}
function nameIndex() {
  if (nameKeys) return nameKeys;
  nameKeys = [new Map(), new Map(), new Map()];
  const add = (lvl: number, k: string, id: number) => { const s = nameKeys![lvl].get(k) ?? new Set<number>(); s.add(id); nameKeys![lvl].set(k, s); };
  for (const [id, m] of getPlayerMeta()) {
    for (const n of [m.name, m.fullName]) {
      if (!n) continue;
      keysFor(n).forEach((k, lvl) => add(lvl, k, id));
    }
  }
  return nameKeys;
}
function matchName(name: string, prefer: (id: number) => number): number | null {
  const idx = nameIndex();
  const keys = keysFor(name);
  for (let lvl = 0; lvl < keys.length; lvl++) {
    const ids = [...(idx[lvl].get(keys[lvl]) ?? [])];
    if (!ids.length) continue;
    const scored = ids.map((id) => ({ id, s: prefer(id) })).sort((a, b) => b.s - a.s);
    if (scored[0].s < 0) return null;
    if (scored.length === 1 || scored[0].s > scored[1].s) return scored[0].id;
    return null; // ambiguous
  }
  return null;
}

const activeCache = new Map<number, Set<number>>();
function activeSeasons(id: number): Set<number> {
  let s = activeCache.get(id);
  if (!s) { s = new Set((getSeasonLines().get(id) ?? []).filter((l) => l.matches > 0).map((l) => Number(l.season))); activeCache.set(id, s); }
  return s;
}
const rosterTeamCache = new Map<number, Map<number, string>>();
function rosterTeam(id: number, season: number): string | null {
  let bySeason = rosterTeamCache.get(season);
  if (!bySeason) {
    bySeason = new Map();
    const best = new Map<number, number>();
    for (const r of getRoster(String(season))) {
      if ((best.get(r.playerId) ?? 0) >= r.matches) continue;
      best.set(r.playerId, r.matches);
      const fr = franchiseOf(r.teamId);
      if (fr) bySeason.set(r.playerId, fr.short);
    }
    rosterTeamCache.set(season, bySeason);
  }
  return bySeason.get(id) ?? null;
}
function matchesThrough(id: number, season: number): number {
  return (getSeasonLines().get(id) ?? []).filter((l) => Number(l.season) <= season).reduce((s, l) => s + l.matches, 0);
}

/* ─── Valuation model ────────────────────────────────────────────────────── */

interface Features { impact: number; batting: number; bowling: number; matches: number; recent: number; overseas: boolean; allrounder: boolean; keeper: boolean; confidence: string; role: AuctionRole; sample: number }

function featuresAsOf(id: number, asOf: number): Features {
  const imp = estimateImpact(id, String(asOf));
  const m = getPlayerMeta().get(id);
  const lines = getSeasonLines().get(id) ?? [];
  const role: AuctionRole = imp.usage.role === "wicketkeeper" ? "Wicketkeeper" : imp.usage.role === "all-rounder" ? "All-rounder" : imp.usage.role === "bowler" ? "Bowler" : "Batter";
  return {
    impact: imp.total, batting: imp.batting, bowling: imp.bowling,
    matches: matchesThrough(id, asOf),
    recent: lines.filter((l) => Number(l.season) >= asOf - 1 && Number(l.season) <= asOf).reduce((s, l) => s + l.matches, 0),
    overseas: Boolean(m?.overseas), allrounder: imp.usage.role === "all-rounder", keeper: Boolean(m?.keeper),
    confidence: imp.confidence, role, sample: imp.sampleMatches,
  };
}

/** Single-season output, runs per match above an average player (same formula as the impact model, unshrunk). */
function seasonOutput(id: number, season: number): { matches: number; impact: number } | null {
  const l = (getSeasonLines().get(id) ?? []).find((x) => Number(x.season) === season);
  const b = getBaselines().get(String(season));
  if (!l || !b || !l.matches) return null;
  const W = 0.25 * b.batRunsPerBall * b.batBallsPerOut;
  const bat = l.batRuns - l.batBalls * b.batRunsPerBall - (l.batOuts - l.batBalls / b.batBallsPerOut) * W;
  const bowl = l.bowlBalls >= 12 ? l.bowlBalls * b.bowlRunsPerBall - l.bowlRuns + (l.wickets - l.bowlBalls / b.bowlBallsPerWicket) * W : 0;
  return { matches: l.matches, impact: (bat + bowl) / l.matches };
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo);
}

function replacementLevel(asOf: number): number {
  const vals = getRoster(String(asOf)).filter((r) => r.matches >= 5).map((r) => featuresAsOf(r.playerId, asOf).impact).sort((a, b) => a - b);
  return quantile(vals, 0.2);
}

// Market model: comparable sales. A player's expected price is the weighted
// geometric mean of the 15 most similar sales in the last five auctions, where
// "similar" means output above replacement, overseas status, IPL experience and
// role. Older sales count less (×0.85 a year). Prices vary hugely for similar
// output (reputation, scarcity, bidding wars), so the honest accuracy figure is
// reported alongside: leave-one-out typical miss.

/** Reliability of an impact estimate from its (recency-weighted) sample, 0–1. */
const reliability = (sample: number) => sample / (sample + 8);

const xOf = (f: Features, iar: number) => [
  Math.max(-4, Math.min(10, iar)) / 1.5,
  f.overseas ? 1.5 : 0,
  Math.log1p(f.matches) / 0.8,
  f.allrounder ? 0.6 : 0,
  f.keeper ? 0.6 : 0,
];

interface TrainSale { x: number[]; ln: number; season: number; overseas: boolean; iarRel: number; matches: number; lakh: number }

function knnDetail(train: TrainSale[], x: number[], asOf: number, skip = -1, k = 15): { ln: number; basis: number } {
  const d = train.map((t, i) => {
    if (i === skip) return { i, d: Infinity };
    let s = 0;
    for (let j = 0; j < x.length; j++) s += (x[j] - t.x[j]) ** 2;
    return { i, d: s };
  }).sort((a, b) => a.d - b.d).slice(0, k);
  let wSum = 0, w2Sum = 0, lnSum = 0;
  for (const { i, d: dist } of d) {
    if (!Number.isFinite(dist)) continue;
    const w = Math.exp(-dist / 2) * Math.pow(0.85, asOf - train[i].season);
    wSum += w; w2Sum += w * w; lnSum += w * train[i].ln;
  }
  // basis: effective number of comparable sales behind the estimate (weights below 1 = far away).
  return { ln: wSum ? lnSum / wSum : Math.log(50), basis: w2Sum ? Math.min(k, (wSum * wSum) / w2Sum) * Math.min(1, wSum / 3) : 0 };
}
const knn = (train: TrainSale[], x: number[], asOf: number, skip = -1) => knnDetail(train, x, asOf, skip).ln;

interface Model {
  asOf: number; replacement: number; n: number;
  train: TrainSale[];
  /** No player is valued above the record fee in the training window. */
  cap: number;
  looR2: number; typicalMiss: number;
  rate: { overseas: number; domestic: number }; // lakh per run/match of reliable IAR
  curve: { iar: number; domestic: number; overseas: number }[];
}

function fitModel(asOf: number): Model {
  const sales = loadSales().filter((s) => s.playerId !== null && s.season >= asOf - 4 && s.season <= asOf);
  const replCache = new Map<number, number>();
  const repl = (season: number) => {
    let v = replCache.get(season);
    if (v === undefined) { v = replacementLevel(season); replCache.set(season, v); }
    return v;
  };
  const train: TrainSale[] = sales.map((s) => {
    const f = featuresAsOf(s.playerId!, s.season - 1);
    const iar = f.impact - repl(s.season - 1);
    return { x: xOf(f, iar), ln: Math.log(s.lakh), season: s.season, overseas: f.overseas, iarRel: iar * reliability(f.sample), matches: f.matches, lakh: s.lakh };
  }).filter((t) => t.matches >= 1);
  // Leave-one-out accuracy.
  const errs: number[] = [];
  let ssr = 0, sst = 0;
  const my = train.reduce((s, t) => s + t.ln, 0) / Math.max(1, train.length);
  train.forEach((t, i) => {
    const p = knn(train, t.x, asOf, i);
    errs.push(Math.abs(p - t.ln));
    ssr += (p - t.ln) ** 2; sst += (t.ln - my) ** 2;
  });
  errs.sort((a, b) => a - b);
  // The typical price paid per run/match of (reliable) output above replacement,
  // among buys who brought at least one run/match of it.
  const marketRate = (overseas: boolean) => {
    const v = train.filter((t) => t.overseas === overseas && t.iarRel >= 1 && t.matches >= 10).map((t) => t.lakh / t.iarRel).sort((a, b) => a - b);
    return quantile(v, 0.5);
  };
  const ref = (iar: number, overseas: boolean): Features => ({ impact: 0, batting: 0, bowling: 0, matches: 60, recent: 20, overseas, allrounder: false, keeper: false, confidence: "high", role: "Batter", sample: 20 });
  const curve = [0, 1, 2, 3, 4, 5, 6, 8].map((iar) => ({
    iar,
    domestic: Math.round(Math.exp(knn(train, xOf(ref(iar, false), iar), asOf))),
    overseas: Math.round(Math.exp(knn(train, xOf(ref(iar, true), iar), asOf))),
  }));
  return {
    asOf, replacement: repl(asOf), n: train.length, train, cap: Math.max(...train.map((t) => t.lakh)),
    looR2: sst ? 1 - ssr / sst : 0, typicalMiss: Math.exp(quantile(errs, 0.5)),
    rate: { overseas: marketRate(true), domestic: marketRate(false) }, curve,
  };
}

function bidIncrement(lakh: number) {
  return lakh < 100 ? 5 : lakh < 200 ? 10 : lakh < 500 ? 20 : lakh < 1000 ? 25 : 50;
}
function roundToBid(lakh: number) {
  const inc = bidIncrement(lakh);
  return Math.floor(lakh / inc) * inc;
}

/* ─── Rows ───────────────────────────────────────────────────────────────── */

export interface AuctionRow {
  key: string;
  playerId: number | null;
  name: string;
  country: string;
  overseas: boolean;
  role: AuctionRole;
  age: number | null;
  reserve: number | null; // lakh
  capped: boolean | null;
  iplMatches: number;
  impact: number | null; // runs/match above an average player
  iar: number | null; // above replacement
  confidence: string;
  archetype: string | null;
  market: number; // lakh
  /** Effective number of comparable sales behind `market`; under 3 means thin evidence. */
  marketBasis: number;
  value: number | null; // lakh
  signal: Signal;
  maxBid: number; // lakh
  team: string | null; // last IPL team
  actual?: { soldTo: string | null; price: number | null; matches: number; impact: number | null; valueDelivered: number | null; verdict: string };
  lastSale?: { season: number; team: string; price: number } | null;
  contract?: string | null;
  fit?: { score: number; reasons: string[] } | null;
}

interface Board { view: AuctionView; asOf: number; target: number; model: Model; rows: AuctionRow[] }
const boards = new Map<AuctionView, Board>();

function sideFor(id: number, role: AuctionRole, asOf: number): { side: PoolSide; space: Space } | null {
  const bat = getPoolSpace("batting", "career", asOf), bowl = getPoolSpace("bowling", "career", asOf);
  const hasBat = bat.byId.has(id), hasBowl = bowl.byId.has(id);
  if (!hasBat && !hasBowl) return null;
  if (role === "Bowler" && hasBowl) return { side: "bowling", space: bowl };
  if ((role === "Batter" || role === "Wicketkeeper") && hasBat) return { side: "batting", space: bat };
  if (hasBat && hasBowl) return bowl.byId.get(id)!.balls > bat.byId.get(id)!.balls ? { side: "bowling", space: bowl } : { side: "batting", space: bat };
  return hasBat ? { side: "batting", space: bat } : { side: "bowling", space: bowl };
}

function valueRow(model: Model, id: number | null, base: { key: string; name: string; country: string | null; role: AuctionRole | null; age: number | null; reserve: number | null; capped: boolean | null; iplCaps: number }): AuctionRow {
  const asOf = model.asOf;
  const f = id !== null ? featuresAsOf(id, asOf) : null;
  const meta = id !== null ? getPlayerMeta().get(id) : undefined;
  const overseas = f ? f.overseas : Boolean(base.country && !/^india$/i.test(base.country));
  const role = base.role ?? f?.role ?? "Batter";
  const matches = f?.matches ?? 0;
  const iar = f ? f.impact - model.replacement : null;
  const reserve = base.reserve;
  // No IPL record to price off: the market estimate is the reserve.
  const kd = f && matches >= 1 ? knnDetail(model.train, xOf(f, iar!), asOf) : null;
  const pred = kd ? Math.exp(kd.ln) : reserve ?? 20;
  const market = Math.round(Math.max(reserve ?? 20, pred));
  let signal: Signal, value: number | null;
  if (!f || matches < 5) { signal = "SCOUT"; value = null; }
  else {
    const rate = overseas ? model.rate.overseas : model.rate.domestic;
    value = Math.round(Math.min(model.cap, Math.max(0, iar! * reliability(f.sample)) * rate));
    // A signal needs both a ratio and at least ₹1 Cr of surplus/shortfall to act on.
    signal = iar! <= 0 || (value <= 0.75 * market && market - value >= 100) || (reserve !== null && value < reserve) ? "AVOID"
      : value >= 1.25 * market && value - market >= 100 ? "BUY" : "HOLD";
  }
  const floor = reserve ?? 20;
  const maxBid = signal === "BUY" || signal === "HOLD" ? Math.max(floor, roundToBid(value!)) : floor;
  const sd = id !== null ? sideFor(id, role, asOf) : null;
  return {
    key: base.key, playerId: id, name: base.name, country: base.country ?? meta?.country ?? "—", overseas, role, age: base.age, reserve, capped: base.capped,
    iplMatches: id !== null ? matches : base.iplCaps,
    impact: f ? round(f.impact, 1) : null, iar: iar !== null ? round(iar, 1) : null, confidence: f?.confidence ?? "low",
    archetype: sd ? sd.space.byId.get(id!)!.archetype : null,
    market, marketBasis: kd ? round(kd.basis, 1) : 0, value, signal, maxBid,
    team: id !== null ? lastTeam(id, asOf) : null,
  };
}

function lastTeam(id: number, asOf: number): string | null {
  for (let s = asOf; s >= asOf - 3; s--) { const t = rosterTeam(id, s); if (t) return t; }
  return null;
}

function buildBoard(view: AuctionView): Board {
  const hit = boards.get(view);
  if (hit) return hit;
  const latest = Number(getSeasons().at(-1) ?? 2026);
  const asOf = view === "backtest" ? latest - 1 : latest;
  const model = fitModel(asOf);
  const list = loadAuctionList();
  const sales = loadSales();
  const rows: AuctionRow[] = [];

  if (view === "backtest") {
    const target = asOf + 1;
    const salesT = sales.filter((s) => s.season === target);
    for (const r of list) {
      const id = matchName(r.fullName, (pid) => {
        const before = matchesThrough(pid, asOf);
        if (r.iplCaps === 0) return before === 0 ? 2 : -1;
        const diff = Math.abs(before - r.iplCaps);
        if (diff > Math.max(4, r.iplCaps * 0.35)) return -1;
        return 10 - Math.min(9, diff) + (r.team2025 && rosterTeam(pid, asOf) === r.team2025 ? 3 : 0);
      });
      const row = valueRow(model, id, { key: `list:${norm(r.fullName)}`, name: id !== null ? getPlayerMeta().get(id)?.name ?? r.fullName : r.fullName, country: r.country, role: r.role, age: r.age, reserve: r.reserve, capped: r.capped, iplCaps: r.iplCaps });
      const sale = salesT.find((s) => norm(s.player) === norm(r.fullName)) ?? (id !== null ? salesT.find((s) => s.playerId === id) : undefined);
      const out = id !== null ? seasonOutput(id, target) : null;
      const rate = row.overseas ? model.rate.overseas : model.rate.domestic;
      const delivered = out && out.matches >= 4 ? Math.round(Math.max(0, out.impact - model.replacement) * rate) : null;
      const soldFr = sale ? resolveFranchise(sale.team) : undefined;
      row.actual = {
        soldTo: sale ? soldFr?.short ?? sale.team : null,
        price: sale?.lakh ?? null,
        matches: out?.matches ?? 0,
        impact: out ? round(out.impact, 1) : null,
        valueDelivered: delivered,
        verdict: !sale ? (out && out.matches ? "Unsold, later played" : "Unsold") : !out || out.matches < 4 ? "Barely played" : delivered! >= sale.lakh * 0.8 ? "Delivered" : "Under-delivered",
      };
      rows.push(row);
    }
  } else {
    const seen = new Set<number>();
    const latestSale = new Map<number, Sale>();
    for (const s of sales) if (s.playerId !== null && (!latestSale.has(s.playerId) || latestSale.get(s.playerId)!.season < s.season)) latestSale.set(s.playerId, s);
    const listById = new Map<number, ListRow>();
    for (const r of list) {
      const id = matchName(r.fullName, (pid) => {
        const before = matchesThrough(pid, asOf - 1);
        const diff = Math.abs(before - r.iplCaps);
        return diff > Math.max(4, r.iplCaps * 0.35) ? -1 : 10 - Math.min(9, diff);
      });
      if (id !== null) listById.set(id, r);
    }
    const ids = new Set<number>([...getRoster(String(asOf)).map((r) => r.playerId), ...getRoster(String(asOf - 1)).filter((r) => r.matches >= 3).map((r) => r.playerId)]);
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const m = getPlayerMeta().get(id);
      const lr = listById.get(id);
      const row = valueRow(model, id, {
        key: `p:${id}`, name: m?.name ?? `#${id}`, country: m?.country ?? lr?.country ?? null, role: null,
        age: lr?.age ? lr.age + 1 : null, reserve: null, capped: null, iplCaps: 0,
      });
      const ls = latestSale.get(id);
      row.lastSale = ls ? { season: ls.season, team: resolveFranchise(ls.team)?.short ?? ls.team, price: ls.lakh } : null;
      row.contract = ls && ls.season >= asOf - 3 && row.value !== null
        ? row.value >= ls.lakh * 1.25 ? "Bargain contract — retain" : row.value <= ls.lakh * 0.6 ? "Overpaid — release candidate" : "Fair contract"
        : null;
      rows.push(row);
    }
  }
  const board = { view, asOf, target: asOf + 1, model, rows };
  boards.set(view, board);
  return board;
}

/* ─── Franchise fit ──────────────────────────────────────────────────────── */

const FIT_MAP: Record<string, { side: PoolSide; feature: string; sign: 1 | -1; share?: string; spin?: boolean }> = {
  pp_rr: { side: "batting", feature: "ppSR", sign: 1, share: "ppShare" },
  pp_wkts_lost: { side: "batting", feature: "avgRel", sign: 1, share: "ppShare" },
  mid_rr: { side: "batting", feature: "midSR", sign: 1, share: "midShare" },
  death_rr: { side: "batting", feature: "deathSR", sign: 1, share: "deathShare" },
  sixes_pm: { side: "batting", feature: "bndRel", sign: 1 },
  bat_avg: { side: "batting", feature: "avgRel", sign: 1 },
  bat_dot: { side: "batting", feature: "dotRel", sign: -1 },
  bat_bnd: { side: "batting", feature: "bndRel", sign: 1 },
  first_inns: { side: "batting", feature: "srRel", sign: 1 },
  spin_sr: { side: "batting", feature: "spinSR", sign: 1 },
  pace_sr: { side: "batting", feature: "paceSR", sign: 1 },
  pp_econ: { side: "bowling", feature: "ppEcon", sign: -1, share: "ppShare" },
  pp_wkts: { side: "bowling", feature: "bpwRel", sign: -1, share: "ppShare" },
  mid_econ: { side: "bowling", feature: "midEcon", sign: -1, share: "midShare" },
  mid_wkts: { side: "bowling", feature: "bpwRel", sign: -1, share: "midShare" },
  death_econ: { side: "bowling", feature: "deathEcon", sign: -1, share: "deathShare" },
  death_wkts: { side: "bowling", feature: "bpwRel", sign: -1, share: "deathShare" },
  death_depth: { side: "bowling", feature: "deathEcon", sign: -1, share: "deathShare" },
  bowl_dot: { side: "bowling", feature: "dotRel", sign: 1 },
  bowl_bnd: { side: "bowling", feature: "bndRel", sign: -1 },
  wkts_pm: { side: "bowling", feature: "bpwRel", sign: -1 },
  spin_econ: { side: "bowling", feature: "econRel", sign: -1, spin: true },
  pace_econ: { side: "bowling", feature: "econRel", sign: -1, spin: false },
};

interface TeamNeeds { short: string; name: string; season: number; gaps: { key: string; label: string; score: number; importance: number; weight: number }[] }

function teamNeeds(teamKey: string, season: number): TeamNeeds | null {
  const fr = resolveFranchise(teamKey);
  if (!fr) return null;
  // Use the latest squad on record up to the view's season.
  let p = null;
  for (let s = season; s >= season - 3 && !p; s--) p = squadProfile(fr.short, s);
  if (!p) return null;
  const gaps = p.dimensions
    .filter((d) => FIT_MAP[d.key] && d.importance !== null && d.importance > 0.05 && d.score !== null && d.score < 45)
    .map((d) => ({ key: d.key, label: d.label, score: d.score!, importance: d.importance!, weight: d.importance! * (50 - d.score!) / 50 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  return { short: p.short, name: p.franchise, season: p.season, gaps };
}

function fitFor(id: number | null, role: AuctionRole, asOf: number, needs: TeamNeeds): { score: number; reasons: string[] } | null {
  if (id === null || !needs.gaps.length) return null;
  const bat = getPoolSpace("batting", "career", asOf), bowl = getPoolSpace("bowling", "career", asOf);
  const pb = bat.byId.get(id), pw = bowl.byId.get(id);
  if (!pb && !pw) return null;
  let sum = 0;
  const total = needs.gaps.reduce((s, g) => s + g.weight, 0);
  const reasons: { s: string; c: number }[] = [];
  for (const g of needs.gaps) {
    const map = FIT_MAP[g.key];
    const space = map.side === "batting" ? bat : bowl;
    const p = map.side === "batting" ? pb : pw;
    // A batter cannot fix a bowling gap (and vice versa); a specialist outside the phase barely can.
    if (!p || (map.spin !== undefined && Boolean(p.raw.spin) !== map.spin)) continue;
    if (map.side === "bowling" && role === "Batter") continue;
    if (map.side === "batting" && role === "Bowler") continue;
    if (map.share && p.raw[map.share] < 15) continue;
    const feats = [...space.roleFeatures, ...space.outFeatures];
    const fi = feats.findIndex((f) => f.key === map.feature);
    if (fi < 0) continue;
    const oz = Math.max(-2, Math.min(2, map.sign * p.z[fi]));
    const c = g.weight * oz;
    sum += c;
    if (oz >= 0.5) {
      const f = feats[fi];
      const v = p.raw[map.feature];
      const val = f.key === "avgRel" || f.key === "bpwRel" ? `${Math.exp(v).toFixed(2)}×` : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(f.dp)}${f.unit && f.unit !== "×" ? ` ${f.unit}` : ""}`;
      reasons.push({ s: `${g.label}: ${needs.short} sat at the ${ordinal(g.score)} percentile; ${f.label.toLowerCase()} ${val}`, c });
    }
  }
  const score = Math.round(Math.max(0, Math.min(100, 50 + (25 * sum) / (total || 1))));
  return { score, reasons: reasons.sort((a, b) => b.c - a.c).slice(0, 2).map((r) => r.s) };
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

export interface AuctionQuery {
  view: AuctionView;
  team?: string;
  role?: AuctionRole;
  overseas?: "only" | "exclude";
  maxPrice?: number; // lakh: market estimate at or under
  signal?: Signal;
  q?: string;
  sort?: "edge" | "fit" | "market" | "impact";
}

export interface AuctionBoardResult {
  view: AuctionView;
  asOf: number;
  target: number;
  model: {
    replacement: number; n: number;
    looR2: number; typicalMiss: number;
    rate: { overseas: number; domestic: number };
    curve: { iar: number; domestic: number; overseas: number }[];
    cap: number;
    trainedOn: string;
  };
  team: { short: string; name: string; season: number; gaps: { label: string; score: number; importance: number }[] } | null;
  counts: Record<Signal, number>;
  total: number;
  rows: AuctionRow[];
  backtest: BacktestSummary | null;
  teams: { short: string; name: string }[];
}

export interface BacktestSummary {
  sold: number;
  matched: number;
  priceRankCorrelation: number;
  typicalMiss: number; // multiplicative, e.g. 1.8×
  /** Rank correlation of pre-auction IAR with actual 2026 output (players with 5+ prior and 4+ 2026 matches). */
  projection: { n: number; correlation: number };
  groups: { signal: Signal; listed: number; sold: number; played: number; avgPrice: number | null; avgImpact: number | null; deliveredShare: number | null }[];
  hits: { name: string; signal: Signal; price: number; impact: number; note: string }[];
  misses: { name: string; signal: Signal; price: number; impact: number; note: string }[];
}

function spearman(a: number[], b: number[]) {
  const rank = (v: number[]) => { const idx = v.map((x, i) => [x, i]).sort((x, y) => x[0] - y[0]); const r = new Array(v.length); idx.forEach(([, i], k) => (r[i] = k)); return r as number[]; };
  const ra = rank(a), rb = rank(b), n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { cov += (ra[i] - ma) * (rb[i] - mb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mb) ** 2; }
  return va && vb ? cov / Math.sqrt(va * vb) : 0;
}

function backtestSummary(board: Board): BacktestSummary {
  const sold = board.rows.filter((r) => r.actual?.price);
  const matched = sold.filter((r) => r.playerId !== null && r.signal !== "SCOUT");
  const logErr = matched.map((r) => Math.abs(Math.log(r.market / r.actual!.price!))).sort((a, b) => a - b);
  const groups = (["BUY", "HOLD", "AVOID", "SCOUT"] as Signal[]).map((sig) => {
    const g = board.rows.filter((r) => r.signal === sig);
    const s = g.filter((r) => r.actual?.price);
    const played = s.filter((r) => (r.actual?.matches ?? 0) >= 4);
    const avg = (v: number[]) => (v.length ? round(v.reduce((x, y) => x + y, 0) / v.length, 1) : null);
    return {
      signal: sig, listed: g.length, sold: s.length, played: played.length,
      avgPrice: avg(s.map((r) => r.actual!.price!)),
      avgImpact: avg(played.map((r) => r.actual!.impact!)),
      deliveredShare: played.length ? Math.round((played.filter((r) => r.actual!.verdict === "Delivered").length / played.length) * 100) : null,
    };
  });
  const played = sold.filter((r) => (r.actual?.matches ?? 0) >= 4 && r.signal !== "SCOUT");
  const hits = played.filter((r) => (r.signal === "BUY" && r.actual!.verdict === "Delivered") || (r.signal === "AVOID" && r.actual!.verdict === "Under-delivered"))
    .sort((a, b) => Math.abs(b.actual!.impact!) * b.actual!.price! - Math.abs(a.actual!.impact!) * a.actual!.price!).slice(0, 5)
    .map((r) => ({ name: r.name, signal: r.signal, price: r.actual!.price!, impact: r.actual!.impact!, note: r.signal === "BUY" ? `Flagged as value; ${r.actual!.soldTo} paid ₹${(r.actual!.price! / 100).toFixed(2)} Cr and got ${sgn(r.actual!.impact!)} runs a match` : `Flagged to avoid at ₹${(r.market / 100).toFixed(2)} Cr; went for ₹${(r.actual!.price! / 100).toFixed(2)} Cr and managed ${sgn(r.actual!.impact!)} runs a match` }));
  const misses = played.filter((r) => (r.signal === "BUY" && r.actual!.verdict === "Under-delivered") || (r.signal === "AVOID" && r.actual!.verdict === "Delivered"))
    .sort((a, b) => b.actual!.price! - a.actual!.price!).slice(0, 5)
    .map((r) => ({ name: r.name, signal: r.signal, price: r.actual!.price!, impact: r.actual!.impact!, note: r.signal === "BUY" ? `Flagged as value but returned ${sgn(r.actual!.impact!)} runs a match` : `Flagged to avoid, yet returned ${sgn(r.actual!.impact!)} runs a match for ₹${(r.actual!.price! / 100).toFixed(2)} Cr` }));
  const projected = board.rows.filter((r) => r.iar !== null && r.signal !== "SCOUT" && (r.actual?.matches ?? 0) >= 4);
  return {
    sold: sold.length, matched: matched.length,
    priceRankCorrelation: round(spearman(matched.map((r) => r.market), matched.map((r) => r.actual!.price!)), 2),
    typicalMiss: round(Math.exp(quantile(logErr, 0.5)), 2),
    projection: { n: projected.length, correlation: round(spearman(projected.map((r) => r.iar!), projected.map((r) => r.actual!.impact!)), 2) },
    groups, hits, misses,
  };
}

const sgn = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;

export function auctionBoard(q: AuctionQuery): AuctionBoardResult {
  const board = buildBoard(q.view);
  const needs = q.team ? teamNeeds(q.team, board.asOf) : null;
  let rows = board.rows.map((r) => ({ ...r, fit: needs ? fitFor(r.playerId, r.role, board.asOf, needs) : undefined }));
  const counts: Record<Signal, number> = { BUY: 0, HOLD: 0, AVOID: 0, SCOUT: 0 };
  if (q.role) rows = rows.filter((r) => r.role === q.role);
  if (q.overseas === "only") rows = rows.filter((r) => r.overseas);
  if (q.overseas === "exclude") rows = rows.filter((r) => !r.overseas);
  if (q.maxPrice) rows = rows.filter((r) => r.market <= q.maxPrice!);
  if (q.q) { const n = norm(q.q); rows = rows.filter((r) => norm(r.name).includes(n) || norm(r.country).includes(n) || (r.archetype && norm(r.archetype).includes(n))); }
  for (const r of rows) counts[r.signal]++;
  if (q.signal) rows = rows.filter((r) => r.signal === q.signal);
  const edge = (r: AuctionRow) => (r.value === null ? -1 : r.value / r.market);
  const sort = q.sort ?? (needs ? "fit" : "edge");
  rows.sort((a, b) =>
    sort === "fit" ? (b.fit?.score ?? -1) - (a.fit?.score ?? -1) || edge(b) - edge(a)
    : sort === "market" ? b.market - a.market
    : sort === "impact" ? (b.iar ?? -99) - (a.iar ?? -99)
    : edge(b) - edge(a));
  const m = board.model;
  return {
    view: q.view, asOf: board.asOf, target: board.target,
    model: {
      replacement: round(m.replacement, 1), n: m.n,
      looR2: round(m.looR2, 2), typicalMiss: round(m.typicalMiss, 2),
      rate: { overseas: Math.round(m.rate.overseas), domestic: Math.round(m.rate.domestic) },
      curve: m.curve, cap: m.cap,
      trainedOn: `${m.n} auction sales, ${board.asOf - 4}–${board.asOf}, each player valued on data before that auction`,
    },
    team: needs ? { short: needs.short, name: needs.name, season: needs.season, gaps: needs.gaps.map(({ label, score, importance }) => ({ label, score, importance })) } : null,
    counts, total: rows.length, rows,
    backtest: q.view === "backtest" ? backtestSummary(board) : null,
    teams: getFranchiseRefs().filter((f) => getRoster(String(board.asOf)).some((r) => f.teamIds.includes(r.teamId))).map((f) => ({ short: f.short, name: f.name })),
  };
}

export interface AuctionPlayerDetail {
  row: AuctionRow;
  view: AuctionView;
  asOf: number;
  comparables: { playerId: number; name: string; similarity: number; archetype: string; sale: { season: number; team: string; price: number }; nextSeason: { matches: number; impact: number } | null }[];
  bestFits: { short: string; name: string; score: number; reasons: string[] }[];
  history: { season: number; matches: number; impact: number | null }[];
  sales: { season: number; team: string; price: number }[];
}

export function auctionPlayer(key: string, view: AuctionView): AuctionPlayerDetail | null {
  const board = buildBoard(view);
  const row = board.rows.find((r) => r.key === key || (r.playerId !== null && String(r.playerId) === key));
  let base = row;
  if (!base && view === "live" && /^\d+$/.test(key)) {
    // Someone not in the active pool (e.g. retired) — value them on demand.
    const id = Number(key);
    const m = getPlayerMeta().get(id);
    if (!m) return null;
    base = valueRow(board.model, id, { key: `p:${id}`, name: m.name, country: m.country, role: null, age: null, reserve: null, capped: null, iplCaps: 0 });
  }
  if (!base) return null;
  const asOf = board.asOf;
  const sales = loadSales();
  let comparables: AuctionPlayerDetail["comparables"] = [];
  const sd = base.playerId !== null ? sideFor(base.playerId, base.role, asOf) : null;
  if (sd && base.playerId !== null) {
    const soldRecent = new Map<number, Sale>();
    for (const s of sales) if (s.playerId !== null && s.playerId !== base.playerId && s.season >= asOf - 4 && s.season <= asOf && (!soldRecent.has(s.playerId) || soldRecent.get(s.playerId)!.season < s.season)) soldRecent.set(s.playerId, s);
    // Below ~20% similarity a "comparable" is a different kind of player; leave it out.
    comparables = similarPlayers(base.playerId, sd.side, "career", 6, new Set(soldRecent.keys()), asOf).filter((n) => n.similarity >= 20).map((n) => {
      const s = soldRecent.get(n.playerId)!;
      const out = seasonOutput(n.playerId, s.season);
      return {
        playerId: n.playerId, name: n.name, similarity: n.similarity, archetype: n.archetype,
        sale: { season: s.season, team: resolveFranchise(s.team)?.short ?? s.team, price: s.lakh },
        nextSeason: out ? { matches: out.matches, impact: round(out.impact, 1) } : null,
      };
    });
  }
  const bestFits = getFranchiseRefs()
    .filter((f) => getRoster(String(asOf)).some((r) => f.teamIds.includes(r.teamId)))
    .map((f) => { const needs = teamNeeds(f.short, asOf); const fit = needs ? fitFor(base!.playerId, base!.role, asOf, needs) : null; return { short: f.short, name: f.name, score: fit?.score ?? 0, reasons: fit?.reasons ?? [] }; })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const history = base.playerId !== null
    ? (getSeasonLines().get(base.playerId) ?? []).filter((l) => Number(l.season) <= (view === "backtest" ? asOf + 1 : asOf)).slice(-6)
      .map((l) => { const o = seasonOutput(base!.playerId!, Number(l.season)); return { season: Number(l.season), matches: l.matches, impact: o ? round(o.impact, 1) : null }; })
    : [];
  const ownSales = base.playerId !== null
    ? sales.filter((s) => s.playerId === base!.playerId && s.season <= (view === "backtest" ? asOf + 1 : asOf)).map((s) => ({ season: s.season, team: resolveFranchise(s.team)?.short ?? s.team, price: s.lakh })).sort((a, b) => b.season - a.season)
    : [];
  return { row: base, view, asOf, comparables, bestFits, history, sales: ownSales };
}

/** Compact live valuation for the player profile page. */
export function auctionIntel(playerId: number) {
  const d = auctionPlayer(String(playerId), "live");
  if (!d) return null;
  const r = d.row;
  return {
    asOf: d.asOf, signal: r.signal, market: r.market, value: r.value, maxBid: r.maxBid, iar: r.iar, archetype: r.archetype,
    contract: r.contract ?? null, lastSale: r.lastSale ?? null, comparables: d.comparables.slice(0, 3), bestFits: d.bestFits,
  };
}

export function warmAuctionWarRoom(): void {
  buildBoard("backtest");
  buildBoard("live");
}

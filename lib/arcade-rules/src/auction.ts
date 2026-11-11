// Mega Auction Room engine — an English (ascending) auction per lot against nine rival franchises.
//
// Rivals are not random bidders. Each has a role plan, a purse it protects for unfilled slots, an overseas cap,
// a risk appetite, and values a player from CRICFIELD's market model (passed in as `valueCr`), scaled by need.
// Its walk-away price is fixed before the lot opens, so the result of a lot depends only on the seed, the
// state of the room and the highest price the player was willing to bid. Simulated prices are NOT real
// auction results; historical scenarios show the recorded price separately.

import { seeded, shuffle } from "./rng";

export type Role = "BAT" | "WK" | "AR" | "BOWL";
export interface Lot { id: string; name: string; role: Role; overseas: boolean; baseCr: number; valueCr: number; rating: number; team: string | null; actualCr?: number | null; actualTeam?: string | null }
export interface Bidder { code: string; name: string; purseCr: number; squad: string[]; roles: Record<Role, number>; overseas: number; appetite: number; human: boolean }
export interface AuctionConfig { mode: "quick" | "full" | "rebuild" | "historical"; slots: number; minSlots: number; maxOverseas: number; plan: Record<Role, number> }
export interface LotResult { lotId: string; winner: string | null; priceCr: number; bids: { code: string; priceCr: number }[]; reason: string }
export interface AuctionState { seed: string; config: AuctionConfig; lots: Lot[]; bidders: Bidder[]; index: number; results: LotResult[]; done: boolean }

export const MODES: Record<AuctionConfig["mode"], { label: string; lots: number; purse: number; config: Omit<AuctionConfig, "mode"> }> = {
  quick: { label: "Quick Auction — 30 lots, fill 6 slots", lots: 30, purse: 40, config: { slots: 6, minSlots: 4, maxOverseas: 2, plan: { BAT: 2, WK: 1, AR: 1, BOWL: 2 } } },
  full: { label: "Full Auction — 80 lots, fill 12 slots", lots: 80, purse: 90, config: { slots: 12, minSlots: 9, maxOverseas: 4, plan: { BAT: 3, WK: 1, AR: 3, BOWL: 5 } } },
  rebuild: { label: "Franchise Rebuild — keep your core, fill 8 slots", lots: 50, purse: 60, config: { slots: 8, minSlots: 6, maxOverseas: 3, plan: { BAT: 2, WK: 1, AR: 2, BOWL: 3 } } },
  historical: { label: "Historical Scenario — the real 2026 lots, simulated bidding", lots: 60, purse: 60, config: { slots: 8, minSlots: 6, maxOverseas: 3, plan: { BAT: 2, WK: 1, AR: 2, BOWL: 3 } } },
};

/** Game bid increments (not the official IPL ladder): ₹0.1 Cr below ₹1 Cr, ₹0.2 Cr to ₹2 Cr, ₹0.25 Cr above. */
export const nextPrice = (p: number) => round2(p + (p < 1 ? 0.1 : p < 2 ? 0.2 : 0.25));
const round2 = (v: number) => Math.round(v * 100) / 100;

export const FRANCHISES: { code: string; name: string }[] = [
  { code: "CSK", name: "Chennai Super Kings" }, { code: "DC", name: "Delhi Capitals" }, { code: "GT", name: "Gujarat Titans" },
  { code: "KKR", name: "Kolkata Knight Riders" }, { code: "LSG", name: "Lucknow Super Giants" }, { code: "MI", name: "Mumbai Indians" },
  { code: "PBKS", name: "Punjab Kings" }, { code: "RR", name: "Rajasthan Royals" }, { code: "RCB", name: "Royal Challengers Bengaluru" }, { code: "SRH", name: "Sunrisers Hyderabad" },
];

export function newAuction(seed: string, mode: AuctionConfig["mode"], humanCode: string, pool: Lot[], start?: Partial<Record<string, { purseCr: number; squad: string[]; roles?: Partial<Record<Role, number>>; overseas?: number }>>): AuctionState {
  const m = MODES[mode];
  const rng = seeded(`${seed}|room`);
  const lots = mode === "historical" ? pool.slice(0, m.lots) : shuffle(rng, pool).slice(0, m.lots);
  const bidders = FRANCHISES.map((f) => {
    const s = start?.[f.code];
    return {
      code: f.code, name: f.name, purseCr: s?.purseCr ?? m.purse, squad: [...(s?.squad ?? [])],
      roles: { BAT: 0, WK: 0, AR: 0, BOWL: 0, ...(s?.roles ?? {}) } as Record<Role, number>, overseas: s?.overseas ?? 0,
      appetite: f.code === humanCode ? 1 : Math.round((0.9 + rng() * 0.25) * 100) / 100, human: f.code === humanCode,
    };
  });
  return { seed, config: { mode, ...m.config }, lots, bidders, index: 0, results: [], done: lots.length === 0 };
}

const open = (b: Bidder, cfg: AuctionConfig) => b.squad.length < cfg.slots;
/** Purse a bidder must keep for its remaining minimum slots at ₹0.3 Cr each. */
const reserve = (b: Bidder, cfg: AuctionConfig) => Math.max(0, cfg.minSlots - b.squad.length - 1) * 0.3;
export function canBid(b: Bidder, lot: Lot, cfg: AuctionConfig, price: number): boolean {
  return open(b, cfg) && (!lot.overseas || b.overseas < cfg.maxOverseas) && price <= b.purseCr - reserve(b, cfg) + 1e-9;
}

/** A rival's walk-away price for this lot, fixed when the lot opens. */
export function rivalLimit(s: AuctionState, b: Bidder, lot: Lot): number {
  const cfg = s.config;
  if (b.human || !canBid(b, lot, cfg, lot.baseCr)) return 0;
  const rng = seeded(`${s.seed}|limit|${s.index}|${b.code}`);
  const need = cfg.plan[lot.role] - b.roles[lot.role];
  const needFactor = need > 0 ? 1.15 + 0.1 * Math.min(need, 2) : need === 0 ? 0.75 : 0.45;
  // Late in the room, teams with many empty slots stretch; teams nearly full get picky.
  const slotsLeft = cfg.slots - b.squad.length, lotsLeft = s.lots.length - s.index;
  const pressure = slotsLeft / Math.max(1, lotsLeft / 9);
  const urgency = pressure > 1 ? Math.min(1.6, 1 + 0.2 * (pressure - 1)) : 1;
  const noise = 0.88 + rng() * 0.24;
  const limit = lot.valueCr * needFactor * urgency * b.appetite * noise;
  // Budget discipline: never more than a fair share of what is left plus 60%.
  const share = (b.purseCr - reserve(b, cfg)) / Math.max(1, slotsLeft) * 1.6;
  return Math.max(0, Math.min(limit, share, b.purseCr - reserve(b, cfg)));
}

/** Rivals in this lot's seeded bidding order, each with its fixed walk-away price. */
export function lotRivals(s: AuctionState): { code: string; limit: number }[] {
  const lot = s.lots[s.index];
  return shuffle(seeded(`${s.seed}|order|${s.index}`), s.bidders.filter((b) => !b.human).map((b) => ({ code: b.code, limit: rivalLimit(s, b, lot) })).filter((x) => x.limit >= lot.baseCr - 1e-9));
}
/** The rival who answers a bid at `price` (the first in seeded order whose limit reaches the next step), or null. */
export function rivalResponse(s: AuctionState, price: number, leader: string | null): string | null {
  const np = nextPrice(price);
  return lotRivals(s).find((r) => r.code !== leader && r.limit >= np - 1e-9)?.code ?? null;
}

/**
 * Resolve the open lot given the highest price the human bid (null = never bid). The human always gets the first
 * chance to answer a rival's bid; rivals answer in seeded order. The live paddle UI follows the same sequence.
 */
export function resolveLot(s: AuctionState, humanMax: number | null): { result: LotResult; next: AuctionState } {
  const lot = s.lots[s.index];
  const cfg = s.config;
  const human = s.bidders.find((b) => b.human)!;
  const humanLimit = humanMax != null && canBid(human, lot, cfg, humanMax) ? humanMax : 0;
  const rivals = lotRivals(s);
  const bids: LotResult["bids"] = [];
  let price = lot.baseCr;
  let leader: string | null = rivals[0]?.code ?? (humanLimit >= lot.baseCr - 1e-9 ? human.code : null);
  if (leader) {
    bids.push({ code: leader, priceCr: price });
    for (let guard = 0; guard < 500; guard++) {
      const np = nextPrice(price);
      const challenger: string | null = leader !== human.code && humanLimit >= np - 1e-9 ? human.code : rivals.find((r) => r.code !== leader && r.limit >= np - 1e-9)?.code ?? null;
      if (!challenger) break;
      price = np;
      leader = challenger;
      bids.push({ code: leader, priceCr: price });
    }
  }
  const winner = leader ? s.bidders.find((b) => b.code === leader)! : null;
  const result: LotResult = winner
    ? { lotId: lot.id, winner: winner.code, priceCr: price, bids: bids.slice(-24), reason: winner.human ? "Your paddle wins it." : explain(s, winner, lot) }
    : { lotId: lot.id, winner: null, priceCr: 0, bids: [], reason: "No franchise met the base price. Unsold." };
  const bidders = s.bidders.map((b) => (b.code !== result.winner ? b : { ...b, purseCr: round2(b.purseCr - price), squad: [...b.squad, lot.id], roles: { ...b.roles, [lot.role]: b.roles[lot.role] + 1 }, overseas: b.overseas + Number(lot.overseas) }));
  const index = s.index + 1;
  return { result, next: { ...s, bidders, index, results: [...s.results, result], done: index >= s.lots.length || bidders.every((b) => !open(b, cfg)) } };
}

function explain(s: AuctionState, b: Bidder, lot: Lot): string {
  const need = s.config.plan[lot.role] - b.roles[lot.role];
  const role = roleName(lot.role);
  return need > 0 ? `${b.code} needed ${/^[aeiou]/.test(role) ? "an" : "a"} ${role} and had the purse to chase.` : `${b.code} judged the value too good to pass.`;
}
export const roleName = (r: Role) => ({ BAT: "batter", WK: "wicketkeeper", AR: "all-rounder", BOWL: "bowler" })[r];

/** Replay a whole auction from the human's per-lot maximum bids (server validation). */
export function replayAuction(start: AuctionState, humanMaxes: (number | null)[]): AuctionState {
  let s = start;
  for (let i = 0; i < humanMaxes.length && !s.done; i++) s = resolveLot(s, humanMaxes[i]).next;
  return s;
}

export function squadValid(s: AuctionState, code: string): { valid: boolean; issues: string[] } {
  const b = s.bidders.find((x) => x.code === code)!;
  const issues: string[] = [];
  if (b.squad.length < s.config.minSlots) issues.push(`Signed ${b.squad.length}; at least ${s.config.minSlots} needed.`);
  if (b.overseas > s.config.maxOverseas) issues.push("Too many overseas players.");
  if (b.roles.WK < 1 && s.config.plan.WK > 0) issues.push("No wicketkeeper signed.");
  if (b.roles.BOWL + b.roles.AR < Math.ceil(s.config.plan.BOWL / 2) + 1) issues.push("Not enough bowling options.");
  return { valid: issues.length === 0, issues };
}

import {
  loadLiveState,
  saveLiveState,
  pruneLiveStates,
} from "./live-state-store";
import { bestSide, type SquadCandidate } from "../intelligence/squad-optimizer";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { auction as A, seeded } from "@workspace/arcade-rules";
import { squadPool, snapshotMeta } from "./squads";
import { arcadePlayer } from "./arcade-data";
import { getProjectRoot } from "../decision/db";
const fail = (s: string): never => {
  throw new Error(`bad_request:${s}`);
};
type Owner = { token: string; name: string; team: string; retained: string[] };
type Rules = {
  purse: number;
  slots: number;
  minSlots: number;
  maxOverseas: number;
  seconds: number;
};
type Draft = {
  solo: boolean;
  revision: number;
  lastActive: number;
  persistedAt: number;
  nominatedIndex: number;
  code: string;
  created: number;
  host: string;
  owners: Owner[];
  rules: Rules;
  state: A.AuctionState | null;
  price: number;
  leader: string | null;
  deadline: number;
  nextBot: number;
  paused: boolean;
  pauseLeft: number;
  bids: { team: string; price: number; at: number }[];
  log: {
    lotId: string;
    winner: string | null;
    priceCr: number;
    bids: { team: string; price: number; at: number }[];
  }[];
  nominator: number;
};
const drafts = new Map<string, Draft>();
function persist(d: Draft) {
  d.persistedAt = Date.now();
  d.revision++;
  saveLiveState("auction", d.code, d, d.lastActive + 7200000);
}
function locate(code: string) {
  const key = code.toUpperCase();
  const d = drafts.get(key) ?? loadLiveState<Draft>("auction", key);
  if (d) drafts.set(key, d);
  return d;
}
function fingerprint(d: Draft) {
  return `${d.state?.index}|${d.price}|${d.deadline}|${d.leader}`;
}
const round = (n: number) => Math.round(n * 100) / 100;
let photos: Record<string, string> | null = null;
function picture(name: string) {
  try {
    photos ??= JSON.parse(
      fs.readFileSync(
        path.join(
          getProjectRoot(),
          "artifacts/api-server/data/player-images.json",
        ),
        "utf8",
      ),
    );
    return photos![name] ?? photos![name.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}
export function pool() {
  return squadPool()
    .players.filter((p) => p.evidence)
    .map((p) => {
      const ap = arcadePlayer(p.id);
      return {
        ...p,
        photo: picture(p.name),
        country: ap?.country ?? null,
        age: null,
        availability: "Not verified",
        seasons: ap?.seasons.slice(-3) ?? [],
        matches: ap?.matches ?? 0,
        confidence:
          (ap?.matches ?? 0) >= 30
            ? "Established IPL sample"
            : "Limited IPL sample",
        baseCr:
          p.marketCr >= 12
            ? 2
            : p.marketCr >= 6
              ? 1
              : p.marketCr >= 2
                ? 0.5
                : 0.3,
      };
    });
}
export function create(name: string, solo: boolean) {
  pruneLiveStates();
  for (const [k, r] of drafts)
    if (Date.now() - r.lastActive > 7200000) drafts.delete(k);
  if (drafts.size >= 500) fail("rooms_busy");
  let code: string;
  do {
    code = randomBytes(4).toString("hex").toUpperCase();
  } while (drafts.has(code) || loadLiveState<Draft>("auction", code));
  const token = randomUUID();
  const d: Draft = {
    solo,
    revision: 0,
    lastActive: Date.now(),
    persistedAt: 0,
    nominatedIndex: -1,
    code,
    created: Date.now(),
    host: token,
    owners: [
      { token, name: name.slice(0, 24) || "Host", team: "CSK", retained: [] },
    ],
    rules: { purse: 120, slots: 25, minSlots: 18, maxOverseas: 8, seconds: 20 },
    state: null,
    price: 0,
    leader: null,
    deadline: 0,
    nextBot: 0,
    paused: false,
    pauseLeft: 0,
    bids: [],
    log: [],
    nominator: 0,
  };
  drafts.set(code, d);
  persist(d);
  return { token, ...view(d, token) };
}
function room(code: string, token: string) {
  const d = locate(code);
  if (!d || Date.now() - d.lastActive > 7200000) fail("room_expired");
  if (!d!.owners.some((o) => o.token === token)) fail("membership_required");
  d!.lastActive = Date.now();
  return d!;
}
export function join(code: string, name: string) {
  const d = locate(code);
  if (!d || Date.now() - d.lastActive > 7200000) fail("room_expired");
  if (d!.solo) fail("solo_room_is_private");
  if (d!.state) fail("auction_started");
  if (d!.owners.length >= 10) fail("room_full");
  const team = A.FRANCHISES.find(
    (f) => !d!.owners.some((o) => o.team === f.code),
  )!.code;
  const token = randomUUID();
  d!.owners.push({
    token,
    name: name.slice(0, 24) || "Guest",
    team,
    retained: [],
  });
  d!.lastActive = Date.now();
  persist(d!);
  return { token, ...view(d!, token) };
}
export function read(code: string, token: string) {
  const d = room(code, token);
  const before = fingerprint(d);
  tick(d);
  if (before !== fingerprint(d) || Date.now() - d.persistedAt > 60000)
    persist(d);
  return view(d, token);
}
function config(d: Draft): A.AuctionConfig {
  const n = d.rules.slots,
    WK = Math.max(1, Math.round(n * 0.08)),
    AR = Math.max(2, Math.round(n * 0.24)),
    BAT = Math.max(3, Math.round(n * 0.28));
  return {
    mode: "full",
    slots: n,
    minSlots: d.rules.minSlots,
    maxOverseas: d.rules.maxOverseas,
    plan: { BAT, WK, AR, BOWL: n - BAT - WK - AR },
  };
}
function maxBid(d: Draft, b: A.Bidder) {
  return Math.max(
    0,
    round(b.purseCr - Math.max(0, d.rules.minSlots - b.squad.length - 1) * 0.3),
  );
}
function open(d: Draft) {
  const s = d.state!;
  if (s.done) return;
  d.price = s.lots[s.index].baseCr;
  d.leader = null;
  d.bids = [];
  d.deadline = Date.now() + d.rules.seconds * 1000;
  d.nextBot = Date.now() + 5000;
  if (d.paused) d.pauseLeft = d.rules.seconds * 1000;
}
function settle(d: Draft) {
  const s = d.state!,
    lot = s.lots[s.index];
  const winner = s.bidders.find((b) => b.code === d.leader);
  if (winner) {
    winner.purseCr = round(winner.purseCr - d.price);
    winner.squad.push(lot.id);
    winner.roles[lot.role]++;
    winner.overseas += Number(lot.overseas);
  }
  const result = {
    lotId: lot.id,
    winner: winner?.code ?? null,
    priceCr: winner ? d.price : 0,
    bids: d.bids.map((b) => ({ code: b.team, priceCr: b.price })),
    reason: winner
      ? "Sold at the final accepted live bid."
      : "Unsold: no valid bids.",
  };
  s.results.push(result);
  d.log.push({ ...result, bids: [...d.bids] });
  s.index++;
  s.done =
    s.index >= s.lots.length ||
    s.bidders.every((b) => b.squad.length >= s.config.slots);
  d.nominator = (d.nominator + 1) % d.owners.length;
  open(d);
}
function tick(d: Draft) {
  if (!d.state || d.state.done || d.paused) return;
  const now = Date.now();
  if (now >= d.deadline) {
    settle(d);
    return;
  }
  if (now < d.nextBot) return;
  d.nextBot = now + 1500;
  const s = d.state!,
    lot = s.lots[s.index],
    price = d.leader ? A.nextPrice(d.price) : lot.baseCr;
  const rivals = A.lotRivals(s).filter(
    (r) =>
      r.code !== d.leader &&
      r.limit >= price &&
      A.canBid(s.bidders.find((b) => b.code === r.code)!, lot, s.config, price),
  );
  if (rivals.length) {
    const r =
      rivals[
        Math.floor(
          seeded(`${d.code}|${s.index}|${d.bids.length}`)() * rivals.length,
        )
      ];
    place(d, r.code, price);
  }
}
function place(d: Draft, team: string, price: number) {
  d.price = price;
  d.leader = team;
  d.bids.push({ team, price, at: Date.now() });
  if (d.deadline - Date.now() < 5000) d.deadline = Date.now() + 5000;
}
export function action(
  code: string,
  token: string,
  b: {
    type: string;
    team?: string;
    retained?: string[];
    rules?: Rules;
    lotId?: string;
    expectedLot?: string;
    expectedPrice?: number;
  },
) {
  const d = room(code, token),
    me = d.owners.find((o) => o.token === token)!;
  const before = fingerprint(d);
  tick(d);
  if (before !== fingerprint(d)) persist(d);
  if (b.type === "setup") {
    if (d.state) fail("auction_started");
    const team = b.team ?? me.team;
    if (
      !A.FRANCHISES.some((f) => f.code === team) ||
      d.owners.some((o) => o !== me && o.team === team)
    )
      fail("franchise_taken");
    if (b.rules && token !== d.host) fail("host_only");
    const rules = b.rules ?? d.rules;
    if (
      ![15, 20, 25, 30].includes(rules.seconds) ||
      rules.purse < 40 ||
      rules.purse > 200 ||
      rules.slots < 11 ||
      rules.slots > 25 ||
      rules.minSlots < 11 ||
      rules.minSlots > rules.slots ||
      rules.maxOverseas < 0 ||
      rules.maxOverseas > 8
    )
      fail("invalid_rules");
    const retained = b.retained ?? (team === me.team ? me.retained : []),
      ps = pool();
    if (new Set(retained).size !== retained.length || retained.length > 6)
      fail("retain_up_to_six_unique");
    for (const id of retained) {
      const p = ps.find((p) => p.id === id);
      if (!p || p.team !== team || p.contractCr == null)
        fail("invalid_retention");
    }
    for (const o of d.owners) {
      const ids = o === me ? retained : o.retained;
      const own = ids.map((id) => ps.find((p) => p.id === id)!);
      const cost = own.reduce((sum, p) => sum + p.contractCr!, 0);
      if (cost + Math.max(0, rules.minSlots - ids.length) * 0.3 > rules.purse)
        fail("retention_breaks_slot_reserve");
      if (own.filter((p) => p.overseas).length > rules.maxOverseas)
        fail("retention_breaks_overseas_cap");
    }
    me.team = team;
    me.retained = retained;
    d.rules = rules;
  } else if (b.type === "start") {
    if (token !== d.host) fail("host_only");
    if (d.state) fail("already_started");
    const ps = pool(),
      retained = new Set(d.owners.flatMap((o) => o.retained));
    const lots: A.Lot[] = ps
      .filter((p) => !retained.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        overseas: p.overseas,
        baseCr: p.baseCr,
        valueCr: p.marketCr,
        rating: p.rating,
        team: p.team,
      }));
    const s = A.newAuction(d.code, "full", me.team, lots);
    s.lots = lots;
    s.config = config(d);
    for (const bidder of s.bidders) {
      const owner = d.owners.find((o) => o.team === bidder.code);
      bidder.human = Boolean(owner);
      bidder.purseCr = d.rules.purse;
      bidder.squad = [];
      bidder.roles = { BAT: 0, WK: 0, AR: 0, BOWL: 0 };
      bidder.overseas = 0;
      for (const id of owner?.retained ?? []) {
        const p = ps.find((p) => p.id === id)!;
        bidder.purseCr = round(bidder.purseCr - p.contractCr!);
        bidder.squad.push(id);
        bidder.roles[p.role]++;
        bidder.overseas += Number(p.overseas);
      }
      if (bidder.purseCr < 0 || bidder.overseas > d.rules.maxOverseas)
        fail("retention_breaks_rules");
    }
    d.state = s;
    open(d);
  } else {
    if (!d.state || d.state.done) fail("auction_not_active");
    const s = d.state!,
      lot = s.lots[s.index],
      bidder = s.bidders.find((x) => x.code === me.team)!;
    if (b.type === "bid") {
      if (d.paused) fail("auction_paused");
      if (b.expectedLot !== lot.id || b.expectedPrice !== d.price)
        fail("bid_changed_retry");
      if (d.leader === me.team) fail("already_highest_bidder");
      const price = d.leader ? A.nextPrice(d.price) : lot.baseCr;
      if (!A.canBid(bidder, lot, s.config, price))
        fail("bid_breaks_budget_or_slots");
      place(d, me.team, price);
    } else if (b.type === "pause") {
      if (token !== d.host) fail("host_only");
      if (!d.paused) {
        d.pauseLeft = Math.max(0, d.deadline - Date.now());
        d.paused = true;
      }
    } else if (b.type === "resume") {
      if (token !== d.host) fail("host_only");
      if (d.paused) {
        d.deadline = Date.now() + d.pauseLeft;
        d.nextBot = Date.now() + 1500;
        d.paused = false;
      }
    } else if (b.type === "nominate") {
      if (d.owners[d.nominator].token !== token) fail("not_your_nomination");
      if (d.leader || d.bids.length) fail("bidding_already_open");
      if (d.nominatedIndex === s.index) fail("already_nominated");
      const index = s.lots.findIndex(
        (l, i) => i >= s.index && l.id === b.lotId,
      );
      if (index <= s.index) fail("player_not_available");
      d.nominatedIndex = s.index;
      [s.lots[s.index], s.lots[index]] = [s.lots[index], s.lots[s.index]];
      open(d);
    } else if (b.type === "finish") {
      if (token !== d.host) fail("host_only");
      s.done = true;
    } else fail("unknown_action");
  }
  persist(d);
  return view(d, token);
}
function view(d: Draft, token: string) {
  const s = d.state;
  const reports = s?.done
    ? Object.fromEntries(
        s.bidders.map((b) => {
          const { cands } = squadPool();
          const side = bestSide(
            b.squad
              .map((id) => cands.get(id))
              .filter((c): c is SquadCandidate => Boolean(c)),
            11,
          );
          return [
            b.code,
            {
              feasible: side.feasible,
              xi: side.xii.map((p) => ({ id: p.id, name: p.name })),
              battingValue: side.battingValue,
              bowlingValue: side.bowlingValue,
              coverage: side.composition.phaseCoverage,
              gaps: side.gaps,
            },
          ];
        }),
      )
    : null;
  return {
    revision: d.revision,
    solo: d.solo,
    reports,
    code: d.code,
    host: token === d.host,
    you: d.owners.find((o) => o.token === token)!.team,
    owners: d.owners.map((o) => ({
      name: o.name,
      team: o.team,
      retained: o.retained,
      you: o.token === token,
    })),
    rules: d.rules,
    state: s,
    price: d.price,
    leader: d.leader,
    deadline: d.deadline,
    serverNow: Date.now(),
    paused: d.paused,
    pauseLeft: d.pauseLeft,
    bids: d.bids,
    log: d.log,
    nominator: d.owners[d.nominator].team,
    meta: s ? snapshotMeta() : {version:"pending",ratedThrough:null,dataCutoff:null},
    affordable: s
      ? Object.fromEntries(s.bidders.map((b) => [b.code, maxBid(d, b)]))
      : null,
  };
}

// Advance bidding even while every client is briefly backgrounded.
const auctionClock = setInterval(() => {
  for (const [code, draft] of drafts) {
    if (Date.now() - draft.lastActive > 7200000) {
      drafts.delete(code);
      continue;
    }
    try {
      const before = fingerprint(draft);
      tick(draft);
      if (before !== fingerprint(draft)) persist(draft);
    } catch (error) {
      console.error("Auction timer failed", error);
    }
  }
}, 500);
auctionClock.unref();

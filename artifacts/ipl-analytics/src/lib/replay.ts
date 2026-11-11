// Pre-retention replay: one IPL cycle frozen as it stood before the official retention announcement,
// with the real outcome hidden until the reader reveals it. IPL 2026 validates the experience; IPL 2027
// reuses it with `postSeason: null` (no outcome exists yet, so nothing can be revealed).
//
// Four kinds of information are kept apart:
//   facts known before the announcement  -> squads from `preSeason`, stats up to `preSeason`
//   CricField editorial predictions      -> articles (separate editorial workflow, not here)
//   reader choices                       -> localStorage only, see useStored()
//   outcomes revealed afterwards         -> derived from `postSeason` squads + that season's auction list
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayerAuctions, type AuctionRecord } from "./aggregates";
import { HUB_TEAMS, keyOf, type HubPlayer, type HubTeam } from "./ipl-2027";
import { useIpl2027 } from "./use-ipl-2027";
import { TEAM_REGISTRY } from "./team-context";

export interface ReplayCycle {
  id: string;
  label: string;
  preSeason: string;
  postSeason: string | null;
  snapshotDate: string;
  announcementDate: string;
  auctionDate: string;
  rules: { maxSquad: number; maxOverseas: number; xiMaxOverseas: number; source: string };
  /** Purse available at the auction, known only once retentions are announced. */
  purses: { lakhs: Record<HubTeam, number>; status: "reported" | "confirmed"; source: string } | null;
  notes: string[];
}

const SQUAD_SOURCE = "https://www.iplt20.com/teams (official squad pages, retrieved 2026-10-26)";

export const CYCLES: Record<string, ReplayCycle> = {
  "ipl-2026": {
    id: "ipl-2026",
    label: "IPL 2026",
    preSeason: "2025",
    postSeason: "2026",
    snapshotDate: "2025-11-14",
    announcementDate: "2025-11-15",
    auctionDate: "2025-12-16",
    rules: {
      maxSquad: 25,
      maxOverseas: 8,
      xiMaxOverseas: 4,
      source: "https://cricket.one/cricket-news/ipl-2026-auction-full-list-of-retained-released-players-remaining-purse-and-slots-of-all-teams/6918786039a217ec3c7595ad",
    },
    purses: {
      // ₹ lakh remaining after retentions, as reported on 15 Nov 2025.
      lakhs: { KKR: 6430, CSK: 4340, SRH: 2550, LSG: 2295, DC: 2180, RCB: 1640, RR: 1605, GT: 1290, PBKS: 1150, MI: 275 },
      status: "reported",
      source: "https://widgets.sportskeeda.com/cricket/news-ipl-2026-auction-full-list-purse-remaining-10-franchises-retentions",
    },
    notes: [
      `Squads: official IPL 2025 squad lists (${SQUAD_SOURCE}).`,
      "Stats: IPL ball-by-ball data up to and including the 2025 season only.",
      "Outcomes are derived by comparing official 2025 and 2026 squads with the 2026 auction list: a player still with his franchise and not bought at the auction was retained; one at another franchise without being bought was traded or signed as a replacement; everyone else was released.",
      "Player squads list late-season replacement signings too, so a few squad entries may not have been retention decisions in the usual sense.",
    ],
  },
};
export const ACTIVE_CYCLE = CYCLES["ipl-2026"];

export type Outcome = "retained" | "moved" | "released";
export type ReplayPhase = "pre" | "retentions" | "auction";
const PHASES: ReplayPhase[] = ["pre", "retentions", "auction"];

// ── Reader state: localStorage, shared between components on the page ─────────────────────────────
const STORE_EVENT = "cf-replay-store";
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
/** useState persisted in localStorage under a cycle-scoped key; falls back to memory if storage is blocked. */
export function useStored<T>(name: string, fallback: T, cycle = ACTIVE_CYCLE): [T, (v: T | ((prev: T) => T)) => void] {
  const key = `cricfield:${cycle.id}:${name}`;
  const [value, setValue] = useState<T>(() => read(key, fallback));
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    setValue(read(key, fallback));
    const sync = (e: Event) => (e as CustomEvent).detail === key && setValue(read(key, fallback));
    window.addEventListener(STORE_EVENT, sync);
    return () => window.removeEventListener(STORE_EVENT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallback is a literal per call site
  }, [key]);
  // Updaters read the latest stored value, so quick successive changes never overwrite each other.
  const set = useCallback((v: T | ((prev: T) => T)) => {
    const next = typeof v === "function" ? (v as (prev: T) => T)(latest.current) : v;
    latest.current = next;
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* private mode: keep the in-memory value */
    }
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
  }, [key]);
  return [value, set];
}

/** Which outcomes the reader has chosen to reveal, and when they first revealed anything. */
export function useReplayPhase(cycle = ACTIVE_CYCLE) {
  const [state, setState] = useStored<{ phase: ReplayPhase; firstRevealAt: string | null }>("phase", { phase: "pre", firstRevealAt: null }, cycle);
  const can = cycle.postSeason != null;
  const at = (p: ReplayPhase) => can && PHASES.indexOf(state.phase) >= PHASES.indexOf(p);
  return {
    phase: can ? state.phase : "pre",
    firstRevealAt: state.firstRevealAt,
    retentionsRevealed: at("retentions"),
    auctionRevealed: at("auction"),
    canReveal: can,
    reveal: (p: ReplayPhase) => setState({ phase: p, firstRevealAt: state.firstRevealAt ?? new Date().toISOString() }),
    // Going back hides outcomes again but keeps firstRevealAt, so later predictions stay flagged as not blind.
    restart: () => setState({ phase: "pre", firstRevealAt: state.firstRevealAt }),
  };
}

// ── Snapshot and outcomes ───────────────────────────────────────────────────────────────────────────
export function deriveOutcomes(
  team: HubTeam,
  pre: HubPlayer[],
  post: Record<string, HubPlayer[]>,
  boughtAtAuction: Set<string>,
): Map<string, { outcome: Outcome; to?: HubTeam }> {
  // Official names first: stats ids can collide between two players with the same scorecard name.
  const byName = new Map<string, HubTeam>();
  const byId = new Map<string, HubTeam>();
  for (const code of HUB_TEAMS)
    for (const p of post[code] ?? []) {
      byName.set(keyOf(p.name), code);
      byId.set(p.id, code);
    }
  const out = new Map<string, { outcome: Outcome; to?: HubTeam }>();
  for (const p of pre) {
    const now = byName.get(keyOf(p.name)) ?? byId.get(p.id);
    const bought = boughtAtAuction.has(keyOf(p.name));
    if (now === team && !bought) out.set(p.id, { outcome: "retained" });
    else if (now && now !== team && !bought) out.set(p.id, { outcome: "moved", to: now });
    else out.set(p.id, { outcome: "released" });
  }
  return out;
}

/** Everything a replay tool needs for one franchise. Outcome fields are null until revealed. */
export function useReplay(team: HubTeam, cycle = ACTIVE_CYCLE) {
  const phase = useReplayPhase(cycle);
  const pre = useIpl2027(team, cycle.preSeason);
  const post = useIpl2027(team, cycle.postSeason ?? cycle.preSeason);
  const auctions = usePlayerAuctions();

  const auctionRows = useMemo<AuctionRecord[]>(
    () => (cycle.postSeason ? (auctions.data ?? []).filter((a) => String(a.season) === cycle.postSeason) : []),
    [auctions.data, cycle.postSeason],
  );
  // Pre-snapshot stats only: never show a season that had not started at the snapshot date.
  const stats = useMemo(
    () => (pre.stats ? {
      batters: pre.stats.batters.filter((r) => r.season <= cycle.preSeason),
      bowlers: pre.stats.bowlers.filter((r) => r.season <= cycle.preSeason),
    } : undefined),
    [pre.stats, cycle.preSeason],
  );
  const outcomes = useMemo(() => {
    if (!cycle.postSeason || pre.isPending || post.isPending || auctions.isPending) return null;
    return deriveOutcomes(team, pre.roster, post.allRosters, new Set(auctionRows.map((a) => keyOf(a.player))));
  }, [team, pre.roster, pre.isPending, post.allRosters, post.isPending, auctionRows, auctions.isPending, cycle.postSeason]);

  // Auction buys for this team, with the role from the post-auction squad list.
  const buys = useMemo(() => {
    const name = TEAM_REGISTRY[team].name;
    const roster = post.allRosters[team] ?? [];
    return auctionRows
      .filter((a) => a.teamCanonical === name && a.soldLakh != null)
      .map((a) => ({ player: a.player, lakhs: a.soldLakh as number, role: roster.find((p) => keyOf(p.name) === keyOf(a.player))?.role ?? "unknown" }));
  }, [auctionRows, post.allRosters, team]);

  return {
    cycle,
    ...phase,
    squad: pre.roster,
    stats,
    isPending: pre.isPending || (phase.retentionsRevealed && (post.isPending || auctions.isPending)),
    unavailable: pre.rosterUnavailable,
    outcomes: phase.retentionsRevealed ? outcomes : null,
    purseLakhs: phase.retentionsRevealed && cycle.purses ? cycle.purses.lakhs[team] : null,
    buys: phase.auctionRevealed ? buys : null,
  };
}

/** Pre-snapshot squad size and (once revealed) retained/moved/released counts for every franchise. */
export function useAllTeamsSummary(cycle = ACTIVE_CYCLE) {
  const phase = useReplayPhase(cycle);
  const pre = useIpl2027("CSK", cycle.preSeason);
  const post = useIpl2027("CSK", cycle.postSeason ?? cycle.preSeason);
  const auctions = usePlayerAuctions();
  return useMemo(() => {
    const bought = new Set((auctions.data ?? []).filter((a) => String(a.season) === cycle.postSeason).map((a) => keyOf(a.player)));
    const ready = phase.retentionsRevealed && !post.isPending && !auctions.isPending;
    return HUB_TEAMS.map((team) => {
      const squad = pre.allRosters[team] ?? [];
      const counts = { retained: 0, moved: 0, released: 0 };
      if (ready) for (const o of deriveOutcomes(team, squad, post.allRosters, bought).values()) counts[o.outcome]++;
      return { team, squadSize: squad.length, counts: ready ? counts : null };
    });
  }, [pre.allRosters, post.allRosters, post.isPending, auctions.data, auctions.isPending, phase.retentionsRevealed, cycle.postSeason]);
}

export const ROLES = ["batter", "wicketkeeper", "all-rounder", "bowler"] as const;
export const ROLE_LABEL: Record<string, string> = { batter: "Batters", wicketkeeper: "Wicketkeepers", "all-rounder": "All-rounders", bowler: "Bowlers", unknown: "Unlisted role" };
export const crore = (lakhs: number) => `₹${(lakhs / 100).toFixed(2)} Cr`;

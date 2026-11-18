import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayerBios, type PlayerBio } from "@/lib/aggregates";

export type RecordedDelivery = {
  id: string;
  ball: string;
  sequence: number;
  matchId: string;
  season: string;
  date: string;
  innings: number;
  over: number;
  bowler: string;
  runs: number;
  length: string | null;
  line: string | null;
  variation: string | null;
  shot: string | null;
  zone: string | null;
};

export type DeliveryIndex = {
  source: string;
  rejectedInnings: number;
  players: Record<string, { file: string; balls: number; directionRecorded: number }>;
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Resolve a display/full/scorecard name to an unambiguous key in delivery-lab/index.json. */
export function resolveDeliveryIndexKey(
  player: string,
  playersMap: Record<string, { file: string; balls: number; directionRecorded: number }> | undefined,
  bios?: Record<string, PlayerBio>,
): string | undefined {
  if (!player || !playersMap) return undefined;
  const target = norm(player);
  const keys = Object.keys(playersMap);

  // 1. Direct exact case-insensitive match
  const exact = keys.filter(k => norm(k) === target);
  if (exact.length === 1) return exact[0];

  // 2. Bio cross-reference (fullName <-> playerName scorecard form)
  if (bios) {
    for (const bio of Object.values(bios)) {
      const pN = bio.playerName ? norm(bio.playerName) : "";
      const fN = bio.fullName ? norm(bio.fullName) : "";
      if (target === pN || target === fN) {
        const hit = keys.find(k => norm(k) === pN || norm(k) === fN);
        if (hit) return hit;
      }
    }
  }

  // 3. Unambiguous first-initial + surname match (e.g. "Ayush Badoni" <-> "A Badoni")
  const parts = target.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const surname = parts[parts.length - 1];
    const firstInitial = parts[0][0];
    const candidates = keys.filter(k => {
      const kp = norm(k).split(" ").filter(Boolean);
      return kp.length >= 2 && kp[kp.length - 1] === surname && kp[0][0] === firstInitial;
    });
    if (candidates.length === 1) return candidates[0];
  }

  return undefined;
}

/** Build safe normalized bowler aliases using player bios + initial/surname signature. */
export function matchesBowlerName(
  deliveryBowler: string | null | undefined,
  targetBowler: string | null | undefined,
  bios?: Record<string, PlayerBio>,
): boolean {
  if (!deliveryBowler || !targetBowler) return false;
  const db = norm(deliveryBowler);
  const tb = norm(targetBowler);
  if (!db || !tb) return false;
  if (db === tb) return true;

  if (bios) {
    const targetAliases = new Set<string>([tb]);
    for (const bio of Object.values(bios)) {
      const pN = bio.playerName ? norm(bio.playerName) : "";
      const fN = bio.fullName ? norm(bio.fullName) : "";
      if (tb === pN || tb === fN) {
        if (pN) targetAliases.add(pN);
        if (fN) targetAliases.add(fN);
      }
    }
    if (targetAliases.has(db)) return true;
  }

  const dp = db.split(" ").filter(Boolean);
  const tp = tb.split(" ").filter(Boolean);
  if (dp.length >= 2 && tp.length >= 2) {
    if (dp[dp.length - 1] === tp[tp.length - 1] && dp[0][0] === tp[0][0]) {
      return true;
    }
  }
  return false;
}

export function useDeliveryIndex() {
  return useQuery<DeliveryIndex>({
    queryKey: ["delivery-lab-index-v2"],
    queryFn: async () => {
      const result = await fetch(import.meta.env.BASE_URL + "data/delivery-lab/index.json");
      if (!result.ok) throw Error("Delivery directory unavailable");
      return result.json();
    },
    staleTime: 3600000,
  });
}

export function useRecordedDeliveries(player: string) {
  const directory = useDeliveryIndex();
  const bios = usePlayerBios();

  const resolvedKey = useMemo(
    () => resolveDeliveryIndexKey(player, directory.data?.players, bios.data),
    [player, directory.data?.players, bios.data],
  );
  const entry = resolvedKey ? directory.data?.players[resolvedKey] : undefined;

  const result = useQuery<RecordedDelivery[]>({
    queryKey: ["delivery-lab-records-v2", entry?.file ?? resolvedKey ?? player],
    enabled: !!entry,
    queryFn: async () => {
      const response = await fetch(import.meta.env.BASE_URL + "data/delivery-lab/" + entry!.file);
      if (!response.ok) throw Error("Delivery records unavailable");
      return response.json();
    },
    staleTime: 3600000,
  });

  return {
    ...result,
    isLoading: directory.isLoading || (!!entry && result.isLoading),
    isError: directory.isError || result.isError,
    refetch: () => directory.refetch().then(() => result.refetch()),
  };
}

/** Resolve any player display/full name to its canonical scorecard form (`playerName`) using player-bio.json. */
export function resolveScorecardName(
  player: string,
  bios?: Record<string, PlayerBio>,
): string {
  if (!player || !bios) return player;
  const target = norm(player);
  let fallback: string | null = null;
  for (const bio of Object.values(bios)) {
    const pN = bio.playerName ? norm(bio.playerName) : "";
    const fN = bio.fullName ? norm(bio.fullName) : "";
    if (target === pN && bio.playerName) return bio.playerName;
    if (target === fN && bio.playerName) fallback = bio.playerName;
  }
  return fallback || player;
}

export interface ClientMatchupSummary {
  batter: string;
  bowler: string;
  runs: number;
  balls: number;
  dismissals: number;
  dots: number;
  fours: number;
  sixes: number;
  sr: number;
  dotPct: number;
  dominanceIndex: number;
  battingHand: "LHB" | "RHB" | "Unknown";
  bowlerType: "Pacer" | "Spinner" | "Unknown";
  phaseSplit: {
    powerplay: { runs: number; balls: number; wkts: number; sr: number };
    middle: { runs: number; balls: number; wkts: number; sr: number };
    death: { runs: number; balls: number; wkts: number; sr: number };
  };
  scoringZones: Array<{ zone: string; runs: number; balls: number; boundaries: number; sr: number; boundaryPct: number }>;
}

/**
 * Compute deterministic Head-to-Head duel telemetry directly from recorded `delivery-lab`
 * ball-by-ball records when `/api/stats/matchup` is offline or returns a low-sample 0.
 */
export function buildClientMatchupSummary(
  deliveries: RecordedDelivery[] | undefined,
  batter: string,
  targetBowler: string,
  bios?: Record<string, PlayerBio>,
  opts?: { phase?: "all" | "pp" | "middle" | "death"; innings?: "all" | "1st" | "2nd"; matchIds?: Set<string> },
): ClientMatchupSummary | null {
  if (!deliveries || deliveries.length === 0 || !batter || !targetBowler) return null;
  const phaseFilter = opts?.phase ?? "all";
  const innFilter = opts?.innings ?? "all";
  const matchIds = opts?.matchIds;

  const matched = deliveries.filter(d => {
    if (!matchesBowlerName(d.bowler, targetBowler, bios)) return false;
    if (matchIds && matchIds.size > 0 && !matchIds.has(String(d.matchId))) return false;
    if (innFilter === "1st" && d.innings !== 1) return false;
    if (innFilter === "2nd" && d.innings !== 2) return false;
    const ov = d.over ?? 0;
    if (phaseFilter === "pp" && ov > 5) return false;
    if (phaseFilter === "middle" && (ov < 6 || ov > 14)) return false;
    if (phaseFilter === "death" && ov < 15) return false;
    return true;
  });

  if (matched.length === 0) return null;

  let runs = 0;
  let dots = 0;
  let fours = 0;
  let sixes = 0;
  const phase = {
    powerplay: { runs: 0, balls: 0, wkts: 0 },
    middle: { runs: 0, balls: 0, wkts: 0 },
    death: { runs: 0, balls: 0, wkts: 0 },
  };
  const zones = new Map<string, { runs: number; balls: number; boundaries: number }>();

  for (const d of matched) {
    const r = Number(d.runs ?? 0);
    runs += r;
    if (r === 0) dots++;
    if (r === 4) fours++;
    if (r === 6) sixes++;
    const ov = d.over ?? 0;
    const ph = ov < 6 ? phase.powerplay : ov < 15 ? phase.middle : phase.death;
    ph.runs += r;
    ph.balls += 1;
    if (d.zone) {
      const z = zones.get(d.zone) ?? { runs: 0, balls: 0, boundaries: 0 };
      z.runs += r;
      z.balls += 1;
      if (r === 4 || r === 6) z.boundaries += 1;
      zones.set(d.zone, z);
    }
  }

  const balls = matched.length;
  const sr = balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0;
  const dotPct = balls > 0 ? Math.round((dots / balls) * 100) : 0;
  const boundaryPct = runs > 0 ? Math.round(((fours * 4 + sixes * 6) / runs) * 100) : 0;
  const dominanceIndex = Math.max(5, Math.min(95, Math.round(50 + (sr - 130) * 0.25 + boundaryPct * 0.15 - dotPct * 0.12)));

  const findBio = (name: string) => {
    if (!bios) return undefined;
    const sc = norm(resolveScorecardName(name, bios));
    return Object.values(bios).find(b => norm(b.playerName || "") === sc || norm(b.fullName || "") === norm(name));
  };
  const batStyle = (findBio(batter)?.batStyle || "").toLowerCase();
  const bowlStyle = (findBio(targetBowler)?.bowlStyle || "").toLowerCase();

  return {
    batter,
    bowler: targetBowler,
    runs,
    balls,
    dismissals: 0,
    dots,
    fours,
    sixes,
    sr,
    dotPct,
    dominanceIndex,
    battingHand: batStyle.includes("left") ? "LHB" : batStyle.includes("right") ? "RHB" : "Unknown",
    bowlerType:
      bowlStyle.includes("spin") || bowlStyle.includes("break") || bowlStyle.includes("orthodox") || bowlStyle.includes("chinaman")
        ? "Spinner"
        : bowlStyle
          ? "Pacer"
          : "Unknown",
    phaseSplit: {
      powerplay: { ...phase.powerplay, sr: phase.powerplay.balls > 0 ? Math.round((phase.powerplay.runs / phase.powerplay.balls) * 1000) / 10 : 0 },
      middle: { ...phase.middle, sr: phase.middle.balls > 0 ? Math.round((phase.middle.runs / phase.middle.balls) * 1000) / 10 : 0 },
      death: { ...phase.death, sr: phase.death.balls > 0 ? Math.round((phase.death.runs / phase.death.balls) * 1000) / 10 : 0 },
    },
    scoringZones: Array.from(zones.entries())
      .map(([zone, z]) => ({
        zone,
        runs: z.runs,
        balls: z.balls,
        boundaries: z.boundaries,
        sr: z.balls > 0 ? Math.round((z.runs / z.balls) * 1000) / 10 : 0,
        boundaryPct: z.balls > 0 ? Math.round((z.boundaries / z.balls) * 100) : 0,
      }))
      .sort((a, b) => b.runs - a.runs),
  };
}

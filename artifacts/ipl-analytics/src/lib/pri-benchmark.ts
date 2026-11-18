import { useQuery } from "@tanstack/react-query";
import official2027 from "@/data/official-2027.json";

export interface PriRoleMetrics {
  pri: number;
  rank: number | null;
  adjustedPer100: number;
  rawPer100: number;
  interval90: [number, number];
  pressureBalls: number;
  pressureMatches: number;
  reliabilityTier: string;
  rate: number | null;
}

export interface PriPlayerRecord {
  player: string;
  team: string;
  batting?: PriRoleMetrics;
  bowling?: PriRoleMetrics;
}

export interface RrRetainedAuditRow {
  player: string;
  canonicalId: string | null;
  role: string;
  bowlingStyle: string | null;
  country: string;
  overseas: boolean;
  contractCr: number | null;
  primaryDiscipline: "batting" | "bowling";
  pri: number | null;
  adjustedPer100: number | null;
  rawPer100: number | null;
  pressureBalls: number;
  pressureMatches: number;
  interval90: [number, number] | null;
  reliabilityTier: string;
  leagueBenchmarkPlayer: string;
  leagueBenchmarkPri: number;
  verdict: string;
}

export interface SlotCandidate {
  name: string;
  matchedWarehouseName: string;
  sourceCategory: string;
  releasedFrom: string | null;
  role: string;
  discipline: "batting" | "bowling";
  country: string;
  overseas: boolean;
  pri: number;
  adjustedPer100: number;
  rawPer100: number;
  pressureBalls: number;
  pressureMatches: number;
  estCostCr: number;
  valueIndex: number;
  reliabilityTier: string;
  eligibilityState: string;
}

export interface SlotRecommendation {
  slotId: string;
  roleTitle: string;
  priority: string;
  rationale: string;
  bestPressurePerformer: SlotCandidate | null;
  bestAuctionValue: SlotCandidate | null;
  nextAlternative: SlotCandidate | null;
}

export interface PriBenchmarkData {
  modelVersion: string;
  generatedAt: string;
  cohort: {
    batting: { qualifiedCount: number; priorMeanPer100: number; priorStrengthBallsK: number; trueSpreadPer100: number; matches: number };
    bowling: { qualifiedCount: number; priorMeanPer100: number; priorStrengthBallsK: number; trueSpreadPer100: number; matches: number };
  };
  top10Batters: (PriRoleMetrics & { player: string; team: string })[];
  top10Bowlers: (PriRoleMetrics & { player: string; team: string })[];
  rrRetainedAudit: RrRetainedAuditRow[];
  rrSlotRecommendations: SlotRecommendation[];
  players: Record<string, PriPlayerRecord>;
}

const aliases = (official2027.aliases ?? {}) as Record<string, string>;

export function normPriKey(name: string): string {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function surnameInitKey(name: string): string {
  const parts = (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}_${parts[parts.length - 1]}` : parts[0] || "";
}

export function lookupPlayerPri(data: PriBenchmarkData | undefined, name: string): PriPlayerRecord | null {
  if (!data?.players) return null;
  const canonical = aliases[name] || name;
  const k1 = normPriKey(name);
  const k2 = normPriKey(canonical);
  if (data.players[k2]) return data.players[k2];
  if (data.players[k1]) return data.players[k1];
  const sk1 = surnameInitKey(name);
  const sk2 = surnameInitKey(canonical);
  for (const rec of Object.values(data.players)) {
    const rsk = surnameInitKey(rec.player);
    if (rsk === sk2 || rsk === sk1) return rec;
  }
  return null;
}

export function usePriBenchmark() {
  return useQuery<PriBenchmarkData>({
    queryKey: ["pri-benchmark-2027"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/pri-benchmark-2027.json`, { signal });
      if (!res.ok) throw new Error(`Failed to load PRI benchmark: ${res.status}`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}

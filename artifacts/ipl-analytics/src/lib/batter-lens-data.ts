// Batter Lens static data (built by api-server/scripts/batter-lens/build-batter-lens.ts).
import { useQuery } from "@tanstack/react-query";

export type LensMeta = { lengths: string[]; lines: string[]; shots: string[]; sectors: string[]; raa: string; source: string };
export type LensIndex = LensMeta & { players: Record<string, { file: string; balls: number; labelled: number }> };
/** Column arrays, one entry per ball faced. See index.json "fields". */
export type LensBalls = { s: number[]; m: number[]; o: number[]; p: number[]; r: number[]; w: number[]; x: number[]; l: number[]; n: number[]; h: number[]; z: number[]; f: number[] };
export type LensPlayer = { name: string; balls: LensBalls; entries: { s: number[]; e: number[]; m: number[] } };
export type LensRankings = LensMeta & { names: string[]; rows: number[][] };

const base = () => import.meta.env.BASE_URL + "data/batter-lens/";
async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(base() + file);
  if (!res.ok) throw new Error(`Batter Lens data unavailable (${res.status})`);
  return res.json() as Promise<T>;
}

export function useLensIndex() {
  return useQuery<LensIndex>({ queryKey: ["batter-lens-index"], queryFn: () => getJson("index.json"), staleTime: 3_600_000 });
}

/** Exact scorecard-name match only: a near-miss name must not pull another player's balls. */
export function useLensPlayer(names: (string | null | undefined)[]) {
  const index = useLensIndex();
  const hit = names.filter(Boolean).map(n => n!.trim()).find(n => index.data?.players[n]);
  const entry = hit ? index.data!.players[hit] : undefined;
  const player = useQuery<LensPlayer>({ queryKey: ["batter-lens", entry?.file], enabled: !!entry, queryFn: () => getJson(entry!.file), staleTime: 3_600_000 });
  return { index, player, matched: hit ?? null, missing: !!index.data && !entry };
}

export function useLensRankings(enabled = true) {
  return useQuery<LensRankings>({ queryKey: ["batter-lens-rankings"], queryFn: () => getJson("rankings.json"), staleTime: 3_600_000, enabled });
}

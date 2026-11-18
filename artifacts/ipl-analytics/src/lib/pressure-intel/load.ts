// Browser loader for the Pressure Intelligence league files (built by build-pressure-intel.ts).
import { decodeBalls } from "./format";
import { prepare, type Dataset, type Meta } from "./engine";
import type { Params } from "./query";

export interface CompInfo {
  code: string; name: string; balls: number; matches: number; seasons: string[]; partialSeasons: string[];
  bowlerTypeCoverage: number; batterHandCoverage: number; bytes: number;
}
export interface PiIndex { builtAt: string; source: string; competitions: CompInfo[] }
export interface Methodology {
  model: string; score: string; validatedAt: string; params: Params;
  selection: { method: string; wicket: string; scope: { comps: string[]; years: [number, number] }; best: { mean: number } };
  diagnostics: { id: string; discipline: string; rasPredictsOtherHalf: number; liftRepeat: number; playersBothHalves: number }[];
  sensitivity: { rule: string; overlapTop20: number }[];
}

const base = () => (import.meta.env?.BASE_URL ?? "/") + "data/pressure-intel/";
const getJson = <T,>(f: string) => fetch(base() + f).then(r => { if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return r.json() as Promise<T>; });
const once = <T,>(fn: () => Promise<T>) => { let p: Promise<T> | null = null; return () => (p ??= fn().catch(e => { p = null; throw e; })); };

export const loadIndex = once(() => getJson<PiIndex>("index.json"));
export const loadMethodology = once(() => getJson<Methodology>("methodology.json"));

const cache = new Map<string, Promise<Dataset>>();
export function loadDataset(comp: string): Promise<Dataset> {
  let p = cache.get(comp);
  if (!p) {
    p = (async () => {
      const [meta, res] = await Promise.all([getJson<Meta>(`${comp}.json`), fetch(base() + `${comp}.bin.gz`)]);
      if (!res.ok) throw new Error(`${comp}.bin.gz: HTTP ${res.status}`);
      let buf = await res.arrayBuffer();
      // The file is gzip; some hosts already decode it in transit, so check the magic bytes.
      const head = new Uint8Array(buf, 0, 2);
      if (head[0] === 0x1f && head[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
      return prepare(meta, decodeBalls(buf, meta.balls));
    })().catch(e => { cache.delete(comp); throw e; });
    cache.set(comp, p);
  }
  return p;
}

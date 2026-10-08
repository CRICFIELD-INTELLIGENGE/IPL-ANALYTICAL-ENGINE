// Real per-ball detail, read from ESPN's ball-by-ball commentary.
//
// This exists to replace two functions that invented their data:
//
//   classifyDeliveryType(over, ball, type) -> types[(over*6 + ball) % 12]
//   getScoringZone(over, ball, runs, type) -> zones[(over*6 + ball + runs) % 8]
//
// Those are periodic, so every bowler "bowled" the same delivery on the same
// ball of every innings and every batter "hit" it to the same region. Nothing
// derived from them meant anything.
//
// The data here comes from what the commentator actually wrote — the length,
// the line, the bowler's variation, the stroke played, the contact and where
// the ball went. Where the commentary said nothing, this returns null, and
// callers must be able to cope with that. A null is a fact: the source did not
// record it. It is not an invitation to fill the gap.
//
// Ball order is the flattened order of overs[].deliveries[] within an innings,
// which is the order the aggregator walks and the order the deliveries table
// was built in. Verified ball-for-ball against the table before shipping:
// over numbers agreed on every ball and runs agreed on 100% of them.

import fs from "node:fs";
import path from "node:path";

export interface BallInfo {
  length: string | null;
  line: string | null;
  variation: string | null;
  shot: string | null;
  contact: string | null;
  zone: string | null;
}

const FIELDS = ["length", "line", "variation", "shot", "contact", "zone"] as const;
const STRIDE = FIELDS.length;

interface Payload {
  vocab: Record<string, string[]>;
  matches: Record<string, number[][]>;
}

let payload: Payload | null = null;
let loaded = false;

function load(): Payload | null {
  if (loaded) return payload;
  loaded = true;
  const candidates = [
    path.resolve(process.cwd(), "artifacts/ipl-analytics/public/data/ball-commentary.json"),
    path.resolve(process.cwd(), "../ipl-analytics/public/data/ball-commentary.json"),
    path.resolve(process.cwd(), "../../ipl-analytics/public/data/ball-commentary.json"),
  ];
  for (const fp of candidates) {
    if (!fs.existsSync(fp)) continue;
    try {
      payload = JSON.parse(fs.readFileSync(fp, "utf-8"));
      const n = Object.keys(payload?.matches ?? {}).length;
      console.log(`[ball-commentary] loaded real delivery detail for ${n} matches`);
      return payload;
    } catch (err) {
      console.warn(`[ball-commentary] could not read ${fp}:`, (err as Error).message);
    }
  }
  console.warn("[ball-commentary] no ball-commentary.json found — delivery detail will be unavailable");
  payload = null;
  return null;
}

/** Whether real commentary detail exists for this match at all. */
export function hasBallCommentary(matchId: string): boolean {
  const p = load();
  return !!p && Array.isArray(p.matches[matchId]);
}

export function ballCommentaryMatchCount(): number {
  const p = load();
  return p ? Object.keys(p.matches).length : 0;
}

/**
 * Position of a ball within its innings, counting every delivery including
 * wides and no-balls. Cached per innings because it is asked for on every ball
 * of every match in a filter sweep.
 */
const offsetCache = new Map<string, number[]>();

export function overOffsets(matchId: string, inningsIndex: number, inn: any): number[] {
  const key = `${matchId}:${inningsIndex}`;
  const hit = offsetCache.get(key);
  if (hit) return hit;
  const offsets: number[] = [];
  let acc = 0;
  for (const over of inn?.overs ?? []) {
    offsets[over.over] = acc;
    acc += over.deliveries?.length ?? 0;
  }
  offsetCache.set(key, offsets);
  return offsets;
}

const EMPTY: BallInfo = { length: null, line: null, variation: null, shot: null, contact: null, zone: null };

/** Detail for the nth ball of an innings, or all-nulls if it was not recorded. */
export function getBallInfo(matchId: string, inningsIndex: number, ordinal: number): BallInfo {
  const p = load();
  const flat = p?.matches[matchId]?.[inningsIndex];
  if (!flat || flat.length === 0) return EMPTY;
  const base = ordinal * STRIDE;
  if (base < 0 || base + STRIDE > flat.length) return EMPTY;
  const out: any = {};
  for (let i = 0; i < STRIDE; i++) {
    const code = flat[base + i];
    const field = FIELDS[i];
    out[field] = code < 0 ? null : (p!.vocab[field]?.[code] ?? null);
  }
  return out as BallInfo;
}

/**
 * The single "what was bowled" label the matchup filters use: the bowler's
 * named variation when the commentary gave one, otherwise the length. Null
 * when the commentary described neither.
 */
export function deliveryLabel(info: BallInfo): string | null {
  return info.variation ?? info.length ?? null;
}

/** Every label actually present in the data, for populating filter dropdowns. */
export function ballCommentaryVocab(): Record<string, string[]> {
  const p = load();
  if (!p) return Object.fromEntries(FIELDS.map(f => [f, []]));
  return p.vocab;
}

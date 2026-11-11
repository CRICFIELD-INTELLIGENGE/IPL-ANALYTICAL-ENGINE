// Seeded randomness and the daily-challenge clock for CRICFIELD Arcade.
// Shared by the web app and the API server through @workspace/arcade-rules.

/** 32-bit FNV-1a hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, well-distributed PRNG. Same seed → same sequence on every machine. */
export function seeded(seed: string | number): () => number {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rng: () => number, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Daily challenges roll over at 00:00 India Standard Time (UTC+05:30, no daylight saving), so every
 * player gets the same puzzle for the same IST calendar date.
 */
export const DAILY_TIMEZONE = "Asia/Kolkata";
export function dailyKey(now = Date.now()): string {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}
/** Milliseconds until the next IST midnight. */
export function msUntilNextDaily(now = Date.now()): number {
  const ist = now + 330 * 60_000;
  return 86_400_000 - (ist % 86_400_000);
}
export const isDailyKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Index drawn from unnormalised weights. */
export function weighted(rng: () => number, weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.length - 1;
}

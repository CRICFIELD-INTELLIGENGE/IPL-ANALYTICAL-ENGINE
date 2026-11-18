// Pressure Intelligence query: typed, validated, canonical, URL-serialisable.

export type Range = { min?: number; max?: number };
export type Cond =
  | { k: "innings"; v: 1 | 2 }
  | { k: "phase"; v: "powerplay" | "middle" | "death" }
  | { k: "stage"; v: "early" | "mid" | "late" | "knockout" }
  | { k: "batHand"; v: "left" | "right" }
  | { k: "bowlType"; v: "pace" | "spin" }
  | ({ k: "over" | "wickets" | "ballsLeft" | "score" | "runsRequired" | "rrr" | "target" | "position" } & Range);
export type Group = { op: "and" | "or"; items: (Cond | Group)[] };
export type Discipline = "bat" | "bowl";

export interface Params { wicket: number; lambdaH: number; lambdaN: number; alpha: number; beta: number }
export interface Query {
  comps: string[];
  years: [number, number] | null; // inclusive season-year range; null = all
  discipline: Discipline;
  where: Group;
  method: "standard" | "custom";
  params?: Params;        // only for method "custom"
  minBalls: number;
  minMatches: number;
}

export const MODEL_ID = "contextual_pressure_performance_v1";
export const RAS_ID = "reliability_adjusted_score_v1";

export const RANGE_KEYS = ["over", "wickets", "ballsLeft", "score", "runsRequired", "rrr", "target", "position"] as const;
export const CHASE_ONLY = new Set(["runsRequired", "rrr", "target"]);
const ENUMS: Record<string, readonly (string | number)[]> = {
  innings: [1, 2], phase: ["powerplay", "middle", "death"], stage: ["early", "mid", "late", "knockout"],
  batHand: ["left", "right"], bowlType: ["pace", "spin"],
};
const BOUNDS: Record<string, [number, number]> = {
  over: [1, 20], wickets: [0, 9], ballsLeft: [0, 120], score: [0, 400], runsRequired: [0, 400], rrr: [0, 36], target: [0, 400], position: [1, 11],
};
export const isGroup = (x: Cond | Group): x is Group => "op" in x;
const MAX_DEPTH = 2, MAX_LEAVES = 12;

/** Validates untrusted input (URL, form) into a Query, or returns the reason it is unusable. */
export function parseQuery(x: unknown, knownComps: string[]): { query: Query } | { error: string } {
  try {
    const o = x as Record<string, unknown>;
    if (!o || typeof o !== "object") throw new Error("Query must be an object");
    const comps = [...new Set((Array.isArray(o.comps) ? o.comps : []).map(String))].filter(c => knownComps.includes(c)).sort();
    if (!comps.length) throw new Error("Pick at least one competition");
    let years: [number, number] | null = null;
    if (Array.isArray(o.years)) {
      const [a, b] = o.years.map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error("Season range must be two years");
      years = a <= b ? [a, b] : [b, a];
    }
    const discipline = o.discipline === "bowl" ? "bowl" : "bat";
    let leaves = 0;
    const group = (g: unknown, depth: number): Group => {
      const gg = g as Record<string, unknown>;
      if (!gg || (gg.op !== "and" && gg.op !== "or") || !Array.isArray(gg.items)) throw new Error("Malformed condition group");
      if (depth > MAX_DEPTH) throw new Error(`Groups can nest ${MAX_DEPTH} levels deep`);
      return { op: gg.op, items: gg.items.map(it => ("op" in (it as object) ? group(it, depth + 1) : cond(it))) };
    };
    const cond = (c: unknown): Cond => {
      const cc = c as Record<string, unknown>;
      if (++leaves > MAX_LEAVES) throw new Error(`At most ${MAX_LEAVES} conditions`);
      const k = String(cc?.k);
      if (ENUMS[k]) {
        const v = k === "innings" ? Number(cc.v) : String(cc.v);
        if (!ENUMS[k].includes(v)) throw new Error(`Unknown ${k} value`);
        return { k, v } as Cond;
      }
      if (!BOUNDS[k]) throw new Error(`Unknown condition "${k}"`);
      const [lo, hi] = BOUNDS[k];
      const num = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Math.min(hi, Math.max(lo, Number(v))));
      const min = num(cc.min), max = num(cc.max);
      if ((min !== undefined && isNaN(min)) || (max !== undefined && isNaN(max))) throw new Error(`${k} needs numbers`);
      if (min === undefined && max === undefined) throw new Error(`${k} needs a minimum or a maximum`);
      if (min !== undefined && max !== undefined && min > max) throw new Error(`${k}: minimum is above maximum`);
      return { k, ...(min !== undefined && { min }), ...(max !== undefined && { max }) } as Cond;
    };
    const where = group(o.where ?? { op: "and", items: [] }, 1);
    const conflict = contradiction(where);
    if (conflict) throw new Error(conflict);
    const method = o.method === "custom" ? "custom" : "standard";
    const p = o.params as Record<string, unknown> | undefined;
    const clamp = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
    const params = method === "custom" && p ? {
      wicket: clamp(p.wicket, 0, 40, 8), lambdaH: clamp(p.lambdaH, 0, 1000, 60), lambdaN: clamp(p.lambdaN, 0, 1000, 60),
      alpha: clamp(p.alpha, -1, 2, 0), beta: clamp(p.beta, 0, 3, 0),
    } : undefined;
    return { query: {
      comps, years, discipline, where: canonicalGroup(where), method, ...(params && { params }),
      minBalls: Math.round(clamp(o.minBalls, 1, 5000, 60)), minMatches: Math.round(clamp(o.minMatches, 2, 500, 5)),
    } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Impossible AND combinations that would always select nothing. */
function contradiction(g: Group): string | null {
  for (const it of g.items) if (isGroup(it)) { const c = contradiction(it); if (c) return c; }
  if (g.op !== "and") return null;
  const leaves = g.items.filter((i): i is Cond => !isGroup(i));
  for (const k of Object.keys(ENUMS)) {
    const vals = new Set(leaves.filter(l => l.k === k).map(l => (l as { v: unknown }).v));
    if (vals.size > 1) return `"${k}" cannot be two values at once with AND — use OR`;
  }
  if (leaves.some(l => l.k === "innings" && l.v === 1) && leaves.some(l => CHASE_ONLY.has(l.k)))
    return "Required runs, required rate and target only exist in the chase (innings 2)";
  return null;
}

/** Sorted, duplicate-free; empty or single-item nested groups are dissolved so they can't silently select nothing. */
function canonicalGroup(g: Group): Group {
  const items: (Cond | Group)[] = [];
  for (const i of g.items) {
    if (!isGroup(i)) { items.push(i); continue; }
    const c = canonicalGroup(i);
    if (c.items.length === 1) items.push(c.items[0]);
    else if (c.items.length > 1) items.push(c);
  }
  const seen = new Set<string>();
  return { op: g.op, items: items.map(i => [JSON.stringify(i), i] as const).sort((a, b) => a[0].localeCompare(b[0])).filter(([k]) => !seen.has(k) && !!seen.add(k)).map(([, i]) => i) };
}

/** Stable key: semantically identical queries (after parseQuery) share it. */
export const queryKey = (q: Query) => JSON.stringify(q);

export function encodeQuery(q: Query): string {
  const b = new TextEncoder().encode(JSON.stringify(q));
  let s = ""; b.forEach(c => (s += String.fromCharCode(c)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeQuery(s: string): unknown {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
}

const fmtR = (r: Range, unit = "") => r.min !== undefined && r.max !== undefined ? (r.min === r.max ? `${r.min}${unit}` : `${r.min}–${r.max}${unit}`) : r.min !== undefined ? `≥ ${r.min}${unit}` : `≤ ${r.max}${unit}`;
const LABEL: Record<string, string> = {
  over: "Overs", wickets: "Wickets down", ballsLeft: "Balls left", score: "Team score", runsRequired: "Runs needed",
  rrr: "Required rate", target: "Target", position: "Batting position",
};
export function describeCond(c: Cond): string {
  switch (c.k) {
    case "innings": return c.v === 1 ? "Batting first" : "Chasing";
    case "phase": return { powerplay: "Powerplay (1–6)", middle: "Middle overs (7–15)", death: "Death overs (16–20)" }[c.v];
    case "stage": return { early: "Early league matches", mid: "Mid-season league", late: "Late league matches", knockout: "Playoffs & finals" }[c.v];
    case "batHand": return c.v === "left" ? "Left-hand batter" : "Right-hand batter";
    case "bowlType": return c.v === "pace" ? "Pace bowling" : "Spin bowling";
    default: return `${LABEL[c.k]} ${fmtR(c)}`;
  }
}
export function describeGroup(g: Group, top = true): string {
  if (!g.items.length) return "every ball";
  const s = g.items.map(i => (isGroup(i) ? describeGroup(i, false) : describeCond(i))).join(g.op === "and" ? " and " : " or ");
  return top || g.items.length === 1 ? s : `(${s})`;
}

export interface Preset { id: string; label: string; blurb: string; discipline: Discipline; where: Group }
export const PRESETS: Preset[] = [
  { id: "final-five", label: "Final Five Overs", blurb: "Overs 16–20 of either innings.", discipline: "bat", where: { op: "and", items: [{ k: "over", min: 16, max: 20 }] } },
  { id: "high-rrr", label: "High Required Rate Chase", blurb: "Chasing with 10+ an over needed.", discipline: "bat", where: { op: "and", items: [{ k: "innings", v: 2 }, { k: "rrr", min: 10 }] } },
  { id: "collapse", label: "Collapse & Recovery", blurb: "Batting with 3+ down for 35 or fewer.", discipline: "bat", where: { op: "and", items: [{ k: "wickets", min: 3 }, { k: "score", max: 35 }] } },
  { id: "powerplay", label: "Powerplay Attack", blurb: "Overs 1–6, fielding restrictions on.", discipline: "bat", where: { op: "and", items: [{ k: "phase", v: "powerplay" }] } },
  { id: "bowl-pressure", label: "Bowling Under Pressure", blurb: "Defending the last 5 overs of a live chase (6–15 an over needed, ≤8 down).", discipline: "bowl",
    where: { op: "and", items: [{ k: "innings", v: 2 }, { k: "over", min: 16, max: 20 }, { k: "rrr", min: 6, max: 15 }, { k: "wickets", max: 8 }] } },
  { id: "knockout", label: "Knockout Situations", blurb: "Playoffs, semi-finals and finals.", discipline: "bat", where: { op: "and", items: [{ k: "stage", v: "knockout" }] } },
];

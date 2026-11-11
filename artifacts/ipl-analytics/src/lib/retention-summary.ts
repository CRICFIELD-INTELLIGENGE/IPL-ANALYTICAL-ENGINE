// Fan-facing summaries of CRICFIELD Picks, shared by the Retention Room and Squad DNA so
// both pages always show the same core, the same likely releases and the same wording.
// Selection and wording only: every value still comes from the retention API.

import { CATEGORIES, type PickRow, type TeamPicks } from "@/lib/retention-api";

export const TOP_TIERS = new Set<string>(["Icons", "Franchise Cornerstone", "Priority Retain"]);
export const RELEASE_TIERS = new Set<string>(["Release / Buyback Review", "Release Candidate"]);
export const TIER_RANK = Object.fromEntries(CATEGORIES.map((c, i) => [c, i])) as Record<string, number>;

export const PLAIN: Record<string, string> = {
  performance: "Recent form (3 seasons)", scarcity: "Hard to replace in this role", economics: "Value for money", fit: "Fits the best XI",
  horizon: "Age and future years", continuity: "Loyalty to the franchise", roleSecurity: "Clear planned role", development: "Development upside",
};
export const PLAN: Record<string, string> = {
  "Icons": "Franchise-defining legend: cultural identity, leadership & irreplaceable anchor",
  "Franchise Cornerstone": "Retain and build the 2028 squad around him",
  "Priority Retain": "Retain: part of the long-term core",
  "Strong Retain": "Keep as squad depth at this price",
  "Retention Dilemma": "Keep only if the price and role still make sense",
  "Release / Buyback Review": "Release, then try to buy back cheaper at the auction",
  "Release Candidate": "Release to free purse and a squad place",
  "Insufficient Evidence": "Not enough IPL data to make a firm call",
};
export type Call = "retain" | "doubt" | "release" | "unclear";
export const CALL: Record<Call, { label: string; tone: string }> = {
  retain: { label: "Expected to stay", tone: "bg-emerald-500/20 text-emerald-300" },
  doubt: { label: "Could go either way", tone: "bg-amber-500/20 text-amber-200" },
  release: { label: "Expected to go", tone: "bg-rose-500/20 text-rose-300" },
  unclear: { label: "Not enough data", tone: "bg-white/10 text-white/60" },
};
export const callOf = (p: PickRow): Call => p.category === "Insufficient Evidence" ? "unclear" : p.category === "Retention Dilemma" ? "doubt" : RELEASE_TIERS.has(p.category) ? "release" : "retain";

// Split at "." or ";" before a letter, but not after "No" (batting positions like "No. 3").
export const firstSentence = (s: string | null | undefined) => (s ?? "").split(/(?<!\bNo)[.;]\s+(?=[A-Za-z])/)[0].replace(/[.;]$/, "");
// "Tactical XI/XII fit: Outside the RR best XII" -> "Outside the RR best XII"; policy echoes fall back to the reason.
export const plainAgainst = (p: PickRow) => {
  const a = (p.against ?? "").replace(/^[^:]{3,40}:\s*/, "");
  return a && !/^Declared/i.test(a) ? firstSentence(a) : firstSentence(p.reason.replace(/^Latest \w+ strategy release candidate:\s*/i, "Strategy call: ").replace(/, subject to .*$/, ""));
};
export const strongOn = (p: PickRow) => p.metrics.filter((m) => m.fraction !== null && m.fraction >= 0.7).map((m) => { const s = PLAIN[m.key] ?? m.label; return s[0].toLowerCase() + s.slice(1); });
export const futureProof = (p: PickRow) => p.horizon.age === null || p.horizon.age < 33;
export const isCore = (picks: TeamPicks | undefined, id: string) => {
  const row = picks?.rows.find((p) => p.id === id);
  if (row) {
    return row.category === "Franchise Cornerstone" || row.category === "Franchise Core";
  }
  return Boolean(picks?.planning?.coreLocks.some((l) => l.id === id));
};
export const meter = (f: number | null) => (f === null ? "bg-white/15" : f >= 0.7 ? "bg-emerald-400" : f >= 0.4 ? "bg-amber-400" : "bg-rose-400");

/** Top five to build around through the 2028 cycle: under-33s first, then core locks, tier, rating. */
export const coreFive = (picks: TeamPicks) => picks.rows.filter((p) => TOP_TIERS.has(p.category))
  .sort((a, b) => Number(futureProof(b)) - Number(futureProof(a)) || Number(isCore(picks, b.id)) - Number(isCore(picks, a.id)) || TIER_RANK[a.category] - TIER_RANK[b.category] || b.index - a.index).slice(0, 5);
/** Most likely released: Release Candidates first, lowest rating first. */
export const likelyReleases = (picks: TeamPicks, n = 5) => picks.rows.filter((p) => RELEASE_TIERS.has(p.category))
  .sort((a, b) => TIER_RANK[b.category] - TIER_RANK[a.category] || a.index - b.index).slice(0, n);
/** Players with a real case on both sides: strictly the Retention Dilemma tier. */
export const genuineDoubt = (picks: TeamPicks) => picks.rows.filter((p) => p.category === "Retention Dilemma");

// Retention Room — season rules.
//
// Rules live in data/retention/season-rules.json, one entry per auction cycle, so
// a new cycle or a newly verified purse is a data change and not a code change.
// Mega-auction limits and mini-auction squad continuation are different things:
// a mini-auction has no retention cap, and a mega-auction prices retained players
// by slab instead of by contract.

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getProjectRoot } from "../decision/db";

const dated = z.object({ date: z.string().nullable(), status: z.string(), sourceUrl: z.string().nullable() });
const seasonRules = z.object({
  season: z.number().int(),
  cycle: z.enum(["mega", "mini"]),
  live: z.boolean(),
  rulesStatus: z.enum(["confirmed", "reported", "provisional"]),
  squadSeason: z.number().int(),
  maxSquad: z.number().int(),
  maxOverseas: z.number().int(),
  maxRetained: z.number().int().nullable(),
  maxCappedRetained: z.number().int().nullable(),
  maxUncappedRetained: z.number().int().nullable(),
  retainedCostBasis: z.enum(["contract", "slab"]),
  cappedSlabsLakh: z.array(z.number()).nullable(),
  uncappedSlabLakh: z.number().nullable(),
  rtm: z.boolean(),
  auctionPurseLakh: z.number().nullable(),
  purseStatus: z.enum(["verified", "unverified"]),
  salaryCapLakh: z.number().nullable(),
  retentionDeadline: dated,
  auction: dated.extend({ venue: z.string().nullable() }),
  votingLocksAt: z.string().nullable(),
  assumptions: z.array(z.string()),
  sources: z.array(z.object({ label: z.string(), url: z.string() })),
  contractGapsLakh: z.record(z.string(), z.number()),
}).superRefine((r, ctx) => {
  // An unverified purse must be null, so a guess cannot reach a calculation.
  if (r.purseStatus === "unverified" && r.auctionPurseLakh !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "an unverified purse must be null" });
  if (r.cycle === "mega" && (r.maxRetained === null || r.cappedSlabsLakh === null)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "a mega auction needs retention limits and slabs" });
  if (r.cycle === "mini" && r.maxRetained !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "a mini-auction has no retention cap" });
});
export type SeasonRules = z.infer<typeof seasonRules>;

let cache: SeasonRules[] | null = null;
export function allRules(): SeasonRules[] {
  if (cache) return cache;
  const fp = path.join(getProjectRoot(), "artifacts", "api-server", "data", "retention", "season-rules.json");
  cache = z.object({ seasons: z.array(seasonRules) }).parse(JSON.parse(fs.readFileSync(fp, "utf8"))).seasons.sort((a, b) => b.season - a.season);
  return cache;
}
export const rulesFor = (season: number) => allRules().find((r) => r.season === season) ?? null;
export const liveSeason = () => allRules().find((r) => r.live) ?? null;

export function votingOpen(r: SeasonRules, now = Date.now()) {
  return r.live && r.votingLocksAt !== null && now < Date.parse(r.votingLocksAt);
}

export interface RulePlayer { id: string; name: string; overseas: boolean | null; contractLakh: number | null; capped?: boolean | null }

export interface Cost { lakh: number | null; missing: string[]; knownLakh: number }

/** What the retained group costs under the season's rules. Null when any salary is unknown: no partial total poses as the answer. */
export function retainedCost(r: SeasonRules, retained: RulePlayer[]): Cost {
  if (r.retainedCostBasis === "slab") {
    const capped = retained.filter((p) => p.capped !== false), uncapped = retained.filter((p) => p.capped === false);
    const slabs = r.cappedSlabsLakh ?? [];
    const total = capped.slice(0, slabs.length).reduce((s, _, i) => s + slabs[i], 0) + uncapped.length * (r.uncappedSlabLakh ?? 0);
    return { lakh: total, missing: [], knownLakh: total };
  }
  const missing = retained.filter((p) => !p.contractLakh).map((p) => p.name);
  const knownLakh = retained.reduce((s, p) => s + (p.contractLakh ?? 0), 0);
  return { lakh: missing.length ? null : knownLakh, missing, knownLakh };
}

export interface PurseResult { remainingLakh: number | null; note: string | null }
export function remainingPurse(r: SeasonRules, cost: Cost): PurseResult {
  if (r.auctionPurseLakh === null) return { remainingLakh: null, note: `The ${r.season} auction purse is not verified, so remaining purse is unavailable.` };
  if (cost.lakh === null) return { remainingLakh: null, note: `Salary is missing for ${cost.missing.length} retained player${cost.missing.length === 1 ? "" : "s"}, so remaining purse is unavailable.` };
  return { remainingLakh: r.auctionPurseLakh - cost.lakh, note: null };
}

export interface Violation { code: string; message: string }

/** Roster checks for one retain list. Unknown facts are not counted as breaches: they are reported as notes. */
export function checkRetained(r: SeasonRules, retained: RulePlayer[]): { violations: Violation[]; notes: string[] } {
  const violations: Violation[] = [], notes: string[] = [];
  if (retained.length > r.maxSquad) violations.push({ code: "squad_limit", message: `${retained.length} retained is over the ${r.maxSquad}-player squad limit.` });
  const overseas = retained.filter((p) => p.overseas === true).length;
  if (overseas > r.maxOverseas) violations.push({ code: "overseas_limit", message: `${overseas} overseas players is over the limit of ${r.maxOverseas}.` });
  if (retained.some((p) => p.overseas === null)) notes.push("Nationality is unknown for at least one player, so the overseas count may be low.");
  if (r.cycle === "mega") {
    if (retained.length > r.maxRetained!) violations.push({ code: "retention_limit", message: `${retained.length} retentions is over the limit of ${r.maxRetained}.` });
    const capped = retained.filter((p) => p.capped !== false).length, uncapped = retained.filter((p) => p.capped === false).length;
    if (capped > r.maxCappedRetained!) violations.push({ code: "capped_limit", message: `${capped} capped retentions is over the limit of ${r.maxCappedRetained}.` });
    if (uncapped > r.maxUncappedRetained!) violations.push({ code: "uncapped_limit", message: `${uncapped} uncapped retentions is over the limit of ${r.maxUncappedRetained}.` });
  }
  const cost = retainedCost(r, retained);
  if (r.auctionPurseLakh === null) notes.push("The purse cannot be checked: no verified auction purse for this season.");
  else if (cost.lakh === null) notes.push(`The purse cannot be checked: salary missing for ${cost.missing.join(", ")}.`);
  else if (cost.lakh > r.auctionPurseLakh) violations.push({ code: "purse_limit", message: "Retained salaries exceed the auction purse." });
  return { violations, notes };
}

export function rulesSummary(r: SeasonRules) {
  return {
    season: r.season, cycle: r.cycle, status: r.rulesStatus, retentionDeadline: r.retentionDeadline, auction: r.auction, votingLocksAt: r.votingLocksAt, votingOpen: votingOpen(r),
    maxSquad: r.maxSquad, maxOverseas: r.maxOverseas, maxRetained: r.maxRetained, rtm: r.rtm, retainedCostBasis: r.retainedCostBasis,
    auctionPurseLakh: r.auctionPurseLakh, purseStatus: r.purseStatus, salaryCapLakh: r.salaryCapLakh, assumptions: r.assumptions, sources: r.sources,
    summary: r.cycle === "mini"
      ? `Mini-auction: franchises may keep any number of players within ${r.maxSquad} in the squad and ${r.maxOverseas} overseas. A kept player costs the existing contract.`
      : `Mega auction: up to ${r.maxRetained} players by retention or Right to Match, at most ${r.maxCappedRetained} capped and ${r.maxUncappedRetained} uncapped, priced by fixed slabs.`,
  };
}

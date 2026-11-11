import type { ScoutRating } from "./scout-api";
export type Capability = "powerHitter" | "leftArmOption" | "deathBowler" | "uncapped" | "overseasSlot" | "finisher";
export type RecruitmentEvidence = ScoutRating & { bowlingStyle?: string; bowlingArm?: "left" | "right"; isOverseas?: boolean; isUncapped?: boolean; strikeRateDeath?: number; economyDeath?: number };
export const SRH_WEIGHTS: Record<Capability, number> = { powerHitter: 2, leftArmOption: 1.5, deathBowler: 2, uncapped: 1, overseasSlot: 1.5, finisher: 2 };
export function evaluateSRHSuitability(player: RecruitmentEvidence) {
 const deathSR = player.strikeRateDeath ?? (player.discipline === "batting" && player.phase === "death" ? player.metrics?.strike_rate?.value : undefined);
 const deathEconomy = player.economyDeath ?? (player.discipline === "bowling" && player.phase === "death" ? player.metrics?.economy?.value : undefined);
 const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
 const checks: Record<Capability, boolean | null> = {
  powerHitter: valid(deathSR) ? deathSR >= 155 : null,
  leftArmOption: player.bowlingArm ? player.bowlingArm === "left" : player.bowlingStyle ? /left/i.test(player.bowlingStyle) : null,
  deathBowler: valid(deathEconomy) ? deathEconomy <= 9 : null,
  uncapped: typeof player.isUncapped === "boolean" ? player.isUncapped : null,
  overseasSlot: typeof player.isOverseas === "boolean" ? player.isOverseas : null,
  finisher: /finisher/i.test(player.role?.label ?? "") || (valid(deathSR) && deathSR >= 165) ? true : valid(deathSR) ? false : null,
 };
 const keys = Object.keys(checks) as Capability[];
 const score = keys.reduce((sum, key) => sum + (checks[key] === true ? SRH_WEIGHTS[key] : 0), 0);
 const unknownPoints = keys.reduce((sum, key) => sum + (checks[key] === null ? SRH_WEIGHTS[key] : 0), 0);
 return { checks, suitabilityScore: score, maximumPossible: score + unknownPoints, complete: unknownPoints === 0 };
}

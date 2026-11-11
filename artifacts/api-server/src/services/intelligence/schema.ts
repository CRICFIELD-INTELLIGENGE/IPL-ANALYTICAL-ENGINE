// CricField Player Intelligence — shared contracts.
//
// Every intelligence answer is one of these envelopes. The four concepts stay
// separate on purpose and are never blended into a single score:
//
//   performance   runs above replacement a player contributes (sporting units)
//   market        what the auction is likely to pay (₹ lakh)
//   franchise     change in a specific team's best XII (sporting units)
//   retention     chance a franchise keeps the player (probability)

import { z } from "zod";

/** How a value may be presented. A label is earned by the pipeline, never chosen by a page. */
export const displayStatus = z.enum(["verified_data", "model_prediction", "provisional_estimate", "limited_evidence", "unavailable"]);
export type DisplayStatus = z.infer<typeof displayStatus>;

export const identityStatus = z.enum(["verified", "name_only", "ambiguous", "not_found"]);
export type IdentityStatus = z.infer<typeof identityStatus>;

export const interval = z.object({ low: z.number(), high: z.number(), level: z.number() });
export type Interval = z.infer<typeof interval>;

export const factor = z.object({ label: z.string(), detail: z.string() });
export type Factor = z.infer<typeof factor>;

/** Fields required on every model response. */
export const envelope = z.object({
  canonicalId: z.string(),
  targetSeason: z.number().int(),
  modelVersion: z.string(),
  predictionTimestamp: z.string(),
  dataCutoff: z.string(),
  value: z.number().nullable(),
  units: z.string(),
  uncertainty: interval.nullable(),
  sampleSize: z.object({ value: z.number(), unit: z.string() }).nullable(),
  inputs: z.object({ available: z.array(z.string()), missing: z.array(z.string()) }),
  status: displayStatus,
  statusReason: z.string().nullable(),
  factors: z.array(factor),
});
export type Envelope = z.infer<typeof envelope>;

export const playerIdentity = z.object({
  canonicalId: z.string(),
  warehouseId: z.number().int().nullable(),
  cricsheetId: z.string().nullable(),
  name: z.string(),
  fullName: z.string().nullable(),
  aliases: z.array(z.string()),
  country: z.string().nullable(),
  overseas: z.boolean().nullable(),
  role: z.string().nullable(),
  battingStyle: z.string().nullable(),
  bowlingStyle: z.string().nullable(),
  birthDate: z.string().nullable(),
  firstSeason: z.number().int().nullable(),
  lastSeason: z.number().int().nullable(),
  matches: z.number().int(),
  teamsBySeason: z.array(z.object({ season: z.number().int(), team: z.string() })),
  identityStatus,
  sources: z.array(z.string()),
});
export type PlayerIdentity = z.infer<typeof playerIdentity>;

export interface Lookup {
  status: IdentityStatus;
  player: PlayerIdentity | null;
  candidates: { canonicalId: string; name: string; lastSeason: number | null; country: string | null }[];
}

export const TEAMS = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"] as const;
export type Team = (typeof TEAMS)[number];

export const scenarioMove = z.discriminatedUnion("action", [
  z.object({ action: z.literal("buy"), player: z.string().min(1).max(80) }).strict(),
  z.object({ action: z.literal("release"), player: z.string().min(1).max(80) }).strict(),
  z.object({ action: z.literal("retain"), player: z.string().min(1).max(80) }).strict(),
  z.object({ action: z.literal("trade"), out: z.string().min(1).max(80), in: z.string().min(1).max(80) }).strict(),
  z.object({ action: z.literal("replace"), out: z.string().min(1).max(80), in: z.string().min(1).max(80) }).strict(),
]);
export type ScenarioMove = z.infer<typeof scenarioMove>;

export const squadSimulateBody = z.object({
  team: z.enum(TEAMS),
  moves: z.array(scenarioMove).min(0).max(12),
}).strict();

export const auctionSimulateBody = z.object({
  team: z.enum(TEAMS),
  players: z.array(z.object({ player: z.string().min(1).max(80), bidLakh: z.number().int().min(20).max(5000).optional() }).strict()).min(1).max(12),
  purseLakh: z.number().int().min(0).max(25_000).optional(),
}).strict();

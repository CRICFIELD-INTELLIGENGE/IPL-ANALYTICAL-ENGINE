// Types for player-identity.mjs (used from TypeScript in scripts/src).

export interface RegistryEntry { written: Set<string>; franchises: Set<string>; seasonsByFranchise: Map<string, Set<string>> }
export interface RegistryHistory { writtenToIds: Map<string, Set<string>>; ids: Map<string, RegistryEntry> }
export interface BioNames { playerName?: string; fullName?: string; team?: string; currentTeam?: string }
export interface Identity { id: string | null; method: string; candidates: string[] }
export interface VerifiedAlias { cricsheetId: string; evidence: string }

export const FRANCHISE_ALIASES: Record<string, string>;
export function canonFranchise(team: string): string;
export function slugify(s: string | undefined | null): string;
export function createRegistryHistory(): RegistryHistory;
export function recordAppearance(history: RegistryHistory, registryId: string | undefined, writtenName: string, team: string, season: string | number): void;
export function loadVerifiedAliases(file: string | undefined): Record<string, VerifiedAlias>;
export function identifyBio(bioKey: string, bio: BioNames, history: RegistryHistory, aliases?: Record<string, VerifiedAlias>): Identity;
export function pageSlug(s: string | undefined | null): string;
export function identifySquadEntry(entry: { cricsheetName: string; name?: string }, season: string, team: string, history: RegistryHistory): string | null;
export function buildPageIds(input: {
  bios: Record<string, BioNames>;
  squads: Record<string, Record<string, { cricsheetName?: string | null; name?: string }[]>> | undefined;
  history: RegistryHistory;
}): { pages: Record<string, string>; conflicts: { slug: string; source: string; ids: string[]; written?: string[] }[] };
export function buildKeyIndex(input: {
  bios: Record<string, BioNames>;
  history: RegistryHistory;
  aliases: Record<string, VerifiedAlias>;
}): { keys: Map<string, string>; bioIdentity: Record<string, Identity> };

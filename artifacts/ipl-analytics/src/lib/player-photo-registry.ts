/**
 * Shared player portraits for squads and biographies, covering IPL 2008–2026.
 * By default the latest approved official profile follows the player across seasons.
 * Historical franchise kit selection remains available through explicit opt-in.
 */

export type VerificationStatus =
  | "exact_verified"
  | "same_franchise_different_season"
  | "neutral_portrait"
  | "incorrect_jersey"
  | "missing"
  | "rights_pending";

export type LicenseStatus = "approved" | "pending" | "rejected";

export interface PlayerPhoto {
  playerId: string;                 // Canonical normalized slug, e.g. "pj-cummins", "v-kohli"
  franchiseId: string | null;        // Intended franchise code (e.g. "RCB", "SRH", "MI")
  season: number | null;             // Intended season year (e.g. 2024)
  imageUrl: string;                  // Image asset path or approved URL
  sourceUrl: string;                 // Provenance source URL
  kitTeamId: string | null;          // Actual franchise jersey shown in photo ("RCB", "SRH", "MI", or "NEUTRAL"/null)
  kitSeason: number | null;          // Actual season of the jersey shown in photo
  verificationStatus: VerificationStatus;
  licenseStatus: LicenseStatus;      // "approved" | "pending" | "rejected"
  expiryDate?: string;
  lastVerifiedAt?: string;
  licenseReference?: string;
  allowedUsage?: string[];
  attribution?: string;              // License and attribution details
  matchConfidence: number;           // 0.0 to 1.0 confidence score
  aliases?: string[];                // All valid name variations and scorecard spellings
  isCutout?: boolean;                // Transparent background cutout
  notes?: string;                    // Verification or disambiguation notes
}

export interface PlayerPhotoRegistryData {
  version: string;
  lastUpdated: string;
  totalApproved: number;
  totalPending: number;
  photos: PlayerPhoto[];
}

export interface ResolvePhotoOptions {
  franchise?: string | null;           // Currently selected team ("Royal Challengers Bengaluru", "RCB")
  season?: number | string | null;     // Currently selected season ("2026", 2026)
  strictHistoricalJersey?: boolean;    // Opt in to franchise-specific historical kit
}

export interface ResolvedPhotoResult {
  url: string | null;
  matchType: VerificationStatus;
  statusLabel: string;
  attribution?: string;
  licenseStatus: LicenseStatus;
  kitTeamId: string | null;
  kitSeason: number | null;
  photoRecord: PlayerPhoto | null;
  isSameFranchiseNonSeasonSpecific?: boolean;
}

/** Normalized slug conversion matching cricsheet and bio registries */
export function normalizePlayerSlug(name: string): string {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Standard franchise code mapping */
export const FRANCHISE_NAME_TO_CODE: Record<string, string> = {
  "sunrisers hyderabad": "SRH",
  "chennai super kings": "CSK",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "mumbai indians": "MI",
  "kolkata knight riders": "KKR",
  "rajasthan royals": "RR",
  "delhi capitals": "DC",
  "delhi daredevils": "DC",
  "punjab kings": "PBKS",
  "kings xi punjab": "PBKS",
  "gujarat titans": "GT",
  "lucknow super giants": "LSG",
  "deccan chargers": "DEC",
  "pune warriors": "PWI",
  "rising pune supergiant": "RPS",
  "rising pune supergiants": "RPS",
  "gujarat lions": "GL",
  "kochi tuskers kerala": "KTK",
};

export function normalizeFranchiseCode(team?: string | null): string | null {
  if (!team) return null;
  const clean = team.trim().toUpperCase();
  if (["SRH", "CSK", "RCB", "MI", "KKR", "RR", "DC", "PBKS", "GT", "LSG", "DEC", "PWI", "RPS", "GL", "KTK"].includes(clean)) {
    return clean;
  }
  const fromName = FRANCHISE_NAME_TO_CODE[team.toLowerCase().trim()];
  return fromName || null;
}

export function initialSurnameKey(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0][0]}|${parts[parts.length - 1]}`;
}

/**
 * Resolves the latest identity-matched portrait, or historical kit when explicitly requested.
 * 
 * Rules:
 * 1. Prefer verified exact-season, exact-franchise portrait.
 * 2. If unavailable, use verified same-franchise portrait (marked non-season-specific).
 * 3. Otherwise use approved neutral portrait.
 * 4. Otherwise use initials/silhouette.
 * 
 * NEVER displays another franchise's jersey as if it were the selected franchise's kit.
 */
export function resolvePlayerPhotoFromRegistry(
  playerNameOrSlug: string,
  photos: PlayerPhoto[],
  options?: ResolvePhotoOptions
): ResolvedPhotoResult {
  const targetSlug = normalizePlayerSlug(playerNameOrSlug);
  const targetKey = initialSurnameKey(playerNameOrSlug);
  const targetFranchise = normalizeFranchiseCode(options?.franchise);
  const targetSeason = options?.season ? Number(options.season) : null;
  const strictHistorical = options?.strictHistoricalJersey ?? false;

  // Prefer explicit identity aliases; a surname initial is only safe when unique.
  const approved = photos.filter(p => p.licenseStatus === "approved" && (!p.expiryDate || (Number.isFinite(Date.parse(p.expiryDate)) && Date.parse(p.expiryDate + "T23:59:59Z") >= Date.now())) &&
    !["incorrect_jersey", "missing", "rights_pending"].includes(p.verificationStatus));
  const exact = approved.filter(p => normalizePlayerSlug(p.playerId) === targetSlug ||
    p.aliases?.some(a => normalizePlayerSlug(a) === targetSlug));
  const abbreviated = targetKey ? approved.filter(p =>
    initialSurnameKey(p.playerId) === targetKey || p.aliases?.some(a => initialSurnameKey(a) === targetKey)) : [];
  const identities = new Set(abbreviated.map(p => p.playerId));
  const playerCandidates = (exact.length ? exact : identities.size === 1 ? abbreviated : [])
    .sort((a, b) => (b.kitSeason ?? b.season ?? 0) - (a.kitSeason ?? a.season ?? 0) ||
      Number(b.imageUrl.includes("/profiles-2026/")) - Number(a.imageUrl.includes("/profiles-2026/")) ||
      Number(Boolean(b.isCutout)) - Number(Boolean(a.isCutout)) || b.matchConfidence - a.matchConfidence);

  if (playerCandidates.length === 0) {
    return {
      url: null,
      matchType: "missing",
      statusLabel: "Missing portrait",
      licenseStatus: "rejected",
      kitTeamId: null,
      kitSeason: null,
      photoRecord: null,
    };
  }

  // When a target franchise is specified (e.g. Dugout, Squad, Match Center)
  if (targetFranchise && strictHistorical) {
    // 1. Exact verified: kitTeamId matches franchise AND kitSeason matches season
    if (targetSeason) {
      const exactMatch = playerCandidates.find(
        (p) => p.kitTeamId === targetFranchise && p.kitSeason === targetSeason
      );
      if (exactMatch) {
        return {
          url: exactMatch.imageUrl,
          matchType: "exact_verified",
          statusLabel: `Exact verified (${targetFranchise} ${targetSeason})`,
          attribution: exactMatch.attribution,
          licenseStatus: exactMatch.licenseStatus,
          kitTeamId: exactMatch.kitTeamId,
          kitSeason: exactMatch.kitSeason,
          photoRecord: exactMatch,
          isSameFranchiseNonSeasonSpecific: false,
        };
      }
    }

    // 2. Same franchise, different season kit
    const sameFranchiseMatch = playerCandidates.find((p) => p.kitTeamId === targetFranchise);
    if (sameFranchiseMatch) {
      return {
        url: sameFranchiseMatch.imageUrl,
        matchType: "same_franchise_different_season",
        statusLabel: `Same franchise (${targetFranchise} kit)`,
        attribution: sameFranchiseMatch.attribution,
        licenseStatus: sameFranchiseMatch.licenseStatus,
        kitTeamId: sameFranchiseMatch.kitTeamId,
        kitSeason: sameFranchiseMatch.kitSeason,
        photoRecord: sameFranchiseMatch,
        isSameFranchiseNonSeasonSpecific: true,
      };
    }

    // 3. Neutral portrait (national team, studio neutral without franchise kit)
    const neutralMatch = playerCandidates.find(
      (p) => p.kitTeamId === "NEUTRAL" || p.kitTeamId === null
    );
    if (neutralMatch) {
      return {
        url: neutralMatch.imageUrl,
        matchType: "neutral_portrait",
        statusLabel: "Neutral portrait",
        attribution: neutralMatch.attribution,
        licenseStatus: neutralMatch.licenseStatus,
        kitTeamId: null,
        kitSeason: null,
        photoRecord: neutralMatch,
        isSameFranchiseNonSeasonSpecific: false,
      };
    }

    return { url: null, matchType: "missing", statusLabel: "Missing portrait for this franchise",
      licenseStatus: "rejected", kitTeamId: null, kitSeason: null, photoRecord: null };
  }

  // If no franchise context requested, return best approved photo
  const generic = playerCandidates[0];
  return {
    url: generic.imageUrl,
    matchType: generic.kitTeamId ? "same_franchise_different_season" : "neutral_portrait",
    statusLabel: generic.kitTeamId ? `${generic.kitTeamId} portrait` : "Neutral portrait",
    attribution: generic.attribution,
    licenseStatus: generic.licenseStatus,
    kitTeamId: generic.kitTeamId,
    kitSeason: generic.kitSeason,
    photoRecord: generic,
  };
}

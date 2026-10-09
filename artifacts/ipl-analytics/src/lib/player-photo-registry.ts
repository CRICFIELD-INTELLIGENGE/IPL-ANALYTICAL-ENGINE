/**
 * Centralized Player Photo Registry & Fallback Resolution Service
 * Covers IPL 2008–2026 with strict player identity, franchise, and season matching.
 * 
 * Hierarchy:
 * 1. Approved exact player + franchise + season photo
 * 2. Approved player + franchise portrait
 * 3. Approved generic player portrait
 * 4. Initials / silhouette fallback
 * 
 * Never substitutes another player's photograph.
 */

export type LicenseStatus = "approved" | "pending" | "rejected";

export interface PlayerPhoto {
  playerId: string;              // Canonical normalized slug, e.g. "pj-cummins", "v-kohli"
  teamId: string | null;          // Franchise abbreviation, e.g. "SRH", "CSK", "RCB"
  season: number | null;          // Season year, e.g. 2024
  imageUrl: string;               // Local path or approved remote URL
  sourcePageUrl: string;          // Source provenance URL
  licenseStatus: LicenseStatus;   // "approved" | "pending" | "rejected"
  attribution?: string;           // E.g. "Wikimedia Commons / CC-BY-SA 4.0", "Official Media Kit"
  matchConfidence: number;        // 0.0 to 1.0 confidence score
  isCutout?: boolean;             // Transparent background portrait cutout
  notes?: string;                 // Provenance or disambiguation remarks
}

export interface PlayerPhotoRegistryData {
  version: string;
  lastUpdated: string;
  totalApproved: number;
  totalPending: number;
  photos: PlayerPhoto[];
}

export interface ResolvePhotoOptions {
  franchise?: string | null;           // Team name or code ("Sunrisers Hyderabad", "SRH")
  season?: number | string | null;     // Season year ("2024", 2024)
  strictHistoricalJersey?: boolean;    // If true, will NOT display a modern franchise jersey for an older franchise
}

export interface ResolvedPhotoResult {
  url: string | null;
  matchType: "exact_season_team" | "team_portrait" | "generic_portrait" | "initials_fallback";
  attribution?: string;
  licenseStatus: LicenseStatus;
  photoRecord: PlayerPhoto | null;
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
const FRANCHISE_NAME_TO_CODE: Record<string, string> = {
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

/**
 * Resolves a player photograph using the strict 4-level fallback hierarchy.
 */
export function resolvePlayerPhotoFromRegistry(
  playerNameOrSlug: string,
  photos: PlayerPhoto[],
  options?: ResolvePhotoOptions
): ResolvedPhotoResult {
  const targetSlug = normalizePlayerSlug(playerNameOrSlug);
  const targetFranchise = normalizeFranchiseCode(options?.franchise);
  const targetSeason = options?.season ? Number(options.season) : null;
  const strictHistorical = options?.strictHistoricalJersey ?? false;

  // Filter only approved candidates for this specific player
  const playerCandidates = photos.filter(
    (p) => p.playerId === targetSlug && p.licenseStatus === "approved"
  );

  if (playerCandidates.length === 0) {
    return {
      url: null,
      matchType: "initials_fallback",
      licenseStatus: "rejected",
      photoRecord: null,
    };
  }

  // 1. Exact match: Player + Franchise + Season
  if (targetFranchise && targetSeason) {
    const exact = playerCandidates.find(
      (p) => p.teamId === targetFranchise && p.season === targetSeason
    );
    if (exact) {
      return {
        url: exact.imageUrl,
        matchType: "exact_season_team",
        attribution: exact.attribution,
        licenseStatus: exact.licenseStatus,
        photoRecord: exact,
      };
    }
  }

  // 2. Franchise portrait: Player + Franchise (different or unspecified season)
  if (targetFranchise) {
    const franchiseMatch = playerCandidates.find((p) => p.teamId === targetFranchise);
    if (franchiseMatch) {
      return {
        url: franchiseMatch.imageUrl,
        matchType: "team_portrait",
        attribution: franchiseMatch.attribution,
        licenseStatus: franchiseMatch.licenseStatus,
        photoRecord: franchiseMatch,
      };
    }
  }

  // 3. Generic player portrait (only if not restricted by strict historical jersey)
  if (!strictHistorical) {
    // Prefer cutout or higher confidence
    const generic = [...playerCandidates].sort((a, b) => b.matchConfidence - a.matchConfidence)[0];
    if (generic) {
      return {
        url: generic.imageUrl,
        matchType: "generic_portrait",
        attribution: generic.attribution,
        licenseStatus: generic.licenseStatus,
        photoRecord: generic,
      };
    }
  }

  // 4. Initials fallback (Never substitute another player's face)
  return {
    url: null,
    matchType: "initials_fallback",
    licenseStatus: "rejected",
    photoRecord: null,
  };
}

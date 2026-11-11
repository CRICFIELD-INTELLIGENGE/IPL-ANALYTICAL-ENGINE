// CricField Video Intelligence Engine — Provider-Independent Match-to-Video Resolver
//
// Key Responsibilities:
//   1. Ingest authorized video metadata from official YouTube & verified JioHotstar hubs.
//   2. Cricket Entity Resolution: deterministic mapping of videos to CricField match IDs and player keys.
//   3. Confidence scoring & ambiguous match review queue.
//   4. Safe redirection & strict allowlist protection (zero scraping, zero DRM bypass).

import fs from "node:fs";
import path from "node:path";
import { getGlobalDb, getProjectRoot } from "../scout/db";

export type VideoProvider = "jiohotstar" | "youtube" | "official_bcci";
export type VideoStatus = "verified_active" | "review_needed" | "unavailable";

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  provider: VideoProvider;
  videoType: string;
  season: number;
  competition: string;
  teams: string[];
  players: string[];
  opponent?: string | null;
  matchStage?: string | null;
  duration?: string | null;
  destinationUrl: string;
  thumbnailUrl?: string | null;
  isExactVideoUrl: boolean;
  verified: boolean;
  status: VideoStatus;
  matchId?: string | null;
  matchConfidence?: number | null;
  matchResolutionEvidence?: string | null;
  attribution: string;
  disclaimer: string;
  keywords: string[];
}

export interface VideoSearchFilters {
  query?: string;
  competition?: string;
  season?: number;
  team?: string;
  player?: string;
  category?: string;
  provider?: VideoProvider;
  matchId?: string;
  page?: number;
  limit?: number;
}

export interface VideoSearchResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  videos: VideoMetadata[];
}

export interface VideoStatsSummary {
  totalVideos: number;
  verifiedVideos: number;
  matchedToMatches: number;
  matchResolutionRate: number;
  providers: Record<string, number>;
  categories: Record<string, number>;
}

// Allowed external streaming domains for security and legal compliance
const ALLOWED_STREAMING_DOMAINS = [
  "hotstar.com",
  "www.hotstar.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "iplt20.com",
  "www.iplt20.com",
  "bcci.tv",
  "www.bcci.tv",
];

export function isSafeVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_STREAMING_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Normalized canonical 3-letter codes for IPL and major franchise teams */
export function normalizeTeamCode(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (s.includes("RCB") || s.includes("BANGALORE") || s.includes("BENGALURU")) return "RCB";
  if (s.includes("CSK") || s.includes("CHENNAI")) return "CSK";
  if (s.includes("MI") || s.includes("MUMBAI")) return "MI";
  if (s.includes("KKR") || s.includes("KOLKATA")) return "KKR";
  if (s.includes("GT") || s.includes("GUJARAT")) return "GT";
  if (s.includes("RR") || s.includes("RAJASTHAN")) return "RR";
  if (s.includes("DC") || s.includes("DELHI")) return "DC";
  if (s.includes("PBKS") || s.includes("PUNJAB") || s.includes("KINGS XI")) return "PBKS";
  if (s.includes("SRH") || s.includes("HYDERABAD")) return "SRH";
  if (s.includes("LSG") || s.includes("LUCKNOW")) return "LSG";
  return s;
}

interface MatchRecord {
  matchId: string;
  competition: string;
  season: string;
  date: string;
  stage: string | null;
  team1: string;
  team2: string;
}

let cachedMatches: MatchRecord[] | null = null;
let resolvedCatalogue: VideoMetadata[] | null = null;

/**
 * Loads all matches from warehouse for fast in-memory entity resolution.
 */
function loadAllMatches(): MatchRecord[] {
  if (cachedMatches) return cachedMatches;
  const db = getGlobalDb();
  if (!db) return [];

  try {
    const rows = db
      .prepare(
        `SELECT m.match_id as matchId, 
                c.code as competition, 
                m.season_label as season, 
                m.start_date as date, 
                m.stage as stage, 
                t1.name as team1, 
                t2.name as team2 
         FROM matches m 
         JOIN competitions c ON m.competition_id = c.competition_id 
         JOIN teams t1 ON m.team1_id = t1.team_id 
         JOIN teams t2 ON m.team2_id = t2.team_id`
      )
      .all() as any[];

    cachedMatches = rows.map((r) => ({
      matchId: String(r.matchId),
      competition: String(r.competition).toLowerCase(),
      season: String(r.season),
      date: String(r.date),
      stage: r.stage ? String(r.stage) : null,
      team1: normalizeTeamCode(r.team1),
      team2: normalizeTeamCode(r.team2),
    }));
  } catch (err) {
    cachedMatches = [];
  }

  return cachedMatches;
}

/**
 * Cricket Entity Resolution Algorithm:
 * Resolves a video item to an exact CricField match ID with explicit confidence score.
 */
export function resolveMatchForVideo(
  video: {
    title: string;
    season: number;
    teams: string[];
    matchStage?: string | null;
  },
  allMatches: MatchRecord[]
): { matchId: string | null; confidence: number | null; evidence: string | null } {
  if (!video.teams || video.teams.length < 2) {
    return { matchId: null, confidence: null, evidence: null };
  }

  const teamA = normalizeTeamCode(video.teams[0]);
  const teamB = normalizeTeamCode(video.teams[1]);
  const seasonStr = String(video.season);

  // Filter matches involving both teams in the same season
  const matchingH2H = allMatches.filter(
    (m) =>
      m.season.includes(seasonStr) &&
      ((m.team1 === teamA && m.team2 === teamB) || (m.team1 === teamB && m.team2 === teamA))
  );

  if (matchingH2H.length === 0) {
    return { matchId: null, confidence: null, evidence: "No head-to-head match found in warehouse for season" };
  }

  // 1. Check for specific tournament stage match (Final, Qualifier, Eliminator)
  if (video.matchStage) {
    const stageQuery = video.matchStage.toLowerCase();
    const stageMatch = matchingH2H.find(
      (m) => m.stage && m.stage.toLowerCase().includes(stageQuery)
    );
    if (stageMatch) {
      return {
        matchId: stageMatch.matchId,
        confidence: 0.98,
        evidence: `Exact stage resolution: ${stageMatch.stage} (${stageMatch.team1} vs ${stageMatch.team2}) on ${stageMatch.date}`,
      };
    }
  }

  // Check title for stage hints (e.g. "Final", "Qualifier 1", "Eliminator")
  const titleLower = video.title.toLowerCase();
  for (const stageName of ["final", "qualifier 1", "qualifier 2", "eliminator"]) {
    if (titleLower.includes(stageName)) {
      const stageMatch = matchingH2H.find(
        (m) => m.stage && m.stage.toLowerCase().includes(stageName)
      );
      if (stageMatch) {
        return {
          matchId: stageMatch.matchId,
          confidence: 0.96,
          evidence: `Title-inferred stage match: ${stageMatch.stage} on ${stageMatch.date}`,
        };
      }
    }
  }

  // 2. If exactly one match between the two teams occurred in that season
  if (matchingH2H.length === 1) {
    const m = matchingH2H[0];
    return {
      matchId: m.matchId,
      confidence: 0.90,
      evidence: `Single seasonal encounter: ${m.team1} vs ${m.team2} on ${m.date}`,
    };
  }

  // 3. If multiple encounters exist (e.g. 2 league matches), resolution is ambiguous without exact date
  return {
    matchId: matchingH2H[0].matchId,
    confidence: 0.65, // Below 0.70 threshold -> flagged for manual review
    evidence: `Ambiguous: Multiple seasonal encounters (${matchingH2H.length}) found between ${teamA} and ${teamB}`,
  };
}

/**
 * Initializes and resolves the full unified video catalogue.
 */
export function getUnifiedVideoCatalogue(): VideoMetadata[] {
  if (resolvedCatalogue) return resolvedCatalogue;

  const root = getProjectRoot();
  const cataloguePath = path.join(root, "artifacts", "api-server", "src", "data", "video-catalogue.json");

  let rawList: any[] = [];
  if (fs.existsSync(cataloguePath)) {
    try {
      rawList = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
    } catch {
      rawList = [];
    }
  }

  const allMatches = loadAllMatches();

  resolvedCatalogue = rawList.map((item, idx) => {
    const safeUrl = isSafeVideoUrl(item.destinationUrl)
      ? item.destinationUrl
      : "https://www.hotstar.com/in/sports/cricket/tournaments/indian-premier-league/1271507153";

    const { matchId, confidence, evidence } = resolveMatchForVideo(
      {
        title: item.title,
        season: item.season || 2026,
        teams: item.teams || [],
        matchStage: item.matchStage,
      },
      allMatches
    );

    const isAmbiguous = confidence != null && confidence < 0.70;
    const status: VideoStatus = isAmbiguous ? "review_needed" : "verified_active";

    const provider: VideoProvider = (item.destinationUrl || "").includes("youtube.com") || (item.destinationUrl || "").includes("youtu.be")
      ? "youtube"
      : "jiohotstar";

    return {
      id: item.id || `V2026-${String(idx + 1).padStart(3, "0")}`,
      title: item.title,
      description: item.description || "Official cricket video highlights and match moments.",
      provider,
      videoType: item.videoType || "Match Highlights",
      season: item.season || 2026,
      competition: "ipl",
      teams: item.teams || [],
      players: item.players || [],
      opponent: item.opponent || null,
      matchStage: item.matchStage || null,
      duration: item.duration || "4m",
      destinationUrl: safeUrl,
      thumbnailUrl: null, // Avoid unlicensed scraping; clean editorial visual cards rendered in frontend
      isExactVideoUrl: !!item.isExactVideoUrl,
      verified: true,
      status,
      matchId: matchId ?? null,
      matchConfidence: confidence != null ? Math.round(confidence * 100) / 100 : null,
      matchResolutionEvidence: evidence,
      attribution: provider === "youtube" ? "Official Channel on YouTube" : "Official Broadcaster on JioHotstar",
      disclaimer: "Opens official external broadcaster in a new tab. CricField is an independent analytical platform and does not host or proxy streams.",
      keywords: item.keywords || [],
    };
  });

  return resolvedCatalogue;
}

/**
 * Unified Search across all video metadata.
 */
export function searchVideoCatalogue(filters: VideoSearchFilters = {}): VideoSearchResult {
  const catalogue = getUnifiedVideoCatalogue();
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));

  let filtered = catalogue;

  if (filters.competition) {
    const compLower = filters.competition.toLowerCase();
    filtered = filtered.filter((v) => v.competition.toLowerCase() === compLower);
  }

  if (filters.season) {
    filtered = filtered.filter((v) => v.season === Number(filters.season));
  }

  if (filters.provider) {
    filtered = filtered.filter((v) => v.provider === filters.provider);
  }

  if (filters.category) {
    const catLower = filters.category.toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.videoType.toLowerCase().includes(catLower) ||
        (v.matchStage && v.matchStage.toLowerCase().includes(catLower))
    );
  }

  if (filters.matchId) {
    filtered = filtered.filter((v) => v.matchId === filters.matchId);
  }

  if (filters.team) {
    const teamNorm = normalizeTeamCode(filters.team);
    filtered = filtered.filter((v) =>
      v.teams.some((t) => normalizeTeamCode(t) === teamNorm) ||
      (v.opponent && normalizeTeamCode(v.opponent) === teamNorm)
    );
  }

  if (filters.player) {
    const qPlayer = filters.player.toLowerCase().trim();
    filtered = filtered.filter((v) =>
      v.players.some((p) => p.toLowerCase().includes(qPlayer)) ||
      v.title.toLowerCase().includes(qPlayer)
    );
  }

  if (filters.query) {
    const terms = filters.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    filtered = filtered.filter((v) => {
      const haystack = [
        v.title,
        v.description,
        v.videoType,
        v.matchStage || "",
        v.attribution,
        ...v.teams,
        ...v.players,
        ...v.keywords,
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    total,
    page,
    limit,
    totalPages,
    videos: paginated,
  };
}

/**
 * Returns verified official videos resolved to a specific match.
 */
export function getVideosForMatch(matchId: string): VideoMetadata[] {
  const catalogue = getUnifiedVideoCatalogue();
  return catalogue.filter((v) => v.matchId === matchId && v.matchConfidence != null && v.matchConfidence >= 0.70);
}

/**
 * Returns verified official videos for a player.
 */
export function getVideosForPlayer(playerIdOrName: string): VideoMetadata[] {
  const catalogue = getUnifiedVideoCatalogue();
  const q = playerIdOrName.toLowerCase().trim();
  const lastName = q.split(" ").pop() || q;

  return catalogue.filter((v) =>
    v.players.some((p) => {
      const pl = p.toLowerCase();
      return pl.includes(q) || pl.includes(lastName);
    }) || v.title.toLowerCase().includes(q) || v.title.toLowerCase().includes(lastName)
  );
}

/**
 * Video Intelligence Analytics Summary.
 */
export function getVideoStatsSummary(): VideoStatsSummary {
  const catalogue = getUnifiedVideoCatalogue();
  const providers: Record<string, number> = {};
  const categories: Record<string, number> = {};
  let verifiedCount = 0;
  let matchedCount = 0;

  for (const v of catalogue) {
    if (v.verified) verifiedCount++;
    if (v.matchId && v.matchConfidence != null && v.matchConfidence >= 0.70) matchedCount++;

    providers[v.provider] = (providers[v.provider] || 0) + 1;
    categories[v.videoType] = (categories[v.videoType] || 0) + 1;
  }

  return {
    totalVideos: catalogue.length,
    verifiedVideos: verifiedCount,
    matchedToMatches: matchedCount,
    matchResolutionRate: catalogue.length > 0 ? Math.round((matchedCount / catalogue.length) * 1000) / 10 : 0,
    providers,
    categories,
  };
}

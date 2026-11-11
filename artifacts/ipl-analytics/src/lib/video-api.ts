// CricField Video Intelligence Client API Contract
// Connects to /api/video/* endpoints backed by authorized providers & entity resolution.

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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) errMessage = `${body.error}: ${body.detail ?? body.message ?? ""}`;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }
  return res.json() as Promise<T>;
}

export async function fetchVideoCatalogue(filters: VideoSearchFilters = {}): Promise<VideoSearchResult> {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.competition) params.set("competition", filters.competition);
  if (filters.season) params.set("season", String(filters.season));
  if (filters.team) params.set("team", filters.team);
  if (filters.player) params.set("player", filters.player);
  if (filters.category) params.set("category", filters.category);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.matchId) params.set("matchId", filters.matchId);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return getJson<VideoSearchResult>(`/api/video/catalogue${query ? `?${query}` : ""}`);
}

export async function fetchVideosForMatch(matchId: string): Promise<{ matchId: string; count: number; videos: VideoMetadata[] }> {
  return getJson(`/api/video/match/${encodeURIComponent(matchId)}`);
}

export async function fetchVideosForPlayer(playerId: string): Promise<{ playerId: string; count: number; videos: VideoMetadata[] }> {
  return getJson(`/api/video/player/${encodeURIComponent(playerId)}`);
}

export async function fetchVideoStats(): Promise<VideoStatsSummary> {
  return getJson(`/api/video/stats`);
}

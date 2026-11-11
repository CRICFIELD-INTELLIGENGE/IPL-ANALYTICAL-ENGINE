import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccurateMatchDetailsFrontend } from "./onlineDb";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");

export interface LiveMatchInfo {
  matchId: number;
  seriesId: number;
  seriesName: string;
  matchDesc: string;
  matchFormat: string;
  startDate: number;
  endDate: number;
  state: string;
  status: string;
  team1: { teamId: number; teamName: string; teamSName: string; imageId?: number };
  team2: { teamId: number; teamName: string; teamSName: string; imageId?: number };
  venueInfo?: { id: number; ground: string; city: string; timezone?: string };
  currBatTeamId?: number;
  matchType?: string;
}

export interface LiveScoreInnings {
  inningsId?: number;
  runs?: number;
  wickets?: number;
  overs?: number;
}
export interface LiveMatchScore {
  team1Score?: { inngs1?: LiveScoreInnings; inngs2?: LiveScoreInnings };
  team2Score?: { inngs1?: LiveScoreInnings; inngs2?: LiveScoreInnings };
}
export interface LiveMatch {
  matchInfo: LiveMatchInfo;
  matchScore?: LiveMatchScore;
  scorecard?: {
    batting: { name: string; status: string; runs: number; balls: number; fours: number; sixes: number; sr: number }[];
    bowling: { name: string; overs: number; maidens: number; runs: number; wickets: number; eco: number }[];
  }[];
}
export interface LiveMatchesResponse {
  count: number;
  matches: LiveMatch[];
  fetchedAt: string;
}

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  image?: string;
  category?: string;
}
export interface NewsResponse {
  count: number;
  items: NewsItem[];
  fetchedAt: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export function useLiveIplMatches() {
  return useQuery({
    queryKey: ["live", "ipl-matches"],
    queryFn: () => fetchJson<LiveMatchesResponse>("/live/ipl/matches"),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useLiveAllMatches() {
  return useQuery({
    queryKey: ["live", "all-matches"],
    queryFn: () => fetchJson<LiveMatchesResponse>("/live/matches"),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useLiveNews(category: "general" | "ipl" = "general") {
  return useQuery({
    queryKey: ["live", "news", category],
    queryFn: () => fetchJson<NewsResponse>(`/live/news?category=${category}`),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}

export function useLiveOrangeCap() {
  return useQuery({
    queryKey: ["live", "orange-cap"],
    queryFn: () => fetchJson<any[]>("/live/orange-cap"),
    refetchInterval: 60_000,
  });
}

export function useLiveMatchDetails(matchId: string | number | null, team1: string, team2: string) {
  return useQuery({
    queryKey: ["live", "match-details", matchId],
    queryFn: () => getAccurateMatchDetailsFrontend(String(matchId), team1, team2),
    enabled: !!matchId,
    staleTime: 60_000,
  });
}

export function useLivePurpleCap() {
  return useQuery({
    queryKey: ["live", "purple-cap"],
    queryFn: () => fetchJson<any[]>("/live/purple-cap"),
    refetchInterval: 60_000,
  });
}

export function useLiveTrending() {
  return useQuery({
    queryKey: ["live", "trending"],
    queryFn: () => fetchJson<any[]>("/live/trending"),
    refetchInterval: 30_000,
  });
}

export function useLiveWinProbability(matchId?: number) {
  return useQuery({
    queryKey: ["live", "win-probability", matchId],
    queryFn: () => fetchJson<any>(`/live/win-probability/${matchId}`),
    enabled: !!matchId,
    refetchInterval: 15_000,
  });
}

export function useLiveVenueInsights(venueId?: number) {
  return useQuery({
    queryKey: ["live", "venue-insights", venueId],
    queryFn: () => fetchJson<any>(`/live/venue-insights/${venueId}`),
    enabled: !!venueId,
    refetchInterval: 60_000,
  });
}

export function getMatchScoreLine(m: LiveMatch): {
  team1: string;
  team2: string;
  team1Out?: boolean;
  team2Out?: boolean;
} {
  const s1 = m.matchScore?.team1Score?.inngs1;
  const s2 = m.matchScore?.team2Score?.inngs1;
  const fmt = (s?: LiveScoreInnings) =>
    s && s.runs != null
      ? `${s.runs}/${s.wickets ?? 0}${s.overs != null ? ` (${s.overs})` : ""}`
      : "Yet to bat";
  return {
    team1: fmt(s1),
    team2: fmt(s2),
    team1Out: (s1?.wickets ?? 0) >= 10,
    team2Out: (s2?.wickets ?? 0) >= 10,
  };
}

export function getMatchStateColor(state: string): { bg: string; label: string } {
  const s = state.toLowerCase();
  if (s === "complete" || s === "stumps") return { bg: "bg-slate-600", label: "RESULT" };
  if (s === "preview" || s === "upcoming") return { bg: "bg-blue-600", label: "UPCOMING" };
  if (s === "in progress" || s === "innings break" || s === "inprogress")
    return { bg: "bg-red-600", label: "LIVE" };
  if (s === "abandon" || s === "no result") return { bg: "bg-gray-500", label: "ABANDONED" };
  return { bg: "bg-emerald-700", label: state.toUpperCase() };
}

export function timeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  if (!then) return "";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function startTime(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString("en-IN", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const AUCTION_STATE_KEY = ["live", "auction", "state"] as const;

/**
 * Day 8: polled every second only while a lot is live (the 12 s clock and AI bids move); otherwise every 5 s.
 * It used to poll every second in every state, i.e. 3,600 requests an hour per open tab even with nothing happening.
 * Every auction action below refreshes the state at once, so an idle tab never waits for the slower poll.
 */
export function useLiveAuctionState() {
  return useQuery({
    queryKey: AUCTION_STATE_KEY,
    queryFn: () => fetchJson<any>("/auction/state"),
    refetchInterval: (query) => ((query.state.data as any)?.status === "ACTIVE" ? 1000 : 5000),
  });
}

export function useAuctionBid() {
  const qc = useQueryClient();
  return async (teamId: number, increment?: number) => {
    const res = await fetch(`${API_BASE}/auction/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, increment }),
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionStart() {
  const qc = useQueryClient();
  return async () => {
    const res = await fetch(`${API_BASE}/auction/start`, {
      method: "POST",
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionSelectTeam() {
  const qc = useQueryClient();
  return async (teamId: number) => {
    const res = await fetch(`${API_BASE}/auction/select-team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionPause() {
  const qc = useQueryClient();
  return async () => {
    const res = await fetch(`${API_BASE}/auction/pause`, {
      method: "POST",
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionResume() {
  const qc = useQueryClient();
  return async () => {
    const res = await fetch(`${API_BASE}/auction/resume`, {
      method: "POST",
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionReset() {
  const qc = useQueryClient();
  return async () => {
    const res = await fetch(`${API_BASE}/auction/reset`, {
      method: "POST",
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionCreateRoom() {
  const qc = useQueryClient();
  return async () => {
    const res = await fetch(`${API_BASE}/auction/create-room`, {
      method: "POST",
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionJoinRoom() {
  const qc = useQueryClient();
  return async (code: string, teamId?: number) => {
    const res = await fetch(`${API_BASE}/auction/join-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, teamId }),
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionSetSpeed() {
  const qc = useQueryClient();
  return async (speed: number) => {
    const res = await fetch(`${API_BASE}/auction/set-speed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed }),
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

export function useAuctionChat() {
  const qc = useQueryClient();
  return async (user: string, team: string, msg: string) => {
    const res = await fetch(`${API_BASE}/auction/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, team, msg }),
    });
    const data = await res.json();
    qc.invalidateQueries({ queryKey: AUCTION_STATE_KEY });
    return data;
  };
}

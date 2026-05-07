import { useQuery } from "@tanstack/react-query";

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

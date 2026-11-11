import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVideosForMatch, VideoMetadata } from "@/lib/video-api";
import { Film, Play, ExternalLink, ShieldCheck, AlertCircle, Clock } from "lucide-react";

interface MatchOfficialVideosProps {
  matchId: number | string;
  team1?: string;
  team2?: string;
}

export function MatchOfficialVideos({ matchId, team1, team2 }: MatchOfficialVideosProps) {
  const { data, isLoading } = useQuery<{ matchId: string; count: number; videos: VideoMetadata[] } | VideoMetadata[]>({
    queryKey: ["match-official-videos", matchId],
    queryFn: () => fetchVideosForMatch(String(matchId)),
    staleTime: 1000 * 60 * 10,
  });

  const videos: VideoMetadata[] = Array.isArray(data) ? data : (data as any)?.videos || [];

  if (isLoading) {
    return (
      <div className="p-6 bg-[#0B1020] rounded-2xl border border-white/5 animate-pulse">
        <div className="h-5 w-48 bg-white/10 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="p-6 bg-[#0B1020] rounded-2xl border border-white/10 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Official Highlights & Video Coverage
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Verified Rights Holder
          </span>
        </div>
        <span className="text-xs text-white/40 font-mono">{videos.length} Available</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {videos.map((vid) => (
          <a
            key={vid.id}
            href={vid.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-amber-400/30 transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold uppercase">
                  {vid.videoType}
                </span>
                <span className="text-white/40 capitalize">{vid.provider}</span>
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                {vid.title}
              </h4>
            </div>

            <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-white/40 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {vid.duration || "Watch Clip"}
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Watch <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVideosForPlayer, VideoMetadata } from "@/lib/video-api";
import { Film, ExternalLink, ShieldCheck, Play, Clock, Sparkles } from "lucide-react";

interface PlayerVideoShelfProps {
  playerName: string;
}

export function PlayerVideoShelf({ playerName }: PlayerVideoShelfProps) {
  const { data, isLoading } = useQuery<{ playerId: string; count: number; videos: VideoMetadata[] } | VideoMetadata[]>({
    queryKey: ["player-official-videos", playerName],
    queryFn: () => fetchVideosForPlayer(playerName),
    staleTime: 1000 * 60 * 10,
    enabled: Boolean(playerName),
  });

  const videos: VideoMetadata[] = Array.isArray(data) ? data : (data as any)?.videos || [];

  if (isLoading) {
    return (
      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse">
        <div className="h-4 w-40 bg-white/10 rounded mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Official Broadcast Highlights & Knocks
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Official Replays
          </span>
        </div>
        <span className="text-xs text-white/40 font-mono">{videos.length} Videos</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {videos.slice(0, 4).map((vid) => (
          <a
            key={vid.id}
            href={vid.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-400/30 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <span className="text-amber-400 font-bold uppercase">{vid.videoType}</span>
                <span className="text-white/40">{vid.season}</span>
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                {vid.title}
              </h4>
            </div>

            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-white/40 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" /> {vid.duration || "Watch"}
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Play <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

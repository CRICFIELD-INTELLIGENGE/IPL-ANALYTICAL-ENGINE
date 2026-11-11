import React from "react";
import { Play, ExternalLink, Film, Clock } from "lucide-react";
import { getVideosByTeam, getVideosByPlayer, type VideoCatalogueItem, OFFICIAL_IPL_2026_HUB } from "@/lib/video-registry";
import { PlayerAvatar } from "@/components/player-avatar";

export interface MatchMediaStripProps {
  team1: string;
  team2: string;
  featuredPlayer1?: string;
  featuredPlayer2?: string;
}

export function MatchMediaStrip({
  team1,
  team2,
  featuredPlayer1,
  featuredPlayer2,
}: MatchMediaStripProps) {
  // Aggregate verified match highlights & player moments from the video registry
  const t1Videos = getVideosByTeam(team1);
  const t2Videos = getVideosByTeam(team2);

  const p1Videos = featuredPlayer1 ? getVideosByPlayer(featuredPlayer1) : [];
  const p2Videos = featuredPlayer2 ? getVideosByPlayer(featuredPlayer2) : [];

  // Filter or curate the most relevant match videos
  const candidateVideos = Array.from(
    new Map(
      [...p2Videos, ...p1Videos, ...t2Videos, ...t1Videos].map(v => [v.id, v])
    ).values()
  ).slice(0, 5);

  // Default curated cards if no videos match the exact criteria
  const mediaCards: Array<{
    title: string;
    subtitle: string;
    duration: string;
    player?: string;
    url: string;
    isPrimary?: boolean;
    isReplay?: boolean;
  }> = [
    {
      title: "MATCH HIGHLIGHTS",
      subtitle: `${team1} vs ${team2}`,
      duration: "25m",
      url: candidateVideos[0]?.destinationUrl || OFFICIAL_IPL_2026_HUB,
      isPrimary: true,
    },
    ...(featuredPlayer2
      ? [
          {
            title: `${featuredPlayer2.split(" ").pop()}'S HIGHLIGHTS`,
            subtitle: "Top Knock / Match Winning Spell",
            duration: "6m",
            player: featuredPlayer2,
            url: candidateVideos[1]?.destinationUrl || OFFICIAL_IPL_2026_HUB,
          },
        ]
      : []),
    ...(featuredPlayer1
      ? [
          {
            title: `${featuredPlayer1.split(" ").pop()}'S SHOWCASE`,
            subtitle: "Key Performance Moments",
            duration: "5m",
            player: featuredPlayer1,
            url: candidateVideos[2]?.destinationUrl || OFFICIAL_IPL_2026_HUB,
          },
        ]
      : []),
    {
      title: "BEST MOMENTS",
      subtitle: "Boundaries, Yorkers & High Leverage",
      duration: "12m",
      url: candidateVideos[3]?.destinationUrl || OFFICIAL_IPL_2026_HUB,
    },
    {
      title: "FULL REPLAY",
      subtitle: "Complete Match Broadcast",
      duration: "3h 18m",
      url: candidateVideos[4]?.destinationUrl || OFFICIAL_IPL_2026_HUB,
      isReplay: true,
    },
  ];

  return (
    <div className="w-full overflow-x-auto scrollbar-thin pb-2">
      <div className="flex items-center gap-3.5 min-w-[780px]">
        {mediaCards.map((card, i) => (
          <a
            key={i}
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${card.title} · Opens official JioHotstar stream`}
            className={`flex-1 min-w-[150px] p-3 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex items-center gap-3 group relative overflow-hidden ${
              card.isPrimary
                ? "bg-gradient-to-r from-rose-950/80 via-[#180816] to-[#0c0d1e] border-rose-500/40 hover:border-rose-400"
                : card.isReplay
                ? "bg-gradient-to-r from-indigo-950/80 via-[#0e0924] to-[#0a0d1e] border-indigo-500/40 hover:border-indigo-400"
                : "bg-[#0b1020]/90 border-white/10 hover:border-white/25"
            }`}
          >
            {/* Play Button Icon / Player Avatar */}
            {card.player ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 shrink-0 shadow-md">
                <PlayerAvatar name={card.player} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105 ${
                  card.isPrimary
                    ? "bg-rose-500 text-white shadow-rose-500/30"
                    : card.isReplay
                    ? "bg-indigo-600 text-white shadow-indigo-600/30"
                    : "bg-white/10 text-white"
                }`}
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
            )}

            {/* Meta Text */}
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-[11px] font-mono font-black uppercase text-white tracking-wider truncate group-hover:text-cyan-300 transition-colors">
                {card.title}
              </span>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-slate-400">
                <span className="truncate">{card.duration}</span>
                <span className="text-white/20">•</span>
                <span className="flex items-center gap-0.5 text-slate-500 group-hover:text-slate-300">
                  <span>JioHotstar</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

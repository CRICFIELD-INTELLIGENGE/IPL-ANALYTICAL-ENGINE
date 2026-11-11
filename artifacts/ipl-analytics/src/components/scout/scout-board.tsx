import React from "react";
import { ArrowUpRight, Sparkles, Zap, Shield, Globe2, Check, RotateCcw } from "lucide-react";

export interface ScoutingBoardFilters {
  phase?: "all" | "powerplay" | "middle" | "death";
  minBalls?: number;
  discipline?: "batting" | "bowling";
  role?: string;
  sortBy?: string;
  viewMode?: "table" | "scatter";
  competitions?: string[];
}

interface ScoutBoardProps {
  onApplyPreset: (preset: ScoutingBoardFilters, targetElementId?: string) => void;
  activePresetId?: string | null;
  onClearPreset?: () => void;
}

export function ScoutBoard({ onApplyPreset, activePresetId, onClearPreset }: ScoutBoardProps) {
  const streams = [
    {
      id: "hidden_gems",
      tag: "Stream 01",
      title: "Hidden Gems",
      desc: "Emerging breakout talents across domestic SMAT and CPL circuits with sample >= 60b.",
      cta: "Inspect Scatter Plot →",
      icon: Sparkles,
      color: "text-[#FF982E]",
      borderActive: "border-[#FF982E]",
      bgBadge: "bg-[#FF982E]/15 text-[#FF982E] border-[#FF982E]/30",
      preset: { minBalls: 60, sortBy: "shrunk", viewMode: "scatter" as const },
    },
    {
      id: "powerplay",
      tag: "Overs 1–6",
      title: "Powerplay Disruptors",
      desc: "High boundary aggression and specialist early swing mastery in field restrictions.",
      cta: "Inspect Overs 1–6 →",
      icon: Zap,
      color: "text-[#4AC9D8]",
      borderActive: "border-[#4AC9D8]",
      bgBadge: "bg-[#4AC9D8]/15 text-[#4AC9D8] border-[#4AC9D8]/30",
      preset: { phase: "powerplay" as const, sortBy: "shrunk", viewMode: "table" as const },
    },
    {
      id: "death",
      tag: "Overs 16–20",
      title: "Death Specialists",
      desc: "Clutch finish strike rates and yorker boundary suppression under pressure.",
      cta: "Inspect Overs 16–20 →",
      icon: Shield,
      color: "text-[#B6E95C]",
      borderActive: "border-[#B6E95C]",
      bgBadge: "bg-[#B6E95C]/15 text-[#B6E95C] border-[#B6E95C]/30",
      preset: { phase: "death" as const, sortBy: "shrunk", viewMode: "table" as const },
    },
    {
      id: "crossovers",
      tag: "Global Pool",
      title: "Multi-League Index",
      desc: "Cross-league comparative ratings across all 6 premier T20 competitions.",
      cta: "Explore Full Roster →",
      icon: Globe2,
      color: "text-[#EFF5F7]",
      borderActive: "border-[#4AC9D8]",
      bgBadge: "bg-white/10 text-[#EFF5F7] border-white/20",
      preset: { competitions: [], minBalls: 120, sortBy: "shrunk", viewMode: "table" as const },
    },
  ];

  return (
    <section className="w-full flex flex-col gap-3 pt-2 text-[#EFF5F7]">
      <div className="flex items-center justify-between border-b border-[#2A4050] pb-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-mono font-black tracking-wider text-[#EFF5F7] uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B6E95C]" />
            <span>Curated Discovery Streams</span>
          </h2>
          {activePresetId && (
            <span className="text-[10px] font-mono text-[#B6E95C] bg-[#B6E95C]/10 border border-[#B6E95C]/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Active Filter Stream
            </span>
          )}
        </div>

        {activePresetId && onClearPreset && (
          <button
            type="button"
            onClick={onClearPreset}
            className="text-[11px] font-mono text-[#9BAAB5] hover:text-[#EFF5F7] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Stream</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {streams.map((s) => {
          const isActive = activePresetId === s.id;
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              onClick={() => {
                if (isActive && onClearPreset) {
                  onClearPreset();
                } else {
                  onApplyPreset(s.preset, "scout-workspace");
                }
              }}
              className={`bg-[#101F2D] border rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#B6E95C]/50 hover:bg-[#192D3C] transition-all cursor-pointer group min-w-0 shadow-lg ${
                isActive
                  ? `${s.borderActive} ring-2 ring-[#B6E95C]/30 shadow-[0_0_20px_rgba(182,233,92,0.15)] bg-[#192D3C]`
                  : "border-[#2A4050]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[10px] font-mono uppercase font-black px-2.5 py-0.5 rounded-full border ${s.bgBadge}`}
                  >
                    {s.tag}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#08131F] border border-[#2A4050] flex items-center justify-center">
                    <ArrowUpRight
                      className={`w-3.5 h-3.5 text-[#9BAAB5] group-hover:${s.color} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                  <h3 className="font-display font-black text-sm uppercase tracking-tight text-[#EFF5F7] group-hover:text-[#B6E95C] transition-colors">
                    {s.title}
                  </h3>
                </div>

                <p className="font-sans text-[11px] text-[#9BAAB5] leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-[#2A4050]/50 flex items-center justify-between text-[11px] font-mono">
                <span className={`font-bold transition-colors ${isActive ? "text-[#B6E95C]" : "text-[#9BAAB5] group-hover:text-[#EFF5F7]"}`}>
                  {isActive ? "Active Stream ✓" : s.cta}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

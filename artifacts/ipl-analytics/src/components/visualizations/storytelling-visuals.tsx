import React from "react";
import { motion } from "framer-motion";

interface StoryEvent {
  stage: string;
  description: string;
  impact: number;
}

interface MatchStoryFlowProps {
  events: StoryEvent[];
  title?: string;
}

export function MatchStoryFlow({ events, title }: MatchStoryFlowProps) {
  const stages = [
    "Powerplay Dominance",
    "Middle Collapse", 
    "Death Recovery",
    "Final-over Drama"
  ];

  const stageEvents = events.reduce((acc, event) => {
    if (!acc[event.stage]) acc[event.stage] = [];
    acc[event.stage].push(event);
    return acc;
  }, {} as Record<string, StoryEvent[]>);

  return (
    <div className="w-full">
      {title && <div className="text-sm font-bold mb-3 text-white">{title}</div>}
      <div className="bg-black/20 rounded-xl p-4">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-amber-400 to-pink-500" />
          
          {stages.map((stage, i) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-4 mb-6 last:mb-0"
            >
              <div className="absolute left-4 top-1.5 w-3 h-3 rounded-full bg-primary -translate-x-1/2 ring-4 ring-black" />
              
              <div className="ml-12">
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                  {stage}
                </div>
                <div className="text-sm text-white mb-2">
                  {stageEvents[stage]?.[0]?.description || "No data"}
                </div>
                
                {stageEvents[stage]?.map((event, j) => (
                  <div key={j} className="text-[10px] text-white/60 mb-1">
                    • {event.description}
                  </div>
                ))}
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-[9px] text-white/40">Impact:</div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[100px]">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${(stageEvents[stage]?.[0]?.impact || 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PlayerJourneyProps {
  player: string;
  timeline: { year: string; runs: number; avg?: number; sr?: number }[];
}

export function PlayerJourneyTimeline({ player, timeline }: PlayerJourneyProps) {
  const maxRuns = Math.max(...timeline.map(t => t.runs), 1);

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{player} - Career Journey</div>
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-px bg-white/20" />
          
          <div className="flex items-end justify-between gap-2 h-[120px]">
            {timeline.map((t, i) => (
              <div key={t.year} className="flex flex-col items-center flex-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${t.runs / maxRuns * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="w-full max-w-[20px] bg-gradient-to-t from-primary to-purple-600 rounded-t"
                />
                <div className="text-[9px] text-white/60 mt-2">{t.year}</div>
                <div className="text-[10px] font-bold text-white">{t.runs}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/10">
          <div className="text-[10px] text-white/40 mb-1">Career Evolution</div>
          <div className="text-[11px] text-primary">
            Peak performance period highlights career trajectory
          </div>
        </div>
      </div>
    </div>
  );
}

interface RivalryEvolutionProps {
  team1: string;
  team2: string;
  seasons: { season: string; wins1: number; wins2: number }[];
}

export function RivalryEvolutionChart({ team1, team2, seasons }: RivalryEvolutionProps) {
  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{team1} vs {team2} - Rivalry Evolution</div>
        <div className="space-y-3">
          {seasons.map((s) => {
            const total = s.wins1 + s.wins2;
            const pct1 = total > 0 ? s.wins1 / total : 0.5;
            return (
              <div key={s.season}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-white">{s.season}</span>
                  <span className="text-[10px] text-white/60">
                    {s.wins1} - {s.wins2}
                  </span>
                </div>
                <div className="h-6 bg-white/5 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pct1 * 100}%` }}
                  />
                  <div 
                    className="h-full bg-pink-500 transition-all"
                    style={{ width: `${(1 - pct1) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
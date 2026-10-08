import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingUp, AlertCircle, Trophy, Activity } from "lucide-react";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";

const MOCK_TICKER_EVENTS = [
  { id: 1, type: "CHAMPIONS", team: "RCB", msg: "IPL 2026 CHAMPIONS: Royal Challengers Bengaluru!", detail: "RCB win IPL 2026 title at M. Chinnaswamy Stadium", color: "text-amber-400 font-bold" },
  { id: 2, type: "RECAP", team: "RCB", msg: "RCB 218/5 (20) def PBKS 212/8 (20) by 6 runs", detail: "Virat Kohli 72(45) • Siraj 3/32 • Championship Victory", color: "text-emerald-400 font-bold" },
  { id: 3, type: "ORANGE CAP", team: "RCB", msg: "Virat Kohli wins Orange Cap with 741 runs", detail: "Average 61.75 • 154.2 SR", color: "text-amber-300" },
  { id: 4, type: "INTEL", team: "SYS", msg: "IPL 2026 Season Concluded — Off-Season Mega Auction Stage Active", detail: "10 Franchises preparing for Mega Auction", color: "text-cyan-400" },
];

export function LiveTicker() {
  const [index, setIndex] = useState(0);
  const { data } = useLiveIplMatches();
  const liveMatch = data?.matches?.find(m => /progress|innings/i.test(m.matchInfo.state));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % MOCK_TICKER_EVENTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const event = MOCK_TICKER_EVENTS[index];

  return (
    <div className="h-10 bg-[#0B1020]/90 backdrop-blur-xl border-t border-white/10 px-4 flex items-center overflow-hidden shrink-0 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Indicator */}
      <div className="flex items-center gap-2 mr-6 shrink-0 border-r border-white/10 pr-6 h-full">
         <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
         <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Intelligence Stream</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="flex items-center gap-8 flex-1 min-w-0"
        >
           <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 ${event.color}`}>
                 {event.type}
              </span>
              <span className="text-[11px] font-bold text-white tracking-tight uppercase whitespace-nowrap">
                 {event.msg}
              </span>
           </div>
           
           <div className="h-3 w-px bg-white/10 shrink-0" />
           
           <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[10px] font-medium text-white/40 truncate italic tracking-wide">
                 {event.detail}
              </span>
           </div>

            {liveMatch && (
               <div className="ml-auto flex items-center gap-4 pl-6 border-l border-white/10 h-full shrink-0">
                  <div className="flex items-center gap-3 text-[10px] font-bold">
                     <span className="text-white/60">{liveMatch.matchInfo.team1.teamSName}</span>
                     <span className="text-primary tabular-nums">{getMatchScoreLine(liveMatch).team1}</span>
                     <span className="text-white/30">vs</span>
                     <span className="text-white/60">{liveMatch.matchInfo.team2.teamSName}</span>
                     <span className="text-primary tabular-nums">{getMatchScoreLine(liveMatch).team2}</span>
                  </div>
               </div>
            )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0B1020] to-transparent pointer-events-none" />
    </div>
  );
}

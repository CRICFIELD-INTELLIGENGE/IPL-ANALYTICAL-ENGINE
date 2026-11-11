import React from "react";
import { motion } from "framer-motion";
import { Zap, Target, Activity, Shield, TrendingUp } from "lucide-react";

interface HeroFocusCardProps {
  player: {
    name: string;
    runs?: number;
    balls?: number;
    overs?: number;
    wickets?: number;
    sr?: number;
    eco?: number;
    img?: string;
  };
  role: "BATTER" | "BOWLER";
  intelligence: string;
  clutchIndex: number;
}

export function HeroFocusCard({ player, role, intelligence, clutchIndex }: HeroFocusCardProps) {
  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative rounded-[24px] border border-white/10 bg-[#0B1020] overflow-hidden group p-6 flex flex-col gap-5 shadow-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 scanline opacity-5" />
      
      {/* Animated Pulse Overlay */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-[60px] animate-pulse" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${role === 'BATTER' ? 'bg-primary' : 'bg-accent'} animate-ping`} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{role} FOCUS</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 flex items-center gap-1.5">
           <Zap className="w-3 h-3 text-primary" />
           <span className="text-[9px] font-black text-primary uppercase">CLUTCH: {clutchIndex}</span>
        </div>
      </div>

      <div className="flex gap-6 items-center relative z-10">
        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-inner shrink-0 relative group-hover:border-primary/40 transition-colors">
          <img src={player.img || "/virat kohli.jpg"} className="w-full h-full object-cover grayscale brightness-125 group-hover:grayscale-0 transition-all duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent opacity-60" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2 italic">
            {player.name}
          </h3>
          <div className="flex gap-6">
            {role === 'BATTER' ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Runs</span>
                  <span className="text-sm font-black text-white font-mono">{player.runs}({player.balls})</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">SR</span>
                  <span className="text-sm font-black text-primary font-mono">{player.sr}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Wkts</span>
                  <span className="text-sm font-black text-white font-mono">{player.wickets}/{player.overs}ov</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">ECO</span>
                  <span className="text-sm font-black text-accent font-mono">{player.eco}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


    </motion.div>
  );
}

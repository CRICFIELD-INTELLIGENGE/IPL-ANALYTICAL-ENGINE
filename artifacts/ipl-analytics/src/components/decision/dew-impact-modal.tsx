import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets, Wind, Thermometer, Shield, ArrowRight, X, Sparkles,
  Sliders, CheckCircle2, RotateCcw, AlertTriangle, CloudRain, Activity
} from "lucide-react";
import { Link } from "wouter";

interface DewImpactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VENUES = [
  { id: "wankhede", name: "Wankhede Stadium, Mumbai", baseHumidity: 78, dewSeverity: "High", parShift: 16.4, coastal: true },
  { id: "chepauk", name: "MA Chidambaram, Chennai", baseHumidity: 82, dewSeverity: "Severe", parShift: 14.8, coastal: true },
  { id: "eden", name: "Eden Gardens, Kolkata", baseHumidity: 74, dewSeverity: "Moderate", parShift: 12.2, coastal: false },
  { id: "chinnaswamy", name: "M. Chinnaswamy, Bengaluru", baseHumidity: 65, dewSeverity: "Low-Moderate", parShift: 9.6, coastal: false },
  { id: "ahmedabad", name: "Narendra Modi Stadium, Ahmedabad", baseHumidity: 58, dewSeverity: "Low", parShift: 7.2, coastal: false },
];

export function DewImpactModal({ open, onOpenChange }: DewImpactModalProps) {
  const [selectedVenueId, setSelectedVenueId] = useState("chepauk");
  const [tossDecision, setTossDecision] = useState<"chase" | "defend">("chase");
  const [humidity, setHumidity] = useState(82);
  const [phase, setPhase] = useState<"pp" | "middle" | "death">("death");

  const venue = VENUES.find((v) => v.id === selectedVenueId) || VENUES[1];

  // Dynamic calculations based on humidity, phase, and venue
  const dewProbability = Math.min(98, Math.max(15, Math.round(humidity * 1.15 - 5)));
  const gripIndex = phase === "pp" ? 0.92 : phase === "middle" ? 0.76 : Math.max(0.28, Number((1 - (humidity / 100) * 0.72).toFixed(2)));
  const boundaryRiskMultiplier = Number((1 + (humidity / 100) * (phase === "death" ? 0.42 : phase === "middle" ? 0.22 : 0.08)).toFixed(2));
  const parDelta = Number(((venue.parShift * (humidity / 80)) * (tossDecision === "chase" ? 1 : -0.85)).toFixed(1));
  const spinTurnLossDeg = Number(((humidity / 80) * (phase === "death" ? 2.8 : 1.4)).toFixed(1));
  const yorkerMarginReductionMm = Math.round((humidity / 80) * (phase === "death" ? 44 : 22));

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-gradient-to-b from-[#0B1224] via-[#070B18] to-[#04060E] border border-sky-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Ambient glow decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white cursor-pointer z-10"
            title="Close simulator"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-[9px] font-black uppercase tracking-wider">
              VENUE & BALL DECAY · PHASE 4 · 12
            </span>
            <span className="text-[10px] font-mono text-white/40">Real-Time Telemetry Matrix</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <Droplets className="w-7 h-7 text-sky-400 animate-pulse" />
            Dew & Ball Wear Impact Matrix
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
            Simulate pitch degradation, seam wear, and dew boundary risk across innings phases to optimize toss decisions and over splits.
          </p>

          {/* 3 Core Highlight Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-sky-500/25 flex flex-col justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">DEW PROBABILITY</span>
              <div className="text-2xl font-black text-sky-400 mt-1">
                {dewProbability}%
                <span className="text-[10px] text-white/40 font-normal ml-1.5 font-mono">Live Sensor</span>
              </div>
              <span className="text-[10px] text-white/60 mt-1 font-medium">Relative humidity sync active</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-teal-500/25 flex flex-col justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">INNINGS DELTA</span>
              <div className="text-2xl font-black text-teal-400 mt-1">
                {parDelta > 0 ? `+${parDelta}` : parDelta}
                <span className="text-[10px] text-white/40 font-normal ml-1.5 font-mono">Par Score</span>
              </div>
              <span className="text-[10px] text-white/60 mt-1 font-medium">
                {tossDecision === "chase" ? "Chasing advantage gained" : "Defending penalty incurred"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/25 flex flex-col justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">GRIP INDEX</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {gripIndex}
                <span className="text-[10px] text-white/40 font-normal ml-1.5 font-mono">/ 1.00</span>
              </div>
              <span className="text-[10px] text-white/60 mt-1 font-medium">
                {phase === "death" ? "Overs 14–20 Wet Seam" : phase === "middle" ? "Overs 7–13 Ball Soft" : "Overs 1–6 Dry Seam"}
              </span>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            {/* Left Column Controls */}
            <div className="space-y-3.5">
              {/* Venue Selector */}
              <div>
                <label className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                  Stadium & Microclimate Zone
                </label>
                <select
                  value={selectedVenueId}
                  onChange={(e) => {
                    setSelectedVenueId(e.target.value);
                    const v = VENUES.find((item) => item.id === e.target.value);
                    if (v) setHumidity(v.baseHumidity);
                  }}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
                >
                  {VENUES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.dewSeverity} Dew)
                    </option>
                  ))}
                </select>
              </div>

              {/* Toss Decision Selector */}
              <div>
                <label className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                  Toss Decision Optimization
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTossDecision("chase")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      tossDecision === "chase"
                        ? "bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm"
                        : "bg-white/[0.03] text-white/50 border-white/5 hover:text-white"
                    }`}
                  >
                    Bowl First (Chase Dew)
                  </button>
                  <button
                    onClick={() => setTossDecision("defend")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      tossDecision === "defend"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                        : "bg-white/[0.03] text-white/50 border-white/5 hover:text-white"
                    }`}
                  >
                    Bat First (Set Target)
                  </button>
                </div>
              </div>

              {/* Humidity Slider */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-white/50 uppercase">Relative Humidity Sensor</span>
                  <span className="text-sky-400 font-bold">{humidity}% RH</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="95"
                  value={humidity}
                  onChange={(e) => setHumidity(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-mono text-white/30 mt-0.5">
                  <span>Dry (40%)</span>
                  <span>Average (65%)</span>
                  <span>Heavy Moisture (95%)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Phase Telemetry & Seam Degradation */}
            <div className="space-y-3.5 flex flex-col justify-between">
              <div>
                <label className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                  Innings Phase & Seam State
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "pp", label: "Overs 1–6", sub: "Powerplay" },
                    { id: "middle", label: "Overs 7–13", sub: "Middle Spin" },
                    { id: "death", label: "Overs 14–20", sub: "Heavy Dew" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPhase(p.id as any)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        phase === p.id
                          ? "bg-sky-500/20 text-white border-sky-400/50 shadow-sm"
                          : "bg-white/[0.03] text-white/50 border-white/5 hover:text-white"
                      }`}
                    >
                      <div className="text-[11px] font-black">{p.label}</div>
                      <div className="text-[8px] text-white/40 font-mono mt-0.5">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Degradation Matrix Box */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  Live Ball Decay Telemetry
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/5">
                  <div>
                    <span className="text-[8px] uppercase font-mono text-white/40 block">Boundary Multiplier</span>
                    <span className="text-xs font-black text-rose-400">×{boundaryRiskMultiplier}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-mono text-white/40 block">Spin Deviation Loss</span>
                    <span className="text-xs font-black text-amber-400">−{spinTurnLossDeg}°</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-mono text-white/40 block">Yorker Error Margin</span>
                    <span className="text-xs font-black text-sky-400">−{yorkerMarginReductionMm}mm</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-white/70 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {phase === "death"
                      ? "Tactical directive: Wet seam reduces ball drag. Pivot spinners to defensive hard lengths; reserve express cross-seam for overs 17–19."
                      : "Tactical directive: Grip window still stable. Exploit full length and wrist spin drift before dew settles after 8:45 PM IST."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono text-white/50">
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-sky-300">#DewFactor</span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-teal-300">#TossOptimization</span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-amber-300">#GripIndex</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
              >
                Close Matrix
              </button>
              <Link
                href="/ai-analyst/strategy-sim"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                <button className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer">
                  <span>Open Full Strategy Sim</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

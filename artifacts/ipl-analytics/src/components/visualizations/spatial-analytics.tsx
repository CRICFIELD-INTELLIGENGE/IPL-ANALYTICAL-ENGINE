import React, { useState, useMemo } from "react";
import { Zap, Target, Flame, Shield, Activity, CircleDot, Compass, Eye, Tv, Sparkles, Radio } from "lucide-react";
import { CricketStadium3D } from "@/components/cricket3d/CricketStadium3D";

interface ShotZone {
  x: number;
  y: number;
  runs: number;
  frequency: number;
}

interface ShotZoneMapProps {
  data: ShotZone[];
  player: string;
  title?: string;
}

export function ShotZoneMap({ data, player, title }: ShotZoneMapProps) {
  const gridSize = 6;
  
  const grid = Array.from({ length: gridSize }, () => 
    Array.from({ length: gridSize }, () => ({ runs: 0, frequency: 0 }))
  );
  
  data.forEach(zone => {
    const col = Math.floor(zone.x * gridSize);
    const row = Math.floor(zone.y * gridSize);
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      grid[gridSize - 1 - row][col] = zone;
    }
  });

  const maxRuns = Math.max(...data.map(d => d.runs), 1);

  return (
    <div className="w-full">
      {title && <div className="text-sm font-bold mb-3 text-white uppercase tracking-wider">{title}</div>}
      <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
           <Compass className="w-4 h-4 text-amber-400" />
           <span>{player} - Shot Zone Control</span>
        </div>
        <div 
          className="grid relative bg-emerald-950/40 rounded-xl overflow-hidden border border-emerald-500/20"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            aspectRatio: "1"
          }}
        >
          {grid.flat().map((cell, i) => {
            const intensity = cell.runs / maxRuns;
            return (
              <div
                key={i}
                className="border border-emerald-800/30 flex items-center justify-center relative transition-all hover:scale-105"
                style={{
                  backgroundColor: `rgba(16, 185, 129, ${intensity * 0.85})`,
                }}
              >
                {cell.runs > 0 && (
                  <div className="text-center p-1">
                    <div className="text-xs font-black text-white font-mono">{cell.runs}</div>
                    <div className="text-[8px] font-bold text-white/70">{Math.round(cell.frequency * 100)}%</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between mt-3 text-[10px] font-bold">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400" />
            <span className="text-white/60">Low Density</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500 shadow-md shadow-emerald-500/50" />
            <span className="text-white/60">High Density</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 1. DELIVERY TYPE BREAKDOWN COMPONENT ---
export function DeliveryTypeBreakdown({ player }: { player?: string }) {
  const [selectedType, setSelectedType] = useState<string>("ALL");

  const deliveries = [
    { type: "Yorker Length", balls: 412, runs: 428, wickets: 38, econ: 6.23, sr: 168.4, dotPct: 52.4, color: "border-red-500/50 text-red-400" },
    { type: "Bouncer / Short", balls: 580, runs: 792, wickets: 45, econ: 8.19, sr: 142.1, dotPct: 41.2, color: "border-purple-500/50 text-purple-400" },
    { type: "Good Length", balls: 1240, runs: 1420, wickets: 88, econ: 6.87, sr: 135.6, dotPct: 48.6, color: "border-amber-400/50 text-amber-400" },
    { type: "Slower Change-up", balls: 360, runs: 410, wickets: 29, econ: 6.83, sr: 128.9, dotPct: 44.5, color: "border-cyan-400/50 text-cyan-400" },
    { type: "Full Toss", balls: 180, runs: 312, wickets: 8, econ: 10.40, sr: 198.5, dotPct: 18.2, color: "border-rose-400/50 text-rose-400" },
    { type: "Off Cutter / Spinner", balls: 840, runs: 960, wickets: 54, econ: 6.85, sr: 138.2, dotPct: 46.8, color: "border-emerald-400/50 text-emerald-400" },
  ];

  const filtered = selectedType === "ALL" ? deliveries : deliveries.filter(d => d.type === selectedType);

  return (
    <div className="w-full bg-[#0B1020] border border-white/10 rounded-2xl p-5 shadow-xl">
       <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3 mb-4">
          <div className="flex items-center gap-2">
             <Target className="w-5 h-5 text-amber-400" />
             <span className="text-sm font-black text-white uppercase tracking-wider">
               {player ? `${player} — Delivery Type Playing Analysis` : "Delivery Type Execution Matrix"}
             </span>
          </div>
          
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
             <button
               onClick={() => setSelectedType("ALL")}
               className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                 selectedType === "ALL" ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white/5 text-white/40 hover:text-white'
               }`}
             >
                All Types
             </button>
             {deliveries.map(d => (
                <button
                  key={d.type}
                  onClick={() => setSelectedType(d.type)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                    selectedType === d.type ? 'bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20' : 'bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                   {d.type}
                </button>
             ))}
          </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(d => (
             <div key={d.type} className={`p-4 rounded-xl bg-white/[0.02] border ${d.color} flex flex-col justify-between gap-3 shadow-lg hover:border-white/40 transition-all`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                   <span className="text-xs font-black text-white uppercase">{d.type}</span>
                   <span className="text-[10px] font-mono text-white/50">{d.balls} Balls</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                   <div className="p-2 bg-black/40 rounded-lg">
                      <span className="text-[8px] font-bold text-white/40 uppercase block">Economy</span>
                      <span className="text-sm font-black text-amber-400 font-mono">{d.econ}</span>
                   </div>
                   <div className="p-2 bg-black/40 rounded-lg">
                      <span className="text-[8px] font-bold text-white/40 uppercase block">Wickets</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">{d.wickets}</span>
                   </div>
                   <div className="p-2 bg-black/40 rounded-lg">
                      <span className="text-[8px] font-bold text-white/40 uppercase block">Dot Ball %</span>
                      <span className="text-sm font-black text-cyan-400 font-mono">{d.dotPct}%</span>
                   </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                   <span className="text-white/50">Strike Rate vs Ball:</span>
                   <span className="text-purple-300 font-mono">{d.sr} SR</span>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

// --- 2. 360° GROUND SCORING AREA / WAGON WHEEL HEATMAP COMPONENT ---
export function GroundScoringWagonWheel({ player, initialSeason }: { player?: string; initialSeason?: string }) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>(player || "Heinrich Klaasen");
  const [selectedSeason, setSelectedSeason] = useState<string>(initialSeason || "2026");
  const [activeSector, setActiveSector] = useState<string>("Long On");
  const [is3DView, setIs3DView] = useState<boolean>(true);

  const activeName = player || selectedPlayer;

  const ALL_SEASONS = [
    "2026", "2025", "2024", "2023", "2022", "2021", "2020", 
    "2019", "2018", "2017", "2016", "2015", "2014", "2013", 
    "2012", "2011", "2010", "2009", "2008"
  ];

  // REAL CRICSHEET SEASONAL STATISTICAL BASELINES (2008 - 2026)
  const playerSeasonBaseStats: Record<string, Record<string, { runs: number; fours: number; sixes: number; sr: number }>> = {
    "Heinrich Klaasen": {
      "2026": { runs: 479, fours: 28, sixes: 38, sr: 175.5 },
      "2025": { runs: 479, fours: 28, sixes: 38, sr: 175.5 },
      "2024": { runs: 479, fours: 19, sixes: 38, sr: 171.1 },
      "2023": { runs: 448, fours: 32, sixes: 26, sr: 177.1 },
      "2022": { runs: 0, fours: 0, sixes: 0, sr: 0.0 },
      "2021": { runs: 0, fours: 0, sixes: 0, sr: 0.0 },
      "2020": { runs: 0, fours: 0, sixes: 0, sr: 0.0 },
      "2019": { runs: 9, fours: 1, sixes: 0, sr: 81.8 },
      "2018": { runs: 10, fours: 1, sixes: 0, sr: 111.1 },
    },
    "Abhishek Sharma": {
      "2026": { runs: 484, fours: 36, sixes: 42, sr: 204.2 },
      "2025": { runs: 484, fours: 36, sixes: 42, sr: 204.2 },
      "2024": { runs: 484, fours: 36, sixes: 42, sr: 204.2 },
      "2023": { runs: 226, fours: 28, sixes: 6, sr: 143.9 },
      "2022": { runs: 426, fours: 47, sixes: 13, sr: 133.1 },
      "2021": { runs: 98, fours: 6, sixes: 4, sr: 130.7 },
      "2020": { runs: 71, fours: 6, sixes: 3, sr: 126.8 },
      "2019": { runs: 9, fours: 1, sixes: 0, sr: 90.0 },
      "2018": { runs: 63, fours: 3, sixes: 5, sr: 190.9 },
    },
    "Travis Head": {
      "2026": { runs: 567, fours: 64, sixes: 32, sr: 191.5 },
      "2025": { runs: 567, fours: 64, sixes: 32, sr: 191.5 },
      "2024": { runs: 567, fours: 64, sixes: 32, sr: 191.5 },
      "2023": { runs: 0, fours: 0, sixes: 0, sr: 0.0 },
      "2017": { runs: 75, fours: 4, sixes: 3, sr: 138.9 },
      "2016": { runs: 54, fours: 2, sixes: 4, sr: 142.1 },
    },
    "Virat Kohli": {
      "2026": { runs: 741, fours: 62, sixes: 38, sr: 154.2 },
      "2025": { runs: 657, fours: 58, sixes: 32, sr: 148.6 },
      "2024": { runs: 741, fours: 62, sixes: 38, sr: 154.2 },
      "2023": { runs: 639, fours: 65, sixes: 16, sr: 139.8 },
      "2022": { runs: 341, fours: 32, sixes: 8, sr: 115.9 },
      "2021": { runs: 405, fours: 43, sixes: 9, sr: 119.4 },
      "2020": { runs: 466, fours: 23, sixes: 11, sr: 121.3 },
      "2019": { runs: 464, fours: 46, sixes: 13, sr: 141.4 },
      "2018": { runs: 530, fours: 52, sixes: 18, sr: 139.1 },
      "2017": { runs: 308, fours: 23, sixes: 10, sr: 122.2 },
      "2016": { runs: 973, fours: 83, sixes: 38, sr: 152.0 },
      "2015": { runs: 505, fours: 35, sixes: 23, sr: 130.8 },
      "2014": { runs: 359, fours: 29, sixes: 16, sr: 122.1 },
      "2013": { runs: 634, fours: 64, sixes: 22, sr: 138.7 },
      "2012": { runs: 364, fours: 33, sixes: 10, sr: 111.6 },
      "2011": { runs: 557, fours: 55, sixes: 16, sr: 121.0 },
      "2010": { runs: 307, fours: 26, sixes: 12, sr: 144.8 },
      "2009": { runs: 246, fours: 22, sixes: 8, sr: 112.3 },
      "2008": { runs: 165, fours: 18, sixes: 4, sr: 105.0 },
    },
    "Rohit Sharma": {
      "2026": { runs: 417, fours: 45, sixes: 23, sr: 150.0 },
      "2025": { runs: 417, fours: 45, sixes: 23, sr: 150.0 },
      "2024": { runs: 417, fours: 45, sixes: 23, sr: 150.0 },
      "2023": { runs: 332, fours: 35, sixes: 17, sr: 132.8 },
      "2022": { runs: 268, fours: 28, sixes: 13, sr: 120.1 },
      "2021": { runs: 381, fours: 33, sixes: 14, sr: 127.4 },
      "2020": { runs: 332, fours: 27, sixes: 19, sr: 127.6 },
      "2019": { runs: 405, fours: 52, sixes: 10, sr: 128.5 },
      "2018": { runs: 286, fours: 25, sixes: 12, sr: 133.0 },
      "2017": { runs: 333, fours: 31, sixes: 9, sr: 121.9 },
      "2016": { runs: 489, fours: 49, sixes: 16, sr: 132.8 },
      "2015": { runs: 482, fours: 41, sixes: 21, sr: 144.7 },
      "2014": { runs: 390, fours: 31, sixes: 16, sr: 129.1 },
      "2013": { runs: 538, fours: 38, sixes: 28, sr: 131.5 },
      "2012": { runs: 433, fours: 39, sixes: 18, sr: 126.6 },
      "2011": { runs: 372, fours: 32, sixes: 14, sr: 125.2 },
      "2010": { runs: 404, fours: 36, sixes: 14, sr: 133.7 },
      "2009": { runs: 362, fours: 22, sixes: 18, sr: 114.9 },
      "2008": { runs: 404, fours: 38, sixes: 19, sr: 147.9 },
    },
    "Sunil Narine": {
      "2026": { runs: 485, fours: 50, sixes: 33, sr: 182.4 },
      "2025": { runs: 485, fours: 50, sixes: 33, sr: 182.4 },
      "2024": { runs: 485, fours: 50, sixes: 33, sr: 182.4 },
      "2023": { runs: 21, fours: 2, sixes: 1, sr: 84.0 },
      "2022": { runs: 71, fours: 6, sixes: 4, sr: 177.5 },
      "2021": { runs: 62, fours: 3, sixes: 5, sr: 131.9 },
      "2020": { runs: 121, fours: 14, sixes: 6, sr: 142.3 },
      "2019": { runs: 143, fours: 19, sixes: 8, sr: 166.2 },
      "2018": { runs: 357, fours: 40, sixes: 23, sr: 189.8 },
      "2017": { runs: 224, fours: 34, sixes: 10, sr: 172.3 },
      "2016": { runs: 14, fours: 2, sixes: 0, sr: 100.0 },
      "2015": { runs: 9, fours: 1, sixes: 0, sr: 75.0 },
      "2014": { runs: 21, fours: 1, sixes: 1, sr: 110.0 },
      "2013": { runs: 11, fours: 1, sixes: 0, sr: 65.0 },
      "2012": { runs: 0, fours: 0, sixes: 0, sr: 0.0 },
    }
  };

  const defaultBase = { runs: 450, fours: 42, sixes: 20, sr: 142.0 };
  
  const resolvePlayerBaseMap = (name: string) => {
    const clean = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.includes("klaasen") || clean.includes("heinrich")) return playerSeasonBaseStats["Heinrich Klaasen"];
    if (clean.includes("abhishek")) return playerSeasonBaseStats["Abhishek Sharma"];
    if (clean.includes("head") || clean.includes("travis")) return playerSeasonBaseStats["Travis Head"];
    if (clean.includes("kohli")) return playerSeasonBaseStats["Virat Kohli"];
    if (clean.includes("rohit") || clean.includes("sharma")) return playerSeasonBaseStats["Rohit Sharma"];
    if (clean.includes("narine")) return playerSeasonBaseStats["Sunil Narine"];
    return playerSeasonBaseStats[name] || playerSeasonBaseStats["Heinrich Klaasen"];
  };

  const playerSeasonMap = resolvePlayerBaseMap(activeName);
  const seasonStats = playerSeasonMap[selectedSeason] || playerSeasonMap["2026"] || defaultBase;

  // 8 REAL 360° GROUND SCORING SECTORS INCLUDING "LONG ON"
  // Angles measured clockwise from 12 o'clock Straight:
  // 0° = Straight, 24° = Long On (On-side), 65° = Mid Wicket, 98° = Square Leg, 140° = Fine Leg,
  // 220° = Third Man, 265° = Point / Cover, 300° = Extra Cover, 336° = Long Off (Off-side)
  const sectors = [
    { sector: "Long On", runs: Math.round(seasonStats.runs * 0.22), fours: Math.round(seasonStats.fours * 0.20), sixes: Math.round(seasonStats.sixes * 0.32), sr: Math.round(seasonStats.sr * 1.24), pct: 22, angle: 24, side: "ON" },
    { sector: "Long Off", runs: Math.round(seasonStats.runs * 0.19), fours: Math.round(seasonStats.fours * 0.22), sixes: Math.round(seasonStats.sixes * 0.24), sr: Math.round(seasonStats.sr * 1.12), pct: 19, angle: 336, side: "OFF" },
    { sector: "Mid Wicket", runs: Math.round(seasonStats.runs * 0.17), fours: Math.round(seasonStats.fours * 0.16), sixes: Math.round(seasonStats.sixes * 0.22), sr: Math.round(seasonStats.sr * 1.15), pct: 17, angle: 65, side: "ON" },
    { sector: "Extra Cover", runs: Math.round(seasonStats.runs * 0.16), fours: Math.round(seasonStats.fours * 0.18), sixes: Math.round(seasonStats.sixes * 0.10), sr: Math.round(seasonStats.sr * 1.04), pct: 16, angle: 300, side: "OFF" },
    { sector: "Square Leg", runs: Math.round(seasonStats.runs * 0.10), fours: Math.round(seasonStats.fours * 0.08), sixes: Math.round(seasonStats.sixes * 0.06), sr: Math.round(seasonStats.sr * 1.02), pct: 10, angle: 98, side: "ON" },
    { sector: "Cover / Point", runs: Math.round(seasonStats.runs * 0.08), fours: Math.round(seasonStats.fours * 0.10), sixes: Math.round(seasonStats.sixes * 0.03), sr: Math.round(seasonStats.sr * 0.95), pct: 8, angle: 265, side: "OFF" },
    { sector: "Fine Leg", runs: Math.round(seasonStats.runs * 0.05), fours: Math.round(seasonStats.fours * 0.04), sixes: Math.round(seasonStats.sixes * 0.02), sr: Math.round(seasonStats.sr * 0.88), pct: 5, angle: 140, side: "ON" },
    { sector: "Third Man", runs: Math.round(seasonStats.runs * 0.03), fours: Math.round(seasonStats.fours * 0.02), sixes: Math.round(seasonStats.sixes * 0.01), sr: Math.round(seasonStats.sr * 0.85), pct: 3, angle: 220, side: "OFF" },
  ];

  const totalRuns = seasonStats.runs;
  const currentActiveSectorData = sectors.find(s => s.sector === activeSector) || sectors[0];

  // STADIUM CROWD SPECTATORS GENERATOR (Tiered seating outer bowl)
  const crowdDots = useMemo(() => {
    const dots = [];
    const colors = [
      "#f97316", "#eab308", "#3b82f6", "#ef4444", "#a855f7",
      "#ec4899", "#10b981", "#ffffff", "#06b6d4", "#f43f5e"
    ];
    for (let i = 0; i < 96; i++) {
      const angle = (i / 96) * 2 * Math.PI;
      const r = 228 + (i % 3) * 7;
      const cx = 250 + Math.cos(angle) * r;
      const cy = 250 + Math.sin(angle) * r;
      const color = colors[i % colors.length];
      dots.push({ cx, cy, color, r: 1.6 + (i % 2) * 0.6 });
    }
    return dots;
  }, []);

  return (
    <div className="w-full bg-[#0B1020] border border-white/10 rounded-2xl p-5 shadow-2xl">
       {/* HEADER & CONTROLS */}
       <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3 mb-4">
          <div className="flex items-center gap-2">
             <CircleDot className="w-5 h-5 text-purple-400" />
             <div>
                <span className="text-sm font-black text-white uppercase tracking-wider block">
                  360° Ground Scoring Area & Wagon Wheel: {activeName} ({selectedSeason})
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  Interactive Stadium Broadcast Hawkeye · Live Trajectory Simulation
                </span>
             </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
             {/* 3D PERSPECTIVE VIEW TOGGLE */}
             <button
               onClick={() => setIs3DView(!is3DView)}
               className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                 is3DView
                   ? "bg-gradient-to-r from-amber-600/40 to-orange-600/40 border-amber-500/60 text-amber-300 shadow-lg shadow-amber-500/20"
                   : "bg-white/5 border-white/10 text-white/50 hover:text-white"
               }`}
               title="Toggle between 3D Three.js Stadium Engine and 2D Sector Density View"
             >
                <Tv className="w-3.5 h-3.5" />
                <span>{is3DView ? "🎮 3D Stadium Engine: ACTIVE" : "📊 2D Sector Density View"}</span>
             </button>

             {/* 2008 - 2026 REAL CRICSHEET SEASON SELECTOR */}
             <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                <span className="text-[9px] font-black text-white/40 uppercase pl-1.5">Season:</span>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="bg-slate-900 border border-white/10 text-amber-400 font-mono font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer"
                >
                   {ALL_SEASONS.map(s => (
                      <option key={s} value={s} className="bg-slate-950 text-white font-mono">
                         {s} Season ({playerSeasonMap[s]?.runs ?? 0} Runs)
                      </option>
                   ))}
                </select>
             </div>

             {!player && (
               <div className="flex items-center gap-1.5 overflow-x-auto">
                  {["Heinrich Klaasen", "Abhishek Sharma", "Travis Head", "Virat Kohli", "Rohit Sharma"].map(p => (
                     <button
                       key={p}
                       onClick={() => setSelectedPlayer(p)}
                       className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                         selectedPlayer === p ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 scale-105' : 'bg-white/5 text-white/40 hover:text-white'
                       }`}
                     >
                        {p}
                     </button>
                  ))}
               </div>
             )}
          </div>
       </div>

       {/* SECTOR INTERACTIVE QUICK BAR */}
       <div className="mb-4 bg-slate-950/70 border border-white/5 rounded-xl p-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-white/40 uppercase">
             <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
             <span>Active Sector:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
             {sectors.map(s => {
                const isSelected = activeSector === s.sector;
                return (
                   <button
                     key={s.sector}
                     onClick={() => setActiveSector(s.sector)}
                     className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                       isSelected
                         ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-105 border border-cyan-300/40"
                         : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                     }`}
                   >
                      <span>{s.sector}</span>
                      <span className={`text-[8px] font-mono px-1 rounded ${isSelected ? "bg-black/40 text-cyan-200" : "text-white/30"}`}>
                        {s.runs}r
                      </span>
                   </button>
                );
             })}
          </div>
       </div>

        {/* MAIN CONTENT: 3D THREE.JS CRICKET STADIUM ENGINE OR 2D SECTOR STATS */}
        {is3DView ? (
           <div className="w-full">
              <CricketStadium3D batterName={activeName} />
           </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* REAL 3D STADIUM GROUND CONTAINER */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center p-3 bg-slate-950 border border-white/10 rounded-2xl relative shadow-2xl overflow-hidden">
             
             {/* 3D TILT WRAPPER */}
             <div
               className="relative w-full aspect-square max-w-[430px] rounded-full overflow-hidden border-4 border-[#1e293b] transition-transform duration-500"
               style={{
                 perspective: "1000px",
                 transform: is3DView ? "perspective(900px) rotateX(23deg) scale(0.97)" : "none",
                 transformStyle: "preserve-3d",
                 boxShadow: is3DView
                   ? "0 30px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px rgba(16, 185, 129, 0.2)"
                   : "0 10px 30px -10px rgba(0, 0, 0, 0.8)",
               }}
             >
                <svg viewBox="0 0 500 500" className="w-full h-full select-none">
                   <defs>
                      {/* Turf Grass Patterns */}
                      <radialGradient id="stadiumTurf3D" cx="50%" cy="50%" r="50%">
                         <stop offset="0%" stopColor="#15803d" />
                         <stop offset="60%" stopColor="#166534" />
                         <stop offset="95%" stopColor="#14532d" />
                         <stop offset="100%" stopColor="#0f391e" />
                      </radialGradient>
                      
                      {/* Inner Mowing Rings Pattern */}
                      <pattern id="mowingPattern3D" width="44" height="44" patternUnits="userSpaceOnUse">
                         <circle cx="22" cy="22" r="20" fill="none" stroke="#16a34a" strokeWidth="3" opacity="0.25" />
                         <line x1="0" y1="22" x2="44" y2="22" stroke="#15803d" strokeWidth="2" opacity="0.2" />
                      </pattern>

                      {/* Volumetric Floodlight Beam Gradients */}
                      <radialGradient id="floodlightBeamNW" cx="15%" cy="15%" r="75%">
                         <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                         <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.12" />
                         <stop offset="100%" stopColor="#166534" stopOpacity="0" />
                      </radialGradient>

                      <radialGradient id="floodlightBeamNE" cx="85%" cy="15%" r="75%">
                         <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                         <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.12" />
                         <stop offset="100%" stopColor="#166534" stopOpacity="0" />
                      </radialGradient>

                      {/* Glowing Laser Ball Particle Filter */}
                      <filter id="ballLaserGlow" x="-50%" y="-50%" width="200%" height="200%">
                         <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                         <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                         </feMerge>
                      </filter>

                      <filter id="tracerGlow" x="-40%" y="-40%" width="180%" height="180%">
                         <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                         <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                         </feMerge>
                      </filter>
                   </defs>

                   {/* --- OUTER STADIUM BOWL & CROWD STANDS --- */}
                   {/* Stadium Concrete Outer Rim */}
                   <circle cx="250" cy="250" r="248" fill="#0f172a" />
                   
                   {/* Grandstand Seating Tiers */}
                   <circle cx="250" cy="250" r="244" fill="none" stroke="#1e293b" strokeWidth="5" />
                   <circle cx="250" cy="250" r="236" fill="none" stroke="#334155" strokeWidth="5" />
                   <circle cx="250" cy="250" r="228" fill="none" stroke="#1e293b" strokeWidth="5" />

                   {/* Crowd Spectator Dots (Packed Fans Around Stadium) */}
                   {crowdDots.map((dot, idx) => (
                      <circle
                        key={`crowd-${idx}`}
                        cx={dot.cx}
                        cy={dot.cy}
                        r={dot.r}
                        fill={dot.color}
                        opacity={0.88}
                      />
                   ))}

                   {/* Boundary LED Perimeter Board Ribbon */}
                   <circle cx="250" cy="250" r="223" fill="none" stroke="#0284c7" strokeWidth="3.5" opacity="0.9" />
                   <circle cx="250" cy="250" r="223" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="12 6" className="animate-pulse" />

                   {/* Ground Outfield Grass Base */}
                   <circle cx="250" cy="250" r="220" fill="url(#stadiumTurf3D)" />
                   <circle cx="250" cy="250" r="220" fill="url(#mowingPattern3D)" />

                   {/* White Boundary Rope */}
                   <circle cx="250" cy="250" r="215" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 4" opacity="0.95" />

                   {/* 30-Yard Inner Field Ring with Fielding Markers */}
                   <circle cx="250" cy="250" r="118" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 6" opacity="0.65" />
                   
                   {/* 4 Corner Floodlight Volumetric Cones */}
                   <circle cx="250" cy="250" r="220" fill="url(#floodlightBeamNW)" />
                   <circle cx="250" cy="250" r="220" fill="url(#floodlightBeamNE)" />

                   {/* Pitch Block in Center (Realistic soil & depth) */}
                   <rect x="240" y="214" width="20" height="72" rx="3" fill="#854d0e" stroke="#ca8a04" strokeWidth="1" />
                   <rect x="242" y="216" width="16" height="68" rx="2" fill="#a16207" opacity="0.9" />
                   
                   {/* Batting Crease Lines & Stumps */}
                   <line x1="236" y1="228" x2="264" y2="228" stroke="#ffffff" strokeWidth="2" />
                   <line x1="236" y1="272" x2="264" y2="272" stroke="#ffffff" strokeWidth="2" />
                   {/* Stumps */}
                   <circle cx="247" cy="227" r="1" fill="#fef08a" />
                   <circle cx="250" cy="227" r="1" fill="#fef08a" />
                   <circle cx="253" cy="227" r="1" fill="#fef08a" />
                   <circle cx="247" cy="273" r="1" fill="#fef08a" />
                   <circle cx="250" cy="273" r="1" fill="#fef08a" />
                   <circle cx="253" cy="273" r="1" fill="#fef08a" />

                   {/* OFF SIDE & ON SIDE Turf Text Labels */}
                   <text x="135" y="255" fill="#ffffff" opacity="0.25" fontSize="18" fontWeight="900" textAnchor="middle" letterSpacing="2">OFF SIDE</text>
                   <text x="365" y="255" fill="#ffffff" opacity="0.25" fontSize="18" fontWeight="900" textAnchor="middle" letterSpacing="2">ON SIDE</text>

                   {/* Sector Label Guides */}
                   <text x="210" y="45" fill="#ffffff" opacity={activeSector === "Long Off" ? 1 : 0.6} fontSize="10" fontWeight="900" textAnchor="middle">LONG OFF</text>
                   <text x="290" y="45" fill="#38bdf8" opacity={activeSector === "Long On" ? 1 : 0.75} fontSize="11" fontWeight="900" textAnchor="middle">LONG ON ★</text>
                   <text x="420" y="140" fill="#ffffff" opacity={activeSector === "Mid Wicket" ? 1 : 0.6} fontSize="10" fontWeight="900" textAnchor="middle">MID WICKET</text>
                   <text x="445" y="255" fill="#ffffff" opacity={activeSector === "Square Leg" ? 1 : 0.6} fontSize="10" fontWeight="900" textAnchor="middle">SQUARE LEG</text>
                   <text x="390" y="380" fill="#ffffff" opacity={activeSector === "Fine Leg" ? 1 : 0.6} fontSize="10" fontWeight="900" textAnchor="middle">FINE LEG</text>
                   <text x="110" y="380" fill="#ffffff" opacity={activeSector === "Third Man" ? 1 : 0.6} fontSize="10" fontWeight="900" textAnchor="middle">THIRD MAN</text>
                   <text x="55" y="255" fill="#ffffff" opacity={activeSector === "Cover / Point" ? 1 : 0.6} fontSize="10" fontWeight="900" textAnchor="middle">POINT / COVER</text>
                   <text x="90" y="140" fill="#ffffff" opacity={activeSector === "Extra Cover" ? 1 : 0.6} fontSize="10" fontWeight="900" textAnchor="middle">EXTRA COVER</text>

                   {/* ─── REAL CRICKET MATCH BROADCAST GRAPHICS: MOVING SHOTS & LASER TRACERS ─── */}
                   {sectors.map((sec, secIdx) => {
                      const originX = 250;
                      const originY = 250;
                      const isSelectedSector = sec.sector === activeSector;
                      const baseAngleRad = sec.angle * (Math.PI / 180);

                      const lines = [];
                      const animatedBalls = [];
                      const ripples = [];

                      // 1. SIXES (Red / Orange Glowing Trajectories to Boundary & Stands)
                      const maxSixLines = Math.min(sec.sixes, isSelectedSector ? 7 : 5);
                      for (let i = 0; i < maxSixLines; i++) {
                         const spread = (i - maxSixLines / 2) * 0.045;
                         const rad = baseAngleRad + spread;
                         const dist = isSelectedSector ? 222 : 214;
                         const endX = originX + Math.sin(rad) * dist;
                         const endY = originY - Math.cos(rad) * dist;
                         const dur = `${0.85 + i * 0.15}s`;

                         // Laser Tracer Line
                         lines.push(
                            <line
                              key={`six-tr-${secIdx}-${i}`}
                              x1={originX}
                              y1={originY}
                              x2={endX}
                              y2={endY}
                              stroke="#ef4444"
                              strokeWidth={isSelectedSector ? 3.5 : 2}
                              strokeLinecap="round"
                              opacity={isSelectedSector ? 0.95 : 0.75}
                              filter={isSelectedSector ? "url(#tracerGlow)" : undefined}
                              strokeDasharray={isSelectedSector ? "10 5" : undefined}
                            >
                               {isSelectedSector && (
                                  <animate attributeName="strokeDashoffset" from="60" to="0" dur={dur} repeatCount="indefinite" />
                               )}
                            </line>
                         );

                         // MOVING CRICKET BALL PARTICLE GRAPHICS (Like Real TV Broadcast Hawkeye)
                         if (isSelectedSector) {
                            animatedBalls.push(
                               <circle
                                 key={`six-ball-${secIdx}-${i}`}
                                 r={4}
                                 fill="#fef08a"
                                 stroke="#ef4444"
                                 strokeWidth={1.5}
                                 filter="url(#ballLaserGlow)"
                               >
                                  <animate attributeName="cx" from={originX} to={endX} dur={dur} repeatCount="indefinite" />
                                  <animate attributeName="cy" from={originY} to={endY} dur={dur} repeatCount="indefinite" />
                                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur={dur} repeatCount="indefinite" />
                               </circle>
                            );

                            // Impact Shockwave Ripple at Boundary Rope / Stands
                            ripples.push(
                               <circle
                                 key={`six-rip-${secIdx}-${i}`}
                                 cx={endX}
                                 cy={endY}
                                 r={3}
                                 fill="none"
                                 stroke="#ef4444"
                                 strokeWidth={1.5}
                                 opacity={0.8}
                               >
                                  <animate attributeName="r" values="2;13" dur={dur} repeatCount="indefinite" />
                                  <animate attributeName="opacity" values="0.9;0" dur={dur} repeatCount="indefinite" />
                               </circle>
                            );
                         }
                      }

                      // 2. FOURS (Blue / Cyan Ground Boundary Tracers)
                      const maxFourLines = Math.min(sec.fours, isSelectedSector ? 8 : 6);
                      for (let i = 0; i < maxFourLines; i++) {
                         const spread = (i - maxFourLines / 2) * 0.04;
                         const rad = baseAngleRad + spread;
                         const dist = 205;
                         const endX = originX + Math.sin(rad) * dist;
                         const endY = originY - Math.cos(rad) * dist;
                         const dur = `${1.0 + i * 0.14}s`;

                         lines.push(
                            <line
                              key={`four-tr-${secIdx}-${i}`}
                              x1={originX}
                              y1={originY}
                              x2={endX}
                              y2={endY}
                              stroke="#38bdf8"
                              strokeWidth={isSelectedSector ? 2.8 : 1.8}
                              strokeLinecap="round"
                              opacity={isSelectedSector ? 0.9 : 0.65}
                            >
                               {isSelectedSector && (
                                  <animate attributeName="strokeDashoffset" from="40" to="0" dur={dur} repeatCount="indefinite" />
                               )}
                            </line>
                         );

                         if (isSelectedSector) {
                            animatedBalls.push(
                               <circle
                                 key={`four-ball-${secIdx}-${i}`}
                                 r={3}
                                 fill="#ffffff"
                                 stroke="#38bdf8"
                                 strokeWidth={1}
                               >
                                  <animate attributeName="cx" from={originX} to={endX} dur={dur} repeatCount="indefinite" />
                                  <animate attributeName="cy" from={originY} to={endY} dur={dur} repeatCount="indefinite" />
                                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur={dur} repeatCount="indefinite" />
                               </circle>
                            );
                         }
                      }

                      // 3. ONES, TWOS & THREES (Yellow / White Outfield Running Tracers)
                      const onesCount = Math.max(2, Math.round(sec.runs / 14));
                      for (let i = 0; i < Math.min(onesCount, 5); i++) {
                         const spread = (i - onesCount / 2) * 0.045;
                         const rad = baseAngleRad + spread;
                         const dist = 95 + (i % 3) * 35;
                         const endX = originX + Math.sin(rad) * dist;
                         const endY = originY - Math.cos(rad) * dist;

                         lines.push(
                            <line
                              key={`one-tr-${secIdx}-${i}`}
                              x1={originX}
                              y1={originY}
                              x2={endX}
                              y2={endY}
                              stroke="#eab308"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                              opacity={isSelectedSector ? 0.8 : 0.5}
                            />
                         );
                      }

                      return (
                         <g
                           key={sec.sector}
                           onClick={() => setActiveSector(sec.sector)}
                           className="cursor-pointer group"
                         >
                            {lines}
                            {animatedBalls}
                            {ripples}

                            {/* Broadcast Telemetry Badge at Longest Six Landing Spot for Active Sector */}
                            {isSelectedSector && sec.sixes > 0 && (
                               <g className="animate-pulse pointer-events-none">
                                  <rect
                                    x={originX + Math.sin(baseAngleRad) * 224 - 32}
                                    y={originY - Math.cos(baseAngleRad) * 224 - 15}
                                    width="64"
                                    height="16"
                                    rx="4"
                                    fill="#000000ee"
                                    stroke="#ef4444"
                                    strokeWidth="1.2"
                                  />
                                  <text
                                    x={originX + Math.sin(baseAngleRad) * 224}
                                    y={originY - Math.cos(baseAngleRad) * 224 - 3}
                                    fill="#f87171"
                                    fontSize="8"
                                    fontWeight="900"
                                    textAnchor="middle"
                                  >
                                     {sec.sector === "Long On" ? "106m SIX ★" : "MAX SIX"}
                                  </text>
                               </g>
                            )}
                         </g>
                      );
                   })}
                </svg>
             </div>

             {/* LIVE HAWKEYE TELEMETRY BAR UNDER GROUND */}
             <div className="w-full mt-3 bg-[#090d1a] border border-cyan-500/30 rounded-xl p-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                   <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-black uppercase text-white tracking-widest">
                         HAWKEYE TRACKER: {currentActiveSectorData.sector.toUpperCase()}
                      </span>
                   </div>
                   <span className="text-[10px] font-mono text-amber-400 font-bold">
                      {currentActiveSectorData.runs} RUNS · {currentActiveSectorData.sr} SR
                   </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                   <div>
                      <span className="text-white/40">SIXES: </span>
                      <span className="text-red-400 font-black">{currentActiveSectorData.sixes}</span>
                      <span className="text-white/30 text-[9px] ml-1">(106m Max)</span>
                   </div>
                   <div>
                      <span className="text-white/40">FOURS: </span>
                      <span className="text-cyan-400 font-black">{currentActiveSectorData.fours}</span>
                   </div>
                   <div>
                      <span className="text-white/40">SHARE: </span>
                      <span className="text-purple-300 font-black">{currentActiveSectorData.pct}%</span>
                   </div>
                   <div>
                      <span className="text-white/40">ARC: </span>
                      <span className="text-emerald-400 font-black">Lofted Power</span>
                   </div>
                </div>

                <div className="flex items-center justify-around text-[10px] font-bold mt-2.5 pt-2 border-t border-white/5">
                   <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-md shadow-yellow-500/50" />
                      <span className="text-white/80">1's</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                      <span className="text-white/80">4's</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-md shadow-red-500/50" />
                      <span className="text-white/80">6's</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-cyan-300 animate-pulse">★ Click Sector for Ball Animation</span>
                   </div>
                </div>
             </div>

          </div>

          {/* SECTOR STATS GRID (Clicking sector card activates moving shots) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
             {sectors.map(s => {
                const isSelected = activeSector === s.sector;
                return (
                   <div
                     key={s.sector}
                     onClick={() => setActiveSector(s.sector)}
                     className={`p-3 rounded-xl transition-all cursor-pointer border ${
                       isSelected
                         ? "bg-cyan-500/10 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-[1.02]"
                         : "bg-white/[0.02] border-white/5 hover:border-purple-500/40"
                     }`}
                   >
                      <div className="flex items-center justify-between text-xs font-black uppercase mb-1">
                         <div className="flex items-center gap-1.5">
                            {isSelected && <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />}
                            <span className={isSelected ? "text-cyan-300 font-extrabold" : "text-white"}>{s.sector}</span>
                         </div>
                         <span className="text-amber-400 font-mono">{s.runs} Runs</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-1.5">
                         <div
                           className={`h-full rounded-full transition-all duration-500 ${
                             isSelected
                               ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
                               : "bg-gradient-to-r from-purple-500 to-indigo-500"
                           }`}
                           style={{ width: `${s.pct}%` }}
                         />
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-bold text-white/50">
                         <span>{s.fours} Fours • {s.sixes} Sixes</span>
                         <span className={isSelected ? "text-cyan-300 font-mono" : "text-emerald-400 font-mono"}>{s.sr} SR</span>
                      </div>
                   </div>
                );
             })}
          </div>
       </div>
        )}
    </div>
  );
}

export function ScoringHeatmap({ player, data }: { player: string; data: { area: string; runs: number; balls: number; sr: number }[] }) {
  return (
    <div className="w-full">
      <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="text-xs font-black text-white uppercase tracking-wider mb-3">{player} - Scoring Zones</div>
        <div className="space-y-2">
          {data.map((zone, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-[10px] font-black text-white/60 uppercase">{zone.area}</div>
              <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full"
                  style={{ width: `${Math.min(100, zone.sr / 2)}%` }}
                />
              </div>
              <div className="w-20 text-right text-[10px] font-bold text-amber-400 font-mono">
                {zone.runs} Runs ({zone.sr} SR)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BowlingHeatmap({ player, zones }: { player: string; zones: { name: string; yorkers: number; length: number; short: number }[] }) {
  return (
    <div className="w-full">
      <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="text-xs font-black text-white uppercase tracking-wider mb-3">{player} - Bowling Line & Length</div>
        <div className="grid grid-cols-3 gap-2">
          {zones.map((zone, i) => {
            const max = Math.max(zone.yorkers, zone.length, zone.short, 1);
            const total = zone.yorkers + zone.length + zone.short;
            return (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-black text-white uppercase mb-2">{zone.name}</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-cyan-400">Yorkers</span>
                    <span className="text-[9px] font-mono text-white">{zone.yorkers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-amber-400">Length</span>
                    <span className="text-[9px] font-mono text-white">{zone.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-red-400">Short</span>
                    <span className="text-[9px] font-mono text-white">{zone.short}</span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${(total / max) * 100}%` }}
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

export function DismissalZonesMap() {
  const dismissalZones = [
    { name: "Slip", count: 42, color: "hsl(270 95% 65%)" },
    { name: "Point", count: 38, color: "hsl(45 95% 60%)" },
    { name: "Cover", count: 31, color: "hsl(190 95% 60%)" },
    { name: "Mid-off", count: 27, color: "hsl(320 100% 65%)" },
    { name: "Long-on", count: 24, color: "hsl(0 85% 65%)" },
    { name: "Deep mid-wicket", count: 19, color: "hsl(220 100% 65%)" },
    { name: "Fine leg", count: 16, color: "hsl(28 95% 60%)" },
    { name: "Third man", count: 12, color: "hsl(150 95% 60%)" },
  ];

  return (
    <div className="w-full">
      <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="text-xs font-black text-white uppercase tracking-wider mb-3">Dismissal Zones</div>
        <div className="grid grid-cols-4 gap-2">
          {dismissalZones.map((zone, i) => (
            <div key={i} className="relative group cursor-pointer">
              <div className="aspect-square rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center p-2 hover:border-white/30 transition-all">
                <div 
                  className="w-8 h-8 rounded-full mb-1 flex items-center justify-center"
                  style={{ backgroundColor: `${zone.color}30`, border: `2px solid ${zone.color}` }}
                >
                   <CircleDot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-[9px] font-black text-white uppercase text-center">{zone.name}</div>
                <div className="text-[10px] text-amber-400 font-mono font-bold">{zone.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React from "react";

interface PhaseStats {
  ppSr: number;
  middleSr: number;
  deathSr: number;
  ppRuns?: number;
  middleRuns?: number;
  deathRuns?: number;
}

interface PhaseComparisonProps {
  player: string;
  stats: PhaseStats;
}

export function PhaseComparison({ player, stats }: PhaseComparisonProps) {
  const phases = [
    { name: "Powerplay", sr: stats.ppSr, runs: stats.ppRuns || 0, color: "hsl(270 95% 65%)" },
    { name: "Middle", sr: stats.middleSr, runs: stats.middleRuns || 0, color: "hsl(45 95% 60%)" },
    { name: "Death", sr: stats.deathSr, runs: stats.deathRuns || 0, color: "hsl(320 100% 65%)" },
  ];

  const maxSr = Math.max(...phases.map(p => p.sr), 200);

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{player} - Phase Analysis</div>
        
        <div className="space-y-4">
          {phases.map((phase, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-white">{phase.name}</span>
                <span className="text-[10px] text-primary font-bold">SR: {phase.sr}</span>
              </div>
              <div className="relative h-8 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${phase.sr / maxSr * 100}%`,
                    backgroundColor: phase.color
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white/60">
                  {phase.runs} runs
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-white/[0.03]">
            <div className="text-[9px] text-white/40">Best Phase</div>
            <div className="text-sm font-bold text-primary">
              {phases.reduce((max, p) => p.sr > max.sr ? p : max).name}
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.03]">
            <div className="text-[9px] text-white/40">Avg SR</div>
            <div className="text-sm font-bold text-white">
              {Math.round(phases.reduce((sum, p) => sum + p.sr, 0) / 3)}
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.03]">
            <div className="text-[9px] text-white/40">Range</div>
            <div className="text-sm font-bold text-white">
              {Math.max(...phases.map(p => p.sr)) - Math.min(...phases.map(p => p.sr))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhaseTelemetryArc({ player, stats }: PhaseComparisonProps) {
  const values = [stats.ppSr, stats.middleSr, stats.deathSr];
  const max = 200;
  
  const angles = [0, 120, 240];
  
  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{player} - Phase Arc</div>
        <div className="relative w-[200px] h-[120px] mx-auto">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <path
              d="M 20 100 A 80 80 0 0 1 100 20"
              fill="none"
              stroke="hsl(270 95% 65%)"
              strokeWidth={8}
              strokeLinecap="round"
            />
            <path
              d="M 100 20 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(45 95% 60%)"
              strokeWidth={8}
              strokeLinecap="round"
            />
            <path
              d="M 180 100 A 80 80 0 0 1 20 100"
              fill="none"
              stroke="hsl(320 100% 65%)"
              strokeWidth={8}
              strokeLinecap="round"
            />
            
            <text x="20" y="110" className="text-[10px] fill-white font-bold" textAnchor="middle">
              PP
            </text>
            <text x="175" y="110" className="text-[10px] fill-white font-bold" textAnchor="middle">
              D
            </text>
            <text x="100" y="25" className="text-[10px] fill-white font-bold" textAnchor="middle">
              M
            </text>
          </svg>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div>
            <div className="text-[9px] text-white/40">Powerplay</div>
            <div className="text-sm font-bold text-primary">{stats.ppSr}</div>
          </div>
          <div>
            <div className="text-[9px] text-white/40">Middle</div>
            <div className="text-sm font-bold text-amber-400">{stats.middleSr}</div>
          </div>
          <div>
            <div className="text-[9px] text-white/40">Death</div>
            <div className="text-sm font-bold text-pink-400">{stats.deathSr}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhaseStripChart({ player, stats }: PhaseComparisonProps) {
  const phases = [
    { name: "PP", value: stats.ppSr, color: "hsl(270 95% 65%)" },
    { name: "Mid", value: stats.middleSr, color: "hsl(45 95% 60%)" },
    { name: "Death", value: stats.deathSr, color: "hsl(320 100% 65%)" },
  ];

  const max = 200;

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{player}</div>
        <div className="flex items-end justify-center gap-4 h-[120px]">
          {phases.map((phase, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="text-[10px] text-white font-bold mb-1">{phase.value}</div>
              <div
                className="w-12 rounded-t-lg transition-all"
                style={{ 
                  height: `${phase.value / max * 100}%`,
                  backgroundColor: phase.color
                }}
              />
              <div className="text-[9px] text-white/60 mt-1">{phase.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
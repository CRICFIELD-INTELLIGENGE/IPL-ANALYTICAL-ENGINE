import React from "react";

interface PlayerValue {
  name: string;
  team: string;
  price: number;
  performance: number;
  category: "batsman" | "bowler" | "allrounder" | "wk";
}

interface ValuePriceMapProps {
  data: PlayerValue[];
}

export function ValuePriceMap({ data }: ValuePriceMapProps) {
  const maxPrice = Math.max(...data.map(p => p.price), 200);
  const maxPerf = Math.max(...data.map(p => p.performance), 1000);

  const quadrantCounts = data.reduce(
    (acc, p) => {
      const xRatio = p.price / maxPrice;
      const yRatio = p.performance / maxPerf;
      if (xRatio > 0.5 && yRatio > 0.5) acc.underpriced++;
      else if (xRatio > 0.5 && yRatio <= 0.5) acc.overpriced++;
      else if (xRatio <= 0.5 && yRatio > 0.5) acc.undervalued++;
      else acc.poorValue++;
      return acc;
    },
    { underpriced: 0, overpriced: 0, undervalued: 0, poorValue: 0 }
  );

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">Value vs Price Analysis</div>
        
        <div className="relative h-[300px] bg-white/[0.02] rounded-lg overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="border-r border-b border-white/5" />
            <div className="border-b border-white/5" />
            <div className="border-r border-white/5" />
            <div />
          </div>
          
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
            {data.map((player, i) => {
              const x = (player.price / maxPrice) * 380 + 10;
              const y = 290 - (player.performance / maxPerf) * 280;
              
              const colors = {
                batsman: "hsl(270 95% 65%)",
                bowler: "hsl(45 95% 60%)",
                allrounder: "hsl(320 100% 65%)",
                wk: "hsl(190 95% 60%)",
              };
              
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={Math.sqrt(player.price) / 3}
                    fill={colors[player.category]}
                    opacity={0.7}
                  />
                  <text
                    x={x}
                    y={y - 10}
                    className="text-[8px] fill-white/80"
                    textAnchor="middle"
                  >
                    {player.name.split(" ").map(n => n[0]).join(".")}
                  </text>
                </g>
              );
            })}
          </svg>
          
          <div className="absolute top-2 left-2 text-[10px] font-bold text-green-400">
            Underpriced
          </div>
          <div className="absolute top-2 right-2 text-[10px] font-bold text-red-400">
            Overpriced
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {[
            { label: "Underpriced", count: quadrantCounts.underpriced, color: "text-green-400" },
            { label: "Overpriced", count: quadrantCounts.overpriced, color: "text-red-400" },
            { label: "Undervalued", count: quadrantCounts.undervalued, color: "text-amber-400" },
            { label: "Poor Value", count: quadrantCounts.poorValue, color: "text-white/40" },
          ].map((q) => (
            <div key={q.label} className="p-2 rounded-lg bg-white/[0.03] text-center">
              <div className={`text-lg font-bold ${q.color}`}>{q.count}</div>
              <div className="text-[9px] text-white/60">{q.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketInflationMap() {
  const categories = [
    { name: "Indian Pacers", marketPrice: 142, fairValue: 110, overpaid: 28 },
    { name: "Overseas Spin", marketPrice: 98, fairValue: 105, overpaid: -7 },
    { name: "Death Bowlers", marketPrice: 156, fairValue: 135, overpaid: 16 },
    { name: "Young Talents", marketPrice: 78, fairValue: 65, overpaid: 20 },
    { name: "Finishers", marketPrice: 134, fairValue: 128, overpaid: 5 },
    { name: "WK Batsmen", marketPrice: 112, fairValue: 105, overpaid: 7 },
  ];

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">Market Inflation Analysis</div>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-white">{cat.name}</span>
                <span className={`text-[10px] font-bold ${cat.overpaid > 0 ? "text-red-400" : "text-green-400"}`}>
                  {cat.overpaid > 0 ? "+" : ""}{cat.overpaid}%
                </span>
              </div>
              <div className="relative h-6 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full"
                  style={{ width: `${cat.marketPrice / 160 * 100}%` }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-white/60"
                  style={{ left: `${cat.fairValue / 160 * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="text-[10px] text-red-400 font-bold mb-1">Key Insight</div>
          <div className="text-[11px] text-white">
            Indian pacers are overvalued by 28% in current auction dynamics
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeamBalance {
  pace: number;
  spin: number;
  finishers: number;
  powerplay: number;
}

interface TeamBalanceRadarProps {
  data: TeamBalance[];
  teams: string[];
}

export function TeamBalanceRadar({ data, teams }: TeamBalanceRadarProps) {
  if (!data.length) {
    data = [
      { pace: 70, spin: 60, finishers: 80, powerplay: 65 },
      { pace: 55, spin: 75, finishers: 70, powerplay: 80 },
      { pace: 65, spin: 55, finishers: 75, powerplay: 60 },
    ];
    teams = ["MI", "CSK", "RCB"];
  }

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">Team Balance Radar</div>
        <div className="flex items-center justify-center">
          <div className="relative w-[200px] h-[200px]">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <g transform="translate(100, 100)">
                {[0, 1, 2, 3].map((i) => {
                  const angle = (i * 90 - 45) * Math.PI / 180;
                  const x = Math.cos(angle) * 70;
                  const y = Math.sin(angle) * 70;
                  const labels = ["Pace", "Spin", "Finishers", "Powerplay"];
                  return (
                    <g key={i}>
                      <line
                        x1={0}
                        y1={0}
                        x2={x}
                        y2={y}
                        stroke="hsl(250 40% 25%)"
                        strokeWidth={1}
                      />
                      <text
                        x={x * 1.15}
                        y={y * 1.15}
                        className="text-[9px] fill-white/60 font-bold"
                        textAnchor={x > 0 ? "start" : "end"}
                        dominantBaseline="middle"
                      >
                        {labels[i]}
                      </text>
                    </g>
                  );
                })}
                
                {data.map((team, idx) => {
                  const values = [team.pace, team.spin, team.finishers, team.powerplay];
                  const colors = ["hsl(270 95% 65%)", "hsl(45 95% 60%)", "hsl(320 100% 65%)", "hsl(190 95% 60%)"];
                  return (
                    <polygon
                      key={idx}
                      points={values.map((v, i) => {
                        const angle = (i * 90 - 45) * Math.PI / 180;
                        const r = v * 0.6;
                        return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
                      }).join(" ")}
                      fill={colors[idx]}
                      fillOpacity={0.2}
                      stroke={colors[idx]}
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {teams.map((team, i) => (
            <div key={team} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ["hsl(270 95% 65%)", "hsl(45 95% 60%)", "hsl(320 100% 65%)"][i] || "hsl(190 95% 60%)" }}
              />
              <span className="text-[10px] text-white">{team}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
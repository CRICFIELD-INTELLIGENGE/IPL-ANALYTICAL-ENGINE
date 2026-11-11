import React, { useMemo } from "react";

declare const d3: any;

interface MatchupData {
  source: string;
  target: string;
  dismissals: number;
  strikeRate: number;
  pressure: number;
}

interface MatchupNetworkProps {
  data: MatchupData[];
  width?: number;
  height?: number;
}

export function MatchupNetwork({ 
  data, 
  width = 600, 
  height = 400 
}: MatchupNetworkProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);

  const simulation = useMemo(() => {
    const nodes = Array.from(
      new Set(data.flatMap(d => [d.source, d.target]))
    ).map(name => ({ id: name, group: name.includes(" ") ? 1 : 2 }));

    const links = data.map(d => ({
      source: d.source,
      target: d.target,
      value: d.dismissals,
      strikeRate: d.strikeRate,
      pressure: d.pressure,
    }));

    return d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.source || d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));
  }, [data, width, height]);

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} className="bg-black/20 rounded-xl">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(270 95% 65%)" />
            <stop offset="100%" stopColor="hsl(320 100% 65%)" />
          </linearGradient>
        </defs>
        {data.map((d, i) => (
          <g key={`${d.source}-${d.target}-${i}`}>
            <line
              x1={100}
              y1={200}
              x2={300}
              y2={200}
              stroke="url(#linkGradient)"
              strokeWidth={Math.max(1, d.dismissals)}
              className="opacity-60"
            />
            <text
              x={90}
              y={195}
              className="text-[10px] fill-white font-mono"
              textAnchor="end"
            >
              {d.source}
            </text>
            <text
              x={310}
              y={195}
              className="text-[10px] fill-white font-mono"
              textAnchor="start"
            >
              {d.target}
            </text>
            <text
              x={200}
              y={190}
              className="text-[9px] fill-primary font-bold"
              textAnchor="middle"
            >
              {d.dismissals} dismissals • SR {d.strikeRate}
            </text>
          </g>
        ))}
        {Array.from(new Set(data.flatMap(d => [d.source, d.target]))).map((name, i) => (
          <g key={name}>
            <circle
              cx={100 + (i % 4) * 120}
              cy={120 + Math.floor(i / 4) * 80}
              r={25}
              className="fill-primary/20 stroke-primary"
              strokeWidth={2}
            />
            <text
              x={100 + (i % 4) * 120}
              y={125 + Math.floor(i / 4) * 80}
              className="text-[10px] fill-white font-bold"
              textAnchor="middle"
            >
              {name.split(" ").map(n => n[0]).join(".")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function MatchupNetworkSimple({ data }: { data: MatchupData[] }) {
  const nodes = Array.from(new Set(data.flatMap(d => [d.source, d.target])));
  
  return (
    <div className="p-4 bg-black/20 rounded-xl">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {nodes.map((player, i) => {
          const connections = data.filter(d => d.source === player || d.target === player);
          const totalDismissals = connections.reduce((sum, d) => sum + d.dismissals, 0);
          return (
            <div key={player} className="relative group">
              <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/30 flex flex-col items-center justify-center p-3 hover:scale-105 transition-transform cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center mb-2">
                  <span className="text-xs font-bold text-white">
                    {player.split(" ").map(n => n[0]).join(".")}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-white text-center truncate max-w-full">
                  {player}
                </div>
                <div className="text-[9px] text-primary mt-1">
                  {totalDismissals} matchups
                </div>
              </div>
              {connections.length > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-[9px] font-bold flex items-center justify-center">
                  {connections.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-2">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white">{d.source}</span>
              <span className="text-primary">↔</span>
              <span className="text-[11px] font-bold text-white">{d.target}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-red-400">{d.dismissals} dismissals</span>
              <span className="text-cyan-400">SR {d.strikeRate}</span>
              <span className="text-amber-400">P {d.pressure}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
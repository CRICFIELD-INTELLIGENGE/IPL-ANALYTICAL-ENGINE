import React from "react";

interface PlayerTraits {
  name: string;
  type: string;
  aggression: number;
  consistency: number;
  stability: number;
  finishing: number;
  strikeRate: number;
  average: number;
}

interface PlayerArchetypeProps {
  player: PlayerTraits;
}

export function PlayerArchetypeRadial({ player }: PlayerArchetypeProps) {
  const traits = [
    { name: "Aggression", value: player.aggression },
    { name: "Consistency", value: player.consistency },
    { name: "Stability", value: player.stability },
    { name: "Finishing", value: player.finishing },
  ];

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{player.name}</div>
        <div className="flex items-center justify-center">
          <div className="relative w-[150px] h-[150px]">
            <svg viewBox="0 0 150 150" className="w-full h-full">
              <g transform="translate(75, 75)">
                {[0, 1, 2, 3].map((i) => {
                  const angle = (i * 90 - 45) * Math.PI / 180;
                  const x = Math.cos(angle) * 60;
                  const y = Math.sin(angle) * 60;
                  const trait = traits[i];
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
                        x={x * 1.2}
                        y={y * 1.2}
                        className="text-[9px] fill-white/60 font-bold"
                        textAnchor={x > 0 ? "start" : "end"}
                        dominantBaseline="middle"
                      >
                        {trait.name}
                      </text>
                      <circle
                        cx={x * trait.value / 100}
                        cy={y * trait.value / 100}
                        r={4}
                        fill="hsl(270 95% 65%)"
                      />
                    </g>
                  );
                })}
                
                <polygon
                  points={traits.map((t, i) => {
                    const angle = (i * 90 - 45) * Math.PI / 180;
                    const r = t.value * 0.5;
                    return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
                  }).join(" ")}
                  fill="hsl(270 95% 65% / 0.3)"
                  stroke="hsl(270 95% 65%)"
                  strokeWidth={2}
                />
              </g>
            </svg>
          </div>
        </div>
        
        <div className="mt-3 text-center">
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary font-bold">
            {player.type}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4 text-center">
          <div className="p-2 rounded-lg bg-white/[0.03]">
            <div className="text-[9px] text-white/40">Strike Rate</div>
            <div className="text-sm font-bold text-white">{player.strikeRate}</div>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.03]">
            <div className="text-[9px] text-white/40">Average</div>
            <div className="text-sm font-bold text-white">{player.average}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerSpiderChart({ player }: PlayerArchetypeProps) {
  const axes = ["Aggression", "Consistency", "Stability", "Finishing"];
  const values = [player.aggression, player.consistency, player.stability, player.finishing];

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{player.name} - Trait Cluster</div>
        <div className="flex items-center justify-center">
          <div className="relative w-[180px] h-[180px]">
            <svg viewBox="0 0 180 180" className="w-full h-full">
              <g transform="translate(90, 90)">
                {axes.map((axis, i) => {
                  const angle = (i * 90 - 45) * Math.PI / 180;
                  const x = Math.cos(angle) * 70;
                  const y = Math.sin(angle) * 70;
                  return (
                    <g key={axis}>
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
                        className="text-[8px] fill-white/40 font-bold"
                        textAnchor={x > 0 ? "start" : "end"}
                        dominantBaseline="middle"
                      >
                        {axis}
                      </text>
                    </g>
                  );
                })}
                
                <polygon
                  points={values.map((v, i) => {
                    const angle = (i * 90 - 45) * Math.PI / 180;
                    const r = v;
                    return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
                  }).join(" ")}
                  fill="hsl(270 95% 65% / 0.4)"
                  stroke="hsl(270 95% 65%)"
                  strokeWidth={2}
                />
              </g>
            </svg>
          </div>
        </div>
        
        <div className="text-center mt-2">
          <div className="text-[10px] font-bold text-primary">{player.type}</div>
        </div>
      </div>
    </div>
  );
}

export function PlayerAttributeRings({ player }: PlayerArchetypeProps) {
  const attributes = [
    { name: "Tempo", value: player.strikeRate / 200 * 100, color: "hsl(270 95% 65%)" },
    { name: "Anchor", value: player.stability, color: "hsl(320 100% 65%)" },
    { name: "Finisher", value: player.finishing, color: "hsl(45 95% 60%)" },
  ];

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">{player.name}</div>
        <div className="flex flex-col gap-3">
          {attributes.map((attr, i) => (
            <div key={attr.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/60">{attr.name}</span>
                <span className="text-[10px] text-primary font-bold">{Math.round(attr.value)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ 
                    width: `${attr.value}%`,
                    backgroundColor: attr.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ARCHETYPE_PLAYERS: PlayerTraits[] = [
  { name: "V Kohli", type: "Anchor", aggression: 65, consistency: 95, stability: 90, finishing: 70, strikeRate: 134, average: 39.69 },
  { name: "SKY", type: "Finisher", aggression: 90, consistency: 70, stability: 60, finishing: 95, strikeRate: 140, average: 35 },
  { name: "MS Dhoni", type: "Finisher", aggression: 75, consistency: 80, stability: 85, finishing: 90, strikeRate: 138, average: 38.3 },
  { name: "Andre Russell", type: "Chaos Disruptor", aggression: 95, consistency: 60, stability: 50, finishing: 85, strikeRate: 150, average: 32 },
  { name: "SR Watson", type: "Utility", aggression: 80, consistency: 75, stability: 70, finishing: 80, strikeRate: 135, average: 37 },
];

export function PlayerArchetypeGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {ARCHETYPE_PLAYERS.map((player) => (
        <PlayerArchetypeRadial key={player.name} player={player} />
      ))}
    </div>
  );
}
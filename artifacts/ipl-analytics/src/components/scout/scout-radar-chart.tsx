import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import type { RadarMetric, ScoutComparePlayer } from "@/lib/scout-api";

interface ScoutRadarProps {
  metrics: RadarMetric[];
  players: ScoutComparePlayer[];
}

const PLAYER_COLORS = [
  { stroke: "#F59E0B", fill: "#F59E0B", hex: "#F59E0B", name: "Player 1" },
  { stroke: "#06B6D4", fill: "#06B6D4", hex: "#06B6D4", name: "Player 2" },
  { stroke: "#10B981", fill: "#10B981", hex: "#10B981", name: "Player 3" },
  { stroke: "#EC4899", fill: "#EC4899", hex: "#EC4899", name: "Player 4" },
  { stroke: "#8B5CF6", fill: "#8B5CF6", hex: "#8B5CF6", name: "Player 5" },
];

export function ScoutRadarComparison({ metrics, players }: ScoutRadarProps) {
  if (!metrics || metrics.length === 0 || !players || players.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-white/40 text-xs italic">
        Insufficient metric data for radar comparison.
      </div>
    );
  }

  // Players without percentiles (fewer than 120 balls in the window) are listed, not
  // plotted: drawing them at 0 would read as "worst in the league".
  const ranked = players.filter((p) => metrics.some((m) => m.values[p.player.cricsheet_id] != null));
  const unranked = players.filter((p) => !ranked.includes(p));

  // Transform data for Recharts: each row is a metric with player values
  const chartData = metrics.map((m) => {
    const row: Record<string, any> = {
      subject: m.label,
      metricKey: m.metric,
      unit: m.unit,
      better: m.better,
    };
    ranked.forEach((p) => {
      const val = m.values[p.player.cricsheet_id];
      row[p.player.cricsheet_id] = val != null ? val : 0;
    });
    return row;
  });

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-[320px] sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#334155" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              stroke="#94A3B8"
              tick={{ fill: "#CBD5E1", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              stroke="#475569"
              tick={{ fill: "#64748B", fontSize: 9 }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const metricDef = metrics.find((m) => m.label === label);
                  return (
                    <div className="rounded-xl bg-[#0F172A]/95 border border-white/20 p-3 shadow-2xl backdrop-blur-md">
                      <p className="text-xs font-black text-white mb-1">{label}</p>
                      {metricDef && (
                        <p className="text-[10px] text-white/50 mb-2 uppercase tracking-wide">
                          League percentile · 100 = best ({metricDef.better} is better)
                        </p>
                      )}
                      <div className="space-y-1">
                        {payload.map((entry: any, index: number) => {
                          const player = players.find(
                            (p) => p.player.cricsheet_id === entry.dataKey
                          );
                          const name = player
                            ? player.player.unique_name || player.player.name
                            : entry.dataKey;
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-4 text-xs font-mono"
                            >
                              <span className="flex items-center gap-1.5 font-sans">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-white/80">{name}:</span>
                              </span>
                              <span className="font-bold text-white">
                                {entry.value != null ? Number(entry.value).toFixed(1) : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {ranked.map((p, idx) => {
              const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
              const playerName = p.player.unique_name || p.player.name;
              return (
                <Radar
                  key={p.player.cricsheet_id}
                  name={playerName}
                  dataKey={p.player.cricsheet_id}
                  stroke={color.stroke}
                  fill={color.fill}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              );
            })}
            <Legend
              wrapperStyle={{ paddingTop: "12px", fontSize: "11px", fontWeight: "bold" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-white/40 tracking-wide text-center mt-2 max-w-md">
        Values are percentiles within each player's own league (0–100, 100 = best, direction-aware), ranked against every player with 120+ balls in the window. Percentiles from different leagues are not directly comparable.
      </p>
      {unranked.length > 0 && (
        <p className="text-[11px] text-amber-200/80 text-center mt-1">
          Not plotted (fewer than 120 balls in this window, so no percentile):{" "}
          {unranked.map((p) => p.player.unique_name || p.player.name).join(", ")}
        </p>
      )}
    </div>
  );
}

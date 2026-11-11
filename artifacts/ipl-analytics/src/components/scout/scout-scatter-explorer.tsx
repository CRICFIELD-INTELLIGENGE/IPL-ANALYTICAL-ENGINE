import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import type { ScoutRating, Discipline } from "@/lib/scout-api";
import { Sparkles, Info } from "lucide-react";

interface ScoutScatterExplorerProps {
  ratings: ScoutRating[];
  discipline: Discipline;
  onSelectPlayer: (player: ScoutRating) => void;
  selectedPlayerId?: string | null;
}

const LEAGUE_COLORS: Record<string, string> = {
  ipl: "#F97316",   // Warm Orange
  smat: "#F59E0B",  // Amber
  bbl: "#0284C7",   // Sky Blue
  sa20: "#38BDF8",  // Light Cyan
  cpl: "#A855F7",   // Purple
  ilt20: "#F43F5E",  // Coral Rose
};

export function ScoutScatterExplorer({
  ratings,
  discipline,
  onSelectPlayer,
  selectedPlayerId,
}: ScoutScatterExplorerProps) {
  const primaryMetricKey = discipline === "batting" ? "strike_rate" : "economy";

  // Filter valid data points with sample > 0 and computed shrunk index
  const plotData = ratings
    .filter((r) => r.balls > 0 && r.metrics[primaryMetricKey]?.shrunk != null)
    .map((r) => {
      const metric = r.metrics[primaryMetricKey];
      return {
        id: r.cricsheet_id,
        name: r.name,
        competition: r.competition.toLowerCase(),
        role: r.role?.label ? r.role.label.replace(/_/g, " ") : "Specialist",
        balls: r.balls,
        shrunkIndex: Number(metric.shrunk!.toFixed(1)),
        rawIndex: metric.index != null ? Number(metric.index.toFixed(1)) : null,
        tier: r.tier,
        rawRating: r,
      };
    });

  if (plotData.length === 0) {
    return (
      <div className="h-72 rounded-2xl bg-[#14212A] border border-white/10 flex flex-col items-center justify-center p-6 text-center text-[#9BAAB5] space-y-2">
        <Sparkles className="w-6 h-6 text-[#F4B96C]" />
        <p className="text-sm font-semibold">Insufficient data to plot gems scatter distribution.</p>
        <p className="text-xs">Adjust minimum balls or league filters to populate the scatter plot.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#14212A] border border-white/10 p-5 space-y-4">
      {/* Title & Quadrant Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F4B96C]" />
            <h3 className="font-display text-base font-bold text-[#F5F7F8] uppercase tracking-wide">
              HIDDEN GEMS EXPLORER — SAMPLE VS PERFORMANCE
            </h3>
          </div>
          <p className="font-body text-xs text-[#9BAAB5] mt-0.5">
            X-Axis: Sample Volume (Balls) • Y-Axis: League-Adjusted Shrunk Index (100 = Par)
          </p>
        </div>

        {/* League Color Legend */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(LEAGUE_COLORS).map(([code, color]) => (
            <div key={code} className="flex items-center gap-1.5 text-[10px] font-mono text-[#9BAAB5]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="uppercase">{code}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quadrants Guidance Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="p-2 rounded-lg bg-[#0B1118]/60 border border-white/5 text-orange-400">
          <strong className="block text-[#F5F7F8]">Top Right: Proven Elite</strong>
          High Rating + High Volume (≥120b)
        </div>
        <div className="p-2 rounded-lg bg-[#0B1118]/60 border border-white/5 text-amber-400">
          <strong className="block text-[#F5F7F8]">Top Left: Breakout Gems</strong>
          High Rating + Emerging Volume (&lt;120b)
        </div>
        <div className="p-2 rounded-lg bg-[#0B1118]/60 border border-white/5 text-sky-400">
          <strong className="block text-[#F5F7F8]">Baseline (Y=100)</strong>
          Expected League Average Level
        </div>
        <div className="p-2 rounded-lg bg-[#0B1118]/60 border border-white/5 text-[#9BAAB5]">
          <strong className="block text-[#F5F7F8]">Lower Half</strong>
          Developing Sample Band
        </div>
      </div>

      {/* Scatter Chart Container */}
      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 25, bottom: 25, left: 10 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const item = e.activePayload[0].payload;
                if (item?.rawRating) onSelectPlayer(item.rawRating);
              }
            }}
          >
            <XAxis
              type="number"
              dataKey="balls"
              name="Balls"
              stroke="#64748B"
              tick={{ fill: "#9BAAB5", fontSize: 11, fontFamily: "JetBrains Mono" }}
              label={{
                value: "Sample Volume (Balls Faced / Bowled)",
                position: "insideBottom",
                offset: -12,
                fill: "#9BAAB5",
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="shrunkIndex"
              name="Shrunk Index"
              domain={["auto", "auto"]}
              stroke="#64748B"
              tick={{ fill: "#9BAAB5", fontSize: 11, fontFamily: "JetBrains Mono" }}
              label={{
                value: discipline === "batting" ? "Shrunk SR Index" : "Shrunk Econ Index",
                angle: -90,
                position: "insideLeft",
                offset: 5,
                fill: "#9BAAB5",
                fontSize: 11,
              }}
            />
            <ZAxis range={[70, 70]} />

            {/* Reference Line for 100 Baseline */}
            <ReferenceLine
              y={100}
              stroke="#4CC9C0"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "100 (League Par)",
                fill: "#4CC9C0",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />

            {/* Reference Line for 120 Rankable Sample */}
            <ReferenceLine
              x={120}
              stroke="#F97316"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "120b Baseline",
                fill: "#F97316",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />

            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  const isSelected = selectedPlayerId === d.id;
                  return (
                    <div className="rounded-xl bg-[#0B1118]/95 border border-white/20 p-3 shadow-2xl backdrop-blur-md min-w-[210px] space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                        <strong className="text-sm font-display text-[#F5F7F8] truncate font-bold">
                          {d.name}
                        </strong>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-[#0B1118]"
                          style={{ backgroundColor: LEAGUE_COLORS[d.competition] || "#F97316" }}
                        >
                          {d.competition}
                        </span>
                      </div>

                      <div className="flex justify-between text-[#9BAAB5] text-[11px]">
                        <span>Role:</span>
                        <span className="text-[#F5F7F8] capitalize font-sans">{d.role}</span>
                      </div>

                      <div className="flex justify-between text-[#9BAAB5] text-[11px]">
                        <span>Impact Rating:</span>
                        <strong className="text-orange-400">{d.shrunkIndex}</strong>
                      </div>

                      <div className="flex justify-between text-[#9BAAB5] text-[11px]">
                        <span>Volume:</span>
                        <span className="text-[#F5F7F8]">{d.balls} balls</span>
                      </div>

                      <div className="flex justify-between text-[#9BAAB5] text-[10px] pt-1 border-t border-white/5">
                        <span>Sample Tier:</span>
                        <span className="uppercase text-sky-400">{d.tier}</span>
                      </div>

                      <p className="text-[9px] text-amber-400 text-center pt-1 font-sans">
                        Click dot to inspect dossier
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Scatter
              data={plotData}
              animationDuration={500}
              onClick={(entry) => {
                if (entry?.rawRating) onSelectPlayer(entry.rawRating);
              }}
            >
              {plotData.map((entry, index) => {
                const color = LEAGUE_COLORS[entry.competition] || "#F97316";
                const isSelected = selectedPlayerId === entry.id;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                    stroke={isSelected ? "#FFFFFF" : "rgba(0,0,0,0.5)"}
                    strokeWidth={isSelected ? 2.5 : 0.8}
                    fillOpacity={isSelected ? 1 : 0.8}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] font-mono text-[#9BAAB5] flex items-center justify-between border-t border-white/5 pt-2">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#4CC9C0]" />
          <span>Interactive scatter plot: hover to read telemetry, click any player dot to load their dossier.</span>
        </span>
        <span className="text-white/40">Showing {plotData.length} active players</span>
      </div>
    </div>
  );
}

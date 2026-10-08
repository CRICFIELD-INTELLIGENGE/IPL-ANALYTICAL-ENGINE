import React, { useState } from "react";

interface DimensionFilter {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

interface DataExplorerProps {
  dimensions: DimensionFilter[];
  onQuery: (filters: Record<string, string>) => void;
}

export function DimensionalFilterSystem({ dimensions, onQuery }: DataExplorerProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onQuery(newFilters);
  };

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="text-xs font-bold text-white mb-3">Dimensional Filter System</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {dimensions.map((dim) => (
            <div key={dim.label}>
              <label className="text-[9px] text-white/40 uppercase mb-1 block">{dim.label}</label>
              <select
                value={filters[dim.label] || ""}
                onChange={(e) => handleFilter(dim.label, e.target.value)}
                className="w-full text-[11px] bg-white/[0.05] border border-white/10 rounded px-2 py-1 text-white"
              >
                <option value="">All</option>
                {dim.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(filters).filter(([_, v]) => v).map(([key, value]) => (
            <div 
              key={key}
              className="px-2 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1"
            >
              {key}: {value}
              <button 
                onClick={() => handleFilter(key, "")}
                className="hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DynamicChartSelectorProps {
  query: string;
  data: any[];
}

export function DynamicQueryOutput({ query, data }: DynamicChartSelectorProps) {
  const chartTypes = ["scatter", "sankey", "heatmap", "matchup"];
  const [selectedChart, setSelectedChart] = useState<string>("scatter");

  const renderChart = () => {
    switch (selectedChart) {
      case "scatter":
        return (
          <div className="grid grid-cols-3 gap-2">
            {data.slice(0, 6).map((d, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-white">{d.name || d.player}</div>
                <div className="text-sm font-bold text-primary">{d.value || d.runs}</div>
              </div>
            ))}
          </div>
        );
      case "sankey":
        return (
          <div className="text-center py-8 text-white/40">
            Sankey visualization for {query}
          </div>
        );
      case "heatmap":
        return (
          <div className="grid grid-cols-4 gap-1">
            {data.slice(0, 8).map((d, i) => (
              <div 
                key={i}
                className="aspect-square rounded bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px]"
                style={{ backgroundColor: `rgba(139, 92, 246, ${Math.random() * 0.5 + 0.3})` }}
              >
                {d.value || d.runs}
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="text-center py-8 text-white/40">
            Select visualization type
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      <div className="bg-black/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-white">Query: {query}</div>
          <div className="flex gap-1">
            {chartTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedChart(type)}
                className={`px-2 py-1 text-[10px] font-bold rounded ${
                  selectedChart === type 
                    ? "bg-primary text-white" 
                    : "bg-white/[0.05] text-white/60 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        {renderChart()}
      </div>
    </div>
  );
}
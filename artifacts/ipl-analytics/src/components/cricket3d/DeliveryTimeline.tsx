import React from 'react';
import { NormalizedDelivery } from '../../lib/cricket3d/deliveryAdapter';

interface DeliveryTimelineProps {
  deliveries: NormalizedDelivery[];
  selectedDeliveryId: string | null;
  onSelectDelivery: (delivery: NormalizedDelivery) => void;
  filterMode: 'all' | 'boundaries' | 'fours' | 'sixes';
  onFilterChange: (mode: 'all' | 'boundaries' | 'fours' | 'sixes') => void;
}

export const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({
  deliveries,
  selectedDeliveryId,
  onSelectDelivery,
  filterMode,
  onFilterChange,
}) => {
  const filtered = deliveries.filter(d => {
    if (filterMode === 'boundaries') return d.boundaryType === 'FOUR' || d.boundaryType === 'SIX';
    if (filterMode === 'fours') return d.boundaryType === 'FOUR';
    if (filterMode === 'sixes') return d.boundaryType === 'SIX';
    return true;
  });

  return (
    <div className="w-full bg-[#080d19]/90 border border-slate-800/80 rounded-xl p-3 backdrop-blur-md shadow-2xl">
      {/* Top Bar: Controls & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold tracking-wider text-slate-300 uppercase text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Ball-by-Ball Telemetry ({filtered.length} Deliveries)
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Balls
          </button>
          <button
            onClick={() => onFilterChange('boundaries')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
              filterMode === 'boundaries'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Boundaries (4s & 6s)
          </button>
          <button
            onClick={() => onFilterChange('sixes')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
              filterMode === 'sixes'
                ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sixes (6)
          </button>
          <button
            onClick={() => onFilterChange('fours')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
              filterMode === 'fours'
                ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fours (4)
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Ball Track */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {filtered.map((d) => {
          const isSelected = d.id === selectedDeliveryId;
          const isSix = d.boundaryType === 'SIX';
          const isFour = d.boundaryType === 'FOUR';

          // Color encoding compliant with official broadcast standards
          let badgeBg = 'bg-slate-800/80 border-slate-700 text-slate-400';
          let runLabel = d.runsOffBat.toString();

          if (isSix) {
            badgeBg = isSelected
              ? 'bg-amber-500 border-amber-300 text-black font-extrabold ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'bg-amber-950/70 border-amber-600/70 text-amber-300 hover:bg-amber-900/80';
            runLabel = '6';
          } else if (isFour) {
            badgeBg = isSelected
              ? 'bg-sky-500 border-sky-300 text-black font-extrabold ring-2 ring-sky-400/80 shadow-[0_0_12px_rgba(14,165,233,0.5)]'
              : 'bg-sky-950/70 border-sky-600/70 text-sky-300 hover:bg-sky-900/80';
            runLabel = '4';
          } else if (d.runsOffBat === 0) {
            badgeBg = isSelected
              ? 'bg-slate-600 border-slate-400 text-white font-bold ring-2 ring-slate-400'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800';
            runLabel = '•';
          } else if (d.runsOffBat === 1) {
            badgeBg = isSelected
              ? 'bg-cyan-600 border-cyan-400 text-white font-bold ring-2 ring-cyan-400'
              : 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300 hover:bg-cyan-900/40';
          } else if (d.runsOffBat === 2) {
            badgeBg = isSelected
              ? 'bg-emerald-600 border-emerald-400 text-white font-bold ring-2 ring-emerald-400'
              : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/40';
          }

          return (
            <button
              key={d.id}
              onClick={() => onSelectDelivery(d)}
              className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[54px] px-2 py-1.5 rounded-lg border transition-all duration-150 ${badgeBg}`}
            >
              <span className="text-[10px] font-mono tracking-tighter opacity-80">
                {d.over}.{d.ball}
              </span>
              <span className="text-sm font-black leading-tight my-0.5">
                {runLabel}
              </span>
              <span className="text-[9px] font-mono truncate max-w-[48px] opacity-75">
                {d.shotDirection.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-2 px-4 text-xs text-slate-500 italic">
            No deliveries match current filter.
          </div>
        )}
      </div>
    </div>
  );
};

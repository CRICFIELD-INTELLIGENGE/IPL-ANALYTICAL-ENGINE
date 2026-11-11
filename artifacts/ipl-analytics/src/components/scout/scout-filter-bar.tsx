import React, { useState } from "react";
import { ChevronDown, BarChart3, ArrowRight, RotateCcw } from "lucide-react";
import type { Discipline, MatchPhase } from "@/lib/scout-api";

interface ScoutFilterBarProps {
  discipline: Discipline;
  setDiscipline: (d: Discipline) => void;
  selectedComps: string[];
  setSelectedComps: React.Dispatch<React.SetStateAction<string[]>>;
  phase: MatchPhase;
  setPhase: (p: MatchPhase) => void;
  role: string;
  setRole: (r: string) => void;
  onFind: () => void;
  onClear?: () => void;
}

const COMPS = [
  { code: "ipl", name: "IPL" },
  { code: "smat", name: "SMAT" },
  { code: "bbl", name: "BBL" },
  { code: "sa20", name: "SA20" },
  { code: "cpl", name: "CPL" },
  { code: "ilt20", name: "ILT20" },
];

const BATTING_ROLES = [
  { id: "", label: "All Roles" },
  { id: "opener", label: "Opener" },
  { id: "top_order", label: "Top-order Batter" },
  { id: "middle_order", label: "Middle-order Batter" },
  { id: "finisher", label: "Finisher" },
  { id: "lower_order", label: "Lower Order" },
];

const BOWLING_ROLES = [
  { id: "", label: "All Roles" },
  { id: "powerplay_specialist", label: "Powerplay Specialist" },
  { id: "middle_specialist", label: "Middle Specialist" },
  { id: "death_specialist", label: "Death Specialist" },
  { id: "multi_phase", label: "Multi-Phase Bowler" },
];

const PHASES = [
  { id: "all", label: "All Phases" },
  { id: "powerplay", label: "Powerplay (1–6)" },
  { id: "middle", label: "Middle (7–15)" },
  { id: "death", label: "Death (16–20)" },
];

function SelectDropdown({
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/35 flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-[#131E30] border border-white/10 rounded-xl px-3 py-2 pr-7 text-[11px] font-bold text-white/90 focus:outline-none focus:border-orange-500/50 cursor-pointer w-full transition-all hover:border-white/20"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id} className="bg-[#131E30]">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      </div>
    </div>
  );
}

export function ScoutFilterBar({
  discipline,
  setDiscipline,
  selectedComps,
  setSelectedComps,
  phase,
  setPhase,
  role,
  setRole,
  onFind,
  onClear,
}: ScoutFilterBarProps) {
  const roles = discipline === "batting" ? BATTING_ROLES : BOWLING_ROLES;
  const leagueLabel = selectedComps.length === 0
    ? "All Leagues"
    : selectedComps.length === 1
    ? COMPS.find((c) => c.code === selectedComps[0])?.name || "1 League"
    : `${selectedComps.length} Leagues`;

  const [leagueOpen, setLeagueOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 px-4 py-3 bg-[#0F1A2A] border-b border-white/[0.06]">
      {/* Discipline Toggle */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/35">
          Discipline
        </span>
        <div className="inline-flex rounded-xl bg-[#131E30] border border-white/10 p-0.5">
          {(["batting", "bowling"] as Discipline[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDiscipline(d); setRole(""); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                discipline === d
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Player Role */}
      <SelectDropdown
        label="Player Role"
        icon={BarChart3}
        value={role}
        onChange={setRole}
        options={roles}
      />

      {/* Leagues — multi-select with dropdown */}
      <div className="flex flex-col gap-0.5 relative">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/35 flex items-center gap-1">
          <span>🌐</span> Leagues
        </span>
        <button
          type="button"
          onClick={() => setLeagueOpen((v) => !v)}
          className="flex items-center gap-2 bg-[#131E30] border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white/90 focus:outline-none hover:border-white/20 transition-all cursor-pointer"
        >
          <span>{leagueLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${leagueOpen ? "rotate-180" : ""}`} />
        </button>
        {leagueOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[#131E30] border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-1.5 w-40">
            <button
              type="button"
              onClick={() => { setSelectedComps([]); setLeagueOpen(false); }}
              className="text-[11px] font-bold text-left px-2 py-1 rounded-lg hover:bg-white/[0.05] text-white/60 hover:text-white/90 transition-all cursor-pointer"
            >
              All Leagues
            </button>
            {COMPS.map((c) => {
              const active = selectedComps.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedComps((prev) =>
                      prev.includes(c.code)
                        ? prev.filter((x) => x !== c.code)
                        : [...prev, c.code]
                    );
                  }}
                  className={`flex items-center gap-2 text-[11px] font-bold text-left px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    active
                      ? "bg-orange-500/15 text-orange-400"
                      : "text-white/60 hover:text-white/90 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${active ? "bg-orange-500 border-orange-500" : "border-white/20"}`}>
                    {active && <span className="text-white text-[8px] font-black">✓</span>}
                  </span>
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Phase */}
      <SelectDropdown
        label="Match Phase"
        icon={BarChart3}
        value={phase}
        onChange={(v) => setPhase(v as MatchPhase)}
        options={PHASES}
      />

      {/* Find Players CTA */}
      <button
        type="button"
        onClick={() => { setLeagueOpen(false); onFind(); }}
        className="ml-auto sm:ml-0 flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
      >
        Find Players
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 transition-all cursor-pointer"
          title="Reset filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

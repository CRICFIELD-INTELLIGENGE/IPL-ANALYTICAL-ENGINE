import { Filter, X } from "lucide-react";
import type { SeasonRow, TeamRow, VenueRow } from "@/lib/aggregates";

export interface SlicerState {
  season: string;
  team: string;
  venue: string;
  phase: "all" | "powerplay" | "middle" | "death";
  role: "batting" | "bowling" | "both";
  innings: "all" | "1st" | "2nd";
  result: "all" | "wins" | "losses";
  toss: "all" | "bat" | "field";
  dayNight: "all" | "day" | "night";
  margin: "all" | "close" | "comfortable" | "blowout";
}

export const DEFAULT_SLICERS: SlicerState = {
  season: "all",
  team: "all",
  venue: "all",
  phase: "all",
  role: "both",
  innings: "all",
  result: "all",
  toss: "all",
  dayNight: "all",
  margin: "all",
};

export function SlicerPanel({
  state,
  onChange,
  seasons,
  teams,
  venues,
}: {
  state: SlicerState;
  onChange: (next: SlicerState) => void;
  seasons: SeasonRow[];
  teams: TeamRow[];
  venues: VenueRow[];
}) {
  const set = <K extends keyof SlicerState>(k: K, v: SlicerState[K]): void => onChange({ ...state, [k]: v });
  const reset = (): void => onChange(DEFAULT_SLICERS);
  const activeCount = (Object.keys(state) as (keyof SlicerState)[])
    .filter((k) => state[k] !== DEFAULT_SLICERS[k]).length;

  return (
    <div className="glass-strong rounded-2xl p-4 sticky top-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-accent" />
          <h3 className="font-display font-bold text-sm tracking-wide">10 SLICERS</h3>
        </div>
        {activeCount > 0 && (
          <button
            onClick={reset}
            aria-label="Reset all slicers"
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Reset {activeCount}
          </button>
        )}
      </div>

      <div className="dimension-slicing-scroll space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
        <Select label="Season" value={state.season} onChange={(v) => set("season", v)}
          options={[{ value: "all", label: "All seasons" }, ...seasons.map((s) => ({ value: s.season, label: s.season }))]} />

        <Select label="Team" value={state.team} onChange={(v) => set("team", v)}
          options={[{ value: "all", label: "All teams" }, ...teams.map((t) => ({ value: t.team, label: t.team }))]} />

        <Select label="Venue" value={state.venue} onChange={(v) => set("venue", v)}
          options={[{ value: "all", label: "All venues" }, ...venues.slice(0, 30).map((v) => ({ value: v.venue, label: v.venue }))]} />

        <ChipRow label="Phase" value={state.phase} onChange={(v) => set("phase", v as SlicerState["phase"])}
          options={[
            { value: "all", label: "All" }, { value: "powerplay", label: "PP" },
            { value: "middle", label: "Mid" }, { value: "death", label: "Death" },
          ]} />

        <ChipRow label="Role" value={state.role} onChange={(v) => set("role", v as SlicerState["role"])}
          options={[
            { value: "both", label: "Both" }, { value: "batting", label: "Bat" }, { value: "bowling", label: "Bowl" },
          ]} />

        <ChipRow label="Innings" value={state.innings} onChange={(v) => set("innings", v as SlicerState["innings"])}
          options={[
            { value: "all", label: "All" }, { value: "1st", label: "1st" }, { value: "2nd", label: "2nd" },
          ]} />

        <ChipRow label="Result" value={state.result} onChange={(v) => set("result", v as SlicerState["result"])}
          options={[
            { value: "all", label: "All" }, { value: "wins", label: "Wins" }, { value: "losses", label: "Losses" },
          ]} />

        <ChipRow label="Toss" value={state.toss} onChange={(v) => set("toss", v as SlicerState["toss"])}
          options={[
            { value: "all", label: "All" }, { value: "bat", label: "Bat" }, { value: "field", label: "Field" },
          ]} />

        <ChipRow label="Time" value={state.dayNight} onChange={(v) => set("dayNight", v as SlicerState["dayNight"])}
          options={[
            { value: "all", label: "All" }, { value: "day", label: "Day" }, { value: "night", label: "Night" },
          ]} />

        <ChipRow label="Margin" value={state.margin} onChange={(v) => set("margin", v as SlicerState["margin"])}
          options={[
            { value: "all", label: "All" }, { value: "close", label: "Close" },
            { value: "comfortable", label: "Comf" }, { value: "blowout", label: "Big" },
          ]} />
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-muted-foreground leading-relaxed space-y-1">
        <div>
          <span className="text-emerald-400 font-semibold">Season</span> drives the live data. {activeCount === 0 ? "All seasons shown." : `${activeCount} active filter${activeCount > 1 ? "s" : ""}.`}
        </div>
        <div className="text-[9px] opacity-70">
          Other slicers preview the filter UI — full multi-dimensional filtering ships in v2.
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background">{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function ChipRow({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
              value === o.value
                ? "bg-gradient-to-r from-primary/40 to-accent/20 text-white border-primary/40"
                : "bg-white/5 text-muted-foreground border-white/10 hover:border-white/30"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

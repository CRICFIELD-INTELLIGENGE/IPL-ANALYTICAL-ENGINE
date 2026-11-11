import { useState, useMemo } from "react";
import { Filter, Zap, RotateCcw, X, ChevronDown, Calendar, Users, Activity, MapPin, Shield, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SEASONS = ['2026','2025','2024','2023','2022','2021','2020','2019','2018','2017','2016','2015','2014','2013','2012','2011','2010','2009','2008'];
const TEAMS_OPT = ['CSK','MI','RCB','KKR','RR','DC','PBKS','SRH','GT','LSG','RPS','GL','PW','KTK'];
const PHASES = ['Powerplay','Middle','Death'];
const VENUES_OPT = ['Eden Gardens','Wankhede Stadium','M Chinnaswamy Stadium','MA Chidambaram Stadium','Rajiv Gandhi Stadium','Kotla','Dubai','Narendra Modi Stadium'];

type Filters = {
  season: string; team: string; phase: string; venue: string;
  innings: string; opposition: string; playoff: string; chaseDefend: string;
};

const DEFAULT: Filters = { season:'', team:'', phase:'', venue:'', innings:'', opposition:'', playoff:'', chaseDefend:'' };

interface Props {
  onApply: (f: Filters) => void;
  /** Dimensions to offer; show only those the caller's data can actually slice by. */
  fields?: ("season" | "team" | "phase" | "venue")[];
}

export function SmartFilters({ onApply, fields = ["season", "team", "phase", "venue"] }: Props) {
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [applied, setApplied] = useState<Filters>(DEFAULT);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const set = (k: keyof Filters, v: string) => setDraft(p => ({ ...p, [k]: v === 'all' ? '' : v }));
  const reset = () => setDraft(DEFAULT);
  const clearAll = () => { setDraft(DEFAULT); setApplied(DEFAULT); onApply(DEFAULT); };
  
  const apply = () => { 
    setIsRecalculating(true);
    setApplied(draft); 
    onApply(draft);
    setTimeout(() => setIsRecalculating(false), 800);
  };

  const draftCount = Object.values(draft).filter(Boolean).length;
  const appliedCount = Object.values(applied).filter(Boolean).length;
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(applied);

  return (
    <div className="flex flex-col gap-3 relative overflow-hidden">
      {isRecalculating && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Syncing...</span>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Dimensional Slicing</span>
          {appliedCount > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-[8px] font-black uppercase tracking-tighter">{appliedCount} Active</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {draftCount > 0 && (
            <button onClick={reset} className="text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Reset</button>
          )}
          <button
            onClick={apply}
            disabled={!hasChanges}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              hasChanges ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/20'
            }`}
          >
            <Zap className={`w-3 h-3 ${hasChanges ? 'animate-pulse' : ''}`} /> Apply
          </button>
        </div>
      </div>

      {/* Filter Grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr))` }}>
        {fields.includes('season') && <FilterSel label="Season" icon={Calendar} val={draft.season} opts={SEASONS} onChange={v=>set('season',v)} />}
        {fields.includes('team') && <FilterSel label="Team" icon={Users} val={draft.team} opts={TEAMS_OPT} onChange={v=>set('team',v)} />}
        {fields.includes('phase') && <FilterSel label="Phase" icon={Activity} val={draft.phase} opts={PHASES} onChange={v=>set('phase',v)} />}
        {fields.includes('venue') && <FilterSel label="Venue" icon={MapPin} val={draft.venue} opts={VENUES_OPT} onChange={v=>set('venue',v)} />}
      </div>
    </div>
  );
}

// A native <select> sits invisibly over the pill: its option list is drawn by the browser, so it can't be
// clipped by overflow-hidden ancestors (the old in-DOM dropdown was cut off inside the home page cards).
function FilterSel({ label, icon: Icon, val, opts, onChange }: { label: string; icon: any; val: string; opts: string[]; onChange: (v: string) => void }) {
  const active = !!val;

  return (
    <div className="relative">
      <select
        aria-label={label}
        value={val || 'all'}
        onChange={e => onChange(e.target.value)}
        className="peer absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
      >
        <option value="all" className="bg-[#0B1020]">All</option>
        {opts.map(o => <option key={o} value={o} className="bg-[#0B1020]">{o}</option>)}
      </select>
      <div
        aria-hidden="true"
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl peer-hover:bg-white/5 peer-focus-visible:border-primary/60 transition-all group ${active ? 'border-primary/20 bg-primary/5' : ''}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-primary' : 'text-white/20 group-hover:text-primary'}`} />
          <div className="flex flex-col items-start leading-none truncate">
            <span className="text-[6px] font-black uppercase tracking-[0.1em] text-white/20 truncate">{label}</span>
            <span className={`text-[9px] font-bold truncate ${active ? 'text-white' : 'text-white/40'}`}>{val || 'All'}</span>
          </div>
        </div>
        <ChevronDown className="w-2 h-2 text-white/30 shrink-0" />
      </div>
    </div>
  );
}

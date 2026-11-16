// Desktop Dimensional Slicing controls: compact trigger chips that open searchable, internally scrolling popovers.
// Radix Popover gives viewport-aware placement, focus trapping/return and Escape-to-close.
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, Check } from "lucide-react";

export type Option = { value: string; label: string; hint?: string };

const PANEL = "w-72 p-0 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] text-slate-900 dark:text-white shadow-2xl";
const MAX_RENDERED = 200; // shortcut: lists longer than this render the first 200 matches and ask for a narrower search, swap for a virtual list if users scroll past it

export function TriggerChip({ label, value, active, icon: Icon, ...rest }: { label: string; value: string; active?: boolean; icon?: any } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left transition-colors cursor-pointer max-w-[220px] ${active
        ? "border-amber-400/60 bg-amber-400/10"
        : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5"}`}>
      {Icon && <Icon className={`w-3 h-3 shrink-0 ${active ? "text-amber-500 dark:text-amber-300" : "text-slate-400 dark:text-white/30"}`} aria-hidden="true" />}
      <span className="flex flex-col leading-none min-w-0">
        <span className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-white/40">{label}</span>
        <span className="text-[10px] font-bold text-slate-800 dark:text-white/80 truncate">{value}</span>
      </span>
      <ChevronDown className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-white/30" aria-hidden="true" />
    </button>
  );
}

/** Keyboard: ArrowUp/Down move between options, Enter/Space toggles, Escape closes (Radix). */
function onListKeyDown(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[role=option]")];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next = items[event.key === "ArrowDown" ? Math.min(items.length - 1, at + 1) : Math.max(0, at - 1)];
  if (next) { event.preventDefault(); next.focus(); }
}

export function SelectPopover({ label, icon, options, value, onChange, multiple = false, allLabel, searchable, display }: {
  label: string; icon?: any; options: Option[];
  value: string[]; onChange: (next: string[]) => void;
  multiple?: boolean; allLabel: string; searchable?: boolean; display?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(value);
  const deferred = useDeferredValue(query);
  useEffect(() => { if (open) { setDraft(value); setQuery(""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)) : options;
  }, [options, deferred]);
  const labelOf = (v: string) => options.find(o => o.value === v)?.label ?? v;
  const shown = display ?? (value.length === 0 ? allLabel : value.length === 1 ? labelOf(value[0]) : `${labelOf(value[0])} +${value.length - 1}`);
  const pick = (v: string) => {
    if (!multiple) { onChange(v ? [v] : []); setOpen(false); return; }
    setDraft(d => d.includes(v) ? d.filter(x => x !== v) : [...d, v]);
  };
  const selected = multiple ? draft : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <TriggerChip label={label} value={shown} active={value.length > 0} icon={icon} aria-label={`${label}: ${shown}`} />
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className={PANEL}>
        {(searchable ?? options.length > 12) && (
          <div className="p-2 border-b border-slate-200 dark:border-white/10 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" aria-hidden="true" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label}`}
              className="w-full rounded-lg bg-slate-100 dark:bg-white/5 py-1.5 pl-7 pr-2 text-[11px] outline-none focus:ring-1 focus:ring-amber-400/60" />
          </div>
        )}
        <div role="listbox" aria-label={label} aria-multiselectable={multiple || undefined} onKeyDown={onListKeyDown}
          className="max-h-[300px] overflow-y-auto overscroll-contain py-1">
          {!multiple && (
            <Row selected={value.length === 0} onClick={() => pick("")}>{allLabel}</Row>
          )}
          {matches.slice(0, MAX_RENDERED).map(o => (
            <Row key={o.value} selected={selected.includes(o.value)} onClick={() => pick(o.value)} hint={o.hint}>{o.label}</Row>
          ))}
          {matches.length === 0 && <p className="px-3 py-3 text-[11px] text-slate-500 dark:text-white/50">No matches.</p>}
          {matches.length > MAX_RENDERED && (
            <p className="px-3 py-2 text-[10px] text-slate-500 dark:text-white/40">Showing {MAX_RENDERED} of {matches.length}. Type to narrow.</p>
          )}
        </div>
        {multiple && (
          <div className="flex items-center gap-2 border-t border-slate-200 dark:border-white/10 p-2">
            <span className="text-[10px] text-slate-500 dark:text-white/50 mr-auto">{draft.length || "None"} selected</span>
            <button type="button" className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setDraft([])}>Clear</button>
            <button type="button" className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="text-[10px] font-black px-3 py-1 rounded-lg bg-amber-400 text-black" onClick={() => { onChange(draft); setOpen(false); }}>Apply</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Row({ selected, onClick, children, hint }: { selected: boolean; onClick: () => void; children: ReactNode; hint?: string }) {
  return (
    <button type="button" role="option" aria-selected={selected} onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] font-bold outline-none focus:bg-slate-100 dark:focus:bg-white/10 ${selected ? "text-amber-600 dark:text-amber-300" : "text-slate-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5"}`}>
      <span className="w-3 shrink-0">{selected && <Check className="w-3 h-3" aria-hidden="true" />}</span>
      <span className="truncate">{children}</span>
      {hint && <span className="ml-auto text-[9px] text-slate-400 dark:text-white/30">{hint}</span>}
    </button>
  );
}

export type SeasonValue = { mode: "all" } | { mode: "single"; season: string } | { mode: "range"; from: string; to: string };

export const seasonLabel = (v: SeasonValue) =>
  v.mode === "all" ? "All Seasons" : v.mode === "single" ? v.season : v.from === v.to ? v.from : `${v.from}–${v.to}`;

export function SeasonPopover({ years, value, onChange, icon }: { years: string[]; value: SeasonValue; onChange: (v: SeasonValue) => void; icon?: any }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SeasonValue["mode"]>(value.mode);
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  useEffect(() => {
    if (!open) return;
    setMode(value.mode);
    setFrom(value.mode === "range" ? value.from : value.mode === "single" ? value.season : years[0] ?? "");
    setTo(value.mode === "range" ? value.to : value.mode === "single" ? value.season : years[years.length - 1] ?? "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const reversed = mode === "range" && from > to;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <TriggerChip label="Season" value={seasonLabel(value)} active={value.mode !== "all"} icon={icon} aria-label={`Season: ${seasonLabel(value)}`} />
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className={PANEL}>
        <div role="radiogroup" aria-label="Season mode" className="flex gap-1 p-2 border-b border-slate-200 dark:border-white/10">
          {(["all", "single", "range"] as const).map(m => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => {
              setMode(m);
              if (m === "all") { onChange({ mode: "all" }); setOpen(false); }
            }}
              className={`flex-1 rounded-lg py-1 text-[10px] font-black uppercase ${mode === m ? "bg-amber-400 text-black" : "hover:bg-slate-100 dark:hover:bg-white/5"}`}>
              {m === "all" ? "All" : m === "single" ? "Single" : "Range"}
            </button>
          ))}
        </div>
        {mode === "single" && (
          <YearList label="Season" years={years} value={value.mode === "single" ? value.season : ""} onPick={y => { onChange({ mode: "single", season: y }); setOpen(false); }} />
        )}
        {mode === "range" && (
          <>
            <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-white/10">
              <div className="bg-white dark:bg-[#0B1020]"><p className="px-3 pt-2 text-[9px] font-black uppercase text-slate-500 dark:text-white/40">From</p><YearList label="From season" years={years} value={from} onPick={setFrom} compact /></div>
              <div className="bg-white dark:bg-[#0B1020]"><p className="px-3 pt-2 text-[9px] font-black uppercase text-slate-500 dark:text-white/40">To</p><YearList label="To season" years={years} value={to} onPick={setTo} compact /></div>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-200 dark:border-white/10 p-2">
              <span role={reversed ? "alert" : undefined} className={`text-[10px] mr-auto ${reversed ? "text-red-500" : "text-slate-500 dark:text-white/50"}`}>
                {reversed ? "From must not be after To" : `${from}–${to}, inclusive`}
              </span>
              <button type="button" className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" disabled={reversed || !from || !to} className="text-[10px] font-black px-3 py-1 rounded-lg bg-amber-400 text-black disabled:opacity-40"
                onClick={() => { onChange(from === to ? { mode: "single", season: from } : { mode: "range", from, to }); setOpen(false); }}>Apply</button>
            </div>
          </>
        )}
        {mode === "all" && <p className="p-3 text-[11px] text-slate-500 dark:text-white/50">Every season in the database ({years[0]}–{years[years.length - 1]}).</p>}
      </PopoverContent>
    </Popover>
  );
}

function YearList({ label, years, value, onPick, compact }: { label: string; years: string[]; value: string; onPick: (y: string) => void; compact?: boolean }) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "nearest" }); }, []);
  const list = q ? years.filter(y => y.includes(q)) : [...years].reverse();
  return (
    <div>
      <div className="px-2 pt-2"><input value={q} onChange={e => setQ(e.target.value.replace(/\D/g, ""))} placeholder="Year" aria-label={`Search ${label}`} inputMode="numeric"
        className="w-full rounded-lg bg-slate-100 dark:bg-white/5 px-2 py-1 text-[11px] outline-none" /></div>
      <div ref={ref} role="listbox" aria-label={label} onKeyDown={onListKeyDown} className={`${compact ? "max-h-[200px]" : "max-h-[280px]"} overflow-y-auto overscroll-contain py-1`}>
        {list.map(y => <Row key={y} selected={y === value} onClick={() => onPick(y)}>{y}</Row>)}
      </div>
    </div>
  );
}

/** A generic popover wrapping arbitrary content (Match State, More filters). */
export function PanelPopover({ label, value, active, icon, children, width = "w-80", open, onOpenChange }: {
  label: string; value: string; active?: boolean; icon?: any; children: ReactNode; width?: string;
  open?: boolean; onOpenChange?: (o: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <TriggerChip label={label} value={value} active={active} icon={icon} aria-label={`${label}: ${value}`} />
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className={`${PANEL} ${width} max-h-[420px] overflow-y-auto overscroll-contain`}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

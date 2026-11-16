// "More" popover: the less common batter/bowler dimensions and sample thresholds, applied atomically.
import { useEffect, useState } from "react";
import { PanelPopover } from "./slicing-popover";

export type MoreValues = {
  battingPosition: string; matchResult: string; dateFrom: string; dateTo: string;
  minBalls: number; minInnings: number; minMatches: number;
};

export const BATTING_POSITIONS = [
  ["all", "All positions"], ["openers", "Openers (1–2)"], ["3", "No. 3"], ["4", "No. 4"], ["5", "No. 5"], ["6", "No. 6"], ["7+", "No. 7+"],
  ...Array.from({ length: 11 }, (_, i) => [String(i + 1), `Exactly ${i + 1}`]),
] as const;

export function MoreFiltersPopover({ value, onApply, showPosition, showResult }: { value: MoreValues; onApply: (v: MoreValues) => void; showPosition: boolean; showResult: boolean }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(value);
  useEffect(() => { if (open) setD(value); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = !!(d.dateFrom && d.dateTo && d.dateFrom > d.dateTo);
  const count = [value.battingPosition !== "all", value.matchResult !== "all", !!(value.dateFrom || value.dateTo), value.minBalls > 0, value.minInnings > 0, value.minMatches > 0].filter(Boolean).length;
  const n = (k: "minBalls" | "minInnings" | "minMatches", raw: string) => setD(x => ({ ...x, [k]: Math.min(10000, Math.max(0, Math.trunc(Number(raw) || 0))) }));
  const sel = "w-full rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] px-1 py-1 text-[11px]";

  return (
    <PanelPopover label="More" value={count ? `${count} active` : "Position, result, dates…"} active={count > 0} open={open} onOpenChange={setOpen}>
      <div className="p-3 grid grid-cols-2 gap-2 text-[11px]">
        {showPosition && <label className="col-span-2 grid gap-1">Batting position
          <select className={sel} value={d.battingPosition} onChange={e => setD(x => ({ ...x, battingPosition: e.target.value }))}>
            {BATTING_POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></label>}
        {showResult && <label className="col-span-2 grid gap-1">Match result (player's side)
          <select className={sel} value={d.matchResult} onChange={e => setD(x => ({ ...x, matchResult: e.target.value }))}>
            <option value="all">All results</option><option value="won">Won</option><option value="lost">Lost</option><option value="no result">No result / abandoned</option>
          </select></label>}
        <label className="grid gap-1">From date<input type="date" className={sel} value={d.dateFrom} onChange={e => setD(x => ({ ...x, dateFrom: e.target.value }))} /></label>
        <label className="grid gap-1">To date<input type="date" className={sel} value={d.dateTo} onChange={e => setD(x => ({ ...x, dateTo: e.target.value }))} /></label>
        <label className="grid gap-1">Min balls<input type="number" min={0} className={sel} value={d.minBalls || ""} onChange={e => n("minBalls", e.target.value)} /></label>
        <label className="grid gap-1">Min innings<input type="number" min={0} className={sel} value={d.minInnings || ""} onChange={e => n("minInnings", e.target.value)} /></label>
        <label className="grid gap-1">Min matches<input type="number" min={0} className={sel} value={d.minMatches || ""} onChange={e => n("minMatches", e.target.value)} /></label>
        {bad && <p role="alert" className="col-span-2 text-[10px] text-red-500">From date must not be after To date.</p>}
        <p className="col-span-2 text-[10px] text-slate-500 dark:text-white/40">Home / away is not offered: the warehouse has no verified home-ground mapping per franchise and season.</p>
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
            onClick={() => setD({ battingPosition: "all", matchResult: "all", dateFrom: "", dateTo: "", minBalls: 0, minInnings: 0, minMatches: 0 })}>Clear</button>
          <button type="button" className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setOpen(false)}>Cancel</button>
          <button type="button" disabled={bad} className="text-[10px] font-black px-3 py-1 rounded-lg bg-amber-400 text-black disabled:opacity-40" onClick={() => { onApply(d); setOpen(false); }}>Apply</button>
        </div>
      </div>
    </PanelPopover>
  );
}

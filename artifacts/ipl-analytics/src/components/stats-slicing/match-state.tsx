// Match State: one popover holding every per-ball game-state bound. Edits stay in a draft until Apply, so typing a
// number does not refetch the leaderboard on each keystroke.
import { useEffect, useState } from "react";
import { PanelPopover } from "./slicing-popover";

// Keys are the API's match-state params (stats-aggregator matchStateLimits), as min/max pairs.
export const MATCH_STATE_FIELDS = [
  { key: "RequiredRate", label: "Required run rate", max: 100, step: 0.1, chase: true },
  { key: "CurrentRate", label: "Current run rate", max: 100, step: 0.1, chase: false },
  { key: "RunsNeeded", label: "Runs required", max: 400, step: 1, chase: true },
  { key: "BallsLeft", label: "Balls remaining", max: 120, step: 1, chase: false },
  { key: "WicketsLeft", label: "Wickets remaining", max: 10, step: 1, chase: false },
  { key: "Target", label: "Target", max: 400, step: 1, chase: true },
  { key: "Score", label: "Current score", max: 400, step: 1, chase: false },
] as const;

export type MatchState = Partial<Record<`${"min" | "max"}${typeof MATCH_STATE_FIELDS[number]["key"]}`, number>>;

/** Problems that would make the slice contradictory or empty by construction. Exported for tests. */
export function matchStateProblems(s: MatchState, innings: string, overRange: [number, number] | null): string[] {
  const out: string[] = [];
  for (const f of MATCH_STATE_FIELDS) {
    const lo = s[`min${f.key}`], hi = s[`max${f.key}`];
    if (lo !== undefined && hi !== undefined && lo > hi) out.push(`${f.label}: minimum is above maximum`);
  }
  const chaseSet = MATCH_STATE_FIELDS.some(f => f.chase && (s[`min${f.key}`] !== undefined || s[`max${f.key}`] !== undefined));
  if (chaseSet && /1st/.test(innings)) out.push("Required rate, runs required and target only exist in a chase; switch Innings to 2nd or All");
  // Required rate is runs × 6 / balls: check the bounds the other two fields imply.
  const rLo = s.minRunsNeeded, rHi = s.maxRunsNeeded, bLo = s.minBallsLeft, bHi = s.maxBallsLeft;
  if (rHi !== undefined && bLo !== undefined && bLo > 0 && s.minRequiredRate !== undefined && (rHi * 6) / bLo < s.minRequiredRate)
    out.push(`At most ${rHi} needed from at least ${bLo} balls caps the required rate at ${((rHi * 6) / bLo).toFixed(2)}, below the minimum ${s.minRequiredRate}`);
  if (rLo !== undefined && bHi !== undefined && bHi > 0 && s.maxRequiredRate !== undefined && (rLo * 6) / bHi > s.maxRequiredRate)
    out.push(`At least ${rLo} needed from at most ${bHi} balls forces a required rate of ${((rLo * 6) / bHi).toFixed(2)}, above the maximum ${s.maxRequiredRate}`);
  if (overRange && bLo !== undefined && (20 - overRange[0] + 1) * 6 < bLo)
    out.push(`Overs ${overRange[0]}–${overRange[1]} leave at most ${(20 - overRange[0] + 1) * 6} balls, fewer than ${bLo}`);
  return out;
}

export function impliedRequiredRate(s: MatchState): string | null {
  const r = s.minRunsNeeded, b = s.minBallsLeft;
  if (r === undefined || b === undefined || r !== s.maxRunsNeeded || b !== s.maxBallsLeft || b === 0) return null;
  return `${r} from ${b} balls = required rate ${((r * 6) / b).toFixed(2)}`;
}

export function MatchStatePopover({ value, onApply, overRange, onOverRange, innings }: {
  value: MatchState; onApply: (s: MatchState) => void;
  overRange: string; onOverRange: (r: string) => void; innings: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MatchState>(value);
  const [overs, setOvers] = useState({ from: "", to: "" });
  useEffect(() => {
    if (!open) return;
    setDraft(value);
    const m = /^(\d+)-(\d+)$/.exec(overRange);
    setOvers(m ? { from: m[1], to: m[2] } : { from: "", to: "" });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const oFrom = Number(overs.from), oTo = Number(overs.to);
  const oversSet = overs.from !== "" && overs.to !== "";
  const oversBad = oversSet && (!(oFrom >= 1 && oTo <= 20) || oFrom > oTo);
  const problems = [...matchStateProblems(draft, innings, oversSet && !oversBad ? [oFrom, oTo] : null), ...(oversBad ? ["Over range must be within 1–20, From ≤ To"] : [])];
  const count = Object.keys(value).length + (overRange && overRange !== "All" ? 1 : 0);
  const set = (k: keyof MatchState, raw: string, max: number) => setDraft(d => {
    const next = { ...d };
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) delete next[k];
    else next[k] = Math.min(max, Math.max(0, n));
    return next;
  });
  const implied = impliedRequiredRate(draft);

  return (
    <PanelPopover label="Match State" value={count ? `${count} condition${count > 1 ? "s" : ""}` : "Any"} active={count > 0} open={open} onOpenChange={setOpen} width="w-[360px]">
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-[1fr_64px_64px] gap-x-2 gap-y-1.5 items-center text-[11px]">
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-white/40">Condition</span>
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-white/40">Min</span>
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-white/40">Max</span>
          {MATCH_STATE_FIELDS.map(f => (
            <Line key={f.key} label={f.label + (f.chase ? " (chase)" : "")}>
              {(["min", "max"] as const).map(side => {
                const k = `${side}${f.key}` as keyof MatchState;
                return <input key={side} type="number" min={0} max={f.max} step={f.step} value={draft[k] ?? ""} aria-label={`${side} ${f.label}`}
                  onChange={e => set(k, e.target.value, f.max)}
                  className="w-full rounded border border-slate-200 dark:border-white/10 bg-transparent px-1 py-0.5" />;
              })}
            </Line>
          ))}
          <Line label="Overs (custom range)">
            {(["from", "to"] as const).map(side => (
              <input key={side} type="number" min={1} max={20} value={overs[side]} aria-label={`Over ${side}`}
                onChange={e => setOvers(o => ({ ...o, [side]: e.target.value }))}
                className="w-full rounded border border-slate-200 dark:border-white/10 bg-transparent px-1 py-0.5" />
            ))}
          </Line>
        </div>
        {implied && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{implied}</p>}
        {problems.map(p => <p key={p} role="alert" className="text-[10px] text-red-500">{p}</p>)}
        <p className="text-[10px] text-slate-500 dark:text-white/40">Bounds are inclusive and checked before each ball. Chase values only exist in the 2nd innings.</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => { setDraft({}); setOvers({ from: "", to: "" }); }}>Clear</button>
          <button type="button" className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setOpen(false)}>Cancel</button>
          <button type="button" disabled={problems.length > 0} className="text-[10px] font-black px-3 py-1 rounded-lg bg-amber-400 text-black disabled:opacity-40"
            onClick={() => { onApply(draft); onOverRange(oversSet ? `${oFrom}-${oTo}` : "All"); setOpen(false); }}>Apply</button>
        </div>
      </div>
    </PanelPopover>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return <><span className="text-slate-700 dark:text-white/70">{label}</span>{children}</>;
}

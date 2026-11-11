// Season timeline: every IPL season, 2008 onward, as a row the reader can move
// through. Seasons the franchise played show its record and titles; seasons it
// did not play are greyed out and labelled, so pre-history reads as unavailable.
// High-visibility selected state with newest seasons first.

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import type { FranchiseRecord, SeasonRecord } from "@/lib/dugout-api";

export function SeasonTimeline({ record, allSeasons, season, onSeason, accent, franchiseName }: {
  record: FranchiseRecord | undefined;
  /** Every IPL season on record, oldest first. */
  allSeasons: string[];
  season: string | null;
  onSeason: (s: string) => void;
  accent: string;
  franchiseName: string;
}) {
  const bySeason = useMemo(() => {
    const m = new Map<string, SeasonRecord>();
    for (const s of record?.seasons ?? []) m.set(s.season, s);
    return m;
  }, [record]);

  const selected = season ? bySeason.get(season) : undefined;
  const displaySeasons = useMemo(() => [...allSeasons].reverse(), [allSeasons]);

  return (
    <section id="history" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-5 min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">
            {record?.firstSeason ? `${record.firstSeason}–${record.lastSeason}` : "2008 onward"}
          </div>
          <h2 className="font-display font-black text-xl uppercase tracking-tight text-white">Franchise timeline</h2>
        </div>
        {record && (record.titles?.count ?? 0) > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
            <Trophy className="w-3.5 h-3.5" /> {record.titles?.count}× champions ({record.titles?.years?.join(", ") ?? ""})
          </div>
        )}
      </header>

      {/* Season Selection Pills */}
      <div className="overflow-x-auto -mx-1 px-1 pb-2">
        <div role="listbox" aria-label="Seasons" className="flex gap-2 min-w-max py-1">
          {displaySeasons.map((s) => {
            const rec = bySeason.get(s);
            const isSel = s === season;
            const played = Boolean(rec);
            return (
              <button
                key={s}
                role="option"
                aria-selected={isSel}
                aria-disabled={!played}
                disabled={!played}
                onClick={() => played && onSeason(s)}
                className={`w-[96px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  !played
                    ? "border-white/5 bg-white/[0.015] text-white/25 cursor-not-allowed"
                    : isSel
                      ? "text-white font-bold ring-2 shadow-xl scale-[1.03] z-10"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white"
                }`}
                style={
                  played && isSel
                    ? {
                        borderColor: accent,
                        backgroundColor: `${accent}28`,
                        boxShadow: `0 0 16px ${accent}44`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <div className="font-display font-black text-sm tabular-nums">{s}</div>
                  {isSel && (
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
                  )}
                </div>
                {played && rec ? (
                  <>
                    <div className="text-[10px] tabular-nums text-white/70 mt-0.5 font-medium">{rec.won}W · {rec.lost}L</div>
                    <div className="mt-1 flex flex-wrap gap-1 min-h-[14px]">
                      {rec.champion && <Badge tone="amber">Champion</Badge>}
                      {!rec.champion && rec.runnerUp && <Badge tone="slate">Runner-up</Badge>}
                      {!rec.champion && !rec.runnerUp && rec.madePlayoffs && <Badge tone="cyan">Playoffs</Badge>}
                    </div>
                  </>
                ) : (
                  <div className="text-[9px] uppercase tracking-wider mt-1 text-white/30">Not played</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Season Detail Box */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 min-h-[88px]">
        {selected && season ? (
          <div className="grid sm:grid-cols-4 gap-4 text-sm">
            <Stat label={`${season} record`} value={`${selected.won} won · ${selected.lost} lost`} />
            <Stat label="Matches" value={`${selected.played}${selected.noResult ? ` (${selected.noResult} no result)` : ""}`} />
            <Stat label="Finish" value={selected.champion ? "Won the final 🏆" : selected.runnerUp ? "Lost the final 🥈" : selected.madePlayoffs ? "Reached the playoffs" : "League stage only"} />
            <Stat label="Squad" value={`See the squad above (${season})`} />
          </div>
        ) : (
          <p className="text-sm text-white/50">
            Choose any active season above to inspect {franchiseName}'s tournament finish, match results and squad performance.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="font-bold text-white mt-0.5">{value}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "amber" | "slate" | "cyan"; children: React.ReactNode }) {
  const cls = tone === "amber" ? "bg-amber-400/20 text-amber-200 border-amber-400/40" : tone === "cyan" ? "bg-cyan-400/15 text-cyan-200 border-cyan-400/30" : "bg-white/10 text-white/70 border-white/20";
  return <span className={`px-1.5 py-px rounded border text-[8px] font-black uppercase tracking-wider ${cls}`}>{children}</span>;
}

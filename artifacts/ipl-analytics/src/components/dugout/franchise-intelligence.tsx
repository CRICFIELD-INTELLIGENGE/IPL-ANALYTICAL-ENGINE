// Franchise intelligence for one season: phase scoring and bowling against the
// league in the same season, the franchise's exposed and strong areas, and links
// into the analysis tools. All figures come from the Squad DNA profile.

import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, Gavel, Map as MapIcon, Sparkles, Swords, BarChart2 } from "lucide-react";
import { fetchSquadProfile, fetchSquadTeams, type DimensionView } from "@/lib/sim-api";

const PHASE_ROWS: { key: string; label: string; kind: "bat" | "bowl" }[] = [
  { key: "pp_rr", label: "Powerplay scoring", kind: "bat" },
  { key: "mid_rr", label: "Middle-overs scoring", kind: "bat" },
  { key: "death_rr", label: "Death scoring", kind: "bat" },
  { key: "pp_econ", label: "Powerplay bowling", kind: "bowl" },
  { key: "mid_econ", label: "Middle-overs bowling", kind: "bowl" },
  { key: "death_econ", label: "Death bowling", kind: "bowl" },
];

export function FranchiseIntelligence({ teamName, code, season: dugoutSeason, accent }: { teamName: string; code: string; season: string; accent: string }) {
  // Follows the Dugout season, but any season in the Squad DNA record can be picked here.
  const [season, setSeason] = useState(dugoutSeason);
  useEffect(() => { setSeason(dugoutSeason); }, [dugoutSeason, teamName]);
  const dnaTeams = useQuery({ queryKey: ["squad-teams"], queryFn: fetchSquadTeams, staleTime: 60 * 60_000, retry: 1 });
  const dnaSeasons = (dnaTeams.data?.teams.find((t) => t.short === code || t.franchise === teamName)?.seasons ?? [])
    .map(String).sort((a, b) => Number(b) - Number(a));
  const seasonOptions = dnaSeasons.includes(season) ? dnaSeasons : [season, ...dnaSeasons];
  const profile = useQuery({
    queryKey: ["dugout-profile", teamName, season],
    queryFn: () => fetchSquadProfile(teamName, Number(season)),
    retry: false,
    staleTime: 10 * 60_000,
  });
  const p = profile.data;
  const byKey = (k: string): DimensionView | undefined => p?.dimensions.find((d) => d.key === k);
  const winPct = byKey("win_pct");

  return (
    <section id="intelligence" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-5 min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">{season} · against the league that season</div>
          <h2 className="font-display font-black text-xl uppercase tracking-tight text-white">Intelligence</h2>
        </div>
        <div className="flex items-center gap-3">
          {p && <div className="text-xs text-white/50 tabular-nums">{p.matches} matches in the record</div>}
          {seasonOptions.length > 1 && (
            <select
              aria-label="Squad DNA season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B1528] px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-white/40 cursor-pointer"
            >
              {seasonOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </header>

      {profile.isLoading && <p className="text-sm text-white/40">Loading the season profile…</p>}
      {profile.isError && (
        <p className="text-sm text-white/45">
          The season profile needs the analytics API, which is not reachable right now.
        </p>
      )}

      {p && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Win rate" value={winPct?.display ?? "—"} />
            <Tile label="Vulnerability" value={`${p.vulnerability.score}/100`} hint="Shortfall on the dimensions most linked with winning" />
            <Tile label="Matches" value={String(p.matches)} />
            <Tile label="Players used" value={String(p.roster.length)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-2 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Phase by phase · percentile among all IPL team-seasons</div>
              {PHASE_ROWS.map((row) => {
                const d = byKey(row.key);
                return (
                  <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-3 text-xs">
                    <span className="truncate text-white/75">{row.label}</span>
                    <div className="relative h-2 rounded bg-white/5" aria-hidden>
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                      {d?.score != null && <div className="absolute top-0 bottom-0 left-0 rounded" style={{ width: `${d.score}%`, background: accent, opacity: 0.85 }} />}
                    </div>
                    <span className="tabular-nums text-white/80 whitespace-nowrap">
                      {d?.display ?? "—"}
                      <span className="text-white/35"> {row.kind === "bat" ? "RR" : "econ"}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4 min-w-0">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-300/80 mb-1.5">Exposed on</div>
                {p.vulnerability.exposures.length ? (
                  <ul className="space-y-1 text-xs text-white/75">
                    {p.vulnerability.exposures.map((e) => (
                      <li key={e.label} className="flex justify-between gap-2"><span>{e.label}</span><span className="tabular-nums text-white/45">{e.score}th pct</span></li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-white/40">Nothing linked with winning sits in the bottom half this season.</p>}
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300/80 mb-1.5">Strongest at</div>
                {p.strengths.length ? (
                  <ul className="space-y-1 text-xs text-white/75">
                    {p.strengths.map((s) => (
                      <li key={s.label} className="flex justify-between gap-2"><span>{s.label}</span><span className="tabular-nums text-white/45">{s.score}th pct</span></li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-white/40">No dimension in the top fifth this season.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <ToolLink href={`/ai-analyst/squad-dna?team=${encodeURIComponent(teamName)}&season=${season}`} icon={<BarChart2 className="w-3.5 h-3.5" />} label="Full Squad DNA" />
        <ToolLink href="/stats" icon={<Activity className="w-3.5 h-3.5" />} label="Franchise telemetry" />
        <ToolLink href={`/ai-analyst/auction-war-room?team=${code}`} icon={<Gavel className="w-3.5 h-3.5" />} label="Auction War Room" />
        <ToolLink href={`/ai-analyst/opposition-map?team=${code}`} icon={<MapIcon className="w-3.5 h-3.5" />} label="Opposition briefing" />
        <ToolLink href="/feed" icon={<Swords className="w-3.5 h-3.5" />} label="Tactical command" />
        <ToolLink href="/ai-analyst" icon={<Sparkles className="w-3.5 h-3.5" />} label="AI tactical coach" />
      </div>
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="font-display font-black text-lg text-white tabular-nums truncate">{value}</div>
      {hint && <div className="text-[10px] text-white/40 mt-0.5">{hint}</div>}
    </div>
  );
}

function ToolLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/75 hover:text-white hover:bg-white/10">
      {icon}{label}
    </Link>
  );
}

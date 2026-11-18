import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, Dna, MapPin, Shield, Swords } from "lucide-react";
import { useVenues, venueHref } from "@/lib/aggregates";
import { FRANCHISE_INTELLIGENCE } from "@/data/franchise-intelligence";
import { fetchTeamReport } from "@/lib/intelligence-api";
import { fetchSquadProfile } from "@/lib/sim-api";
import { roleLabel, type OfficialRoom } from "@/lib/retention-official-api";
import { TEAM_REGISTRY, type TeamCode } from "@/lib/team-context";
import type { SquadCounts } from "@/lib/squad-hq-scenario";
import { lookupPlayerPri, usePriBenchmark } from "@/lib/pri-benchmark";

export function SquadIntelligencePanel({
  team,
  official,
  myCounts,
}: {
  team: TeamCode;
  official?: OfficialRoom;
  myCounts: SquadCounts;
}) {
  const club = TEAM_REGISTRY[team];
  const homeGround = FRANCHISE_INTELLIGENCE[team]?.venue ?? `${club.city} Stadium`;

  const reportQ = useQuery({
    queryKey: ["team-intelligence", team],
    queryFn: () => fetchTeamReport(team),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const profileQ = useQuery({
    queryKey: ["squad-profile", team],
    queryFn: () => fetchSquadProfile(team),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const venuesQ = useVenues();
  const priQ = usePriBenchmark();

  const homeVenueRow = useMemo(() => {
    const key = homeGround.toLowerCase();
    return (venuesQ.data ?? []).find(
      (v) => v.venue.toLowerCase().includes(key.split(" ")[0]) || key.includes(v.venue.toLowerCase().split(" ")[0]),
    );
  }, [venuesQ.data, homeGround]);

  const report = reportQ.data;
  const gaps = report?.gaps ?? [];
  const needs = official?.needs ?? [];

  const retained = official?.players.filter((p) => p.decision === "retained" || p.decision === "traded_in") ?? [];
  const paceCount = myCounts.pace;
  const spinCount = myCounts.spin;

  // Derived evidence-backed strengths from TeamReport.composition & official core
  const strengthSignals = useMemo(() => {
    const list: { label: string; value: string; detail: string }[] = [];
    if (report?.composition) {
      const c = report.composition;
      list.push({
        label: "Bowling Options & Overs Capacity",
        value: `${c.bowlingOptions} options · ${c.oversCapacity} ov`,
        detail: `${c.pacers} pace · ${c.spinners} spin in projected squad pool`,
      });
      list.push({
        label: "Batting Depth",
        value: `${c.battingOptions} batters (${c.battingDepth} deep)`,
        detail: `Phase coverage — PP ${c.phaseCoverage.powerplay}, Middle ${c.phaseCoverage.middle}, Death ${c.phaseCoverage.death}`,
      });
    }
    if (retained.length > 0) {
      list.push({
        label: "Verified Retained Core",
        value: `${retained.length} players`,
        detail: `${official?.summary.indian ?? 0} Indian · ${official?.summary.overseas ?? 0} overseas retained`,
      });
    }
    return list;
  }, [report?.composition, retained.length, official?.summary]);

  return (
    <section
      id="intelligence"
      aria-labelledby="squad-intelligence-title"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#0B1226]/85 p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--team-accent)]">
            Warehouse-Backed Analytics &amp; Tactical Readiness
          </span>
          <h2 id="squad-intelligence-title" className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
            {team} · Squad Intelligence
          </h2>
        </div>
        <Link
          href={`/ai-analyst/squad-dna?team=${team}&season=2027`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--team-accent)] hover:underline"
        >
          <Dna className="w-3.5 h-3.5" /> Full Squad DNA <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-950/15 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="w-4 h-4" /> Strengths
          </div>
          {strengthSignals.length > 0 ? (
            <ul className="space-y-2 text-xs text-white/85">
              {strengthSignals.map((s) => (
                <li key={s.label} className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                  <div className="flex items-center justify-between font-bold text-white gap-2">
                    <span>{s.label}</span>
                    <span className="font-mono text-emerald-300 shrink-0">{s.value}</span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-1">{s.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/55">
              {reportQ.isLoading
                ? `Evaluating ${team} strengths from ball-by-ball records…`
                : `${retained.length} retained core players verified across ${official?.composition.length ?? 0} role buckets.`}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-rose-400/25 bg-rose-950/15 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-300">
            <AlertTriangle className="w-4 h-4" /> Weaknesses &amp; Role Gaps
          </div>
          {gaps.length > 0 || needs.length > 0 ? (
            <ul className="space-y-2 text-xs text-white/85">
              {needs.slice(0, 2).map((n) => (
                <li key={n.role} className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{roleLabel(n.role)}</span>
                    <span className="text-[10px] uppercase font-mono text-amber-300">{n.priority} priority</span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-1">{n.note}</p>
                </li>
              ))}
              {gaps.slice(0, 3).map((gapText) => (
                <li key={gapText} className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                  <div className="font-bold text-white">{gapText}</div>
                  <p className="text-[11px] text-white/60 mt-0.5">Detected in {team} squad role coverage</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/55">
              {reportQ.isLoading ? `Scanning ${team} phase vulnerabilities…` : "No departure-driven gaps flagged."}
            </p>
          )}
        </div>
      </div>

      {/* Squad Depth, Player Compatibility & Venue / Opposition */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/80">
            <Shield className="w-3.5 h-3.5 text-[var(--team-accent)]" /> Squad Depth
          </div>
          <p className="text-xs text-white/65">
            My Squad coverage: <strong className="text-white">{myCounts.batters} BAT</strong> ·{" "}
            <strong className="text-white">{myCounts.wicketkeepers} WK</strong> ·{" "}
            <strong className="text-white">{myCounts.allRounders} AR</strong> ·{" "}
            <strong className="text-white">{myCounts.bowlers} BOWL</strong>
          </p>
          <p className="text-[11px] text-white/45">
            {myCounts.slotsRemaining} open squad slots ({myCounts.overseasRemaining} overseas left).
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/80">
            <Dna className="w-3.5 h-3.5 text-cyan-300" /> Player Compatibility
          </div>
          <p className="text-xs text-white/65">
            Bowling mix: <strong className="text-white">{paceCount} pace</strong> vs{" "}
            <strong className="text-white">{spinCount} spin</strong>
            {profileQ.data ? ` · Season ${profileQ.data.season} profile loaded` : ""}.
          </p>
          <p className="text-[11px] text-white/45">
            {paceCount > 0 && spinCount > 0
              ? "Balanced pace-spin attack coverage."
              : "Add specialist pace/spin depth in Squad Builder."}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/80">
            <MapPin className="w-3.5 h-3.5 text-emerald-300" /> Venue Suitability
          </div>
          <p className="text-xs text-white/65">
            Home: <strong className="text-white">{homeGround}</strong>
            {homeVenueRow
              ? ` · Avg 1st ${Math.round(homeVenueRow.avg1stInn)} · Chase ${homeVenueRow.chasingWinPct.toFixed(0)}%`
              : ""}
          </p>
          <Link
            href={venueHref(homeGround)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--team-accent)] hover:underline"
          >
            Inspect ground profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/80">
            <Swords className="w-3.5 h-3.5 text-amber-300" /> Opposition Prep
          </div>
          <p className="text-xs text-white/65">
            Test {team} combinations vs {club.archRival} and league opponents in Match Lab.
          </p>
          <Link
            href={`/tactics?team=${team}&opp=${club.archRival}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--team-accent)] hover:underline"
          >
            Open Match Lab <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Unified PRI Decision Engine: Result 1 (Slot Fit) & Result 2 (Retained Player Pressure Audit) */}
      {priQ.data && (
        <div className="space-y-4 pt-3 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--team-accent)]">
                Pressure Reliability Index (PRI) · Model {priQ.data.modelVersion}
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                {team} Retained Pressure Audit &amp; Priority Auction Fit
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/pressurelab"
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-bold text-white hover:bg-white/10"
              >
                Pressure Lab
              </Link>
              <Link
                href="/scout-lab"
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-bold text-white hover:bg-white/10"
              >
                Scout Lab
              </Link>
            </div>
          </div>

          {/* RESULT 1: Who Fits the Available Slot? */}
          {priQ.data.rrSlotRecommendations?.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-white/85">
                Result 1 · Who Fits the Available Slot? (Best Pressure Performer vs Best Auction Value)
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {priQ.data.rrSlotRecommendations.map((slot) => (
                  <div key={slot.slotId} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-white">{slot.roleTitle}</strong>
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        {slot.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60">{slot.rationale}</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {slot.bestPressurePerformer && (
                        <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-2">
                          <span className="block text-[9px] font-mono uppercase text-cyan-300">Best Pressure</span>
                          <span className="font-bold text-white block truncate">{slot.bestPressurePerformer.name}</span>
                          <span className="font-mono text-[10px] text-cyan-200">
                            PRI {slot.bestPressurePerformer.pri} · {slot.bestPressurePerformer.adjustedPer100 >= 0 ? "+" : ""}
                            {slot.bestPressurePerformer.adjustedPer100}/100b
                          </span>
                        </div>
                      )}
                      {slot.bestAuctionValue && (
                        <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2">
                          <span className="block text-[9px] font-mono uppercase text-emerald-300">Best Value</span>
                          <span className="font-bold text-white block truncate">{slot.bestAuctionValue.name}</span>
                          <span className="font-mono text-[10px] text-emerald-200">
                            PRI {slot.bestAuctionValue.pri} · Est ₹{slot.bestAuctionValue.estCostCr} Cr
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULT 2: Is Our Retained Player Actually Reliable Under Pressure? */}
          {retained.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-2.5">
              <div className="text-xs font-black uppercase tracking-wider text-white/85">
                Result 2 · Retained Squad Pressure Audit ({team})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-white/50">
                      <th className="py-1.5 pr-3">Retained Player</th>
                      <th className="py-1.5 pr-3">Role</th>
                      <th className="py-1.5 pr-3">PRI (0–100)</th>
                      <th className="py-1.5 pr-3">Adj /100b (90% CI)</th>
                      <th className="py-1.5 pr-3">Pressure Sample</th>
                      <th className="py-1.5">Reliability Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {retained.slice(0, 12).map((p) => {
                      const rec = lookupPlayerPri(priQ.data, p.name);
                      const isBowl = p.group === "pace" || p.group === "spin" || p.group === "bowler";
                      const m = isBowl ? rec?.bowling ?? rec?.batting : rec?.batting ?? rec?.bowling;
                      return (
                        <tr key={p.id}>
                          <td className="py-2 pr-3 font-bold text-white">{p.name}</td>
                          <td className="py-2 pr-3 text-white/65 capitalize">{p.role ?? p.group}</td>
                          <td className="py-2 pr-3 font-mono font-black text-cyan-300">
                            {m ? m.pri.toFixed(1) : "—"}
                          </td>
                          <td className="py-2 pr-3 font-mono text-white/80">
                            {m
                              ? `${m.adjustedPer100 >= 0 ? "+" : ""}${m.adjustedPer100.toFixed(1)} [${m.interval90[0].toFixed(1)}, ${m.interval90[1].toFixed(1)}]`
                              : "—"}
                          </td>
                          <td className="py-2 pr-3 font-mono text-white/65">
                            {m ? `${m.pressureBalls}b (${m.pressureMatches}m)` : "Limited"}
                          </td>
                          <td className="py-2 text-[11px] text-white/70">
                            {m ? m.reliabilityTier : "Insufficient Sample"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-white/40">
        Methodology: Metrics derive strictly from CricField ball-by-ball warehouse records ({profileQ.data ? `season ${profileQ.data.season}` : "IPL archive"}) and verified retention disclosures. No win probabilities are fabricated.
      </p>
    </section>
  );
}

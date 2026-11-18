import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  Check,
  Gavel,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { playerSlug, usePlayerBios } from "@/lib/aggregates";
import { getStoredShortlist } from "@/lib/scout-shortlist";
import { roleLabel, type OfficialPlayer, type OfficialRoom } from "@/lib/retention-official-api";
import {
  classifyRoleGroup,
  computeScenarioCounts,
  loadAuctionTargets,
  type HypotheticalPlayer,
  type SquadScenario,
} from "@/lib/squad-hq-scenario";
import type { TeamCode } from "@/lib/team-context";

export function SquadBuilderPanel({
  team,
  official,
  scenario,
  onChangeScenario,
  onSaveScenario,
  onResetScenario,
}: {
  team: TeamCode;
  official?: OfficialRoom;
  scenario: SquadScenario;
  onChangeScenario: (next: SquadScenario) => void;
  onSaveScenario: () => void;
  onResetScenario: () => void;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [savedToast, setSavedToast] = useState(false);

  const bios = usePlayerBios();
  const auctionTargets = useMemo(() => loadAuctionTargets(team), [team]);
  const shortlist = useMemo(() => getStoredShortlist(), []);

  const officialActive: OfficialPlayer[] = useMemo(
    () => (official?.players ?? []).filter((p) => p.decision === "retained" || p.decision === "traded_in"),
    [official],
  );

  const counts = useMemo(
    () => computeScenarioCounts(officialActive, scenario),
    [officialActive, scenario],
  );

  const officialIds = useMemo(
    () => new Set(officialActive.map((p) => p.name.toLowerCase())),
    [officialActive],
  );
  const addedNames = useMemo(
    () => new Set(scenario.additions.map((a) => a.name.toLowerCase())),
    [scenario.additions],
  );

  // Searchable pool from existing player bios + auction watchlist + pressure lab shortlist
  const candidates = useMemo(() => {
    const map = new Map<string, Omit<HypotheticalPlayer, "addedAt">>();
    for (const name of auctionTargets) {
      const k = name.toLowerCase();
      if (!officialIds.has(k) && !addedNames.has(k)) {
        map.set(k, {
          id: `auction-${playerSlug(name)}`,
          name,
          role: "Auction Target",
          group: "unknown",
          overseas: false,
          country: null,
          source: "watchlist",
        });
      }
    }
    for (const item of shortlist) {
      const k = item.name.toLowerCase();
      if (!officialIds.has(k) && !addedNames.has(k) && !map.has(k)) {
        const roleStr = String(item.role || "Shortlisted");
        const group = classifyRoleGroup(roleStr);
        map.set(k, {
          id: `shortlist-${item.cricsheet_id}`,
          name: item.name,
          role: roleStr,
          group,
          overseas: false,
          country: null,
          source: "shortlist",
        });
      }
    }
    const q = query.trim().toLowerCase();
    if (q.length >= 2 || roleFilter !== "all") {
      for (const [k, bio] of Object.entries(bios.data ?? {})) {
        const displayName = bio.playerName || bio.fullName || k;
        const lower = displayName.toLowerCase();
        if (officialIds.has(lower) || addedNames.has(lower) || map.has(lower)) continue;
        if (q.length >= 2 && !lower.includes(q)) continue;
        const group = classifyRoleGroup(bio.role, bio.bowlStyle);
        if (roleFilter !== "all" && group !== roleFilter) continue;
        map.set(lower, {
          id: `bio-${playerSlug(displayName)}`,
          name: displayName,
          role: bio.role || "Player",
          group,
          overseas: Boolean(bio.country && bio.country.toLowerCase() !== "india"),
          country: bio.country ?? null,
          source: "custom",
        });
        if (map.size >= 30) break;
      }
    }
    return Array.from(map.values()).slice(0, 12);
  }, [auctionTargets, shortlist, bios.data, query, roleFilter, officialIds, addedNames]);

  const addPlayer = (cand: Omit<HypotheticalPlayer, "addedAt">) => {
    if (scenario.additions.some((a) => a.name.toLowerCase() === cand.name.toLowerCase())) return;
    onChangeScenario({
      ...scenario,
      additions: [...scenario.additions, { ...cand, addedAt: new Date().toISOString() }],
    });
  };

  const removeAddition = (id: string) => {
    onChangeScenario({
      ...scenario,
      additions: scenario.additions.filter((a) => a.id !== id),
    });
  };

  const toggleExcludeOfficial = (id: string) => {
    const exists = scenario.removedOfficialIds.includes(id);
    onChangeScenario({
      ...scenario,
      removedOfficialIds: exists
        ? scenario.removedOfficialIds.filter((x) => x !== id)
        : [...scenario.removedOfficialIds, id],
    });
  };

  const warnings: string[] = [];
  if (counts.total > 25) warnings.push(`Squad size (${counts.total}) exceeds the 25-player IPL cap.`);
  if (counts.overseas > 8) warnings.push(`Overseas count (${counts.overseas}) exceeds the maximum 8 overseas slots.`);
  if (counts.wicketkeepers === 0 && counts.total > 0) warnings.push("No specialist wicketkeeper currently in My Squad.");

  const primaryGapRole = official?.needs?.[0]?.role ?? "batter";

  return (
    <section
      id="squad-builder"
      aria-labelledby="squad-builder-title"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#0B1226]/85 p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--team-accent)]">
            Official vs My Squad · Scenario Workspace
          </span>
          <h2 id="squad-builder-title" className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
            {team} · Squad Builder
          </h2>
          <p className="text-xs text-white/60 mt-1">
            Official records stay immutable. Build and save hypothetical recruitment additions inside My Squad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onSaveScenario();
              setSavedToast(true);
              setTimeout(() => setSavedToast(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--team-accent)] text-black text-xs font-black hover:brightness-110 transition-all"
          >
            {savedToast ? <Check className="w-3.5 h-3.5" /> : <BookmarkCheck className="w-3.5 h-3.5" />}
            {savedToast ? "Scenario Saved" : "Save Scenario"}
          </button>
          {(scenario.additions.length > 0 || scenario.removedOfficialIds.length > 0) && (
            <button
              type="button"
              onClick={onResetScenario}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-white/80 text-xs font-bold hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Official
            </button>
          )}
        </div>
      </div>

      {/* Live Comparison Metrics: Official vs My Squad */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-[#060B18]/80 p-3">
          <div className="text-[10px] text-white/50 uppercase">My Squad Size</div>
          <div className="text-lg font-black font-mono text-white">
            {counts.total} <span className="text-xs text-white/40">/ 25</span>
          </div>
          <div className="text-[10px] text-white/45">
            Official: {officialActive.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#060B18]/80 p-3">
          <div className="text-[10px] text-white/50 uppercase">Overseas Balance</div>
          <div className={`text-lg font-black font-mono ${counts.overseas > 8 ? "text-rose-400" : "text-white"}`}>
            {counts.overseas} <span className="text-xs text-white/40">/ 8</span>
          </div>
          <div className="text-[10px] text-white/45">
            Official: {official?.summary.overseas ?? "—"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#060B18]/80 p-3">
          <div className="text-[10px] text-white/50 uppercase">Batters / Keepers</div>
          <div className="text-lg font-black font-mono text-white">
            {counts.batters} BAT · {counts.wicketkeepers} WK
          </div>
          <div className="text-[10px] text-white/45">Hypothetical: +{scenario.additions.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#060B18]/80 p-3">
          <div className="text-[10px] text-white/50 uppercase">All-rounders</div>
          <div className="text-lg font-black font-mono text-white">{counts.allRounders}</div>
          <div className="text-[10px] text-white/45">Balance depth</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#060B18]/80 p-3 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-white/50 uppercase">Bowlers</div>
          <div className="text-lg font-black font-mono text-white">{counts.bowlers}</div>
          <div className="text-[10px] text-white/45">{counts.pace} pace · {counts.spin} spin</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 space-y-1 text-xs text-amber-200">
          {warnings.map((w) => (
            <div key={w} className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Split Workspace: Official Squad + My Squad vs Discovery Pool */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: Official Squad & My Squad Additions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Official Squad ({officialActive.length})
              </span>
              <span className="text-[10px] text-white/45">Immutable verified records</span>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {officialActive.map((p) => {
                const excluded = scenario.removedOfficialIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                      excluded
                        ? "border-white/5 bg-white/[0.01] opacity-45"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PlayerAvatar name={p.name} teamId={team} className="w-7 h-7 rounded-full shrink-0" disableHover />
                      <div className="min-w-0">
                        <Link href={`/players/${playerSlug(p.name)}`} className="font-bold text-white hover:underline truncate block">
                          {p.name}
                        </Link>
                        <span className="text-[10px] text-white/50">
                          {roleLabel(p.group)}{p.overseas ? " · Overseas" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleExcludeOfficial(p.id)}
                      className="text-[10px] px-2 py-1 rounded border border-white/15 text-white/70 hover:text-white shrink-0"
                    >
                      {excluded ? "Restore" : "Sim Release"}
                    </button>
                  </div>
                );
              })}
              {!officialActive.length && (
                <p className="text-xs text-white/50 py-2">Official retained squad list loading…</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-violet-400/30 bg-violet-950/15 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-violet-300">
                My Squad Hypothetical Additions ({scenario.additions.length})
              </span>
              <span className="text-[10px] text-violet-200/60">Local scenario only</span>
            </div>
            {scenario.additions.length ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {scenario.additions.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-violet-400/25 bg-black/30 px-2.5 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserRound className="w-4 h-4 text-violet-300 shrink-0" />
                      <div className="min-w-0">
                        <Link href={`/players/${playerSlug(a.name)}`} className="font-bold text-white hover:underline truncate block">
                          {a.name}
                        </Link>
                        <span className="text-[10px] text-violet-200/70">
                          {a.role} · {a.source}
                          {a.overseas ? " · Overseas" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() => removeAddition(a.id)}
                      className="p-1 text-rose-300 hover:text-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/55">
                Add players from the recruitment pool on the right or import targets from Auction My Picks / Pressure Lab.
              </p>
            )}
          </div>
        </div>

        {/* Right: Search & Add Replacement Options + Contextual Discovery */}
        <div className="rounded-xl border border-white/10 bg-[#070D1D] p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/85">
                Add Hypothetical Targets &amp; Replacements
              </span>
              <span className="text-[10px] text-white/45">
                {auctionTargets.length} Auction picks · {shortlist.length} Pressure Lab
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-white/45 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search IPL player database..."
                  aria-label="Search player to add to My Squad"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-white/15 bg-black/40 text-xs text-white placeholder:text-white/40 focus:border-[var(--team-accent)] focus:outline-none"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter candidates by role"
                className="px-2.5 py-2 rounded-lg border border-white/15 bg-black/40 text-xs text-white"
              >
                <option value="all">All Roles</option>
                <option value="batter">Batters</option>
                <option value="wicketkeeper">Keepers</option>
                <option value="all-rounder">All-rounders</option>
                <option value="pace">Pace</option>
                <option value="spin">Spin</option>
              </select>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{cand.name}</div>
                    <div className="text-[10px] text-white/50">
                      {cand.role}
                      {cand.country ? ` · ${cand.country}` : ""}
                      {cand.source !== "custom" ? ` · From ${cand.source}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/players/${playerSlug(cand.name)}`}
                      className="px-2 py-1 rounded border border-white/15 text-[10px] text-white/75 hover:text-white"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => addPlayer(cand)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--team-accent)] text-black text-[10px] font-black hover:brightness-110"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              ))}
              {!candidates.length && (
                <p className="text-xs text-white/50 py-3">
                  Type at least 2 characters to search players, or shortlist players in Auction / Pressure Lab.
                </p>
              )}
            </div>
          </div>

          {/* Contextual Discovery CTAs */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2">
            <Link
              href={`/pulse?team=${team}&tab=Player+Pool&role=${encodeURIComponent(primaryGapRole)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-400/35 bg-purple-500/10 text-purple-200 text-xs font-bold hover:bg-purple-500/20"
            >
              <Gavel className="w-3.5 h-3.5" /> Find Players in Auction <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href={`/pressurelab?team=${team}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/35 bg-sky-500/10 text-sky-200 text-xs font-bold hover:bg-sky-500/20"
            >
              Analyze in Pressure Lab <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

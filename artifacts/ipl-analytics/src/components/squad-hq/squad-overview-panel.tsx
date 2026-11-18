import { ShieldCheck, Users, Wallet, Plane, Layers } from "lucide-react";
import { formatPurse, roleLabel, type OfficialRoom } from "@/lib/retention-official-api";
import type { PulseModel } from "@/lib/pulse-auction";
import type { TeamCode } from "@/lib/team-context";

export function SquadOverviewPanel({
  team,
  official,
  pulseModel,
  onSelectGroup,
}: {
  team: TeamCode;
  official?: OfficialRoom;
  pulseModel?: PulseModel;
  onSelectGroup: (group: string) => void;
}) {
  const pulseTeam = pulseModel?.teams.find((t) => t.code === team);
  const auctionBuys = pulseTeam?.purchases.length ?? 0;

  // Derive lifecycle data status strictly from verified official + auction state
  const statusBadge = !official
    ? "Awaiting official records"
    : auctionBuys > 0 && (official.summary.slots - auctionBuys) > 0
      ? "Auction in progress"
      : official.summary.slots === 0 || (auctionBuys > 0 && (official.summary.slots - auctionBuys) <= 0)
        ? "Final squad confirmed"
        : "Retained squad";

  const activePlayers = official?.players.filter((p) => p.decision === "retained" || p.decision === "traded_in") ?? [];
  const totalSquad = official ? official.summary.retained + auctionBuys : null;
  const indianCount = official ? official.summary.indian : null;
  const overseasCount = official ? official.summary.overseas : null;
  const remainingSlots = official ? Math.max(0, official.summary.slots - auctionBuys) : null;
  const purseText = official ? formatPurse(official.purse.valueLakh) : "—";

  const countGroup = (keys: string[]) =>
    official?.composition
      .filter((c) => keys.includes(c.key))
      .reduce((sum, c) => sum + c.count, 0) ?? 0;

  const batters = countGroup(["batter"]);
  const bowlers = countGroup(["pace", "spin", "bowler"]);
  const allRounders = countGroup(["all-rounder"]);
  const keepers = countGroup(["wicketkeeper"]);
  const pace = countGroup(["pace"]);
  const spin = countGroup(["spin"]);

  const summaryCards = [
    { label: "Official Squad", value: totalSquad ?? "—", sub: official ? `${official.summary.tradedIn} traded in` : "Pending", icon: Users },
    { label: "Indian Players", value: indianCount ?? "—", sub: official?.summary.unknownNationality ? `${official.summary.unknownNationality} pending` : "Domestic core", icon: ShieldCheck },
    { label: "Overseas", value: overseasCount ?? "—", sub: official?.summary.overseasSlots != null ? `${official.summary.overseasSlots} OS slots left` : "Max 8 allowed", icon: Plane },
    { label: "Remaining Slots", value: remainingSlots ?? "—", sub: "25-player cap", icon: Layers },
    { label: "Remaining Purse", value: purseText, sub: official?.purse.valueLakh != null ? "Available for auction" : "", icon: Wallet },
  ];

  const compositionItems = [
    { key: "batter", label: "Batters", count: batters },
    { key: "wicketkeeper", label: "Wicketkeepers", count: keepers },
    { key: "all-rounder", label: "All-rounders", count: allRounders },
    { key: "pace", label: "Fast bowlers", count: pace },
    { key: "spin", label: "Spin bowlers", count: spin },
    { key: "bowler", label: "Other bowlers", count: countGroup(["bowler"]) },
    { key: "unknown", label: "Role pending", count: countGroup(["unknown"]) },
  ].filter((item) => item.count > 0 || ["batter", "wicketkeeper", "all-rounder", "pace", "spin"].includes(item.key));

  return (
    <section
      id="overview"
      aria-labelledby="squad-overview-title"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#0B1226]/85 p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--team-accent)]">
            IPL 2027 · Squad Summary
          </span>
          <h2 id="squad-overview-title" className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
            {team} · Squad Overview
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border border-[var(--team-accent)]/40 bg-[var(--team-accent)]/15 text-[var(--team-accent)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--team-accent)]" />
          {statusBadge}
        </span>
      </div>

      {/* Summary metric tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-xl border border-white/10 bg-[#060B18]/80 p-3.5 space-y-1 min-w-0"
            >
              <div className="flex items-center justify-between gap-2 text-white/55">
                <span className="text-[11px] font-semibold truncate">{c.label}</span>
                <Icon className="w-3.5 h-3.5 text-[var(--team-accent)] shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums truncate">
                {c.value}
              </div>
              <div className="text-[10px] text-white/45 truncate">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Role balance & composition breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-white/80">
            Role Composition ({activePlayers.length} retained · {batters} BAT · {bowlers} BOWL · {allRounders} AR · {keepers} WK)
          </div>
          <span className="text-[11px] text-white/45">
            Based on player roles
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {compositionItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectGroup(item.key)}
              className="text-left rounded-lg border border-white/10 bg-[#070D1D] hover:border-[var(--team-accent)]/60 px-3 py-2.5 transition-colors"
            >
              <div className="text-lg font-black font-mono text-white">{item.count}</div>
              <div className="text-[11px] text-white/65 truncate">{item.label || roleLabel(item.key)}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

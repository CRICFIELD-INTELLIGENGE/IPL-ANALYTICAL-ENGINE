import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Dna,
  Gavel,
  LayoutGrid,
  MapPin,
  Plane,
  Search,
  Shield,
  Shirt,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Sheet } from "@/mobile/shell";
import { PlayerAvatar } from "@/components/player-avatar";
import { RetainedXiPlanner } from "@/components/retention/retained-xi-planner";
import { publishedOfficialRoom } from "@/lib/retention-published";
import { SquadBuilderPanel } from "@/components/squad-hq/squad-builder-panel";
import { SquadIntelligencePanel } from "@/components/squad-hq/squad-intelligence-panel";
import { LIVE_SEASON } from "@/components/retention/retention-widgets";
import { errorText } from "@/lib/discovery-api";
import { HUB_EVENTS, HUB_TEAMS } from "@/lib/ipl-2027";
import { usePulseAuction } from "@/lib/pulse-auction";
import {
  decisionLabel,
  fetchOfficialComparison,
  fetchOfficialRoom,
  formatPurse,
  roleLabel,
  type OfficialPlayer,
} from "@/lib/retention-official-api";
import { fetchPicks, fetchRoom, fetchTrades } from "@/lib/retention-api";
import { RETENTION_INDEX_VERSION } from "@/lib/retention-version";
import {
  computeScenarioCounts,
  emptyScenario,
  loadScenario,
  saveScenario,
  type SquadScenario,
} from "@/lib/squad-hq-scenario";
import { isTeamCode, TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";

type WorkspaceTab = "overview" | "retention" | "builder" | "xi" | "intel";
type MilestoneStage = "retention" | "auction" | "season";
type DecisionFilter = "all" | "retained" | "released" | "traded";

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "retention", label: "Retention", icon: Shield },
  { id: "builder", label: "Builder", icon: Users },
  { id: "xi", label: "Playing XI", icon: Shirt },
  { id: "intel", label: "Intel", icon: Dna },
];

const SOFT_EASE = [0.22, 1, 0.36, 1] as const;

function formatCrore(lakh: number | null) {
  if (lakh === null || Number.isNaN(lakh)) return "—";
  return `₹${(lakh / 100).toFixed(2)} Cr`;
}

function decisionPillStyle(decision: OfficialPlayer["decision"]) {
  if (decision === "retained") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/25";
  if (decision === "traded_in") return "bg-sky-500/15 text-sky-300 border-sky-400/25";
  if (decision === "traded_out") return "bg-amber-500/15 text-amber-300 border-amber-400/25";
  return "bg-rose-500/15 text-rose-300 border-rose-400/25";
}

export default function MobileRetentionRoom() {
  const [, squadParams] = useRoute("/squad-hq/:team");
  const [, retParams] = useRoute("/retention-room/:team");
  const [location, go] = useLocation();
  const requested = (squadParams?.team ?? retParams?.team ?? "").toUpperCase();
  const { selectedTeam, setSelectedTeam } = useTeamTheme();
  const team: TeamCode = isTeamCode(requested) ? requested : selectedTeam ?? "RCB";
  const theme = TEAM_REGISTRY[team];
  const isLegacyPath = location.startsWith("/retention-room");

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [activeStage, setActiveStage] = useState<MilestoneStage>("retention");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<OfficialPlayer | null>(null);
  const [xiMode, setXiMode] = useState<"official" | "scenario">("official");
  const [scenario, setScenario] = useState<SquadScenario>(() => loadScenario(team));
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setScenario(loadScenario(team));
    setXiMode("official");
    setDecisionFilter("all");
    setRoleFilter("all");
    setQuery("");
    setSelectedPlayer(null);
  }, [team]);

  useEffect(() => {
    if (selectedTeam !== team) setSelectedTeam(team);
  }, [team, selectedTeam, setSelectedTeam]);

  const official = useQuery({
    queryKey: ["retention-official", LIVE_SEASON, team],
    queryFn: () => fetchOfficialRoom(LIVE_SEASON, team),
    staleTime: 300_000,
    initialData: () => publishedOfficialRoom(team),
    initialDataUpdatedAt: 0,
    retry: false,
  });

  const room = useQuery({
    queryKey: ["retention-room", LIVE_SEASON, team, RETENTION_INDEX_VERSION],
    queryFn: () => fetchRoom(LIVE_SEASON, team),
    retry: false,
  });

  const picks = useQuery({
    queryKey: ["retention-picks", team, RETENTION_INDEX_VERSION],
    queryFn: () => fetchPicks(LIVE_SEASON, team),
    retry: false,
  });

  const comparison = useQuery({
    queryKey: ["retention-comparison", LIVE_SEASON, team],
    queryFn: () => fetchOfficialComparison(LIVE_SEASON, team),
    staleTime: 300_000,
    retry: false,
  });

  const trades = useQuery({
    queryKey: ["retention-trades", LIVE_SEASON, team],
    queryFn: () => fetchTrades(team),
    staleTime: 300_000,
    retry: false,
  });

  const pulse2027 = usePulseAuction(2027);
  const pulseTeam = pulse2027.model?.teams.find((t) => t.code === team);
  const auctionBuys = pulseTeam?.purchases.length ?? 0;

  const officialData = official.data;
  const officialActive = useMemo(
    () => (officialData?.players ?? []).filter((p) => p.decision === "retained" || p.decision === "traded_in"),
    [officialData],
  );
  const myCounts = useMemo(() => computeScenarioCounts(officialActive, scenario), [officialActive, scenario]);

  const retentionEvent = HUB_EVENTS.find((e) => e.id === "retention");
  const auctionEvent = HUB_EVENTS.find((e) => e.id === "auction");
  const seasonEvent = HUB_EVENTS.find((e) => e.id === "season");

  const milestones: {
    id: MilestoneStage;
    title: string;
    date: string;
    subtitle: string;
    icon: typeof Shield;
    targetTab: WorkspaceTab;
  }[] = [
    {
      id: "retention",
      title: "Retention",
      date: retentionEvent?.date ?? "17 Nov 2026",
      subtitle: "Official retentions, releases & trades",
      icon: Shield,
      targetTab: "retention",
    },
    {
      id: "auction",
      title: "Auction",
      date: auctionEvent?.date ?? "16 Dec 2026",
      subtitle: "Purse planning & squad targets",
      icon: Gavel,
      targetTab: "builder",
    },
    {
      id: "season",
      title: "IPL Season",
      date: seasonEvent?.date ?? "Mar 2027",
      subtitle: "Playing XI & tactical balance",
      icon: Trophy,
      targetTab: "xi",
    },
  ];

  const activeMilestone = milestones.find((m) => m.id === activeStage) ?? milestones[0];

  const switchTeam = (t: TeamCode) => {
    go(isLegacyPath ? `/retention-room/${t}` : `/squad-hq/${t}`);
  };

  const filteredPlayers = useMemo(() => {
    const list = officialData?.players ?? [];
    return list.filter((p) => {
      if (decisionFilter === "retained" && p.decision !== "retained" && p.decision !== "traded_in") return false;
      if (decisionFilter === "released" && p.decision !== "released") return false;
      if (decisionFilter === "traded" && p.decision !== "traded_in" && p.decision !== "traded_out") return false;
      if (roleFilter !== "all") {
        if (roleFilter === "bowler") {
          if (!["pace", "spin", "bowler"].includes(p.group)) return false;
        } else if (p.group !== roleFilter) {
          return false;
        }
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.role ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [officialData, decisionFilter, roleFilter, query]);

  const totalSquad = officialData ? officialData.summary.retained + auctionBuys : 0;
  const squadFillPct = Math.min(100, Math.round((totalSquad / 25) * 100));
  const overseasCount = officialData?.summary.overseas ?? 0;
  const overseasPct = Math.min(100, Math.round((overseasCount / 8) * 100));
  const purseLakh = officialData?.purse.valueLakh ?? 0;
  const pursePct = Math.min(100, Math.round((purseLakh / 13000) * 100));

  const countGroup = (keys: string[]) =>
    officialData?.composition
      .filter((c) => keys.includes(c.key))
      .reduce((sum, c) => sum + c.count, 0) ?? 0;

  const roleBreakdown = [
    { key: "batter", label: "Batters", count: countGroup(["batter"]), color: "#38BDF8" },
    { key: "wicketkeeper", label: "Keepers", count: countGroup(["wicketkeeper"]), color: "#22D3EE" },
    { key: "all-rounder", label: "All-rounders", count: countGroup(["all-rounder"]), color: "#A78BFA" },
    { key: "bowler", label: "Bowlers", count: countGroup(["pace", "spin", "bowler"]), color: "#F472B6" },
  ];

  return (
    <div
      className="px-3.5 pt-3 pb-10 space-y-4 text-white"
      style={
        {
          "--team-accent": theme.accent,
          "--team-secondary": theme.secondary ?? theme.accent,
        } as React.CSSProperties
      }
    >
      {/* 1. SOFT AMBIENT HERO CARD */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: SOFT_EASE }}
        className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0B1226]/75 p-4.5 backdrop-blur-2xl shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full opacity-25 blur-3xl transition-colors duration-500"
          style={{ background: theme.accent }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full opacity-15 blur-3xl transition-colors duration-500"
          style={{ background: theme.secondary ?? theme.accent }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                borderColor: `${theme.accent}44`,
                background: `${theme.accent}18`,
                color: theme.accent,
              }}
            >
              <Sparkles className="h-3 w-3" />
              IPL 2027 · Squad HQ
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white leading-none pt-0.5">
              THE SQUAD <span style={{ color: theme.accent }}>HQ</span>
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed">
              {theme.name} · From retention decisions to your matchday XI.
            </p>
          </div>

          <motion.div
            key={team}
            initial={{ scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-inner"
          >
            <img src={theme.logoImg} alt={theme.name} className="h-10 w-10 object-contain" />
          </motion.div>
        </div>

        {/* Interactive 3-Stage Journey Stepper */}
        <div className="relative mt-4 rounded-2xl border border-white/[0.07] bg-black/25 p-3">
          <div className="grid grid-cols-3 gap-1.5">
            {milestones.map((m) => {
              const Icon = m.icon;
              const isAct = activeStage === m.id;
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveStage(m.id)}
                  className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-colors ${
                    isAct ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {isAct && (
                    <motion.span
                      layoutId="m-hq-stage-bg"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-xl border bg-white/[0.07]"
                      style={{ borderColor: `${theme.accent}55` }}
                    />
                  )}
                  <span
                    className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
                    style={
                      isAct
                        ? {
                            background: `${theme.accent}24`,
                            borderColor: theme.accent,
                            color: theme.accent,
                          }
                        : {
                            background: "rgba(255,255,255,0.03)",
                            borderColor: "rgba(255,255,255,0.1)",
                          }
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="relative z-10 text-[11px] font-bold tracking-tight">{m.title}</span>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeMilestone.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: SOFT_EASE }}
              className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <Calendar className="h-3 w-3" style={{ color: theme.accent }} />
                  <span>{activeMilestone.date}</span>
                </div>
                <p className="truncate text-xs font-medium text-slate-200 mt-0.5">{activeMilestone.subtitle}</p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(activeMilestone.targetTab)}
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-black transition-transform"
                style={{ background: theme.accent }}
              >
                Open <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      {/* 2. SOFT HORIZONTAL FRANCHISE STRIP */}
      <nav aria-label="Franchise selector" className="-mx-3.5 overflow-x-auto px-3.5 py-0.5 no-scrollbar">
        <div className="flex items-center gap-2 w-max">
          {HUB_TEAMS.map((t) => {
            const isCurrent = t === team;
            const tTheme = TEAM_REGISTRY[t];
            return (
              <motion.button
                key={t}
                type="button"
                whileTap={{ scale: 0.94 }}
                aria-pressed={isCurrent}
                onClick={() => switchTeam(t)}
                className={`relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  isCurrent
                    ? "text-white border-transparent"
                    : "border-white/[0.08] bg-white/[0.03] text-slate-300/80"
                }`}
              >
                {isCurrent && (
                  <motion.span
                    layoutId="m-hq-team-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 rounded-full border"
                    style={{
                      background: `${tTheme.accent}20`,
                      borderColor: `${tTheme.accent}88`,
                      boxShadow: `0 4px 18px -6px ${tTheme.accent}80`,
                    }}
                  />
                )}
                <img src={tTheme.logoImg} alt="" className="relative z-10 h-4 w-4 object-contain" />
                <span className="relative z-10">{t}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* 3. STICKY SOFT SEGMENTED WORKSPACE TABS */}
      <div className="sticky top-[calc(var(--m-top)+env(safe-area-inset-top,0px)+6px)] z-30">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-full border border-white/[0.09] bg-[#0B1226]/90 p-1 backdrop-blur-2xl shadow-xl">
          {WORKSPACE_TABS.map((tabItem) => {
            const Icon = tabItem.icon;
            const isAct = activeTab === tabItem.id;
            return (
              <motion.button
                key={tabItem.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tabItem.id)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold whitespace-nowrap transition-colors ${
                  isAct ? "text-black" : "text-slate-300/80"
                }`}
              >
                {isAct && (
                  <motion.span
                    layoutId="m-hq-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-full shadow-md"
                    style={{ background: theme.accent }}
                  />
                )}
                <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" />
                <span className="relative z-10">{tabItem.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 4. LOADING / ERROR STATE */}
      {official.isPending && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
      )}

      {official.isError && (
        <div className="rounded-[24px] border border-rose-400/25 bg-rose-950/20 p-4 text-xs space-y-2">
          <p className="font-bold text-rose-200">Retention data could not be loaded</p>
          <p className="text-rose-200/70">{errorText(official.error)}</p>
          <button
            type="button"
            onClick={() => void official.refetch()}
            className="rounded-full bg-rose-400/20 px-3.5 py-1.5 font-bold text-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. ANIMATED WORKSPACE CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${team}-${activeTab}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24, ease: SOFT_EASE }}
          className="space-y-4"
        >
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* Animated Capacity & Purse Gauges */}
              <div className="rounded-[26px] border border-white/[0.08] bg-[#0B1226]/75 p-4 backdrop-blur-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400">
                      Squad Telemetry
                    </span>
                    <h2 className="text-base font-black text-white">{theme.name} Snapshot</h2>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: `${theme.accent}1f`, color: theme.accent }}
                  >
                    {officialData ? "IPL 2027" : "Loading"}
                  </span>
                </div>

                {/* Purse Hero Strip */}
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                      <Wallet className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                      Remaining Purse
                    </span>
                    <span className="font-mono text-base font-black text-white">
                      {officialData ? formatPurse(officialData.purse.valueLakh) : "—"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pursePct}%` }}
                      transition={{ duration: 0.7, ease: SOFT_EASE }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${theme.accent}, #38BDF8)` }}
                    />
                  </div>
                </div>

                {/* 2-Col Soft Gauges */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-sky-400" /> Squad
                      </span>
                      <span className="font-mono font-bold text-white">{totalSquad}/25</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${squadFillPct}%` }}
                        transition={{ duration: 0.65, ease: SOFT_EASE }}
                        className="h-full rounded-full bg-sky-400"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {officialData ? `${officialData.summary.slots} open slots` : "Pending"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Plane className="h-3.5 w-3.5 text-violet-400" /> Overseas
                      </span>
                      <span className="font-mono font-bold text-white">{overseasCount}/8</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${overseasPct}%` }}
                        transition={{ duration: 0.65, ease: SOFT_EASE }}
                        className="h-full rounded-full bg-violet-400"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {officialData?.summary.overseasSlots != null
                        ? `${officialData.summary.overseasSlots} OS slots left`
                        : "Max 8 allowed"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Role Composition Chips */}
              <div className="rounded-[26px] border border-white/[0.08] bg-[#0B1226]/75 p-4 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white">Squad Composition</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("retention")}
                    className="text-[11px] font-bold"
                    style={{ color: theme.accent }}
                  >
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {roleBreakdown.map((item, idx) => (
                    <motion.button
                      key={item.key}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.28, ease: SOFT_EASE }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setDecisionFilter("retained");
                        setRoleFilter(item.key);
                        setActiveTab("retention");
                      }}
                      className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <div>
                        <span className="block text-[11px] text-slate-400">{item.label}</span>
                        <span className="font-mono text-lg font-black text-white">{item.count}</span>
                      </div>
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }}
                      />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Squad Needs & Gaps */}
              {officialData && officialData.needs.length > 0 && (
                <div className="rounded-[26px] border border-white/[0.08] bg-[#0B1226]/75 p-4 backdrop-blur-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white">Recruitment Priorities</h3>
                    <span className="text-[10px] font-mono text-slate-400">Auction focus</span>
                  </div>
                  <div className="space-y-2">
                    {officialData.needs.slice(0, 4).map((need, idx) => (
                      <motion.div
                        key={need.role}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.25 }}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white capitalize">
                              {roleLabel(need.role)}
                            </span>
                            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 capitalize">
                              {need.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{need.note}</p>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-bold text-slate-300">
                          {need.remaining} left
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: RETENTION */}
          {activeTab === "retention" && (
            <div className="space-y-3.5">
              {/* Soft Filter Bar */}
              <div className="rounded-[24px] border border-white/[0.08] bg-[#0B1226]/75 p-3.5 backdrop-blur-xl space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${team} players or roles…`}
                    className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-400 focus:border-white/25 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(
                    [
                      ["all", "All"],
                      ["retained", "Retained"],
                      ["released", "Released"],
                      ["traded", "Traded"],
                    ] as [DecisionFilter, string][]
                  ).map(([id, text]) => {
                    const isAct = decisionFilter === id;
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setDecisionFilter(id)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                          isAct
                            ? "border-transparent text-black"
                            : "border-white/10 bg-white/[0.03] text-slate-300"
                        }`}
                        style={isAct ? { background: theme.accent } : undefined}
                      >
                        {text}
                      </motion.button>
                    );
                  })}
                  {roleFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setRoleFilter("all")}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/15 px-2.5 py-1 text-[11px] font-bold text-sky-200 whitespace-nowrap"
                    >
                      {roleFilter} <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Prediction vs Reality Mini Banner */}
              {comparison.data?.eligible && (
                <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      CRICFIELD Accuracy
                    </span>
                    <p className="font-bold text-white">
                      {comparison.data.accuracy != null
                        ? `${Math.round(comparison.data.accuracy * 100)}% match with official decisions`
                        : `${comparison.data.scored} predictions scored`}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: theme.accent }} />
                </div>
              )}

              {/* Interactive Player Cards */}
              <div className="space-y-2">
                {filteredPlayers.map((player, idx) => (
                  <motion.button
                    key={player.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.3), duration: 0.25, ease: SOFT_EASE }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPlayer(player)}
                    className="w-full flex items-center justify-between gap-3 rounded-[22px] border border-white/[0.08] bg-[#0B1226]/75 p-3 text-left backdrop-blur-xl transition-colors hover:bg-[#0B1226]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar name={player.name} teamId={team} className="h-10 w-10 shrink-0 rounded-full" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-white">{player.name}</span>
                          {player.overseas && (
                            <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-300">
                              OS
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400 capitalize">
                          {player.role ?? player.group}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${decisionPillStyle(
                          player.decision,
                        )}`}
                      >
                        {decisionLabel(player.decision)}
                      </span>
                      <span className="block font-mono text-xs font-bold text-slate-200">
                        {formatCrore(player.contractLakh)}
                      </span>
                    </div>
                  </motion.button>
                ))}

                {filteredPlayers.length === 0 && !official.isPending && (
                  <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-6 text-center text-xs text-slate-400">
                    No players match your current filters.
                  </div>
                )}
              </div>

              {/* Trades Summary */}
              {trades.data && trades.data.entries.length > 0 && (
                <div className="rounded-[24px] border border-white/[0.08] bg-[#0B1226]/75 p-4 space-y-2.5">
                  <h3 className="text-sm font-black text-white">Trade Activity</h3>
                  {trades.data.entries.flatMap((e) => e.moves).slice(0, 4).map((tr, i) => (
                    <div
                      key={`${tr.player}-${i}`}
                      className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs"
                    >
                      <span className="font-bold text-white">{tr.player}</span>
                      <span className="text-slate-400">
                        {tr.from} → {tr.to}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Historical Room Note if picks loaded */}
              {room.data && picks.data && (
                <p className="px-2 text-[11px] text-slate-400/80 text-center">
                  Model {room.data.modelVersion} · {picks.data.rows.length} CRICFIELD assessments archived
                </p>
              )}
            </div>
          )}

          {/* TAB: SQUAD BUILDER */}
          {activeTab === "builder" && (
            <div className="space-y-3">
              {savedToast && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-center text-xs font-bold text-emerald-200"
                >
                  Scenario saved to this device
                </motion.div>
              )}
              <div className="[&>section]:rounded-[26px] [&>section]:border-white/[0.08] [&>section]:backdrop-blur-xl">
                <SquadBuilderPanel
                  team={team}
                  official={officialData}
                  scenario={scenario}
                  onChangeScenario={setScenario}
                  onSaveScenario={() => {
                    saveScenario(scenario);
                    setSavedToast(true);
                    setTimeout(() => setSavedToast(false), 2200);
                  }}
                  onResetScenario={() => {
                    const fresh = emptyScenario(team);
                    setScenario(fresh);
                    saveScenario(fresh);
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB: PLAYING XI */}
          {activeTab === "xi" && (
            <section className="rounded-[26px] border border-white/[0.08] bg-[#0B1226]/80 p-4 backdrop-blur-xl space-y-4">
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
                    Matchday Optimizer
                  </span>
                  <h2 className="text-lg font-black text-white">{team} · Playing XI</h2>
                </div>

                <div className="grid grid-cols-2 gap-1.5 rounded-full border border-white/10 bg-black/30 p-1">
                  <button
                    type="button"
                    onClick={() => setXiMode("official")}
                    className={`rounded-full py-1.5 text-xs font-bold transition-all ${
                      xiMode === "official" ? "text-black shadow" : "text-slate-300"
                    }`}
                    style={xiMode === "official" ? { background: theme.accent } : undefined}
                  >
                    Official Squad
                  </button>
                  <button
                    type="button"
                    onClick={() => setXiMode("scenario")}
                    className={`rounded-full py-1.5 text-xs font-bold transition-all ${
                      xiMode === "scenario" ? "bg-violet-500 text-white shadow" : "text-slate-300"
                    }`}
                  >
                    My Squad ({scenario.additions.length})
                  </button>
                </div>
              </div>

              {xiMode === "scenario" && (
                <div className="rounded-2xl border border-violet-400/25 bg-violet-950/20 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-violet-200 font-bold">
                    <span>Hypothetical Overlay</span>
                    <span className="text-[11px] font-mono">
                      {myCounts.total} total · {myCounts.overseas} OS
                    </span>
                  </div>
                  {scenario.additions.length === 0 && (
                    <p className="text-slate-400 text-[11px]">
                      Add targets in the Builder tab to test hypothetical combinations.
                    </p>
                  )}
                </div>
              )}

              <RetainedXiPlanner team={team} players={officialActive} />

              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.07]">
                <Link
                  href={`/tactics?team=${team}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-black"
                  style={{ background: theme.accent }}
                >
                  <Swords className="h-3.5 w-3.5" /> Match Lab <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/feed/venues?team=${team}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-white"
                >
                  <MapPin className="h-3.5 w-3.5" /> Venue Fit
                </Link>
              </div>
            </section>
          )}

          {/* TAB: INTEL */}
          {activeTab === "intel" && (
            <div className="space-y-4 [&>section]:rounded-[26px] [&>section]:border-white/[0.08]">
              <SquadIntelligencePanel team={team} official={officialData} myCounts={myCounts} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 6. SOFT PLAYER DETAIL BOTTOM SHEET */}
      {selectedPlayer && (
        <Sheet
          onClose={() => setSelectedPlayer(null)}
          title={selectedPlayer.name}
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <PlayerAvatar name={selectedPlayer.name} teamId={team} className="h-12 w-12 shrink-0 rounded-full" />
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${decisionPillStyle(
                      selectedPlayer.decision,
                    )}`}
                  >
                    {decisionLabel(selectedPlayer.decision)}
                  </span>
                  {selectedPlayer.overseas && (
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                      Overseas
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 capitalize">
                  {selectedPlayer.role ?? selectedPlayer.group} · {selectedPlayer.country ?? "India"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400">Contract</span>
                <span className="font-mono text-base font-black text-white">
                  {formatCrore(selectedPlayer.contractLakh)}
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400">Availability</span>
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {selectedPlayer.availability.status}
                </span>
              </div>
            </div>

            {selectedPlayer.performance?.projection && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Performance Projection
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-[10px] text-slate-400">RAR</span>
                    <span className="font-mono font-bold text-white">
                      {selectedPlayer.performance.projection.rar.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Bat</span>
                    <span className="font-mono font-bold text-sky-300">
                      {selectedPlayer.performance.projection.bat.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Bowl</span>
                    <span className="font-mono font-bold text-pink-300">
                      {selectedPlayer.performance.projection.bowl.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedPlayer.scoutUrl && (
              <Link
                href={selectedPlayer.scoutUrl}
                onClick={() => setSelectedPlayer(null)}
                className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-black text-black"
                style={{ background: theme.accent }}
              >
                Open in Pressure Lab <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

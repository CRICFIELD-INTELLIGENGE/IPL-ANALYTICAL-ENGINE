import React, { useEffect, useMemo, useState } from "react";
import { TeamLogo } from "@/components/team-logo";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Radio, Search, ChevronDown, Check, ExternalLink, Wallet, Users, History, Newspaper, Brain, Sparkles, TrendingUp, CheckCircle2, Activity } from "lucide-react";
import { Link } from "wouter";
import { HUB_EVENTS } from "@/lib/ipl-2027";
import { stamp, useIpl2027Desk } from "@/lib/ipl-2027-desk";
import { teamColor, playerSlug } from "@/lib/aggregates";
import { paletteForCode } from "@/lib/team-palette";
import { isTeamCode } from "@/lib/team-context";
import { usePulseAuction, pulseMoney, lotValue, PULSE_TABS, type PulseTab, type PulseLot, type PulseModel, type PulseTeam, type PulseStatus } from "@/lib/pulse-auction";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const card = "bg-white dark:bg-[#0B1020] rounded-[20px] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl transition-colors";
const label = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50";
const STATUS_LABEL: Record<PulseStatus, string> = {
  registered: "Registered", shortlisted: "Shortlisted", pending: "Not yet presented", "on-block": "On the block",
  sold: "Sold", unsold: "Unsold", withdrawn: "Withdrawn", recorded: "Recorded, no sale",
};
const STATUS_TONE: Partial<Record<PulseStatus, string>> = {
  sold: "text-emerald-600 dark:text-emerald-400 font-bold",
  unsold: "text-rose-600 dark:text-rose-400 font-bold",
  "on-block": "text-pink-600 dark:text-pink-400 font-bold",
  withdrawn: "text-slate-400 dark:text-white/40",
  pending: "text-amber-600 dark:text-amber-300 font-bold"
};

function roleBand(role: string) {
  const r = role.toLowerCase();
  return /keep|wk/.test(r) ? "Wicketkeeper" : /all/.test(r) ? "All-rounder" : /bowl/.test(r) ? "Bowler" : /bat/.test(r) ? "Batter" : "Not recorded";
}
const BASE_BANDS = ["Under ₹50 L", "₹50 L – ₹1 Cr", "₹1 – 2 Cr", "₹2 Cr +", "Not recorded"] as const;
const baseBand = (l: number | null) => l == null ? BASE_BANDS[4] : l < 50 ? BASE_BANDS[0] : l < 100 ? BASE_BANDS[1] : l < 200 ? BASE_BANDS[2] : BASE_BANDS[3];

// Event phase drives emphasis; dates come from the verified timeline in lib/ipl-2027.
function auctionPhase() {
  const today = new Date().toLocaleDateString("en-CA");
  const ret = HUB_EVENTS.find(e => e.id === "retention")?.date, auc = HUB_EVENTS.find(e => e.id === "auction")?.date;
  if (auc && today > auc) return { id: "after", name: "After auction", tab: "Results" as PulseTab };
  if (auc && today === auc) return { id: "live", name: "Auction day", tab: "Live Auction" as PulseTab };
  if (ret && today >= ret) return { id: "pre", name: "Pre-auction", tab: "Player Pool" as PulseTab };
  return { id: "retain", name: "Before retentions", tab: "Overview" as PulseTab };
}

export default function PulsePage() {
  const phase = useMemo(auctionPhase, []);

  // Initialize season from URL param or default
  const [season, setSeasonState] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const s = new URLSearchParams(window.location.search).get("season");
      if (s && !isNaN(Number(s))) return Number(s);
    }
    return null;
  });

  // Initialize tab from URL param or phase default
  const [tab, setTabState] = useState<PulseTab>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p) {
        const found = PULSE_TABS.find(
          t => t.toLowerCase() === p.toLowerCase() || t.toLowerCase() === p.replace(/[-_]/g, " ").toLowerCase()
        );
        if (found) return found;
      }
    }
    return "Overview";
  });

  // 2027 only once the desk has lots; until then the verified 2026 auction is the working demo.
  const probe = useIpl2027Desk();
  const active = season ?? (probe.data?.lots.length ? 2027 : 2026);
  const pulse = usePulseAuction(active);
  const { model } = pulse;

  // History-aware tab switcher: pushes state so browser Back goes back to previous tab (e.g. Overview)
  const setTab = (newTab: PulseTab, pushHistory = true) => {
    setTabState(newTab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const url = new URL(window.location.href);
      if (newTab === "Overview") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", newTab);
      }
      const nextUrl = url.pathname + (url.search ? url.search : "");
      const currentFull = window.location.pathname + window.location.search;
      if (pushHistory && currentFull !== nextUrl) {
        window.history.pushState({ tab: newTab, season: active }, "", nextUrl);
      } else if (!pushHistory) {
        window.history.replaceState({ tab: newTab, season: active }, "", nextUrl);
      }
    }
  };

  const setSeason = (newSeason: number | null) => {
    setSeasonState(newSeason);
    if (typeof window !== "undefined" && newSeason != null) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const url = new URL(window.location.href);
      url.searchParams.set("season", String(newSeason));
      window.history.replaceState({ tab, season: newSeason }, "", url.pathname + url.search);
    }
  };

  // Scroll to top immediately when switching tabs or seasons so the new section is viewed from the beginning
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [tab, active]);

  // Synchronize with browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        const found = PULSE_TABS.find(
          t => t.toLowerCase() === tabParam.toLowerCase() || t.toLowerCase() === tabParam.replace(/[-_]/g, " ").toLowerCase()
        );
        setTabState(found ?? "Overview");
      } else {
        setTabState("Overview");
      }
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      const seasonParam = params.get("season");
      if (seasonParam && !isNaN(Number(seasonParam))) {
        setSeasonState(Number(seasonParam));
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* SECTION 1 & 2: HERO CAROUSEL + EVENT STATUS CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: The Auction Pulse Hero Carousel / Banner */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <PulseHero
              active={active}
              phase={phase.name}
              seasonSelector={
                <SeasonDropdown
                  seasons={[2027, ...pulse.seasons.filter(s => s !== 2027)]}
                  active={active}
                  onSelect={setSeason}
                  is2027Upcoming={!probe.data?.lots.length}
                />
              }
            />
          </div>

          {/* Right: Controlled Width Event Status Card */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
            <EventStatusCard
              active={active}
              model={model}
              pulse={pulse}
              phase={phase.name}
              venue={model.foundation?.venue ?? "Etihad Arena, Abu Dhabi"}
              updated={active === 2027 ? pulse.desk.data?.updatedAt : model.foundation?.verifiedAt}
            />
          </div>
        </div>

        {/* SECTION 3: STICKY NAVIGATION TABS & UPCOMING BANNER */}
        <div className="space-y-4">
          <nav className="sticky top-16 z-30 py-2 px-2.5 bg-white/95 dark:bg-[#050816]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-sm dark:shadow-lg transition-colors" aria-label="Pulse sections">
            {PULSE_TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  tab === t
                    ? `bg-gradient-to-r ${TAB_TONES[i]} text-white shadow-md shadow-orange-500/20`
                    : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          {/* Upcoming Auction Banner (Section 2.A) */}
          {phase.id !== "after" && (
            <UpcomingBanner
              viewing={active === 2027}
              lots={probe.data?.lots.length ?? 0}
              open={() => { setSeason(2027); setTab("Overview"); }}
              back={() => setSeason(2026)}
            />
          )}

          {/* In-page Back to Overview navigation bar */}
          {tab !== "Overview" && (
            <div className="flex items-center justify-between py-1 px-1">
              <button
                onClick={() => setTab("Overview")}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white/80 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all group shadow-sm cursor-pointer"
              >
                <span className="text-orange-500 group-hover:-translate-x-0.5 transition-transform font-bold">←</span>
                <span>Back to Overview</span>
              </button>
              <div className="text-[11px] font-mono text-slate-500 dark:text-white/40">
                Viewing: <span className="text-slate-800 dark:text-white/80 font-bold">{tab}</span>
              </div>
            </div>
          )}

          {/* Main Tab Content */}
          {pulse.loading ? (
            <Empty>Loading auction records…</Empty>
          ) : pulse.error ? (
            <Empty>Auction records are unavailable right now. Try again shortly.</Empty>
          ) : (
            <>
              {tab === "Overview" && <Overview model={model} pulse={pulse} phase={phase.name} go={setTab} />}
              {tab === "Live Auction" && <LiveAuction key={active} model={model} pulse={pulse} active={active} />}
              {tab === "Player Pool" && <PlayerPool model={model} />}
              {tab === "Franchises" && <Franchises model={model} />}
              {tab === "Retentions" && <Retentions model={model} pulse={pulse} />}
              {tab === "Results" && <Results model={model} />}
              {tab === "Live Blog" && <LiveBlog model={model} pulse={pulse} />}
              {tab === "Archive" && <Archive pulse={pulse} active={active} pick={s => { setSeason(s); setTab("Results"); }} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

type Pulse = ReturnType<typeof usePulseAuction>;

/* SECTION 1: HERO SLIDES & HERO CAROUSEL COMPONENT */
const HERO_SLIDES = [
  {
    id: "pulse",
    prefix: "AUCTION",
    highlight: "PULSE.",
    tone: "text-[#FF6B00]",
    desc: "Every bid. Every player. Every franchise decision. Retentions, live transactions, and final squads in one centralized intelligence desk.",
  },
  {
    id: "retentions",
    highlight: "RETENTIONS.",
    tone: "text-emerald-400",
    desc: "Official retention declarations, released cores, franchise retention expenditure, and remaining purse calculations.",
  },
  {
    id: "auction",
    highlight: "AUCTION.",
    tone: "text-amber-400",
    desc: "Live hammer bidding, real-time marquee lots, purse deductions, and transaction telemetry direct from the auction floor.",
  },
  {
    id: "aftermath",
    highlight: "AFTERMATH.",
    tone: "text-purple-400",
    desc: "Complete squad sheets, tactical roster balances, purse efficiency ratings, and verified roster breakdowns post-auction.",
  },
];

function SeasonDropdown({
  seasons,
  active,
  onSelect,
  is2027Upcoming,
}: {
  seasons: number[];
  active: number;
  onSelect: (season: number) => void;
  is2027Upcoming: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider select-none">
        Season:
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Auction season selector, currently IPL ${active}`}
            className="group inline-flex items-center gap-2 bg-black/60 hover:bg-black/80 active:bg-black border border-white/20 hover:border-orange-500/60 rounded-xl px-3 py-1.5 text-xs text-white font-bold cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-md"
          >
            <span className="tracking-wide">IPL {active}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 group-hover:text-orange-400 group-data-[state=open]:rotate-180 transition-transform duration-200" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-48 sm:w-52 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0B1020]/95 backdrop-blur-xl shadow-2xl p-1.5 z-[100] focus:outline-none"
        >
          {seasons.map(s => {
            const isSelected = s === active;
            const isUpcoming = s === 2027 && is2027Upcoming;
            return (
              <DropdownMenuItem
                key={s}
                onSelect={() => onSelect(s)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer transition-colors outline-none font-medium my-0.5 select-none",
                  isSelected
                    ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30 data-[highlighted]:bg-orange-500/20"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-white/10 data-[highlighted]:text-slate-950 dark:data-[highlighted]:text-white"
                )}
              >
                <span className="tracking-tight">IPL {s}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isUpcoming && (
                    <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                      Upcoming
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 stroke-[2.5]" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PulseHero({
  active,
  phase,
  seasonSelector,
}: {
  active: number;
  phase: string;
  seasonSelector: React.ReactNode;
}) {
  const [slideIdx, setSlideIdx] = useState(0);

  // Auto-advance slides continuously every 4.5 seconds without stopping on mouse hover
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx(prev => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = HERO_SLIDES[slideIdx];

  return (
    <div
      data-on-image="true"
      className="editorial-cover-canvas relative rounded-[24px] border border-slate-700/40 dark:border-white/10 overflow-hidden min-h-[300px] sm:min-h-[330px] lg:min-h-[350px] p-6 sm:p-7 flex flex-col justify-between group shadow-lg dark:shadow-2xl h-full bg-[#050816]"
    >
      {/* Background artwork: sharp, vibrant gavel image without excessive blur */}
      <img
        src="/auction-art.jpg"
        alt="Auction Pulse Gavel"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-85 group-hover:scale-102 transition-transform duration-700 pointer-events-none"
      />
      {/* Precision scrims for guaranteed WCAG contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

      {/* Top Bar: Eyebrow + Season Selector */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400 font-mono">
            CricField / IPL {active}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
            {phase}
          </span>
        </div>
        {seasonSelector}
      </div>

      {/* Middle Content: Animated, consistent typographic scale across all slides without buttons */}
      <div className="relative z-10 my-auto py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] xl:text-[44px] font-black leading-none uppercase tracking-tight text-white select-none"
              style={{ color: "#ffffff" }}
            >
              {current.prefix} <span className={current.tone}>{current.highlight}</span>
            </h1>
            <p
              className="text-xs sm:text-sm text-white/80 max-w-lg mt-3 leading-relaxed"
              style={{ color: "rgba(255, 255, 255, 0.85)" }}
            >
              {current.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* SECTION 2: CONTROLLED WIDTH EVENT STATUS CARD */
function EventStatusCard({
  active,
  model,
  pulse,
  phase,
  venue,
  updated,
}: {
  active: number;
  model: PulseModel;
  pulse: Pulse;
  phase: string;
  venue: string | null;
  updated: string | null | undefined;
}) {
  const auction = HUB_EVENTS.find(e => e.id === "auction");

  return (
    <div className="bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-sm dark:shadow-xl h-full transition-colors">
      <div>
        {/* Card Header: Label + Phase */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-pink-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">
              Event Status
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
            {phase}
          </span>
        </div>

        {/* Event Title & Metadata */}
        <div className="mt-3.5 space-y-1">
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            IPL {active} Auction
          </div>
          <div className="text-xs text-slate-600 dark:text-white/70 font-medium truncate">
            {active === 2026
              ? `${model.foundation?.eventDate ?? "Dec 16, 2025"} · ${venue ?? "Etihad Arena, Abu Dhabi"}`
              : `${auction?.date ?? "Dec 16, 2026"} · ${auction?.status === "confirmed" ? "Confirmed" : "Reported, not yet confirmed"}`}
          </div>
        </div>

        {/* Feed Status Indicator */}
        <div className="mt-3.5">
          <FeedStatus active={active} pulse={pulse} />
        </div>
      </div>

      {/* Statistics Section: Sold, Unsold, Spent with ample space */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Kpi k="Sold" v={model.sold} tone="text-emerald-600 dark:text-emerald-400" />
          <Kpi k="Unsold" v={unsoldText(model)} tone="text-rose-600 dark:text-rose-400" />
          <Kpi k="Spent" v={spendText(model)} tone="text-amber-600 dark:text-amber-300" />
        </div>

        {/* Verification Meta Footer */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-white/40 pt-1">
          <span className="truncate">
            {updated
              ? active === 2027
                ? `Updated: ${stamp(updated)}`
                : `Verified: ${updated}`
              : "Official BCCI Release"}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </span>
        </div>
      </div>
    </div>
  );
}

function FeedStatus({ active, pulse }: { active: number; pulse: Pulse }) {
  const [dot, text] = active !== 2027 ? ["bg-sky-500", "Archive · verified final results"]
    : pulse.desk.isError ? ["bg-red-500", "Update source offline"]
    : ["bg-amber-500", "Manual updates from official sources"];
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-white/60 bg-slate-100 dark:bg-white/[0.03] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className="truncate">{text}</span>
    </div>
  );
}

/* SECTION 2.A: UPCOMING AUCTION BANNER */
function UpcomingBanner({ viewing, lots, open, back }: { viewing: boolean; lots: number; open: () => void; back: () => void }) {
  const auction = HUB_EVENTS.find(e => e.id === "auction"), retention = HUB_EVENTS.find(e => e.id === "retention");
  const today = new Date().toLocaleDateString("en-CA");
  const days = auction?.date ? Math.ceil((Date.parse(auction.date) - Date.parse(today)) / 86_400_000) : null;
  return (
    <div className="rounded-[24px] border border-violet-200 dark:border-fuchsia-500/25 bg-gradient-to-r from-violet-50 via-fuchsia-50/50 to-white dark:from-fuchsia-950/30 dark:via-violet-950/20 dark:to-[#0B1020] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm dark:shadow-xl transition-all">
      {/* Left: Event Details & Pill */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-fuchsia-500/20 border border-violet-200 dark:border-fuchsia-500/30 text-violet-700 dark:text-fuchsia-400 shrink-0 mt-0.5 sm:mt-0">
          <Gavel className="w-5 h-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-fuchsia-500/20 text-violet-700 dark:text-fuchsia-300 border border-violet-200 dark:border-fuchsia-500/30 text-[9px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-fuchsia-400 animate-pulse" />
              Upcoming Event
            </span>
            <h3 className="text-slate-900 dark:text-white font-black text-base sm:text-lg tracking-tight truncate">IPL 2027 Auction</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-white/70 font-medium">
            {auction?.date ?? "Date TBA"}{auction?.status !== "confirmed" ? " (reported, not yet confirmed)" : ""} · Retentions due {retention?.date ?? "TBA"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-white/45 hidden sm:block truncate max-w-xl">
            {lots ? `${lots} lots recorded so far.` : "Official results will populate live on auction day; IPL 2026 is shown as the reference auction."}
          </p>
        </div>
      </div>

      {/* Right: Countdown & Action */}
      <div className="flex items-center gap-4 sm:gap-5 self-stretch sm:self-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/10">
        {days != null && days > 0 && (
          <div className="flex flex-col items-end pr-3 sm:pr-4 border-r border-slate-200 dark:border-white/10">
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-500 via-pink-500 to-violet-600 dark:from-amber-300 dark:via-pink-400 dark:to-fuchsia-400 bg-clip-text text-transparent leading-none">
              {days}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 mt-0.5">Days Left</div>
          </div>
        )}
        {viewing ? (
          <button
            onClick={back}
            className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-black uppercase tracking-wider transition-colors border border-slate-300 dark:border-white/15 cursor-pointer"
          >
            View IPL 2026
          </button>
        ) : (
          <button
            onClick={open}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all border border-violet-400/30 cursor-pointer"
          >
            Open IPL 2027
          </button>
        )}
      </div>
    </div>
  );
}

function Kpi({ k, v, tone = "text-slate-900 dark:text-white" }: { k: string; v: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 px-3 py-2.5 min-w-0 transition-colors">
      <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/50 truncate mb-1">{k}</div>
      <div className={`text-sm sm:text-base font-black truncate tracking-tight ${tone}`}>{v}</div>
    </div>
  );
}

// Team accent with a hex alpha suffix (palette accents are #RRGGBB); unknown teams get a neutral white tint.
const teamHex = (team: string | null | undefined) => paletteForCode(team ?? "")?.accent ?? teamColor(team ?? "");
const tint = (team: string | null | undefined, alpha: string) => { const c = teamHex(team ?? ""); return /^#[0-9a-f]{6}$/i.test(c) ? c + alpha : `#ffffff${alpha}`; };
const teamCard = (team: string | null | undefined): React.CSSProperties => ({ borderColor: tint(team, "55"), background: `linear-gradient(135deg, ${tint(team, "26")}, ${tint(team, "08")} 60%, transparent)` });
const TAB_TONES = ["from-pink-500 to-rose-500", "from-amber-500 to-orange-500", "from-cyan-500 to-sky-500", "from-violet-500 to-purple-500", "from-emerald-500 to-teal-500", "from-yellow-500 to-amber-500", "from-orange-500 to-red-500", "from-sky-500 to-indigo-500"];

const SECTION_TONES = new Map<typeof Gavel, { icon: string; bar: string; bg: string }>([
  [Gavel, { icon: "text-amber-500 dark:text-amber-400", bar: "from-amber-400 to-orange-500", bg: "from-amber-500/[0.05]" }],
  [Radio, { icon: "text-pink-500 dark:text-pink-400", bar: "from-pink-500 to-fuchsia-500", bg: "from-pink-500/[0.05]" }],
  [Users, { icon: "text-emerald-500 dark:text-emerald-400", bar: "from-emerald-400 to-teal-500", bg: "from-emerald-500/[0.05]" }],
  [Search, { icon: "text-cyan-500 dark:text-cyan-400", bar: "from-cyan-400 to-sky-500", bg: "from-cyan-500/[0.05]" }],
  [Wallet, { icon: "text-violet-500 dark:text-violet-400", bar: "from-violet-500 to-purple-500", bg: "from-violet-500/[0.05]" }],
  [Newspaper, { icon: "text-orange-500 dark:text-orange-400", bar: "from-orange-400 to-red-500", bg: "from-orange-500/[0.05]" }],
  [History, { icon: "text-sky-500 dark:text-sky-400", bar: "from-sky-400 to-indigo-500", bg: "from-sky-500/[0.05]" }],
]);

const spendText = (m: { spent: number | null; spentUsd: number | null }) => m.spent == null && m.spentUsd == null ? "Not recorded" : pulseMoney(m.spent, m.spentUsd);
const unsoldText = (m: PulseModel) => m.historical && !m.unsold ? "Not in archive" : m.unsold;
const Empty = ({ children }: { children: React.ReactNode }) => <div className={`${card} p-6 text-sm text-slate-600 dark:text-white/60`}>{children}</div>;

const Section = ({ icon: Icon, title, note, className = "", children }: { icon: typeof Gavel; title: string; note?: string; className?: string; children: React.ReactNode }) => {
  const tone = SECTION_TONES.get(Icon) ?? SECTION_TONES.get(Radio)!;
  return (
    <section className={`${card} relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-[#0B1020] dark:to-[#070c18] p-4 sm:p-5 space-y-3 ${className}`}>
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${tone.bar}`} />
      <div className="flex flex-wrap items-center gap-2">
        <Icon className={`w-4 h-4 ${tone.icon}`} />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white/80">{title}</h2>
        {note && <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-200/80 font-medium">{note}</span>}
      </div>
      {children}
    </section>
  );
};

/* SECTION 4: HIGH-CONTRAST FRANCHISE PURSE BOARD */
function FranchisePurseBoard({ model }: { model: PulseModel }) {
  const totalRemaining = model.teams.reduce((acc, t) => acc + (t.remaining ?? 0), 0);
  const totalSpent = model.teams.reduce((acc, t) => acc + (t.spent ?? 0), 0);

  return (
    <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-white/10 gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-500" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white/80">
              Franchise Purse Board
            </h2>
          </div>
          <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-white/50">
            Total Remaining: <span className="text-emerald-600 dark:text-emerald-400 font-black">{pulseMoney(totalRemaining)}</span>
          </div>
        </div>

        {/* 2-Column Grid of Distinct, High-Contrast Team Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          {model.teams.map(t => {
            const pct = t.startingPurse && t.spent != null
              ? Math.min(100, Math.round((t.spent / t.startingPurse) * 100))
              : 0;
            const accent = teamHex(t.code);

            return (
              <div
                key={t.code}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100/80 dark:hover:bg-white/[0.05] p-3 transition-all flex flex-col justify-between gap-2 shadow-xs group"
                style={{ borderLeftColor: accent, borderLeftWidth: "4px" }}
              >
                {/* Team & Purse Top Line */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TeamLogo team={t.code} size="w-6 h-6 shrink-0" />
                    <span className="font-black text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white truncate">
                      {t.code}
                    </span>
                  </div>
                  <div className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                    {t.remaining == null ? "Unverified" : `${pulseMoney(t.remaining)} left`}
                  </div>
                </div>

                {/* Progress bar of purse spent */}
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: accent }}
                  />
                </div>

                {/* Bottom stats: Spent and squad count */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/50 pt-0.5">
                  <span>{t.purchases.length ? `${spendText(t)} spent (${pct}%)` : "No buys yet"}</span>
                  <span className="font-bold text-slate-700 dark:text-white/70">
                    {t.purchases.length} bought · {t.slots ?? (25 - (t.squad ?? 0))} slots open
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-slate-400 dark:text-white/40 pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <span>Official Purse Allocations & Expenditure</span>
        <span>Squad Limit: 25 Players</span>
      </div>
    </div>
  );
}

/* TOP HAMMER ACQUISITIONS SIDEBAR COMPONENT */
function TopHammerPurchases({ model }: { model: PulseModel }) {
  return (
    <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-500" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white/80">
              Top Hammer Acquisitions
            </h2>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            IPL {model.season}
          </span>
        </div>

        <div className="space-y-1.5 overflow-hidden">
          {model.ranked.slice(0, 8).map((l, i) => (
            <div
              key={l.id}
              className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-all"
            >
              <span className="w-4 text-center text-slate-400 dark:text-white/40 font-mono text-[11px] font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold text-slate-900 dark:text-white tracking-tight">
                  {l.player}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-white/40">{roleBand(l.role)}</div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {pulseMoney(l.price, l.usd)}
                </span>
                <span
                  className="font-black text-[9px] px-1.5 py-0.5 rounded mt-0.5"
                  style={{
                    color: teamHex(l.team ?? ""),
                    backgroundColor: `${teamHex(l.team ?? "")}18`,
                  }}
                >
                  {l.team}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-400 dark:text-white/40 pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <span>Highest Historical Bids</span>
        <span>Verified Results</span>
      </div>
    </div>
  );
}

/* SECTION 3: OVERVIEW TAB CONTENT */
function Overview({ model, pulse, phase, go }: { model: PulseModel; pulse: Pulse; phase: string; go: (t: PulseTab) => void }) {
  const steps = [
    {
      n: "01",
      t: "Retentions",
      d: "Confirmed squads & retention decisions",
      to: "Retentions" as PulseTab,
      cardClasses: "bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-[#0B1020] border-emerald-200/90 hover:border-emerald-400 dark:border-white/10 dark:hover:border-emerald-500/40",
      numClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      n: "02",
      t: "Auction",
      d: "Live bidding, hammer prices & transactions",
      to: "Live Auction" as PulseTab,
      cardClasses: "bg-gradient-to-br from-amber-50 via-orange-50/60 to-white dark:from-amber-950/40 dark:via-orange-950/20 dark:to-[#0B1020] border-amber-200/90 hover:border-amber-400 dark:border-white/10 dark:hover:border-amber-500/40",
      numClass: "text-amber-600 dark:text-amber-400",
    },
    {
      n: "03",
      t: "Aftermath",
      d: "Final squads, compositions & squad analysis",
      to: "Results" as PulseTab,
      cardClasses: "bg-gradient-to-br from-violet-50 via-fuchsia-50/60 to-white dark:from-violet-950/40 dark:via-fuchsia-950/20 dark:to-[#0B1020] border-violet-200/90 hover:border-violet-400 dark:border-white/10 dark:hover:border-violet-500/40",
      numClass: "text-violet-600 dark:text-violet-400",
    },
  ];

  const totalRegistered = model.rows.length;
  const remPurseTotal = model.teams.reduce((acc, t) => acc + (t.remaining ?? 0), 0);
  const totalRetained = model.teams.reduce((acc, t) => acc + (t.retained ?? 0), 0);
  const topLot = model.ranked[0] ?? null;

  return (
    <div className="space-y-6">
      {/* 1. SIDE-BY-SIDE: FRANCHISE PURSE BOARD (7 cols) + TOP HAMMER BUYS (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <FranchisePurseBoard model={model} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <TopHammerPurchases model={model} />
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE: IPL AT A GLANCE (LEFT) + 3 ACTION CARDS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT: IPL AT A GLANCE (7-8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <Section
            icon={Radio}
            title={`IPL ${model.season} at a glance`}
            note={`Phase: ${phase}`}
            className="p-5 h-full flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Status Header Meta */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-white/60 pb-2.5 border-b border-slate-200 dark:border-white/10 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {model.historical ? "Official Auction Results" : "Live Pulse Feed"}
                  </span>
                  {model.foundation?.venue && (
                    <span className="text-slate-500 dark:text-white/50 hidden sm:inline">· {model.foundation.venue}</span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400 dark:text-white/40">
                  {model.foundation?.verifiedAt
                    ? `Verified: ${model.foundation.verifiedAt}`
                    : model.season === 2027 && pulse.desk.data?.updatedAt
                    ? `Updated: ${stamp(pulse.desk.data.updatedAt)}`
                    : "Official BCCI Release"}
                </div>
              </div>

              {/* Primary Financial & Volume Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Kpi k="Players Sold" v={model.sold} tone="text-emerald-600 dark:text-emerald-400" />
                <Kpi k="Unsold" v={unsoldText(model)} tone="text-rose-600 dark:text-rose-400" />
                <Kpi k="Total Expenditure" v={spendText(model)} tone="text-amber-600 dark:text-amber-300" />
                <Kpi
                  k="Remaining Purse"
                  v={remPurseTotal > 0 ? pulseMoney(remPurseTotal) : "Cap Exhausted"}
                  tone="text-purple-600 dark:text-purple-300"
                />
              </div>

              {/* Secondary Squad & Pool Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Kpi k="Auction Pool" v={`${totalRegistered} Lots`} tone="text-slate-800 dark:text-white" />
                <Kpi k="Retained Core" v={`${totalRetained} Players`} tone="text-cyan-600 dark:text-cyan-300" />
                <Kpi k="Franchises" v={`${model.teams.length} Teams`} tone="text-slate-700 dark:text-white/80" />
                <Kpi
                  k="Top Hammer Price"
                  v={topLot ? pulseMoney(topLot.price, topLot.usd) : "—"}
                  tone="text-emerald-600 dark:text-emerald-300"
                />
              </div>

              {/* Highlight Card for Top Purchase */}
              {topLot && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                      Record Buy
                    </span>
                    <div className="truncate">
                      <strong className="text-slate-900 dark:text-white font-black text-xs sm:text-sm tracking-tight">{topLot.player}</strong>
                      <span className="text-slate-500 dark:text-white/40 text-xs ml-2">
                        Sold to <span className="font-bold text-slate-800 dark:text-white" style={{ color: teamHex(topLot.team) }}>{topLot.team}</span>
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm shrink-0">
                    {pulseMoney(topLot.price, topLot.usd)}
                  </div>
                </div>
              )}

              {/* 2027 Timeline or 2026 Metadata Footer */}
              {model.season === 2027 ? (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">IPL 2027 timeline</div>
                  <ol className="space-y-1.5">
                    {HUB_EVENTS.map(e => (
                      <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 text-xs">
                        <span className="w-24 font-mono text-slate-500 dark:text-white/50">{e.date ?? "TBA"}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{e.title}</span>
                        <span className={`text-[9px] font-black uppercase ${e.status === "confirmed" ? "text-emerald-600 dark:text-emerald-400" : e.status === "reported" ? "text-amber-600 dark:text-amber-300" : "text-slate-400 dark:text-white/40"}`}>
                          {e.status === "provisional" ? "to be announced" : e.status}
                        </span>
                        {e.sourceUrl && (
                          <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">
                            source <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-white/50 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Venue: {model.foundation?.venue ?? "Etihad Arena, Abu Dhabi"}</span>
                    <span className="text-slate-300 dark:text-white/20">·</span>
                    <span>Event Date: {model.foundation?.eventDate ?? "Dec 16, 2025"}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-white/40">
                    Squad Rules: Max 25 players / 8 overseas
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* RIGHT: THE 3 AUCTION LIFECYCLE ACTION CARDS (Stacked vertically) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between gap-3.5 sm:gap-4">
          {steps.map(step => (
            <button
              key={step.n}
              onClick={() => go(step.to)}
              className={`flex-1 rounded-[20px] p-5 text-left transition-all duration-200 border hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between group shadow-sm min-h-[96px] cursor-pointer ${step.cardClasses}`}
            >
              <div className="space-y-1.5 min-w-0 pr-3">
                <div className="flex items-center gap-2.5">
                  <span className={`text-2xl font-black tracking-tight font-mono shrink-0 ${step.numClass}`}>{step.n}</span>
                  <span className="font-black text-slate-900 dark:text-white text-base uppercase tracking-wider truncate">{step.t}</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-white/60 group-hover:text-slate-900 dark:group-hover:text-white/90 transition-colors line-clamp-2">{step.d}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/15 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 transition-colors ml-2">
                <span className="text-slate-600 dark:text-white/60 group-hover:text-slate-900 dark:group-hover:text-white text-base font-bold transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. EXPANDABLE FRANCHISE DIRECTORY TABLE */}
      <Franchises model={model} compact />
      {pulse.desk.data && pulse.desk.data.announcements.length > 0 && <LiveBlog model={model} pulse={pulse} />}
      <Newsroom />
    </div>
  );
}

function LiveAuction({ model, pulse, active }: { model: PulseModel; pulse: Pulse; active: number }) {
  const [i, setI] = useState(0);
  const historical = active !== 2027;
  const lot = historical ? model.rows[Math.min(i, model.rows.length - 1)] : model.onBlock ?? [...model.rows].filter(r => r.recordedAt).sort((a, b) => b.recordedAt!.localeCompare(a.recordedAt!))[0];
  const recent = historical ? model.purchases.slice(0, 10) : model.purchases.filter(p => p.recordedAt).sort((a, b) => b.recordedAt!.localeCompare(a.recordedAt!)).slice(0, 10);
  const done = model.rows.filter(r => ["sold", "unsold", "withdrawn", "recorded"].includes(r.status)).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Section icon={Gavel} title={historical ? "Result snapshot" : model.onBlock ? "Current lot" : "Latest recorded lot"} note={!historical ? undefined : model.rows.some(r => r.lot != null) ? "Sorted by published lot number; this is a result snapshot, not a timestamped replay" : "Archive order, not the verified auction sequence"}>
          <FeedStatus active={active} pulse={pulse} />
          {lot ? <LotCard lot={lot} model={model} /> : <div className="text-sm text-slate-600 dark:text-white/60">No lots recorded yet. The tracker fills in as official results are entered.</div>}
          {historical && model.rows.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => setI(Math.max(0, i - 1))} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white">Previous</button>
              <input type="range" min={0} max={model.rows.length - 1} value={i} onChange={e => setI(Number(e.target.value))} className="flex-1 accent-orange-500" aria-label="Snapshot" />
              <button onClick={() => setI(Math.min(model.rows.length - 1, i + 1))} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white">Next</button>
              <span className="text-slate-500 dark:text-white/40 font-mono">{i + 1}/{model.rows.length}</span>
            </div>
          )}
        </Section>
        <Section icon={Radio} title="Auction progress">
          <div className="grid grid-cols-2 gap-2">
            <Kpi k="Completed lots" v={done} /><Kpi k="Remaining" v={model.rows.length - done} />
            <Kpi k="Sold" v={model.sold} tone="text-emerald-600 dark:text-emerald-400" /><Kpi k="Unsold" v={unsoldText(model)} tone="text-rose-600 dark:text-rose-400" />
            <Kpi k="Confirmed spend" v={spendText(model)} /><Kpi k="Pending" v={model.pending} tone="text-amber-600 dark:text-amber-300" />
          </div>
          <div className="text-[10px] text-slate-500 dark:text-white/40">Bid history and participating teams appear only when an official source provides them.</div>
        </Section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Gavel} title={historical ? "Confirmed purchases" : "Recently sold"}><LotList lots={recent} model={model} empty="No confirmed purchases yet." /></Section>
        <Section icon={Users} title="Up next">
          {model.upcoming.length ? <LotList lots={model.upcoming.slice(0, 10)} model={model} empty="" /> : <div className="text-sm text-slate-600 dark:text-white/60">{historical ? "Lot order isn't in the archive." : "The lot order hasn't been published."}</div>}
        </Section>
      </div>
    </div>
  );
}

function LotCard({ lot, model }: { lot: PulseLot; model: PulseModel }) {
  return (
    <div className="rounded-2xl border p-4 space-y-3 bg-white dark:bg-[#0B1020]" style={teamCard(lot.status === "sold" ? lot.team : null)}>
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
        {[lot.lot != null && `Lot #${String(lot.lot).padStart(3, "0")}`, roleBand(lot.role), lot.country, lot.country && (lot.country === "India" ? "Indian" : "Overseas"), lot.age != null && `Age ${lot.age}`, lot.capped != null && (lot.capped ? "Capped" : "Uncapped")].filter(Boolean).join(" · ")}
        {lot.set && <span className="block normal-case tracking-normal text-cyan-600 dark:text-cyan-300 font-semibold mt-0.5">{lot.set}</span>}
      </div>
      <Link href={`/players/${playerSlug(lot.player)}`} className="block text-2xl sm:text-3xl font-black text-slate-900 dark:text-white hover:underline">{lot.player}</Link>
      <div className="grid grid-cols-3 gap-2">
        <Kpi k="Base price" v={pulseMoney(lot.base, lot.baseUsd)} />
        <Kpi k={lot.status === "sold" ? "Final price" : "Current bid"} v={lot.status === "sold" ? pulseMoney(lot.price, lot.usd) : "Not provided"} tone="text-emerald-600 dark:text-emerald-400" />
        <Kpi k={lot.status === "sold" ? "Bought by" : "Status"} v={lot.status === "sold" ? lot.team : STATUS_LABEL[lot.status]} tone={STATUS_TONE[lot.status]} />
      </div>
      {lot.status === "sold" && <Insight lot={lot} model={model} />}
    </div>
  );
}

function LotList({ lots, model, empty }: { lots: PulseLot[]; model: PulseModel; empty: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!lots.length) return <div className="text-sm text-slate-600 dark:text-white/60">{empty}</div>;
  return (
    <ul className="divide-y divide-slate-100 dark:divide-white/5">
      {lots.map(l => (
        <li key={l.id} className="py-2.5 text-xs">
          <div className="flex items-center gap-2">
            {l.recordedAt && <span className="font-mono text-slate-400 dark:text-white/40 w-24 shrink-0">{stamp(l.recordedAt)}</span>}
            <Link href={`/players/${playerSlug(l.player)}`} className="flex-1 truncate font-bold text-slate-900 dark:text-white hover:underline">{l.player}</Link>
            <span className="text-slate-500 dark:text-white/40 hidden sm:inline">{roleBand(l.role)}</span>
            {l.team && <span className="font-black" style={{ color: teamHex(l.team) }}>{l.team}</span>}
            <span className={`w-20 text-right ${STATUS_TONE[l.status] ?? ""}`}>{l.status === "sold" ? pulseMoney(l.price, l.usd) : `${STATUS_LABEL[l.status]}${l.base != null ? ` · ${pulseMoney(l.base)}` : ""}`}</span>
            {l.status === "sold" && <button onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id} aria-label={`Insight for ${l.player}`} className="text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white cursor-pointer"><Brain className="w-3.5 h-3.5" /></button>}
          </div>
          {open === l.id && <div className="mt-2"><Insight lot={l} model={model} /></div>}
        </li>
      ))}
    </ul>
  );
}

function Insight({ lot, model }: { lot: PulseLot; model: PulseModel }) {
  const band = roleBand(lot.role);
  const value = lotValue(lot), usd = lot.price == null;
  const money = (v: number) => usd ? pulseMoney(null, v) : pulseMoney(v);
  const peers = model.purchases.filter(p => roleBand(p.role) === band && (usd ? p.price == null && p.usd != null : p.price != null)).map(lotValue).sort((a, b) => a! - b!) as number[];
  const median = peers.length ? (peers.length % 2 ? peers[(peers.length - 1) / 2] : (peers[peers.length / 2 - 1] + peers[peers.length / 2]) / 2) : null;
  const rank = value != null ? peers.filter(p => p > value).length + 1 : null;
  const similar = value != null ? model.purchases.filter(p => p.id !== lot.id && roleBand(p.role) === band && (p.price == null) === usd && lotValue(p) != null && Math.abs(lotValue(p)! - value) <= value * 0.3).slice(0, 4) : [];
  const stats = encodeURIComponent(lot.statsName ?? lot.player);
  const links: [string, string][] = [
    ["Signing fit · Squad DNA", `/ai-analyst/squad-dna?team=${lot.team}&season=${lot.season}`],
    ["Price context · Auction War Room", `/ai-analyst/auction-war-room?team=${lot.team}&player=${encodeURIComponent(lot.player)}`],
    ["Similar players · Player Pool Graph", `/ai-analyst/player-pool?player=${stats}`],
    ["Pressure Genome", `/ai-analyst/pressure?player=${stats}`],
    ["XI impact · Build Playing XI", "/arcade/build-your-xi"],
    ["Franchise strategy · Opposition Map", `/ai-analyst/opposition-map?team=${lot.team}`],
  ];
  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/60 dark:bg-purple-500/[0.05] p-3 space-y-2 text-[11px] text-slate-700 dark:text-white/70">
      <div className="font-black uppercase tracking-widest text-[9px] text-purple-700 dark:text-purple-300">CricField intelligence</div>
      {median != null && rank != null && value != null && band !== "Not recorded" && (
        <div>Price context: #{rank} of {peers.length} {band.toLowerCase()}s bought in {lot.season}; role median {money(median)} ({(value / median).toFixed(1)}× median).</div>
      )}
      {similar.length > 0 && band !== "Not recorded" && <div>Comparable buys: {similar.map(s => `${s.player} (${s.team}, ${pulseMoney(s.price, s.usd)})`).join(", ")}</div>}
      <div className="flex flex-wrap gap-x-3 gap-y-1">{links.map(([t, h]) => <Link key={t} href={h} className="text-primary hover:underline font-semibold">{t}</Link>)}</div>
    </div>
  );
}

function PlayerPool({ model }: { model: PulseModel }) {
  const [q, setQ] = useState(""), [role, setRole] = useState(""), [country, setCountry] = useState(""), [base, setBase] = useState(""), [team, setTeam] = useState(""), [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const countries = [...new Set(model.rows.map(r => r.country).filter((c): c is string => !!c))].sort();
  const statuses = [...new Set(model.rows.map(r => r.status))];
  const rows = model.rows.filter(r =>
    (!q || r.player.toLowerCase().includes(q.toLowerCase())) && (!role || roleBand(r.role) === role) && (!country || r.country === country)
    && (!base || baseBand(r.base) === base) && (!team || r.team === team) && (!status || r.status === status));
  const sel = "bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white";
  const opt = (v: string, t = v) => <option key={v} value={v} className="bg-white dark:bg-[#0B1020] text-slate-900 dark:text-white">{t}</option>;
  return (
    <Section icon={Search} title={`Player pool · IPL ${model.season}`} note={!model.historical ? undefined : model.unsold ? "Sold and unsold players who went under the hammer; withdrawn and shortlisted-only players aren't listed." : "The archive records sold players only; unsold and withdrawn players aren't listed."}>
      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[10rem]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Player name" aria-label="Player name" className={`${sel} w-full pl-8`} />
        </label>
        <select value={role} onChange={e => setRole(e.target.value)} aria-label="Role" className={sel}>{opt("", "All roles")}{["Batter", "Bowler", "All-rounder", "Wicketkeeper", "Not recorded"].map(v => opt(v))}</select>
        <select value={country} onChange={e => setCountry(e.target.value)} aria-label="Country" className={sel}>{opt("", "All countries")}{countries.map(v => opt(v))}</select>
        <select value={base} onChange={e => setBase(e.target.value)} aria-label="Base price" className={sel}>{opt("", "Any base price")}{BASE_BANDS.map(v => opt(v))}</select>
        <select value={team} onChange={e => setTeam(e.target.value)} aria-label="Franchise" className={sel}>{opt("", "All franchises")}{model.teams.map(t => opt(t.code))}</select>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status" className={sel}>{opt("", "Any status")}{statuses.map(s => opt(s, STATUS_LABEL[s]))}</select>
      </div>
      <div className="text-[10px] text-slate-500 dark:text-white/40">{rows.length} of {model.rows.length} players</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[820px]">
          <thead className="text-slate-500 dark:text-white/40 text-[9px] uppercase border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="text-left py-2">Lot</th><th className="text-left">Player</th><th className="text-left">Role</th><th className="text-left">Auction set</th><th className="text-right">Base</th><th className="text-left pl-3">Status</th><th className="text-right">Final price</th><th className="text-left pl-3">Franchise</th><th className="text-right">Scout Lab</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map(r => (
              <React.Fragment key={r.id}>
                <tr className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                  <td className="py-2 font-mono text-slate-400 dark:text-white/40">{r.lot ?? "—"}</td>
                  <td><span className="font-bold text-slate-900 dark:text-white">{r.player}</span>{r.country && <span className="text-slate-400 dark:text-white/40"> · {r.country}</span>}</td>
                  <td className="text-slate-600 dark:text-white/70">{roleBand(r.role)}</td>
                  <td className="text-slate-500 dark:text-white/50 max-w-[10rem] truncate" title={r.set ?? undefined}>{r.set?.replace(/^Set \d+: /, "") ?? (r.status === "unsold" ? "Not published" : "—")}</td>
                  <td className="text-right font-mono text-slate-700 dark:text-white/80">{pulseMoney(r.base, r.baseUsd)}</td>
                  <td className={`pl-3 ${STATUS_TONE[r.status] ?? ""}`}>{STATUS_LABEL[r.status]}</td>
                  <td className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.status === "sold" ? pulseMoney(r.price, r.usd) : "—"}</td>
                  <td className="pl-3 font-black" style={{ color: teamHex(r.team ?? "") }}>{r.team ?? "—"}</td>
                  <td className="text-right space-x-2 whitespace-nowrap">
                    <Link href={`/players/${playerSlug(r.player)}`} className="text-primary hover:underline">Profile</Link>
                    {r.status === "sold" && <button onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} className="text-purple-600 dark:text-purple-300 hover:underline cursor-pointer">Insight</button>}
                  </td>
                </tr>
                {open === r.id && <tr><td colSpan={9} className="pb-2"><Insight lot={r} model={model} /></td></tr>}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {rows.length > 300 && <div className="text-[10px] text-slate-500 dark:text-white/40 pt-2">Showing the first 300. Narrow the filters to see the rest.</div>}
        <Sources model={model} />
      </div>
    </Section>
  );
}

function Sources({ model }: { model: PulseModel }) {
  const urls = [...new Set(model.rows.map(r => r.sourceUrl).filter((u): u is string => !!u))];
  if (!urls.length) return null;
  return (
    <div className="text-[10px] text-slate-500 dark:text-white/40 pt-2 flex flex-wrap gap-x-3">
      <span>Sources:</span>
      {urls.map(u => <a key={u} href={u} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">{new URL(u).hostname.replace(/^www\.|^en\./, "")} <ExternalLink className="w-3 h-3" /></a>)}
    </div>
  );
}

/* SECTION 2.D: FRANCHISE AUCTION BOARD */
function Franchises({ model, compact = false }: { model: PulseModel; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Section icon={Wallet} title="Franchise auction board" note={model.foundation ? "Purses from the official retention release" : undefined}>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-white/50 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="text-left py-3 pl-4 min-w-[130px]">Franchise</th>
              <th className="text-right py-3 px-3">Start Purse</th>
              <th className="text-right py-3 px-3">Total Spent</th>
              <th className="text-right py-3 px-3">Remaining</th>
              <th className="text-right py-3 px-3">Bought</th>
              <th className="text-right py-3 px-3">Squad</th>
              <th className="text-right py-3 px-3">Overseas</th>
              <th className="text-right py-3 px-3">Slots Open</th>
              <th className="py-3 pr-4 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#0B1020]">
            {model.teams.map(t => (
              <React.Fragment key={t.code}>
                <tr
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                  onClick={() => setOpen(open === t.code ? null : t.code)}
                  style={{
                    boxShadow: `inset 3px 0 0 ${teamHex(t.code)}`,
                    background: `linear-gradient(90deg, ${tint(t.code, open === t.code ? "20" : "0A")}, transparent 75%)`
                  }}
                >
                  <td className="py-3 pl-4 pr-3 font-black whitespace-nowrap" style={{ color: teamHex(t.code) }}>
                    <div className="flex items-center gap-2.5">
                      <TeamLogo team={t.code} size="w-7 h-7 shrink-0" />
                      <span className="text-sm tracking-tight">{t.code}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-3 font-mono text-slate-700 dark:text-white/70">{t.startingPurse == null ? "Unverified" : pulseMoney(t.startingPurse)}</td>
                  <td className="text-right py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-300">{t.purchases.length ? spendText(t) : "—"}</td>
                  <td className="text-right py-3 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">{t.remaining == null ? "Unverified" : pulseMoney(t.remaining)}</td>
                  <td className="text-right py-3 px-3 font-mono text-slate-800 dark:text-white/80">{t.purchases.length}</td>
                  <td className="text-right py-3 px-3 font-mono text-slate-800 dark:text-white/80">{t.squad ?? "—"}</td>
                  <td className="text-right py-3 px-3 font-mono text-cyan-700 dark:text-cyan-300">{t.overseas == null ? "—" : `${t.overseas}${model.foundation ? `/${model.foundation.maxOverseas}` : ""}`}</td>
                  <td className="text-right py-3 px-3 font-mono text-slate-500 dark:text-white/50">{t.slots ?? "—"}</td>
                  <td className="text-right py-3 pr-4">
                    <button
                      aria-expanded={open === t.code}
                      aria-label={`${t.code} details`}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white cursor-pointer"
                    >
                      <ChevronDown className={`w-4 h-4 inline transition-transform duration-200 ${open === t.code ? "rotate-180" : ""}`} />
                    </button>
                  </td>
                </tr>
                {open === t.code && (
                  <tr>
                    <td colSpan={9} className="pb-3 pt-1 px-4 bg-slate-50/50 dark:bg-black/20">
                      <TeamDrawer t={t} model={model} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {compact && <div className="text-[11px] text-slate-500 dark:text-white/40 pt-1">Click on any franchise row to inspect its retained core, auction purchases, and tactical squad links.</div>}
    </Section>
  );
}

function TeamDrawer({ t, model }: { t: PulseTeam; model: PulseModel }) {
  const needs = t.slots != null && t.slots > 0 ? `${t.slots} slot${t.slots === 1 ? "" : "s"} open` : t.slots === 0 ? "Squad full" : null;
  return (
    <div className="rounded-xl border p-4 grid gap-3 md:grid-cols-2 text-[11px] bg-white dark:bg-[#0B1020]" style={teamCard(t.code)}>
      <div>
        <div className="font-black uppercase text-[9px] tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Retained core ({t.retained ?? t.core.length})</div>
        <div className="text-slate-700 dark:text-white/70 leading-relaxed">{t.core.length ? t.core.map(p => p.name).join(", ") : "No retention list recorded."}</div>
        {needs && <div className="mt-2 text-amber-700 dark:text-amber-200/80 font-medium">Recruitment: {needs}{t.overseas != null && model.foundation ? `, ${Math.max(0, model.foundation.maxOverseas - t.overseas)} overseas` : ""}.</div>}
      </div>
      <div>
        <div className="font-black uppercase text-[9px] tracking-widest text-pink-600 dark:text-pink-300 mb-1">Bought at auction ({t.purchases.length})</div>
        <ul className="space-y-1">{[...t.purchases].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).map(p => (
          <li key={p.id} className="flex justify-between gap-2 py-0.5 border-b border-slate-100 dark:border-white/5"><span className="text-slate-800 dark:text-white truncate">{p.player} <span className="text-slate-400 dark:text-white/40">({roleBand(p.role)})</span></span><span className="text-emerald-600 dark:text-emerald-300 font-mono font-bold shrink-0">{pulseMoney(p.price, p.usd)}</span></li>
        ))}</ul>
      </div>
      {isTeamCode(t.code) && <div className="md:col-span-2 flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-slate-200 dark:border-white/10 font-bold">
        <Link href={`/dugout/${t.code}`} className="text-primary hover:underline">{t.code} Dugout</Link>
        <Link href={`/ai-analyst/squad-dna?team=${t.code}&season=${model.season}`} className="text-primary hover:underline">Squad DNA</Link>
        <Link href={`/ai-analyst/auction-war-room?team=${t.code}`} className="text-primary hover:underline">Auction War Room</Link>
        <Link href={`/ai-analyst/opposition-map?team=${t.code}`} className="text-primary hover:underline">Tactics</Link>
        <Link href={`/feed/squad?team=${t.code}`} className="text-primary hover:underline">Retention Room</Link>
      </div>}
    </div>
  );
}

function Retentions({ model, pulse }: { model: PulseModel; pulse: Pulse }) {
  const desk = pulse.desk.data;
  const released = (code: string) => model.historical ? [] : (desk?.retentions ?? []).filter(r => r.team === code && r.decision === "released").map(r => r.player);
  return (
    <Section icon={Users} title={`Retentions · IPL ${model.season}`} note={model.historical ? "Retained core from the official squad list" : "From the official announcement"}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {model.teams.map(t => (
          <div key={t.code} className="rounded-xl border p-3 text-xs space-y-1.5 bg-white dark:bg-[#0B1020]" style={teamCard(t.code)}>
            <div className="flex items-baseline justify-between">{isTeamCode(t.code) ? <Link href={`/dugout/${t.code}`} className="font-black" style={{ color: teamHex(t.code) }}>{t.code}</Link> : <span className="font-black" style={{ color: teamHex(t.code) }}>{t.code}</span>}
              <span className="text-slate-500 dark:text-white/50 text-[11px] font-mono">{t.retained == null ? "Not announced" : `${t.retained} retained`}{t.startingPurse != null ? ` · ${pulseMoney(t.startingPurse)} purse` : ""}</span></div>
            <div><span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Retained </span><span className="text-slate-700 dark:text-white/70">{t.core.map(p => p.name).join(", ") || "Not announced"}</span></div>
            {released(t.code).length > 0 && <div><span className="text-[9px] font-black uppercase text-red-600 dark:text-red-400">Released </span><span className="text-slate-700 dark:text-white/70">{released(t.code).join(", ")}</span></div>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] pt-1">
        <Link href="/feed/squad" className="text-primary hover:underline">Feed → Squad Building → Retention Room (your picks vs reality)</Link>
        <Link href="/feed/ipl-2027/retentions" className="text-primary hover:underline">Full IPL 2027 retention list</Link>
        {model.foundation && <a href={model.foundation.sourceUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">Official source <ExternalLink className="w-3 h-3" /></a>}
      </div>
    </Section>
  );
}

function Results({ model }: { model: PulseModel }) {
  const unsold = model.rows.filter(r => r.status === "unsold");
  const max = Math.max(1, ...model.teams.map(t => t.spent ?? t.spentUsd ?? 0));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Gavel} title="Biggest purchases"><LotList lots={model.ranked.slice(0, 12)} model={model} empty="No confirmed purchases." /></Section>
        <Section icon={Wallet} title="Spend by franchise">
          {model.teams.map(t => (
            <div key={t.code} className="flex items-center gap-2 text-xs py-1">
              <span className="w-12 font-black" style={{ color: teamHex(t.code) }}>{t.code}</span>
              <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((t.spent ?? t.spentUsd ?? 0) / max) * 100}%`, background: teamHex(t.code) }} />
              </div>
              <span className="w-20 text-right font-mono font-bold text-slate-800 dark:text-white">{t.purchases.length ? spendText(t) : "—"}</span>
            </div>
          ))}
        </Section>
      </div>
      <Section icon={Users} title={`Unsold (${unsold.length})`}>
        {unsold.length ? (
          <div className="flex flex-wrap gap-1.5">
            {[...unsold].sort((a, b) => (b.base ?? 0) - (a.base ?? 0)).map(u => (
              <Link key={u.id} href={`/players/${playerSlug(u.player)}`} className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${u.capped ? "border-red-400 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-white" : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10"}`}>
                {u.player} <span className="text-slate-400 dark:text-white/40">{u.country && u.country !== "India" ? "· OS " : ""}· {pulseMoney(u.base)}</span>
              </Link>
            ))}
          </div>
        ) : <div className="text-xs text-slate-600 dark:text-white/70">{model.historical ? "The archive doesn't record unsold players for this season." : "No unsold players recorded."}</div>}
        {unsold.length > 0 && <div className="text-[10px] text-slate-500 dark:text-white/40">Red outline = capped player. OS = overseas. Price shown is base price.</div>}
        <Sources model={model} />
      </Section>
      <Franchises model={model} />
    </div>
  );
}

function LiveBlog({ model, pulse }: { model: PulseModel; pulse: Pulse }) {
  const desk = pulse.desk.data;
  const entries = [
    ...(desk?.announcements ?? []).map(a => ({
      at: a.recordedAt,
      team: a.team,
      text: a.headline,
      src: a.sourceUrl,
      tag: a.verification,
      publishedOn: (a as any).publishedOn,
      eventDate: (a as any).eventDate,
      context: (a as any).context,
    })),
    ...(model.historical ? [] : model.rows.filter(r => r.recordedAt && r.status !== "pending").map(r => ({
      at: r.recordedAt!,
      team: r.team ?? undefined,
      src: r.sourceUrl ?? undefined,
      tag: "Official Announcement" as const,
      publishedOn: undefined,
      eventDate: undefined,
      context: undefined,
      text: r.status === "sold" ? `${r.player} sold to ${r.team} for ${pulseMoney(r.price)}` : `${r.player}: ${STATUS_LABEL[r.status].toLowerCase()}`,
    }))),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const tagBadge = (tag: string) => {
    switch (tag) {
      case "Official Announcement":
      case "confirmed":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
      case "Credible Report":
      case "reported":
        return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30";
      case "Analyst Prediction":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30";
      case "Rumor":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30";
      default:
        return "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70 border border-slate-200 dark:border-white/10";
    }
  };

  return (
    <Section icon={Newspaper} title="Auction Pulse Intelligence Feed" note="Verified, source-backed updates distinguishing official decisions from projections">
      {entries.length ? (
        <div className="space-y-3">
          {entries.slice(0, 60).map((e, i) => (
            <article key={i} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all space-y-2.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${tagBadge(e.tag)}`}>
                    {e.tag}
                  </span>
                  {e.team && <span className="font-black text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" style={{ color: teamHex(e.team) }}>{e.team}</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-white/45 font-mono">
                  {e.publishedOn && <span>Published: {e.publishedOn}</span>}
                  {e.eventDate && <span>· Target Event: {e.eventDate}</span>}
                  <span>· {stamp(e.at)}</span>
                </div>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{e.text}</h4>
              {e.context && (
                <div className="text-xs text-slate-700 dark:text-white/75 leading-relaxed bg-slate-50 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                  <span className="text-slate-400 dark:text-white/40 font-bold uppercase text-[9px] tracking-wider block mb-0.5">Franchise Context & Analysis</span>
                  {e.context}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] border-t border-slate-100 dark:border-white/5 gap-2">
                <span className="text-[10px] text-slate-500 dark:text-white/40 italic">
                  {String(e.tag) === "Official Announcement" ? "✓ Verified official decision (BCCI / Franchise)" : String(e.tag) === "Credible Report" ? "📰 Credible tier-1 sports journalist report" : String(e.tag) === "Analyst Prediction" ? "🧠 CricField proprietary tactical projection (not official)" : "⚡ Market discussion / unverified negotiation"}
                </span>
                {e.src && (
                  <a href={e.src} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 font-bold text-xs">
                    View Primary Source <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="text-sm text-slate-600 dark:text-white/60">No timestamped updates recorded yet.</div>}
      <Newsroom />
    </Section>
  );
}

const Newsroom = () => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] pt-1 font-semibold">
    <Link href="/feed/auction" className="text-primary hover:underline">Feed · Auction analysis</Link>
    <Link href="/dugout" className="text-primary hover:underline">Editorial Dugout</Link>
    <Link href="/arcade/auction-room" className="text-primary hover:underline">Play the auction game (simulated, separate from results)</Link>
  </div>
);

function Archive({ pulse, active, pick }: { pulse: Pulse; active: number; pick: (s: number) => void }) {
  const rows = pulse.archive.data ?? [];
  return (
    <Section icon={History} title="Auction archive" note="Verified historical sale records">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {pulse.seasons.map(s => {
          const sold = rows.filter(r => r.season === s && (r.soldLakh != null || r.soldUsd != null));
          const inr = sold.every(r => r.soldLakh != null), v = (r: typeof sold[number]) => (inr ? r.soldLakh : r.soldUsd) ?? 0;
          const total = sold.reduce((n, r) => n + v(r), 0);
          const top = sold.reduce<typeof sold[number] | undefined>((a, r) => !a || v(r) > v(a) ? r : a, undefined);
          return (
            <button
              key={s}
              onClick={() => pick(s)}
              className={`rounded-xl border p-3 text-left text-xs transition-all cursor-pointer ${
                s === active
                  ? "border-orange-500 bg-orange-500/10 shadow-sm"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 bg-slate-50 dark:bg-white/[0.03]"
              }`}
            >
              <div className="font-black text-slate-900 dark:text-white text-base">IPL {s}</div>
              <div className="text-slate-500 dark:text-white/50">{sold.length} sales · {inr ? pulseMoney(total) : pulseMoney(null, total)}</div>
              {top && <div className="text-slate-700 dark:text-white/70 truncate mt-1">Top: {top.player} {pulseMoney(top.soldLakh, top.soldUsd)}</div>}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

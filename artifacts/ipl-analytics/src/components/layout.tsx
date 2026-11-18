import {ReturnNavigator} from './return-navigator';
import { MobileNavigation } from './mobile-navigation';
import {AnalystWorkspace} from "@/components/decision/analyst-workspace";
import {PreseasonRecruitment} from "@/components/scout/preseason-recruitment";
import { supabaseConfigured } from "@/lib/supabase";
import "./layout-editorial.css";
import React, { useState, useEffect, useContext } from "react";
import { Link, useLocation } from "wouter";
import { MobileChromeContext } from "@/mobile/gate";
import { 
  Home, BarChart2, Briefcase, TrendingUp, Cpu, FileText, Newspaper, Activity, Bell, Star,
  Zap, Trophy, Sparkles, Gavel, Calendar, List, Radio, ShoppingBag, Shield, Compass, Gamepad2, UserRound, Search
} from "lucide-react";
import { AssistantLauncher } from "@/components/assistant-launcher";
import { motion, motionValue, useTransform, AnimatePresence } from "framer-motion";
import { SlicerPanel, type SlicerState } from "@/components/slicer-panel";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import { SiteFooter } from "@/components/site-footer";
import { CricfieldLogo } from "@/components/cricfield-logo";
import { AnalystNavigator } from "@/components/analyst-navigator";
import { TeamSwitcher } from "@/components/team-switcher";
import { UniversalHeaderSearch } from "@/components/universal-header-search";

const PLAYER_IMAGES = [
  { src: "/ipl-logo.jpg", alt: "IPL Logo" },
  { src: "/msd.jpg", alt: "MS Dhoni" },
  { src: "/virat kohli.jpg", alt: "Virat Kohli" },
  { src: "/suresh raina.jpg", alt: "Suresh Raina" },
  { src: "/ab devillers.jpg", alt: "AB de Villiers" },
  { src: "/sanju samson.jpg", alt: "Sanju Samson" },
];

const PRIMARY_NAV_LINKS: Array<{ label: string; href: string; hideOnMd?: boolean }> = [
  { label: "Home", href: "/home" },
  { label: "Auction", href: "/auction" },
  { label: "Scores", href: "/scores" },
  { label: "Stats", href: "/stats" },
  { label: "Pressure Lab", href: "/pressurelab" },
  { label: "Dugout", href: "/dugout" },
  { label: "Editorials", href: "/editorials" },
];

// Universal search input is powered by UniversalHeaderSearch with active autocomplete dropdown

const SIDEBAR_ITEMS = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Radio, label: "Auction", href: "/auction" },
  { icon: Newspaper, label: "Feed & 2027 Intel", href: "/feed" },
  { icon: FileText, label: "Editorials", href: "/editorials" },
  { icon: Shield, label: "My Dugout", href: "/dugout" },
  { icon: Compass, label: "Pressure Lab", href: "/pressurelab" },
  { icon: List, label: "Stats Centre", href: "/stats" },
  { icon: Zap, label: "Scores", href: "/scores" },
  { icon: BarChart2, label: "Visuals", href: "/visualizations" },
];

function LiveScoreSnippet() {
  const { data } = useLiveIplMatches();
  const liveMatch = data?.matches?.find(m => /progress|innings/i.test(m.matchInfo.state));
  
  if (!liveMatch) return null;
  
  const score = getMatchScoreLine(liveMatch);
  
  return (
    <Link href={`/scores`} className="hidden md:block shrink-0">
      <div className="flex items-center gap-3 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 ml-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-all group/score">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 dark:text-white/60 group-hover/score:text-primary transition-colors">{liveMatch.matchInfo.team1.teamSName}</span>
            <span className="text-[10px] font-bold text-slate-900 dark:text-white">{score.team1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 dark:text-white/60 group-hover/score:text-primary transition-colors">{liveMatch.matchInfo.team2.teamSName}</span>
            <span className="text-[10px] font-bold text-slate-900 dark:text-white">{score.team2}</span>
          </div>
        </div>
        <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
        <div className="flex flex-col justify-center">
          <span className="text-[8px] font-black text-primary uppercase tracking-tighter">LIVE</span>
          <span className="text-[7px] font-bold text-slate-400 dark:text-white/40 uppercase truncate max-w-[60px]">{liveMatch.matchInfo.status}</span>
        </div>
      </div>
    </Link>
  );
}

export function Layout({ 
  children, 
  hideHeaderProgress, 
  hideRightPanel,
  hideHeader,
  hideSidebar,
  sidebarItems = SIDEBAR_ITEMS
}: { 
  children: React.ReactNode; 
  hideHeaderProgress?: any;
  hideRightPanel?: boolean;
  hideHeader?: boolean;
  hideSidebar?: boolean;
  sidebarItems?: typeof SIDEBAR_ITEMS;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const isNavActive = (href: string) => {
    const path = location.split("?")[0].replace(/\/+$/, "") || "/";
    if (href === "/home") {
      return path === "/" || path === "/home";
    }
    if (href === "/editorials") {
      return path === "/editorials" || path === "/intelligence" || path.startsWith("/editorials/") || path.startsWith("/intelligence/");
    }
    return path === href || path.startsWith(`${href}/`);
  };

  const fallback = motionValue(0);
  const hdrOpacity = useTransform(hideHeaderProgress ?? fallback, [0.01, 0.05], [1, 0]);
  const hdrY = useTransform(hideHeaderProgress ?? fallback, [0.01, 0.05], [0, -80]);
  const rightPanelOpacity = useTransform(hideHeaderProgress ?? fallback, [0.01, 0.05], [1, 0.15]);
  // Inside the CRICFIELD Mobile shell (below 1024px only) the shell supplies navigation, so the page renders
  // without the desktop header, rails, footer and mobile drawer. On desktop this flag is never set.
  const mobileShell = useContext(MobileChromeContext);
  if (mobileShell) {
    const path = location.split("?")[0];
    return (
      <div className="editorial-shell cfm-legacy bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative antialiased transition-colors duration-200">
        <main
          data-analytics-theme={["/stats", "/visualizations"].includes(path) ? "true" : undefined}
          data-team-surfaces={["/stats", "/visualizations", "/scores", "/auction", "/feed"].includes(path) ? "true" : undefined}
          data-white-titles={location.startsWith("/dugout") || path === "/editorials" || path === "/intelligence" ? "true" : undefined}
          className={`${location.startsWith("/ai-analyst") ? "analyst-workspace-main" : ""} min-w-0`}
        >
          {location.startsWith("/ai-analyst") && <AnalystWorkspace />}
          {children}
        </main>
      </div>
    );
  }

  return (
    // Single page container: NO overflow-hidden, NO h-screen
    <div className="editorial-shell min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative antialiased transition-colors duration-200">
      
      {/* 1. TOP HEADER (Sticky to viewport) */}
      {!hideHeader && (
      <motion.header
        style={{ opacity: hdrOpacity, y: hdrY }}
        className="sticky top-0 z-40 h-14 w-full border-b border-slate-200/80 dark:border-white/[0.08] bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl flex items-center px-2.5 sm:px-4 justify-between gap-3 transition-colors duration-200 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 whitespace-nowrap">
          <Link href="/home" className="group/brand flex items-center pl-1 py-1 pr-1.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/5 transition-all cursor-pointer select-none" aria-label="CricField Home">
            <CricfieldLogo variant="header" asLink={false} />
          </Link>
          <nav aria-label="Primary navigation" className="hidden md:flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
            {PRIMARY_NAV_LINKS.map(({ label, href, hideOnMd }) => {
              const active = isNavActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3 sm:px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 select-none ${
                    hideOnMd ? "hidden lg:flex" : "flex"
                  } ${
                    active
                      ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/70 dark:border-white/10"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5"
                  }`}
                >
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                  )}
                  {href === "/scores" && !active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />
                  )}
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Live Score Snippet */}
          <LiveScoreSnippet />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5 shrink-0">
          <UniversalHeaderSearch />
          <TeamSwitcher />
          <Link
            href="/account"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shadow-2xs"
            title="My Account"
          >
            <UserRound size={15} />
            <span className="hidden sm:inline font-bold">Account</span>
          </Link>
        </div>
      </motion.header>
      )}

      {/* 2. MIDDLE CONTENT (Clean layout without side rails) */}
      <main
        data-analytics-theme={["/stats", "/visualizations"].includes(location.split("?")[0]) ? "true" : undefined}
        data-team-surfaces={["/stats", "/visualizations", "/scores", "/auction", "/feed"].some(path => location.split("?")[0] === path) ? "true" : undefined}
        data-white-titles={location.startsWith("/dugout") || location.split("?")[0] === "/editorials" || location.split("?")[0] === "/intelligence" ? "true" : undefined}
        className={`${location.startsWith("/ai-analyst") ? "analyst-workspace-main" : ""} min-h-[calc(100vh-56px)] flex flex-col justify-between transition-all duration-300 min-w-0`}
      >
        <div className="flex-1 min-w-0">
          {location.startsWith('/feed') && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('planningSeason') === '2027' && <div className="mb-4"><PreseasonRecruitment team={new URLSearchParams(window.location.search).get('team')??undefined}/></div>}
          {location.startsWith("/ai-analyst") && <AnalystWorkspace/>}
          {/^\/(players|venues|match|matches|scout\/player|dugout\/articles)\//.test(window.location.pathname)&&<ReturnNavigator fallbackPath={window.location.pathname.startsWith('/players')?'/stats':window.location.pathname.startsWith('/pressurelab')?'/pressurelab':window.location.pathname.startsWith('/dugout')?'/dugout':'/scores'}/>}
          {children}
        </div>
        <SiteFooter />
      </main>
      <AssistantLauncher />
      <MobileNavigation />

    </div>
  );
}

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
  Zap, Trophy, Sparkles, Gavel, Calendar, List, Radio, ShoppingBag, Shield, Compass, Gamepad2, UserRound
} from "lucide-react";
import { AssistantLauncher } from "@/components/assistant-launcher";
import { motion, motionValue, useTransform, AnimatePresence } from "framer-motion";
import { SlicerPanel, type SlicerState } from "@/components/slicer-panel";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import { SiteFooter } from "@/components/site-footer";
import { CricfieldLogo } from "@/components/cricfield-logo";
import { AnalystNavigator } from "@/components/analyst-navigator";
import { TeamSwitcher } from "@/components/team-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

const PLAYER_IMAGES = [
  { src: "/ipl-logo.jpg", alt: "IPL Logo" },
  { src: "/msd.jpg", alt: "MS Dhoni" },
  { src: "/virat kohli.jpg", alt: "Virat Kohli" },
  { src: "/suresh raina.jpg", alt: "Suresh Raina" },
  { src: "/ab devillers.jpg", alt: "AB de Villiers" },
  { src: "/sanju samson.jpg", alt: "Sanju Samson" },
];

const SIDEBAR_ITEMS = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Radio, label: "Auction Pulse", href: "/pulse" },
  { icon: Newspaper, label: "Feed & 2027 Intel", href: "/feed" },
  { icon: Cpu, label: "Intel & Insights", href: "/intelligence" },
  { icon: Shield, label: "My Dugout", href: "/dugout" },
  { icon: Compass, label: "Scout Lab", href: "/scout" },
  { icon: List, label: "Stats Centre", href: "/stats" },
  { icon: Zap, label: "Scores", href: "/scores" },
  { icon: BarChart2, label: "Visuals", href: "/visualizations" },
  { icon: Gamepad2, label: "Arcade Games", href: "/arcade" },
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

  // Tells the floating assistant launcher to hide; the rail carries its own.
  useEffect(() => {
    if (hideRightPanel) return;
    document.documentElement.dataset.rightRail = "";
    return () => { delete document.documentElement.dataset.rightRail; };
  }, [hideRightPanel]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

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
          data-team-surfaces={["/stats", "/visualizations", "/scores", "/pulse", "/feed"].includes(path) ? "true" : undefined}
          data-white-titles={location.startsWith("/dugout") || path === "/intelligence" ? "true" : undefined}
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
        className="sticky top-0 z-30 h-14 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl flex items-center px-2 sm:px-4 gap-2 transition-colors duration-200"
      >
        <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
          <Link href="/home" className="group/brand flex items-center gap-2.5 pl-1 py-1 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer" aria-label="CricField Home">
            <CricfieldLogo variant="header" asLink={false} />
          </Link>
          <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-white/10 shrink-0" />
          <nav aria-label="Primary" className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {[['Home','/home'],['Scout Lab','/scout'],['Scores','/scores'],['My Dugout','/dugout'],['Stats','/stats']].map(([label,href])=><Link key={href} href={href} className={location === href ? 'text-indigo-600 dark:text-indigo-300 font-bold' : 'hover:text-slate-900 dark:hover:text-white'} aria-current={location === href ? 'page' : undefined}>{label}</Link>)}
          </nav>
          {/* Live Score Snippet */}
          <LiveScoreSnippet />
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <TeamSwitcher />
          {/* AI Analyst lives in the floating assistant launcher, not the header. */}
          {supabaseConfigured && <>
            <Link href="/account" className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 py-2"><UserRound size={16}/><span className="hidden sm:inline">Account</span></Link>
            <span aria-hidden="true" className="h-5 w-px bg-slate-200 dark:bg-white/10" />
          </>}
        </div>
      </motion.header>
      )}

      {/* 2. LEFT RAIL (Fixed to viewport, never scrolls) */}
      {!hideSidebar && (
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 56 : 208 }}
        className="fixed left-0 top-14 bottom-0 z-20 border-r border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md flex flex-col items-center py-2 px-1 overflow-hidden transition-colors duration-200"
      >
        {/* Top Actions: Logo toggle & Home button */}
        <div className="shrink-0 flex flex-col items-center gap-2 mb-2 w-full">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 transition-all hover:bg-slate-200 dark:hover:bg-white/5 active:scale-95 shadow-sm dark:shadow-lg cursor-pointer"
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <img 
              src="/ipl-logo-transparent.png" 
              alt="CricField Logo" 
              className="w-8 h-8 object-contain select-none" 
            />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <nav aria-label="Sidebar navigation" className="compact-sidebar-nav flex-1 min-h-0 flex flex-col gap-0.5 w-full py-1">
          {sidebarItems.map((item) => {
            const path = location.split("?")[0];
            const isActive = path === item.href || path.startsWith(`${item.href}/`) || (item.href === "/feed" && path === "/strategy");
            return (
              <Link key={item.label} href={item.href} aria-label={item.label} aria-current={isActive ? "page" : undefined}>
                <div 
                  title={item.label}
                  className={`w-full flex ${sidebarCollapsed ? "flex-col items-center py-1 px-1" : "flex-row items-center gap-3 py-1 px-3"} rounded-xl transition-all group relative cursor-pointer ${
                    isActive
                      ? "text-primary bg-primary/10 font-bold"
                      : "text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <item.icon className={`w-4 h-4 mb-0.5 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : ""}`} />
                  {!sidebarCollapsed && <span className="text-xs font-semibold leading-snug text-left">{item.label}</span>}
                  {isActive && (
                    <motion.div layoutId="active-indicator" className="absolute left-0 w-0.5 h-6 bg-primary rounded-r-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </motion.aside>
      )}

      {/* 3. RIGHT RAIL (Fixed to viewport, never scrolls) */}
      {!hideRightPanel && (
        <motion.aside
          style={{ opacity: rightPanelOpacity }}
          animate={{ width: rightPanelCollapsed ? 56 : 300 }}
          className={`fixed right-0 top-14 bottom-0 z-20 border-l border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md flex flex-col overflow-hidden transition-colors duration-200 ${rightPanelCollapsed ? "w-14" : "w-[300px] max-w-[85vw]"}`}
        >
          <button 
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="absolute top-4 right-2 w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-all z-[2100] cursor-pointer"
            title={rightPanelCollapsed ? "Expand Intelligence" : "Collapse Intelligence"}
          >
            <Zap className={`w-4 h-4 text-primary transition-transform duration-500 ${rightPanelCollapsed ? 'rotate-0' : 'rotate-180'}`} />
          </button>

          <AnimatePresence mode="wait">
            {rightPanelCollapsed ? (
              <motion.div 
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center py-16 gap-12 overflow-hidden justify-between"
              >
                <Sparkles className="w-4 h-4 text-primary/60 shrink-0" />
                <div className="flex-1 flex items-center justify-center">
                  <span className="font-black text-[10px] uppercase tracking-[0.5em] text-slate-400 dark:text-white/20 whitespace-nowrap -rotate-90 origin-center flex items-center gap-4">
                    AI ANALYST <div className="w-8 h-px bg-slate-300 dark:bg-white/10" /> NAVIGATOR
                  </span>
                </div>
                <Link href="/ai-analyst">
                  <TrendingUp className="w-5 h-5 text-primary/60 shrink-0 hover:text-primary transition-colors cursor-pointer" />
                </Link>
              </motion.div>
            ) : (
              <motion.div 
                key="full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 min-h-0 flex flex-col"
              >
                <AnalystNavigator />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="shrink-0 flex justify-center py-3 border-t border-slate-200 dark:border-slate-800/80">
            <AssistantLauncher embedded />
          </div>
        </motion.aside>
      )}

      {/* 4. MIDDLE CONTENT (Uses native window scroll, padded away from sidebars) */}
      <main
        data-analytics-theme={["/stats", "/visualizations"].includes(location.split("?")[0]) ? "true" : undefined}
        data-team-surfaces={["/stats", "/visualizations", "/scores", "/pulse", "/feed"].some(path => location.split("?")[0] === path) ? "true" : undefined}
        data-white-titles={location.startsWith("/dugout") || location.split("?")[0] === "/intelligence" ? "true" : undefined}
        className={`${location.startsWith("/ai-analyst") ? "analyst-workspace-main" : ""} min-h-[calc(100vh-56px)] flex flex-col justify-between transition-all duration-300 min-w-0 ${
          hideSidebar ? "pl-0" : sidebarCollapsed ? "pl-14" : "pl-14 sm:pl-[208px]"
        } ${
          // On phones an expanded rail overlays content like a drawer instead of squeezing it to nothing.
          hideRightPanel ? "pr-0" : rightPanelCollapsed ? "pr-16" : "pr-16 md:pr-[300px]"
        }`}
      >
        <div className="flex-1 min-w-0">
          {location.startsWith('/feed') && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('planningSeason') === '2027' && <div className="mb-4"><PreseasonRecruitment team={new URLSearchParams(window.location.search).get('team')??undefined}/></div>}
          {location.startsWith("/ai-analyst") && <AnalystWorkspace/>}
          {/^\/(players|venues|match|matches|scout\/player|dugout\/articles)\//.test(window.location.pathname)&&<ReturnNavigator fallbackPath={window.location.pathname.startsWith('/players')?'/stats':window.location.pathname.startsWith('/scout')?'/scout':window.location.pathname.startsWith('/dugout')?'/dugout':'/scores'}/>}
          {children}
        </div>
        <SiteFooter />
      </main>
      <MobileNavigation />

    </div>
  );
}

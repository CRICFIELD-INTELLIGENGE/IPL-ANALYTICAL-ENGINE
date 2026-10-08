import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, BarChart2, Briefcase, TrendingUp, Cpu, FileText, Newspaper, Activity, Bell, Star,
  Zap, Trophy, Layers, Sparkles, Gavel, Calendar, List, Radio, ShoppingBag, Shield
} from "lucide-react";
import { motion, motionValue, useTransform, AnimatePresence } from "framer-motion";
import { SlicerPanel, type SlicerState } from "@/components/slicer-panel";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import { SiteFooter } from "@/components/site-footer";
import { TeamSwitcher } from "@/components/team-switcher";
import { PlatformInfoSheet } from "@/components/platform-info-sheet";
import { AIMascotGuide } from "@/components/ai-mascot-guide";

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
  { icon: Shield, label: "My Dugout", href: "/dugout" },
  { icon: Trophy, label: "Beyond XI", href: "/arena" },
  // Feed and Stats are top-level rather than hidden behind a single "On-Field"
  // entry. They are separate destinations people go to directly, and the old
  // arrangement also broke the active-state highlight: the sidebar matched the
  // location exactly, so /stats lit up nothing at all.
  { icon: Activity, label: "2027 Intel", href: "/feed" },
  { icon: List, label: "Stats", href: "/stats" },
  { icon: Radio, label: "Pulse", href: "/pulse" },
  { icon: Zap, label: "Scores", href: "/scores" },
  { icon: Cpu, label: "Intel Hub", href: "/intelligence" },
  { icon: BarChart2, label: "Visuals", href: "/visualizations" },
  { icon: Gavel, label: "Auction", href: "/auction" },
  { icon: FileText, label: "Insights", href: "/insights" },
  { icon: Sparkles, label: "AI Analyst", href: "/ai-analyst" },
  { icon: ShoppingBag, label: "Shop", href: "/shop" },
];


function LiveScoreSnippet() {
  const { data } = useLiveIplMatches();
  const liveMatch = data?.matches?.find(m => /progress|innings/i.test(m.matchInfo.state));
  
  if (!liveMatch) return null;
  
  const score = getMatchScoreLine(liveMatch);
  
  return (
    <Link href={`/scores`} className="hidden md:block shrink-0">
      <div className="flex items-center gap-3 px-3 py-1 rounded-xl bg-white/5 border border-white/10 ml-2 cursor-pointer hover:bg-white/10 transition-all group/score">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-white/60 group-hover/score:text-primary transition-colors">{liveMatch.matchInfo.team1.teamSName}</span>
            <span className="text-[10px] font-bold text-white">{score.team1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-white/60 group-hover/score:text-primary transition-colors">{liveMatch.matchInfo.team2.teamSName}</span>
            <span className="text-[10px] font-bold text-white">{score.team2}</span>
          </div>
        </div>
        <div className="w-px h-6 bg-white/10" />
        <div className="flex flex-col justify-center">
          <span className="text-[8px] font-black text-primary uppercase tracking-tighter">LIVE</span>
          <span className="text-[7px] font-bold text-white/40 uppercase truncate max-w-[60px]">{liveMatch.matchInfo.status}</span>
        </div>
      </div>
    </Link>
  );
}

export function Layout({ 
  children, 
  hideHeaderProgress, 
  hideRightPanel,
  sidebarItems = SIDEBAR_ITEMS
}: { 
  children: React.ReactNode; 
  hideHeaderProgress?: any;
  hideRightPanel?: boolean;
  sidebarItems?: typeof SIDEBAR_ITEMS;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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

  return (
    <div className="w-full min-h-screen bg-[#0B1020] text-white relative flex p-0 gap-0">

      {/* SIDEBAR */}
      <div className="shrink-0 sticky top-3 h-[calc(100vh-24px)] z-[2000]">
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 56 : 88 }}
          className="h-full premium-card rounded-[20px] p-2 flex flex-col items-center bg-white/[0.02] border border-white/5 shadow-2xl overflow-hidden"
        >
          {/* Top Actions: Logo toggle & Home button */}
          <div className="shrink-0 flex flex-col items-center gap-2 mb-2 w-full">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-10 h-10 rounded-xl bg-[#0B1020] border border-white/10 flex items-center justify-center shrink-0 transition-all hover:bg-white/5 active:scale-95 shadow-lg"
              title="Toggle Sidebar"
            >
              <img 
                src="/ipl-logo-transparent.png" 
                alt="IPL Logo" 
                className="w-8 h-8 object-contain select-none" 
              />
            </button>

            {location !== "/home" && (
              <Link href="/home">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-all cursor-pointer group shrink-0" title="Back to Home">
                  <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
                </div>
              </Link>
            )}
          </div>

          {/* Scrollable Navigation List */}
          <nav className="flex-1 flex flex-col gap-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar py-1">
            {sidebarItems.map((item) => {
              const isActive = location === item.href || (item.href === "/feed" && location === "/strategy");
              return (
                <Link key={item.label} href={item.href}>
                  <div 
                    title={item.label}
                    className={`w-full flex flex-col items-center py-2 px-1 rounded-xl transition-all group relative cursor-pointer ${
                      isActive ? "text-primary bg-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 mb-0.5 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : ""}`} />
                    {!sidebarCollapsed && <span className="text-[7px] font-black uppercase tracking-tighter leading-none text-center truncate w-full">{item.label}</span>}
                    {isActive && (
                      <motion.div layoutId="active-indicator" className="absolute left-0 w-0.5 h-6 bg-primary rounded-r-full" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions: Platform Info Drawer & Favorites */}
          <div className="shrink-0 pt-2 border-t border-white/5 w-full flex flex-col items-center gap-1.5 mt-auto">
            <PlatformInfoSheet />
            <button title="Favorites" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all shrink-0">
              <Star className="w-4 h-4" />
            </button>
          </div>
        </motion.aside>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col gap-0 min-w-0">
        {/* HEADER — no toggle button, has live time */}
        <motion.header
          style={{ opacity: hdrOpacity, y: hdrY }}
          className="h-[50px] shrink-0 premium-card rounded-[16px] flex items-center px-4 gap-4 z-30 bg-[#0B1020]/80 backdrop-blur-xl border border-white/5 sticky top-3"
        >
          {/* Phones only get the wordmark; the status pills and live score
              come back as the header widens. min-w-0 + overflow-hidden lets
              this cluster give way instead of pushing the page sideways. */}
          <div className="flex items-center gap-3 min-w-0 overflow-hidden whitespace-nowrap">
            <div className="flex flex-col leading-none shrink-0">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">IPL 2026</span>
              <span className="text-[11px] font-bold text-white tracking-tight">INTELLIGENCE OS</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-white/10 shrink-0" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Live Sync</span>
            </div>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                2026 Season Completed
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-[9px] font-black text-primary uppercase tracking-widest">
                2027 Season In Focus →
              </span>
            </div>
            {/* Live Score Snippet */}
            <LiveScoreSnippet />
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Franchise Dugout Switcher */}
            <TeamSwitcher />

            {/* Live clock */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black text-white tracking-widest font-mono">{fmtTime(time)}</span>
              <span className="text-[8px] font-bold text-white/30 uppercase">IST</span>
            </div>
            <button title="Notifications" className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <Bell className="w-4 h-4 text-white/60" />
            </button>
            {/* Collapses to just the avatar on phones */}
            <div className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="hidden sm:block text-right">
                <div className="text-[8px] font-black text-white/40 uppercase">Analyst Mode</div>
                <div className="text-[9px] font-bold text-white">PREMIUM V2.4</div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center font-black text-[9px]">JD</div>
            </div>
          </div>
        </motion.header>

        <main className="flex-1 flex flex-col min-h-0">
          {children}
        </main>
        <SiteFooter />
      </div>

      {/* RIGHT SIDE PANEL: INTELLIGENCE FEED */}
      {!hideRightPanel && (
        <motion.div 
          style={{ opacity: rightPanelOpacity }} 
          animate={{ width: rightPanelCollapsed ? 56 : 300 }}
          className="shrink-0 sticky top-3 h-[calc(100vh-24px)] z-[2000]"
        >
          <aside className="h-full premium-card rounded-[20px] flex flex-col bg-white/[0.02] border border-white/5 shadow-2xl overflow-hidden relative">
            <button 
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="absolute top-4 right-2 w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-all z-[2100]"
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
                  className="flex-1 flex flex-col items-center py-16 gap-12 overflow-hidden"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <div className="flex-1 flex items-center justify-center">
                    <span className="font-black text-[10px] uppercase tracking-[0.5em] text-white/10 whitespace-nowrap -rotate-90 origin-center flex items-center gap-4">
                      INTELLIGENCE <div className="w-8 h-px bg-white/5" /> FEED
                    </span>
                  </div>
                  <Link href="/intelligence">
                    <TrendingUp className="w-5 h-5 text-primary/40 shrink-0 hover:text-primary transition-colors cursor-pointer" />
                  </Link>
                </motion.div>
              ) : (
                <motion.div 
                  key="full"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full flex flex-col p-4"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <Link href="/intelligence">
                    <div className="flex items-center gap-2 cursor-pointer group">
                      <TrendingUp className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] group-hover:text-primary transition-colors">Intelligence Feed</span>
                    </div>
                  </Link>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-8" />
                  </div>

                {/* ROLE QUICK NAVIGATION */}
                {location !== "/home" && (
                  <div className="mb-6">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 ml-1">Analytical Perspectives</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "data", label: "Data Analyst", icon: Cpu, color: "from-blue-500/20 to-cyan-500/10" },
                        { id: "product", label: "Product Analyst", icon: Layers, color: "from-purple-500/20 to-pink-500/10" },
                        { id: "growth", label: "Growth Analyst", icon: TrendingUp, color: "from-emerald-500/20 to-teal-500/10" },
                        { id: "business", label: "Business Analyst", icon: Trophy, color: "from-amber-500/20 to-orange-500/10" },
                      ].map(r => (
                        <Link key={r.id} href={`/intelligence?role=${r.id}`}>
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${r.color} border border-white/5 hover:border-primary/40 transition-all cursor-pointer group flex flex-col gap-2`}>
                            <r.icon className="w-4 h-4 text-white/60 group-hover:text-primary transition-colors" />
                            <div className="text-[10px] font-bold text-white/80 leading-tight">{r.label}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="h-px bg-white/5 my-6" />
                  </div>
                )}

                <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar">
                  <IntelligenceSnippet 
                    title="Momentum Shift" 
                    msg="CSK win probability increased by 14% after last wicket." 
                    time="2m ago" 
                    type="critical" 
                  />
                  <IntelligenceSnippet 
                    title="Tactical Alert" 
                    msg="Spinner deployment recommended for the next 3 overs." 
                    time="5m ago" 
                    type="alert" 
                  />
                  <IntelligenceSnippet 
                    title="Economy Spike" 
                    msg="IPL Media valuation reaching peak interaction levels." 
                    time="12m ago" 
                    type="info" 
                  />
                  <IntelligenceSnippet 
                    title="Player Pulse" 
                    msg="Mayank Yadav speed consistently above 150kmph." 
                    time="15m ago" 
                    type="info" 
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                  <Link href="/intelligence">
                    <button className="w-full py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-[9px] uppercase tracking-widest hover:bg-primary/20 transition-all">
                      Launch Full Intel OS
                    </button>
                  </Link>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </aside>
        </motion.div>
      )}

      {/* GLOBAL AI MASCOT & FEATURE TOUR WIDGET (GULLY AI) */}
      <AIMascotGuide />
    </div>
  );
}

function IntelligenceSnippet({ title, msg, time, type }: { title: string; msg: string; time: string; type: 'critical' | 'alert' | 'info' }) {
  const color = type === 'critical' ? 'text-red-500' : type === 'alert' ? 'text-amber-400' : 'text-primary';
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.04] transition-all cursor-pointer">
      <div className="flex items-center justify-between">
        <span className={`text-[8px] font-black uppercase tracking-widest ${color}`}>{title}</span>
        <span className="text-[8px] font-bold text-white/20 uppercase">{time}</span>
      </div>
      <p className="text-[10px] text-white/60 leading-relaxed font-medium">{msg}</p>
    </div>
  );
}

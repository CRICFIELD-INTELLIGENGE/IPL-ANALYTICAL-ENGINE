import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  BarChart3,
  Globe2,
  Lightbulb,
  User,
  Heart,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  Scale,
  Activity,
  Layers,
  Trophy,
  Star,
  Compass,
  TrendingUp,
} from "lucide-react";

const SCOUT_NAV = [
  {
    section: null,
    items: [{ icon: Home, label: "Home", href: "/scout" }],
  },
  {
    section: "SCOUT ENGINE",
    items: [
      { icon: Search, label: "Player Search", href: "/scout" },
      { icon: Scale, label: "Compare Players", href: "/scout/compare" },
      { icon: BarChart3, label: "Global Rankings", href: "/scout?view=rankings" },
      { icon: Globe2, label: "League Insights", href: "/scout?view=leagues" },
      { icon: User, label: "Player Profiles", href: "/scout?view=profiles" },
      { icon: Heart, label: "Shortlists", href: "/scout?view=shortlists" },
    ],
  },
  {
    section: "ANALYTICS",
    items: [
      { icon: Users, label: "Team Builder", href: "/scout?tool=teambuilder" },
      { icon: Trophy, label: "Auction Intel", href: "/auction" },
      { icon: Compass, label: "Venue & Conditions", href: "/intelligence" },
      { icon: BarChart3, label: "Stats Lab", href: "/stats" },
      { icon: Lightbulb, label: "AI Insights", href: "/ai-analyst" },
    ],
  },
  {
    section: "CONTENT",
    items: [
      { icon: Activity, label: "Articles", href: "/dugout" },
      { icon: TrendingUp, label: "Reports", href: "/insights" },
      { icon: Layers, label: "Data Library", href: "/visualizations" },
    ],
  },
];

interface ScoutEngineLayoutProps {
  children: React.ReactNode;
  searchBar?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function ScoutEngineLayout({
  children,
  searchBar,
  rightPanel,
}: ScoutEngineLayoutProps) {
  const [location] = useLocation();
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="flex h-screen bg-[#0B1020] text-white overflow-hidden">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-52 shrink-0 flex flex-col bg-[#0D1525] border-r border-white/[0.06] overflow-y-auto custom-scrollbar">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/[0.06] flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Star className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-black text-sm text-white tracking-tight block leading-none">
              CricField
            </span>
            <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest leading-none">
              Scout Engine
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5">
          {SCOUT_NAV.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.section && (
                <p className="px-4 text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase mb-1 mt-2">
                  {group.section}
                </p>
              )}
              {group.items.map((item) => {
                const isActive =
                  location === item.href ||
                  (item.href === "/scout" &&
                    location === "/scout" &&
                    !item.href.includes("?"));
                return (
                  <Link key={item.label} href={item.href}>
                    <div
                      className={`flex items-center gap-2.5 px-4 py-2 mx-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-400 border border-orange-500/25"
                          : "text-white/50 hover:text-white/90 hover:bg-white/[0.04]"
                      }`}
                    >
                      <item.icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? "text-orange-400" : "text-white/40 group-hover:text-white/70"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 ml-auto shrink-0 text-orange-400" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Go Pro Banner */}
        <div className="mx-3 mb-4 p-3 rounded-2xl bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/25 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Go Pro
              </span>
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed mb-2">
              Advanced filters, export data and AI insights
            </p>
            <button className="w-full py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 cursor-pointer flex items-center justify-center gap-1">
              Upgrade
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-[52px] shrink-0 bg-[#0D1525]/95 border-b border-white/[0.06] flex items-center px-4 gap-3 backdrop-blur-md">
          {searchBar ? (
            <div className="flex-1 max-w-md">{searchBar}</div>
          ) : (
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search players, teams, leagues..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-orange-500/40 focus:bg-white/[0.06] transition-all"
              />
            </div>
          )}

          {/* League Quick Filter */}
          <div className="hidden md:flex items-center gap-1.5">
            {["All Leagues", "IPL", "BBL", "CPL", "SA20", "ILT20"].map((l, i) => (
              <button
                key={l}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  i === 0
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
            <button className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white/50 hover:text-white transition-colors cursor-pointer relative">
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center cursor-pointer shadow-md shadow-orange-500/30">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Scrollable Content */}
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            {children}
          </main>

          {/* Right Panel */}
          {rightPanel && (
            <aside className="w-64 shrink-0 overflow-y-auto border-l border-white/[0.06] bg-[#0D1525] custom-scrollbar hidden xl:block">
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

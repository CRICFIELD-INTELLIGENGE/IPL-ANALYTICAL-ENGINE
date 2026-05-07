import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Home, Activity, Boxes, Banknote, TrendingUp, Layers,
  FolderDown, Newspaper, Sparkles, Search, Bell, Menu, X,
} from "lucide-react";
import { AIAnalystPanel } from "./ai-analyst-panel";
import { TrendingPanel } from "./trending-panel";
import { LiveTickerBar } from "./live-ticker-bar";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/on-field", label: "On-Field Intelligence", icon: Activity },
  { href: "/product", label: "Product Signals", icon: Boxes },
  { href: "/revenue", label: "Revenue Engine", icon: Banknote },
  { href: "/growth", label: "Growth Radar", icon: TrendingUp },
  { href: "/strategy", label: "Strategy Layer", icon: Layers },
  { href: "/reports", label: "Reports Vault", icon: FolderDown },
  { href: "/blogs", label: "Blogs", icon: Newspaper },
  { href: "/ai-analyst", label: "AI Analyst", icon: Sparkles },
];

function Sidebar({ onNav }: { onNav?: () => void }) {
  const [location] = useLocation();
  return (
    <aside className="h-full w-[240px] glass-strong rounded-2xl p-3 flex flex-col">
      <Link href="/" onClick={onNav} className="flex items-center gap-2.5 px-2 py-3">
        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center neon-btn">
          <span className="text-[11px] font-black tracking-tight">IPL</span>
        </div>
        <div className="leading-tight">
          <div className="font-display font-bold text-sm tracking-tight">IPL ANALYTICS</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Engine</div>
        </div>
      </Link>

      <div className="h-px bg-border/60 my-2" />

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
        {NAV.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNav}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? "text-white bg-gradient-to-r from-primary/30 to-accent/10 border border-primary/40 shadow-[0_0_24px_-8px_hsl(var(--primary))]"
                  : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="font-medium">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="navDot"
                  className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 p-3 rounded-xl glass border border-primary/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">
            SR
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Srihari</div>
            <div className="text-[11px] text-muted-foreground">Analyst</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <div className="glass-strong rounded-2xl px-3 sm:px-4 h-14 flex items-center gap-3">
      <button
        onClick={onOpenNav}
        className="lg:hidden w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <LiveTickerBar />

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-full px-3.5 py-2 min-w-[260px] transition-colors">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          aria-label="Search players, teams, insights"
          placeholder="Search players, teams, insights..."
          className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
        />
      </div>

      <button aria-label="Notifications" className="relative w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]" />
      </button>
    </div>
  );
}

export function Layout({ children, hideRightPanel }: { children: React.ReactNode; hideRightPanel?: boolean }) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen text-foreground font-sans">
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-5 grid gap-4 lg:gap-5"
           style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        {/* Mobile drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setNavOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 p-3">
              <div className="relative h-full">
                <Sidebar onNav={() => setNavOpen(false)} />
                <button
                  aria-label="Close menu"
                  onClick={() => setNavOpen(false)}
                  className="absolute -right-3 -top-3 w-8 h-8 rounded-full glass-strong flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:gap-5 lg:[grid-template-columns:240px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <div className="hidden lg:block sticky top-4 h-[calc(100vh-2.5rem)]">
            <Sidebar />
          </div>

          {/* Main + right panel */}
          <div className="grid gap-4 lg:gap-5"
               style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
            <TopBar onOpenNav={() => setNavOpen(true)} />

            <div
              className={`grid gap-4 lg:gap-5 ${
                hideRightPanel ? "" : "xl:[grid-template-columns:minmax(0,1fr)_360px]"
              }`}
            >
              <main className="min-w-0">{children}</main>

              {!hideRightPanel && (
                <aside className="hidden xl:flex flex-col gap-4 lg:gap-5">
                  <AIAnalystPanel />
                  <TrendingPanel />
                </aside>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

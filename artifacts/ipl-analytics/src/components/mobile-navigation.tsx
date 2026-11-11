import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Newspaper, Compass, Gamepad2, Grid2X2, ArrowUpRight, Cpu, Shield, List, Zap, Radio, BarChart2, UserRound, Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import "./mobile-navigation.css";

const destinations = [
  { href: "/home", label: "Home", icon: Home, detail: "Your cricket, all together" },
  { href: "/feed", label: "Feed", icon: Newspaper, detail: "Stories & 2027 intel" },
  { href: "/scout", label: "Scout Lab", icon: Compass, detail: "Find your next match-winner" },
  { href: "/arcade", label: "Arcade", icon: Gamepad2, detail: "A little cricket. A lot of rivalry." },
  { href: "/scores", label: "Scores", icon: Zap, detail: "Follow the action" },
  { href: "/stats", label: "Stats Centre", icon: List, detail: "Go beyond the scorecard" },
  { href: "/dugout", label: "My Dugout", icon: Shield, detail: "Your franchise headquarters" },
  { href: "/pulse", label: "Auction Pulse", icon: Radio, detail: "Track the auction landscape" },
  { href: "/intelligence", label: "Intelligence", icon: Cpu, detail: "Explore cricket through data" },
  { href: "/retention-room", label: "Retention Room", icon: Trophy, detail: "Make the tough calls" },
  { href: "/visualizations", label: "Visuals", icon: BarChart2, detail: "See the game differently" },
  { href: "/ai-analyst", label: "AI Analyst", icon: Cpu, detail: "Ask your cricket questions" },
  { href: "/account", label: "Your account", icon: UserRound, detail: "Your CricField workspace" },
];

export function MobileNavigation() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const active = (href: string) => location === href || location.startsWith(`${href}/`);
  const inMore = !destinations.slice(0, 4).some(item => active(item.href));
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const close = () => { if (query.matches) setOpen(false); };
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);

  return <>
    <nav className="mobile-dock" aria-label="Mobile navigation">
      {destinations.slice(0, 4).map(({ href, label, icon: Icon }) =>
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
          <Icon size={21} aria-hidden="true" /><span>{label}</span>
        </Link>)}
      <button type="button" onClick={() => setOpen(true)} aria-label="Explore all sections" aria-expanded={open} data-active={inMore || undefined}>
        <Grid2X2 size={21} aria-hidden="true" /><span>Explore</span>
      </button>
    </nav>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="mobile-explore">
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <SheetTitle className="text-white text-2xl">The whole field.</SheetTitle>
        <SheetDescription className="text-slate-400">Pick your side of the game.</SheetDescription>
        <nav aria-label="All CricField sections" className="mobile-explore-grid">
          {destinations.map(({ href, label, detail, icon: Icon }) =>
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active(href) ? "page" : undefined}>
              <Icon size={22} aria-hidden="true" />
              <span><strong>{label}</strong><small>{detail}</small></span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>)}
        </nav>
      </SheetContent>
    </Sheet>
  </>;
}

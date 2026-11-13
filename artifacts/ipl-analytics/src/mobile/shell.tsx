// CRICFIELD Mobile shell: contextual top bar, bottom tabs, bottom sheets and the global search sheet.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Compass, Gamepad2, House, Search, Sparkles, UserRound, X, ChevronRight, Menu, Bell, Grid2X2, Shield } from "lucide-react";
import { useTeamTheme, TEAM_REGISTRY, TEAM_CODE_TO_SLUG, type TeamCode } from "@/lib/team-context";
import { searchPlayers, type PlayerSearchHit } from "@/lib/discovery-api";
import { playerSlug } from "@/lib/aggregates";
import { CricfieldLogo } from "@/components/cricfield-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const TABS: { href: string; label: string; icon: typeof House; match: (p: string) => boolean; cls?: string }[] = [
 { href: "/home", label: "Home", icon: House, match: (p: string) => p === "/" || p === "/home" },
 { href: "/dugout", label: "Dugout", icon: Shield, match: (p: string) => p.startsWith("/dugout") || p.startsWith("/account") },
 { href: "/feed", label: "Feed", icon: Compass, match: (p: string) => /^\/(discover|scout|teams|feed|intelligence|arcade|reports|retention-room|scores)/.test(p) },
 { href: "/stats", label: "Stats", icon: Grid2X2, match: (p: string) => /^\/(stats|players)/.test(p) },
 { href: "/ai-analyst", label: "AI Analyst", icon: Sparkles, match: (p: string) => p.startsWith("/ai-analyst") },
];
const TITLES: [RegExp, string][] = [
  [/^\/discover/, "Discover"], [/^\/stats/, "Stats"], [/^\/scout\/player/, "Scout Report"], [/^\/scout\/compare/, "Compare"], [/^\/scout/, "Scout Lab"],
  [/^\/players\//, "Player"], [/^\/teams\/?$/, "Teams"], [/^\/teams\//, "Franchise"], [/^\/arcade\/./, "Arcade"], [/^\/arcade/, "Play"],
  [/^\/ai-analyst\/auction-war-room/, "Auction"], [/^\/ai-analyst\/squad-builder/, "Squad Builder"], [/^\/ai-analyst/, "AI Analyst"],
  [/^\/retention-room/, "Retention Room"], [/^\/reports/, "Journal"], [/^\/(dugout\/articles|articles)\//, "Story"], [/^\/dugout\/./, "Franchise Hub"], [/^\/dugout/, "Dugout"],
  [/^\/account/, "Your Dugout"], [/^\/feed/, "Feed"], [/^\/intelligence/, "IPL Intelligence"], [/^\/scores/, "Scores"], [/^\/match\//, "Match"],
  [/^\/venues\//, "Venue"], [/^\/pulse/, "Pulse"], [/^\/blogs/, "Blogs"],
];
const ROOTS = new Set(["/", "/home", "/discover", "/arcade", "/ai-analyst", "/dugout", "/stats", "/feed"]);

export function TopBar() {
  const [location] = useLocation();
  const path = location.split("?")[0];
  const { theme } = useTeamTheme();
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const title = TITLES.find(([re]) => re.test(path))?.[1];
  const root = ROOTS.has(path);
  return (
    <>
      <header className={`cfm-top ${root ? "cfm-top-root" : ""}`}>
        {!root ? (
          <button type="button" className="cfm-icon" aria-label="Back" onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/home"))}>
            <ArrowLeft size={22} />
          </button>
        ) : null}
        <div className="cfm-top-title" style={root ? { minWidth: 0, paddingLeft: 4 } : undefined}>
          {root ? (
            <Link href="/home" aria-label="CRICFIELD home" className="cfm-logo">
              <CricfieldLogo variant="wordmark" asLink={false} accentColor={theme?.accent ?? "#ffda7c"} className="cfm-brand-art" />
            </Link>
          ) : (
            <strong>{title ?? "CRICFIELD"}</strong>
          )}
        </div>
        <div className="cfm-top-actions items-center">
          <ThemeToggle />
          <button type="button" className="cfm-icon" aria-label="Search players and teams" onClick={() => setSearch(true)}>
            <Search size={20} />
          </button>
          <button type="button" className="cfm-icon relative" aria-label="Notifications" onClick={() => setNotifications(!notifications)}>
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#020617]" />
          </button>
          <Link href="/dugout" className="cfm-icon" aria-label={theme ? `Your franchise: ${theme.name}` : "Your Dugout"}>{theme ? <span className="cfm-teamdot">{theme.shortName}</span> : <UserRound size={21} />}</Link>
        </div>
      </header>
      {search && <SearchSheet onClose={() => setSearch(false)} />}
      {notifications && (
        <Sheet title="Match Center Alerts" onClose={() => setNotifications(false)}>
          <div className="cfm-notifications-list space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <div>
                <strong className="text-xs text-white block">IPL 2026 Season Simulation Ready</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">Scout Lab has updated under-23 projections and purse scenarios.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <strong className="text-xs text-white block">Retention Room Final Calls</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">Review 5 mandatory retentions before the auction deadline.</p>
              </div>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

export function BottomTabs() {
  const [location] = useLocation();
  const path = location.split("?")[0];
  return (
    <nav className="cfm-tabs" aria-label="CRICFIELD sections">
      {TABS.map((t) => { const on = t.match(path); return (
        <Link key={t.href} href={t.href} className={`cfm-tab ${t.cls ?? ""}`} aria-current={on ? "page" : undefined}>
          <t.icon aria-hidden="true" />{t.label}
        </Link>
      ); })}
    </nav>
  );
}

/** Accessible bottom sheet: focus moves in, Escape and the backdrop close it, focus returns to the opener. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,button,a,select")?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; opener?.focus?.(); };
  }, [onClose]);
  return (
    <>
      <div className="cfm-sheet-backdrop" onClick={onClose} />
      <div className="cfm-sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="cfm-sheet-grip" aria-hidden="true" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 id={id}>{title}</h2><button type="button" className="cfm-icon" aria-label="Close" onClick={onClose}><X size={20} /></button></div>
        {children}
      </div>
    </>
  );
}

const FEATURES = [
  ["Stats", "/stats", "/feed"], ["Scout Lab", "/scout"], ["Retention Room", "/retention-room"], ["Auction War Room", "/ai-analyst/auction-war-room"],
  ["Squad Builder", "/ai-analyst/squad-builder"], ["Journal", "/reports"], ["IPL Intelligence", "/intelligence"], ["Scores", "/scores"], ["Arcade", "/arcade"],
] as const;

export function SearchSheet({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlayerSearchHit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [, go] = useLocation();
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setState("idle"); return; }
    let live = true;
    setState("loading");
    const t = setTimeout(() => { searchPlayers(term).then((h) => { if (live) { setHits(h.slice(0, 12)); setState("idle"); } }).catch(() => live && setState("error")); }, 180);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  const term = q.trim().toLowerCase();
  const teams = term ? (Object.values(TEAM_REGISTRY).filter((t) => `${t.name} ${t.shortName} ${t.city}`.toLowerCase().includes(term))) : [];
  const features = term ? FEATURES.filter(([l]) => l.toLowerCase().includes(term)) : [];
  const open = (href: string) => { onClose(); go(href); };
  return (
    <Sheet title="Search" onClose={onClose}>
      <input className="md-search" style={{ margin: 0, width: "100%", color: "var(--m-ivory)" }} type="search" inputMode="search" autoComplete="off" placeholder="Players, franchises, features" aria-label="Search players, franchises and features" value={q} onChange={(e) => setQ(e.target.value)} />
      {state === "loading" && <p className="cfm-small" role="status">Searching the player registry…</p>}
      {state === "error" && <p className="cfm-small" role="alert">Search is unavailable right now. Check your connection and try again.</p>}
      <ul className="md-results" style={{ margin: "10px 0 0" }}>
        {teams.map((t) => <li key={t.id}><a href={`/teams/${TEAM_CODE_TO_SLUG[t.id as TeamCode]}`} onClick={(e) => { e.preventDefault(); open(`/teams/${TEAM_CODE_TO_SLUG[t.id as TeamCode]}`); }}><span><strong>{t.name}</strong><br /><small>Franchise · {t.city}</small></span><ChevronRight size={18} /></a></li>)}
        {features.map(([l, h]) => <li key={h}><a href={h} onClick={(e) => { e.preventDefault(); open(h); }}><span><strong>{l}</strong><br /><small>Feature</small></span><ChevronRight size={18} /></a></li>)}
        {hits.map((p) => { const href = `/players/${playerSlug(p.fullName ?? p.name)}`; return <li key={p.playerId}><a href={href} onClick={(e) => { e.preventDefault(); open(href); }}><span><strong>{p.fullName ?? p.name}</strong><br /><small>{[p.country, `${p.matches} matches`, p.lastSeason ? `last season ${p.lastSeason}` : null].filter(Boolean).join(" · ")}</small></span><ChevronRight size={18} /></a></li>; })}
      </ul>
      {term.length >= 2 && state === "idle" && !hits.length && !teams.length && !features.length && <p className="cfm-small">No matches for “{q}”.</p>}
    </Sheet>
  );
}

export function Loading({ rows = 3, h = 64 }: { rows?: number; h?: number }) {
  return <div className="cfm-pad" role="status" aria-label="Loading" style={{ display: "grid", gap: 10, paddingTop: 16 }}>{Array.from({ length: rows }, (_, i) => <div key={i} className="cfm-skel" style={{ height: h }} />)}</div>;
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="cfm-error" role="alert"><span>{message}</span>{onRetry && <button type="button" className="cfm-chip" onClick={onRetry}>Retry</button>}</div>;
}
export function SectionHead({ kicker, title, more }: { kicker?: string; title: string; more?: [string, string] }) {
  return <div className="cfm-section-head"><div>{kicker && <div className="cfm-kicker">{kicker}</div>}<h2 className="cfm-h2">{title}</h2></div>{more && <Link href={more[1]} className="cfm-more">{more[0]} →</Link>}</div>;
}





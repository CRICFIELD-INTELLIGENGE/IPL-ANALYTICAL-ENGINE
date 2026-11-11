import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, Check, ChevronRight, Gavel, Network, Plus, Radio, Search, Shield, Star, Users, Wallet, X } from "lucide-react";
import { Layout } from "@/components/layout";
import { PlayerAvatar } from "@/components/player-avatar";
import { TEAM_REGISTRY } from "@/lib/team-context";
import { HUB_EVENTS, HUB_TEAMS, type HubTeam } from "@/lib/ipl-2027";
import { useIpl2027Desk, crore } from "@/lib/ipl-2027-desk";
import { fetchBoard, money } from "@/lib/sim-api";
import { emptyPlan, planKey, readSaved, retentionKey, type AuctionPlan, type RetentionSnapshot } from "@/lib/auction-plan";
import { getV2Index } from "@/lib/editorial-v2";
import { LibraryMedia } from "@/components/dugout/franchise-library";
import { useScoutShortlist } from "@/lib/scout-shortlist";
import "./feed-auction.css";

const ROLES = ["All", "Batter", "All-rounder", "Bowler", "Wicketkeeper", "Overseas"] as const;
const ROLE_COLORS: Record<string, string> = { Batter: "#30b8ff", "All-rounder": "#ef76bc", Bowler: "#b9ed56", Wicketkeeper: "#b087ff" };

export default function FeedAuctionPage() {
  const requested = new URLSearchParams(useSearch()).get("team")?.toUpperCase();
  const team = HUB_TEAMS.includes(requested as HubTeam) ? requested as HubTeam : "CSK";
  return <Layout hideRightPanel><AuctionDesk key={team} team={team} /></Layout>;
}

function AuctionDesk({ team }: { team: HubTeam }) {
  const { shortlist: scoutShortlist, toggleShortlist } = useScoutShortlist();
  const theme = TEAM_REGISTRY[team];
  const [plan, setPlan] = useState<AuctionPlan>(() => ({ ...emptyPlan, ...readSaved<Partial<AuctionPlan>>(planKey(team), {}) }));
  const [snapshot, setSnapshot] = useState<RetentionSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("All");
  const [search, setSearch] = useState("");
  const [marketTab, setMarketTab] = useState<"impact" | "fit">("impact");
  const [portfolioTab, setPortfolioTab] = useState<"overview" | "watchlist" | "targets" | "notes">("overview");
  const [help, setHelp] = useState(false);
  const [compare, setCompare] = useState(false);
  const [now, setNow] = useState(Date.now());
  const board = useQuery({ queryKey: ["auction-hub", team], queryFn: () => fetchBoard({ view: "live", team, sort: "fit" }), retry: 1 });
  const { data: official } = useIpl2027Desk();
  useEffect(() => {
    setSnapshot(readSaved<RetentionSnapshot | null>(retentionKey(team), null));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [team]);
  const update = (next: AuctionPlan) => {
    setPlan(next);
    try { localStorage.setItem(planKey(team), JSON.stringify(next)); }
    catch { setMessage("Browser storage is unavailable. Keep this page open to preserve your plan."); }
  };
  const toggle = (field: "watchlist" | "targets", key: string) => update({ ...plan, [field]: plan[field].includes(key) ? plan[field].filter(x => x !== key) : [...plan[field], key] });
  const engine = (path: string) => `${path}?team=${team}&scenario=${encodeURIComponent(`auction-${team.toLowerCase()}`)}`;
  const rows = board.data?.rows ?? [];
  const filtered = rows.filter(p => (role === "All" || role === "Overseas" ? role !== "Overseas" || p.overseas : p.role === role) && p.name.toLowerCase().includes(search.toLowerCase()));
  const prospects = filtered.slice(0, 6);
  const selectedRows = rows.filter(p => plan.targets.includes(p.key));
  const targetCost = selectedRows.reduce((sum, p) => sum + p.market, 0) / 100;
  const event = HUB_EVENTS.find(e => e.id === "auction");
  const seconds = event?.date ? Math.max(0, Math.floor((Date.parse(`${event.date}T00:00:00+05:30`) - now) / 1000)) : null;
  const stories = useMemo(() => getV2Index().filter(a => a.aspect === "auction-economics" && a.franchise === team).slice(0, 4), [team]);
  const officialTeam = official?.teams.find(t => t.team === team);
  const importCore = () => {
    const saved = readSaved<RetentionSnapshot | null>(retentionKey(team), null);
    setSnapshot(saved);
    setMessage(saved ? `Imported ${saved.players.length} retained players from your saved ${team} scenario.` : "Save your picks in the Retention Room first, then import them here.");
  };
  return (
    <div className="auction-hub">
      <div className="ah-breadcrumb"><Link href="/feed">Feed</Link><ChevronRight size={12} /><span>Auction</span><span className="ah-season">IPL 2027 · RECRUITMENT DESK</span></div>

      <section className="ah-hero">
        <img className="ah-hero-art" src="/assets/auction-war-room-hero.png" alt="Illustration of a floodlit cricket auction hall" />
        <div className="ah-hero-shade" />
        <div className="ah-hero-copy"><span className="ah-eyebrow">THE NEXT CHAPTER STARTS HERE</span><h1>THE AUCTION<br /><em>WAR ROOM</em></h1><p>Scout the market. Plan your strategy.<br />Identify the gap. Find the player. Make the bid.</p><div className="ah-actions"><a href="#auction-strategy" className="ah-button lime">Start your strategy <ArrowRight size={15} /></a><button className="ah-button ghost" onClick={() => setHelp(true)}>How it works <ChevronRight size={14} /></button></div></div>
        <aside className="ah-phase"><span className="ah-eyebrow">AUCTION COUNTDOWN</span><div className="ah-phase-tag">PRE-AUCTION / PLANNING</div>{seconds !== null ? <div className="ah-countdown">{[[Math.floor(seconds / 86400), "DAYS"], [Math.floor(seconds / 3600) % 24, "HRS"], [Math.floor(seconds / 60) % 60, "MINS"], [seconds % 60, "SECS"]].map(([value, label]) => <div key={label}><strong>{String(value).padStart(2, "0")}</strong><small>{label}</small></div>)}</div> : <p>Date to be announced</p>}<p className="ah-date">{event?.date} · reported date</p><div className="ah-paper-note">Scouting.<br />Bidding.<br />Mind games.<Gavel size={36} /><span>Build a squad.<br />Write the next chapter.</span></div></aside>
      </section>

      <nav className="ah-team-strip" aria-label="Select auction franchise"><span className="ah-team-label">YOUR FRANCHISE</span>{HUB_TEAMS.map(t => <Link key={t} href={`/feed/auction?team=${t}`} className={`ah-team ${team === t ? "selected" : ""}`} aria-current={team === t ? "page" : undefined} style={team === t ? { borderColor: theme.accent, boxShadow: `0 0 16px ${theme.accent}35` } : undefined}><img src={TEAM_REGISTRY[t].logoImg} alt="" />{t}</Link>)}<button className="ah-compare" onClick={() => setCompare(!compare)}>Compare teams <ArrowRight size={13} /></button></nav>
      {compare && <div className="ah-compare-grid">{(board.data?.teams ?? []).map(t => <Link key={t.short} href={`/ai-analyst/squad-dna?team=${team}&compare=${t.short}`} className="ah-panel"><img src={TEAM_REGISTRY[t.short as HubTeam]?.logoImg} alt="" /><span>{team} vs {t.short}</span><ArrowRight size={12} /></Link>)}</div>}

      <div className="ah-brief-grid" id="auction-strategy">
        <section className="ah-team-card ah-panel" style={{ backgroundImage: `radial-gradient(ellipse at left, ${theme.accent}24, transparent 80%)` }}><img src={theme.logoImg} alt={theme.name} /><div><span className="ah-eyebrow">YOUR FRANCHISE</span><h2>{team}</h2><p>{theme.motto}</p><Link href={`/feed/squad?team=${team}`} className="ah-mini-link">Retention Room <ArrowRight size={12} /></Link></div></section>
        <section className="ah-panel ah-brief"><div className="ah-section-head"><div><h2>{team} AUCTION BRIEF</h2><small>{snapshot ? "Your imported retention scenario" : "Start with your own recruitment scenario"}</small></div><button onClick={importCore} className="ah-mini-link"><Plus size={12} /> Import retained core</button></div><div className="ah-brief-metrics"><label><span>₹ <input aria-label="Planning budget in crore" type="number" min="0" max="1000" step="0.5" value={plan.budget || ""} placeholder="0" onChange={e => update({ ...plan, budget: Math.max(0, Number(e.target.value)) })} /> Cr</span><small>Your planning budget</small></label><div><strong>{snapshot?.players.length ?? "—"}<small> / 25</small></strong><small>Retained in scenario</small></div><div><strong>{snapshot ? snapshot.players.filter(p => p.overseas).length : "—"}<small> / 8</small></strong><small>Overseas retained</small></div></div><span className="ah-footnote">Hypothetical plan · {officialTeam?.remainingLakhs != null ? `Official remaining purse: ${crore(officialTeam.remainingLakhs)}` : "Official 2027 purse not recorded yet"}</span></section>
      </div>
      {message && <div role="status" className="ah-message">{message}<button aria-label="Dismiss message" onClick={() => setMessage("")}><X size={14} /></button></div>}

      <section className="ah-engine-grid" aria-label="Auction tools">
        <EngineCard number="01" title="AUCTION STRATEGIST" description="Set priorities. Inspect Buy, Hold and Avoid signals. Find a defensible bid ceiling." image="/auction-gavel.jpg" color="yellow" href={engine("/ai-analyst/auction-war-room")} action="Plan strategy" icon={<Gavel size={72} />} />
        <EngineCard number="02" title="PLAYER MARKET" description="Explore comparable players and alternative targets through the Player Pool Graph." image="/star-watch.jpg" color="blue" href={engine("/ai-analyst/player-pool")} action="Explore players" icon={<Network size={72} />} />
        <EngineCard number="03" title="MOCK AUCTION ARENA" description="Test your instincts in an auction simulation. Build your squad under budget." image="/assets/auction-war-room-hero.png" color="purple" href={engine("/arcade/auction-room")} action="Play mock auction" icon={<Gavel size={72} />} />
      </section>

      <div className="ah-market-grid">
        <section className="ah-panel ah-prospects"><div className="ah-section-head"><h2>RECRUITMENT SHORTLIST</h2><Link href={engine("/ai-analyst/auction-war-room")}>Full market <ArrowRight size={12} /></Link></div><div className="ah-filters">{ROLES.map(r => <button aria-pressed={role === r} className={role === r ? "active" : ""} key={r} onClick={() => setRole(r)}>{r === "Batter" ? "Batters" : r === "Bowler" ? "Bowlers" : r}</button>)}</div><label className="ah-search"><Search size={12} /><input aria-label="Search recruitment players" placeholder="Search players…" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="ah-players">{prospects.map(p => <article key={p.key} className="ah-player"><div className="ah-player-photo"><PlayerAvatar name={p.name} className="w-full h-full" imgClassName="h-full w-full object-cover object-top" disableHover /><button aria-label={`${plan.watchlist.includes(p.key) ? "Remove" : "Add"} ${p.name} ${plan.watchlist.includes(p.key) ? "from" : "to"} watchlist`} aria-pressed={plan.watchlist.includes(p.key)} onClick={() => toggle("watchlist", p.key)}><Star size={15} fill={plan.watchlist.includes(p.key) ? "#d4f65b" : "none"} /></button><span className="ah-nationality">{p.overseas ? p.country : "IND"}</span></div><Link className="ah-player-name" href={`/ai-analyst/player-pool?player=${encodeURIComponent(p.name)}&team=${team}`}>{p.name}</Link><span>{p.role}</span><small>Expected price</small><div className="ah-player-price"><b>{money(p.market)}</b><button aria-label={`${plan.targets.includes(p.key) ? "Remove" : "Add"} ${p.name} ${plan.targets.includes(p.key) ? "from" : "to"} targets`} onClick={() => toggle("targets", p.key)}>{plan.targets.includes(p.key) ? <Check size={13} /> : <Plus size={13} />}</button></div></article>)}</div>{!prospects.length && <div className="ah-empty">{board.isLoading ? "Loading player valuations…" : board.isError ? <><span>Player valuations could not load.</span><button onClick={() => board.refetch()}>Try again</button></> : "No players match these filters."}</div>}<p className="ah-footnote">2026-active player model · availability for the 2027 auction is unconfirmed.</p></section>

        <section className="ah-panel ah-market-insights"><div className="ah-section-head"><h2>MARKET INSIGHTS</h2><Link href={engine("/ai-analyst/auction-war-room")}><ArrowRight size={14} /></Link></div><div className="ah-filters"><button className={marketTab === "impact" ? "active" : ""} onClick={() => setMarketTab("impact")}>Impact vs price</button><button className={marketTab === "fit" ? "active" : ""} onClick={() => setMarketTab("fit")}>Franchise fit</button></div><div className="ah-scatter"><div className="ah-chart-y">MODEL PRICE (₹ CR)</div><svg viewBox="0 0 320 180" role="img" aria-label={`${marketTab === "impact" ? "Impact" : "Franchise fit"} versus model price for recruitment players`}><defs><pattern id="auction-grid" width="52" height="32" patternUnits="userSpaceOnUse"><path d="M52 0H0V32" fill="none" stroke="#224150" strokeWidth=".6" /></pattern></defs><rect x="27" y="8" width="275" height="140" fill="url(#auction-grid)" /><path d="M27 8V148H302" fill="none" stroke="#648091" />{rows.slice(0, 60).filter(p => marketTab === "fit" ? p.fit : p.impact != null).map(p => { const x = marketTab === "fit" ? p.fit?.score ?? 0 : p.impact ?? 0; const xs = rows.map(r => marketTab === "fit" ? r.fit?.score ?? 0 : r.impact ?? 0); const min = Math.min(...xs), max = Math.max(...xs); const maxPrice = Math.max(1, ...rows.slice(0, 60).map(r => r.market)); return <circle key={p.key} cx={32 + ((x - min) / (max - min || 1)) * 260} cy={140 - (p.market / maxPrice) * 125} r="3" fill={ROLE_COLORS[p.role]} opacity=".85"><title>{p.name}: {money(p.market)} · {marketTab === "fit" ? "fit" : "impact"} {x.toFixed(1)}</title></circle>; })}<text x="25" y="163" fill="#8096a4" fontSize="9">LOW</text><text x="271" y="163" fill="#8096a4" fontSize="9">HIGH</text></svg><span>{marketTab === "fit" ? `${team} FRANCHISE FIT` : "HISTORICAL IMPACT SCORE"}</span></div><div className="ah-legend">{Object.entries(ROLE_COLORS).map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div><small className="ah-footnote">Model estimates from historical performance, not actual bids.</small></section>

        <section className="ah-panel ah-portfolio"><div className="ah-section-head"><h2>YOUR AUCTION PORTFOLIO</h2><Bookmark size={15} /></div>{([ ["watchlist", Star, "Watchlist", `${plan.watchlist.length} players`], ["targets", Users, "Target squad", `${plan.targets.length} targets`], ["overview", Wallet, "Budget plan", plan.budget ? `₹${(plan.budget - targetCost).toFixed(1)} Cr left` : "Set your budget"], ["notes", Shield, "Notes & scenarios", "Saved locally"] ] as const).map(([tab, Icon, label, value]) => <button key={tab} className={`ah-portfolio-row ${portfolioTab === tab ? "active" : ""}`} onClick={() => setPortfolioTab(tab)}><Icon size={17} /><span>{label}</span><small>{value}</small></button>)}{portfolioTab === "notes" ? <textarea aria-label="Auction strategy notes" placeholder="Your priorities, bid limits and alternatives…" value={plan.notes} onChange={e => update({ ...plan, notes: e.target.value })} /> : portfolioTab === "overview" ? <div className="ah-budget-summary"><span>Expected cost <b>₹{targetCost.toFixed(1)} Cr</b></span><span className={targetCost > plan.budget && plan.budget > 0 ? "ah-over-budget" : ""}>{plan.budget > 0 && targetCost > plan.budget ? "Targets exceed your budget" : "Your plan, saved as you go."}</span></div> : <ul className="ah-saved-list">{rows.filter(p => plan[portfolioTab].includes(p.key)).map(p => <li key={p.key}><span>{p.name}</span><button aria-label={`Remove ${p.name}`} onClick={() => toggle(portfolioTab, p.key)}><X size={12} /></button></li>)}{!plan[portfolioTab].length && <li>Use the star or + on a player to start.</li>}</ul>}<div className="ah-recruitment-check"><span>DOES THE SIGNING IMPROVE YOUR XI?</span><Link href={engine("/ai-analyst/squad-dna")}>Squad DNA <ArrowRight size={12} /></Link><Link href={engine("/arcade/build-your-xi")}>Build playing XI <ArrowRight size={12} /></Link><Link href={engine("/ai-analyst/pressure")}>Pressure Genome <ArrowRight size={12} /></Link></div></section>
      </div>

      {scoutShortlist.length > 0 && <section className="ah-panel ah-scout-shortlist" aria-label="Scout Lab watchlist">
        <div className="ah-section-head"><div><h2>SCOUT LAB WATCHLIST</h2><small>Shared with Star Watch · exploratory candidates, not confirmed auction registrations.</small></div><Link href={`/feed/stars?team=${team}`}>Back to scouting <ArrowRight size={12} /></Link></div>
        <div className="ah-scout-candidates">{scoutShortlist.map(p => <article key={p.cricsheet_id}>
          <PlayerAvatar name={p.name} className="ah-scout-avatar" disableHover />
          <div><Link href={`/scout/player/${p.cricsheet_id}?team=${team}`}>{p.name}</Link><small>{p.discipline} · {p.competition.toUpperCase()} · {p.balls} balls</small></div>
          <Link href={`/ai-analyst/auction-war-room?team=${team}&q=${encodeURIComponent(p.name)}`} className="ah-scout-evaluate">Evaluate <ArrowRight size={11} /></Link>
          <button aria-label={`Remove ${p.name} from Scout Lab watchlist`} onClick={() => toggleShortlist(p)}><X size={13} /></button>
        </article>)}</div>
      </section>}

      <div className="ah-bottom-grid"><section className="ah-panel ah-editorial"><div className="ah-section-head"><h2>EDITORIAL COVERAGE <span>STRATEGY / {team}</span></h2><Link href={`/feed?team=${team}`}>All coverage <ArrowRight size={12} /></Link></div><div className="ah-stories">{stories.map(s => <Link key={s.id} href={`/dugout/articles/${s.slug}`}><div><LibraryMedia imageId={s.id} title={s.title} accent={theme.accent} code={team} teamName={theme.name} aspect={s.aspect} /></div><span><b>{s.title}</b><small>{s.readMinutes} min read</small></span></Link>)}{!stories.length && <p>Franchise auction coverage is coming soon.</p>}</div></section><Link className="ah-pulse ah-panel" href="/pulse#auction"><Radio size={38} /><div><h2>AFTER THE AUCTION</h2><p>Follow official updates, recorded purchases and final squads on Pulse.</p><span className="ah-button purple">Go to Pulse auction hub <ArrowRight size={14} /></span></div></Link></div>

      {help && <div className="ah-modal-backdrop" onClick={() => setHelp(false)}><section className="ah-modal ah-panel" role="dialog" aria-modal="true" aria-label="How the auction desk works" onClick={e => e.stopPropagation()}><button className="ah-modal-close" aria-label="Close guide" onClick={() => setHelp(false)} autoFocus><X /></button><span className="ah-eyebrow">YOUR RECRUITMENT PLAYBOOK</span><h2>Identify. Compare. Decide.</h2><ol><li>Choose a franchise and set your planning budget.</li><li>Save picks in the Retention Room, then import your retained core.</li><li>Star players, build a target squad and inspect model bid ceilings.</li><li>Use Auction War Room for valuation evidence and Player Pool for alternatives.</li><li>Test your XI, then follow official purchases in Pulse.</li></ol><p>Plans are saved in this browser. Model estimates and simulations are separate from official results.</p><button className="ah-button lime" onClick={() => setHelp(false)}>Start planning <ArrowRight size={14} /></button></section></div>}
    </div>
  );
}

function EngineCard({ number, title, description, image, color, href, action, icon }: { number: string; title: string; description: string; image: string; color: string; href: string; action: string; icon: ReactNode }) {
  return <Link href={href} className={`ah-engine ${color}`}><img src={image} alt="" /><div className="ah-engine-shade" /><span className="ah-engine-number">{number}</span><div className="ah-engine-copy"><h2>{title}</h2><p>{description}</p><span className={`ah-button ${color === "yellow" ? "lime" : color === "blue" ? "blue" : "purple"}`}>{action} <ArrowRight size={14} /></span></div><div className="ah-engine-icon">{icon}</div></Link>;
}

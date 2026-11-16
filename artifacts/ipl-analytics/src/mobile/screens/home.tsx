import { useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { Trophy, Plus, Gavel, Gamepad2, ClipboardList, BarChart3, Shield, ChevronRight, ChevronDown, ChevronUp, ArrowRight, Radio, Bookmark } from "lucide-react";
import { useTeamTheme, TEAM_CODE_TO_SLUG } from "@/lib/team-context";
import HomeInsights from "@/components/home-insights";
import { HOME_ARCADE_GAMES, ARCADE_ART } from "@/lib/arcade-catalog";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import "./home-reference.css";

export default function MobileHome() {
 const { theme } = useTeamTheme();
 const [filter,setFilter] = useState("All");
 const [saved,setSaved] = useState(false);
 const [moreShortcuts,setMoreShortcuts] = useState(false);
 const live = useLiveIplMatches();
 const matches = live.data?.matches ?? [];

 const team = theme?.shortName ?? "RR";
 const destination = theme ? `/dugout/${TEAM_CODE_TO_SLUG[theme.id]}` : "/dugout/rajasthan-royals";
 const shortcuts = [["Your Dugout","/dugout",Plus],["IPL","/intelligence",Trophy],["Auction","/ai-analyst/auction-war-room",Gavel],["Scout Lab","/scout",Gamepad2],[`${team} 2027`,destination,Shield],["Reports","/reports",ClipboardList],["Games","/arcade",Gamepad2]] as const;
 const primaryShortcuts = shortcuts.slice(0, 4);
 const extraShortcuts = shortcuts.slice(4);
 const renderShortcut = ([label,href,Icon]: (typeof shortcuts)[number], extraClass?: string) => (
  <Link key={label} href={href} className={extraClass}>
   <span>{label.includes("2027") && theme ? <img src={theme.logoImg} alt=""/> : <Icon size={24}/>}</span>
   <small>{label}</small>
  </Link>
 );
 return <div className="ref-home" style={{"--ref-accent":theme?.accent ?? "#ffda7c","--ref-secondary":theme?.secondary ?? "#f4b547"} as CSSProperties}>
  <nav className="ref-shortcuts" aria-label="Quick destinations">
   <div className="ref-shortcuts-row">
    {primaryShortcuts.map((item) => renderShortcut(item))}
    {extraShortcuts.map((item) => renderShortcut(item, "ref-shortcut-wide-only"))}
    <button
     type="button"
     className="ref-shortcut-toggle"
     aria-expanded={moreShortcuts}
     aria-controls="ref-shortcuts-more"
     onClick={() => setMoreShortcuts((v) => !v)}
    >
     <span>{moreShortcuts ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}</span>
     <small>{moreShortcuts ? "Less" : "More"}</small>
    </button>
   </div>
   {moreShortcuts && (
    <div id="ref-shortcuts-more" className="ref-shortcuts-more">
     {extraShortcuts.map((item) => renderShortcut(item))}
    </div>
   )}
  </nav>
  <section className="ref-hero">
   <img src={theme?.bannerImg ?? "/rr insight.jpg"} alt="" onError={e=>{e.currentTarget.src="/ipl-2027-banner.jpg";}}/>
   <div className="ref-hero-copy"><small>FEATURED INTELLIGENCE</small><h1>{team} 2027:<br/><em>The Next Blueprint</em></h1><p>Retention, targets, squad balance and how {theme?.name ?? "Rajasthan Royals"} can build a contender for 2027.</p><div><Link className="ref-cta" href={destination}>▶ Explore Analysis</Link><button aria-label="Save featured analysis" aria-pressed={saved} onClick={()=>setSaved(!saved)}><Bookmark size={20} fill={saved?"currentColor":"none"}/></button></div></div>
  </section>
  <section><div className="ref-heading"><h2>Continue Exploring</h2><Link href="/discover" aria-label="Explore all"><ChevronRight/></Link></div><div className="ref-explore">{[["IPL Intelligence","10-Layer Analysis","/intelligence",BarChart3],["Retention Room","Strategy & Calls","/retention-room",Shield],["Auction Intel","Targets & Value","/ai-analyst/auction-war-room",Gavel],["Scout Lab","Find the Next Star","/scout",Gamepad2]].map(([title,desc,href,Icon]:any)=><Link href={href} key={title}><Icon size={24}/><div><strong>{title}</strong><small>{desc}</small></div></Link>)}</div></section>
  <section aria-label="Latest website stories"><div className="ref-heading"><h2>Top Stories</h2><Link href="/feed">All Stories <ArrowRight size={14}/></Link></div><div className="ref-filters">{["All",...(theme ? [theme.shortName] : [])].map(t=><button key={t} aria-pressed={filter===t} onClick={()=>setFilter(t)}>{t}</button>)}</div><div className="ref-stories ref-shared-stories"><HomeInsights team={filter === "All" ? null : theme?.id} limit={4}/></div></section>
  <section><div className="ref-heading"><h2><Gamepad2/> Game Zone</h2><Link href="/arcade">All Games <ArrowRight size={14}/></Link></div><div className="ref-games">{HOME_ARCADE_GAMES.map(game=><Link key={game.id} href={`/arcade/${game.id}`}><div className="ref-game-art"><img src={ARCADE_ART[game.id]} alt="" loading="lazy"/></div><strong>{game.title}</strong></Link>)}</div></section>
  <section><div className="ref-heading"><h2><Radio/> Live & Upcoming</h2><Link href="/scores">Scores <ArrowRight size={14}/></Link></div><div className="ref-matches">{matches.length?matches.slice(0,4).map(m=><Link href="/scores" key={m.matchInfo.matchId}><small>{m.matchInfo.state}</small><strong>{m.matchInfo.team1.teamSName} {getMatchScoreLine(m).team1} · {m.matchInfo.team2.teamSName}</strong><p>{m.matchInfo.status}</p></Link>):<Link href="/scores"><strong>Open the Match Centre <ChevronRight size={16}/></strong><p>{live.isLoading?"Loading fixtures…":"Live scores, upcoming fixtures and results"}</p></Link>}</div></section>
 </div>;
}


import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { Gavel, Compass, BarChart3, Shield, ChevronRight, ArrowRight, Radio, Bookmark } from "lucide-react";
import { useTeamTheme, TEAM_CODE_TO_SLUG } from "@/lib/team-context";
import HomeInsights from "@/components/home-insights";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import "./home-reference.css";

export default function MobileHome() {
 const { theme } = useTeamTheme();
 const [filter,setFilter] = useState(() => theme?.shortName ?? "All");
 const [saved,setSaved] = useState(false);
 useEffect(() => {
  setFilter(theme?.shortName ?? "All");
 }, [theme?.shortName]);
 const live = useLiveIplMatches();
 const matches = live.data?.matches ?? [];

 const team = theme?.shortName ?? "RR";
 const destination = theme ? `/dugout/${TEAM_CODE_TO_SLUG[theme.id]}` : "/dugout/rajasthan-royals";
 return <div className="ref-home" style={{"--ref-accent":theme?.accent ?? "#ffda7c","--ref-secondary":theme?.secondary ?? "#f4b547"} as CSSProperties}>
  <section className="ref-hero">
   <img src={theme?.bannerImg ?? "/rr insight.jpg"} alt="" onError={e=>{e.currentTarget.src="/ipl-2027-banner.jpg";}}/>
   <div className="ref-hero-copy"><small>FEATURED INTELLIGENCE</small><h1>{team} 2027:<br/><em>The Next Blueprint</em></h1><p>Retention, targets, squad balance and how {theme?.name ?? "Rajasthan Royals"} can build a contender for 2027.</p><div><Link className="ref-cta" href={destination}>▶ Explore Analysis</Link><button aria-label="Save featured analysis" aria-pressed={saved} onClick={()=>setSaved(!saved)}><Bookmark size={20} fill={saved?"currentColor":"none"}/></button></div></div>
  </section>
  <section><div className="ref-heading"><h2>Continue Exploring</h2><Link href="/discover" aria-label="Explore all"><ChevronRight/></Link></div><div className="ref-explore">{[["IPL Intelligence","10-Layer Analysis","/intelligence",BarChart3],["Retention Room","Strategy & Calls","/retention-room",Shield],["Auction Intel","Targets & Value","/auction",Gavel],["Tactics","Match planning","/tactics",Shield],["Storylines","IPL 2027 articles","/storylines",BarChart3],["Pressure Lab","Performance under pressure","/pressurelab",Compass]].map(([title,desc,href,Icon]:any)=><Link href={theme && ["/auction", "/tactics", "/storylines"].includes(href) ? `${href}?team=${theme.id}` : href} key={title}><Icon size={24}/><div><strong>{title}</strong><small>{desc}</small></div></Link>)}</div></section>
  <section aria-label="Latest website stories"><div className="ref-heading"><h2>Top Stories</h2><Link href="/intelligence">All Stories <ArrowRight size={14}/></Link></div><div className="ref-filters">{["All",...(theme ? [theme.shortName] : [])].map(t=><button key={t} aria-pressed={filter===t} onClick={()=>setFilter(t)}>{t}</button>)}</div><div className="ref-stories ref-shared-stories"><HomeInsights team={filter === "All" ? null : theme?.id} limit={4}/></div></section>
  <section><div className="ref-heading"><h2><Radio/> Live & Upcoming</h2><Link href="/scores">Scores <ArrowRight size={14}/></Link></div><div className="ref-matches">{matches.length?matches.slice(0,4).map(m=><Link href="/scores" key={m.matchInfo.matchId}><small>{m.matchInfo.state}</small><strong>{m.matchInfo.team1.teamSName} {getMatchScoreLine(m).team1} · {m.matchInfo.team2.teamSName}</strong><p>{m.matchInfo.status}</p></Link>):<Link href="/scores"><strong>Open the Match Centre <ChevronRight size={16}/></strong><p>{live.isLoading?"Loading fixtures…":"Live scores, upcoming fixtures and results"}</p></Link>}</div></section>
 </div>;
}


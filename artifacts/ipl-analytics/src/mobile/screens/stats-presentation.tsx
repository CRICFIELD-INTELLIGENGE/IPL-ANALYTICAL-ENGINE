import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Search, Filter, Flame, Target, Users, MapPin, ArrowRight, TrendingUp, Crosshair, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { teamShort, useTeams, useVenues, venueHref, normalizeVenueName, playerSlug } from "@/lib/aggregates";
import type { AnalyticsFilters } from "@/lib/store";
import { Sheet } from "../shell";

type Tab = "batters" | "bowlers" | "venues" | "teams" | "records" | "head2head" | "stat-builder" | "scenario-intelligence" | "ask";
interface Props {
 filters:AnalyticsFilters; setFilter:<K extends keyof AnalyticsFilters>(key:K,value:AnalyticsFilters[K])=>void;
 seasons:string[]; teams:string[]; activeTab:Tab; setActiveTab:(tab:Tab)=>void;
 search:string;setSearch:(s:string)=>void;rows:any[];images?:Record<string,string>;
 getBio:(name:string)=>any;getTeam:(name:string,row?:any)=>string;displayName:(name:string)=>string;
 filterControls:ReactNode;tools:ReactNode;trend:{season:string;runs:number;sixes:number}[];
 loading:boolean;slicedUnavailable:boolean;onSort:(field:string)=>void;
}
export function MobileStatsPresentation(p:Props){
 const teamSearch=useTeams(); const venueSearch=useVenues();
 const [sheet,setSheet]=useState(false);const [expanded,setExpanded]=useState(false);const [trends,setTrends]=useState(false);const [tools,setTools]=useState(false);
 const bowling=p.activeTab==="bowlers";const ranking=p.activeTab==="batters" || bowling;
 const select=(tab:Tab)=>{p.setActiveTab(tab);setTools(!["batters","bowlers"].includes(tab));setTrends(false);};
 const numeric=(v:unknown,dp=0)=>typeof v==="number" && Number.isFinite(v)?v.toLocaleString("en-IN",{maximumFractionDigits:dp}):"—";
 return <div className="msc">
  <section className="msc-hero"><img src="/advance stats title image.png" alt=""/><div><span>CRICKET INTELLIGENCE</span><h1>Stats <em>Centre</em></h1><p>Every number tells a story.</p></div></section>
  <div className="msc-content"><div className="msc-search"><Search size={19}/><input aria-label="Search players, teams, records" placeholder="Search players, teams, records..." value={p.search} onChange={e=>p.setSearch(e.target.value)}/><button aria-label="Advanced filters" onClick={()=>setSheet(true)}><Filter size={19}/></button></div>
  {p.search.trim() && <div className="msc-search-destinations" aria-label="Matching teams and venues">{teamSearch.data?.filter(t=>t.team.toLowerCase().includes(p.search.trim().toLowerCase())).slice(0,4).map(t=><button key={t.team} onClick={()=>{p.setFilter("team",teamShort(t.team));p.setSearch("");select("teams");}}>{t.team} <ArrowRight size={14}/></button>)}{venueSearch.data?.filter(v=>normalizeVenueName(v.venue).toLowerCase().includes(p.search.trim().toLowerCase())).slice(0,4).map(v=><Link key={v.venue} href={venueHref(v.venue)}>{normalizeVenueName(v.venue)} <ArrowRight size={14}/></Link>)}</div>}
  <div className="msc-filters"><label><span>Competition</span><select aria-label="Competition" value="IPL" disabled title="This Stats warehouse covers IPL"><option value="IPL">IPL</option></select></label><label><span>Season</span><select aria-label="Season" value={p.filters.season} onChange={e=>p.setFilter("season",e.target.value)}>{["All Seasons",...p.seasons].map(s=><option key={s}>{s}</option>)}</select></label><label><span>Team</span><select aria-label="Team" value={p.filters.team} onChange={e=>{p.setFilter("team",e.target.value);if(p.filters.opposition===e.target.value)p.setFilter("opposition","All Opponents");}}>{["All Teams",...p.teams].map(t=><option key={t}>{t}</option>)}</select></label></div>
  <nav className="msc-categories" aria-label="Stats categories">{[["batters","Batters",Flame],["bowlers","Bowlers",Target],["teams","Teams",Users],["venues","Venues",MapPin]].map(([id,label,Icon]:any)=><button key={id} aria-pressed={p.activeTab===id} onClick={()=>select(id)}><Icon size={25}/><span>{label}</span></button>)}</nav>
  {ranking && !tools && <section aria-live="polite"><div className="msc-heading"><h2>{bowling?"Top Wicket Takers":"Top Run Scorers"}</h2><button onClick={()=>setExpanded(!expanded)}>{expanded?"Show less":"View all"} <ArrowRight size={16}/></button></div><div className="msc-sort"><label>Sort by <select aria-label="Leaderboard sorting" defaultValue={bowling?"wickets":"runs"} key={p.activeTab} onChange={e=>p.onSort(e.target.value)}>{(bowling?["wickets","econ","avg","sr","matches"]:["runs","sr","avg","sixes","matches"]).map(f=><option key={f} value={f}>{f}</option>)}</select></label></div>
  {p.loading?<p role="status">Loading rankings…</p>:p.slicedUnavailable?<p role="status">Filtered statistics are unavailable for this selection. Adjust the filters or try again.</p>:!p.rows.length?<p>No matching players for these filters.</p>:<ol className="msc-leaderboard">{p.rows.slice(0,expanded?100:3).map((r,i)=><li key={r.player}><Link href={`/players/${playerSlug(r.player)}`}><span className="msc-rank">{i===0?<Trophy size={14}/>:null}{i+1}</span><div className="msc-portrait"><PlayerAvatar name={r.player} teamId={p.getTeam(r.player,r)} playerImages={p.images} bio={p.getBio(r.player)} disableHover imgClassName="w-full h-full object-contain object-bottom"/></div><div className="msc-player"><strong>{p.displayName(r.player)}</strong><small>{bowling?`Econ ${numeric(r.econ,2)}`:`SR ${numeric(r.sr,1)}`}</small></div><div className="msc-value"><strong>{numeric(bowling?r.wickets:r.runs)}</strong><small>{bowling?"Wickets":"Runs"}</small></div><ArrowRight size={15}/></Link></li>)}</ol>}</section>}
  <section><div className="msc-heading"><h2>Explore Intelligence</h2><button onClick={()=>{setTools(!tools);setTrends(false);}}>See all <ArrowRight size={16}/></button></div><div className="msc-features"><button onClick={()=>{setTrends(!trends);setTools(false);}} aria-expanded={trends}><TrendingUp size={32}/><strong>Season Trends</strong><span>Performance over time.</span><ArrowRight size={17}/></button><button onClick={()=>select("head2head")}><Crosshair size={32}/><strong>Head to Head</strong><span>Compare matchups.</span><ArrowRight size={17}/></button></div></section>
  {trends && <section className="msc-trends"><h2>Season Trends</h2><p>IPL season totals from the website warehouse.</p><div className="msc-trend-table"><table><thead><tr><th>Season</th><th>Runs</th><th>Sixes</th></tr></thead><tbody>{p.trend.map(s=><tr key={s.season}><td><button onClick={()=>{p.setFilter("season",s.season);select("batters");}}>{s.season}</button></td><td>{numeric(s.runs)}</td><td>{numeric(s.sixes)}</td></tr>)}</tbody></table></div></section>}
  {tools && <section className="msc-tools" aria-label="Stats tools"><button className="msc-back" onClick={()=>{setTools(false);select("batters");}}>Back to rankings</button>{p.tools}</section>}
  <p className="msc-source">IPL statistics · CRICFIELD warehouse. Filters and analytical tools are shared with the website.</p></div>
  {sheet && <Sheet title="Advanced Stats filters" onClose={()=>setSheet(false)}><div className="msc-filter-sheet">{p.filterControls}</div><button className="cfm-btn" onClick={()=>setSheet(false)}>Show results</button></Sheet>}
 </div>;
}

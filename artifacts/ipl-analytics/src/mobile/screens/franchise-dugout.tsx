import { useEffect, useState, type CSSProperties } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Trophy, BarChart3, UserRound, Gavel, Shield } from "lucide-react";
import { useTeamTheme, TEAM_REGISTRY, TEAM_CODE_TO_SLUG, resolveTeamCode, type TeamCode } from "@/lib/team-context";
import { useMatches, useSquadsBySeason, useTeams } from "@/lib/aggregates";
import { fetchFranchiseRecord } from "@/lib/dugout-api";
import { buildFranchiseMilestones } from "@/lib/franchise-milestones";
import { milestonePhotography } from "@/lib/milestone-photography";
import { MilestonePhotoGallery } from "@/components/dugout/milestone-photo";
import { FranchiseLibrary, useFranchiseArticles, LibraryMedia } from "@/components/dugout/franchise-library";
import { FRANCHISE_SEASON_CAPTAINS } from "@/components/dugout/franchise-hero";
import { TeamSquad } from "@/components/team-squad";
import { FranchiseIntelligence } from "@/components/dugout/franchise-intelligence";
import { SeasonTimeline } from "@/components/dugout/season-timeline";
import "./franchise-dugout.css";

export default function MobileFranchiseDugout() {
 const { team: routeTeam } = useParams<{team?:string}>();
 const { selectedTeam, setSelectedTeam } = useTeamTheme();
 const [,navigate] = useLocation();
 const code = resolveTeamCode(routeTeam ?? "") ?? selectedTeam ?? "SRH";
 const team = TEAM_REGISTRY[code];
 const [tab,setTab] = useState("Overview");
 const [chosen,setChosen] = useState<string|null>(null);
 const [momentIndex,setMomentIndex] = useState(0);
 useEffect(()=>{if(selectedTeam !== code) setSelectedTeam(code);setTab("Overview");setMomentIndex(0);setChosen(null);},[code]);
 const rival = TEAM_REGISTRY[team.archRival];
 const record = useQuery({queryKey:["dugout-franchise",team.name,rival?.name ?? null],queryFn:()=>fetchFranchiseRecord(team.name,rival?.name),retry:1,staleTime:10*60_000});
 const matches=useMatches(); const squads=useSquadsBySeason(); const teams=useTeams();
 const seasons = [...new Set([...(record.data?.seasons.map(s=>s.season) ?? []),...Object.keys(squads.data ?? {}).filter(s=>(squads.data?.[s]?.[team.name]?.length ?? 0)>0)])].sort();
 const season=chosen && seasons.includes(chosen)?chosen:seasons.at(-1);
 const summary=teams.data?.find(t=>t.team===team.name);
 const win=record.data?.overall.winPct ?? summary?.winPct;
 const captain=(season ? FRANCHISE_SEASON_CAPTAINS[code]?.[season]?.name : null) ?? record.data?.latestCaptain?.name;
 const moments=buildFranchiseMilestones(code,record.data,matches.data ?? []);
 const moment=moments[momentIndex % Math.max(1,moments.length)];
 const photos=milestonePhotography(team,moments);
 const library=useFranchiseArticles(code);
 const articles=library.items.filter(i=>i.kind!=="planned" && i.href).slice(0,6);
 const pick=(s:string)=>{setChosen(s);setTab("History");};
 return <div className="mdg" style={{"--club":team.accent,"--club-secondary":team.secondary} as CSSProperties}>
  <header className="mdg-hero"><img className="mdg-banner" src={team.bannerImg} alt=""/><div className="mdg-identity"><img src={team.logoImg} alt={`${team.name} logo`}/><div><small>YOUR DUGOUT</small><h1>{team.name}</h1><label className="mdg-switch"><span className="sr-only">Choose franchise</span><select aria-label="Choose franchise" value={code} onChange={e=>navigate(`/dugout/${TEAM_CODE_TO_SLUG[e.target.value as TeamCode]}`)}>{Object.values(TEAM_REGISTRY).map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><p>Fan Zone · Analysis · Memories · Personal Space</p></div></div></header>
  <div className="mdg-body"><div className="mdg-metrics">{[[Trophy,`${record.data?.titles.count ?? team.titles}×`,"Titles"],[BarChart3,seasons.length || "—","Seasons"],[Shield,win==null?"—":`${win.toFixed(1)}%`,"Win Rate"],[UserRound,captain ?? "—",season?`${season} Captain`:"Captain"]].map(([Icon,value,label]:any)=><div key={label}><Icon size={20}/><strong>{value}</strong><small>{label}</small></div>)}</div>
  <nav className="mdg-tabs" aria-label="Dugout sections">{["Overview","Articles","Analysis","Memories","History","Squad"].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
  {(tab==="Overview" || tab==="Memories") && <section className="mdg-milestone"><div className="mdg-heading"><h2>{code} <em>MILESTONES</em></h2><button onClick={()=>setTab("History")}>Explore Timeline <ArrowRight size={15}/></button></div>{moment?<><div className="mdg-moment"><div><small>{moment.label}</small><b>{moment.value}</b><h3>{moment.title}</h3><p>{moment.description}</p><button className="mdg-cta" onClick={()=>moment.season && pick(moment.season)}>Explore this season <ArrowRight size={14}/></button></div><div className="mdg-moment-photo">{photos.get(moment.id)?.length ? <MilestonePhotoGallery key={`${code}-${moment.id}`} frames={photos.get(moment.id)!} moment={moment} team={team}/> : <img src={team.bannerImg} alt={`${team.name} franchise artwork`}/>}</div></div><div className="mdg-dots" aria-label="Milestone selection">{moments.map((m,i)=><button key={m.id} aria-label={m.title} aria-pressed={momentIndex===i} onClick={()=>setMomentIndex(i)}/>)}</div></>:<p>{matches.isLoading?"Loading franchise milestones…":"No milestones available yet."}</p>}</section>}
  {tab==="Overview" && <><section><div className="mdg-heading"><h2>Latest from {team.name}</h2><button onClick={()=>setTab("Articles")}>View All <ArrowRight size={15}/></button></div><div className="mdg-articles">{articles.map(item=><Link href={item.href!} key={item.key}><div className="mdg-article-media"><LibraryMedia imageId={item.imageId} title={item.title} accent={team.accent} code={code} teamName={team.name} aspect={item.aspect} preserveAspectRatio/></div><div className="mdg-article-copy"><small>{item.aspect}</small><h3>{item.title}</h3><p>{item.meta}</p></div></Link>)}</div></section><section><div className="mdg-heading"><h2>Squad Notebook</h2><button onClick={()=>setTab("Squad")}>Full Squad <ArrowRight size={15}/></button></div><TeamSquad franchise={team.name} accent={team.accent} season={season} onSeasonChange={setChosen}/></section><section><div className="mdg-heading"><h2>{code} Intelligence</h2></div><div className="mdg-tools"><button onClick={()=>setTab("Analysis")}><BarChart3/><strong>Squad Report<small>Strengths & gaps</small></strong><ArrowRight size={15}/></button><Link href="/ai-analyst/auction-war-room"><Gavel/><strong>Auction Watchlist<small>Targets by role</small></strong><ArrowRight size={15}/></Link><Link href={`/retention-room/${code}`}><Shield/><strong>Retention Outlook<small>Key calls for 2027</small></strong><ArrowRight size={15}/></Link></div></section></>}
  {tab==="Articles" && <FranchiseLibrary code={code} teamName={team.name} accent={team.accent}/>}
  {tab==="Squad" && <TeamSquad franchise={team.name} accent={team.accent} season={season} onSeasonChange={setChosen}/>}
  {tab==="Analysis" && (season?<FranchiseIntelligence teamName={team.name} code={code} season={season} accent={team.accent}/>:<p>Loading season data…</p>)}
  {(tab==="Overview" || tab==="History") && <SeasonTimeline record={record.data} allSeasons={seasons} season={season ?? null} onSeason={setChosen} accent={team.accent} franchiseName={team.name}/>}
  </div></div>;
}


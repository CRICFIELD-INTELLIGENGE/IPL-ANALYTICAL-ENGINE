import { useState } from "react";
import { Link } from "wouter";
import { useTeams, useVenues, teamShort, venueHref, venueImage } from "@/lib/aggregates";
import { TeamLogo } from "@/components/team-logo";
import { TEAM_CODE_TO_SLUG, resolveTeamCode } from "@/lib/team-context";
import type { ScoutRating } from "@/lib/scout-api";

export function ScoutResearchConnections({ player }: { player: ScoutRating | null }) {
  const [tab,setTab] = useState<"teams"|"venues">("teams");
  const [query,setQuery] = useState("");
  const teams=useTeams(), venues=useVenues();
  const search=query.trim().toLowerCase();
  return <section className="scout-connections" aria-labelledby="research-connections">
    <div className="scout-connections-heading"><div><p>FOLLOW THE EVIDENCE</p><h2 id="research-connections">Players don’t play in isolation.</h2><span>Explore IPL team and ground records from the same data used by Stats.</span></div><Link href="/stats">Open Stats ↗</Link></div>
    {player && <div className="scout-player-context"><span>Researching <strong>{player.name}</strong> · {player.competition.toUpperCase()} · {player.seasons.join(', ')} · {player.balls} balls</span><Link href={`/scout/player/${encodeURIComponent(player.cricsheet_id || String(player.player_key))}`}>Player dossier ↗</Link></div>}
    <div className="scout-connection-controls"><div role="group" aria-label="Research entity"><button aria-pressed={tab==='teams'} onClick={()=>setTab('teams')}>Teams</button><button aria-pressed={tab==='venues'} onClick={()=>setTab('venues')}>Venues</button></div><input aria-label="Search team or venue cards" placeholder={`Find a ${tab==='teams'?'team':'venue'}…`} value={query} onChange={e=>setQuery(e.target.value)}/></div>
    {(tab==='teams'?teams:venues).isLoading ? <p role="status">Loading research cards…</p> : (tab==='teams'?teams:venues).isError ? <div>Research records could not load. <button onClick={()=>void (tab==='teams'?teams:venues).refetch()}>Retry</button></div> : <div className="scout-entity-grid">
      {tab==='teams' ? (teams.data??[]).filter(t=>t.team.toLowerCase().includes(search)).slice(0,8).map(t=>{
        const code=resolveTeamCode(t.team); const slug=code?TEAM_CODE_TO_SLUG[code]:t.team.toLowerCase().replace(/[^a-z0-9]+/g,'-');
        return <Link key={t.team} href={`/teams/${slug}`} className="scout-entity-card"><TeamLogo team={t.team} size="w-10 h-10"/><h3>{t.team}</h3><p>{t.matches.toLocaleString()} matches · {t.wins.toLocaleString()} wins</p><span>{teamShort(t.team)} · Team intelligence ↗</span></Link>;
      }) : (venues.data??[]).filter(v=>v.venue.toLowerCase().includes(search)).slice(0,8).map(v=><Link key={v.venue} href={venueHref(v.venue)} className="scout-entity-card"><img src={venueImage(v.venue) ?? undefined} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/><h3>{v.venue}</h3><p>{v.matches.toLocaleString()} matches · {v.avg1stInn == null ? 'First-innings average unavailable' : `${Math.round(v.avg1stInn)} avg first innings`}</p><span>Venue intelligence ↗</span></Link>)}
      {(tab==='teams'?(teams.data??[]).filter(t=>t.team.toLowerCase().includes(search)):(venues.data??[]).filter(v=>v.venue.toLowerCase().includes(search))).length===0 && <p>No matching {tab}. Try another search.</p>}
    </div>}
  </section>;
}

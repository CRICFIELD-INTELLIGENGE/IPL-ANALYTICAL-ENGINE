import { lazy, Suspense, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, ArrowRight, Search, Sparkles, Trophy, Compass, Gamepad2, BarChart3, Radio, Shield, ChevronRight } from "lucide-react";
import { TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";
import { TeamLogo } from "@/components/team-logo";
import { useSeasons } from "@/lib/aggregates";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import "./mobile-home.css";

const Stories = lazy(() => import("@/components/home-insights"));
const teams = Object.keys(TEAM_REGISTRY) as TeamCode[];

export function MobileHome() {
  const { selectedTeam } = useTeamTheme();
  const [team, setTeam] = useState<TeamCode>((selectedTeam as TeamCode) || "CSK");
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const seasons = useSeasons();
  const latest = seasons.data?.slice().sort((a,b) => Number(b.season) - Number(a.season))[0];
  const live = useLiveIplMatches();
  const match = live.data?.matches?.find(m => /progress|innings/i.test(m.matchInfo.state));
  const franchise = TEAM_REGISTRY[team];

  return <div className="mobile-home">
    <section className="mh-welcome">
      <div className="mh-eyebrow"><span /> THE GAME GOES DEEPER</div>
      <div className="mh-heading"><h1>Your daily<br />cricket fix<span>.</span></h1><div className="mh-seam-ball" aria-hidden="true"><span /></div></div>
      <p>The stories. The numbers. Your next big call.</p>
      <form className="mh-search" onSubmit={e => { e.preventDefault(); if (query.trim()) navigate(`/scout/results?q=${encodeURIComponent(query.trim())}`); }}>
        <Search size={18} aria-hidden="true" /><input aria-label="Search players in Scout Lab" placeholder="Find your next match-winner" value={query} onChange={e => setQuery(e.target.value)} /><button type="submit" aria-label="Search players"><ArrowRight size={18} /></button>
      </form>
    </section>

    <div className="mh-shortcuts" aria-label="Quick destinations">
      {[{ href:"/scores", label:"Scores", icon:Radio },{ href:"/stats", label:"Numbers", icon:BarChart3 },{ href:"/scout", label:"Scout", icon:Compass },{ href:"/arcade", label:"Play", icon:Gamepad2 }].map(({href,label,icon:Icon}) => <Link key={href} href={href}><span><Icon size={22}/></span>{label}</Link>)}
    </div>

    {match && <Link href="/scores" className="mh-live"><span className="mh-live-label">● LIVE</span><strong>{match.matchInfo.team1.teamSName} <span>{getMatchScoreLine(match).team1}</span></strong><strong>{match.matchInfo.team2.teamSName} <span>{getMatchScoreLine(match).team2}</span></strong><small>{match.matchInfo.status}</small></Link>}

    <section className="mh-feature">
      <div className="mh-feature-top"><span>THE NEXT CHAPTER</span><span>IPL / 2027</span></div>
      <div className="mh-feature-copy"><h2>Keep the core.<br />Change the game.</h2><Trophy size={66} strokeWidth={1} aria-hidden="true" /></div>
      <p>Your franchise. Your retention calls.<br />Build the squad you believe in.</p>
      <Link href={`/retention-room/${team}`}>Enter the Retention Room <ArrowUpRight size={18}/></Link>
      <div className="mh-feature-lines" aria-hidden="true" />
    </section>

    <section className="mh-dugout">
      <div className="mh-section-title"><h2>Your corner of cricket</h2><Link href="/dugout">Dugout <ArrowUpRight size={15}/></Link></div>
      <div className="mh-team-picker" role="group" aria-label="Choose a franchise to explore">{teams.map(code => <button key={code} type="button" aria-pressed={team === code} onClick={() => setTeam(code)}><TeamLogo team={code} size="w-9 h-9"/><span>{code}</span></button>)}</div>
      <Link className="mh-team-card" href={`/dugout/${team}`} style={{"--franchise-color":franchise.accent} as React.CSSProperties}>
        <TeamLogo team={team} size="w-16 h-16"/><div><small>INSIDE THE DUGOUT</small><h3>{franchise.name}</h3><p>Squad, stories & season intelligence</p></div><ChevronRight size={20}/>
      </Link>
    </section>

    <section className="mh-read">
      <div className="mh-section-title"><h2>Beyond the boundary</h2><Link href="/feed">All stories <ArrowUpRight size={15}/></Link></div>
      <p className="mh-section-caption">A different angle on the game you love.</p>
      <div className="mh-story-shelf"><Suspense fallback={<p className="mh-loading">Finding your next read…</p>}><Stories team={team} limit={2}/></Suspense></div>
    </section>

    <Link href="/ai-analyst" className="mh-ai"><span><Sparkles size={23}/></span><div><small>A LITTLE HELP FROM THE DATA</small><h2>Got a cricket theory?</h2><p>Put it to your AI analyst.</p></div><ArrowUpRight size={20}/></Link>

    <section className="mh-season"><div className="mh-section-title"><h2>In the scorebook</h2><Link href="/stats">Explore <ArrowUpRight size={15}/></Link></div>{latest ? <><p className="mh-section-caption">IPL {latest.season} · Season at a glance</p><div className="mh-stat-grid">{[{label:"Matches",value:latest.matches},{label:"Runs",value:latest.runs},{label:"Sixes",value:latest.sixes}].map(stat => <div key={stat.label}><strong>{stat.value.toLocaleString("en-IN")}</strong><span>{stat.label}</span></div>)}</div></> : <p className="mh-section-caption">{seasons.isError ? "Season numbers are unavailable right now. Explore the Stats Centre." : "Opening the scorebook…"}</p>}</section>
    <Link href="/arcade" className="mh-play"><Gamepad2 size={30}/><div><small>OFF THE CLOCK?</small><h2>One more over.</h2><p>Quick games. Serious bragging rights.</p></div><ArrowRight size={20}/></Link>
    <p className="mh-signoff"><Shield size={13}/> Made for the way you see cricket.</p>
  </div>;
}

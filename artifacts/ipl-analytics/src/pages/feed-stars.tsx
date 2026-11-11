import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, Check, ChevronRight, Compass, Crosshair, Flame, GitCompareArrows, HeartPulse, Search, Shield, Sparkles, Star, Swords, Target, Users, X, Zap } from "lucide-react";
import { Layout } from "@/components/layout";
import { PlayerAvatar } from "@/components/player-avatar";
import { LibraryMedia } from "@/components/dugout/franchise-library";
import { useScoutShortlist } from "@/lib/scout-shortlist";
import { fetchScoutPlayer, fetchScoutRankings, type Discipline, type MatchPhase, type ScoutRating } from "@/lib/scout-api";
import { fetchBoard } from "@/lib/sim-api";
import { displayPlayerName, usePlayerDisplayNames } from "@/lib/aggregates";
import { HUB_TEAMS, type HubTeam } from "@/lib/ipl-2027";
import { TEAM_REGISTRY } from "@/lib/team-context";
import { getV2Index } from "@/lib/editorial-v2";
import { readSaved, retentionKey, type RetentionSnapshot } from "@/lib/auction-plan";
import "./feed-stars.css";

const LEAGUES = [{ id: "all", label: "All leagues" }, { id: "ipl", label: "IPL" }, { id: "smat", label: "SMAT" }, { id: "bbl", label: "BBL" }, { id: "sa20", label: "SA20" }, { id: "cpl", label: "CPL" }, { id: "ilt20", label: "ILT20" }];
const ROLE_HUNTS = [
  { title: "POWERPLAY ENFORCERS", subtitle: "Attack the field restrictions", discipline: "batting", phase: "powerplay", role: "opener", color: "purple", icon: Zap },
  { title: "MIDDLE-OVER CONTROLLERS", subtitle: "Build pressure through the middle", discipline: "bowling", phase: "middle", role: "middle_specialist", color: "blue", icon: Shield },
  { title: "DEATH-OVER SPECIALISTS", subtitle: "Close the innings with control", discipline: "bowling", phase: "death", role: "death_specialist", color: "red", icon: Target },
  { title: "LOWER-ORDER FINISHERS", subtitle: "Find the late-innings impact", discipline: "batting", phase: "death", role: "finisher", color: "lime", icon: Flame },
  { title: "MIDDLE-ORDER BUILDERS", subtitle: "Connect the start to the finish", discipline: "batting", phase: "middle", role: "middle_order", color: "gold", icon: Users },
  { title: "MULTI-PHASE BOWLERS", subtitle: "Options across the innings", discipline: "bowling", phase: "all", role: "multi_phase", color: "cyan", icon: Swords },
] as const;
const f = (n: number | null | undefined, digits = 1) => n == null || !Number.isFinite(n) ? "—" : n.toFixed(digits);
const pretty = (s: string) => s.replace(/_/g, " ");
const identity = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const playerHref = (p: ScoutRating, team: string) => `/scout/player/${encodeURIComponent(p.cricsheet_id)}?${new URLSearchParams({ team, discipline: p.discipline, competitions: p.competition, phase: p.phase })}`;
function observation(p: ScoutRating) {
  const metric = p.metrics[p.discipline === "batting" ? "strike_rate" : "economy"];
  if (p.balls < 120) return "Early signal. Inspect the small sample before making the call.";
  if (metric?.value != null && metric.league != null) return `${p.discipline === "batting" ? "Strike rate" : "Economy"} ${f(metric.value)} vs league ${f(metric.league)}. Check the role and opposition context.`;
  return `${p.balls} recorded balls. Open the dossier to investigate strengths and limitations.`;
}

export default function FeedStarsPage() {
  const params = new URLSearchParams(useSearch());
  const requestedTeam = params.get("team");
  const [team, setTeam] = useState<HubTeam>(HUB_TEAMS.includes(requestedTeam as HubTeam) ? requestedTeam as HubTeam : "CSK");
  const [kind, setKind] = useState<"all" | Discipline>("all");
  const [league, setLeague] = useState("all");
  const [phase, setPhase] = useState<MatchPhase>("all");
  const [sample, setSample] = useState(120);
  const [sort, setSort] = useState("rating");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [limit, setLimit] = useState(5);
  const [selected, setSelected] = useState<ScoutRating | null>(null);
  const [duel, setDuel] = useState<ScoutRating[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [need, setNeed] = useState<Discipline>("bowling");
  const [core, setCore] = useState<RetentionSnapshot | null>(null);
  const names = usePlayerDisplayNames();
  const { shortlist, toggleShortlist, isShortlisted } = useScoutShortlist();
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const rankings = useQuery({
    queryKey: ["star-watch-discovery", kind, league, phase, sample, debounced, sort],
    queryFn: async () => {
      const disciplines: Discipline[] = kind === "all" ? ["batting", "bowling"] : [kind];
      const results = await Promise.all(disciplines.map(discipline => fetchScoutRankings({ discipline, competitions: league === "all" ? undefined : league, phase, minBalls: sample, recentSeasons: 2, search: debounced || undefined, limit: 30, sortBy: sort === "sample" ? "balls" : "shrunk", sortOrder: "desc" })));
      const seen = new Set<string>(); const players: ScoutRating[] = [];
      for (let i = 0; i < Math.max(...results.map(r => r.data.length), 0); i++) for (const result of results) {
        const p = result.data[i];
        if (p && !seen.has(p.cricsheet_id)) { players.push(p); seen.add(p.cricsheet_id); }
      }
      return { players, total: results.reduce((sum, r) => sum + r.pagination.total, 0) };
    }, staleTime: 300000, retry: 1,
  });
  const players = rankings.data?.players ?? [];
  const featured = selected ?? players[0];
  const profile = useQuery({ queryKey: ["scout-player", featured?.cricsheet_id], queryFn: () => fetchScoutPlayer(featured!.cricsheet_id), enabled: Boolean(featured), staleTime: 300000, retry: 1 });
  const fit = useQuery({ queryKey: ["auction-hub", team], queryFn: () => fetchBoard({ view: "live", team, sort: "fit" }), staleTime: 300000, retry: 1 });
  const matchingFits = useMemo(() => shortlist.map(p => ({ player: p, fit: fit.data?.rows.find(row => identity(displayPlayerName(row.name, names)) === identity(displayPlayerName(p.name, names))) })), [shortlist, fit.data, names]);
  const fittingPlayer = featured ? fit.data?.rows.find(p => identity(displayPlayerName(p.name, names)) === identity(displayPlayerName(featured.name, names))) : undefined;
  const radar = useMemo(() => {
    const picked: ScoutRating[] = []; const seenComps = new Set<string>();
    for (const p of players) if (!seenComps.has(p.competition)) { seenComps.add(p.competition); picked.push(p); if (picked.length >= 5) break; }
    for (const p of players) if (picked.length < 5 && !picked.includes(p)) picked.push(p);
    return picked;
  }, [players]);
  const visible = showSaved ? shortlist.filter(p => (kind === "all" || p.discipline === kind) && (league === "all" || p.competition === league) && p.name.toLowerCase().includes(search.toLowerCase())) : players;
  const scoutHref = (discipline?: Discipline, selectedPhase: MatchPhase = phase, role?: string) => `/scout?${new URLSearchParams({ ...(discipline || kind !== "all" ? { discipline: discipline || kind } : {}), ...(league !== "all" ? { competitions: league } : {}), phase: selectedPhase, ...(role ? { role } : {}), minBalls: String(sample), recentSeasons: "2", search, team })}`;
  const toggleDuel = (p: ScoutRating) => {
    if (duel.length && duel[0].discipline !== p.discipline) {
      setDuel([p]);
      setMessage("Scout Duel compares the same discipline. Choose another " + p.discipline + " candidate.");
      return;
    }
    setDuel(prev => prev.some(x => x.cricsheet_id === p.cricsheet_id) ? prev.filter(x => x.cricsheet_id !== p.cricsheet_id) : prev.length < 2 ? [...prev, p] : [prev[1], p]);
  };
  const compareHref = `/scout/compare?${new URLSearchParams({ ids: duel.map(p => p.cricsheet_id).join(","), discipline: duel[0]?.discipline ?? "batting", ...(league !== "all" ? { competitions: league } : {}), phase, recentSeasons: "2", team })}`;
  const stories = getV2Index().filter(s => s.aspect === "scouting").sort((a, b) => Number(b.franchise === team) - Number(a.franchise === team)).slice(0, 3);
  const importCore = () => {
    const snapshot = readSaved<RetentionSnapshot | null>(retentionKey(team), null);
    setCore(snapshot);
    setMessage(snapshot ? `Loaded your ${team} retained core: ${snapshot.players.length} players. Choose the next role to scout.` : "Save your retention picks in the Retention Room, then import them here.");
  };
  const selectedMatches = matchingFits.filter(x => x.player.discipline === need);
  const featureMetric = featured?.metrics[featured.discipline === "batting" ? "strike_rate" : "economy"];

  return <Layout hideRightPanel><div className="scout-notebook">
    <div className="sn-breadcrumb"><Link href="/feed">Feed</Link><ChevronRight size={11} /><span>Star Watch</span><span>DISCOVER THE PLAYER. INVESTIGATE IN SCOUT LAB.</span></div>
    <section className="sn-hero"><img src="/assets/scouts-notebook-hero.png" alt="Illustrated cricket scout’s desk with notebooks, clipped photographs and scouting equipment" /><div className="sn-hero-shade" /><div className="sn-title-paper"><span className="sn-eyebrow">CRICFIELD / STAR WATCH</span><h1>THE SCOUT’S<br />NOTEBOOK<span>✧</span></h1><p>The next big name might already be playing.<br /><b>Find them first.</b></p><a href="#discovery-wall" className="sn-button dark">Explore players <ArrowRight size={14} /></a><small>REAL PLAYERS. RECORDED PERFORMANCES. NEW POSSIBILITIES.</small></div><aside className="sn-sticky"><span>THE SCOUT’S CHECKLIST</span><p>Find the role.<br />Read the sample.<br />Look beyond the name.</p><Check size={27} /><small>Then open the evidence<br />in Scout Lab.</small></aside></section>

    <section className="sn-radar sn-panel" aria-label="On the radar"><div><h2>ON THE RADAR <Sparkles size={16} /></h2><p>A cross-league starting point<br />from the discovery filters.</p></div><div className="sn-radar-players">{radar.map(p => <button key={p.cricsheet_id} onClick={() => { setSelected(p); document.getElementById("scout-microscope")?.scrollIntoView({ behavior: "smooth" }); }}><PlayerAvatar name={p.name} className="sn-radar-avatar" disableHover /><span><b>{displayPlayerName(p.name, names)}</b><small>{pretty(p.role.label)} · {p.competition.toUpperCase()}</small><em>{p.balls} balls to investigate</em></span></button>)}{rankings.isLoading && <span className="sn-loading">Opening the notebook…</span>}</div></section>

    <section className="sn-discovery" id="discovery-wall"><div className="sn-filter-bar"><div className="sn-filter-tabs">{([["all", "All players"], ["batting", "Batters"], ["bowling", "Bowlers"]] as const).map(([id, label]) => <button className={kind === id && !showSaved ? "active" : ""} aria-pressed={kind === id && !showSaved} key={id} onClick={() => { setKind(id); setShowSaved(false); setLimit(5); }}>{label}</button>)}<button className={showSaved ? "active" : ""} onClick={() => { setShowSaved(!showSaved); setLimit(5); }}><Star size={11} /> Saved ({shortlist.length})</button></div><select aria-label="Scouting league" value={league} onChange={e => { setLeague(e.target.value); setLimit(5); }}>{LEAGUES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select><select aria-label="Scouting phase" value={phase} onChange={e => { setPhase(e.target.value as MatchPhase); setLimit(5); }}><option value="all">All phases</option><option value="powerplay">Powerplay</option><option value="middle">Middle overs</option><option value="death">Death overs</option></select><select aria-label="Minimum scouting sample" value={sample} onChange={e => { setSample(Number(e.target.value)); setLimit(5); }}><option value={60}>60+ balls</option><option value={120}>120+ balls</option><option value={250}>250+ balls</option><option value={500}>500+ balls</option></select><label className="sn-search"><Search size={13} /><input aria-label="Search scouting players" placeholder="Search players…" value={search} onChange={e => { setSearch(e.target.value); setLimit(5); }} /></label></div><div className="sn-section-head"><div><h2>THE DISCOVERY WALL <Star size={18} /></h2><p>Fresh dossiers. Real records. A reason to look closer.</p></div><div className="sn-wall-sort"><label>Sort by<select aria-label="Sort scouting players" value={sort} onChange={e => setSort(e.target.value)}><option value="rating">Adjusted performance</option><option value="sample">Sample size</option></select></label><Link href={scoutHref()}>View in Scout Lab <ArrowRight size={12} /></Link></div></div>
      <div className="sn-sample-note">{showSaved ? "Your saved notebook" : "Latest two available seasons per league"} · league and season coverage differ. Open each dossier for its exact sample.</div>
      {rankings.isError && !showSaved ? <div className="sn-empty">The scouting warehouse could not load.<button onClick={() => rankings.refetch()}>Try again</button></div> : rankings.isLoading && !showSaved ? <div className="sn-empty" role="status">Finding the next name worth watching…</div> : <div className="sn-dossier-grid">{visible.slice(0, limit).map((p, i) => <article className={`sn-dossier tilt-${i % 3}`} key={`${p.cricsheet_id}-${p.discipline}`}><div className="sn-tape" /><div className="sn-dossier-photo"><Link href={playerHref(p, team)} aria-label={`Open ${p.name} in Scout Lab`}><PlayerAvatar name={p.name} className="sn-player-image" imgClassName="w-full h-full object-contain object-bottom" disableHover /></Link><button aria-label={`${isShortlisted(p.cricsheet_id) ? "Unsave" : "Save"} ${p.name}`} aria-pressed={isShortlisted(p.cricsheet_id)} onClick={() => toggleShortlist(p)}><Star size={18} fill={isShortlisted(p.cricsheet_id) ? "#d7ef57" : "none"} /></button><h3>{displayPlayerName(p.name, names)}</h3></div><div className="sn-dossier-content"><span className="sn-player-role">{pretty(p.role.label)} · {p.discipline === "batting" ? "BATTER" : "BOWLER"}</span><span className="sn-league-tag">{p.competition.toUpperCase()} · {p.seasons.join(", ")}</span><div className="sn-player-metrics">{(p.discipline === "batting" ? [{ label: "SR", value: f(p.metrics.strike_rate?.value) }, { label: "RUNS", value: String(p.counts.runs ?? "—") }, { label: "BALLS", value: String(p.balls) }] : [{ label: "ECON", value: f(p.metrics.economy?.value, 2) }, { label: "WKTS", value: String(p.counts.wickets ?? p.counts.bowler_wickets ?? "—") }, { label: "BALLS", value: String(p.balls) }]).map(m => <span key={m.label}><small>{m.label}</small><b>{m.value}</b></span>)}</div><div className="sn-scout-note"><span>{p.tier === "rankable" ? "SCOUT’S OBSERVATION" : "LIMITED SAMPLE"}</span><p>{observation(p)}</p></div><div className="sn-dossier-actions"><button onClick={() => setSelected(p)}>Inspect <Crosshair size={11} /></button><button className={duel.some(x => x.cricsheet_id === p.cricsheet_id) ? "selected" : ""} aria-label={`Compare ${p.name}`} onClick={() => toggleDuel(p)}><GitCompareArrows size={11} />{duel.some(x => x.cricsheet_id === p.cricsheet_id) ? "Added" : "Duel"}</button></div></div></article>)}</div>}
      {!rankings.isLoading && !visible.length && <div className="sn-empty">{showSaved ? "Your notebook is empty for these filters. Star a player to save them." : "No players match this sample and these filters."}</div>}{visible.length > limit && <button className="sn-load-more" onClick={() => setLimit(limit + 5)}>Open more dossiers <ArrowRight size={13} /></button>}
      {duel.length > 0 && <div className="sn-duel-tray"><div><GitCompareArrows size={17} /><span>SCOUT DUEL</span>{duel.map(p => <button key={p.cricsheet_id} onClick={() => toggleDuel(p)}>{p.name}<X size={11} /></button>)}</div>{duel.length === 2 ? <Link href={compareHref}>Compare evidence <ArrowRight size={13} /></Link> : <span>Choose one more player from the wall.</span>}</div>}
    </section>

    <section className="sn-role-section"><div className="sn-role-hunts sn-panel"><div className="sn-section-head"><div><h2>THE ROLE HUNT</h2><p>Find the player for the job.</p></div><Link href="/scout/roles">Explore role definitions <ArrowRight size={12} /></Link></div><div className="sn-role-grid">{ROLE_HUNTS.map(h => <Link className={`sn-role-card ${h.color}`} key={h.title} href={scoutHref(h.discipline, h.phase, h.role)}><h.icon size={34} /><h3>{h.title}</h3><span>{h.subtitle}</span><ArrowRight size={14} /></Link>)}</div></div><aside className="sn-howto"><span>How it works.</span><ol><li>Choose a role and league.</li><li>Read the sample and context.</li><li>Open the evidence in Scout Lab.</li><li>Compare candidates.</li><li>Save the names worth following.</li></ol><Compass size={30} /></aside></section>

    <section className="sn-microscope-grid" id="scout-microscope"><div className="sn-microscope sn-panel"><div className="sn-section-head"><div><span className="sn-eyebrow">UNDER THE MICROSCOPE</span><h2>{featured ? displayPlayerName(featured.name, names) : "Your next discovery"}: read beyond the headline.</h2></div>{featured && <span className="sn-sample-stamp">{featured.balls} BALLS<br />{featured.matches} MATCHES</span>}</div><div className="sn-feature-body"><div className="sn-feature-photo">{featured && <PlayerAvatar name={featured.name} className="sn-feature-player" imgClassName="w-full h-full object-contain object-bottom" disableHover />}<span>SCOUT REPORT / {featured?.competition.toUpperCase() || "DISCOVERY"}</span></div><div className="sn-feature-copy"><p>{featured ? observation(featured) : "Select a player from the discovery wall to open a scouting preview."}</p><div className="sn-feature-metrics"><span><small>{featured?.discipline === "bowling" ? "ECONOMY" : "STRIKE RATE"}</small><b>{f(featureMetric?.value)}</b></span><span><small>LEAGUE BENCHMARK</small><b>{f(featureMetric?.league)}</b></span><span><small>RECORDED BALLS</small><b>{featured?.balls ?? "—"}</b></span></div><ul>{(profile.data?.strengthsAndWeaknesses.strengths ?? featured?.strengths ?? []).slice(0, 2).map(s => <li key={s}>{s}</li>)}</ul><div className="sn-limitations"><b>Check before you call it.</b><p>{profile.data?.strengthsAndWeaknesses.weaknesses[0] || "League strength, role usage and sample size can change the interpretation."}</p>{featured?.partialSeasons.length ? <p>Partial coverage: {featured.partialSeasons.join(", ")}.</p> : null}</div>{featured && <Link href={playerHref(featured, team)} className="sn-button lime">Open full scouting dossier <ArrowRight size={14} /></Link>}</div></div><div className="sn-evidence-links">{featured && <><Link href={`/ai-analyst/pressure?player=${encodeURIComponent(featured.name)}&team=${team}`}><HeartPulse size={13} />Pressure Genome</Link><Link href={`/ai-analyst/player-pool?player=${encodeURIComponent(featured.name)}&team=${team}`}><Users size={13} />Similar player search</Link><Link href={`/ai-analyst/weakness?player=${encodeURIComponent(featured.name)}`}><Crosshair size={13} />Weakness evidence</Link></>}</div></div><aside className="sn-lab-panel sn-panel"><Compass size={33} /><span className="sn-eyebrow">THE NEXT STEP</span><h2>OPEN IN<br />SCOUT LAB</h2><p>Discover here.<br />Investigate there.</p><ul><li><Check />Phase-specific performance</li><li><Check />League-adjusted benchmarks</li><li><Check />Comparable players</li><li><Check />Strengths & limitations</li><li><Check />Exact season coverage</li></ul><Link href={featured ? playerHref(featured, team) : "/scout"} className="sn-button lime">Open Scout Lab <ArrowRight size={14} /></Link><small>Historical evidence, not a prediction of future form.</small></aside></section>

    <div className="sn-bottom-grid"><section className="sn-fit sn-panel"><div className="sn-section-head"><div><h2>FRANCHISE FIT BOARD</h2><p>What does your squad need next?</p></div><select aria-label="Scouting franchise" value={team} onChange={e => { setTeam(e.target.value as HubTeam); setCore(null); }}>{HUB_TEAMS.map(t => <option key={t}>{t}</option>)}</select></div><div className="sn-fit-team"><img src={TEAM_REGISTRY[team].logoImg} alt="" /><div><b>{TEAM_REGISTRY[team].name}</b><small>{core ? `${core.players.length} retained in your scenario` : "Historical squad profile · planning context"}</small></div><button onClick={importCore}>Import retained core</button></div><div className="sn-fit-gaps">{fit.data?.team?.gaps.slice(0, 3).map(g => <span key={g.label}>{g.label}</span>)}{fit.isError && <small>Historical squad gaps are unavailable.</small>}</div><label className="sn-fit-need">ROLE TO SCOUT<select aria-label="Franchise scouting need" value={need} onChange={e => setNeed(e.target.value as Discipline)}><option value="batting">Batting</option><option value="bowling">Bowling</option></select></label><p className="sn-fit-verdict">{fittingPlayer?.fit ? `${featured?.name}: model fit ${f(fittingPlayer.fit.score, 0)} / 100. ${fittingPlayer.fit.reasons[0] || "Inspect the valuation evidence."}` : "Scout candidates are exploratory targets, not confirmed auction registrations."}</p><div className="sn-fit-actions"><Link href={scoutHref(need)}>Find candidates <ArrowRight size={12} /></Link><Link href={`/feed/auction?team=${team}`}>Open auction shortlist <ArrowRight size={12} /></Link></div><small>{selectedMatches.length} saved {need} candidates · {matchingFits.filter(x => x.fit).length} saved players matched to the valuation model.</small></section><section className="sn-watchlist sn-panel" id="scout-watchlist"><div className="sn-section-head"><h2>MY WATCHLIST</h2><span>{shortlist.length} players</span></div><p>Shared with Scout Lab and Auction War Room.</p><div className="sn-watch-players">{shortlist.slice(0, 6).map(p => <div key={p.cricsheet_id}><button aria-label={`Unsave ${p.name} from watchlist`} onClick={() => toggleShortlist(p)}><Star size={14} fill="#d6ec5c" /></button><PlayerAvatar name={p.name} className="sn-watch-avatar" disableHover /><Link href={playerHref(p, team)}><b>{displayPlayerName(p.name, names)}</b><small>{pretty(p.role.label)} · {p.competition.toUpperCase()}</small></Link></div>)}{!shortlist.length && <div className="sn-watch-empty"><Star size={24} /><span>Your next discovery starts with a star.<br />Save a player from the wall.</span></div>}</div><button className="sn-text-link" onClick={() => { setShowSaved(true); setKind("all"); setLeague("all"); setSearch(""); document.getElementById("discovery-wall")?.scrollIntoView({ behavior: "smooth" }); }}>View saved dossiers <ArrowRight size={12} /></button></section><section className="sn-stories sn-panel"><div className="sn-section-head"><h2>LATEST SCOUTING STORIES</h2><Link href="/feed">View all <ArrowRight size={11} /></Link></div>{stories.map(s => { const t = TEAM_REGISTRY[s.franchise]; return <Link key={s.id} href={`/dugout/articles/${s.slug}`}><div className="sn-story-image"><LibraryMedia imageId={s.id} title={s.title} accent={t.accent} code={s.franchise} teamName={t.name} aspect={s.aspect} /></div><div><h3>{s.title}</h3><small>{s.publishedDate} · {s.readMinutes} min read</small></div></Link>; })}</section></div>
    {message && <div className="sn-message" role="status">{message}<button aria-label="Dismiss scouting message" onClick={() => setMessage("")}><X size={13} /></button></div>}
  </div></Layout>;
}

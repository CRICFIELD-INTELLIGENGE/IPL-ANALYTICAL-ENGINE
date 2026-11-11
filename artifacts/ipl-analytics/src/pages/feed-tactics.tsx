import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, Check, ChevronRight, Crosshair, Download, GitBranch, MapPin, Play, Plus, RefreshCw, Rewind, Save, Shield, Swords, Users, X } from "lucide-react";
import { Layout } from "@/components/layout";
import { LibraryMedia } from "@/components/dugout/franchise-library";
import { TEAM_REGISTRY } from "@/lib/team-context";
import { HUB_TEAMS, type HubTeam } from "@/lib/ipl-2027";
import { readSaved } from "@/lib/auction-plan";
import { venueImage, venueSlug, venueHref as venueDetailHref } from "@/lib/aggregates";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchCatalog, fetchOpposition } from "@/lib/sim-api";
import { getV2Index } from "@/lib/editorial-v2";
import "./feed-tactics.css";

interface MatchPlan { team: HubTeam; opponent: HubTeam; venue: string; season: number; notes: string; fielders: string[] }
interface SavedPlan extends MatchPlan { id: string; name: string; savedAt: string; winProbability: number | null }
const WORKSPACE = "cf:tactics-workspace:v1";
const SAVED = "cf:tactics-scenarios:v1";
const DEFAULT: MatchPlan = { team: "CSK", opponent: "RCB", venue: "", season: 0, notes: "", fielders: [] };
const teamCode = (s: string | null, fallback: HubTeam) => HUB_TEAMS.includes(s as HubTeam) ? s as HubTeam : fallback;
const TABS = ["Match-up trends", "Phase analysis", "Bowling plans", "Fielding map"] as const;
const FIELDERS = [ { name: "Slip", x: 58, y: 31 }, { name: "Third man", x: 74, y: 15 }, { name: "Point", x: 85, y: 40 }, { name: "Cover", x: 80, y: 65 }, { name: "Mid-off", x: 61, y: 78 }, { name: "Mid-on", x: 39, y: 78 }, { name: "Midwicket", x: 19, y: 65 }, { name: "Square leg", x: 16, y: 40 }, { name: "Fine leg", x: 26, y: 15 }, { name: "Deep cover", x: 92, y: 70 }, { name: "Long-on", x: 32, y: 93 } ];

function initialPlan(): MatchPlan {
  const stored = { ...DEFAULT, ...readSaved<Partial<MatchPlan>>(WORKSPACE, {}) };
  const p = readParams();
  const team = teamCode(p.get("team"), teamCode(stored.team, "CSK"));
  const candidate = teamCode(p.get("opp"), teamCode(stored.opponent, "RCB"));
  const opponent = candidate === team ? team === "CSK" ? "RCB" : "CSK" : candidate;
  const season = Number(p.get("season") ?? stored.season);
  return { ...stored, team, opponent, venue: p.get("venue") ?? stored.venue, season: Number.isFinite(season) ? season : 0 };
}

export default function FeedTacticsPage() {
  const [plan, setPlan] = useState<MatchPlan>(initialPlan);
  const [saved, setSaved] = useState<SavedPlan[]>(() => readSaved(SAVED, []));
  const [tab, setTab] = useState<(typeof TABS)[number]>("Match-up trends");
  const [workspaceTab, setWorkspaceTab] = useState<"saved" | "notes" | "compare" | null>(null);
  const [status, setStatus] = useState("");
  const [storyTab, setStoryTab] = useState<"Featured" | "Match analysis" | "Data stories">("Featured");
  const catalog = useQuery({ queryKey: ["decision-catalog"], queryFn: fetchCatalog, staleTime: 3600000, retry: 1 });
  const season = plan.season || catalog.data?.latestSeason || 2026;
  const venues = catalog.data?.venues ?? [];
  const venue = venues.find(v => v.key === plan.venue || (plan.venue && venueSlug(v.name) === venueSlug(plan.venue.replace(/-/g, " "))))?.key || plan.venue || venues.find(v => /chidambaram/i.test(v.name))?.key || "";
  const selectedVenue = venues.find(v => v.key === venue);
  const report = useQuery({ queryKey: ["opposition", plan.team, plan.opponent, venue, season], queryFn: () => fetchOpposition(plan.team, plan.opponent, venue || undefined, season), enabled: Boolean(catalog.data) && plan.team !== plan.opponent, staleTime: 600000, retry: 1 });
  const r = report.data;
  const win = r?.winProbability;
  const profile = r?.venueProfile;
  const theme = TEAM_REGISTRY[plan.team];
  const rival = TEAM_REGISTRY[plan.opponent];
  const vImage = venueImage(selectedVenue?.name) || "/venue-images/ma chidambaram stadium.webp";
  const context = new URLSearchParams({ team: plan.team, opp: plan.opponent, venue, season: String(season), scenario: "tactical-board" }).toString();
  const engine = (path: string) => `${path}?${context}`;
  const simulator = `/ai-analyst/strategy-sim?${new URLSearchParams({ bowl: plan.team, bat: plan.opponent, venue, season: String(season), scenario: "tactical-board" })}`;
  const venueHref = selectedVenue ? venueDetailHref(selectedVenue.name) : "/feed/venues";
  const weakest = r?.batters.find(b => b.trapSignificant)?.name;
  const weaknessHref = `/ai-analyst/weakness?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(context)), ...(weakest ? { player: weakest } : {}) })}`;
  useEffect(() => {
    try { localStorage.setItem(WORKSPACE, JSON.stringify(plan)); } catch { /* Keep the current in-memory workspace usable. */ }
  }, [plan]);
  const update = (patch: Partial<MatchPlan>) => {
    const next = { ...plan, ...patch };
    if (next.team === next.opponent) next.opponent = HUB_TEAMS.find(t => t !== next.team)!;
    setPlan(next);
    writeParams({ team: next.team, opp: next.opponent, venue: next.venue || venue, season: next.season || season });
  };
  const saveScenario = () => {
    const item: SavedPlan = { ...plan, venue, season, id: crypto.randomUUID(), name: `${plan.team} vs ${plan.opponent}`, savedAt: new Date().toISOString(), winProbability: win?.overall ?? null };
    const next = [item, ...saved].slice(0, 20);
    try { localStorage.setItem(SAVED, JSON.stringify(next)); setSaved(next); setStatus("Match plan saved in this browser."); setWorkspaceTab("saved"); }
    catch { setStatus("Could not save: browser storage is unavailable."); }
  };
  const loadScenario = (s: SavedPlan) => {
    update({ team: s.team, opponent: s.opponent, venue: s.venue, season: s.season, notes: s.notes, fielders: s.fielders });
    setStatus(`Loaded ${s.name}.`);
  };
  const download = () => {
    const blob = new Blob([JSON.stringify({ ...plan, venue, season, savedAt: new Date().toISOString(), historicalModel: r ? { winProbability: r.winProbability, tacticalOverview: r.tacticalOverview, rotation: r.rotation } : null }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `cricfield-${plan.team}-${plan.opponent}-tactics.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Match plan exported as JSON.");
  };
  const stories = getV2Index().filter(a => a.franchise === plan.team && (storyTab === "Data stories" ? a.aspect === "data-science" : a.aspect === "tactical") && (storyTab !== "Match analysis" || a.storyType === "investigation")).slice(0, 4);

  return <Layout hideRightPanel><div className="tactical-board">
    <div className="tb-breadcrumb"><Link href="/feed">Feed</Link><ChevronRight size={12} /><span>Tactics</span><span>MATCH PLANNING / IPL 2027</span></div>
    <section className="tb-hero"><img className="tb-hero-art" src="/assets/tactical-board-hero.png" alt="Illustrated cricket analyst studying tactical boards in a floodlit stadium" /><div className="tb-hero-shade" /><div className="tb-hero-copy"><span className="tb-edition">IPL 2027</span><h1>THE TACTICAL<br /><em>BOARD</em></h1><h2>Data. Decisions. Match-ups. Winning plans.</h2><p>Simulate. Analyse. Outsmart. All before the first ball.</p><div className="tb-hero-links"><a href="#match-planning">Build your match plan <ArrowRight size={14} /></a><button onClick={saveScenario}><Save size={13} /> Save scenario</button></div></div><aside className="tb-match-widget"><div className="tb-section-head"><h2>MATCH SIMULATOR</h2><span>HISTORICAL MODEL</span></div><div className="tb-widget-teams"><img src={theme.logoImg} alt="" /><b>{plan.team}</b><span>vs</span><img src={rival.logoImg} alt="" /><b>{plan.opponent}</b><button onClick={() => report.refetch()} disabled={report.isFetching || !catalog.data}>{report.isFetching ? <RefreshCw size={13} className="animate-spin" /> : <Play size={12} />} {report.isFetching ? "Running" : "Simulate"}</button></div><div className="tb-win-strip"><div><small>{plan.team} WIN</small><strong>{win ? `${win.overall.toFixed(0)}%` : "—"}</strong></div><div className="tb-win-middle">{win ? <><span style={{ width: `${win.overall}%` }} /><small>{win.sims.toLocaleString()} simulations / side</small></> : <small>{report.isError ? "Model unavailable" : "Calculating matchup…"}</small>}</div><div><small>{plan.opponent} WIN</small><strong>{win ? `${(100 - win.overall).toFixed(0)}%` : "—"}</strong></div></div><p>{selectedVenue?.city || "Selected venue"} · {season} squads</p><span className="tb-note">Model estimate, not a live match forecast.</span></aside></section>

    <section className="tb-match-selectors" id="match-planning"><TeamSelector label="SELECT YOUR TEAM" value={plan.team} onChange={team => update({ team })} /><TeamSelector label="SELECT OPPONENT" value={plan.opponent} disabled={plan.team} onChange={opponent => update({ opponent })} /><div className="tb-venue-select tb-panel"><label htmlFor="tactics-venue">VENUE & CONDITIONS</label><div><img src={vImage} alt="" /><select id="tactics-venue" value={venue} onChange={e => update({ venue: e.target.value })}>{venues.map(v => <option key={v.key} value={v.key}>{v.name}</option>)}</select></div><label className="tb-season-select">Historical squads<select aria-label="Historical squad season" value={season} onChange={e => update({ season: Number(e.target.value) })}>{(catalog.data?.seasons ?? [season]).slice(0, 19).map(s => <option key={s}>{s}</option>)}</select></label></div></section>
    {(catalog.isError || report.isError) && <div className="tb-status" role="alert">{catalog.isError ? "The match catalogue could not load." : "Match intelligence could not load for this selection."}<button onClick={() => catalog.isError ? catalog.refetch() : report.refetch()}>Try again <RefreshCw size={12} /></button></div>}
    {status && <div role="status" className="tb-status">{status}<button onClick={() => setStatus("")} aria-label="Dismiss notification"><X size={13} /></button></div>}

    <section className="tb-engines" aria-label="Tactical decision engines">
      <TacticCard number="01" title="STRATEGY SIMULATOR" description="Build a chase situation. Compare bowling plans and simulated outcomes." image="/suresh-raina-transparent.png" color="lime" href={simulator} action="Launch simulator" tags={["Powerplay", "Middle overs", "Death overs"]} graphic="plans" />
      <TacticCard number="02" title="OPPOSITION EXPLOIT MAP" description="Find tested weaknesses. Generate a pre-match franchise intelligence brief." image="/virat-kohli-transparent.png" color="blue" href={engine("/ai-analyst/opposition-map")} action="Generate exploit map" tags={["Match-ups", "Bowling plans", "Spin grid"]} graphic="checklist" />
      <TacticCard number="03" title="CAPTAIN’S DECISION REPLAY" description="Step into a real IPL chase. Make the call. See what actually happened." image="/msd-transparent.png" color="purple" href="/ai-analyst/decision-replay" action="Play decision replay" tags={["Real chases", "Turning points", "Your call"]} graphic="replay" />
      <TacticCard number="04" title="ALTERNATE UNIVERSE ENGINE" description="Reconstruct a real innings. Change the bowling. Explore a different ending." image="/sanju-samson-transparent.png" color="cyan" href="/ai-analyst/alt-universe" action="Enter multiverse engine" tags={["What-if", "Ball-by-ball", "Divergence"]} graphic="multiverse" />
      <TacticCard number="05" title="HIDDEN WEAKNESS DETECTOR" description="Inspect player anomalies and evidence to discover actionable matchup traps." image="/tactical-yorker.jpg" color="orange" href={weaknessHref} action="Hunt for weaknesses" tags={["Anomalies", "Evidence", "Visuals"]} graphic="field" />
    </section>

    <div className="tb-intel-grid"><section className="tb-panel tb-insights"><div className="tb-section-head"><h2>TACTICAL INSIGHTS</h2><Link href={engine("/ai-analyst/opposition-map")}>Full briefing <ArrowRight size={12} /></Link></div><div className="tb-tabs">{TABS.map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>{tab === "Fielding map" ? <div className="tb-field-workspace"><FieldBoard selected={plan.fielders} onToggle={name => update({ fielders: plan.fielders.includes(name) ? plan.fielders.filter(f => f !== name) : plan.fielders.length < 9 ? [...plan.fielders, name] : plan.fielders })} /><div><h3>Build your field</h3><p>{plan.fielders.length} / 9 outfield positions selected</p><p>An illustrative planning canvas. Tap a position to place or remove a fielder.</p><button className="tb-text-link" onClick={() => update({ fielders: [] })}>Reset field <RefreshCw size={11} /></button><small>Bowler and wicketkeeper excluded. This canvas does not enforce competition field restrictions.</small></div></div> : <div className="tb-insights-body"><div><h3>{plan.team} vs {plan.opponent} — {tab === "Match-up trends" ? "Key match-up insights" : tab}</h3>{!r ? <p className="tb-empty">{report.isError ? "No report available for this matchup." : "Building the historical match brief…"}</p> : tab === "Match-up trends" ? <ul className="tb-bullets">{r.tacticalOverview.slice(0, 3).map(t => <li key={t}>{t}</li>)}{r.headToHead.played > 0 && <li>Head to head: {r.headToHead.won} wins from {r.headToHead.played} matches.</li>}</ul> : <ul className="tb-bullets">{r.rotation.map(p => <li key={p.phase}><b>{p.phase} ({p.overs})</b> — {tab === "Bowling plans" ? p.bowlers.map(b => b.name).join(", ") : p.mission}</li>)}</ul>}</div><PhaseChart values={r?.rotation.map(p => ({ label: p.phase, value: p.expectedEconomy })) ?? []} /></div>}</section>

      <section className="tb-panel tb-venue-intel" style={{ backgroundImage: `linear-gradient(90deg,#04101bec,#04101bcc),url("${vImage}")` }}><div className="tb-section-head"><h2>VENUE & CONDITIONS INTELLIGENCE</h2><Link href={venueHref}>Full venue analysis <ArrowRight size={12} /></Link></div><div className="tb-venue-identity"><img src={vImage} alt="" /><div><h3>{selectedVenue?.name || "Choose a venue"}</h3><p>Historical insights · {profile?.matches ?? "—"} matches</p></div></div><div className="tb-venue-metrics"><Metric icon={<MapPin />} label="Avg first innings" value={profile?.avgFirstInnings?.toFixed(0) ?? "—"} /><Metric icon={<Swords />} label="Pace economy" value={profile?.paceEconomy?.toFixed(2) ?? "—"} /><Metric icon={<GitBranch />} label="Spin economy" value={profile?.spinEconomy?.toFixed(2) ?? "—"} /><Metric icon={<Shield />} label="Chasing wins" value={profile?.chasingWinPct == null ? "—" : `${profile.chasingWinPct.toFixed(0)}%`} /></div><div className="tb-venue-footer"><span>Historical conditions, not current weather.</span><Link href={engine("/feed/venues")}>Dew & ball wear tools <ArrowRight size={11} /></Link></div></section></div>

    <div className="tb-bottom-grid"><section className="tb-panel tb-stories"><div className="tb-section-head"><h2>LATEST TACTICAL STORIES</h2><Link href={`/dugout/${plan.team.toLowerCase()}`}>All stories <ArrowRight size={12} /></Link></div><div className="tb-tabs">{(["Featured", "Match analysis", "Data stories"] as const).map(t => <button key={t} className={storyTab === t ? "active" : ""} onClick={() => setStoryTab(t)}>{t}</button>)}</div><div className="tb-story-grid">{stories.map(s => <Link href={`/dugout/articles/${s.slug}`} key={s.id}><div className="tb-story-image"><LibraryMedia imageId={s.id} title={s.title} accent={theme.accent} code={plan.team} teamName={theme.name} aspect={s.aspect} /></div><h3>{s.title}</h3><small>{s.publishedDate} · {s.readMinutes} min read</small></Link>)}{!stories.length && <p className="tb-empty">No stories in this category yet.</p>}</div></section><section className="tb-panel tb-quick-tools"><h2>QUICK TOOLS</h2><QuickLink icon={<Users />} title="Build playing XI" description="Test your combinations" href={engine("/arcade/build-your-xi")} /><QuickLink icon={<Shield />} title="Squad explorer" description="Explore roles and squad DNA" href={engine("/ai-analyst/squad-dna")} /><QuickLink icon={<Crosshair />} title="Player intelligence" description="Inspect pressure and matchup evidence" href={weaknessHref} /><QuickLink icon={<Swords />} title="Auction War Room" description="Find and plan your targets" href={`/feed/auction?team=${plan.team}`} /></section><section className="tb-panel tb-workspace"><h2>YOUR TACTICS WORKSPACE</h2><p>Save scenarios, plans and match analysis.</p><button onClick={saveScenario}><Save size={15} /><b>Save current plan</b><Plus size={13} /></button><button onClick={() => setWorkspaceTab(workspaceTab === "saved" ? null : "saved")}><Bookmark size={15} /><b>Saved scenarios</b><span>{saved.length} plans</span></button><button onClick={() => setWorkspaceTab(workspaceTab === "notes" ? null : "notes")}><Shield size={15} /><b>Match-up notes</b><span>{plan.notes ? "Saved" : "Add notes"}</span></button><button onClick={download}><Download size={15} /><b>Export match plan</b><span>JSON</span></button><button onClick={() => setWorkspaceTab(workspaceTab === "compare" ? null : "compare")}><GitBranch size={15} /><b>Compare scenarios</b><ChevronRight size={13} /></button>{workspaceTab === "notes" && <textarea aria-label="Match-up planning notes" placeholder="Bowling rotations, matchup traps, alternative plans…" value={plan.notes} onChange={e => setPlan({ ...plan, notes: e.target.value })} />}{workspaceTab === "saved" && <div className="tb-saved-list">{saved.map(s => <button key={s.id} onClick={() => loadScenario(s)}><span>{s.name}<small>{s.season} · {s.venue || "Neutral"}</small></span><ArrowRight size={12} /></button>)}{!saved.length && <p>No scenarios saved yet.</p>}</div>}{workspaceTab === "compare" && <div className="tb-comparisons">{saved.slice(0, 3).map(s => <div key={s.id}><b>{s.name}</b><span>{s.season} · {s.venue || "Neutral"}</span><strong>{s.winProbability == null ? "Not simulated" : `${s.winProbability.toFixed(0)}% model win`}</strong></div>)}{saved.length < 2 && <p>Save at least two scenarios to compare their model estimates.</p>}</div>}</section></div>
  </div></Layout>;
}

function TeamSelector({ label, value, disabled, onChange }: { label: string; value: HubTeam; disabled?: HubTeam; onChange: (t: HubTeam) => void }) {
  return <div className="tb-team-selector tb-panel"><h2>{label}</h2><div>{HUB_TEAMS.map(t => <button key={t} onClick={() => onChange(t)} disabled={disabled === t} aria-pressed={value === t} aria-label={`${label === "SELECT YOUR TEAM" ? "Your team" : "Opponent"}: ${t}`} className={value === t ? "selected" : ""}><img src={TEAM_REGISTRY[t].logoImg} alt="" /><span>{t}</span></button>)}</div></div>;
}

function TacticCard({ number, title, description, image, color, href, action, tags, graphic }: { number: string; title: string; description: string; image: string; color: string; href: string; action: string; tags: string[]; graphic: string }) {
  return <Link href={href} className={`tb-engine ${color}`}><div className="tb-engine-top"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div><div className="tb-engine-art"><div className="tb-chalk-grid" /><img src={image} alt="" />{graphic === "plans" ? <div className="tb-plan-slip"><span>YOUR PLANS</span>{["Attack early", "Save death overs", "Play the matchups"].map((p, i) => <div key={p}>{p}<i style={{ width: `${24 + i * 12}px` }} /></div>)}<small>Compare in simulator →</small></div> : graphic === "checklist" ? <div className="tb-check-slip"><strong>VS THE OPPOSITION</strong><span><Check /> Spin matchups</span><span><Check /> Over windows</span><span><Check /> Death threats</span><span><Check /> Bowling rotation</span></div> : graphic === "replay" ? <div className="tb-replay-art"><span>Bowl?</span><span>Attack?</span><span>Defend?</span><div><Rewind /><Play /><GitBranch /></div></div> : graphic === "multiverse" ? <div className="tb-multiverse-art"><GitBranch /><span>SAME MOMENT.<br />DIFFERENT CHOICES.<br />DIFFERENT HISTORIES.</span></div> : <div className="tb-field-art"><FieldBoard decorative /></div>}</div><div className="tb-engine-tags">{tags.map(t => <span key={t}>{t}</span>)}</div><span className="tb-engine-action">{action} <ArrowRight size={13} /></span></Link>;
}

function FieldBoard({ selected = [], onToggle, decorative = false }: { selected?: string[]; onToggle?: (name: string) => void; decorative?: boolean }) {
  return <svg className="tb-field-svg" viewBox="0 0 110 110" role={decorative ? undefined : "group"} aria-label={decorative ? undefined : "Illustrative field placement canvas"} aria-hidden={decorative || undefined}><ellipse cx="55" cy="55" rx="49" ry="51" fill="#0c442f" stroke="#7ac75f" strokeWidth=".7" /><ellipse cx="55" cy="55" rx="31" ry="33" fill="none" stroke="#88b977" strokeDasharray="2 2" strokeWidth=".5" /><rect x="51" y="38" width="8" height="30" fill="#d9c591" opacity=".85" /><path d="M50 43h10M50 63h10" stroke="#eaf3e3" strokeWidth=".8" />{FIELDERS.map((f, i) => <g key={f.name} role={decorative ? undefined : "button"} tabIndex={decorative ? undefined : 0} aria-label={decorative ? undefined : `${selected.includes(f.name) ? "Remove" : "Place"} ${f.name}`} aria-pressed={decorative ? undefined : selected.includes(f.name)} onClick={() => onToggle?.(f.name)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle?.(f.name); } }} style={{ cursor: decorative ? undefined : "pointer" }}><title>{f.name}</title><circle cx={f.x} cy={f.y} r={decorative ? 5 : 6} fill={decorative ? i % 3 === 0 ? "#ff6d35" : "#f2c94c" : selected.includes(f.name) ? "#d4f453" : "#102d37"} stroke="#d6efbc" strokeWidth=".5" opacity={decorative ? .8 : 1} />{!decorative && <text x={f.x} y={f.y + 1.5} textAnchor="middle" fontSize="3.5" fill={selected.includes(f.name) ? "#132c1c" : "#dae7d2"}>{i + 1}</text>}</g>)}</svg>;
}

function PhaseChart({ values }: { values: { label: string; value: number }[] }) {
  const finite = values.filter(v => Number.isFinite(v.value));
  const max = Math.max(12, ...finite.map(v => v.value));
  return <div className="tb-phase-chart"><h3>Projected bowling economy</h3><svg viewBox="0 0 230 120" role="img" aria-label="Expected economy by bowling phase"><path d="M25 10V95H220M25 55H220M25 15H220" stroke="#335162" strokeWidth=".6" fill="none" /><text x="8" y="98">0</text><text x="4" y="18">{max.toFixed(0)}</text>{finite.length > 1 && <polyline points={finite.map((v, i) => `${45 + i * (150 / (finite.length - 1))},${95 - v.value / max * 75}`).join(" ")} fill="none" stroke="#fb826e" strokeWidth="2" />}{finite.map((v, i) => { const x = 45 + i * (150 / Math.max(1, finite.length - 1)), y = 95 - v.value / max * 75; return <g key={v.label}><circle cx={x} cy={y} r="3" fill="#fb826e" /><text x={x} y={y - 8} textAnchor="middle">{v.value.toFixed(1)}</text><text x={x} y="111" textAnchor="middle">{v.label.replace(/overs/i, "").trim()}</text></g>; })}</svg><span>Model expectation · runs per over</span></div>;
}
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="tb-metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function QuickLink({ icon, title, description, href }: { icon: ReactNode; title: string; description: string; href: string }) { return <Link className="tb-quick-link" href={href}><span>{icon}</span><div><b>{title}</b><small>{description}</small></div><ArrowRight size={12} /></Link>; }

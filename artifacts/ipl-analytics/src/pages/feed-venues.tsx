import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, Bookmark, Check, ChevronRight, Compass, Database, GitCompareArrows, MapPin, Search, Shield, Sparkles, Swords, TrendingUp, X } from "lucide-react";
import { Layout } from "@/components/layout";
import { LibraryMedia } from "@/components/dugout/franchise-library";
import { normalizeVenueName, useVenueAnalytics, useVenues, venueHref, venueImage, venueSlug, type VenueRow } from "@/lib/aggregates";
import { readSaved } from "@/lib/auction-plan";
import { getV2Index } from "@/lib/editorial-v2";
import { TEAM_REGISTRY, type TeamCode } from "@/lib/team-context";
import "./feed-venues.css";

type Ground = { name: string; slug: string; matches: number; first: number | null; second: number | null; chase: number | null; field: number | null };
type Filter = "All grounds" | "High scoring" | "Chase friendly" | "Established" | "Saved";
const FILTERS: Filter[] = ["All grounds", "High scoring", "Chase friendly", "Established", "Saved"];
const SAVED_KEY = "cf:venue-atlas:saved:v1";
const num = (v: number | null | undefined, digits = 0) => v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);
const canonicalSlug = (v: string) => venueSlug(v.replace(/-/g, " "));

function groupGrounds(rows: VenueRow[]): Ground[] {
  const grouped = new Map<string, VenueRow[]>();
  for (const row of rows) { const key = venueSlug(row.venue); grouped.set(key, [...(grouped.get(key) ?? []), row]); }
  return [...grouped].map(([slug, group]) => {
    const weighted = (key: keyof VenueRow) => {
      const valid = group.filter(r => typeof r[key] === "number" && Number.isFinite(r[key]));
      const count = valid.reduce((s, r) => s + Number(r.matches || 0), 0);
      return count ? valid.reduce((s, r) => s + Number(r[key]) * Number(r.matches), 0) / count : null;
    };
    return { name: normalizeVenueName(group[0].venue), slug, matches: group.reduce((s, r) => s + Number(r.matches || 0), 0), first: weighted("avg1stInn"), second: weighted("avg2ndInn"), chase: weighted("chasingWinPct"), field: weighted("tossDecisionFieldPct") };
  }).sort((a, b) => b.matches - a.matches);
}

export default function FeedVenuesPage() {
  const params = new URLSearchParams(useSearch());
  const venues = useVenues();
  const grounds = useMemo(() => groupGrounds(venues.data ?? []), [venues.data]);
  const requested = params.get("venue");
  const selected = grounds.find(g => g.slug === canonicalSlug(requested ?? "")) ?? grounds.find(g => g.slug === "wankhede-stadium") ?? grounds[0];
  const compareRequested = params.get("compare");
  const compare = grounds.find(g => g.slug === canonicalSlug(compareRequested ?? "") && g.slug !== selected?.slug) ?? grounds.find(g => g.slug === "eden-gardens" && g.slug !== selected?.slug) ?? grounds.find(g => g.slug !== selected?.slug);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All grounds");
  const [sort, setSort] = useState("matches");
  const [limit, setLimit] = useState(8);
  const [saved, setSaved] = useState<string[]>(() => readSaved(SAVED_KEY, []));
  const [notice, setNotice] = useState("");
  const [compareOpen, setCompareOpen] = useState(true);
  const pitch = useVenueAnalytics(selected?.name);
  const d = pitch.data;
  const pace = d?.surface.find(s => /pace|fast/i.test(s.kind));
  const spin = d?.surface.find(s => /spin/i.test(s.kind));
  const image = venueImage(selected?.name) || "/venue-images/wankhede stadium.webp";
  const updateUrl = (key: "venue" | "compare", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    window.history.replaceState(null, "", `/feed/venues?${next}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const toggleSaved = (slug: string) => {
    const next = saved.includes(slug) ? saved.filter(s => s !== slug) : [...saved, slug];
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { setNotice("Browser storage is unavailable; saved grounds will last for this visit."); }
  };
  const filtered = grounds.filter(g => (!search || `${g.name} ${g.slug}`.toLowerCase().includes(search.toLowerCase()) || g.name.toLowerCase().includes(normalizeVenueName(search.replace(/-/g, " ")).toLowerCase())) && (filter === "All grounds" || filter === "High scoring" && (g.first ?? 0) >= 180 || filter === "Chase friendly" && (g.chase ?? 0) >= 55 || filter === "Established" && g.matches >= 50 || filter === "Saved" && saved.includes(g.slug))).sort((a, b) => sort === "scoring" ? (b.first ?? -1) - (a.first ?? -1) : sort === "chasing" ? (b.chase ?? -1) - (a.chase ?? -1) : sort === "name" ? a.name.localeCompare(b.name) : b.matches - a.matches);
  const venueStories = getV2Index().filter(a => /\b(venues?|grounds?|pitch|chepauk|eden|wankhede|chinnaswamy|kotla|ekana)\b/i.test(a.title));
  const topic = selected?.name.toLowerCase().split(" ").find(t => t.length > 4 && !["stadium", "cricket", "international"].includes(t));
  const relevant = topic ? venueStories.filter(a => a.title.toLowerCase().includes(topic)) : [];
  const stories = [...relevant, ...venueStories.filter(a => !relevant.includes(a))].slice(0, 4);
  const toTactics = `/feed/tactics?venue=${encodeURIComponent(selected?.slug ?? "")}`;
  const totalMatches = grounds.reduce((n, g) => n + g.matches, 0);

  return <Layout hideRightPanel><div className="venue-hub">
    <div className="vh-breadcrumb"><Link href="/feed">Feed</Link><ChevronRight size={11} /><span>Venues</span><span>THE GROUND ATLAS / IPL INTELLIGENCE</span></div>
    <section className="vh-hero"><img src={image} alt="" /><div className="vh-hero-shade" /><div className="vh-hero-copy"><span className="vh-edition"><Compass size={13} /> THE GROUND ATLAS</span><h1>HOME GROUND.<br /><em>REAL ADVANTAGE.</em></h1><p>Every pitch tells a different story.<br />Explore the grounds. Read the conditions. Find your edge.</p><div className="vh-hero-actions"><a href="#venue-explorer" className="vh-button cyan">Explore the grounds <ArrowRight size={14} /></a><button className="vh-button ghost" onClick={() => { setCompareOpen(true); document.getElementById("venue-comparison")?.scrollIntoView({ behavior: "smooth" }); }}><GitCompareArrows size={14} /> Compare venues</button></div></div><aside className="vh-featured"><span className="vh-eyebrow">ON THE RADAR</span><h2>{selected?.name || "Loading ground…"}</h2><p>HISTORICAL GROUND PROFILE</p><div><span><strong>{selected?.matches ?? "—"}</strong>matches</span><span><strong>{num(selected?.first)}</strong>avg 1st innings</span><span><strong>{num(selected?.chase, 1)}%</strong>chase wins</span></div>{selected && <Link href={venueHref(selected.name)}>Open full venue analysis <ArrowRight size={14} /></Link>}</aside></section>
    <div className="vh-summary-strip"><div><MapPin size={17} /><strong>{grounds.length || "—"}</strong><span>GROUNDS IN THE WAREHOUSE</span></div><div><Database size={17} /><strong>{totalMatches ? totalMatches.toLocaleString() : "—"}</strong><span>HISTORICAL MATCHES</span></div><div><Shield size={17} /><span>REAL RECORDS.<br /><b>NO TWO SURFACES ALIKE.</b></span></div><button onClick={() => { setFilter("Saved"); document.getElementById("venue-explorer")?.scrollIntoView({ behavior: "smooth" }); }}><Bookmark size={16} />{saved.length} saved grounds <ArrowRight size={12} /></button></div>

    <section className="vh-spotlight-grid"><div className="vh-spotlight vh-panel"><div className="vh-section-head"><span className="vh-eyebrow">SELECTED GROUND</span><select aria-label="Selected venue" value={selected?.slug ?? ""} onChange={e => updateUrl("venue", e.target.value)}>{grounds.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}</select></div><div className="vh-spotlight-body"><div className="vh-spotlight-image"><img src={image} alt={selected?.name || "Cricket ground"} /><span><MapPin size={12} />{selected?.name}</span></div><div className="vh-pitch-read"><span className="vh-eyebrow">READ THE SURFACE</span><h2>{pace && spin ? spin.economy < pace.economy ? "Where spin takes control." : "Where pace sets the terms." : "Get to know the ground."}</h2><p>{pace && spin ? `${spin.economy < pace.economy ? "Spin" : "Pace"} concedes ${Math.abs(pace.economy - spin.economy).toFixed(2)} fewer runs per over in this ground’s recorded sample.` : pitch.isError ? "Detailed surface data is temporarily unavailable." : "Reading the ball-by-ball history…"}</p><div className="vh-surface-metrics"><span><small>PACE ECONOMY</small><b>{num(pace?.economy, 2)}</b></span><span><small>SPIN ECONOMY</small><b>{num(spin?.economy, 2)}</b></span><span><small>FIRST / SECOND INNINGS</small><b>{num(selected?.first)} <i>/</i> {num(selected?.second)}</b></span></div><Link href={toTactics} className="vh-text-link">Build a match plan here <ArrowRight size={12} /></Link></div></div></div><aside className="vh-conditions vh-panel"><div className="vh-section-head"><h2>WHEN THE LIGHTS COME ON</h2><Sparkles size={15} /></div><p>Second-innings scoring shift by match start time.</p><div className="vh-start-shifts">{[{ label: "Evening starts", value: d?.dew.eveningSwing, count: d?.dew.evening.matches }, { label: "Afternoon starts", value: d?.dew.afternoonSwing, count: d?.dew.afternoon.matches }].map(s => <div key={s.label}><span>{s.label}</span><strong>{s.value != null && s.value > 0 ? "+" : ""}{num(s.value, 1)}</strong><small>{s.count ?? "—"} matches</small></div>)}</div><small className="vh-footnote">Historical scoring differences, not measured dew or a weather forecast.</small>{selected && <Link href={venueHref(selected.name)} className="vh-text-link">Explore innings & conditions <ArrowRight size={12} /></Link>}</aside></section>

    <section className="vh-explorer" id="venue-explorer" aria-label="Venue directory"><div className="vh-section-head"><div><span className="vh-eyebrow">FIND YOUR NEXT GROUND</span><h2>THE VENUE EXPLORER</h2></div><label className="vh-search"><Search size={14} /><input aria-label="Search venues" placeholder="Search a ground…" value={search} onChange={e => { setSearch(e.target.value); setLimit(8); }} /></label></div><div className="vh-explorer-toolbar"><div className="vh-filter-tabs">{FILTERS.map(f => <button key={f} aria-pressed={filter === f} className={filter === f ? "active" : ""} onClick={() => { setFilter(f); setLimit(8); }}>{f}{f === "Saved" && <Bookmark size={10} />}</button>)}</div><select aria-label="Sort venues" value={sort} onChange={e => setSort(e.target.value)}><option value="matches">Most matches</option><option value="scoring">Highest first innings</option><option value="chasing">Highest chase win rate</option><option value="name">Name A–Z</option></select></div><div className="vh-explorer-note"><span>{filtered.length} grounds</span><span>{filter === "High scoring" ? "Avg 1st innings ≥ 180" : filter === "Chase friendly" ? "Chase win rate ≥ 55%" : filter === "Established" ? "At least 50 recorded matches" : "All available IPL seasons · samples vary by ground"}</span></div>
      {venues.isLoading ? <div className="vh-empty" role="status">Opening the ground atlas…</div> : venues.isError ? <div className="vh-empty">The venue warehouse could not load.<button onClick={() => venues.refetch()}>Try again</button></div> : <div className="vh-ground-grid">{filtered.slice(0, limit).map((g, i) => <article className={`vh-ground-card ${selected?.slug === g.slug ? "selected" : ""}`} key={g.slug}><div className="vh-ground-photo"><Link href={venueHref(g.name)} aria-label={`Open ${g.name} venue profile`}>{venueImage(g.name) ? <img src={venueImage(g.name)!} alt="" loading="lazy" /> : <div className="vh-no-photo"><MapPin size={35} /></div>}</Link><span className="vh-ground-index">{String(i + 1).padStart(2, "0")} / GROUND FILE</span><button aria-label={`${saved.includes(g.slug) ? "Unsave" : "Save"} ${g.name}`} aria-pressed={saved.includes(g.slug)} onClick={() => toggleSaved(g.slug)}><Bookmark size={16} fill={saved.includes(g.slug) ? "#bdef66" : "none"} /></button><span className="vh-ground-sample">{g.matches} MATCHES</span></div><div className="vh-ground-info"><h3><Link href={venueHref(g.name)}>{g.name}</Link></h3><div className="vh-ground-stats"><span><small>AVG 1ST INN</small><b>{num(g.first)}</b></span><span><small>CHASE WINS</small><b>{num(g.chase, 1)}%</b></span><span><small>FIELD FIRST</small><b>{num(g.field)}%</b></span></div><div className="vh-ground-actions"><Link href={venueHref(g.name)}>Open venue <ArrowRight size={12} /></Link><button aria-label={`Select ${g.name} for comparison`} onClick={() => updateUrl("venue", g.slug)} className={selected?.slug === g.slug ? "active" : ""}>{selected?.slug === g.slug ? <Check size={12} /> : <GitCompareArrows size={12} />}{selected?.slug === g.slug ? "Selected" : "Compare"}</button></div></div></article>)}</div>}
      {!venues.isLoading && !venues.isError && !filtered.length && <div className="vh-empty"><MapPin size={26} /><p>{filter === "Saved" && !saved.length ? "Save grounds with the bookmark on each stadium card." : "No grounds match this search and filter."}</p><button onClick={() => { setSearch(""); setFilter("All grounds"); }}>Reset explorer</button></div>}{filtered.length > limit && <button className="vh-load-more" onClick={() => setLimit(limit + 8)}>Explore more grounds <ArrowRight size={14} /></button>}
    </section>

    <section className="vh-comparison vh-panel" id="venue-comparison"><div className="vh-section-head"><div><span className="vh-eyebrow">SAME GAME. DIFFERENT GROUND.</span><h2>THE GROUND-TO-GROUND COMPARISON</h2></div><button onClick={() => setCompareOpen(!compareOpen)} className="vh-text-link">{compareOpen ? "Collapse" : "Expand"} <GitCompareArrows size={13} /></button></div>{compareOpen && <><div className="vh-compare-selectors"><label>GROUND A<select aria-label="Comparison ground A" value={selected?.slug ?? ""} onChange={e => updateUrl("venue", e.target.value)}>{grounds.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}</select></label><span>VS</span><label>GROUND B<select aria-label="Comparison ground B" value={compare?.slug ?? ""} onChange={e => updateUrl("compare", e.target.value)}>{grounds.filter(g => g.slug !== selected?.slug).map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}</select></label></div><div className="vh-comparison-body"><div className="vh-compare-photo"><img src={image} alt="" /><span>{selected?.name}</span>{selected && <Link href={venueHref(selected.name)}>View ground <ArrowRight size={11} /></Link>}</div><div className="vh-comparison-table">{[{ label: "Recorded matches", a: selected?.matches, b: compare?.matches, suffix: "" }, { label: "Avg first innings", a: selected?.first, b: compare?.first, suffix: "" }, { label: "Avg second innings", a: selected?.second, b: compare?.second, suffix: "" }, { label: "Chase win rate", a: selected?.chase, b: compare?.chase, suffix: "%" }, { label: "Choose to field", a: selected?.field, b: compare?.field, suffix: "%" }].map(row => <div key={row.label}><strong>{num(row.a)}{row.suffix}</strong><span>{row.label}</span><strong>{num(row.b)}{row.suffix}</strong></div>)}</div><div className="vh-compare-photo"><img src={venueImage(compare?.name) || "/venues-stadium.jpg"} alt="" /><span>{compare?.name}</span>{compare && <Link href={venueHref(compare.name)}>View ground <ArrowRight size={11} /></Link>}</div></div><p className="vh-footnote">All-season historical averages. Different sample sizes and eras affect comparisons.</p></>}</section>

    <section className="vh-connected-grid"><Link href={selected ? venueHref(selected.name) : "#venue-explorer"} className="vh-connected vh-panel"><Database size={29} /><div><span>01 / THE WAREHOUSE</span><h2>GO INSIDE THE GROUND</h2><p>Phase profiles, player records, par scores and the complete match archive.</p><b>Open venue intelligence <ArrowRight size={13} /></b></div></Link><Link href={toTactics} className="vh-connected purple vh-panel"><Swords size={29} /><div><span>02 / THE MATCH PLAN</span><h2>TURN CONDITIONS INTO TACTICS</h2><p>Carry this venue into your strategy simulator and opposition briefing.</p><b>Open Tactical Board <ArrowRight size={13} /></b></div></Link><Link href={`/ai-analyst/opposition-map?venue=${encodeURIComponent(selected?.slug ?? "")}`} className="vh-connected lime vh-panel"><Shield size={29} /><div><span>03 / THE OPPOSITION</span><h2>FIND THE MATCH-UP EDGE</h2><p>Explore bowling rotations, tested weaknesses and historical venue context.</p><b>Generate opposition brief <ArrowRight size={13} /></b></div></Link></section>
    <section className="vh-stories vh-panel"><div className="vh-section-head"><div><span className="vh-eyebrow">BEYOND THE BOUNDARY</span><h2>STORIES FROM THE GROUNDS</h2></div><Link href="/feed">Visit the newsroom <ArrowRight size={12} /></Link></div><div className="vh-story-grid">{stories.map(s => { const team = TEAM_REGISTRY[s.franchise as TeamCode]; return <Link key={s.id} href={`/dugout/articles/${s.slug}`}><div className="vh-story-image"><LibraryMedia imageId={s.id} title={s.title} accent={team.accent} code={s.franchise} teamName={team.name} aspect={s.aspect} /></div><span>{s.franchise} · VENUE INTELLIGENCE</span><h3>{s.title}</h3><small>{s.publishedDate} · {s.readMinutes} min read</small></Link>; })}</div></section>
    {notice && <div className="vh-notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={13} /></button></div>}
  </div></Layout>;
}

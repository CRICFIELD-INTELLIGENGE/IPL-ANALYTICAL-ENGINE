import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowDown, ArrowRight, Bookmark, BookOpen, Check, ChevronRight, Compass, Search, Sparkles, Swords, X } from "lucide-react";
import { Layout } from "@/components/layout";
import { EditorialCardMedia } from "@/components/dugout/editorial-image-figure";
import { getLocalEmbedImages, getPublishedArticleImages } from "@/lib/editorial-images";
import { getV2Index } from "@/lib/editorial-v2";
import { TEAM_REGISTRY, isTeamCode, type TeamCode } from "@/lib/team-context";
import { HUB_TEAMS } from "@/lib/ipl-2027";
import type { IndexEntry } from "@/data/editorial/schema";
import "./feed-storylines.css";

const TOPICS = [
  { id: "all", label: "All stories", aspects: ["future", "history", "fan-culture", "auction-economics", "scouting", "tactical"] },
  { id: "next-era", label: "The next era", aspects: ["future", "scouting"] },
  { id: "squad", label: "Building a contender", aspects: ["auction-economics", "tactical"] },
  { id: "culture", label: "Beyond the boundary", aspects: ["fan-culture"] },
  { id: "legacy", label: "History & rivalries", aspects: ["history"] },
] as const;
type Topic = (typeof TOPICS)[number]["id"];
const QUESTIONS: Record<TeamCode, string> = {
  CSK: "How does the next Chennai era take shape?", MI: "Where does an established core find a new edge?",
  RCB: "What comes after the breakthrough?", KKR: "Which parts of an identity survive change?",
  SRH: "Can fearless batting become a lasting blueprint?", RR: "How far can a young core go?",
  DC: "What makes a rebuild finally stick?", PBKS: "How does promise become repeatability?",
  GT: "Can a strong foundation keep evolving?", LSG: "What should the next chapter stand for?",
};
const TOPIC_LABEL: Record<string, string> = { future: "THE NEXT ERA", history: "HISTORY & LEGACY", "fan-culture": "THE HUMAN SIDE", "auction-economics": "BUILDING A CONTENDER", scouting: "THE NEXT GENERATION", tactical: "CHANGING THE GAME" };
const ANGLE: Record<string, string> = { future: "future", history: "history", "fan-culture": "culture", "auction-economics": "auction", scouting: "development", tactical: "tactical" };
const SAVED_KEY = "cf:storylines-reading-list:v1";
const EDITOR_PICKS = ["cf-csk-091", "cf-rcb-064", "cf-mi-031", "cf-srh-092", "cf-rr-074", "cf-kkr-055", "cf-dc-095", "cf-pbks-060", "cf-gt-024", "cf-lsg-062"];
const articleHref = (entry: IndexEntry) => `/dugout/articles/${entry.slug}`;
const intelHref = (team: TeamCode, angle = "future") => `/intelligence?franchise=${team.toLowerCase()}&angle=${angle}`;
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
function editorialOrder(a: IndexEntry, b: IndexEntry) {
  const date = b.publishedDate.localeCompare(a.publishedDate);
  if (date) return date;
  const pickA = EDITOR_PICKS.indexOf(a.id), pickB = EDITOR_PICKS.indexOf(b.id);
  if (pickA >= 0 || pickB >= 0) return (pickA < 0 ? Infinity : pickA) - (pickB < 0 ? Infinity : pickB);
  // Equal-date editions alternate franchises instead of filling the front page
  // with one team's archive simply because its code sorts first.
  const angles = TOPICS[0].aspects as readonly string[];
  return angles.indexOf(a.aspect) - angles.indexOf(b.aspect) || Number(b.featured) - Number(a.featured) || Number(a.id.slice(-3)) - Number(b.id.slice(-3)) || HUB_TEAMS.indexOf(a.franchise) - HUB_TEAMS.indexOf(b.franchise);
}
function readSaved(): string[] { try { const value = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; } }
function scrollToStories() { document.getElementById("storyline-stories")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }

export default function FeedStorylinesPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const rawTeam = params.get("team")?.toUpperCase() ?? "";
  const team = isTeamCode(rawTeam) ? rawTeam : undefined;
  const topic = TOPICS.find(item => item.id === params.get("topic")) ?? TOPICS[0];
  const query = params.get("q") || "";
  const savedOnly = params.get("saved") === "1";
  const sort = params.get("sort") === "short" ? "short" : "latest";
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [limit, setLimit] = useState(9);
  const [message, setMessage] = useState("");
  const all = useMemo(() => getV2Index().filter(entry => (TOPICS[0].aspects as readonly string[]).includes(entry.aspect)), []);
  const entries = useMemo(() => all.filter(entry => (!team || entry.franchise === team) && (topic.aspects as readonly string[]).includes(entry.aspect) && (!savedOnly || saved.includes(entry.id)) && `${entry.title} ${entry.dek} ${entry.franchise} ${entry.players.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === "short" ? a.readMinutes - b.readMinutes || editorialOrder(a, b) : editorialOrder(a, b)), [all, team, topic, savedOnly, saved, query, sort]);
  const featured = useMemo(() => all.find(entry => entry.franchise === (team ?? "CSK") && entry.aspect === "future") ?? all[0], [all, team]);
  const activeCode = team ?? featured?.franchise ?? "CSK";
  const theme = TEAM_REGISTRY[activeCode];
  const rival = TEAM_REGISTRY[theme.archRival];
  const relevantSaved = all.filter(entry => saved.includes(entry.id));
  const paths = [
    { number: "01", title: "Read the story", detail: "Understand the people, history and choices behind the question.", href: featured ? articleHref(featured) : `/dugout/${activeCode.toLowerCase()}#library`, label: "Open the editorial" },
    { number: "02", title: "Follow the evidence", detail: "Explore the franchise through the lens of future strategy.", href: intelHref(activeCode), label: "Open Intelligence" },
    { number: "03", title: "Enter the Dugout", detail: "Put the story alongside the squad, archive and franchise library.", href: `/dugout/${activeCode.toLowerCase()}#library`, label: "Visit the team Dugout" },
  ];
  useEffect(() => { setLimit(9); }, [search]);
  useEffect(() => { const sync = () => setSaved(readSaved()); window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(search);
    Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    navigate(`/feed/storylines${next.size ? `?${next}` : ""}`, { replace: true });
  }
  function toggleSave(entry: IndexEntry) {
    const next = saved.includes(entry.id) ? saved.filter(id => id !== entry.id) : [...saved, entry.id];
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); setSaved(next); setMessage(next.includes(entry.id) ? "Added to your reading list." : "Removed from your reading list."); }
    catch { setMessage("Your browser could not save this story. Please try again."); }
  }
  function exploreTopic(value: Topic) { update({ topic: value === "all" ? undefined : value, saved: undefined, q: undefined }); scrollToStories(); }
  return <Layout hideRightPanel><main className="storylines-page">
    <div className="sl-breadcrumb"><Link href="/feed">Feed</Link><ChevronRight size={12} /><span>Storylines</span><small>THE ROAD TO IPL 2027 / EDITORIAL EDITION</small></div>
    <section className="sl-cover" aria-labelledby="storylines-title">
      <img className="sl-cover-stadium" src="/venue-images/wankhede stadium.webp" alt="" />
      <div className="sl-cover-copy"><span className="sl-eyebrow"><span /> THE SEASON BEFORE THE SEASON</span><h1 id="storylines-title">THE NEXT<br /><em>CHAPTER.</em></h1><p>Before the first ball, there is a story.</p><div className="sl-cover-dek">Ten teams. Unfinished business. The ideas, identities and decisions that could shape IPL 2027.</div><div className="sl-cover-actions"><a href="#storyline-stories">Explore the stories <ArrowDown size={14} /></a><Link href={intelHref(activeCode)}>Follow the intelligence <ArrowRight size={14} /></Link></div><small>CRICFIELD EDITORIAL / HISTORY. CONTEXT. WHAT COMES NEXT.</small></div>
      <div className="sl-cover-collage" aria-label="IPL 2027 editorial cover"><div className="sl-cover-year" aria-hidden="true">2027</div><div className="sl-paper"><span>FROM THE EDITOR’S DESK</span><div className="sl-paper-rule" /><h2>A season is built<br />long before<br /><em>it begins.</em></h2><p>Who changes?<br />Who stays true?<br />Who writes the next chapter?</p><div className="sl-paper-teams">{["CSK", "MI", "RCB", "KKR", "SRH"].map(code => <img key={code} src={TEAM_REGISTRY[code as TeamCode].logoImg} alt={code} />)}<span>+5</span></div><small>10 FRANCHISES · ONE UNWRITTEN SEASON</small></div><div className="sl-cover-stamp"><Sparkles size={17} /><span>THE BUILD-UP<br /><b>STARTS HERE</b></span></div></div>
    </section>

    <div className="sl-edition-strip"><span><BookOpen size={14} /> THE STORYLINES EDITION</span><p>Read the past. Question the present. Explore what comes next.</p><button aria-pressed={savedOnly} onClick={() => update({ saved: savedOnly ? undefined : "1" })}><Bookmark size={13} /> Reading list <b>{relevantSaved.length}</b></button></div>

    <section className="sl-thread-grid" aria-label="Editorial collections">
      <button onClick={() => exploreTopic("next-era")} className="sl-thread"><span>01 / THE NEXT ERA</span><h2>New faces.<br /><em>New possibilities.</em></h2><p>Succession, scouting and the next generation.</p><ArrowRight size={19} /></button>
      <button onClick={() => exploreTopic("squad")} className="sl-thread"><span>02 / THE BUILD</span><h2>One missing piece.<br /><em>A different team.</em></h2><p>The squad choices behind a contender.</p><ArrowRight size={19} /></button>
      <button onClick={() => exploreTopic("culture")} className="sl-thread"><span>03 / THE HUMAN SIDE</span><h2>More than a badge.<br /><em>More than a game.</em></h2><p>The fans, loyalties and identities that endure.</p><ArrowRight size={19} /></button>
    </section>

    <section className="sl-franchise-selector" aria-label="Filter stories by franchise"><span>CHOOSE YOUR SIDE</span><div><button aria-pressed={!team} onClick={() => update({ team: undefined })}>ALL TEAMS</button>{HUB_TEAMS.map(code => <button key={code} style={{ "--sl-team": TEAM_REGISTRY[code].accent } as CSSProperties} aria-pressed={team === code} onClick={() => update({ team: code })}><img src={TEAM_REGISTRY[code].logoImg} alt="" />{code}</button>)}</div></section>

    <div className="sl-editorial-grid"><div className="sl-main-column">
      {featured && <section className="sl-lead sl-panel"><div className="sl-section-heading"><span>THE BIG QUESTION</span><span>{activeCode} / IPL 2027</span></div><div className="sl-lead-body"><Link href={articleHref(featured)} className="sl-lead-image" aria-label={`Read ${featured.title}`}><StoryMedia entry={featured} /></Link><div className="sl-lead-copy"><span className="sl-eyebrow" style={{ color: theme.accent }}>{theme.name}</span><h2>{QUESTIONS[activeCode]}</h2><p>{featured.dek}</p><div className="sl-byline">{dateLabel(featured.publishedDate)} · {featured.readMinutes} min read {featured.status !== "published" && <span>Editorial preview</span>}</div><Link href={articleHref(featured)}>Read the feature <ArrowRight size={14} /></Link><Link href={intelHref(activeCode, ANGLE[featured.aspect])} className="sl-evidence-link">Explore the intelligence behind it <ChevronRight size={13} /></Link></div></div></section>}

      <section className="sl-story-section" id="storyline-stories" aria-labelledby="sl-stories-title"><div className="sl-story-heading"><div><span className="sl-eyebrow">THE READING ROOM</span><h2 id="sl-stories-title">Stories with <em>something at stake.</em></h2></div><span aria-live="polite">{entries.length} {entries.length === 1 ? "story" : "stories"}{team ? ` / ${team}` : " / all teams"}</span></div>
        <div className="sl-story-controls"><div className="sl-topic-tabs" aria-label="Story topics">{TOPICS.map(item => <button key={item.id} aria-pressed={topic.id === item.id} onClick={() => update({ topic: item.id === "all" ? undefined : item.id })}>{item.label}</button>)}</div><div className="sl-search-row"><label><Search size={14} /><input aria-label="Search storylines" placeholder="Search a story, player or idea…" value={query} onChange={event => update({ q: event.target.value || undefined })} />{query && <button onClick={() => update({ q: undefined })} aria-label="Clear story search"><X size={13} /></button>}</label><select aria-label="Sort stories" value={sort} onChange={event => update({ sort: event.target.value === "latest" ? undefined : "short" })}><option value="latest">Editor’s selection</option><option value="short">Quick reads first</option></select></div>{savedOnly && <div className="sl-saved-indicator"><Bookmark size={12} /> Your saved stories<button onClick={() => update({ saved: undefined })}>Show all stories <X size={12} /></button></div>}</div>
        {entries.length ? <><div className="sl-story-grid">{entries.slice(0, limit).map(entry => <StoryCard key={entry.id} entry={entry} saved={saved.includes(entry.id)} onSave={() => toggleSave(entry)} />)}</div>{limit < entries.length && <button className="sl-load-more" onClick={() => setLimit(value => value + 9)}>More stories <ArrowDown size={14} /><small>{Math.min(limit, entries.length)} of {entries.length}</small></button>}</> : <div className="sl-empty"><BookOpen size={25} /><h3>{savedOnly ? "Your next read is waiting." : "No stories match this selection."}</h3><p>{savedOnly ? "Save a story using its bookmark, or broaden your filters to see your reading list." : "Try another team, topic or search."}</p><button onClick={() => update({ q: undefined, saved: undefined, topic: undefined, team: undefined })}>Explore all stories <ArrowRight size={14} /></button></div>}
      </section>
    </div><aside className="sl-side-column">
      <section className="sl-route-panel sl-panel"><div className="sl-section-heading"><span><Compass size={13} /> GO BEYOND THE HEADLINE</span><span>{activeCode}</span></div><h2>A story is the start.<br /><em>Follow the thread.</em></h2>{paths.map(item => <Link href={item.href} key={item.number}><span>{item.number}</span><div><h3>{item.title}</h3><p>{item.detail}</p><b>{item.label} <ArrowRight size={12} /></b></div></Link>)}</section>
      <section className="sl-rivalry sl-panel"><span className="sl-eyebrow">THE RIVALRY FILE</span><div className="sl-rivalry-logos"><img src={theme.logoImg} alt={activeCode} /><Swords size={24} /><img src={rival.logoImg} alt={rival.id} /></div><h2>Some fixtures carry<br /><em>more than a score.</em></h2><p>Explore the identities and decisions behind {activeCode}–{rival.id}. Then build your own match plan.</p><Link href={intelHref(activeCode, "history")}>Read the franchise history <ArrowRight size={13} /></Link><Link href={`/feed/tactics?team=${activeCode}&opp=${rival.id}`}>Take it to the Tactical Board <ArrowRight size={13} /></Link></section>
      <section className="sl-saved-panel sl-panel"><div className="sl-section-heading"><span><Bookmark size={13} /> YOUR READING LIST</span><b>{relevantSaved.length}</b></div>{relevantSaved.length ? <>{relevantSaved.slice(-3).reverse().map(entry => <Link key={entry.id} href={articleHref(entry)}><small>{entry.franchise} · {entry.readMinutes} MIN</small><h3>{entry.title}</h3></Link>)}<button onClick={() => { update({ saved: "1", team: undefined, topic: undefined, q: undefined }); scrollToStories(); }}>Open your reading list <ArrowRight size={13} /></button></> : <><BookOpen size={28} /><p>Keep the stories you want to come back to. Your reading list stays in this browser.</p></>}</section>
      <Link href="/feed/auction" className="sl-next-stop"><span>THE NEXT DECISION</span><h2>From a storyline<br />to a squad plan.</h2><p>Explore the Auction War Room.</p><ArrowRight size={20} /></Link>
    </aside></div>

    <section className="sl-ten-questions" aria-labelledby="sl-questions-title"><div className="sl-story-heading"><div><span className="sl-eyebrow">THE FRANCHISE NOTEBOOK</span><h2 id="sl-questions-title">Ten teams. <em>Ten open questions.</em></h2></div><span>EDITORIAL QUESTIONS / IPL 2027</span></div><div className="sl-question-grid">{HUB_TEAMS.map((code, index) => <article key={code} style={{ "--sl-team": TEAM_REGISTRY[code].accent } as CSSProperties}><div><span>{String(index + 1).padStart(2, "0")}</span><img src={TEAM_REGISTRY[code].logoImg} alt={TEAM_REGISTRY[code].name} /><b>{code}</b></div><h3>{QUESTIONS[code]}</h3><footer><Link href={intelHref(code)}>Intelligence <ArrowRight size={12} /></Link><Link href={`/dugout/${code.toLowerCase()}#library`}>Dugout <ArrowRight size={12} /></Link></footer></article>)}</div></section>
    <footer className="sl-page-footer"><div><span className="sl-eyebrow">THE SEASON IS STILL BEING WRITTEN.</span><p>Analysis draws on recorded IPL seasons. The 2027 questions explore possibilities, rather than confirmed squad or auction developments.</p></div><Link href="/pulse">Follow developments on Pulse <ArrowRight size={14} /></Link></footer>
    <div className="sl-announcement" role="status" aria-live="polite">{message && <><Check size={15} /><span>{message}</span><button aria-label="Dismiss reading list message" onClick={() => setMessage("")}><X size={14} /></button></>}</div>
  </main></Layout>;
}

function StoryCard({ entry, saved, onSave }: { entry: IndexEntry; saved: boolean; onSave: () => void }) {
  const theme = TEAM_REGISTRY[entry.franchise];
  return <article className="sl-story-card" style={{ "--sl-team": theme.accent } as CSSProperties}><div className="sl-card-media"><Link href={articleHref(entry)} aria-label={`Read ${entry.title}`}><StoryMedia entry={entry} /></Link><button aria-label={`${saved ? "Remove" : "Save"} ${entry.title}${saved ? " from reading list" : " to reading list"}`} aria-pressed={saved} onClick={onSave}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /></button><span>{entry.franchise}</span></div><div className="sl-card-copy"><span>{TOPIC_LABEL[entry.aspect]}</span><Link href={articleHref(entry)}><h3>{entry.title}</h3></Link><p>{entry.dek}</p><div className="sl-byline">{dateLabel(entry.publishedDate)} · {entry.readMinutes} min read{entry.status !== "published" && <span>Preview</span>}</div><Link className="sl-card-intel" href={intelHref(entry.franchise, ANGLE[entry.aspect])}>Follow the evidence <ArrowRight size={12} /></Link></div></article>;
}

function StoryMedia({ entry }: { entry: IndexEntry }) {
  const theme = TEAM_REGISTRY[entry.franchise];
  const image = getPublishedArticleImages(entry.id).hero ?? (import.meta.env.DEV ? getLocalEmbedImages(entry.id).hero : undefined);
  const words: Record<string, [string, string]> = { future: ["THE NEXT", "ERA."], history: ["THE LONG", "GAME."], "fan-culture": ["MORE THAN", "CRICKET."], "auction-economics": ["THE", "BUILD."], scouting: ["NEXT", "IN LINE."], tactical: ["GAME", "CHANGERS."] };
  const label = words[entry.aspect] ?? words.future;
  const artwork = <div className="sl-story-art" style={{ "--sl-team": theme.accent } as CSSProperties} aria-label={`${TOPIC_LABEL[entry.aspect]} editorial cover for ${theme.name}`}><div className="sl-art-orbit" /><span className="sl-art-edition">CRICFIELD / THE STORYLINES EDITION</span><div className="sl-art-words">{label[0]}<br /><em>{label[1]}</em></div><img src={theme.logoImg} alt="" /><span className="sl-art-caption">{entry.franchise} · {TOPIC_LABEL[entry.aspect]}</span></div>;
  return image ? <EditorialCardMedia image={image} allowUnpublished={import.meta.env.DEV} fallback={artwork} /> : artwork;
}

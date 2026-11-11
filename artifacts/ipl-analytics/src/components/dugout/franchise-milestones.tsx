import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Flag, Trophy } from "lucide-react";
import { buildFranchiseMilestones, type MilestoneKind } from "@/lib/franchise-milestones";
import { type MatchSummary } from "@/lib/aggregates";
import type { FranchiseRecord } from "@/lib/dugout-api";
import type { TeamTheme } from "@/lib/team-context";
import { milestonePhotography } from "@/lib/milestone-photography";
import { MilestonePhotoGallery } from "./milestone-photo";
import "./franchise-milestones.css";

const FILTERS = [{ id: "all", label: "All milestones" }, { id: "honours", label: "Titles & finals" }, { id: "record", label: "Records" }, { id: "first", label: "First chapters" }] as const;
type Filter = (typeof FILTERS)[number]["id"];


export function FranchiseMilestones({ team, record, matches, loading, onSeason }: {
  team: TeamTheme; record?: FranchiseRecord; matches: MatchSummary[]; loading: boolean; onSeason: (season: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const moments = useMemo(() => buildFranchiseMilestones(team.id, record, matches), [team.id, record, matches]);
  const visible = moments.filter(m => filter === "all" || filter === "honours" && (m.kind === "champion" || m.kind === "finalist") || filter === m.kind);
  const firstTitle = visible.findIndex(m => m.kind === "champion");
  const initial = firstTitle >= 0 ? firstTitle : visible.findIndex(m => m.kind === "finalist");
  const selectedIndex = Math.max(0, visible.findIndex(m => m.id === selectedId) >= 0 ? visible.findIndex(m => m.id === selectedId) : initial >= 0 ? initial : 0);
  const moment = visible[selectedIndex];
  const photographs = useMemo(() => milestonePhotography(team, moments), [team, moments]);
  const photo = moment ? photographs.get(moment.id) : undefined;
  const choose = (index: number, focus = false) => {
    if (!visible.length) return;
    const next = Math.max(0, Math.min(visible.length - 1, index));
    setSelectedId(visible[next].id);
    if (focus) tabRefs.current[next]?.focus();
  };
  const rgb = team.accent.replace("#", "").match(/.{2}/g)?.map(v => parseInt(v, 16) / 255) ?? [0, 0, 0];
  const [red, green, blue] = rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  const style = { "--fm-accent": team.accent, "--fm-secondary": team.secondary, "--fm-on-accent": .2126 * red + .7152 * green + .0722 * blue > .179 ? "#142029" : "#ffffff" } as CSSProperties;
  return <section className="franchise-milestones" id="milestones" style={style} aria-label={`${team.shortName} milestones`}>
    <header className="fm-header"><div><span>THE MOMENTS THAT MADE US</span><h2>{team.shortName} <em>MILESTONES</em></h2></div><div className="fm-header-identity"><img src={team.logoImg} alt="" /><span>{team.name}<small>One franchise. Its own story.</small></span></div></header>
    <div className="fm-toolbar"><div aria-label="Milestone categories" className="fm-filters">{FILTERS.map(f => <button key={f.id} aria-pressed={filter === f.id} className={filter === f.id ? "active" : ""} onClick={() => { setFilter(f.id); setSelectedId(""); }}>{f.label}</button>)}</div><span>{moments.length} recorded moments</span></div>
    {loading && !moments.length ? <div className="fm-loading" aria-busy="true" aria-label="Loading franchise milestones"><div /><div /></div> : !moment ? <div className="fm-empty"><Flag size={28} /><h3>{filter === "honours" ? "The next chapter is still to be written." : "No recorded moments in this category yet."}</h3><p>{filter === "honours" ? "No championship or final appearance is recorded for this franchise in the available seasons. Explore its records and first chapters." : "Milestones will appear as the franchise archive becomes available."}</p><button onClick={() => setFilter("all")}>Explore all milestones <ArrowRight size={14} /></button></div> : <>
      <div className="fm-feature" role="tabpanel" id={`milestone-panel-${team.id}`} aria-labelledby={`milestone-tab-${team.id}-${moment.id}`}>
        <div className="fm-top-rule"><span className="fm-year-badge">{moment.season ?? "LEGACY"}<i /><i /></span><div /><span>{String(selectedIndex + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</span></div>
        <div className="fm-feature-body" key={moment.id}><div className="fm-copy"><span className="fm-kicker"><KindIcon kind={moment.kind} />{moment.label}</span><div className={`fm-value ${moment.value.length > 6 ? "long" : ""}`}>{moment.value}</div><h3>{moment.title}</h3><div className="fm-copy-divider" /><p>{moment.description}</p><div className="fm-stats">{moment.stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div><div className="fm-actions">{moment.match && <Link href={`/match/${moment.match.id}`}>Open match archive <ArrowRight size={14} /></Link>}{moment.season && <button onClick={() => { onSeason(moment.season!); document.getElementById("squad")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Explore {moment.season} squad <ArrowRight size={14} /></button>}</div></div>
          <MilestonePhotoGallery key={`${team.id}-${moment.id}`} frames={photo ?? []} moment={moment} team={team} />
        </div>
      </div>
      <footer className="fm-controls"><p aria-live="polite" aria-atomic="true">{moment.title}<small>{team.shortName} · {selectedIndex + 1} of {visible.length}</small></p><div><button aria-label="Previous milestone" disabled={selectedIndex === 0} onClick={() => choose(selectedIndex - 1)}><ArrowLeft size={19} /></button><button aria-label="Next milestone" disabled={selectedIndex === visible.length - 1} onClick={() => choose(selectedIndex + 1)}><ArrowRight size={19} /></button></div></footer>
      <div className="fm-moment-list" role="tablist" aria-label={`${team.shortName} recorded milestones`} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); choose(event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : selectedIndex + (event.key === "ArrowRight" ? 1 : -1), true); } }}>{visible.map((m, index) => <button ref={el => { tabRefs.current[index] = el; }} key={m.id} role="tab" id={`milestone-tab-${team.id}-${m.id}`} aria-controls={`milestone-panel-${team.id}`} aria-selected={index === selectedIndex} tabIndex={index === selectedIndex ? 0 : -1} onClick={() => choose(index)} className={index === selectedIndex ? "selected" : ""}><KindIcon kind={m.kind} /><strong>{m.value}</strong><span>{m.title}</span></button>)}</div>
    </>}
    <div className="fm-source-note">From CricField’s recorded IPL seasons and match archive. Milestone figures reflect the available data.<a href="#history">Explore the full season timeline <ArrowRight size={12} /></a></div>
  </section>;
}

function KindIcon({ kind }: { kind: MilestoneKind }) { return kind === "champion" || kind === "finalist" ? <Trophy size={13} aria-hidden="true" /> : <Flag size={13} aria-hidden="true" />; }

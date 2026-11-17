import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Search, Users, Wallet, ArrowLeftRight } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { TEAM_REGISTRY, type TeamCode } from "@/lib/team-context";
import { formatPurse, roleLabel, type OfficialRoom, type RetentionSource } from "@/lib/retention-official-api";
import "./official.css";
import type { TeamPicks } from "@/lib/retention-api";

export function SourceLinks({sources}:{sources:RetentionSource[]}) {
  return <ul className="ret-source-links">{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher} ↗</a><span>{s.official ? "Primary source" : "Report"} · {s.publishedOn}</span></li>)}</ul>;
}
export function OfficialStage({data,team,onBoard,onNeeds}:{data:OfficialRoom;team:TeamCode;onBoard:(decision?:string,group?:string)=>void;onNeeds:()=>void}) {
  const theme=TEAM_REGISTRY[team], s=data.summary;
  const retained=data.players.filter(p=>["retained","traded_in"].includes(p.decision));
  const next=data.needs.find(n=>n.priority==="high") ?? data.needs[0];
  return <section className="ret-stage" aria-label={`${team} retention overview`}>
    <div className="ret-stage-heading">
      <img src={theme.logoImg} alt={theme.name} className="ret-franchise-logo" />
      <div><p className="ret-eyebrow">IPL {data.season} · Post-retention / Pre-auction</p><h2>{theme.name}</h2><p>{s.retained} players in the current group · {s.tradedIn} traded in · {s.tradedOut} traded out</p></div>
      <Link className="ret-link" href={`/dugout/${team.toLowerCase()}`}>Team Dugout <ArrowRight size={14}/></Link>
    </div>
    <div className="ret-metrics">
      <div><Users size={16}/><span>Retained squad</span><strong>{s.retained}</strong><small>Includes {s.tradedIn} incoming trades</small></div>
      <div><ArrowLeftRight size={16}/><span>Released</span><strong>{s.released}</strong><small>Excludes outgoing trades</small></div>
      <div><Wallet size={16}/><span>Purse remaining</span><strong>{formatPurse(data.purse.valueLakh)}</strong><small>{data.purse.status === "conflict" ? "Conflicting source reports" : `${data.purse.status} amount`}</small></div>
      <div><ShieldCheck size={16}/><span>Slots available</span><strong>{s.slots}<em>/ 25</em></strong><small>{s.overseasSlots ?? "?"} overseas · reported limits</small></div>
    </div>
    <div className="ret-pods">
      <article><div className="ret-pod-top"><span>01 / THE DECISIONS</span><ShieldCheck size={18}/></div><h3>Official Retentions</h3><p>Who stays, who leaves, and the source behind every decision.</p><div className="ret-avatar-strip">{retained.slice(0,4).map(p=><PlayerAvatar key={p.id} name={p.name} teamId={team} className="w-11 h-11 rounded-full" disableHover/>)}</div><button className="ret-action" onClick={()=>onBoard("squad")}>View Retained Squad <ArrowRight size={15}/></button></article>
      <article><div className="ret-pod-top"><span>02 / THE BALANCE</span><Users size={18}/></div><h3>Squad Impact</h3><p>{s.indian} Indian · {s.overseas} overseas{s.unknownNationality ? ` · ${s.unknownNationality} nationality pending` : ""}. See how the remaining roles fit together.</p><div className="ret-role-bars" aria-hidden="true">{data.composition.filter(g=>g.count>0).map(g=><span key={g.key} style={{flex:g.count}}/>)}</div><button className="ret-action" onClick={onNeeds}>Explore Squad Gaps <ArrowRight size={15}/></button></article>
      <article><div className="ret-pod-top"><span>03 / THE NEXT MOVE</span><Search size={18}/></div><h3>Replacement Intelligence</h3><p>{next ? `${roleLabel(next.role)} · ${next.departures} departures to review against ${next.remaining} remaining options.` : "Explore the existing Scout Lab with this franchise selected."}</p><p className="ret-small">CricField inference · based on recorded departures</p><Link className="ret-action" href={next?.scoutUrl ?? `/scout?team=${team.toLowerCase()}`}>Find Replacements <ArrowRight size={15}/></Link></article>
    </div>
    <p className="ret-coverage"><ShieldCheck size={14}/>{s.verifiedDecisions} of {data.players.length} decisions verified with primary sources. {data.status === "partial" ? "Remaining records are labelled Reported." : "Decision coverage verified."}</p>
  </section>;
}
export function OfficialSquad({data,onGroup}:{data:OfficialRoom;onGroup:(group:string)=>void}) {
  return <section className="ret-panel" aria-labelledby="official-squad-title"><div className="ret-section-heading"><div><p className="ret-eyebrow">THE CURRENT GROUP</p><h2 id="official-squad-title">Squad Board</h2></div><span className="ret-small">Click a role to explore the squad</span></div>
    <div className="ret-composition">{data.composition.filter(g=>g.count>0 || ["batter","wicketkeeper","all-rounder","pace","spin"].includes(g.key)).map(g=><button key={g.key} onClick={()=>onGroup(g.key)}><strong>{g.count}</strong><span>{roleLabel(g.key)}</span><ArrowRight size={14}/></button>)}</div>
    <p className="ret-small">Role classifications reuse CricField's player records. {data.summary.slotBasis}</p>
  </section>;
}
export function OfficialNeeds({data}:{data:OfficialRoom}) {
  return <section className="ret-panel" id="retention-needs" tabIndex={-1}><div className="ret-section-heading"><div><p className="ret-eyebrow">CRICFIELD INFERRED NEEDS</p><h2>What the squad needs next</h2></div><Search size={20}/></div><p className="ret-small">Roster coverage signals, not franchise announcements or a guaranteed best XI. Reported departures remain provisional.</p>
    <div className="ret-needs">{data.needs.map(n=><article key={n.role}><h3>{roleLabel(n.role)} <span>{n.priority === "high" ? "No remaining option" : "Review depth"}</span></h3><p>{n.note}</p><p className="ret-small">Departures · {n.evidence.map(e=>`${e.name}${e.verification==="reported"?" (reported)":""}`).join(", ")}</p><Link className="ret-link" href={n.scoutUrl}>Scout this role <ArrowRight size={14}/></Link></article>)}</div>
    {!data.needs.length && <p>No departure-driven gaps are recorded.</p>}
  </section>;
}
export function OfficialProvenance({data}:{data:OfficialRoom}) {
  return <details className="ret-panel ret-provenance"><summary>Sources, financial reconciliation and verification notes</summary><p className="ret-small">Reviewed {new Date(data.reviewedAt).toLocaleString("en-GB")} · {data.version}</p>
    <h3>Purse evidence</h3><ul className="ret-purse-claims">{data.purse.claims.map((c,i)=><li key={i}><strong>{formatPurse(c.valueLakh)}</strong><a href={c.source.url} target="_blank" rel="noreferrer">{c.source.publisher} ↗</a><span>{c.source.official ? "Primary" : "Reported"}</span></li>)}</ul>
    <p className="ret-small">{data.purse.hasDisagreement ? data.purse.status==="verified" ? "The primary source takes precedence. Conflicting reports remain visible for review." : "Conflicting values are withheld from the summary and auction calculations." : "Reported purse values are displayed with their status and excluded from official auction initialization."} Contracts without a current source remain unverified. Historical contracts do not reconcile the new purse.</p>
    <ul className="ret-notes">{data.notes.map(n=><li key={n}>{n}</li>)}</ul><SourceLinks sources={data.sources}/>
  </details>;
}

export function OfficialDecisionReview({data,picks}:{data:OfficialRoom;picks?:TeamPicks}) {
  const assessments=new Map(picks?.rows.map(p=>[p.id,p])??[]);
  const departures=data.players.filter(p=>p.decision==="released").sort((a,b)=>(b.performance?.projection?.rar??-Infinity)-(a.performance?.projection?.rar??-Infinity)).slice(0,3);
  return <section className="ret-panel"><div className="ret-section-heading"><div><p className="ret-eyebrow">THE DECISIONS WORTH EXAMINING</p><h2>Retention Dilemmas</h2></div><Link className="ret-link" href={`/arcade/auction-room?season=2027&team=${data.team}`}>Auction readiness <ArrowRight size={14}/></Link></div>
    <p className="ret-small">Released players with the strongest linked projections. This is a retrospective review, not a claim that CricField predicted the decisions.</p>
    <div className="ret-needs">{departures.map(p=>{const a=assessments.get(p.id);return <article key={p.id}><h3>{p.name}<span>{p.verification==="verified"?"Verified release":"Reported release"}</span></h3><p>{a?.editorial?.rationale??a?.reason??"Review the role lost against the remaining squad and the available replacement pool."}</p><p className="ret-small">{p.performance?.projection ? `Existing projection ${p.performance.projection.rar.toFixed(2)} RAR per match · IPL ${p.performance.projection.seasonsUsed.join(" / ")}.` : "Insufficient IPL evidence for a projection."} {p.availability.note}</p><Link className="ret-link" href={p.scoutUrl}>Explore replacement options <ArrowRight size={14}/></Link></article>;})}</div>
  </section>;
}

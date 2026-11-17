import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, ArrowRight, ChevronDown } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { fetchOfficialComparison, decisionLabel, roleLabel, formatPurse, type OfficialRoom, type OfficialPlayer } from "@/lib/retention-official-api";
import type { TeamPicks } from "@/lib/retention-api";
import { SourceLinks } from "./official-overview";

export interface BoardFilters {decision:string;group:string}
export function OfficialBoard({data,picks,filters,setFilters}:{data:OfficialRoom;picks?:TeamPicks;filters:BoardFilters;setFilters:(filters:BoardFilters)=>void}) {
  const [search,setSearch]=useState(""),[nationality,setNationality]=useState("all"),[sort,setSort]=useState("name"),[expanded,setExpanded]=useState<string|null>(null);
  const rows=useMemo(()=>data.players.filter(p=>{
    const matchDecision=filters.decision==="all" || filters.decision==="squad" && ["retained","traded_in"].includes(p.decision) || p.decision===filters.decision;
    return matchDecision && (filters.group==="all" || filters.group==="bowlers" && ["pace","spin","bowler"].includes(p.group) || p.group===filters.group) && (nationality==="all" || nationality==="indian" && p.overseas===false || nationality==="overseas" && p.overseas===true) && p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  }).sort((a,b)=>sort==="contract" ? (b.contractLakh??-1)-(a.contractLakh??-1)||a.name.localeCompare(b.name) : sort==="decision" ? a.decision.localeCompare(b.decision)||a.name.localeCompare(b.name) : a.name.localeCompare(b.name)),[data,filters,nationality,search,sort]);
  const assessments=new Map(picks?.rows.map(p=>[p.id,p]) ?? []);
  return <section className="ret-panel" aria-labelledby="official-board-title">
    <div className="ret-section-heading"><div><p className="ret-eyebrow">THE RETENTION LEDGER</p><h2 id="official-board-title">Official Retention Board</h2></div><span className="ret-small" role="status">{rows.length} of {data.players.length} records</span></div>
    <p className="ret-small">Franchise decisions and CricField assessments are separate. A Reported badge means primary verification is pending.</p>
    <div className="ret-filters"><label className="ret-search"><Search size={16}/><input aria-label="Search retained and released players" type="search" placeholder="Search players…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label>Nationality<select value={nationality} onChange={e=>setNationality(e.target.value)}><option value="all">All players</option><option value="indian">Indian</option><option value="overseas">Overseas</option></select></label>
      <label>Role<select value={filters.group} onChange={e=>setFilters({...filters,group:e.target.value})}><option value="all">All roles</option>{["batter","wicketkeeper","all-rounder","bowlers","pace","spin","unknown"].map(g=><option key={g} value={g}>{g==="bowlers"?"All bowlers":roleLabel(g)}</option>)}</select></label>
      <label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Player name</option><option value="contract">Verified contract ↓</option><option value="decision">Official decision</option></select></label>
    </div>
    <div className="ret-status-filters" aria-label="Decision filters">{[["all","All"],["squad","Current squad"],["retained","Retained"],["released","Released"],["traded_in","Traded in"],["traded_out","Traded out"]].map(([id,label])=><button key={id} aria-pressed={filters.decision===id} onClick={()=>setFilters({...filters,decision:id})}>{label}</button>)}<button onClick={()=>{setFilters({decision:"all",group:"all"});setNationality("all");setSearch("");setSort("name");}}>Reset filters</button></div>
    <div className="ret-table-scroll"><table className="ret-official-table"><caption className="sr-only">IPL {data.season} {data.team} decisions, evidence and current assessments</caption><thead><tr><th scope="col">Player / role</th><th scope="col">Official decision</th><th scope="col">Contract</th><th scope="col">Recent IPL evidence</th><th scope="col">CricField assessment</th><th scope="col">Details</th></tr></thead><tbody>{rows.map(p=>{
      const a=assessments.get(p.id), open=expanded===p.id;
      const latest=p.performance?.seasons.slice().sort((a,b)=>a.season-b.season).at(-1);
      return <Fragment key={p.id}><tr><td><div className="ret-player-cell"><PlayerAvatar name={p.name} teamId={data.team} className="w-10 h-10 rounded-full shrink-0" disableHover/><div><strong>{p.name}</strong><span>{roleLabel(p.group)} · {p.country ?? "Country pending"}</span><small>{p.overseas===null ? "Nationality unverified" : p.overseas ? "Overseas" : "Indian"}</small></div></div></td>
        <td><span className={`ret-decision ret-${p.decision}`}>{decisionLabel(p.decision)}</span><small className={p.verification==="verified"?"ret-verified":"ret-reported"}>{p.verification==="verified" ? "✓ Primary verified" : "Reported"}</small></td>
        <td><strong>{p.contractLakh===null?"Unverified":formatPurse(p.contractLakh)}</strong><small>{p.contractLakh!==null?"2027 · official trade fee":p.historicalContractLakh!==null?`Prior record ${formatPurse(p.historicalContractLakh)}`:"No contract on file"}</small></td>
        <td>{latest?<><strong>{latest.matches} matches · {latest.season}</strong><small>Bat RAA/m {latest.batPerMatch.toFixed(2)} · Bowl {latest.bowlPerMatch.toFixed(2)}</small></>:<span className="ret-small">Insufficient evidence</span>}</td>
        <td>{a?<><strong className="ret-assessment">{a.editorial?.category ?? a.category}</strong><small>Current CricField assessment</small></>:<span className="ret-small">Assessment unavailable</span>}</td>
        <td><button aria-label={`Details for ${p.name}`} aria-expanded={open} onClick={()=>setExpanded(open?null:p.id)} className="ret-detail-button"><ChevronDown size={17}/></button></td></tr>
        {open&&<tr><td colSpan={6}><PlayerEvidence player={p} assessment={a?.editorial?.rationale??a?.reason}/></td></tr>}</Fragment>;
    })}</tbody></table></div>
    {!rows.length&&<div className="ret-empty" role="status">No players match these filters. Reset the filters to see all decisions.</div>}
    <p className="ret-small ret-table-note">RAA/m is the existing model's runs above average per match. New-season contracts require a current source. Historical assessments are not scored as published predictions without an intact freeze.</p>
  </section>;
}
function PlayerEvidence({player:p,assessment}:{player:OfficialPlayer;assessment?:string}) {
  return <div className="ret-player-evidence"><div><h3>{p.name} · Decision evidence</h3><p>{p.trade?`Traded from ${p.trade.from} to ${p.trade.to}. `:""}Recorded announcement {p.announcedOn}.</p><SourceLinks sources={p.sources}/><p className="ret-small">{p.canonicalId ? `Player identity ${p.canonicalId}` : "Canonical identity unresolved. Statistics are withheld."}</p></div><div><h3>Availability & assessment</h3><p>{p.availability.note} <span className="ret-small">({p.availability.verification})</span></p>{p.availability.sources.length>0&&<SourceLinks sources={p.availability.sources}/>}<p>{assessment??"No CricField assessment is available for this player in the franchise snapshot."}</p><p className="ret-small">{p.performance?`IPL evidence through ${p.performance.dataCutoff}. Model ${p.performance.modelVersion}.`:"No verified IPL evidence is linked."} Auction registration {p.auctionEligibility}.</p><div className="ret-evidence-actions">{["released","traded_out"].includes(p.decision)&&<Link className="ret-link" href={p.scoutUrl}>Scout a replacement <ArrowRight size={14}/></Link>}{p.canonicalId&&<Link className="ret-link" href={`/players/${encodeURIComponent(p.canonicalId)}`}>Player intelligence <ArrowRight size={14}/></Link>}</div></div></div>;
}
export function PredictionReality({team}:{team:string}) {
  const q=useQuery({queryKey:["retention-official-comparison",2027,team],queryFn:()=>fetchOfficialComparison(2027,team),staleTime:300_000,retry:false});
  if(q.isPending)return <div className="ret-panel ret-skeleton" role="status">Loading immutable prediction history…</div>;
  if(q.isError)return <div className="ret-panel" role="alert"><p>Prediction history could not be loaded.</p><button className="ret-action" onClick={()=>void q.refetch()}>Retry history</button></div>;
  const d=q.data;
  return <section className="ret-panel"><div className="ret-section-heading"><div><p className="ret-eyebrow">PUBLISHED CALLS, HONESTLY SCORED</p><h2>Prediction vs Reality</h2></div><strong>{d.accuracy===null?"Not scored":`${d.accuracy}% accuracy`}</strong></div><p>{d.note}</p>{d.frozenAt&&<p className="ret-small">Prediction frozen {new Date(d.frozenAt).toLocaleString("en-GB")} · {d.scored} eligible decisions</p>}
    <div className="ret-composition">{[["correct_retain","Correct retains"],["correct_release","Correct releases"],["disagreement","Disagreements"],["unverified","Unverified"],["unscored","Unscored"]].map(([key,label])=><div key={key}><strong>{d.counts[key]??0}</strong><span>{label}</span></div>)}</div>
    {d.eligible&&<div className="ret-table-scroll"><table className="ret-official-table"><thead><tr><th>Player</th><th>Frozen call</th><th>Decision</th><th>Result</th></tr></thead><tbody>{d.rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.prediction??"No binary call"}</td><td>{decisionLabel(r.decision)}</td><td>{r.status.replaceAll("_"," ")}</td></tr>)}</tbody></table></div>}
  </section>;
}

import {buildGettyEditorialUrl} from '@/lib/getty-editorial-search';
import {useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,Trophy,Flag} from 'lucide-react';
import {PUBLIC_MANIFEST,isPublishable,isLocalPreviewable} from '@/lib/editorial-images';
import {EditorialImageFigure} from './dugout/editorial-image-figure';
import './dugout/franchise-milestones.css';
type Season={season:string;runs?:number;wickets?:number};
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
export function PlayerCareerMilestones({name,aliases=[],seasons,batting,accent,history=[],captaincy,matches=[]}:{name:string;aliases?:string[];seasons:Season[];batting:boolean;accent?:string;history?:{season:string;team:string;priceDisplay?:string|null}[];captaincy?:{firstSeason?:number|null;titles?:number|null}|null;matches?:{matchId:string;date:string;season:string;team:string;vsTeam:string;venue:string;result:string;batting?:{runs:number;balls:number;notOut?:boolean}|null;bowling?:{wickets:number;runs?:number}|null}[]}){
 const [selected,setSelected]=useState(0);
 const valid=seasons.filter(s=>Number.isFinite(Number(s.season))&&Number.isFinite(batting?s.runs:s.wickets));
 const best=[...valid].sort((a,b)=>(batting?b.runs!-a.runs!:b.wickets!-a.wickets!))[0];
 const first=[...valid].sort((a,b)=>Number(a.season)-Number(b.season))[0];
 const moments: {id:string;season:string;value:string;title:string;label:string;description:string;date?:string;matchId?:string;opponent?:string;venue?:string}[]=[...(first?[{id:'first',season:first.season,value:first.season,title:'The first recorded season',label:'THE FIRST CHAPTER',description:`${name}’s earliest IPL season in the available ${batting?'batting':'bowling'} archive.`}]:[]),...(best?[{id:'best',season:best.season,value:String(batting?best.runs:best.wickets),title:`Most ${batting?'runs':'wickets'} in a recorded season`,label:'A CAREER LANDMARK',description:`${batting?best.runs:best.wickets} ${batting?'runs':'wickets'} in ${best.season}. A season aggregate, not a single-match performance.`}]:[])];

 let cumulative=0;const crossed=new Set<number>();
 for(const row of [...valid].sort((a,b)=>Number(a.season)-Number(b.season))){
  cumulative+=Number(batting?row.runs:row.wickets);
  for(const threshold of batting?[1000,3000,5000,7000]:[100,150,200])if(cumulative>=threshold&&!crossed.has(threshold)){
   crossed.add(threshold);moments.push({id:`aggregate-${threshold}`,season:row.season,value:String(threshold),title:`${threshold.toLocaleString()} career ${batting?'runs':'wickets'} reached`,label:'CAREER AGGREGATES',description:`The available season totals reach this threshold by the end of ${row.season}. Exact crossing match is not established by season aggregates.`});
  }
 }
 const years=[...new Set(valid.map(r=>r.season))].sort();
 for(const threshold of [10,15,18])if(years.length>=threshold)moments.push({id:`longevity-${threshold}`,season:years[threshold-1],value:String(threshold),title:`${threshold} recorded IPL seasons`,label:'LONGEVITY',description:`Participation recorded in ${threshold} distinct seasons. This does not assert consecutive appearances.`});
 const ordered=[...history].sort((a,b)=>Number(a.season)-Number(b.season));
 ordered.forEach((row,i)=>{if(i&&row.team!==ordered[i-1].team)moments.push({id:`move-${i}`,season:row.season,value:row.season,title:`${ordered[i-1].team} → ${row.team}`,label:'FRANCHISE TRANSITIONS',description:`Squad records place ${name} with ${row.team} in ${row.season}, following ${ordered[i-1].team}. ${row.priceDisplay?`Recorded acquisition price: ${row.priceDisplay}.`:''}`});});
 if(captaincy?.firstSeason)moments.push({id:'captain',season:String(captaincy.firstSeason),value:String(captaincy.firstSeason),title:'First recorded captaincy season',label:'LEADERSHIP',description:`Captaincy archive begins in ${captaincy.firstSeason}.${captaincy.titles?` ${captaincy.titles} title victories are recorded across the captaincy career.`:''} Exact first fixture is not established here.`});
 const standout=[...matches].filter(m=>(m.batting?.runs??0)>=50||(m.bowling?.wickets??0)>=4).sort((a,b)=>a.date.localeCompare(b.date));
 const seen=new Set<string>();
 for(const match of standout){
  if(seen.has(match.matchId))continue;seen.add(match.matchId);
  const bat=match.batting, bowl=match.bowling;
  const century=(bat?.runs??0)>=100;
  const spell=(bowl?.wickets??0)>=4;
  moments.push({id:`match-${match.matchId}`,season:match.season,date:match.date,matchId:match.matchId,opponent:match.vsTeam,venue:match.venue,value:century||!spell?`${bat?.runs}${bat?.notOut?'*':''}`:`${bowl?.wickets} wickets`,title:century?`Century against ${match.vsTeam}`:spell?`Standout spell against ${match.vsTeam}`:`Half-century against ${match.vsTeam}`,label:century?'CENTURIES':spell?'BOWLING SPELLS':'SPECIAL INNINGS',description:`${match.date} · ${match.venue}. ${bat&&bat.runs>=50?`${bat.runs}${bat.notOut?' not out':''} from ${bat.balls} balls. `:''}${spell?`${bowl?.wickets} wickets. `:''}${match.team}: ${match.result}. Recorded performance; match impact is not inferred from the score alone.`});
 }
 // Showcase match performances ahead of cumulative thresholds.
 moments.sort((a,b)=>Number(Boolean(b.matchId))-Number(Boolean(a.matchId))||(b.date??b.season).localeCompare(a.date??a.season));
 const [category,setCategory]=useState('All');
 const categories=['All','CENTURIES','SPECIAL INNINGS','BOWLING SPELLS','THE FIRST CHAPTER','A CAREER LANDMARK','CAREER AGGREGATES','LONGEVITY','LEADERSHIP','FRANCHISE TRANSITIONS'];
 const visible=moments.filter(m=>category==='All'||m.label===category);
 const moment=visible[Math.min(selected,visible.length-1)];
 if(!moment)return <section className="franchise-milestones lg:col-span-3"><h2>Player milestones</h2><p>No verified season records are available for this player yet.</p></section>;
 const names=[name,...aliases].filter(Boolean).map(normalize);
 const photo=PUBLIC_MANIFEST.images.find(image=>image.source==='getty'&&(moment.date?image.matchDate===moment.date:image.matchDate?.startsWith(moment.season+'-'))&&image.discovery?.captionVerified&&(image.depicts?.some(person=>names.includes(normalize(person)))||[name,...aliases].filter(n=>n&&n.trim().split(/\s+/).every(part=>part.length>1)).some(n=>image.caption.toLowerCase().includes(n.toLowerCase())))&&(isPublishable(image)||isLocalPreviewable(image)));
 const fallback=<div className="fm-photo-fallback fm-photo-unavailable"><div><Trophy size={38}/><strong>{name} · {moment.season}</strong><p>No matching Getty image is available for this milestone yet.</p><a href={buildGettyEditorialUrl({playerName:name,year:moment.season,date:moment.date,opponent:moment.opponent,venue:moment.venue,eventType:moment.id==='first'?'debut':'match_performance'})} target="_blank" rel="noreferrer">View this occasion on Getty Images ↗</a></div></div>;

 return <section style={{"--fm-accent":accent??"#d2b46c","--fm-secondary":accent??"#d2b46c"} as CSSProperties} className="franchise-milestones lg:col-span-3" aria-label={`${name} career milestones`}><header className="fm-header"><div><span>THE MOMENTS THAT MADE THE PLAYER</span><h2>CAREER <em>MILESTONES</em></h2></div></header><div className="fm-filters flex flex-wrap gap-2 mb-5">{categories.filter(c=>c==='All'||moments.some(m=>m.label===c)).map(c=><button key={c} aria-pressed={category===c} onClick={()=>{setCategory(c);setSelected(0);}}>{c==='All'?'All milestones':c.toLowerCase()}</button>)}</div><div className="fm-feature"><div className="fm-top-rule"><span className="fm-year-badge">{moment.season}</span><div/><span>{selected+1} / {visible.length}</span></div><div className="fm-feature-body"><div className="fm-copy"><span className="fm-kicker"><Flag size={13}/>{moment.label}</span><div className="fm-value">{moment.value}</div><h3>{moment.title}</h3><div className="fm-copy-divider"/><p>{moment.description}</p>{moment.matchId&&<a className="inline-block mt-4 text-sm underline" href={`/match/${moment.matchId}`}>Open this match ↗</a>}<p className="mt-4 text-xs opacity-60">Source: CRICFIELD recorded IPL season statistics.</p></div><div className="fm-photo-panel">{photo?<EditorialImageFigure image={photo} fallback={fallback}/>:fallback}</div></div></div><footer className="fm-controls"><p aria-live="polite">{moment.title}<small>{name} · {moment.season}</small></p><div><button aria-label="Previous player milestone" disabled={selected===0} onClick={()=>setSelected(i=>i-1)}><ArrowLeft/></button><button aria-label="Next player milestone" disabled={selected>=visible.length-1} onClick={()=>setSelected(i=>i+1)}><ArrowRight/></button></div></footer><div className="fm-moment-list">{visible.map((m,i)=><button key={m.id} className={i===selected?'selected':''} aria-pressed={i===selected} onClick={()=>setSelected(i)}><Trophy size={15}/><strong>{m.value}</strong><span>{m.title} · {m.season}</span></button>)}</div></section>;
}

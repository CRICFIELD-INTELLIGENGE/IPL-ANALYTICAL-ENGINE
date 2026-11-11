import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Zap, Layers, Shield } from "lucide-react";
import { CARDS, EntryMedia, STORY_TABS, selectFeedRetentionPhoto } from "@/pages/feed";
import { getV2Index, STORY_TYPE_LABEL } from "@/lib/editorial-v2";
import { newsroomOrder } from "@/components/feed-newsroom";
import { EditorialCardMedia } from "@/components/dugout/editorial-image-figure";
import { useTeamTheme, TEAM_REGISTRY } from "@/lib/team-context";
import "./feed.css";

/** Compact mobile composition; original Feed editorial records, photography and destinations. */
export default function MobileFeed(){
 const {selectedTeam}=useTeamTheme();
 const [category,setCategory]=useState('featured');const [team,setTeam]=useState('all');const [limit,setLimit]=useState(8);
 const articles=useMemo(()=>newsroomOrder(getV2Index()),[]);
 const photo=useMemo(()=>selectFeedRetentionPhoto(selectedTeam),[selectedTeam]);
 const rows=articles.filter(a=>(team==='all'||a.franchise===team)&&(category==='featured'||a.storyType===category));
 return <div className="mf-simple">
  <header className="mf-page-title"><small>IPL 2027</small><h1>The Feed</h1><p>Your next cricket read, one scroll away.</p></header>
  <section className="mf-lead"><div className="mf-lead-art">{photo?<EditorialCardMedia image={photo} preserveAspectRatio allowUnpublished={import.meta.env.DEV} fallback={<p>Team photography unavailable.</p>}/>:<img src={CARDS[0].img} alt=""/>}</div><div className="mf-lead-copy"><small>FEATURED INTELLIGENCE</small><h2>The Retention <span>Room</span></h2><p>Who stays, who leaves, and what's missing for the 2027 title race?</p><Link href="/feed/squad">Read Analysis <ArrowRight size={15}/></Link></div></section>
  <section><div className="mf-heading"><h2>Explore the Retention Room</h2><Link href="/feed/ipl-2027?module=retention">See all <ArrowRight size={14}/></Link></div><div className="mf-actions">{[["Analysis","Strategy & impact","/feed/squad",BarChart3],["Actions","Key moves","/pulse",Zap],["Numbers","Data deep dive","/stats",Layers],["Franchises","Team-wise view","/dugout",Shield]].map(([title,sub,href,Icon]:any)=><Link key={title} href={href}><Icon size={21}/><div><strong>{title}</strong><small>{sub}</small></div></Link>)}</div></section>
  <section><div className="mf-heading"><h2>Explore IPL 2027</h2></div><div className="mf-coverage">{CARDS.map(c=><Link key={c.id} href={`/feed/${c.id}`}><img src={c.img} alt="" loading="lazy"/><strong>{c.title}</strong></Link>)}</div></section>
  <section><div className="mf-heading"><h2>Latest Stories</h2><select aria-label="Filter stories by franchise" value={team} onChange={e=>{setTeam(e.target.value);setLimit(8);}}><option value="all">All teams</option>{Object.values(TEAM_REGISTRY).map(t=><option key={t.id} value={t.id}>{t.shortName}</option>)}</select></div><nav className="mf-filters" aria-label="Story categories">{STORY_TABS.map(t=><button key={t.id} aria-pressed={category===t.id} onClick={()=>{setCategory(t.id);setLimit(8);}}>{t.id==='featured'?'All':t.label}</button>)}<Link href="/reports">Reports</Link></nav>
   <div className="mf-list">{rows.slice(0,limit).map(a=><Link key={a.id} href={`/dugout/articles/${a.slug}`}><div className="mf-row-art"><EntryMedia entry={a}/></div><div className="mf-row-copy"><small>{STORY_TYPE_LABEL[a.storyType] ?? a.storyType} · {a.franchise}</small><h3>{a.title}</h3><p>{a.dek}</p><span>{a.readMinutes} min read</span></div></Link>)}</div>{!rows.length&&<p className="mf-empty">No published stories match these filters.</p>}{rows.length>limit&&<button className="mf-more" onClick={()=>setLimit(n=>n+8)}>More stories <ArrowRight size={15}/></button>}
  </section>
 </div>;
}

import { CricFieldMascot } from "@/components/CricFieldMascot";
import {useState} from 'react';
import {Link,useLocation} from 'wouter';
import {useTeamTheme} from '@/lib/team-context';
import './analyst-workspace.css';
export const ANALYST_TOOLS=[['Overview','/ai-analyst'],['Ask AI','/ai-analyst/ask'],['Weakness','/ai-analyst/weakness'],['Pressure','/ai-analyst/pressure'],['Insights','/ai-analyst/feed'],['Strategy','/ai-analyst/strategy-sim'],['What if','/ai-analyst/alt-universe'],['Opposition','/ai-analyst/opposition-map'],['Replay','/ai-analyst/decision-replay'],['Playing XI','/ai-analyst/playing-xi'],['Squad DNA','/ai-analyst/squad-dna'],['Auction','/ai-analyst/auction-war-room'],['Player Pool','/ai-analyst/player-pool']];
export function AnalystWorkspace(){
 const [location,navigate]=useLocation();const {selectedTeam,theme}=useTeamTheme();const [question,setQuestion]=useState('');
 const player=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('player');
 return <section className="analyst-workspace-nav" aria-label="AI Analyst workspace">
  <div className="analyst-workspace-top"><div><CricFieldMascot activity={question.trim() ? "analyzing" : "analyst"} size={32} className="mr-2 align-middle" /><span className="analyst-workspace-label">CRICFIELD / DECISION INTELLIGENCE</span><p>{theme?`${theme.shortName} analyst workspace`:'Your cricket intelligence workspace'}</p></div><Link href="/scout">Open Scout Lab ↗</Link></div>
  <nav aria-label="Analyst tools" className="analyst-tool-tabs">{ANALYST_TOOLS.map(([label,href])=><Link key={href} href={href} aria-current={location.split('?')[0]===href?'page':undefined}>{label}</Link>)}</nav>
  <form className="analyst-scout-search" onSubmit={event=>{event.preventDefault();if(question.trim().length<3)return;const prompt=player?`${question.trim()} Reference player: ${player}.`:question.trim();navigate(`/scout/results?q=${encodeURIComponent(prompt)}${selectedTeam?`&team=${selectedTeam}`:''}`);}}>
   <label htmlFor="analyst-scout-query">Scout Room AI</label><input id="analyst-scout-query" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={1300} placeholder={player?`Ask about ${player}, alternatives or recruitment fit…`:'Ask a cricket question, find players or explore recruitment options…'}/><button type="submit" disabled={question.trim().length<3}>Explore ↗</button>
  </form>
 </section>;
}

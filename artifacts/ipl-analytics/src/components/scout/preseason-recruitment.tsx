import {useState} from 'react';
import {Link} from 'wouter';
import {useTeamTheme} from '@/lib/team-context';
export function PreseasonRecruitment({team:explicitTeam,player}:{team?:string;player?:string}){
 const {selectedTeam}=useTeamTheme();const team=explicitTeam??selectedTeam??'SRH';
 const [needs,setNeeds]=useState<string[]>([]);
 const query=`For ${team} IPL 2027 pre-season planning, find historical IPL candidates for ${needs.length?needs.join(' and '):'batting and bowling depth'}. Use recorded phase statistics with at least 120 balls. Explain limitations; do not assume auction eligibility.`;
 const context=`team=${encodeURIComponent(team)}&planningSeason=2027`;
 return <section className="rounded-xl border border-white/10 bg-[#0c1219] p-4" aria-label="IPL 2027 pre-season recruitment">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold text-white">IPL 2027 · {team} pre-season requirements</h2><span className="text-[10px] text-slate-500">Planning workspace</span></div>
  <p className="mt-2 text-xs text-slate-400">Choose recruitment priorities. These are your planning requirements, not verified squad gaps. Historical results are separate from the upcoming season.</p>
  <div className="mt-3 flex flex-wrap gap-2">{['powerplay batting','middle-over batting','finishing','powerplay bowling','death bowling'].map(need=><button key={need} type="button" aria-pressed={needs.includes(need)} onClick={()=>setNeeds(previous=>previous.includes(need)?previous.filter(item=>item!==need):[...previous,need])} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] text-slate-300" style={needs.includes(need)?{borderColor:'var(--team-accent)',background:'color-mix(in srgb,var(--team-accent) 10%,#0c1219)'}:{}}>{needs.includes(need)?'✓ ':''}{need}</button>)}</div>
  <nav aria-label="Connected recruitment tools" className="mt-4 flex flex-wrap gap-x-4 gap-y-3 text-xs text-slate-300">
   <Link href={`/scout/results?${context}&q=${encodeURIComponent(query)}`}>Scout requirements ↗</Link>
   <Link href={`/ai-analyst/squad-dna?${context}&season=2027`}>2027 Squad DNA ↗</Link>
   <Link href={`/ai-analyst/player-pool?${context}${player?`&player=${encodeURIComponent(player)}`:''}`}>Player Pool graph ↗</Link>
   <Link href={`/feed/ipl-2027?${context}`}>2027 Intel ↗</Link><Link href={`/feed/squad?${context}`}>Squad & retentions ↗</Link><Link href={`/feed/auction?${context}`}>Auction feed ↗</Link><Link href={`/feed/tactics?${context}`}>Tactics ↗</Link><Link href={`/feed/venues?${context}`}>Venues ↗</Link>
  </nav>
 </section>;
}

import {useQuery} from '@tanstack/react-query';
import {Link} from 'wouter';
import type {ScoutRating} from '@/lib/scout-api';
import {fetchPlayerRetention} from '@/lib/retention-api';
export function RetentionAssessment({player,name}:{player?:ScoutRating;name?:string;role?:string}){
 const key=player?`cs:${player.cricsheet_id}`:name;
 const query=useQuery({queryKey:['player-retention',key],enabled:!!key,staleTime:600000,retry:false,queryFn:()=>fetchPlayerRetention(key!)});
 const d=query.data;
 return <details className="mt-2 text-[10px] text-slate-400"><summary className="cursor-pointer" style={{color:'var(--team-accent)'}}>CRICFIELD Pick · {query.isFetching?'Checking…':d?`${d.pick.category} · ${d.pick.index.toFixed(0)}/100`:'Not on an IPL 2026 squad'}</summary><p className="mt-2 max-w-md leading-5">{d?`${d.pick.reason}. ${d.pick.coverage}% of the index has evidence. An editorial recommendation, not a chance of being retained or a franchise decision.`:'No retention recommendation: this player is not on an IPL 2026 squad list.'}{d&&<> <Link href={`/retention-room/${d.team}`} style={{color:'var(--team-accent)'}}>Open Retention Room</Link></>}</p></details>;
}

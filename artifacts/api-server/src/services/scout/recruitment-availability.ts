type Attribute={attribute:string;value:string;source:string;confidence:string};
type Candidate={name:string;teams:string[];verifiedAttributes?:{provenance:Attribute[]}};
type Retention={player:string;team:string;decision:string;sourceUrl:string;recordedAt?:string};
const normal=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
export function recruitmentAvailability(player:Candidate,retentions:Retention[]){
 const attrs=player.verifiedAttributes?.provenance??[];
 const find=(pattern:RegExp)=>{const rows=attrs.filter(a=>pattern.test(a.attribute)&&a.source&&/verified|high|official|source_id_exact/i.test(a.confidence));const values=[...new Set(rows.map(a=>a.value))];return values.length===1?rows[0]:undefined;};
 const nation=find(/^(country|nationality|citizenship)$/);
 const career=find(/^(career_status|retirement_status|playing_status)$/);
 const retired=!!career&&/retired.*(all|franchise|ipl)|^(retired|inactive)$/i.test(career.value);
 const pakistan=!!nation&&/^(pakistan|pakistani|pak)$/i.test(nation.value.trim());
 const retention=retentions.find(r=>normal(r.player)===normal(player.name));
 const reasons:string[]=[];
 if(retired)reasons.push('Recorded retired/inactive status; exclude from recruitment.');
 if(pakistan)reasons.push('Pakistan registration: excluded from this IPL recruitment pool; any alternate-citizenship exception needs official clearance.');
 if(retention?.decision==='retained')reasons.push(`Officially retained by ${retention.team}; not an open auction target.`);
 return {nationality:nation?.value??null,nationalitySource:nation?.source??null,playingStatus:career?.value??'Unverified — recent match records do not prove active status',playingStatusSource:career?.source??null,retentionStatus:retention?`${retention.decision} by ${retention.team}`:'2027 decision not confirmed',retentionSource:retention?.sourceUrl??null,retentionChance:'Not estimated — no validated retention probability model',previousTeams:player.teams,excluded:reasons.length>0,reasons,eligibility:reasons.length?'Not an open recruitment target':'Unverified — requires official 2027 registration, fitness and contract checks'};
}

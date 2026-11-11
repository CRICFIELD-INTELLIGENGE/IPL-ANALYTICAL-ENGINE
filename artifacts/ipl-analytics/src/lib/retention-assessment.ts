import type {ScoutRating} from './scout-api';
export function retentionAssessment(player:ScoutRating){
 const metrics=Object.values(player.metrics).map(metric=>metric.percentile).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n));
 if(!metrics.length||player.balls<120)return null;
 const performance=metrics.reduce((a,b)=>a+b,0)/metrics.length;
 const sample=Math.min(100,player.balls/6);
 const score=Math.round(performance*.8+sample*.2);
 return {score,band:score>=70?'High':score>=45?'Medium':'Low',reason:`80% mean metric percentile (${performance.toFixed(0)}), 20% sample depth (${player.balls} balls; full credit at 600). ${player.discipline}, ${player.phase}, ${player.competition.toUpperCase()} only.`};
}

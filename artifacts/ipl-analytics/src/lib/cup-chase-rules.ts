export type ShotResult={runs:number;wicket:boolean;label:string};
export const CUP_TARGETS=[18,26,34] as const;
export function judgeShot(progress:number):ShotResult{const error=Math.abs(progress-.78);if(error<=.035)return {runs:6,wicket:false,label:'SIX! Right out of the middle.'};if(error<=.085)return {runs:4,wicket:false,label:'FOUR! Through the gap.'};if(error<=.15)return {runs:2,wicket:false,label:'Two runs. Keep moving.'};if(error<=.22)return {runs:1,wicket:false,label:'A single. Strike rotated.'};return {runs:0,wicket:true,label:progress<.78?'Too early. Caught!':'Too late. Bowled!'};}
export function inningsStatus(runs:number,wickets:number,balls:number,target:number){return runs>=target?'won':wickets>=3||balls>=12?'lost':'playing';}

import type { ScoutRating } from "./scout-api";
import type { GeminiAnalysisResult } from "./gemini-client";
export type ScoutTurn = { role:"user"|"assistant"; content:string };
export interface ScoutConversationReply extends GeminiAnalysisResult { candidates?:ScoutRating[]; limitations?:string; webStatus?:string; webSources?:{id:string;title:string;url:string;snippet:string;retrievedAt:string}[] }
export async function askScoutConversation(prompt:string,team:string|undefined,history:ScoutTurn[]):Promise<ScoutConversationReply>{
 try {
  const response=await fetch(`${import.meta.env.BASE_URL}api/scout/analyst`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,team,history:history.slice(-6).map(turn=>({...turn,content:turn.content.slice(0,2000)}))}),signal:AbortSignal.timeout(100000)});
  const data=await response.json();
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Scout AI is unavailable.');
  if(data.source!=='live_api'||typeof data.text!=='string'||!data.text.trim())throw new Error('No evidence-backed answer was returned.');
  return {...data,candidates:Array.isArray(data.candidates)?data.candidates:[],ms:0};
 }catch(error){return {text:'',model:'',source:'unavailable',error:error instanceof Error?error.message:'Scout AI is unavailable.',ms:0};}
}

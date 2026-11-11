import { z } from 'zod';
import { createHash } from 'node:crypto';
import { type PlatformStore } from './store';
const matchSchema=z.object({id:z.string().min(1).max(80),label:z.string().min(3).max(120),homeWickets:z.number().int().min(0).max(10),awayWickets:z.number().int().min(0).max(10),status:z.enum(['live','complete']),result:z.string().max(500).optional()}).strict();
const feedSchema=z.object({source:z.string().url().refine(s=>s.startsWith('https://')),observedAt:z.number().int(),matches:z.array(matchSchema).max(100)}).strict();
export function observeMatches(store:PlatformStore,input:unknown,now=Date.now()){
  const parsed=feedSchema.parse(input);if(Math.abs(parsed.observedAt-now)>300000)throw new Error('stale_feed');
  for(const match of parsed.matches){
    const key=`match:${match.id}`,previous=store.checkpoint(key);
    if(previous){const last=JSON.parse(previous);
      for(const side of ['homeWickets','awayWickets'] as const)if(match[side]>last[side]){
        const id=createHash('sha256').update(`${match.id}:${side}:${match[side]}`).digest('hex');
        store.event({id:`wicket:${id}`,kind:'wicket',title:`Wicket update · ${match.label}`,body:`Observed ${side==='homeWickets'?'home':'away'} wickets change from ${last[side]} to ${match[side]}.`,source:parsed.source,occurredAt:parsed.observedAt});
      }
      if(match.status==='complete'&&last.status!=='complete'&&match.result)store.event({id:`result:${match.id}`,kind:'match_result',title:`Result · ${match.label}`,body:match.result,source:parsed.source,occurredAt:parsed.observedAt});
    }
    store.checkpoint(key,JSON.stringify(match));
  }
}
export async function pollEventFeed(store:PlatformStore){
  const endpoint=process.env.CRICKET_EVENT_FEED_URL;if(!endpoint)return;
  const url=new URL(endpoint);if(url.protocol!=='https:')throw new Error('feed_requires_https');
  const response=await fetch(url,{signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw new Error('feed_unavailable');
  const body=await response.text();if(body.length>100000)throw new Error('feed_too_large');observeMatches(store,JSON.parse(body));
}

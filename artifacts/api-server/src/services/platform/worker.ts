import { pollEventFeed } from "./event-feed";
import { platform } from './store';
import { deliverOne } from './delivery';
import { getAuctionDeskSnapshot } from '../../routes/auction-2027';
import { createHash } from 'node:crypto';
let running=false;
export async function platformTick(){if(running)return;running=true;try{
  const store=platform();
  try { await pollEventFeed(store); } catch { console.warn("Cricket event feed unavailable; existing jobs will still run."); }
  // Only source-attributed, admin-entered records. Never scrape demo/live fallbacks.
  try {
  const snapshot=getAuctionDeskSnapshot();
  const records=[...snapshot.lots.filter(l=>l.status==='sold').map(l=>({key:`lot:${l.lot}`,kind:'auction_purchase' as const,title:`Auction: ${l.player}`,body:`${l.player}: ${l.team}, ${l.priceLakhs} lakh`,at:l.recordedAt,source:l.sourceUrl})),...snapshot.retentions.map(r=>({key:`retention:${r.team}:${r.player}`,kind:'player_update' as const,title:`Player update: ${r.player}`,body:`${r.team}: ${r.player} ${r.decision}`,at:r.recordedAt,source:r.sourceUrl}))];
  const initialized=store.checkpoint('auction_initialized');
  for(const record of records){const fingerprint=createHash('sha256').update(JSON.stringify(record)).digest('hex');if(!initialized){store.checkpoint(record.key,fingerprint);continue;}if(store.checkpoint(record.key)===fingerprint)continue;
    store.event({id:`auction:${fingerprint}`,kind:record.kind,title:record.title,body:record.body,source:record.source,occurredAt:Date.parse(record.at)});store.checkpoint(record.key,fingerprint);
  }store.checkpoint('auction_initialized','true');
  } catch { console.warn('Auction event source unavailable; existing jobs will still run.'); }
  const date=new Date().toISOString().slice(0,10);
  if(new Date().getUTCHours()>=Number(process.env.DIGEST_HOUR_UTC||18) && store.checkpoint('digest_date')!==date){
    const events=store.db.prepare("SELECT title,source FROM events WHERE occurred_at>? AND kind!='daily_digest' ORDER BY occurred_at DESC LIMIT 10").all(Date.now()-86400000) as any[];
    if(events.length)store.event({id:`digest:${date}`,kind:'daily_digest',title:`CricField daily digest · ${date}`,body:events.map(e=>`${e.title}\n${e.source}`).join('\n\n'),source:events[0].source,occurredAt:Date.now()});
    store.checkpoint('digest_date',date);
  }
  for(let i=0;i<20;i++)if(!await deliverOne())break;
}catch{console.warn('Platform worker tick failed; queued work retained.');}finally{running=false;}}
export function startPlatformWorker(){if(process.env.PLATFORM_WORKER_ENABLED!=='true')return;void platformTick();const timer=setInterval(()=>void platformTick(),30000);timer.unref();}

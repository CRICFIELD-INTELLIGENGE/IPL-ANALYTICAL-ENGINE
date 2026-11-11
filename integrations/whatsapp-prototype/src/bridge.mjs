import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createWhatsAppChannel, verifySignature, handleVerifyHandshake } from '@wappy_ai/whatsapp';
export function settings(env=process.env) {
  const dryRun=env.WHATSAPP_SEND_ENABLED !== 'true';
  const analyst=new URL(env.CRICFIELD_API_URL || 'http://127.0.0.1:5055');
  if(analyst.protocol!=='http:' || !['127.0.0.1','localhost','[::1]'].includes(analyst.hostname) || analyst.username || analyst.password || analyst.pathname!=='/' || analyst.search || analyst.hash) throw new Error('Analyst URL must be local');
  const allowed=new Set((env.WHATSAPP_TEST_RECIPIENTS || '').split(',').map(x=>x.trim()).filter(x=>/^\d{7,15}$/.test(x)));
  if(!env.META_APP_SECRET || !env.META_VERIFY_TOKEN || !/^\d+$/.test(env.META_PHONE_NUMBER_ID || '')) throw new Error('Fill Meta app secret, verify token and test phone-number ID in env/whatsapp.env');
  if(!dryRun && (!env.META_ACCESS_TOKEN || !allowed.size || !/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION || ''))) throw new Error('Live mode needs access token, allowed test recipients and Graph API version');
  return {dryRun,analyst:analyst.origin,allowed,appSecret:env.META_APP_SECRET,verifyToken:env.META_VERIFY_TOKEN,phoneNumberId:env.META_PHONE_NUMBER_ID,accessToken:env.META_ACCESS_TOKEN || 'dry-run',graphVersion:env.META_GRAPH_VERSION || 'v23.0'};
}
export function createBridge(config,{fetcher=fetch,record=()=>{}}={}) {
  const channel=createWhatsAppChannel({phoneNumberId:config.phoneNumberId,accessToken:config.accessToken,graphApiBaseUrl:`https://graph.facebook.com/${config.graphVersion}`,fetchImpl:fetcher,maxSendAttempts:1});
  const pending=[];let working=false;
  const safeRecord=event=>{try{record(event);}catch{}};
  const seen=new Map();
  async function drain(){
    if(working)return;working=true;
    try{while(pending.length){
      const message=pending.shift();const id=createHash('sha256').update(message.id).digest('hex');
      try{
        const response=await fetcher(`${config.analyst}/api/ai/analyst`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:message.text}),signal:AbortSignal.timeout(100000)});
        if(!response.ok)throw new Error('analyst_unavailable');
        const answer=await response.json();
        if(typeof answer.text!=='string' || !Array.isArray(answer.evidence) || !answer.evidence.length)throw new Error('missing_evidence');
        const sources=answer.evidence.map(item=>`[${item.id}] ${item.tool}: ${item.source}`).join('\n');
        const text=`${answer.text.slice(0,2700)}\n\nCricField sources:\n${sources.slice(0,700)}\nAI interpretation; check the source records.`;
        if(!config.dryRun){const result=await channel.send(message.contactId,{text});if(result.status!=='sent')throw new Error('delivery_failed');}
        safeRecord({id,state:config.dryRun?'dry_run':'sent',at:new Date().toISOString()});
      }catch{safeRecord({id,state:'failed',at:new Date().toISOString()});}
    }}finally{working=false;}
  }
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const reply=(status,body='')=>{res.writeHead(status,{'Content-Type':'text/plain'});res.end(body);};
    if(url.pathname==='/health' && req.method==='GET')return reply(200,config.dryRun?'dry-run':'test-send');
    if(url.pathname!=='/webhook')return reply(404);
    if(req.method==='GET'){
      const result=handleVerifyHandshake(Object.fromEntries(url.searchParams),config.verifyToken);
      if(result.ok)safeRecord({state:"verification_passed",at:new Date().toISOString()});
      return result.ok?reply(200,result.challenge):reply(403);
    }
    if(req.method!=='POST')return reply(405);
    const chunks=[];let size=0;
    try{for await(const chunk of req){size+=chunk.length;if(size>65536)return reply(413);chunks.push(chunk);}}catch{return reply(400);}
    const body=Buffer.concat(chunks);
    if(!verifySignature(body,req.headers['x-hub-signature-256'],config.appSecret))return reply(401);
    let payload;try{payload=JSON.parse(body.toString('utf8'));}catch{return reply(400);}
    const raw=[];
    for(const entry of Array.isArray(payload?.entry)?payload.entry:[])for(const change of Array.isArray(entry?.changes)?entry.changes:[]){
      const value=change?.value;
      if(change?.field==='messages' && value?.metadata?.phone_number_id===config.phoneNumberId && Array.isArray(value.messages))raw.push(...value.messages);
    }
    const now=Date.now();
    for(const [id,at] of seen)if(now-at>86400000)seen.delete(id);
    const accepted=raw.filter(m=>m?.type==='text' && typeof m.id==='string' && typeof m.text?.body==='string' && m.text.body.trim().length>=3 && m.text.body.length<=300 && config.allowed.has(m.from) && Number.isFinite(Number(m.timestamp)) && Math.abs(now-Number(m.timestamp)*1000)<86400000 && !seen.has(m.id));
    safeRecord({state:"webhook_received",matchedNumberMessages:raw.length,acceptedTextMessages:accepted.length,at:new Date().toISOString()});
    if(pending.length+accepted.length>50 || seen.size+accepted.length>10000)return reply(503);
    try{
      for(const rawMessage of accepted){
        if(seen.has(rawMessage.id))continue;
        seen.set(rawMessage.id,now);
        const messages=await channel.receive({entry:[{changes:[{field:'messages',value:{messages:[rawMessage]}}]}]});
        pending.push(...messages);
      }
    }catch{return reply(400);}
    reply(200);void drain();
  });
  return {server,idle:async()=>{while(working || pending.length)await new Promise(resolve=>setTimeout(resolve,10));}};
}

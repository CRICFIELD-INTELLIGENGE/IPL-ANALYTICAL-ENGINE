import { createHmac, timingSafeEqual } from 'node:crypto';
import { platform, type Channel } from './store';
export function unsubscribeToken(userId:string){const key=process.env.NOTIFICATION_SIGNING_SECRET;if(!key)return null;const body=Buffer.from(userId).toString('base64url');return `${body}.${createHmac('sha256',key).update(body).digest('base64url')}`;}
export function verifyUnsubscribe(token:string){const [body,signature]=token.split('.');if(!body||!signature||!process.env.NOTIFICATION_SIGNING_SECRET)return null;const expected=createHmac('sha256',process.env.NOTIFICATION_SIGNING_SECRET).update(body).digest('base64url');const a=Buffer.from(expected),b=Buffer.from(signature);if(a.length!==b.length || !timingSafeEqual(a,b))return null;return Buffer.from(body,'base64url').toString();}
export async function deliverOne(fetcher:typeof fetch=fetch){
  const store=platform(),job=store.claim();if(!job)return false;
  const preference=job.preference;
  if(!preference || !preference.channels.includes(job.channel) || !preference.topics.includes(job.event.kind)){store.finish(job.id,'cancelled');return true;}
  if(job.channel!=='in_app' && Date.now()-job.event.occurred_at>86400000){store.finish(job.id,'dead','event_expired');return true;}
  if(job.channel==='in_app'){store.finish(job.id,'sent');return true;}
  try{
    if(job.channel==='email'){
      const key=process.env.RESEND_API_KEY,from=process.env.NOTIFICATION_EMAIL_FROM,origin=process.env.PUBLIC_SITE_URL;
      const token=unsubscribeToken(job.user_id);
      if(!key||!from||!origin?.startsWith('https://')||!token){store.finish(job.id,'blocked','email_not_configured');return true;}
      const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({from,to:preference.email,subject:job.event.title,text:`${job.event.body}\nSource: ${job.event.source}\n\nUnsubscribe: ${origin}/api/notifications/unsubscribe?token=${token}`})});
      if(!response.ok){store.finish(job.id,response.status===429||response.status>=500?'retry':'dead','email_provider_error');return true;}
      store.finish(job.id,'sent');return true;
    }
    const token=process.env.META_ACCESS_TOKEN,phoneId=process.env.META_PHONE_NUMBER_ID,template=process.env.META_NOTIFICATION_TEMPLATE,version=process.env.META_GRAPH_VERSION;
    if(process.env.WHATSAPP_ALERTS_ENABLED!=='true'||!preference.phone_verified||!preference.phone||!token||!phoneId||!template||!/^v\d+\.\d+$/.test(version??'')){store.finish(job.id,'blocked','whatsapp_not_verified_or_configured');return true;}
    const response=await fetcher(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:preference.phone,type:'template',template:{name:template,language:{code:process.env.META_TEMPLATE_LANGUAGE||'en'},components:[{type:'body',parameters:[{type:'text',text:job.event.body.slice(0,900)}]}]}})});
    store.finish(job.id,response.ok?'sent':response.status===429?'retry':response.status>=500?'uncertain':'dead',response.ok?null:'whatsapp_provider_error');return true;
  }catch{store.finish(job.id,job.channel==='email'?'retry':'uncertain','transport_error');return true;}
}

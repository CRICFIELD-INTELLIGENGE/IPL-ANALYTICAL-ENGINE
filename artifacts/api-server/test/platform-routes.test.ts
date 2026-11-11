import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import router from '../src/routes/platform';
import { platform } from '../src/services/platform/store';
import { deliverOne,unsubscribeToken,verifyUnsubscribe } from '../src/services/platform/delivery';
test('authenticated subscriptions, admin access, delivery states and cancellation',async()=>{
 process.env.PLATFORM_DB_PATH=':memory:';process.env.SUPABASE_URL='https://auth.test';process.env.SUPABASE_PUBLISHABLE_KEY='public-fixture';process.env.ADMIN_API_TOKEN='admin-fixture-token-long-enough';process.env.NOTIFICATION_SIGNING_SECRET='signing-fixture';
 const realFetch=globalThis.fetch;
 globalThis.fetch=(async(input,init)=>{if(String(input).startsWith('https://auth.test')){const token=(init?.headers as Record<string,string>).Authorization;if(!['Bearer A','Bearer B'].includes(token))return new Response('{}',{status:401});return new Response(JSON.stringify({id:token==='Bearer A'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222',email:token==='Bearer A'?'a@example.invalid':'b@example.invalid',email_confirmed_at:'2026-01-01'}));}return realFetch(input,init);}) as typeof fetch;
 const app=express();app.use(express.json());app.use(router);const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as any,base=`http://127.0.0.1:${address.port}`;
 const request=(route:string,token?:string,body?:unknown)=>fetch(base+route,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 try{
  assert.equal((await request('/notifications')).status,401);
  assert.equal((await request('/admin/analytics')).status,401);
  assert.equal((await request('/notifications/preferences','A',{topics:['wicket'],channels:['in_app','email']})).status,200);
  assert.equal((await request('/notifications/preferences','A',{topics:['wicket'],channels:['email'],user_id:'B'})).status,400);
  const store=platform();store.event({id:'auth-event',kind:'wicket',title:'Wicket observed',body:'Fixture event',source:'https://example.com/score',occurredAt:Date.now()+1});
  await deliverOne();assert.equal((await(await request('/notifications','A')).json()).notifications.length,1);assert.equal((await(await request('/notifications','B')).json()).notifications.length,0);
  delete process.env.RESEND_API_KEY;await deliverOne();assert.equal((store.db.prepare("SELECT status FROM deliveries WHERE channel='email'").get() as any).status,'blocked');
  const uid='11111111-1111-4111-8111-111111111111';const token=unsubscribeToken(uid)!;assert.equal(verifyUnsubscribe(token),uid);assert.equal(verifyUnsubscribe(token+'bad'),null);
  store.subscribe(uid,'a@example.invalid',['wicket'],[]);store.db.prepare('UPDATE deliveries SET next_at=0').run();await deliverOne();assert.equal((store.db.prepare("SELECT status FROM deliveries WHERE channel='email'").get() as any).status,'cancelled');
  store.db.prepare('DELETE FROM deliveries').run();store.subscribe(uid,'a@example.invalid',['wicket'],['email']);store.event({id:'email-event',kind:'wicket',title:'Wicket',body:'Fixture',source:'https://example.com',occurredAt:Date.now()+1});
  process.env.RESEND_API_KEY='fixture';process.env.NOTIFICATION_EMAIL_FROM='test@example.invalid';process.env.PUBLIC_SITE_URL='https://example.invalid';
  await deliverOne((async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');assert.ok((init?.headers as any)['Idempotency-Key']);assert.match(JSON.parse(String(init?.body)).text,/Unsubscribe:/);return new Response('{}',{status:200});}) as typeof fetch);
  assert.equal((store.db.prepare("SELECT status FROM deliveries WHERE channel='email'").get() as any).status,'sent');
 }finally{globalThis.fetch=realFetch;await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

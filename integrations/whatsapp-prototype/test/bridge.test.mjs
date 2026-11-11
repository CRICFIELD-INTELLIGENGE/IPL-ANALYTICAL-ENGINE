import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createBridge,settings } from '../src/bridge.mjs';
const config=settings({META_APP_SECRET:'secret',META_VERIFY_TOKEN:'verify',META_PHONE_NUMBER_ID:'123',WHATSAPP_TEST_RECIPIENTS:'919876543210'});
const payload=(id='message-1',from='919876543210',number='123')=>({entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:number},messages:[{id,from,type:'text',timestamp:String(Math.floor(Date.now()/1000)),text:{body:'Most runs in IPL 2025'}}]}}]}]});
test('verified handshake, signed dry-run, dedup and recipient/number filtering',async()=>{
  const calls=[],events=[];
  const bridge=createBridge(config,{fetcher:async(url)=>{calls.push(url);return new Response(JSON.stringify({text:'Evidence [S1]',evidence:[{id:'S1',tool:'statistics',source:'/api/ask'}]}));},record:event=>events.push(event)});
  await new Promise(resolve=>bridge.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${bridge.server.address().port}`;
  const post=async(body,sign=true)=>fetch(`${base}/webhook`,{method:'POST',headers:sign?{'x-hub-signature-256':`sha256=${createHmac('sha256','secret').update(body).digest('hex')}`}:{},body});
  try{
    assert.equal(await(await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=42`)).text(),'42');
    assert.equal((await post(JSON.stringify(payload()),false)).status,401);
    for(const item of [payload(),payload(),payload('other','911111111111'),payload('wrong','919876543210','999')])assert.equal((await post(JSON.stringify(item))).status,200);
    await bridge.idle();assert.equal(calls.length,1);assert.equal(events.find(event=>event.state==='dry_run')?.state,'dry_run');assert.equal(events.find(event=>event.state==='dry_run').id.length,64);assert.ok(calls[0].includes('/api/ai/analyst'));
  }finally{await new Promise(resolve=>bridge.server.close(resolve));}
});
test('live mode refuses missing credentials and empty recipient allowlist',()=>{
  assert.throws(()=>settings({META_APP_SECRET:'secret',META_VERIFY_TOKEN:'verify',META_PHONE_NUMBER_ID:'123',WHATSAPP_SEND_ENABLED:'true'}),/Live mode needs/);
});
test('allowlisted test reply uses Wappy transport with mocked Meta delivery',async()=>{
  const live={...config,dryRun:false,accessToken:'test-token',graphVersion:'v23.0'};
  const calls=[],events=[];
  const bridge=createBridge(live,{fetcher:async(url,init)=>{
    calls.push(url);
    if(url.includes('graph.facebook.com')){const body=JSON.parse(init.body);assert.equal(body.to,'919876543210');return new Response(JSON.stringify({messaging_product:'whatsapp',messages:[{id:'sent-test'}]}));}
    return new Response(JSON.stringify({text:'Evidence [S1]',evidence:[{id:'S1',tool:'statistics',source:'/api/ask'}]}));
  },record:event=>events.push(event)});
  await new Promise(resolve=>bridge.server.listen(0,'127.0.0.1',resolve));
  const body=JSON.stringify(payload('live-test'));
  try{
    const response=await fetch(`http://127.0.0.1:${bridge.server.address().port}/webhook`,{method:'POST',body,headers:{'x-hub-signature-256':`sha256=${createHmac('sha256','secret').update(body).digest('hex')}`}});
    assert.equal(response.status,200);await bridge.idle();assert.equal(events.find(event=>event.state==='sent')?.state,'sent');assert.equal(calls.length,2);
  }finally{await new Promise(resolve=>bridge.server.close(resolve));}
});

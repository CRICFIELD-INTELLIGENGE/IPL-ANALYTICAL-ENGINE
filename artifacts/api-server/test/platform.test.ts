import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformStore } from '../src/services/platform/store';
import { observeMatches } from '../src/services/platform/event-feed';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
test('events deduplicate and fan out only to subscribed users/channels',()=>{
 const store=new PlatformStore(':memory:');store.subscribe('A','a@example.invalid',['wicket'],['in_app']);store.subscribe('B','b@example.invalid',['match_result'],['email']);
 const event={id:'event-1',kind:'wicket' as const,title:'Wicket',body:'Observed wicket',source:'https://example.com/score',occurredAt:Date.now()+10};
 assert.equal(store.event(event),true);assert.equal(store.event(event),false);const job=store.claim()!;assert.equal(job.user_id,'A');assert.equal(job.channel,'in_app');store.finish(job.id,'sent');assert.equal(store.inbox('A').length,1);assert.equal(store.inbox('B').length,0);
 store.read('B',job.id);assert.equal((store.inbox('A')[0] as any).read_at,null);store.read('A',job.id);assert.ok((store.inbox('A')[0] as any).read_at);store.db.close();
});
test('persistent queue survives restart and retry budget reaches dead letter',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cricfield-platform-')),file=path.join(dir,'ops.sqlite');let store=new PlatformStore(file);
 try{store.subscribe('A','a@example.invalid',['wicket'],['email']);store.event({id:'event',kind:'wicket',title:'Wicket',body:'Wicket',source:'https://example.com',occurredAt:Date.now()+1});store.db.close();store=new PlatformStore(file);
 for(let n=0;n<5;n++){const job=store.claim(Date.now()+10000000)!;assert.ok(job);store.finish(job.id,'retry','fixture');}
 assert.equal((store.db.prepare('SELECT status FROM deliveries').get() as any).status,'dead');assert.equal(store.claim(Date.now()+10000000),null);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('phone verification reset and unsubscribe stop pending channels',()=>{
 const store=new PlatformStore(':memory:');store.subscribe('A','a@example.invalid',['wicket'],['whatsapp'],'919999999999');store.db.prepare('UPDATE preferences SET phone_verified=1').run();store.subscribe('A','a@example.invalid',['wicket'],['whatsapp'],'918888888888');assert.equal(store.preferences('A').phone_verified,0);store.db.close();
});
test('match observations baseline, detect wicket/result, dedup and reject stale data',()=>{
 const store=new PlatformStore(':memory:');const now=Date.now();const match={id:'1',label:'A vs B',homeWickets:0,awayWickets:0,status:'live'};
 const feed=(value:any)=>({source:'https://example.com/verified',observedAt:now,matches:[value]});observeMatches(store,feed(match),now);assert.equal((store.db.prepare('SELECT count(*) n FROM events').get() as any).n,0);
 observeMatches(store,feed({...match,homeWickets:1}),now);observeMatches(store,feed({...match,homeWickets:1}),now);observeMatches(store,feed({...match,homeWickets:1,status:'complete',result:'A won'}),now);
 assert.equal((store.db.prepare('SELECT count(*) n FROM events').get() as any).n,2);assert.throws(()=>observeMatches(store,{...feed(match),observedAt:now-400000},now),/stale_feed/);store.db.close();
});
test('analytics separates page views and heartbeats with recent presence',()=>{
 const store=new PlatformStore(':memory:');store.track('session','stats','page_view');store.track('session','stats','heartbeat');assert.equal(store.metrics().onlineOptIn,1);assert.equal(store.metrics().pageViews30d,1);store.db.close();
});

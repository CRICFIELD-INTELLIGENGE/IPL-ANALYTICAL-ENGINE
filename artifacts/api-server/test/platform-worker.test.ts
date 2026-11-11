import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { platform } from '../src/services/platform/store';
import { platformTick } from '../src/services/platform/worker';
test('worker observes auction changes, sends in-app jobs, and schedules one daily digest',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cricfield-events-'));process.env.PLATFORM_DB_PATH=':memory:';process.env.AUCTION_LOG_PATH=path.join(dir,'auction.json');process.env.DIGEST_HOUR_UTC='0';delete process.env.CRICKET_EVENT_FEED_URL;
 const store=platform();writeFileSync(process.env.AUCTION_LOG_PATH,'[]');
 try{
  store.subscribe('A','a@example.invalid',['auction_purchase','daily_digest'],['in_app']);await platformTick();
  // A digest is only composed once at its scheduled tick; a new event after that waits for tomorrow.
  store.db.prepare("DELETE FROM checkpoints WHERE key='digest_date'").run();
  writeFileSync(process.env.AUCTION_LOG_PATH,JSON.stringify([{kind:'lot',lot:1,player:'Fixture Player',status:'sold',team:'MI',priceLakhs:100,sourceUrl:'https://example.com/auction',recordedAt:new Date(Date.now()+5).toISOString()}]));
  await platformTick();await platformTick();
  const events=store.db.prepare('SELECT kind FROM events').all() as any[];assert.equal(events.filter(e=>e.kind==='auction_purchase').length,1);assert.equal(events.filter(e=>e.kind==='daily_digest').length,1);
  assert.equal(store.inbox('A').length,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

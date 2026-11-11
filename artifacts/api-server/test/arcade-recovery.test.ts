import { test } from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Each worker has fresh module caches and a new SQLite connection. No room Map
// survives between the two runtimes, so this exercises the disk recovery path.
test(
  "auction bids and hidden hand commitments recover in a fresh API runtime",
  { timeout: 180000 },
  async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "cricfield-recovery-"));
    const file = path.join(directory, "platform.sqlite"),
      root = path.resolve(import.meta.dirname, "..");
    async function run(mode: string, fixture?: unknown) {
      const worker = new Worker(
        `
   const {parentPort,workerData}=require('node:worker_threads');const path=require('node:path');require('tsx/cjs');
   const assert=require('node:assert/strict');const R=require(path.join(workerData.root,'src/services/arcade/rooms.ts'));const M=require(path.join(workerData.root,'src/services/arcade/live-match.ts'));const D=require(path.join(workerData.root,'src/services/arcade/live-auction.ts'));
   if(workerData.mode==='create'){
    const a=R.create('hand-cricket','Host'),b=R.join(a.code,'hand-cricket','Guest');R.start(a.code,a.token);const v=M.read(a.code,a.token);M.action(a.code,a.token,{type:'hand',value:6,round:v.round});
    const h=D.create('Host',false),g=D.join(h.code,'Guest');let d=D.action(h.code,h.token,{type:'start'});d=D.action(h.code,h.token,{type:'bid',expectedLot:d.state.lots[0].id,expectedPrice:d.price});
    parentPort.postMessage({hand:{code:a.code,host:a.token,guest:b.token},auction:{code:h.code,host:h.token,guest:g.token,team:d.you,price:d.price,lotId:d.state.lots[0].id}});
   }else{
    const f=workerData.fixture;assert.equal(R.member(f.hand.code,f.hand.host).members.length,2);let v=M.read(f.hand.code,f.hand.host);assert(v.committed);v=M.action(f.hand.code,f.hand.guest,{type:'hand',value:1,round:v.round});assert.equal(v.seats[0].score,6);
    let d=D.read(f.auction.code,f.auction.host);assert(d.revision>0);const bids=d.log.find(r=>r.lotId===f.auction.lotId)?.bids??d.bids;assert(bids.some(b=>b.team===f.auction.team&&b.price===f.auction.price));d=D.action(f.auction.code,f.auction.host,{type:'pause'});assert(d.paused);parentPort.postMessage({handScore:v.seats[0].score,auctionPaused:d.paused});
   }
  `,
        {
          eval: true,
          workerData: { mode, fixture, root },
          env: {
            ...process.env,
            CRICFIELD_DB_READONLY: "1",
            PLATFORM_DB_PATH: file,
          },
          execArgv: [],
        },
      );
      try {
        return await new Promise<any>((resolve, reject) => {
          worker.once("message", resolve);
          worker.once("error", reject);
          worker.once("exit", (code) => {
            if (code !== 0)
              reject(new Error(`Recovery worker exited with ${code}`));
          });
        });
      } finally {
        await worker.terminate();
      }
    }
    try {
      const fixture = await run("create");
      assert.deepEqual(await run("restore", fixture), {
        handScore: 6,
        auctionPaused: true,
      });
    } finally {
      const resolved = path.resolve(directory);
      assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
      assert(path.basename(resolved).startsWith("cricfield-recovery-"));
      rmSync(resolved, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  },
);

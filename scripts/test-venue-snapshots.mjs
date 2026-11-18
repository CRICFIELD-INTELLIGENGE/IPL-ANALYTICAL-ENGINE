import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const code = fs.readFileSync(path.join(root,"artifacts/ipl-analytics/src/lib/venue-snapshot.ts"),"utf8");
const compiled = ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const { aggregateVenueSnapshot: aggregate } = await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));
const folder=path.join(root,"artifacts/ipl-analytics/public/data/venue-analytics");
let matches=0;
for(const file of fs.readdirSync(folder)) {
 const pack=JSON.parse(fs.readFileSync(path.join(folder,file),"utf8"));
 const result=aggregate(pack); matches+=result.matches;
 assert.equal(new Set(pack.matches.map(m=>m.id)).size,result.matches,file+" duplicate matches");
 assert.equal(result.matches,pack.matches.length);
 assert.ok(result.phases.every(p=>p.balls>0 && Number.isFinite(p.runRate)));
 assert.ok(result.surface.every(p=>p.balls>0 && Number.isFinite(p.economy)));
 for(const timeOfDay of ["evening","afternoon"]) {
  assert.equal(aggregate(pack,{timeOfDay}).matches,pack.matches.filter(m=>m.time===timeOfDay).length);
 }
}
assert.equal(matches,1243);
const w=JSON.parse(fs.readFileSync(path.join(folder,"wankhede-stadium.json"),"utf8"));
assert.equal(aggregate(w).matches,132);
assert.equal(aggregate(w,{from:2022,to:2026}).matches,49);
assert.equal(aggregate(w,{from:2027}).innings.firstAvg,null);
assert.deepEqual(aggregate(w,{from:2027}).topBatters,[]);
assert.ok(aggregate(w).surface.some(s=>s.kind==="Pace"));
assert.ok(aggregate(w).surface.some(s=>s.kind==="Spin"));
const fixture={version:1,venue:"Test",city:null,source:"test",matches:[
 {id:"1",season:2025,time:null,innings:[[1,100,5],[2,90,6]],phases:[["Powerplay",6,6,0,0,0]],surface:[["Pace",6,6,0,0]],batters:[["A",6,6]],bowlers:[["B",0,6,6]],overs:[[1,6]]},
 {id:"2",season:2026,time:"evening",innings:[[1,200,4],[2,201,3]],phases:[["Powerplay",12,24,2,1,1]],surface:[["Pace",12,24,1,1]],batters:[["A",24,12]],bowlers:[["B",1,12,24]],overs:[[1,12],[2,24]]}
]};
const a=aggregate(fixture);
assert.equal(a.phases[0].runRate,10); // pooled balls, not the mean of per-match rates
assert.equal(a.surface[0].economy,10);
assert.equal(a.topBatters[0].strikeRate,30/18*100);
assert.equal(a.topBowlers[0].average,30);
assert.equal(a.parByOver[0].par,9);
assert.equal(a.parByOver[1].par,24); // only innings that completed the over
assert.equal(a.dew.afternoon.matches,0); // unknown starts stay unknown
assert.equal(a.dew.afternoon.first,null);
assert.equal(aggregate(fixture,{to:2025}).surface[0].average,null); // no wickets, not zero
assert.equal(aggregate(fixture,{from:2026,timeOfDay:"evening"}).matches,1);
assert.throws(()=>aggregate({...fixture,version:2}),/Unsupported/);
console.log("PASS: venue snapshots, alias totals, filters, pooled rates, null samples and completed-over curves");

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { officialRelease, officialReleaseSchema, buildOfficialRoom, resolvePurse, compareFrozen } from "../src/services/retention/official";
import { readLedger } from "../src/services/retention/ledger";
import { getSnapshot } from "../src/services/intelligence/service";
import { getProjectRoot } from "../src/services/decision/db";
import { TEAMS } from "../src/services/intelligence/schema";
import type { FrozenPayload } from "../src/services/retention/service";

const ledger=readLedger().entries;
const snapshot=getSnapshot();
const room=(team:typeof TEAMS[number])=>buildOfficialRoom(team,officialRelease,ledger,snapshot);

test("all ten teams have complete, idempotent decision overlays",()=>{
  assert.equal(officialRelease.teams.length,10);
  for(const team of TEAMS){const r=room(team);assert.ok(r.summary.retained>0);assert.equal(r.summary.retained+r.summary.slots,25);assert.equal(new Set(r.players.map(p=>p.id)).size,r.players.length);assert.deepEqual(r,room(team));}
});
test("a player cannot be retained twice or both retained and released",()=>{
  const duplicate=structuredClone(officialRelease);duplicate.teams[0].released.push(duplicate.teams[0].retained[0]);assert.equal(officialReleaseSchema.safeParse(duplicate).success,false);
  const twoTeams=structuredClone(officialRelease);twoTeams.teams[1].retained.push(twoTeams.teams[0].retained[0]);assert.equal(officialReleaseSchema.safeParse(twoTeams).success,false);
});
test("unknown source ids and unresolved identities cannot masquerade as verified statistics",()=>{
  const bad=structuredClone(officialRelease);bad.teams[0].retainedSources=["invented"];assert.equal(officialReleaseSchema.safeParse(bad).success,false);
  const p=room("GT").players.find(p=>p.name==="Prithviraj Yarra")!;assert.equal(p.canonicalId,null);assert.equal(p.performance,null);assert.equal(p.identityStatus,"unresolved");
});
test("all completed trades have symmetric outgoing/incoming records, without duplicate releases",()=>{
  const rooms=TEAMS.map(room);
  for(const r of rooms)for(const p of r.players.filter(p=>p.decision==="traded_out")){
    const target=rooms.find(r=>r.team===p.trade!.to)!;const incoming=target.players.filter(q=>q.id===p.id);assert.equal(incoming.length,1);assert.equal(incoming[0].decision,"traded_in");assert.equal(incoming[0].contractLakh,p.contractLakh);assert.equal(p.verification,"verified");
  }
  assert.equal(room("MI").players.find(p=>p.name==="Hardik Pandya")?.decision,"traded_out");
  assert.equal(room("PBKS").players.find(p=>p.name==="Vishnu Vinod")?.decision,"retained");
  assert.equal(room("GT").players.find(p=>p.name==="Harshal Patel")?.contractLakh,400);
});
test("financial conflicts are retained; only primary verified amounts feed auction initialization",()=>{
  const csk=room("CSK"),gt=room("GT"),rr=room("RR");
  assert.equal(csk.purse.status,"conflict");assert.equal(csk.purse.valueLakh,null);assert.equal(csk.auction.purseLakh,null);
  assert.equal(gt.purse.status,"conflict");assert.equal(rr.purse.status,"verified");assert.equal(rr.purse.valueLakh,2705);assert.equal(rr.purse.hasDisagreement,true);
  assert.equal(room("MI").purse.status,"reported");assert.equal(room("MI").auction.purseLakh,null);
  assert.equal(resolvePurse([]).status,"unavailable");
  assert.ok(room("RCB").players.filter(p=>p.decision==="retained").every(p=>p.contractLakh===null));
});
test("official retained/released decisions keep source status and current availability",()=>{
  const rr=room("RR");assert.equal(rr.status,"verified");assert.equal(rr.summary.retained,19);assert.equal(rr.summary.released,9);assert.equal(rr.summary.tradedOut,1);
  assert.equal(room("CSK").status,"partial");assert.equal(room("DC").players.find(p=>p.name==="Mitchell Starc")?.availability.status,"unavailable");
  assert.equal(room("RCB").players.find(p=>p.name==="Jacob Bethell")?.availability.status,"uncertain");
});
test("composition and nationality reconcile with the active squad, not the 2026 roster",()=>{
  for(const team of TEAMS){const r=room(team);assert.equal(r.composition.reduce((n,g)=>n+g.count,0),r.summary.retained);assert.equal(r.summary.indian+r.summary.overseas+r.summary.unknownNationality,r.summary.retained);if(!r.summary.unknownNationality)assert.equal(r.summary.overseas+r.summary.overseasSlots!,8);}
});
test("Scout handoffs use the existing team's role, discipline and phase contracts",()=>{
  for(const team of TEAMS)for(const n of room(team).needs){const url=new URL(n.scoutUrl,"http://localhost");assert.equal(url.pathname,"/pressurelab/results");assert.equal(url.searchParams.get("team"),team.toLowerCase());assert.equal(url.searchParams.get("recentSeasons"),"3");const bowling=url.searchParams.get("discipline")==="bowling";assert.ok((bowling?["powerplay_specialist","middle_specialist","death_specialist"]:["opener","middle_order","finisher"]).includes(url.searchParams.get("role")!));}
});
test("no auction eligibility is inferred from release, retirement or a historical contract",()=>{
  for(const team of TEAMS){const r=room(team);assert.equal(r.auction.registeredPool.length,0);assert.ok(r.players.every(p=>p.auctionEligibility==="unverified"));}
});
test("only intact pre-announcement freezes score, with trades and reported rows excluded",()=>{
  const r=room("RR");const kept=r.players.find(p=>p.decision==="retained")!,gone=r.players.find(p=>p.decision==="released")!;
  const payload={season:2027,teams:[{team:"RR",picks:[{id:kept.id,recommendation:"retain",category:"Retain"},{id:gone.id,recommendation:"retain",category:"Retain"}]}]} as FrozenPayload;
  const scored=compareFrozen(r,payload,Date.parse("2026-11-15T12:00:00Z"),true);assert.equal(scored.eligible,true);assert.equal(scored.scored,2);assert.equal(scored.counts.correct_retain,1);assert.equal(scored.counts.disagreement,1);assert.equal(scored.accuracy,50);
  for(const result of [compareFrozen(r,payload,Date.parse("2026-11-17T19:00:00Z"),true),compareFrozen(r,payload,Date.parse("2026-11-15T12:00:00Z"),false),compareFrozen(r,null,null,false)]){assert.equal(result.accuracy,null);assert.equal(result.eligible,false);}
  assert.ok(compareFrozen(room("CSK"),payload,Date.parse("2026-11-15T12:00:00Z"),true).counts.unverified>0);
});
test("serving official records leaves historical snapshots and source data unchanged",()=>{
  const files=["artifacts/api-server/data/intelligence/current.json","artifacts/api-server/data/intelligence/cf-intel-2026.e526fafa43/snapshot.json","artifacts/api-server/data/player-auctions.json"];
  const hash=(f:string)=>createHash("sha256").update(fs.readFileSync(path.join(getProjectRoot(),f))).digest("hex");
  const before=files.map(hash);TEAMS.forEach(room);assert.deepEqual(files.map(hash),before);
});

test("Gujarat release confirmation only covers the five names in the franchise announcement", () => {
  const releases = room("GT").players.filter(p => p.decision === "released");
  assert.equal(releases.filter(p => p.verification === "verified").length, 5);
  assert.equal(releases.find(p => p.name === "Prithviraj Yarra")?.verification, "reported");
});

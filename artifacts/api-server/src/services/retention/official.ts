// A versioned decision overlay. It never changes the historical warehouse, model
// snapshot, ballots or frozen predictions. Statistics still come from getSnapshot.
import { z } from "zod";
import releaseJson from "../../../data/retention/official-2027.json";
import { getSnapshot, type Snapshot, type SnapshotPlayer } from "../intelligence/service";
import { TEAMS, type Team } from "../intelligence/schema";
import { readLedger, SQUAD_CHANGING, type LedgerEntry } from "./ledger";
import { freezePayload, listFreezes } from "./store";
import type { FrozenPayload } from "./service";

const sourceSchema = z.object({ publisher: z.string(), official: z.boolean(), url: z.string().url(), publishedOn: z.string() });
const identitySchema = z.object({ canonicalId: z.string().nullable(), country: z.string().nullable(), overseas: z.boolean().nullable(), role: z.string().nullable(), bowlingStyle: z.string().nullable() });
export const officialReleaseSchema = z.object({
  version: z.string(), season: z.number().int(), announcedOn: z.string(), reviewedAt: z.string().datetime(), comparisonCutoff: z.string().datetime(),
  sources: z.record(sourceSchema), aliases: z.record(z.string()), identities: z.record(identitySchema),
  teams: z.array(z.object({ team: z.enum(TEAMS), retained: z.array(z.string()), contracts: z.record(z.number().nonnegative()).optional(), released: z.array(z.string()), retainedSources: z.array(z.string()).min(1), releasedSources: z.array(z.string()).min(1), releaseSourceOverrides: z.record(z.array(z.string()).min(1)).optional(), purseClaims: z.array(z.object({ valueLakh: z.number().nonnegative(), source: z.string() })), overseasSlots: z.number().int().min(0).max(8), notes: z.array(z.string()) })),
  availability: z.array(z.object({ name: z.string(), status: z.enum(["retired", "unavailable", "uncertain"]), note: z.string(), sources: z.array(z.string()) })),
  auctionRegistrations: z.array(z.object({ canonicalId: z.string(), source: z.string(), basePriceLakh: z.number().positive() })), notes: z.array(z.string()),
}).superRefine((d, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (d.teams.length !== TEAMS.length || new Set(d.teams.map(t => t.team)).size !== TEAMS.length) fail("Exactly ten distinct franchises are required");
  const owners = new Set<string>();
  for (const t of d.teams) {
    const seen = new Set<string>();
    for (const name of [...t.retained, ...t.released]) {
      const key = d.identities[name]?.canonicalId ?? name;
      if (seen.has(key)) fail(`${t.team}: duplicate or conflicting decision for ${name}`);
      seen.add(key);
      if (!d.identities[name]) fail(`Missing identity review for ${name}`);
    }
    for (const name of t.retained) {
      const id = d.identities[name]?.canonicalId ?? name;
      if (owners.has(id)) fail(`Retained by more than one franchise: ${name}`);
      owners.add(id);
    }
    for (const [name, ids] of Object.entries(t.releaseSourceOverrides ?? {})) {
      if (!t.released.includes(name) || ids.some(id => !d.sources[id])) fail(`Invalid release sources for ${name}`);
    }
    if (t.retained.length > 25) fail(`${t.team}: retained squad exceeds 25`);
    for (const id of [...t.retainedSources, ...t.releasedSources, ...t.purseClaims.map(p => p.source)]) if (!d.sources[id]) fail(`Unknown source ${id}`);
  }
  for (const a of [...d.availability, ...d.auctionRegistrations.map(r => ({sources:[r.source]}))]) for (const id of a.sources) if (!d.sources[id]) fail(`Unknown source ${id}`);
});
export type OfficialRelease = z.infer<typeof officialReleaseSchema>;
export const officialRelease = officialReleaseSchema.parse(releaseJson);
export type Verification = "verified" | "reported" | "conflict" | "unavailable";

export function resolvePurse(claims: OfficialRelease["teams"][number]["purseClaims"], sources = officialRelease.sources) {
  const official = claims.filter(c => sources[c.source]?.official);
  const preferred = official.length ? official : claims;
  const distinct = new Set(preferred.map(c => c.valueLakh));
  const status: Verification = !preferred.length ? "unavailable" : distinct.size > 1 ? "conflict" : official.length ? "verified" : "reported";
  return { valueLakh: status === "conflict" || status === "unavailable" ? null : preferred[0].valueLakh, status, claims: claims.map(c => ({...c, source: sources[c.source]})), hasDisagreement: new Set(claims.map(c => c.valueLakh)).size > 1 };
}
export function scoutLink(team: string, role: string, phase = "all", discipline = "batting") {
  const p = new URLSearchParams({team:team.toLowerCase(),preset:role === "finisher" ? "finisher" : discipline === "bowling" ? "pace" : "search",discipline,phase,minBalls:"60",recentSeasons:"3"});
  if (role) p.set("role",role);
  return `/pressurelab/results?${p}`;
}
const canonical = (name: string, data: OfficialRelease) => data.identities[name]?.canonicalId ?? data.aliases[name] ?? null;
const verification = (ids: string[], data: OfficialRelease): Verification => ids.some(id=>data.sources[id]?.official) ? "verified" : "reported";
function group(p?: SnapshotPlayer, role?: string | null, style?: string | null) {
  const r = p?.role ?? role;
  if (r === "wicketkeeper" || /keeper/i.test(r ?? "")) return "wicketkeeper";
  if (r === "all-rounder" || /allround|all.round/i.test(r ?? "")) return "all-rounder";
  if (r === "batter" || /batsman/i.test(r ?? "")) return "batter";
  if (p?.candidate.bowlingType === "spin" || /spin|break|orthodox/i.test(style ?? "")) return "spin";
  if (p?.candidate.bowlingType === "pace" || /pace|fast|medium/i.test(style ?? "")) return "pace";
  return r === "bowler" ? "bowler" : "unknown";
}

/** Pure assembly is also exercised with fixtures. Serving does not rebuild a model. */
export function buildOfficialRoom(team: Team, data: OfficialRelease, ledger: LedgerEntry[], snapshot: Snapshot | null) {
  const t = data.teams.find(t=>t.team === team)!;
  const src = (ids: string[]) => ids.map(id=>data.sources[id]);
  const moves = ledger.filter(e=>e.id.startsWith(`${data.season}-`) && SQUAD_CHANGING.has(e.status) && e.sources.some(s=>s.official)).flatMap(e=>e.moves.map(m=>({...m,id:e.id,sources:e.sources.filter(s=>s.official),announcedOn:e.announcedOn,canonicalId:canonical(m.player,data)})));
  const byId = new Map(snapshot?.players.map(p=>[p.id,p]) ?? []);
  const records = [
    ...t.retained.map(name=>({name,decision:"retained" as const,ids:t.retainedSources})),
    ...t.released.map(name=>({name,decision:"released" as const,ids:t.releaseSourceOverrides?.[name] ?? t.releasedSources})),
    ...moves.filter(m=>m.from === team).map(m=>({name:m.player,decision:"traded_out" as const,ids:[] as string[]})),
  ];
  const players = records.map(r=>{
    const id = canonical(r.name,data), identity = data.identities[r.name];
    const p = id ? byId.get(id) : undefined;
    const trade = moves.find(m=>(id ? m.canonicalId === id : m.player === r.name) && (r.decision === "traded_out" ? m.from === team : m.to === team));
    const decision = trade && r.decision === "retained" ? "traded_in" : r.decision;
    const sources = trade ? trade.sources : src(r.ids);
    const availability = data.availability.find(a=>canonical(a.name,data) === id && id !== null || a.name === r.name);
    const g = group(p,identity?.role,identity?.bowlingStyle);
    const battingSlot = p?.candidate.battingSlot;
    const phaseBalls = p?.retentionV2?.seasons.reduce((a,s)=>a.map((v,i)=>v+(s.phaseBallsBowled[i]??0)),[0,0,0]) ?? [0,0,0];
    const bowling = g === "pace" || g === "spin" || g === "bowler";
    const phase = bowling ? (phaseBalls[2] >= 120 && phaseBalls[2] >= phaseBalls[0] ? "death" : g === "spin" ? "middle" : "powerplay") : battingSlot === "finish" ? "death" : "all";
    const scoutRole = bowling ? `${phase === "powerplay" ? "powerplay" : phase === "death" ? "death" : "middle"}_specialist` : battingSlot === "top" ? "opener" : battingSlot === "finish" ? "finisher" : "middle_order";
    return {
      id:id ?? `unresolved:${r.name}`,canonicalId:id,name:r.name,identityStatus:id ? "matched" : "unresolved",team,decision,
      verification:trade ? "verified" as Verification : verification(r.ids,data),announcedOn:trade?.announcedOn ?? data.announcedOn,sources,
      role:p?.role ?? identity?.role ?? null,group:g,country:identity?.country ?? null,overseas:identity?.overseas ?? p?.overseas ?? null,
      contractLakh:t.contracts?.[r.name] ?? trade?.feeLakh ?? (decision === "retained" || decision === "traded_in" ? p?.contractLakh ?? null : null),contractStatus:t.contracts?.[r.name] != null || trade?.feeLakh != null ? "verified" : (decision === "retained" || decision === "traded_in") && p?.contractLakh != null ? "carried_forward" : "unavailable",historicalContractLakh:p?.contractLakh ?? null,
      trade:trade ? {from:trade.from,to:trade.to,feeLakh:trade.feeLakh} : null,
      availability:availability ? {...availability,sources:src(availability.sources),verification:verification(availability.sources,data)} : {status:"unknown",note:"Availability has not been verified.",sources:[],verification:"unavailable"},
      performance:p?.retentionV2 ? {seasons:p.retentionV2.seasons.filter(s=>s.season>=2024),projection:p.retentionV2.projection,phase:p.performance,dataCutoff:snapshot!.dataCutoff,modelVersion:snapshot!.version} : null,
      scoutUrl:scoutLink(team,scoutRole,phase,bowling ? "bowling" : "batting"),
      auctionEligibility:data.auctionRegistrations.some(a=>a.canonicalId === id && data.sources[a.source]?.official) && (!availability || availability.status === "uncertain") ? "registered" : "unverified",
    };
  });
  const squad = players.filter(p=>p.decision === "retained" || p.decision === "traded_in");
  const groups = ["batter","wicketkeeper","all-rounder","pace","spin","bowler","unknown"].map(key=>({key,count:squad.filter(p=>p.group===key).length}));
  const outgoing = players.filter(p=>p.decision === "released" || p.decision === "traded_out");
  const needs = groups.filter(g=>outgoing.some(p=>p.group===g.key)).map(g=>{
    const lost = outgoing.filter(p=>p.group===g.key), evidence=lost.map(p=>({name:p.name,decision:p.decision,verification:p.verification}));
    return {role:g.key,remaining:g.count,departures:lost.length,priority:g.count===0 ? "high" : "review",evidence,scoutUrl:lost[0].scoutUrl,note:`${lost.length} departure${lost.length===1?"":"s"}; ${g.count} player${g.count===1?"":"s"} remain in this role group. Review coverage before recruiting.`};
  });
  const purse=resolvePurse(t.purseClaims,data.sources);
  const retainedAnywhere=new Set(data.teams.flatMap(t=>t.retained.map(name=>canonical(name,data))).filter(Boolean));
  const unavailable=new Set(data.availability.filter(a=>a.status!=="uncertain").map(a=>canonical(a.name,data)).filter(Boolean));
  const registeredPool=data.auctionRegistrations.filter(p=>data.sources[p.source]?.official && !retainedAnywhere.has(p.canonicalId) && !unavailable.has(p.canonicalId));
  const unknownNationality=squad.filter(p=>p.overseas===null).length;
  const verified=squad.every(p=>p.verification==="verified");
  return {season:data.season,team,version:data.version,announcedOn:data.announcedOn,reviewedAt:data.reviewedAt,
    status:verified && outgoing.every(p=>p.verification==="verified") ? "verified" : "partial",players,composition:groups,
    summary:{retained:squad.length,released:players.filter(p=>p.decision==="released").length,tradedIn:players.filter(p=>p.decision==="traded_in").length,tradedOut:players.filter(p=>p.decision==="traded_out").length,indian:squad.filter(p=>p.overseas===false).length,overseas:squad.filter(p=>p.overseas===true).length,unknownNationality,slots:25-squad.length,overseasSlots:unknownNationality ? null : 8-squad.filter(p=>p.overseas===true).length,reportedOverseasSlots:t.overseasSlots,slotBasis:"Maximum squad 25, overseas 8; current-cycle reported limits.",verifiedDecisions:players.filter(p=>p.verification==="verified").length},
    purse,needs,notes:[...t.notes,...data.notes],sources:[...new Map([...src([...t.retainedSources,...t.releasedSources,...t.purseClaims.map(p=>p.source)]),...players.flatMap(p=>p.sources)].map(s=>[s.url,s])).values()],
    auction:{canInitialize:verified && purse.status==="verified" && !unknownNationality && squad.every(p=>p.canonicalId!==null) && registeredPool.length>0,purseLakh:purse.status==="verified"?purse.valueLakh:null,retainedIds:squad.filter(p=>p.verification==="verified" && p.canonicalId).map(p=>p.canonicalId!),registeredPool,note:"Released players enter an auction pool only after official registration is verified."},
  };
}
export function officialRoom(season:number,team:Team) {
  return season===officialRelease.season ? buildOfficialRoom(team,officialRelease,readLedger().entries,getSnapshot()) : null;
}
export function officialLeague(season:number) {
  if(season!==officialRelease.season) return null;
  const ledger=readLedger().entries,snapshot=getSnapshot();
  return {season,version:officialRelease.version,announcedOn:officialRelease.announcedOn,reviewedAt:officialRelease.reviewedAt,teams:TEAMS.map(team=>{const r=buildOfficialRoom(team,officialRelease,ledger,snapshot);return {team,status:r.status,summary:r.summary,purse:r.purse};})};
}

export function compareFrozen(room: ReturnType<typeof buildOfficialRoom>, payload: FrozenPayload | null, frozenAt: number | null, intact:boolean, cutoff=officialRelease.comparisonCutoff) {
  const eligible=Boolean(payload && frozenAt && intact && frozenAt<Date.parse(cutoff) && payload.season===room.season);
  const frozen=eligible ? payload!.teams.find(t=>t.team===room.team)?.picks ?? [] : [];
  const rows=room.players.map(p=>{
    const prediction=frozen.find(f=>f.id===p.canonicalId);
    const status=!eligible ? "unscored" : p.verification!=="verified" ? "unverified" : p.decision.startsWith("traded_") ? "unscored" : !prediction || !["retain","release"].includes(prediction.recommendation) ? "unscored" : (prediction.recommendation==="retain") === (p.decision==="retained") ? p.decision==="retained" ? "correct_retain" : "correct_release" : "disagreement";
    return {id:p.id,name:p.name,decision:p.decision,prediction:prediction?.recommendation ?? null,category:prediction?.category ?? null,status};
  });
  const counts=Object.fromEntries(["correct_retain","correct_release","disagreement","unverified","unscored"].map(s=>[s,rows.filter(r=>r.status===s).length]));
  const scored=counts.correct_retain+counts.correct_release+counts.disagreement;
  return {eligible,frozenAt:eligible ? new Date(frozenAt!).toISOString() : null,cutoff,counts,scored,accuracy:scored?Math.round((counts.correct_retain+counts.correct_release)/scored*1000)/10:null,rows,note:eligible?"Only verified retain/release decisions are scored. Trades, undecided calls and reported records are excluded.":"No intact prediction snapshot from before the announcement cutoff is available. Accuracy is not calculated."};
}
export function officialComparison(season:number,team:Team) {
  const room=officialRoom(season,team);if(!room)return null;
  const eligible=listFreezes(season).filter(f=>f.frozenAt<Date.parse(officialRelease.comparisonCutoff)).map(f=>freezePayload(f.id)).find(f=>f?.intact);
  return compareFrozen(room,eligible?.payload as FrozenPayload ?? null,eligible?.row.frozenAt ?? null,eligible?.intact ?? false);
}

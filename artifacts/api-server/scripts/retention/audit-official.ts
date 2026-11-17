import fs from 'node:fs';
import { getRegistry, lookupPlayer } from '../../src/services/intelligence/identity';
import { getSnapshot } from '../../src/services/intelligence/service';
import release from '../../data/retention/official-2027.json';
const reg = getRegistry();
const names = [...new Set(release.teams.flatMap(t => [...t.retained, ...t.released]))];
const missing = names.map(name => ({ name, lookup: lookupPlayer(name) })).filter(x => !x.lookup.player);
const aliases: Record<string,string> = { 'Sahil Parakh':'cs:926c7443', 'Blessing Muzarabani':'cs:449f4e3c', 'George Linde':'cs:e5437608', 'Mohammed Izhar':'sq:mohammad-izhar|india', 'Aman Rao Perala':'sq:aman-rao|india', 'David Payne':'cs:6c79c098' };
const identities = Object.fromEntries(names.map(name => {
  const p = lookupPlayer(aliases[name] ?? name).player;
  return [name, { canonicalId:p?.canonicalId ?? null, country:p?.country ?? null, overseas:p?.overseas ?? null, role:p?.role ?? null, bowlingStyle:p?.bowlingStyle ?? null }];
}));
if (process.argv.includes('--write-identities')) {
  fs.writeFileSync(new URL('../../data/retention/official-2027.json',import.meta.url), JSON.stringify({...release,aliases,identities},null,2)+'\n');
}
console.log(JSON.stringify({names:names.length, unresolved:Object.entries(identities).filter(([,p])=>!p.canonicalId), candidateNames:[...reg.byCanonical.values()].filter(p=>/prithviraj/i.test(p.name)).map(p=>({id:p.canonicalId,name:p.name})), duplicateIds:Object.entries(identities).filter(([name,p],i,a)=>p.canonicalId&&a.findIndex(([,q])=>q.canonicalId===p.canonicalId)!==i),snapshot:getSnapshot()?.version},null,2));

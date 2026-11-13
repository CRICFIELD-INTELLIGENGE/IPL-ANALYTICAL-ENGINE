/** Rebuild a disposable Scout Lab warehouse using validated Cricsheet archives. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { all, openGlobalDb, transaction } from "../global/db";
import { Ingestor, refreshSeasons } from "../global/normalize";
import { listEntries, readEntries } from "../global/zip";
import { aggregate } from "../global/aggregate";
import { buildCompetitionRoles } from "./roles";

const [baseline, expanded, ipl, output, ...archives] = process.argv.slice(2).map(x => path.resolve(x));
if (!baseline || !expanded || !ipl || !output || !archives.length) {
  throw new Error("Usage: reconcile.ts GLOBAL_DB EXPANDED_DB IPL_DB NEW_DB CRICSHEET_ZIP...");
}
if (fs.existsSync(output)) throw new Error("Staging output already exists. Choose a new filename.");
const original = new DatabaseSync(baseline, { readOnly: true });
const source = new DatabaseSync(expanded, { readOnly: true });
const iplDb = new DatabaseSync(ipl, { readOnly: true });
const counts = (db: DatabaseSync) => Object.fromEntries(["players","matches","deliveries"].map(t =>
  [t, (db.prepare("SELECT count(*) n FROM " + t).get() as {n:number}).n]));
const inventory = { original: counts(original), expanded: counts(source), ipl: counts(iplDb) };
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(path.join(path.dirname(output), "warehouse_inventory.json"), JSON.stringify(inventory, null, 2));
await backup(original, output);
const db = openGlobalDb(output);
const raw = new Ingestor(db);
const previous = new Map(all<{match_id:number;start_date:string;code:string}>(db,
  "SELECT match_id,start_date,code FROM matches JOIN competitions USING(competition_id)").map(r=>[r.match_id,r]));
const candidates = new Map(all<{
  match_id:number;code:string;competition_name:string;format:string;match_date:string;
  match_end_date:string;competition_type:string;
}>(source,"SELECT * FROM matches").map(r=>[r.match_id,r]));
const overlap = [...candidates.values()].filter(r=>previous.has(r.match_id));
const conflicts = overlap.filter(r => {
  const old=previous.get(r.match_id)!;
  return old.code!==r.code || old.start_date!==r.match_date;
});
if (conflicts.length) throw new Error("Conflicting source match IDs: " + JSON.stringify(conflicts));
const iplIds = new Set(all<{match_id:number}>(iplDb,"SELECT match_id FROM matches").map(r=>String(r.match_id)));
const iplOverlap = [...previous.values()].filter(r=>r.code==="ipl" && iplIds.has(String(r.match_id))).length;
if (iplOverlap !== iplIds.size) throw new Error("IPL release has unmatched match IDs; reconcile before publishing.");
const changed = new Map<string,number>();
const imported = new Set<number>();
db.exec("CREATE TABLE scout_merge_audit (source_match_id INTEGER PRIMARY KEY, competition_code TEXT NOT NULL, action TEXT NOT NULL, evidence TEXT NOT NULL)");
const audit = db.prepare("INSERT INTO scout_merge_audit VALUES (?,?,?,?)");
const comps = db.prepare("INSERT INTO competitions(code,name,format,gender,team_type,source,source_slug) VALUES(?,?,?,'male',?,'cricsheet','yearly_json') ON CONFLICT(code) DO NOTHING");
const find = db.prepare("SELECT competition_id,format FROM competitions WHERE code=?");
const archiveInsert = db.prepare("INSERT OR IGNORE INTO source_files(kind,source_key,url,path,sha256,bytes,retrieved_at,entries) VALUES('archive',?,?,?,?,?,?,?)");
const archiveId = db.prepare("SELECT source_file_id FROM source_files WHERE sha256=?");
transaction(db, () => {
  for(const r of overlap) audit.run(r.match_id,r.code,"overlap_preserved","Cricsheet ID, competition and start date agree");
  for(const file of archives){
    const bytes=fs.readFileSync(file);
    const name=path.basename(file);
    if(!/^\d{4}_male_json\.zip$/.test(name)) throw new Error("Expected a Cricsheet annual male JSON archive");
    const names=listEntries(bytes).map(e=>e.name).filter(n=>/^\d+\.json$/.test(n));
    const sha=createHash("sha256").update(bytes).digest("hex");
    archiveInsert.run(name.slice(0,-4),"https://cricsheet.org/downloads/"+name,name,sha,bytes.length,fs.statSync(file).mtime.toISOString(),names.length);
    const sid=(archiveId.get(sha) as {source_file_id:number}).source_file_id;
    const wanted=names.filter(n=>{
      const id=Number(n.slice(0,-5));
      return candidates.has(id) && !previous.has(id) && !imported.has(id);
    });
    for(const {entry,data} of readEntries(bytes,wanted)){
      const id=Number(entry.name.slice(0,-5));
      const r=candidates.get(id)!;
      const doc=JSON.parse(Buffer.from(data).toString("utf8"));
      if (doc.info.gender!=="male" || doc.info.dates[0]!==r.match_date || doc.info.dates.at(-1)!==r.match_end_date
          || r.match_date<"2024-01-01" || r.match_end_date>"2026-11-13") throw new Error("Raw fixture disagreement: "+id);
      comps.run(r.code,r.competition_name,r.format,r.competition_type);
      const c=find.get(r.code) as {competition_id:number;format:string};
      if(c.format!==r.format) throw new Error("Competition format disagreement: "+id);
      raw.ingestMatch({id:c.competition_id,code:r.code},sid,id,entry.crc32,doc);
      changed.set(r.code,c.competition_id);
      imported.add(id);
      audit.run(id,r.code,"imported",name+" SHA-256 "+sha);
    }
  }
  for(const r of candidates.values()){
    if(!previous.has(r.match_id) && !imported.has(r.match_id)) audit.run(r.match_id,r.code,"source_missing","Raw archive entry unavailable");
  }
  for(const id of changed.values()) refreshSeasons(db,id);
});
aggregate(db,new Set(changed.keys()));
for(const id of changed.values()) buildCompetitionRoles(db,id);
if (db.prepare("PRAGMA integrity_check").get()?.integrity_check!=="ok") throw new Error("Warehouse integrity check failed");
for(const row of all<{player_key:number;cricsheet_id:string}>(original,"SELECT player_key,cricsheet_id FROM players")){
  if(db.prepare("SELECT cricsheet_id FROM players WHERE player_key=?").get(row.player_key)?.cricsheet_id!==row.cricsheet_id) {
    throw new Error("Existing player ID changed: "+row.player_key);
  }
}
const merged = { ...inventory, reconciled:counts(db), expandedOverlap:overlap.length, iplOverlap, newMatches:imported.size,
  unavailableExpanded:[...candidates.keys()].filter(id=>!previous.has(id)&&!imported.has(id)).length };
fs.writeFileSync(path.join(path.dirname(output),"warehouse_inventory.json"),JSON.stringify(merged,null,2));
db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
db.close(); original.close(); source.close(); iplDb.close();
console.log(merged);

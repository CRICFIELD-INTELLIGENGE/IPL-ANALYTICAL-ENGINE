"""Export stable warehouse identities and review-only duplicate groups."""
from pathlib import Path
import sqlite3,csv,json,re,unicodedata,collections,zipfile,datetime
root=Path(__file__).resolve().parents[1];out=root/'exports/player-bio-handoff';out.mkdir(parents=True,exist_ok=True)
c=sqlite3.connect((root/'lib/cricket-data/global/warehouse/global.db').as_uri()+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
players=[dict(r) for r in c.execute('SELECT player_key,cricsheet_id,name,unique_name,in_register FROM players ORDER BY player_key')]
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s or '').encode('ascii','ignore').decode().lower())
def write(name,fields,rows):
 with (out/name).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
sourceids=collections.defaultdict(lambda:collections.defaultdict(list));aliases=collections.defaultdict(list)
for r in c.execute('select player_key,source,source_id from player_source_ids'):sourceids[r['player_key']][r['source']].append(r['source_id'])
for r in c.execute('select player_key,name from player_names'):aliases[r['player_key']].append(r['name'])
attrs=collections.defaultdict(lambda:collections.defaultdict(list))
for r in c.execute('select player_key,attribute,value,source,confidence from player_attributes'):
 attrs[r['player_key']][r['attribute']].append({'value':r['value'],'source':r['source'],'confidence':r['confidence']})
allrows=[]
for p in players:
 pk=p['player_key'];allrows.append({**p,'display_name':p['unique_name'] or p['name'],'aliases':' | '.join(sorted(set(aliases[pk]))),'cricinfo_ids':' | '.join(sourceids[pk]['cricinfo']),'cricbuzz_ids':' | '.join(sourceids[pk]['cricbuzz']),'bcci_ids':' | '.join(sourceids[pk]['bcci']),'existing_metadata_json':json.dumps(attrs[pk],ensure_ascii=False)})
fields=['player_key','cricsheet_id','display_name','name','unique_name','in_register','aliases','cricinfo_ids','cricbuzz_ids','bcci_ids','existing_metadata_json'];write('all-players-18623.csv',fields,allrows)
duplicates=[];group_counts={}
for kind,keyfn in [('same_cricsheet_id',lambda p:p['cricsheet_id']),('same_display_name_normalized',lambda p:norm(p['display_name'])),('same_raw_name_normalized',lambda p:norm(p['name']))]:
 groups=collections.defaultdict(list)
 for p in allrows:
  key=keyfn(p)
  if key:groups[key].append(p)
 groups={key:rows for key,rows in groups.items() if len(rows)>1};group_counts[kind]=len(groups)
 for key,rows in groups.items():
  for p in rows:duplicates.append({'duplicate_type':kind,'group_key':key,'group_size':len(rows),'player_key':p['player_key'],'cricsheet_id':p['cricsheet_id'],'display_name':p['display_name'],'action':'Review identity; DO NOT auto-merge'})
shared=collections.defaultdict(set)
for r in c.execute('select player_key,source,source_id from player_source_ids'):shared[(r['source'],r['source_id'])].add(r['player_key'])
lookup={p['player_key']:p for p in allrows};collisions={k:v for k,v in shared.items() if len(v)>1};group_counts['shared_external_source_id']=len(collisions)
for (source,sid),keys in collisions.items():
 for pk in sorted(keys):duplicates.append({'duplicate_type':'shared_external_source_id','group_key':source+':'+sid,'group_size':len(keys),'player_key':pk,'cricsheet_id':lookup[pk]['cricsheet_id'],'display_name':lookup[pk]['display_name'],'action':'Review external ID collision; DO NOT auto-merge'})
write('duplicate-review.csv',['duplicate_type','group_key','group_size','player_key','cricsheet_id','display_name','action'],duplicates)
# Blank verified-data fields avoid turning existing unreviewed values into apparent facts.
biofields=['player_key','cricsheet_id','display_name','cricinfo_ids','cricbuzz_ids','playing_country','citizenship','date_of_birth','declared_role','batting_hand','bowling_arm','bowling_style','playing_status','retirement_scope','retirement_date','ipl_2027_registration_status','previous_ipl_team','retention_2027_status','source_urls','source_checked_date','confidence','unresolved_notes']
biorows=[{k:p.get(k,'') for k in biofields} for p in allrows];write('bio-return-template.csv',biofields,biorows)
(out/'batches').mkdir(exist_ok=True)
for i in range(0,len(biorows),250):write(f'batches/players-{i//250+1:03d}.csv',biofields,biorows[i:i+250])
summary={'player_count':len(players),'distinct_player_keys':len({p['player_key'] for p in players}),'distinct_cricsheet_ids':len({p['cricsheet_id'] for p in players}),'duplicate_group_counts':group_counts,'duplicate_review_rows':len(duplicates),'bio_batches':(len(biorows)+249)//250,'database_modified':False,'note':'Name collisions are not confirmed duplicate people. No identities merged or removed.'}
(out/'duplicate-summary.json').write_text(json.dumps(summary,indent=2))
(out/'README.md').write_text('''# CricField player bio handoff

all-players-18623.csv is the complete identity export with existing metadata and confidence. bio-return-template.csv is the file to fill and return. batches contains 75 smaller CSV files, up to250 players each. duplicate-review.csv contains review candidates, not confirmed duplicate people. No database rows were removed or merged.

Keep player_key and cricsheet_id unchanged. These identify the exact warehouse person even when names repeat. Do not resolve initials or same-name players by guessing. Record source URLs and the date checked for each bio. Use Unknown for missing values; do not guess from names, birthplace, teams or league membership. Playing country and citizenship are separate. International retirement is not retirement from all cricket. Auction registration, contract availability and retention need dated official sources. Keep contradictory sources in unresolved_notes. Retention predictions are not official decisions.

Return the filled template or individual batches. We can import and enrich the warehouse by stable ID, validate conflicts and preserve evidence. This export is public player metadata and has not been encrypted.
''',encoding='utf-8')
(out/'RESEARCH_PROMPT.txt').write_text('''Research the attached cricket-player CSV using current accessible primary sources and reputable profiles. Return CSV with exactly the supplied columns and unchanged player_key/cricsheet_id. Keep one row per input ID. Verify the person's identity using supplied source IDs. Fill factual metadata only when supported by a cited source URL. Put Unknown when unavailable or ambiguous. Include source_urls and source_checked_date (YYYY-MM-DD). Do not infer nationality from name or team. Distinguish playing country, citizenship, and birthplace. Specify retirement scope (Test/ODI/T20I/IPL/all cricket). Do not interpret international retirement as franchise retirement. Only claim IPL2027 registration or retention with season-specific official evidence. For conflicting sources retain a note instead of choosing arbitrarily. Do not invent statistics, ages, eligibility or skills; do not replace missing facts with likely answers. If you cannot browse or verify a source, say so in unresolved_notes.
''',encoding='utf-8')
archive=root/'exports/cricfield-player-bio-handoff.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for p in out.rglob('*'):
  if p.is_file():z.write(p,p.relative_to(out))
print(json.dumps(summary,indent=2));print('archive',archive)

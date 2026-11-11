"""Join commentary labels to Cricsheet CSV innings only when delivery counts align."""
import csv,json,hashlib
from pathlib import Path
from collections import defaultdict
root=Path(__file__).resolve().parents[1];public=root/'artifacts/ipl-analytics/public/data';comment=json.loads((public/'ball-commentary.json').read_text());players=defaultdict(list);rejected=0
for file in (root/'ipl_csv').glob('*.csv'):
 rows=list(csv.reader(file.open(encoding='utf-8-sig')));groups=defaultdict(list);meta={}
 for row in rows:
  if row and row[0]=='ball':groups[int(row[1])].append(row)
  elif len(row)>2 and row[0]=='info':meta.setdefault(row[1],row[2])
 labels=comment['matches'].get(file.stem,[])
 for innings,balls in groups.items():
  encoded=labels[innings-1] if innings-1<len(labels) else []
  aligned=len(encoded)==len(balls)*6
  if encoded and not aligned:rejected+=1
  for i,row in enumerate(balls):
   fields={key:(comment['vocab'][key][encoded[i*6+j]] if aligned and encoded[i*6+j]>=0 else None) for j,key in enumerate(['length','line','variation','shot','contact','zone'])}
   players[row[4]].append({'id':f'{file.stem}-{innings}-{i+1}','ball':row[2],'sequence':i+1,'matchId':file.stem,'season':meta.get('season',''),'date':meta.get('date',''),'innings':innings,'over':int(float(row[2])),'bowler':row[6],'runs':int(row[7]),**fields})
out=public/'delivery-lab';out.mkdir(exist_ok=True);index={}
for name,balls in players.items():
 key=hashlib.sha256(name.encode()).hexdigest()[:16];index[name]={'file':key+'.json','balls':len(balls),'directionRecorded':sum(bool(b['zone']) for b in balls)};(out/(key+'.json')).write_text(json.dumps(balls,separators=(',',':')),encoding='utf-8')
(out/'index.json').write_text(json.dumps({'players':index,'source':'Cricsheet CSV + commentary-parsed labels','rejectedInnings':rejected},indent=2),encoding='utf-8');print('Players',len(index),'balls',sum(len(v) for v in players.values()),'rejected innings',rejected)

"""Audit player totals against exact-name match logs; repair confirmed 2026 partial snapshots."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1];base=root/'artifacts/ipl-analytics/public/data'
load=lambda name:json.loads((base/name).read_text(encoding='utf-8-sig'))
norm=lambda value:re.sub('[^a-z0-9]','',value.lower())
logs=load('player-recent-matches.json');lookup={norm(k):v for k,v in logs.items()};seasons=load('player-season-stats.json');audit=[];repairs={}
additive=['runs','balls','innings','matches','notOuts','fours','sixes','fifties','hundreds']
for row in seasons['batters']:
 records={str(m['matchId']):m for m in lookup.get(norm(row['player']),[]) if str(m['season'])==str(row['season'])};bat=[m['batting'] for m in records.values() if m.get('batting')];total=sum(m['runs'] for m in bat)
 if bat and (total!=row['runs'] or len(bat)!=row.get('innings')):
  audit.append({'player':row['player'],'season':row['season'],'storedRuns':row['runs'],'archiveRuns':total,'storedInnings':row.get('innings'),'archiveInnings':len(bat),'status':'review-required'})
  if str(row['season'])!='2026' or len(bat)<=row.get('innings',0) or total<=row['runs']:continue
  if norm(row['player']) not in [norm('Salil Arora'),norm('Ravi Singh')]:continue
  old=dict(row);new={**row,'runs':total,'balls':sum(x['balls'] for x in bat),'innings':len(bat),'matches':len(records),'notOuts':sum(bool(x.get('notOut')) for x in bat),'fours':sum(x.get('fours',0) for x in bat),'sixes':sum(x.get('sixes',0) for x in bat),'highest':max(x['runs'] for x in bat),'fifties':sum(50<=x['runs']<100 for x in bat),'hundreds':sum(x['runs']>=100 for x in bat)}
  new['sr']=round(new['runs']/new['balls']*100,2) if new['balls'] else 0;outs=new['innings']-new['notOuts'];new['avg']=round(new['runs']/outs,2) if outs else None;new['boundaryPct']=round((4*new['fours']+6*new['sixes'])/new['runs']*100,2) if new['runs'] else 0
  # Match scorecards contain no phase delivery splits; avoid publishing the old single-innings split as a season statistic.
  for key in ['ppSr','middleSr','deathSr']:new[key]=None
  repairs[row['player']]={'old':old,'new':new};row.update(new);audit[-1]['status']='repaired-from-match-archive'
if repairs:(base/'player-season-stats.json').write_text(json.dumps(seasons,indent=2),encoding='utf-8')
for file in ['top-batters.json','player-career-stats.json','player-team-stats.json','player-team-season-stats.json']:
 data=load(file)
 def repair(value):
  if isinstance(value,dict):
   name=value.get('player');r=repairs.get(name)
   if r and 'runs' in value and ('season' not in value or str(value['season'])=='2026'):
    old,new=r['old'],r['new']
    if 'season' in value:value.update({k:v for k,v in new.items() if k in value})
    else:
     for key in additive:
      if key in value:value[key]=value.get(key,0)-old.get(key,0)+new.get(key,0)
     value['highest']=max(value.get('highest',0),new['highest']);value['sr']=round(value['runs']/value['balls']*100,2) if value.get('balls') else 0;outs=value.get('innings',0)-value.get('notOuts',0);value['avg']=round(value['runs']/outs,2) if outs else None
     for key in ['ppSr','middleSr','deathSr']:
      if key in value:value[key]=None
    return
   for v in value.values():repair(v)
  elif isinstance(value,list):
   for v in value:repair(v)
 repair(data);(base/file).write_text(json.dumps(data,indent=2),encoding='utf-8')
out=root/'docs/data-repairs/player-total-audit.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(audit,indent=2),encoding='utf-8');print('Audited',len(seasons['batters']),'season records;',len(audit),'discrepancies;',len(repairs),'confirmed repairs');print(json.dumps({k:{'runs':v['new']['runs'],'innings':v['new']['innings'],'highest':v['new']['highest']} for k,v in repairs.items()}))

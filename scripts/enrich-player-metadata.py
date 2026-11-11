"""Source-linked player enrichment. Exact registry IDs only; resumable; no inferred citizenship/status."""
import argparse,csv,hashlib,json,re,sqlite3,time,urllib.request,urllib.error,unicodedata
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'lib/cricket-data/global/warehouse/global.db'
CACHE=ROOT/'lib/cricket-data/global/raw/player-metadata';CACHE.mkdir(parents=True,exist_ok=True)
def norm(value):return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower())
def parse_profile(html):
 soup=BeautifulSoup(html,'html.parser');person=None;headline=''
 for script in soup.find_all('script',type='application/ld+json'):
  try:
   data=json.loads(script.get_text());entity=data.get('mainEntity',{})
   if entity.get('type',entity.get('@type'))=='Person':person=entity;headline=data.get('name','');break
  except (ValueError,AttributeError):continue
 if not person or not person.get('name'):raise ValueError('profile_identity_missing')
 parts=headline.split(' - ');country=parts[-1] if len(parts)>=4 and parts[0]==person['name'] else None
 text=soup.get_text(' | ',strip=True);section=text.split('PERSONAL INFORMATION',1)[-1].split('ICC RANKING',1)[0]
 fields={}
 for label,attribute in [('Role','declared_role'),('Batting Style','batting_hand'),('Bowling Style','bowling_style')]:
  match=re.search(r'(?:^|\|\s*)'+label+r'\s*\|\s*([^|]+)',section)
  if match:fields[attribute]=match.group(1).strip()
 if country:fields['playing_country']=country;fields['nationality']=country
 return person['name'],fields

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--limit',type=int,default=50);args=ap.parse_args()
 conn=sqlite3.connect(DB);conn.execute('''CREATE TABLE IF NOT EXISTS metadata_source_ledger(source TEXT,source_key TEXT,player_key INTEGER,payload TEXT,identity_status TEXT,retrieved_at TEXT,PRIMARY KEY(source,source_key))''')
 report={'profiles_fetched':0,'profiles_cached':0,'profiles_failed':[],'profile_attributes':0,'auction_rows':0,'auction_linked':0,'auction_pending':0}
 def add(pk,attribute,value,url,evidence,confidence='source_id_exact'):
  normalized=('left' if re.search('left|^lhb$',value,re.I) else 'right' if re.search('right|^rhb$',value,re.I) else None) if attribute=='batting_hand' else None
  if attribute=='bowling_style':normalized='spin' if re.search('spin|break|orthodox|googly',value,re.I) else 'pace' if re.search('fast|medium|seam',value,re.I) else 'unknown'
  conn.execute('INSERT OR REPLACE INTO player_attributes VALUES(?,?,?,?,?,?,?,?)',(pk,attribute,value,normalized,url,'registry_source_id' if confidence=='source_id_exact' else 'unique_full_name',confidence,json.dumps(evidence)))
 # Cached auction source retained independently, including unresolved rows.
 names={}
 for pk,name in conn.execute('select player_key,name from player_names union select player_key,name from players union select player_key,unique_name from players'):
  if name:names.setdefault(norm(name),set()).add(pk)
 for csvpath in ROOT.glob('2026 ipl auction player list*.csv'):
  rows=list(csv.reader(csvpath.open(encoding='utf-8-sig',newline='')))
  for row in rows[1:]:
   if len(row)<19 or not row[0].strip().isdigit():continue
   fullname=' '.join([row[3].strip(),row[4].strip()]);candidates=names.get(norm(fullname),set());pk=next(iter(candidates)) if len(candidates)==1 else None
   payload={'name':fullname,'country':row[5],'role':row[9],'batting_hand':row[10],'bowling_style':row[11],'dob':row[7],'capped_2026':row[18],'cached_source':csvpath.name,'season':2026,'original_pdf':'https://documents.iplt20.com/bcci/documents/1765284319912_TATA%20IPL%202026%20-%20Auction%20List%20-%209.12.25.pdf','verification':'Cached transcription; direct PDF retrieval blocked, not independently reverified'}
   conn.execute('INSERT OR REPLACE INTO metadata_source_ledger VALUES(?,?,?,?,?,datetime(\'now\'))',('cached_auction_2026',row[0],pk,json.dumps(payload),'unique_name_unreviewed' if pk else 'unresolved'))
   report['auction_rows']+=1
   if pk is None:report['auction_pending']+=1;continue
   report['auction_linked']+=1
   for attribute,value in [('nationality',row[5]),('playing_country',row[5]),('declared_role',row[9]),('batting_hand',row[10]),('bowling_style',row[11]),('date_of_birth',row[7])]:
    if value.strip():add(pk,attribute,value.strip(),'cached_auction_2026_transcription',payload,'unique_name_unreviewed')
 conn.commit()
 for pk,sid,name in conn.execute("select s.player_key,s.source_id,coalesce(p.unique_name,p.name) from player_source_ids s join players p using(player_key) where s.source='cricbuzz' order by s.player_key limit ?",(args.limit,)).fetchall():
  url=f'https://www.cricbuzz.com/profiles/{sid}/'+re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-');cached=CACHE/f'cricbuzz-{sid}.json'
  try:
   if cached.exists():data=json.loads(cached.read_text());report['profiles_cached']+=1
   else:
    req=urllib.request.Request(url,headers={'User-Agent':'CricFieldMetadata/1.0'})
    with urllib.request.urlopen(req,timeout=20) as response:html=response.read().decode('utf-8')
    profile_name,fields=parse_profile(html);data={'name':profile_name,'fields':fields,'url':url,'source_id':sid,'retrieved_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())};cached.write_text(json.dumps(data,indent=2));report['profiles_fetched']+=1;time.sleep(.5)
   for attribute,value in data['fields'].items():add(pk,attribute,value,data['url'],{'source_id':sid,'profile_name':data['name'],'retrieved_at':data['retrieved_at'],'scope':'Profile playing country, not citizenship or IPL eligibility'});report['profile_attributes']+=1
   conn.execute('INSERT OR REPLACE INTO metadata_source_ledger VALUES(?,?,?,?,?,datetime(\'now\'))',('cricbuzz_profile',sid,pk,json.dumps(data),'registry_source_id_exact'));conn.commit()
  except Exception as e:report['profiles_failed'].append({'player_key':pk,'source_id':sid,'error':str(e)[:160]});conn.rollback()
 report['coverage']={a:n for a,n in conn.execute('select attribute,count(distinct player_key) from player_attributes group by attribute')};report['total_players']=conn.execute('select count(*) from players').fetchone()[0]
 report['limitations']=['Unknown attributes are not filled with guesses.','No international retirement inferred as franchise retirement.','No 2027 registration or retention fabricated.','Only 50 players currently have mapped Cricbuzz IDs; others require identity-linked source acquisition.','Cached PDF transcription is marked unreviewed; raw source snapshots preserve provenance.']
 out=ROOT/'docs/data-repairs/player-enrichment-report.json';out.write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
if __name__=='__main__':main()

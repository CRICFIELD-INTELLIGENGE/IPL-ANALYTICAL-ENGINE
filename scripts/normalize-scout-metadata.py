"""Normalize existing sourced player metadata without inventing or upgrading evidence."""
import sqlite3,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
db=root/'lib/cricket-data/global/warehouse/global.db'
conn=sqlite3.connect(db)
before=dict(conn.execute('select attribute,count(distinct player_key) from player_attributes group by attribute'))
with conn:
 for old,new in [('auction_country','nationality'),('auction_specialism','declared_role')]:
  conn.execute('''INSERT OR IGNORE INTO player_attributes(player_key,attribute,value,normalized,source,link_method,confidence,evidence)
  SELECT player_key,?,value,normalized,source,link_method,confidence,evidence FROM player_attributes WHERE attribute=?''',(new,old))
count=conn.execute('select count(*) from players').fetchone()[0]
after=dict(conn.execute('select attribute,count(distinct player_key) from player_attributes group by attribute'))
report={'total_players':count,'before':before,'after':after,'important':'Normalization preserves existing confidence, including corroborated_unreviewed. Country records are not proof of citizenship or IPL registration. Recent appearances do not prove active status. Statistical role is inferred separately from phase usage; declared_role is source-reported. No nationality or skill inferred from name or league.'}
out=root/'docs/data-repairs/scout-metadata-audit.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))

"""Reproducible local media audit. Does not infer rights or remote availability."""
import json,re,hashlib
from pathlib import Path
from collections import Counter,defaultdict
root=Path(__file__).resolve().parents[1]
public=root/'artifacts/ipl-analytics/public'
out=root/'docs/media-audit';out.mkdir(parents=True,exist_ok=True)
registry=json.loads((public/'data/player-photo-registry.json').read_text(encoding='utf-8-sig'))
bios=json.loads((public/'data/player-bio.json').read_text(encoding='utf-8-sig'))
photos=registry['photos'];records=[];urls=defaultdict(set)
for i,p in enumerate(photos):
 url=p.get('imageUrl','');local=url.startswith('/') and not url.startswith('//');exists=(public/url.lstrip('/')).is_file() if local else None
 status='missing-local-file' if exists is False else 'local-file-present' if exists else 'remote-unchecked'
 urls[url].add(p.get('playerId',''))
 records.append({'asset_id':hashlib.sha256((p.get('playerId','')+'|'+url).encode()).hexdigest()[:20],'player_id':p.get('playerId'),'asset_type':'portrait','image_url':url,'provider':p.get('provider','unclassified'),'source_url':p.get('sourceUrl',p.get('sourcePageUrl')),'license_status':p.get('licenseStatus','unknown'),'license_reference':p.get('licenseReference'),'attribution':p.get('attribution'),'allowed_usage':p.get('allowedUsage',[]),'expiry_date':p.get('expiryDate'),'last_verified_at':p.get('lastVerifiedAt'),'image_status':status,'franchise':p.get('franchiseId',p.get('teamId')),'season':p.get('season')})
manifest=json.loads((root/'artifacts/ipl-analytics/src/data/editorial-images/manifest.json').read_text())['images']
summary={'bio_records':len(bios),'portrait_records':len(records),'local_files_present':sum(r['image_status']=='local-file-present' for r in records),'missing_local_files':sum(r['image_status']=='missing-local-file' for r in records),'remote_unchecked':sum(r['image_status']=='remote-unchecked' for r in records),'rights_marked_approved_not_independently_verified':sum(r['license_status']=='approved' for r in records),'verified_usable_photo_count':None,'player_placeholder_count':None,'shared_urls_across_player_ids':{u:sorted(ids) for u,ids in urls.items() if len(ids)>1},'getty_records':sum(x.get('source')=='getty' for x in manifest),'getty_commercial_authorizations':sum(bool(x.get('review',{}).get('commercialEmbedAuthorization')) for x in manifest),'franchise_records':dict(Counter(str(r['franchise']) for r in records))}
(out/'registry.json').write_text(json.dumps(records,indent=2),encoding='utf-8');(out/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
(out/'REPORT.md').write_text('# CRICFIELD media audit\n\n'+ '\n'.join(f'- {k}: {v}' for k,v in summary.items() if not isinstance(v,dict))+ '\n\nLocal presence does not establish usage rights, identity correctness, or browser load success. Null counts are unverified, not zero. Remote URLs have not been requested. Existing approval flags are preserved, not upgraded.\n',encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if not isinstance(v,dict)}))

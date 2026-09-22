"""Snapshot public data, preserving units, identifiers and source provenance."""
from pathlib import Path
import urllib.request,json,csv,io,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1];RAW=ROOT/'raw';OUT=ROOT/'public/data';RAW.mkdir(exist_ok=True);OUT.mkdir(exist_ok=True)
def fetch(url,path):
 if not path.exists():
  with urllib.request.urlopen(url,timeout=120) as r:path.write_bytes(r.read())
 return path.read_bytes()
manifest={}
for name in ['international-migration-flows','social-capital-atlas']:
 meta=json.loads(fetch('https://data.humdata.org/api/3/action/package_show?id='+name,RAW/(name+'.json')))['result']
 manifest[name]={'source':'https://data.humdata.org/dataset/'+name,'license':meta.get('license_title'),'license_url':meta.get('license_url'),'updated':meta.get('metadata_modified'),'retrieved':datetime.date.today().isoformat(),'resources':[]}
 for r in meta['resources']:
  if not any(r['url'].lower().endswith(x) for x in ['.csv','.txt','.pdf']):continue
  path=RAW/(name+'-'+r['url'].split('/')[-1]);data=fetch(r['url'],path)
  manifest[name]['resources'].append({'name':r['name'],'url':r['url'],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  if path.suffix=='.csv':
   rows=list(csv.DictReader(io.StringIO(data.decode('utf-8-sig'))))
   print(name,path.name,len(rows),list(rows[0]),'sample',rows[0])
   (OUT/(r['url'].split('/')[-1].replace('.csv','.json'))).write_text(json.dumps(rows,separators=(',',':')))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))

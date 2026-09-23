"""Snapshot the Cross-Gender Friending Ratio (CGFR) release: country and US county tables.

Source: Social Capital Lab, "Cross Gender Ties" on the Humanitarian Data Exchange (CC BY).
Unit of analysis: one region per row (ISO2 country, or five-digit county FIPS). Values are
published as-is; no rescaling. The release is static (friendships as of 2026-01-25).
"""
from pathlib import Path
import urllib.request,json,csv,io,hashlib,datetime,shutil
ROOT=Path(__file__).resolve().parents[1];RAW=ROOT/'raw';OUT=ROOT/'public/data';RAW.mkdir(exist_ok=True)
def fetch(url,path):
 # Raw downloads are an immutable cache; delete the file to force a fresh copy.
 if not path.exists():
  with urllib.request.urlopen(url,timeout=120) as r:path.write_bytes(r.read())
 return path.read_bytes()
def write(name,data):
 p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,separators=(',',':')))
# State abbreviations by FIPS prefix so a county can be found as "Page County, VA".
STATES={'01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY','72':'PR'}
name='cross-gender-ties'
meta=json.loads(fetch('https://data.humdata.org/api/3/action/package_show?id='+name,RAW/(name+'.json')))['result']
entry={'source':'https://data.humdata.org/dataset/'+name,'license':meta.get('license_title'),'license_url':meta.get('license_url'),'updated':meta.get('metadata_modified'),'retrieved':datetime.date.today().isoformat(),'resources':[]}
wanted={'country_cgfr.csv':'country','us_counties_cgfr.csv':'us_counties','readme.pdf':None}
cutoffs=None;index={}
for r in meta['resources']:
 fname=r['url'].split('/')[-1]
 if fname not in wanted:continue
 path=RAW/(name+'-'+fname);data=fetch(r['url'],path)
 entry['resources'].append({'name':r['name'],'url':r['url'],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 if fname=='readme.pdf':shutil.copy2(path,OUT/'cgfr-readme.pdf');continue
 rows=list(csv.DictReader(io.StringIO(data.decode('utf-8-sig'))))
 cols=[c for c in rows[0] if c.startswith('cgfr_')];these=[int(c.split('_')[1]) for c in cols]
 assert cutoffs in (None,these),'cutoffs differ between files';cutoffs=these
 out=[];ids=set()
 for row in rows:
  rid=row['region_id'];assert rid not in ids,'duplicate region '+rid;ids.add(rid)
  # Missing or suppressed cells stay null; never coerced to zero.
  values=[None if row[c]=='' else float(row[c]) for c in cols]
  if wanted[fname]=='country':out.append([rid,values])
  else:
   fips=rid.zfill(5);out.append([fips,row['region_name'],STATES.get(fips[:2],''),values])
 level=wanted[fname];write(f'cgfr/{level}.json',{'cutoffs':cutoffs,'rows':out})
 index[level]={'rows':len(out),'columns':(['iso2','values_by_cutoff'] if level=='country' else ['fips','county_name','state','values_by_cutoff'])}
 print(level,len(out),'rows; sample',out[0])
write('cgfr-index.json',{'cutoffs':cutoffs,'levels':index,'countries':sorted(r[0] for r in json.loads((OUT/'cgfr/country.json').read_text())['rows']),'as_of':'2026-01-25','source':entry['source']})
manifest=json.loads((OUT/'manifest.json').read_text());manifest[name]=entry;(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))

from pathlib import Path
import csv,json,collections,shutil,urllib.request,hashlib,datetime
R=Path(__file__).resolve().parents[1];O=R/'public/data';raw=R/'raw'
def write(name,data):
 p=O/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,separators=(',',':')))
# Unit: directed origin-destination-month; retain every published observation.
by=collections.defaultdict(list);seen=set();months=set()
for row in csv.DictReader((raw/'international-migration-flows-international_migration_flow.csv').open()):
 key=(row['country_from'],row['country_to'],row['migration_month']);assert key not in seen;seen.add(key);months.add(key[2]);by[key[0]].append([key[1],key[2],int(row['num_migrants'])])
for origin,rows in by.items():write('migration/'+origin+'.json',rows)
write('migration/index.json',{'origins':sorted(by),'months':sorted(months),'rows':len(seen),'columns':['destination_iso2','month','estimated_migrants'],'source':'https://data.humdata.org/dataset/international-migration-flows'})
# Delete only our redundant generated monolithic JSON; sharded output is authoritative.
(O/'international_migration_flow.json').unlink(missing_ok=True)
for level in ['county','zip','college','high_school']:
 rows=json.loads((O/f'social_capital_{level}.json').read_text());ids=set()
 for row in rows:
  for key in ['zip','county']:
   if key in row:row[key]=row[key].zfill(5)
  assert row[level] not in ids;ids.add(row[level])
  for k,v in row.items():
   if k in ['zip','county','college','high_school'] or k.endswith('_name'):continue
   row[k]=None if v=='' else float(v)
 write(f'social_capital_{level}.json',rows)
for name in ['license.pdf','data_release_readme_31_07_2022_nomatrix.pdf']:
 shutil.copy2(raw/('social-capital-atlas-'+name),O/name)
shutil.copy2(raw/'international-migration-flows-readme.txt',O/'migration-readme.txt')
# Unit: SCI origin-destination pair. Public current release, not guessed values.
meta=json.load(urllib.request.urlopen('https://data.humdata.org/api/3/action/package_show?id=social-connectedness-index'))['result']
r=next(r for r in meta['resources'] if r['name']=='country.csv');p=raw/'sci-country.csv'
if not p.exists():p.write_bytes(urllib.request.urlopen(r['url']).read())
rows=list(csv.DictReader(p.open()));print('SCI headers/sample',rows[0])
write('sci-country-raw.json',rows)
manifest=json.loads((O/'manifest.json').read_text());manifest['sci']={'source':'https://data.humdata.org/dataset/social-connectedness-index','license':meta.get('license_title'),'updated':meta.get('metadata_modified'),'url':r['url'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'retrieved':datetime.date.today().isoformat()};write('manifest.json',manifest)

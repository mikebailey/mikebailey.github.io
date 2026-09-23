from pathlib import Path
import json,re,csv,collections,datetime,shutil
R=Path(__file__).resolve().parents[1];site=R.parent;O=R/'public/data'
projects=[]
# Site pages are Jekyll sources. Strip Liquid tags ({% ... %}, {{ ... }}) and kramdown
# block attributes ({:.class}) so the MCP profile carries prose, not template markup.
def clean(markdown):
 text=re.sub(r'\{%.*?%\}','',markdown,flags=re.S)
 text=re.sub(r'\{\{.*?\}\}','',text,flags=re.S)
 text=re.sub(r'^\s*\{:[^}]*\}\s*$','',text,flags=re.M)
 text=re.sub(r'\{:[^}]*\}','',text)
 return re.sub(r'\n{3,}','\n\n',text).strip()
for p in (site/'_portfolio').glob('*.md'):
 text=p.read_text();parts=text.split('---',2);meta=parts[1] if len(parts)>2 else '';body=parts[-1]
 title=re.search(r'^title:\s*(.*)',meta,re.M)
 projects.append({'id':p.stem,'title':title.group(1).strip('"') if title else p.stem,'url':'https://michaelbailey.org/portfolio/'+p.stem+'/','description':clean(body)})
profile={'name':'Michael Bailey','role':'Senior Advisor, AI at J-PAL, MIT; computational social scientist and economist','email':'mbailey@povertyactionlab.org','website':'https://michaelbailey.org','bio':clean((site/'_pages/about.md').read_text().split('---',2)[-1]),'projects':projects,'public_sources_only':True,'updated':datetime.date.today().isoformat()}
(O/'profile.json').write_text(json.dumps(profile,indent=2))
# SCI country pairs, exactly as published; no rescaling.
raw=O/'sci-country-raw.json'
if not raw.exists():print('profile.json rebuilt; SCI shards unchanged (no sci-country-raw.json from ingest)');raise SystemExit(0)
rows=json.loads(raw.read_text());by=collections.defaultdict(list);seen=set()
for r in rows:
 key=(r['user_country'],r['friend_country']);assert key not in seen;seen.add(key);by[key[0]].append([key[1],float(r['scaled_sci'])])
for origin,rs in by.items():
 p=O/'sci/country'/f'{origin}.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(rs,separators=(',',':')))
(O/'sci-country-raw.json').unlink()
(O/'sci-index.json').write_text(json.dumps({'countries':sorted(by),'pairs':len(seen)}))

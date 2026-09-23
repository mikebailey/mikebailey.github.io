// Public, aggregate releases only. Each query includes definitions and provenance.
export const base='https://michaelbailey.org/mcp';
export async function load(env,path){
 if(!/^[a-zA-Z0-9_./-]+$/.test(path)||path.includes('..'))throw Error('Invalid dataset path');
 const r=await env.ASSETS.fetch(new Request('https://assets.local/data/'+path));
 if(!r.ok)throw Error('Dataset unavailable: '+path);return r.json();
}
const names=new Intl.DisplayNames(['en'],{type:'region'});
export const countryName=c=>names.of(c);
export function countryCode(value,codes){
 const aliases={usa:'US',uk:'GB','united states of america':'US','south korea':'KR','north korea':'KP',columbia:'CO',russia:'RU'};
 const q=value.trim().toLowerCase();const code=aliases[q]||codes.find(c=>c.toLowerCase()===q||countryName(c).toLowerCase()===q);
 if(!code||!codes.includes(code))throw Error('Country not available in this release: '+value+'. Use list_datasets to inspect coverage.');return code;
}
export async function datasets(env){return {sources:await load(env,'manifest.json'),migration:await load(env,'migration/index.json'),social_connectedness:await load(env,'sci-index.json'),social_capital:{geographies:['county','zip','college','high_school'],codebook:base+'/data/data_release_readme_31_07_2022_nomatrix.pdf',license:base+'/data/license.pdf'},refresh:'Versioned snapshot retrieved 2026-09-21; not a live feed.'};}
export async function sci(env,a){
 const index=await load(env,'sci-index.json'),origin=countryCode(a.origin,index.countries);
 const destination=a.destination?countryCode(a.destination,index.countries):null;
 const rows=await load(env,`sci/country/${origin}.json`);
 const results=rows.filter(([c])=>destination?c===destination:(a.include_self||c!==origin)).sort((a,b)=>b[1]-a[1]).slice(0,a.limit??10).map(([c,v])=>({destination:c,name:countryName(c),scaled_sci:v}));
 return {origin,origin_name:countryName(origin),results,unit:'Country pair; scaled Social Connectedness Index',definition:'Relative likelihood of friendship across places, normalized for the size of their Facebook populations. Not a friendship count, probability, or migration flow. Compare values within the same release and geographic level.',coverage:'Country-level only in this release',source:'https://data.humdata.org/dataset/social-connectedness-index',map:'https://sci-map.michaelbailey.org/',license:'CC0',snapshot:'2026-09-21'};
}
export async function migration(env,a){
 // Name the side that failed: migration coverage is narrower than SCI coverage, so one country
 // of a pair can be present while the other is absent from this release.
 const index=await load(env,'migration/index.json');
 const resolve=(value,side)=>{try{return countryCode(value,index.origins);}catch(e){throw Error(side+' '+e.message.replace('Country not available in this release','not available in the migration release'));}};
 const origin=resolve(a.origin,'Origin'),destination=a.destination?resolve(a.destination,'Destination'):null;
 const start=a.start_month||'2019-01',end=a.end_month||'2022-12';
 if(!index.months.includes(start)||!index.months.includes(end)||start>end)throw Error('Use months within 2019-01 to 2022-12, with start <= end.');
 const months=index.months.filter(m=>m>=start&&m<=end),raw=await load(env,`migration/${origin}.json`);
 const rows=raw.filter(([d,m])=>(!destination||d===destination)&&m>=start&&m<=end);
 let results;
 if(destination){const values=new Map(rows.map(([,m,n])=>[m,n]));results=months.map(month=>({month,estimated_migrants:values.has(month)?values.get(month):null}));}
 else {const groups=new Map();for(const [d,m,n]of rows){const g=groups.get(d)||{destination:d,name:countryName(d),estimated_migrants:0,months_observed:0};g.estimated_migrants+=n;g.months_observed++;groups.set(d,g);}results=[...groups.values()].sort((a,b)=>b.estimated_migrants-a.estimated_migrants).slice(0,a.limit??10);}
 return {origin,origin_name:countryName(origin),destination,start_month:start,end_month:end,results,observed_total:destination?rows.reduce((n,r)=>n+r[2],0):null,months_observed:destination?rows.length:null,months_expected:months.length,missing_policy:'Absent records are null, never assumed zero; totals sum observed months only.',unit:destination?'Directed origin-destination-month':'Directed origin-destination; sum of observed monthly estimates in requested interval',definition:'Estimated moves from a country of residence for a majority of the preceding 12 months to a country of residence for a majority of the following 12 months.',limitations:'Population-weighted Facebook estimates with differential-privacy noise. Not citizenship, migrant stocks, asylum claims or border encounters. Coverage and platform representativeness vary.',source:'https://data.humdata.org/dataset/international-migration-flows',paper:'https://arxiv.org/abs/2504.11691',readme:base+'/data/migration-readme.txt',download:base+`/data/migration/${origin}.json`,license:'CC BY',snapshot:'2026-09-21'};
}
export async function socialCapital(env,a){
 const rows=await load(env,`social_capital_${a.geography}.json`),q=a.query.trim().toLowerCase();
 const matches=rows.filter(r=>String(r[a.geography]).toLowerCase()===q||Object.entries(r).some(([k,v])=>k.endsWith('name')&&String(v).toLowerCase().includes(q)));
 return {geography:a.geography,query:a.query,total_matches:matches.length,results:matches.slice(0,a.limit??10),unit:'One '+a.geography+' per record',definitions:{economic_connectedness:'Baseline ec measure: twice the average share of high-SES friends among low-SES individuals. It is a normalized index, not a raw percentage.',missing:'Null denotes unavailable or suppressed data, never zero.',other_fields:'Use the linked source codebook for exact definitions, denominators and standard errors.'},limitations:'Observational, privacy-protected aggregate estimates; associations are not causal effects. Coverage exclusions and noise are described in the codebook.',source:'https://data.humdata.org/dataset/social-capital-atlas',map:'https://www.socialcapital.org',codebook:base+'/data/data_release_readme_31_07_2022_nomatrix.pdf',license:base+'/data/license.pdf',snapshot:'2026-09-21'};
}
export const bookingLinks=[{minutes:30,url:'https://calendar.app.google/EdFPjKmPb97tY5Dv6'},{minutes:45,url:'https://calendar.app.google/QXKNDWh28PUFf9HSA'},{minutes:60,url:'https://calendar.app.google/ZcSBbU5juS1Txu3P7'}];

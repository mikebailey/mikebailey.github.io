import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {crossGenderTies,lab,datasets} from '../src/data.js';
import worker from '../src/worker.js';
// Serve the real generated data files, as the deployed ASSETS binding would.
const env={ASSETS:{fetch:async req=>{const p=new URL(req.url).pathname;try{return new Response(await readFile(new URL('../public'+p,import.meta.url)));}catch{return new Response('',{status:404});}}}};

test('country lookup accepts names and codes and exposes every cutoff',async()=>{
 const r=await crossGenderTies(env,{geography:'country',places:['Norway','sa']});
 assert.equal(r.results.length,2);assert.equal(r.results[0].id,'NO');assert.equal(r.results[1].id,'SA');
 assert.equal(r.cutoff,100);assert.equal(Object.keys(r.results[0].cgfr_by_cutoff).length,10);
 assert.equal(r.results[0].cgfr,r.results[0].cgfr_by_cutoff[100]);
 assert.ok(r.results[0].cgfr>r.results[1].cgfr,'Norway more gender-mixed than Saudi Arabia');
 assert.ok(r.definition&&r.citation&&r.source&&r.explorer);
});

test('ranking runs both ways and rank positions are consistent',async()=>{
 const low=await crossGenderTies(env,{geography:'country',rank:'lowest',limit:3,cutoff:50});
 const high=await crossGenderTies(env,{geography:'country',rank:'highest',limit:3,cutoff:50});
 assert.equal(low.results[0].rank_ascending,1);assert.equal(high.results[0].rank_ascending,high.regions_ranked);
 assert.ok(low.results[0].cgfr<high.results[0].cgfr);
 assert.equal(low.results[0].cgfr,low.results[0].cgfr_by_cutoff[50]);
});

test('county lookup by FIPS, "name, ST" and substring',async()=>{
 const a=await crossGenderTies(env,{geography:'us_county',places:['25017']});
 const b=await crossGenderTies(env,{geography:'us_county',places:['Middlesex County, MA']});
 assert.equal(a.results[0].id,'25017');assert.equal(b.results[0].id,'25017');assert.equal(b.results[0].state,'MA');
 const c=await crossGenderTies(env,{geography:'us_county',places:['Middlesex']});
 assert.ok(c.results.length>1,'several Middlesex counties exist');
});

test('bad requests are refused with a reason rather than guessed',async()=>{
 await assert.rejects(crossGenderTies(env,{geography:'country'}),/Give places/);
 await assert.rejects(crossGenderTies(env,{geography:'country',places:['Atlantis']}),/not available/);
 await assert.rejects(crossGenderTies(env,{geography:'us_county',places:['Nowhere County, ZZ']}),/not found/);
 await assert.rejects(crossGenderTies(env,{geography:'country',rank:'lowest',cutoff:42}),/Cutoff/);
});

test('lab guide and catalog are wired in',async()=>{
 const g=await lab(env);assert.equal(g.measures.length,3);assert.ok(g.measures.every(m=>m.page.startsWith('https://social-connectedness.org/')));
 const d=await datasets(env);assert.equal(d.cross_gender_ties.levels.country.rows,178);assert.equal(d.social_capital_lab.guide,'https://michaelbailey.org/mcp/lab');
 const r=await worker.fetch(new Request('https://michaelbailey.org/mcp/lab'),env);assert.equal(r.status,200);assert.equal((await r.json()).name,'Social Capital Lab');
 const h=await worker.fetch(new Request('https://michaelbailey.org/mcp/lab',{headers:{'Sec-Fetch-Mode':'navigate'}}),env);assert.equal(h.status,403);
});

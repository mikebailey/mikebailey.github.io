import test from 'node:test';
import assert from 'node:assert/strict';
import {compute,stateSchema} from '../src/power.js';
import {calculator} from '../src/calculator.generated.js';
import {countryCode} from '../src/data.js';
test('power sample and MDE inversion across design variants',()=>{
 for(const a of [{},{clustered:true,icc:.1,attr:.1},{binary:true,mde:.08,p0:.3},{arms:2,outcomes:3,correction:'sidak'},{ni:true,mde:0,niMargin:.2,sided:1},{clustered:true,cv:.7,cvMethod:'efficient',r2:.3,clusterAttr:.1}]){
 const r=compute('n',a).result;assert.ok(!r.error,JSON.stringify(r));
 const achieved=compute('power',{...a,nGiven:r.n,kGiven:r.clusters||60,m:r.m||30}).result.power;
 assert.ok(achieved>=.79&&achieved<=1,JSON.stringify({a,r,achieved}));
 }
});
test('defaults are explicitly disclosed and invalid designs rejected',()=>{assert.ok(compute('power',{}).defaulted_fields.includes('icc'));assert.throws(()=>compute('n',{cv:2,cvMethod:'efficient'}));assert.throws(()=>compute('power',{tut:0,tuc:0}));assert.throws(()=>stateSchema.parse({secret:'bad'}));});
test('country resolution rejects unsupported places rather than fabricating zeros',()=>{assert.equal(countryCode('Colombia',['CO','US']),'CO');assert.throws(()=>countryCode('Atlantis',['CO','US']));});
test('clustered designs refuse nGiven without m instead of sizing from a default',()=>{
 assert.throws(()=>compute('mde',{clustered:true,kGiven:40,nGiven:2000}),/nGiven is not used/);
 assert.throws(()=>compute('power',{clustered:true,kGiven:40,nGiven:2000}),/nGiven is not used/);
 // With m supplied the design is fully specified and nGiven is harmless.
 assert.equal(compute('mde',{clustered:true,kGiven:40,m:50,nGiven:2000}).result.n,2000);
 // Individual designs still take nGiven.
 assert.equal(compute('mde',{nGiven:2000}).assumptions.nGiven,2000);
});

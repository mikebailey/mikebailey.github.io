import {z} from 'zod';
import {calculator,sourceHash} from './calculator.generated.js';
// Units match the canonical engine: proportions are fractions, costs share one currency.
export const stateSchema=z.object({
 alpha:z.number().min(.001).max(.5).default(.05),power:z.number().min(.1).max(.999).default(.8),
 binary:z.boolean().default(false),clustered:z.boolean().default(false),
 mde:z.number().min(-10).max(1e6).default(.2),sd:z.number().positive().max(1e9).default(1),p0:z.number().min(.01).max(.99).default(.5),
 tut:z.number().min(0).max(1).default(1),tuc:z.number().min(0).max(1).default(0),attr:z.number().min(0).max(.99).default(0),
 prop:z.number().min(.01).max(.99).default(.5),r2:z.number().min(0).max(.95).default(0),icc:z.number().min(0).max(1).default(.05),
 cmode:z.enum(['units','clusters']).default('units'),m:z.number().int().min(1).max(1e6).default(30),
 nGiven:z.number().int().min(4).max(1e9).default(1000),kGiven:z.number().int().min(3).max(1e6).default(60),
 cv:z.number().min(0).max(2).default(0),cvMethod:z.enum(['conservative','efficient']).default('conservative'),
 clusterAttr:z.number().min(0).max(.95).default(0),sided:z.union([z.literal(1),z.literal(2)]).default(2),
 ni:z.boolean().default(false),niMargin:z.number().positive().max(1e6).default(.1),
 arms:z.number().int().min(1).max(20).default(1),outcomes:z.number().int().min(1).max(50).default(1),
 testCorr:z.number().min(0).max(.95).default(0),correction:z.enum(['none','bonferroni','sidak','effective']).default('bonferroni'),
 powerDef:z.enum(['each','any','all']).default('each'),binaryDir:z.enum(['increase','decrease']).default('increase'),binaryMethod:z.enum(['twoprop','legacy']).default('twoprop'),
 costPer:z.number().min(0).max(1e12).optional(),costCluster:z.number().min(0).max(1e12).optional(),costFixed:z.number().min(0).max(1e12).optional(),budget:z.number().min(0).max(1e12).optional()
}).strict();
export function compute(mode,input={},includeCode=false){
 const s=stateSchema.parse(input);s.tCorrect=true;s.roundEven=false;
 if(s.cvMethod==='efficient'&&s.cv>Math.sqrt(3))throw Error('Efficient unequal-cluster adjustment requires CV <= sqrt(3).');
 if(!s.ni && mode!=='mde' && s.mde<=0)throw Error('MDE must be positive for superiority designs.');
 if(s.tut===s.tuc)throw Error('Treatment and control take-up must differ.');
 if(s.clustered&&mode==='n'&&s.cmode==='clusters'&&s.m<3)throw Error('At least three clusters required.');
 const E=calculator(mode),r=E.solve(s);
 const q=new URLSearchParams({v:'1',solveFor:mode,outcomeType:s.binary?'binary':'continuous',designType:s.clustered?'clustered':'individual'});
 for(const [k,v]of Object.entries(s))if(!['tCorrect','roundEven','binary','clustered'].includes(k))q.set(k,String(['tut','tuc','attr','clusterAttr'].includes(k)?v*100:v));
 const out={mode,assumptions:s,defaulted_fields:Object.keys(s).filter(k=>!(k in input)),result:r,calculator_url:'https://michaelbailey.org/power-calculator/#'+q,engine_sha256:sourceHash};
 out.calculator_link_notes=[];
 // These advanced selectors are omitted by the existing website hash loader.
 if(s.ni)out.calculator_link_notes.push('Enable non-inferiority manually in the web calculator; its URL loader does not restore this checkbox.');
 if(s.binaryDir!=='increase')out.calculator_link_notes.push('Set binary direction to decrease manually in the web calculator.');
 if(s.cvMethod!=='conservative')out.calculator_link_notes.push('Set unequal-cluster method to efficient manually in the web calculator.');
 if(r.error)return out;
 out.effect_size={outcome_units:r.mde,standard_deviations:s.binary?null:r.mde/s.sd,percentage_points:s.binary?r.mde*100:null};
 if(s.budget!==undefined)out.budget=E.budgetAnswer(s,r,E.pricesFrom(s),s.budget);
 if(s.clustered&&s.costPer!==undefined)out.cluster_size_advice=E.clusterSizeAdvice(s,E.pricesFrom(s),r.m || s.m);
 out.methods=E.methodsParagraph(s,r);
 if(includeCode)out.code={R:E.rCode(s,r),Stata:E.stataCode(s,r),limitations:{R:E.unsupportedFor(s,'r'),Stata:E.unsupportedFor(s,'stata')}};
 return out;
}

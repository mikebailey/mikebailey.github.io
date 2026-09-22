// Extract unchanged pure functions from the canonical single-file calculator.
import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
const source=process.argv[2];if(!source)throw Error('Pass the canonical power-calculator.html path');
const html=fs.readFileSync(source,'utf8');
function section(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);if(i<0||j<0)throw Error('Calculator markers changed');return html.slice(i,j)}
const code=section('/* ---------- normal CDF','/* ---------- state ----------')+section('function pricesFrom(s)','function validate(s)')+section('function describeDesign(s, r)','/* ================= sensitivity')+section('\nconst pct =','function renderExport()');
const hash=crypto.createHash('sha256').update(html).digest('hex');
fs.writeFileSync(new URL('../src/calculator.generated.js',import.meta.url),`// Generated from published Mike Bailey power calculator. Do not edit.\n// SHA256 ${hash}\nexport const sourceHash='${hash}';\nexport function calculator(solveFor){\nconst fmt=n=>n.toLocaleString('en-US');\n${code}\nreturn {solve,requiredSample,achievedPower,mdeForSampleSize,pricesFrom,budgetAnswer,costOf,optimalClusterSize,clusterSizeAdvice,methodsParagraph,rCode,stataCode,unsupportedFor};\n}\n`);

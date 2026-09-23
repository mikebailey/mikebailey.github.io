import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {z} from 'zod';
import {stateSchema,compute} from './power.js';
import {load,datasets,sci,migration,socialCapital,bookingLinks,base} from './data.js';
import {evidence,searchEvidence,evaluationBrief} from './evidence.js';
import {instructions,greeting} from './greeting.js';
const inputAssumptions=z.object(Object.fromEntries(Object.entries(stateSchema.shape).map(([key,schema])=>[key,(schema.removeDefault?schema.removeDefault():schema).optional()]))).strict();
const short=z.string().trim().min(1).max(500),limit=z.number().int().min(1).max(20).default(10);
export function createServer(env){
 const server=new McpServer({name:'michael-bailey',version:'1.1.1'},{instructions});
 const tool=(name,description,schema,fn)=>server.registerTool(name,{description,inputSchema:schema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async a=>{try{const result=await fn(a);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,...(result.result?.error?{isError:true}:{})};}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}});
 tool('prepare_to_meet_mike','Public biography, projects, papers and contact details. Use visitor interests to suggest overlap; clearly label inferred discussion topics.',{interests:short.optional()},async a=>({profile:await load(env,'profile.json'),visitor_interests:a.interests||null,discussion_guidance:'Use cited public projects to suggest relevant discussion topics; distinguish inference from documented collaborations.'}));
 tool('get_booking_link','Get Mike’s 30-, 45- or 60-minute Google booking page. Does not read availability or create a booking; the person confirms in Google.',{minutes:z.union([z.literal(30),z.literal(45),z.literal(60)]).optional()},a=>({links:bookingLinks.filter(x=>!a.minutes||x.minutes===a.minutes),status:'Follow the link to see times and confirm a booking. Availability and which calendars are checked are managed in Mike’s Google scheduling settings.'}));
 tool('calculate_power','Use Mike’s existing engine for power, minimum detectable effect (mde), required sample size (n), budgets, effect sizes and R/Stata exports. Fractional inputs (0.05 means 5%). For continuous outcomes mde is in outcome units; sd is the outcome SD. Defaults are illustrative, not recommendations. Individual designs: nGiven is total sample. Clustered designs: kGiven is total clusters and m is units per cluster (nGiven is not used; pass m). In sample-size mode cmode=units fixes units per cluster m; cmode=clusters fixes cluster count m.',{solve_for:z.enum(['power','mde','n']),assumptions:inputAssumptions,include_code:z.boolean().default(false)},a=>compute(a.solve_for,a.assumptions,a.include_code));
 tool('power_sensitivity','Compare up to 20 explicit assumption scenarios with the same canonical calculator engine. Label scenarios; keep unspecified assumptions visible.',{solve_for:z.enum(['power','mde','n']),scenarios:z.array(z.object({label:short,assumptions:inputAssumptions})).min(1).max(20)},a=>({scenarios:a.scenarios.map(s=>({label:s.label,...compute(a.solve_for,s.assumptions)}))}));
 tool('list_datasets','Source metadata, licenses, release coverage, country codes and checksums for the public datasets.',{},()=>datasets(env));
 tool('query_social_connections','Rank country-level SCI connections or retrieve a country pair. Accepts ISO2 codes or English country names. No subnational SCI queries in this release.',{origin:short,destination:short.optional(),include_self:z.boolean().default(false),limit},a=>sci(env,a));
 tool('query_social_capital','Find US Social Capital Atlas records by exact geography ID or name substring. ZIP and county IDs are five-character strings with leading zeros. Returns raw published indicators and codebook links.',{geography:z.enum(['county','zip','college','high_school']),query:short,limit},a=>socialCapital(env,a));
 tool('query_migration','Monthly residence-based migration estimates, 2019–2022. Supply origin and optionally destination, in ISO2 or English names. With destination returns all requested months; without returns largest destination totals. Not citizenship or migrant stock.',{origin:short,destination:short.optional(),start_month:z.string().regex(/^\d{4}-\d{2}$/).optional(),end_month:z.string().regex(/^\d{4}-\d{2}$/).optional(),limit},a=>migration(env,a));
 tool('find_ai_evidence','Search a small curated public library of J-PAL/PAIE guidance and AI study summaries. Not an exhaustive or live literature search. Results distinguish completed studies, ongoing projects and guidance.',{query:short,limit:z.number().int().min(1).max(15).default(5)},a=>({results:searchEvidence(a.query,a.limit),coverage:'Curated starter library; no match does not imply no evidence exists.',library_size:evidence.length}));
 tool('develop_evaluation_idea','Build a preliminary evaluation planning scaffold with theory of change, outcomes, comparison options, implementation questions and public sources. The calling assistant tailors it using the program description. Not an approved protocol.',{program:short,population:short.optional(),context:short.optional()},evaluationBrief);
 for(const [name,uri,description,fn]of [['public-profile',base+'/profile','Mike’s public profile',()=>load(env,'profile.json')],['dataset-catalog',base+'/catalog','Dataset coverage and provenance',()=>datasets(env)],['evidence-library',base+'/evidence','Curated public evidence summaries',()=>({evidence})]])server.registerResource(name,uri,{description,mimeType:'application/json'},async()=>({contents:[{uri,mimeType:'application/json',text:JSON.stringify(await fn())}]}));
 server.registerPrompt('prepare-a-conversation',{description:'Find overlap with Mike’s public work and prepare a meeting.',argsSchema:{interests:short}},({interests})=>({messages:[{role:'user',content:{type:'text',text:`I want to talk with Mike about ${interests}. Use prepare_to_meet_mike, cite relevant projects or papers, distinguish documented facts from suggested topics, and give me his booking options.`}}]}));
 return server;
}

// ---------------------------------------------------------------------------
// Access policy: this endpoint serves AI agents only. There is no human page.
// The archived landing pages live in ../archive/landing-page/ if it ever returns.
// ---------------------------------------------------------------------------

// A person is someone navigating in a browser. Every modern browser stamps a page load
// with Sec-Fetch-Mode: navigate and Sec-Fetch-Dest: document, and page scripts cannot
// forge or strip those headers. The fetch tools AI agents use never send them, even when
// they imitate a browser's Accept line, so Accept is deliberately not consulted here.
export function isHuman(request){
 if(request.headers.get('Sec-Fetch-Mode')==='navigate')return true;
 if(request.headers.get('Sec-Fetch-Dest')==='document')return true;
 return false;
}

// The only thing a person ever sees. Not exported: the Workers runtime treats every
// named export of the entry module as a handler and refuses non-function values.
const HUMAN_MESSAGE='humans not allowed';
const humansNotAllowed=()=>new Response(HUMAN_MESSAGE,{status:403,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});

// Errors for misbehaving agents are JSON-RPC shaped so MCP clients can read them.
const rpcError=(status,message,extra={})=>new Response(JSON.stringify({jsonrpc:'2.0',error:{code:-32000,message},id:null}),{status,headers:{'Content-Type':'application/json',...extra}});

// A genuine MCP POST body is a JSON-RPC 2.0 message or a batch of them.
export function looksLikeJsonRpc(body){
 let parsed;try{parsed=JSON.parse(new TextDecoder().decode(body));}catch{return false;}
 const messages=Array.isArray(parsed)?parsed:[parsed];
 return messages.length>0&&messages.every(m=>m&&typeof m==='object'&&m.jsonrpc==='2.0');
}

function wrap(r){const h=new Headers(r.headers);h.set('Access-Control-Allow-Origin','*');h.set('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');h.set('Access-Control-Allow-Headers','Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID');h.set('Access-Control-Expose-Headers','MCP-Session-Id');h.set('X-Content-Type-Options','nosniff');h.set('X-Robots-Tag','noindex, nofollow, noarchive');h.set('Referrer-Policy','strict-origin-when-cross-origin');return new Response(r.body,{status:r.status,headers:h});}

export default {async fetch(request,env){
 try{
 const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
 // CORS preflight comes from browser-hosted MCP clients (e.g. web chat apps), not from people.
 if(request.method==='OPTIONS')return wrap(new Response(null,{status:204}));
 // Gate 1: anything that looks like a person in a browser, on any /mcp path.
 if(isHuman(request))return wrap(humansNotAllowed());
 if(request.method==='GET'){
 // Plain JSON side-doors that tool results link to (catalog, profile, data shards, codebooks).
 if(path==='/mcp/health')return wrap(Response.json({status:'ok',service:'michael-bailey-mcp',version:'1.1.1',access:'agents only'}));
 if(path==='/mcp/catalog')return wrap(Response.json(await datasets(env)));
 if(path==='/mcp/profile')return wrap(Response.json(await load(env,'profile.json')));
 if(path==='/mcp/evidence')return wrap(Response.json({evidence}));
 if(path.startsWith('/mcp/data/'))return wrap(await env.ASSETS.fetch(new Request('https://assets.local'+path.slice(4))));
 if(path==='/mcp'){
 // An MCP client asking for a standalone SSE stream: this server is stateless and opens
 // none, so answer 405 as the spec allows.
 if(/text\/event-stream/i.test(request.headers.get('Accept')||''))return wrap(rpcError(405,'Method not allowed. This stateless server opens no standalone SSE streams; POST JSON-RPC messages instead.',{Allow:'POST, OPTIONS'}));
 // Any other non-browser GET is an agent that can only fetch. Greet it and show the way in.
 return wrap(new Response(greeting,{status:200,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}}));
 }
 }
 if(path!=='/mcp')return wrap(new Response('Not found. The way in is https://michaelbailey.org/mcp',{status:404}));
 // DELETE (session close) and anything else: stateless server, nothing to close.
 if(request.method!=='POST')return wrap(rpcError(405,'Method not allowed. Use MCP Streamable HTTP POST.',{Allow:'POST, OPTIONS'}));
 // Gate 3: an MCP POST carries JSON. Anything else did not come from an MCP client.
 if(!/application\/json/i.test(request.headers.get('Content-Type')||''))return wrap(humansNotAllowed());
 // Bound actual body bytes, not only the client-supplied Content-Length.
 const reader=request.body?.getReader();let size=0,chunks=[];
 if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return wrap(new Response('Request too large',{status:413}));}chunks.push(value);}}
 const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.byteLength;}
 // Gate 4: the body must be JSON-RPC 2.0, which is what the MCP protocol speaks.
 if(!looksLikeJsonRpc(body))return wrap(humansNotAllowed());
 const input=new Request(request,{body});
 const server=createServer(env),transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 await server.connect(transport);const response=await transport.handleRequest(input);
 return wrap(response);
 }catch(e){return wrap(Response.json({error:'Request failed',message:e.message},{status:500}));}
}};

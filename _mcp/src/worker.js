import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {z} from 'zod';
import {stateSchema,compute} from './power.js';
import {load,datasets,sci,migration,socialCapital,bookingLinks,base} from './data.js';
import {evidence,searchEvidence,evaluationBrief} from './evidence.js';
const inputAssumptions=z.object(Object.fromEntries(Object.entries(stateSchema.shape).map(([key,schema])=>[key,(schema.removeDefault?schema.removeDefault():schema).optional()]))).strict();
const short=z.string().trim().min(1).max(500),limit=z.number().int().min(1).max(20).default(10);
export function createServer(env){
 const server=new McpServer({name:'michael-bailey',version:'1.0.0'},{instructions:'Public research tools from Michael Bailey. Cite returned sources and preserve coverage/uncertainty. Ask about missing research assumptions before treating defaults as a recommended design. Booking links require the person to select and confirm a time. No private calendars, contacts or internal J-PAL documents are accessible. This is a personal service, not an official J-PAL or MIT service.'});
 const tool=(name,description,schema,fn)=>server.registerTool(name,{description,inputSchema:schema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async a=>{try{const result=await fn(a);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,...(result.result?.error?{isError:true}:{})};}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}});
 tool('prepare_to_meet_mike','Public biography, projects, papers and contact details. Use visitor interests to suggest overlap; clearly label inferred discussion topics.',{interests:short.optional()},async a=>({profile:await load(env,'profile.json'),visitor_interests:a.interests||null,discussion_guidance:'Use cited public projects to suggest relevant discussion topics; distinguish inference from documented collaborations.'}));
 tool('get_booking_link','Get Mike’s 30-, 45- or 60-minute Google booking page. Does not read availability or create a booking; the person confirms in Google.',{minutes:z.union([z.literal(30),z.literal(45),z.literal(60)]).optional()},a=>({links:bookingLinks.filter(x=>!a.minutes||x.minutes===a.minutes),status:'Follow the link to see times and confirm a booking. Availability and which calendars are checked are managed in Mike’s Google scheduling settings.'}));
 tool('calculate_power','Use Mike’s existing engine for power, minimum detectable effect (mde), required sample size (n), budgets, effect sizes and R/Stata exports. Fractional inputs (0.05 means 5%). For continuous outcomes mde is in outcome units; sd is the outcome SD. Defaults are illustrative, not recommendations. nGiven is total sample; kGiven total clusters. In sample-size mode cmode=units fixes units per cluster m; cmode=clusters fixes cluster count m.',{solve_for:z.enum(['power','mde','n']),assumptions:inputAssumptions,include_code:z.boolean().default(false)},a=>compute(a.solve_for,a.assumptions,a.include_code));
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
function wrap(r){const h=new Headers(r.headers);h.set('Access-Control-Allow-Origin','*');h.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');h.set('Access-Control-Allow-Headers','Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID');h.set('Access-Control-Expose-Headers','MCP-Session-Id');h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','strict-origin-when-cross-origin');return new Response(r.body,{status:r.status,headers:h});}
export default {async fetch(request,env){
 try{
 const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
 if(request.method==='OPTIONS')return wrap(new Response(null,{status:204}));
 if(request.method==='GET'){
 if(path==='/mcp/health')return wrap(Response.json({status:'ok',service:'michael-bailey-mcp',version:'1.0.0'}));
 if(path==='/mcp/catalog')return wrap(Response.json(await datasets(env)));
 if(path==='/mcp/profile')return wrap(Response.json(await load(env,'profile.json')));
 if(path==='/mcp/evidence')return wrap(Response.json({evidence}));
 if(path.startsWith('/mcp/data/'))return wrap(await env.ASSETS.fetch(new Request('https://assets.local'+path.slice(4))));
 if(path==='/mcp'&&!request.headers.get('Accept')?.includes('text/event-stream'))return wrap(await env.ASSETS.fetch(new Request('https://assets.local/index.html')));
 }
 if(path!=='/mcp')return wrap(new Response('Not found',{status:404}));
 if(request.method!=='POST')return wrap(new Response('Use MCP Streamable HTTP POST, or open this address in a browser.',{status:405,headers:{Allow:'GET, POST, OPTIONS'}}));
 // Bound actual body bytes, not only the client-supplied Content-Length.
 const reader=request.body?.getReader();let size=0,chunks=[];
 if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return wrap(new Response('Request too large',{status:413}));}chunks.push(value);}}
 const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.byteLength;}
 const input=new Request(request,{body});
 const server=createServer(env),transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 await server.connect(transport);const response=await transport.handleRequest(input);
 return wrap(response);
 }catch(e){return wrap(Response.json({error:'Request failed',message:e.message},{status:500}));}
}};

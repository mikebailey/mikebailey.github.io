// Access-policy tests: people get "humans not allowed", MCP clients get the protocol.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{isHuman,looksLikeJsonRpc} from '../src/worker.js';
// The exact text a person sees. Kept here rather than exported from the worker, because
// the Workers runtime refuses non-function named exports on the entry module.
const HUMAN_MESSAGE='humans not allowed';

const ORIGIN='https://michaelbailey.org';
// Fake asset store: only the profile exists. Anything else is a 404, like Wrangler's asset handler.
const env={ASSETS:{fetch:async r=>new URL(r.url).pathname==='/data/profile.json'?Response.json({name:'Michael Bailey'}):new Response('missing',{status:404})}};
const call=(path,init={})=>worker.fetch(new Request(ORIGIN+path,init),env);

// Headers a real browser sends when a person types the address in.
const BROWSER={Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Sec-Fetch-Dest':'document','Sec-Fetch-Mode':'navigate'};
// Headers the MCP Streamable HTTP client sends on every POST.
const MCP={'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
const initialize=JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'0'}}});

async function expectHuman(response){
 assert.equal(response.status,403);
 assert.equal(await response.text(),HUMAN_MESSAGE);
 assert.match(response.headers.get('Content-Type'),/text\/plain/);
 assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
}

test('a browser on /mcp is refused',async()=>expectHuman(await call('/mcp',{headers:BROWSER})));
test('a browser on /mcp/ (trailing slash) is refused',async()=>expectHuman(await call('/mcp/',{headers:BROWSER})));
test('a browser on the JSON side-doors is refused',async()=>{
 for(const p of['/mcp/health','/mcp/catalog','/mcp/profile','/mcp/evidence','/mcp/data/profile.json'])await expectHuman(await call(p,{headers:BROWSER}));
});
test('a browser on an unknown /mcp path is refused, not 404ed',async()=>expectHuman(await call('/mcp/anything',{headers:BROWSER})));
test('Sec-Fetch-Dest: document alone marks a human',async()=>expectHuman(await call('/mcp',{headers:{Accept:'*/*','Sec-Fetch-Dest':'document'}})));
test('Sec-Fetch-Mode: navigate alone marks a human',async()=>expectHuman(await call('/mcp',{headers:{Accept:'*/*','Sec-Fetch-Mode':'navigate'}})));
async function expectGreeting(response){
 assert.equal(response.status,200);
 assert.match(response.headers.get('Content-Type'),/text\/plain/);
 const text=await response.text();
 assert.match(text,/^Hello, friend/);
 assert.ok(text.includes('claude mcp add --transport http mike https://michaelbailey.org/mcp'));
 assert.ok(text.includes('prepare_to_meet_mike')&&text.includes('develop_evaluation_idea'));
}
test('a fetch tool imitating a browser Accept line, without Sec-Fetch, is greeted as an agent',async()=>expectGreeting(await call('/mcp',{headers:{Accept:'text/html,application/xhtml+xml,*/*;q=0.8','User-Agent':'Mozilla/5.0 (compatible; ChatGPT-User/1.0)'}})));
test('a bare GET on /mcp is greeted as an agent',async()=>expectGreeting(await call('/mcp',{headers:{Accept:'*/*'}})));
test('a GET with no headers at all is greeted as an agent',async()=>expectGreeting(await call('/mcp')));
test('a GET SSE request gets a JSON-RPC 405, not the human message',async()=>{
 const r=await call('/mcp',{headers:{Accept:'text/event-stream'}});
 assert.equal(r.status,405);
 const body=await r.json();
 assert.equal(body.jsonrpc,'2.0');assert.ok(body.error.message.includes('POST'));
});
test('a POST without JSON content type is refused',async()=>expectHuman(await call('/mcp',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'q=hello'})));
test('a JSON POST that is not JSON-RPC is refused',async()=>expectHuman(await call('/mcp',{method:'POST',headers:MCP,body:JSON.stringify({hello:'world'})})));
test('an MCP initialize handshake succeeds',async()=>{
 const r=await call('/mcp',{method:'POST',headers:MCP,body:initialize});
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.result.serverInfo.name,'michael-bailey');
 assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');
});
test('a batch of JSON-RPC messages passes the gate',()=>{
 assert.equal(looksLikeJsonRpc(new TextEncoder().encode('[{"jsonrpc":"2.0","method":"notifications/initialized"}]')),true);
 assert.equal(looksLikeJsonRpc(new TextEncoder().encode('[]')),false);
 assert.equal(looksLikeJsonRpc(new TextEncoder().encode('not json')),false);
 assert.equal(looksLikeJsonRpc(new TextEncoder().encode('{"jsonrpc":"1.0","method":"x"}')),false);
});
test('agent GETs on the JSON side-doors still work',async()=>{
 const health=await call('/mcp/health',{headers:{Accept:'*/*'}});
 assert.equal(health.status,200);assert.equal((await health.json()).access,'agents only');
 const profile=await call('/mcp/data/profile.json',{headers:{Accept:'application/json'}});
 assert.equal(profile.status,200);assert.equal((await profile.json()).name,'Michael Bailey');
 assert.equal((await call('/mcp/absent',{headers:{Accept:'*/*'}})).status,404);
});
test('CORS preflight is answered for browser-hosted MCP clients',async()=>{
 const r=await call('/mcp',{method:'OPTIONS',headers:{Origin:'https://claude.ai','Access-Control-Request-Method':'POST'}});
 assert.equal(r.status,204);assert.match(r.headers.get('Access-Control-Allow-Methods'),/POST/);
});
test('oversized bodies are still rejected before the JSON-RPC gate',async()=>{
 const r=await call('/mcp',{method:'POST',headers:MCP,body:'a'.repeat(66000)});
 assert.equal(r.status,413);
});
test('isHuman reads only the browser navigation fingerprint',()=>{
 assert.equal(isHuman(new Request(ORIGIN,{headers:{Accept:'application/json, text/event-stream'}})),false);
 assert.equal(isHuman(new Request(ORIGIN,{headers:{Accept:'*/*'}})),false);
 assert.equal(isHuman(new Request(ORIGIN)),false);
 assert.equal(isHuman(new Request(ORIGIN,{headers:{Accept:'text/html'}})),false);
 assert.equal(isHuman(new Request(ORIGIN,{headers:BROWSER})),true);
 // A browser fetching a sub-resource (fetch(), img) is not a navigation and is not a person reading a page.
 assert.equal(isHuman(new Request(ORIGIN,{headers:{'Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'empty'}})),false);
});
test('the connected-client instructions carry the same voice',async()=>{
 const r=await call('/mcp',{method:'POST',headers:MCP,body:initialize});
 const body=await r.json();
 assert.match(body.result.instructions,/^Hello, friend/);
 assert.ok(body.result.instructions.includes('not an official J-PAL or MIT service'));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createHttpServer} from '../src/server.js';
import {PRODUCTS} from '../src/registry.js';
async function withServer(fn) {
 const server=createHttpServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {await fn(`http://127.0.0.1:${server.address().port}`);} finally {await new Promise(resolve=>server.close(resolve));}
}
function setTestEnv(t,key,value){
 const previous=process.env[key];
 process.env[key]=value;
 t.after(()=>{
  if(previous===undefined)delete process.env[key];
  else process.env[key]=previous;
 });
}
test('all seven scoped transports expose exactly one strict domain tool and its resource',async()=>{
 await withServer(async base=>{
  for(const p of PRODUCTS){
   const client=new Client({name:'scoped-contract',version:'0.6.0'});
   try{
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp/${p.slug}`)));
    const tools=(await client.listTools()).tools;
    assert.equal(tools.length,1);assert.equal(tools[0].name,p.tool);
    assert.equal(tools[0].inputSchema.additionalProperties,false);
    assert.equal(tools[0].outputSchema.type,'object');
    assert.equal(tools[0].annotations.readOnlyHint,true);
    assert.equal(tools[0].annotations.openWorldHint,true);
    const resources=(await client.listResources()).resources;assert.equal(resources.length,1);
   }finally{await client.close();}
  }
 });
});
test('unknown arguments and cross-domain tool calls do not execute a provider request',async()=>{
 await withServer(async base=>{
  const client=new Client({name:'validation-contract',version:'0.6.0'});
  try{
   await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp/boe-impact`)));
   const bad=await client.callTool({name:'find_spanish_law_articles',arguments:{law_id:'BOE-A-2017-12902',query:'contratos',unexpected_url:'http://127.0.0.1'}});
   assert.equal(bad.isError,true);
   const crossDomain=await client.callTool({name:'compare_spanish_public_grants',arguments:{query:'digitalización'}});
   assert.equal(crossDomain.isError,true);
   const invalid=await client.callTool({name:'find_spanish_law_articles',arguments:{law_id:'BOE-A-2017-12902',query:'contratos',as_of:'2026-02-31'}});
   assert.equal(invalid.isError,true);assert.equal(invalid.structuredContent.ok,false);
   assert.equal(invalid.structuredContent.error.code,'invalid_input');
   assert.equal(invalid.structuredContent.error.retryable,false);
   assert.match(invalid.structuredContent.correlation_id,/^[a-f0-9-]{36}$/);
   assert.deepEqual(invalid.structuredContent.sources,[]);
  }finally{await client.close();}
 });
});
test('host, Origin, content type and chunked body limits are enforced',async()=>{
 await withServer(async base=>{
  const badHost=await new Promise((resolve,reject)=>{
   const req=request(base+'/health',{headers:{Host:'evil.invalid'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();
  });assert.equal(badHost,403);
  assert.equal((await fetch(base+'/mcp',{method:'OPTIONS',headers:{Origin:'https://evil.invalid'}})).status,403);
  const allowed=await fetch(base+'/mcp/boe-impact',{method:'OPTIONS',headers:{Origin:'https://chatgpt.com'}});
  assert.equal(allowed.status,204);assert.equal(allowed.headers.get('access-control-allow-origin'),'https://chatgpt.com');
  assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'})).status,415);
  assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:'{'})).status,400);
  const status=await new Promise((resolve,reject)=>{
   const req=request(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','transfer-encoding':'chunked'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
   req.on('error',reject);req.write('x'.repeat(16000));req.end('x'.repeat(16000));
  });assert.equal(status,413);
  assert.equal((await fetch(base+'/mcp/not-a-product')).status,404);
 });
});

test('OpenAI ownership challenge serves exact public bytes only at its GET path',async()=>{
 await withServer(async base=>{
  const path='/.well-known/openai-apps-challenge';
  const response=await fetch(base+path);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'text/plain; charset=utf-8');
  assert.equal(await response.text(),'T6ZiXlZrSBR-G_bxEWWAR2DqmGgQDRnhlDAG9OCsFcw');
  assert.equal((await fetch(base+path+'/extra')).status,404);
  assert.equal((await fetch(base+path,{method:'POST'})).status,404);
 });
});

test('provider budget covers batched calls without blocking discovery through the same peer',async t=>{
 setTestEnv(t,'MAX_IP_PER_MIN','2');
 setTestEnv(t,'MAX_MCP_DISCOVERY_PER_MIN','100');
 await withServer(async base=>{
  const endpoint=`${base}/mcp/boe-impact`;
  const post=body=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify(body)});
  const call=id=>({jsonrpc:'2.0',id,method:'tools/call',params:{name:'unknown_tool',arguments:{}}});
  assert.equal((await fetch(endpoint,{method:'DELETE'})).status,200);
  const batch=await post([call(1),call(2)]);
  assert.equal(batch.status,200);
  assert.equal((await batch.json()).length,2);
  const blocked=await post(call(3));
  assert.equal(blocked.status,429);
  assert.equal(blocked.headers.get('retry-after'),'60');
  await blocked.text();
  for(const p of PRODUCTS){
   const client=new Client({name:'discovery-budget-test',version:'1.0.0'});
   try{
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp/${p.slug}`)));
    assert.equal((await client.listTools()).tools[0].name,p.tool);
    const {resources}=await client.listResources();
    assert.equal(resources.length,1);
    assert.equal((await client.readResource({uri:resources[0].uri})).contents.length,1);
   }finally{await client.close();}
  }
 });
});

test('discovery is bounded independently, including metadata batches',async t=>{
 setTestEnv(t,'MAX_IP_PER_MIN','1');
 setTestEnv(t,'MAX_MCP_DISCOVERY_PER_MIN','2');
 await withServer(async base=>{
  const endpoint=`${base}/mcp`;
  const post=body=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify(body)});
  const list=id=>({jsonrpc:'2.0',id,method:'tools/list'});
  const call={jsonrpc:'2.0',id:101,method:'tools/call',params:{name:'unknown_tool',arguments:{}}};

  const oversized=await post(Array.from({length:100},(_,i)=>list(i+1)));
  assert.equal(oversized.status,400);
  assert.match((await oversized.json()).error.message,/batch exceeds 4 non-tool messages/);

  assert.equal((await fetch(endpoint,{method:'DELETE'})).status,200);
  const listed=await post(list(102));
  assert.equal(listed.status,200);
  assert.equal((await listed.json()).result.tools.length,7);

  const blocked=await post([list(103),call]);
  assert.equal(blocked.status,429);
  await blocked.text();
  const allowed=await post(call);
  assert.equal(allowed.status,200);
  assert.equal((await allowed.json()).result.isError,true);
  const exhausted=await post(call);
  assert.equal(exhausted.status,429);
  await exhausted.text();
 });
});

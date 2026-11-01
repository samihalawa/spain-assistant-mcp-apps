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

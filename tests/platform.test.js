import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createHttpServer} from '../src/server.js';
import {PRODUCTS} from '../src/registry.js';

test('platform serves its seven-product catalog and only explicit self-contained assets', async () => {
 const server=createHttpServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  const response=await fetch(base+'/');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');
  assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
  const html=await response.text();
  assert.match(html,/<html lang="es">/);
  for(const p of PRODUCTS) assert.ok(html.includes(`data-product="${p.slug}"`),p.slug);
  assert.match(html,/Recorrido ilustrativo/);
  assert.match(html,/no implica publicación en su marketplace/);
  for(const [path,type] of [['/platform.css','text/css'],['/platform.js','text/javascript']]) {
   const asset=await fetch(base+path);
   assert.equal(asset.status,200);
   assert.ok(asset.headers.get('content-type').startsWith(type));
   assert.ok((await asset.text()).length>100);
   const head=await fetch(base+path,{method:'HEAD'});
   assert.equal(head.status,200);
   assert.equal(await head.text(),'');
  }
  assert.equal((await fetch(base+'/',{method:'HEAD'})).status,200);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,404);
  assert.equal((await fetch(base+'/platform.html')).status,404);
  assert.equal((await fetch(base+'/platform.js/extra')).status,404);
  assert.equal((await fetch(base+'/platform.css',{headers:{Origin:'https://evil.invalid'}})).status,403);
  const badHost=await new Promise((resolve,reject)=>{
   const req=request(base+'/platform.js',{headers:{Host:'evil.invalid'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
   req.on('error',reject);req.end();
  });
  assert.equal(badHost,403);
 } finally {await new Promise(resolve=>server.close(resolve));}
});

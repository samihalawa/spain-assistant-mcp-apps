import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createHttpServer} from '../src/server.js';
import {CATALOG,CATEGORIES,MARKETPLACE,CODEX_MARKETPLACE} from '../src/catalog.js';
const manifest=JSON.parse(readFileSync(new URL('../public/downloads/manifest.json',import.meta.url),'utf8'));
async function withServer(fn){const server=createHttpServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;try{await fn(base);}finally{await new Promise(resolve=>server.close(resolve));}}

test('directory renders all public products, categories and platform guides on direct requests',async()=>withServer(async base=>{
 const home=await fetch(base+'/');assert.equal(home.status,200);assert.match(home.headers.get('content-type'),/text\/html/);assert.match(home.headers.get('content-security-policy'),/script-src 'self'/);
 const html=await home.text();assert.match(html,/<html lang="es">/);assert.match(html,/Megawebs Plugins/);assert.equal((html.match(/class="plugin-row"/g)||[]).length,12);assert.doesNotMatch(html,/tenderloop|Recorrido ilustrativo|evidence-visual/);
 for(const p of CATALOG){assert.ok(html.includes(`data-product="${p.slug}"`));const result=await fetch(base+'/plugins/'+p.slug);assert.equal(result.status,200);const page=await result.text();assert.ok(page.includes(`<title>${p.name.replace(/&/g,'&amp;')}`));assert.ok(page.includes(`rel="canonical" href="https://aiplugins.megawebs.com/plugins/${p.slug}"`));assert.ok(page.includes(p.zip));assert.ok(page.includes(p.claudeCommand));assert.ok(page.includes(p.codexCommand.replace(/&/g,'&amp;')));assert.equal(page.includes('id="tab-chatgpt"'),p.platforms.includes('chatgpt'));if(!p.platforms.includes('chatgpt'))assert.ok(page.includes('id="tab-claude-code" aria-controls="panel-claude-code" aria-selected="true"'));}
 for(const c of CATEGORIES){const result=await fetch(base+'/categorias/'+c.slug);assert.equal(result.status,200);const page=await result.text();assert.equal((page.match(/class="plugin-row"/g)||[]).length,CATALOG.filter(p=>p.category===c.slug).length);assert.ok(page.includes(`https://aiplugins.megawebs.com/categorias/${c.slug}`));}
 for(const platform of ['chatgpt','claude-code','codex']){const result=await fetch(base+'/instalar/'+platform);assert.equal(result.status,200);const page=await result.text();assert.ok(page.includes('Cómo instalar plugins en'));if(platform==='chatgpt'){assert.match(page,/Upload plugin archive/);assert.equal((page.match(/<img class="product-icon"/g)||[]).length,8);}}
 for(const path of ['/plugins/no-such-plugin','/categorias/unknown','/instalar/no-host','/unknown-page']){const result=await fetch(base+path);assert.equal(result.status,404);assert.match(await result.text(),/No encontramos esta página/);}
}));

test('every download is an exact versioned attachment and marketplace pins 12 public sources',async()=>withServer(async base=>{
 assert.equal(CATALOG.length,12);assert.equal(manifest.downloads.length,12);
 for(const entry of [...manifest.downloads,...(manifest.archived||[])]){const path='/downloads/'+entry.filename;const response=await fetch(base+path);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/zip');assert.equal(response.headers.get('content-disposition'),`attachment; filename="${entry.filename}"`);assert.match(response.headers.get('cache-control'),/immutable/);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);const head=await fetch(base+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');}
 const result=await fetch(base+'/marketplace.json');assert.equal(result.status,200);const data=await result.json();assert.deepEqual(data,MARKETPLACE);assert.equal(data.plugins.length,12);for(const p of data.plugins){assert.equal(p.source.source,'github');assert.match(p.source.repo,/^samihalawa\//);assert.match(p.source.sha,/^[a-f0-9]{40}$/);assert.match(p.source.ref,/^v\d+\.\d+\.\d+$/);assert.notEqual(p.name,'tenderloop');}
 const publicManifest=await(await fetch(base+'/downloads/manifest.json')).json();assert.deepEqual(publicManifest,manifest);
 assert.equal((await fetch(base+'/downloads/not-listed.zip')).status,404);assert.equal((await fetch(base+'/downloads/../catalog.js')).status,404);
}));

test('directory assets are local and existing host and Origin restrictions remain active',async()=>withServer(async base=>{
 for(const [path,type]of[['/platform.css','text/css'],['/platform.js','text/javascript']]){const response=await fetch(base+path);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(type));assert.ok((await response.text()).length>100);const head=await fetch(base+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');}
 for(const p of CATALOG){const response=await fetch(base+'/icons/'+p.icon);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\/(png|svg\+xml)$/);}
 assert.equal((await fetch(base+'/',{method:'HEAD'})).status,200);assert.equal((await fetch(base+'/',{method:'POST'})).status,404);assert.equal((await fetch(base+'/platform.css',{headers:{Origin:'https://evil.invalid'}})).status,403);
 const badHost=await new Promise((resolve,reject)=>{const req=request(base+'/marketplace.json',{headers:{Host:'evil.invalid'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});assert.equal(badHost,403);
}));

test('published Codex marketplace stays generated from the public catalog with exact pinned sources',()=>{
 const published=JSON.parse(readFileSync(new URL('../.agents/plugins/marketplace.json',import.meta.url),'utf8'));
 assert.deepEqual(published,CODEX_MARKETPLACE);assert.equal(published.plugins.length,12);
 for(const p of published.plugins){assert.equal(p.source.source,'url');assert.match(p.source.url,/^https:\/\/github\.com\/samihalawa\/[a-zA-Z0-9.-]+\.git$/);assert.match(p.source.sha,/^[a-f0-9]{40}$/);assert.deepEqual(p.policy,{installation:'AVAILABLE',authentication:'ON_INSTALL'});assert.notEqual(p.name,'tenderloop');}
});

test('search metadata covers meaningful topics and official sources with accent-insensitive matching',async()=>withServer(async base=>{
 const html=await(await fetch(base+'/')).text();
 const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
 const probes={'ine-evidence':'estadistica','boe-impact':'legislacion','borme-intelligence':'sociedad','ayudas-espana':'financiacion','licita-espana':'contratacion','catastro-pro':'vivienda','spain-open-data':'datos abiertos','bunq-banking-mcp':'suscripciones','morning-operator':'tareas','magicinterview':'entrevistas','linkedin-godmode-plugin':'contactos','grokbot':'Grok Bot'};
 for(const p of CATALOG){assert.ok(p.keywords.length>=3,p.slug);const prefix=`data-product="${p.slug}" data-search="`;const start=html.indexOf(prefix);assert.notEqual(start,-1);const search=html.slice(start+prefix.length).split('"')[0];assert.ok(normalize(search).includes(normalize(probes[p.slug])),p.slug+' searchable by '+probes[p.slug]);if(p.source)assert.ok(search.includes(p.source),p.slug+' source searchable');}
}));

test('Spanish product links open the requested install tab and surface a versioned example',async()=>withServer(async base=>{
 const examples={
  'ayudas-espana':'número BDNS',
  'boe-impact':'BOE-A-2017-12902',
  'borme-intelligence':'NEMENTIUM TECHNOLOGIES',
  'catastro-pro':'2749704YJ0624N0001DI',
 };
 const directory=await(await fetch(base+'/categorias/espana')).text();
 for(const [slug,sample] of Object.entries(examples)){
  const product=CATALOG.find(item=>item.slug===slug);
  const page=await(await fetch(base+'/plugins/'+slug)).text();
  for(const platform of product.platforms){
   assert.ok(directory.includes(`href="/plugins/${slug}#tab-${platform}"`));
   assert.ok(page.includes(`id="tab-${platform}"`));
  }
  assert.ok(page.includes(`href="${product.repository}/releases/tag/v${product.version}"`));
  assert.ok(page.includes(product.zip));
  assert.ok(page.includes('aria-label="Copiar consulta de ejemplo"'));
  assert.ok(page.includes(sample));
 }
}));

test('all public plugins have strict local privacy, terms and support pages with exact escaped document content',async()=>withServer(async base=>{
 const {POLICY_TYPES,policyDocument,renderMarkdown}=await import('../src/policies.js');
 const index=await fetch(base+'/politicas');assert.equal(index.status,200);const overview=await index.text();
 for(const p of CATALOG){
  const detail=await(await fetch(base+'/plugins/'+p.slug)).text();
  for(const type of Object.keys(POLICY_TYPES)){
   const path=`/plugins/${p.slug}/${type}`;assert.ok(overview.includes(path));assert.ok(detail.includes(`href="${path}"`));
   const response=await fetch(base+path);assert.equal(response.status,200);const html=await response.text();
   assert.ok(html.includes(`rel="canonical" href="https://aiplugins.megawebs.com${path}"`));
   assert.ok(html.includes(renderMarkdown(policyDocument(p.slug,type))));
   assert.doesNotMatch(html,/https?:\/\/[^\s"'<>]*github\.io/);
  }
 }
 for(const path of ['/plugins/tenderloop/privacy','/plugins/no-such-plugin/terms','/plugins/boe-impact/unknown-policy','/plugins/boe-impact/privacy/extra']){const response=await fetch(base+path);assert.equal(response.status,404);assert.match(await response.text(),/No encontramos esta página/);}
}));

test('policy Markdown keeps source text inert and rejects executable links',async()=>{
 const {renderMarkdown}=await import('../src/policies.js');
 const html=renderMarkdown('# Policy\n\n<script>alert(1)</script>\n\n[bad](javascript:alert) [safe](https://example.com/privacy)\n\n- One\n- Two\n\n```\n<img onerror=alert(1)>\n```');
 assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/href="javascript:/);assert.match(html,/href="https:\/\/example.com\/privacy"/);assert.match(html,/<ul><li>One<\/li><li>Two<\/li><\/ul>/);assert.match(html,/&lt;img onerror=alert\(1\)&gt;/);
});

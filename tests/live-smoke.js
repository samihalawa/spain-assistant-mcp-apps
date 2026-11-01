// Explicit, bounded official-source reads. No files or private records are saved.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createHttpServer} from '../src/server.js';
import {PRODUCTS} from '../src/registry.js';
const cases = {
 'licita-espana': {query: 'software', max_pages: 1, limit: 2},
 'ayudas-espana': {query: 'digitalización', limit: 1},
 'boe-impact': {law_id: 'BOE-A-2017-12902', query: 'Artículo 118', as_of: '2026-10-20', limit: 2},
 'borme-intelligence': {company: 'LINGUASERVE', start_date: '2026-10-20', end_date: '2026-10-20', province: 'MADRID', limit: 2},
 'catastro-pro': {reference: '2749704YJ0624N0001DI'},
 'ine-evidence': {series_code: 'IPC251852', last: 2},
 'spain-open-data': {query: 'empleo', page_size: 2},
};
let server;
let base = process.env.MCP_BASE_URL;
if (!base) {
 server = createHttpServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 base = `http://127.0.0.1:${server.address().port}`;
}
let failed = 0;
try {
 for (const p of PRODUCTS) {
  const started = Date.now(), client = new Client({name: 'spain-official-source-canary', version: '0.6.0'});
  try {
   await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp/${p.slug}`)));
   const listed = (await client.listTools()).tools;
   if (listed.length !== 1 || listed[0].name !== p.tool) throw new Error('Scoped tool inventory mismatch');
   const result = await client.callTool({name: p.tool, arguments: cases[p.slug]}, undefined, {timeout: 70000});
   const data = result.structuredContent;
   const pass = data?.ok === true && data.sources?.length > 0 && !result.isError;
   if (!pass) failed++;
   console.log(JSON.stringify({checked_at: new Date().toISOString(), slug: p.slug, tool: p.tool, arguments: cases[p.slug], pass,
    returned: Array.isArray(data?.data) ? data.data.length : data?.data ? 1 : 0,
    sources: data?.sources, coverage: data?.coverage, error: data?.error, duration_ms: Date.now() - started}));
  } catch (error) { failed++; console.log(JSON.stringify({slug: p.slug, pass: false, error: String(error.message), duration_ms: Date.now() - started})); }
  finally { await client.close(); }
 }
} finally { if (server) await new Promise(resolve => server.close(resolve)); }
if (failed) process.exitCode = 1;

import { createServer as httpServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { PRODUCTS, bySlug } from './registry.js';
import { callPython } from './worker.js';

const dir = dirname(fileURLToPath(import.meta.url));
export const APP_VERSION = '0.6.0';
const templates = new Map(PRODUCTS.map(p => {
 const path = resolve(dir, '../public/dist', p.slug + '.html');
 if (!existsSync(path)) throw new Error('Run npm run build first: missing ' + path);
 return [p.slug, readFileSync(path, 'utf8')];
}));
const MAX_REQUEST_BYTES = 30000;
const windowMs = 60_000;
const configuredLimit = Number(process.env.MAX_IP_PER_MIN || 100);
const MAX_IP_PER_MIN = Number.isSafeInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 100;
const originList = (process.env.ALLOWED_ORIGINS || 'https://aiplugins.megawebs.com,https://chatgpt.com,https://chat.openai.com,https://claude.ai').split(',').map(x => x.trim()).filter(Boolean);
const allowedOrigins = new Set(originList);
const allowedHosts = new Set((process.env.ALLOWED_HOSTS || 'aiplugins.megawebs.com,localhost,127.0.0.1,[::1]').split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
const counters = new Map();
function allow(ip) {
 const stamp = Date.now();
 for (const [key, v] of counters) if (stamp - v.time > windowMs) counters.delete(key);
 const state = counters.get(ip);
 if (!state) {
  if (counters.size >= 10000) return false;
  counters.set(ip, {time: stamp, count: 1}); return true;
 }
 state.count++; return state.count <= MAX_IP_PER_MIN;
}
const sourceSchema = z.object({
 url: z.string().url(), retrieved_at: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
 cache_hit: z.boolean(), complete: z.boolean().optional(), sha256_scope: z.literal('response_prefix').optional(),
 bytes_retained: z.number().int().nonnegative().optional(), byte_limit: z.number().int().positive().optional(),
}).strict();
const errorSchema = z.object({code: z.string(), message: z.string(), source_url: z.string().nullable().optional(), retryable: z.boolean(), correlation_id: z.string().uuid()}).strict();
const resultSchema = z.object({
 ok: z.boolean(), data: z.union([z.array(z.record(z.unknown())), z.record(z.unknown())]).optional(),
 sources: z.array(sourceSchema), coverage: z.record(z.unknown()), warnings: z.array(z.string()), notice: z.string(),
 product: z.enum(PRODUCTS.map(p => p.slug)),
 presentation: z.object({name: z.string(), slug: z.string(), promise: z.string(), label: z.string()}).strict(),
 error: errorSchema.optional(), errors: z.array(z.record(z.unknown())).optional(),
 correlation_id: z.string().uuid(), retrieved_at: z.string().datetime(),
}).strict();

function createMcp(products) {
 const server = new McpServer({name: 'spain-assistant-mcp-apps', version: APP_VERSION}, {
  instructions: 'Read-only queries to official Spanish public sources. Use the matching domain tool and its returned continuation fields. Preserve source URLs, retrieval timestamps, hashes, missing records, and partial coverage. A source error is not a zero-result search. No accounts, submissions, payments, legal certification or background monitoring. Results also include an optional interactive MCP App resource.',
 });
 for (const p of products) {
  const uri = `ui://spain-assistant/${p.slug}/v3.html`;
  registerAppResource(server, p.name + ' results', uri, {}, async () => ({
   contents: [{uri, mimeType: RESOURCE_MIME_TYPE, text: templates.get(p.slug), _meta: {ui: {prefersBorder: true}}}],
  }));
  registerAppTool(server, p.tool, {
   title: p.name + ' · ' + p.label, description: p.description,
   inputSchema: z.object(p.fields).strict(), outputSchema: resultSchema,
   annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
   _meta: {ui: {resourceUri: uri}, 'openai/toolInvocation/invoking': 'Consultando fuente oficial…', 'openai/toolInvocation/invoked': 'Consulta completada'},
  }, async args => {
   const correlation_id = randomUUID(), started = Date.now();
   let result;
   try { result = await callPython(p.pyTool, args); }
   catch { result = {ok: false, error: {code: 'source_unavailable', message: 'Official source or worker unavailable. No records inferred.'}}; }
   const merged = {
    ...result, product: p.slug, presentation: {name: p.name, slug: p.slug, promise: p.promise, label: p.label},
    sources: result.sources || [], coverage: result.coverage || {}, warnings: result.warnings || [],
    notice: result.notice || 'Independent software by Sami Halawa; not an official government service. Verify decisions in the official source.',
    correlation_id, retrieved_at: new Date().toISOString(),
   };
   if (result.error) merged.error = {...result.error, correlation_id, retryable: ['source_unavailable', 'source_rate_limited', 'source_http_error'].includes(result.error.code)};
   const checked = resultSchema.safeParse(merged);
   if (!checked.success) {
    delete merged.data; delete merged.errors;
    Object.assign(merged, {ok: false, sources: [], coverage: {verified: false}, warnings: ['Malformed source data is not an empty search.'],
     error: {code: 'invalid_source_envelope', message: 'The source result could not be validated; no records inferred.', retryable: false, correlation_id}});
   }
   console.error(JSON.stringify({event: 'official_query', tool: p.tool, correlation_id, duration_ms: Date.now() - started, ok: merged.ok, error_code: merged.error?.code || null}));
   const count = Array.isArray(merged.data) ? merged.data.length : merged.data ? 1 : 0;
   const message = merged.ok ? `${p.name}: ${count} returned records. ${merged.coverage.partial ? 'Partial source coverage. ' : ''}Verify source links, dates, coverage and warnings.` : `${p.name}: ${merged.error?.message || 'Source unavailable; no records inferred.'}`;
   return {content: [{type: 'text', text: message}], structuredContent: merged, isError: !merged.ok};
  });
 }
 return server;
}
function reject(res, status, message, code = -32600) {
 res.writeHead(status, {'Content-Type': 'application/json'}).end(JSON.stringify({jsonrpc: '2.0', error: {code, message}, id: null}));
}
function readBody(req) {
 return new Promise((resolveBody, rejectBody) => {
  const chunks = []; let total = 0, exceeded = false;
  req.on('data', chunk => {
   total += chunk.length;
   if (total > MAX_REQUEST_BYTES) { if (!exceeded) rejectBody(Object.assign(new Error('MCP body exceeds size limit'), {status: 413})); exceeded = true; return; }
   if (!exceeded) chunks.push(chunk);
  });
  req.on('end', () => {
   if (exceeded) return;
   try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
   catch { rejectBody(Object.assign(new Error('Invalid JSON body'), {status: 400})); }
  });
  req.on('error', () => rejectBody(Object.assign(new Error('Request body unavailable'), {status: 400})));
 });
}
export const PORT = Number(process.env.PORT || 8787);
export function createHttpServer() {
 const http = httpServer(async (req, res) => {
  let path, host;
  try { path = new URL(req.url || '/', 'http://localhost').pathname; host = new URL('http://' + req.headers.host).hostname.toLowerCase(); }
  catch { reject(res, 400, 'Invalid request target'); return; }
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cache-Control', 'no-store');
  if (!allowedHosts.has(host)) { reject(res, 403, 'Host is not allowed'); return; }
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) { reject(res, 403, 'Origin is not allowed'); return; }
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (path === '/health' && req.method === 'GET') {
   res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify({status: 'ok', version: APP_VERSION, tools: PRODUCTS.length, auth: 'none; public read-only data', source_revision: process.env.SOURCE_COMMIT || null,
    endpoints: Object.fromEntries(PRODUCTS.map(p => [p.slug, '/mcp/' + p.slug]))})); return;
  }
  if (path === '/' && req.method === 'GET') { res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'}).end('Spain Evidence MCP — read-only Spanish official data. Connect /mcp or /mcp/<plugin-slug>.'); return; }
  const slug = path.startsWith('/mcp/') ? path.slice(5) : null;
  const products = path === '/mcp' ? PRODUCTS : slug && bySlug.has(slug) ? [bySlug.get(slug)] : null;
  if (!products) { reject(res, 404, 'Not found'); return; }
  if (req.method === 'OPTIONS') { res.writeHead(204, {'Access-Control-Allow-Headers': 'content-type, mcp-session-id, mcp-protocol-version, accept', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS'}).end(); return; }
  if (!['POST', 'GET', 'DELETE'].includes(req.method)) { reject(res, 405, 'Method not allowed'); return; }
  if (!allow(req.socket.remoteAddress || 'unknown')) { res.writeHead(429, {'Retry-After': '60'}).end('Rate limited'); return; }
  let body;
  if (req.method === 'POST') {
   if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') { reject(res, 415, 'Content-Type must be application/json'); return; }
   if (Number(req.headers['content-length'] || 0) > MAX_REQUEST_BYTES) { req.resume(); reject(res, 413, 'MCP body exceeds size limit'); return; }
   try { body = await readBody(req); }
   catch (error) { reject(res, error.status || 400, error.message, error.status === 400 ? -32700 : -32600); return; }
  }
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  const server = createMcp(products);
  const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
  res.on('close', () => { transport.close().catch(() => {}); server.close().catch(() => {}); });
  try { await server.connect(transport); await transport.handleRequest(req, res, body); }
  catch { console.error(JSON.stringify({event: 'mcp_failure'})); if (!res.headersSent) reject(res, 500, 'Internal MCP error', -32603); }
 });
 http.requestTimeout = 15000; http.headersTimeout = 10000;
 return http;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
 const http = createHttpServer(); http.listen(PORT, '0.0.0.0', () => console.log(JSON.stringify({event: 'listening', version: APP_VERSION, port: PORT, endpoints: ['/mcp', ...PRODUCTS.map(p => '/mcp/' + p.slug)]})));
 const shutdown = () => http.close(() => process.exit(0)); process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
